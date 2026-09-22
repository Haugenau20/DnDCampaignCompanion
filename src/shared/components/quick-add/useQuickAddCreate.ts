// src/shared/components/quick-add/useQuickAddCreate.ts
import { useCallback } from "react";
import { useNPCs, useQuests, useLocations } from "features/campaign-entities";
import { useNotes } from "features/collaboration";
import {
  resolveNameToId,
  resolveNamesToIds,
  type NamedRecord,
} from "shared/utils/resolve-name-to-id";
import {
  QUICK_ADD_SPECS,
  type QuickAddCarry,
  type QuickAddEntity,
  type QuickAddValues,
} from "./quickAddSpecs";

/**
 * What a create needs beyond the two typed fields.
 *
 * `noteId`/`entityId` are note conversion's existing handoff and are passed
 * straight through to `markEntityAsConverted`. `15-1` forbids changing that
 * wiring, so this carries it rather than reshaping it.
 */
export interface QuickAddCreateOptions {
  noteId?: string;
  entityId?: string;
  /** Extracted fields the two-field surface does not show. See `QuickAddCarry`. */
  carry?: QuickAddCarry;
}

/**
 * Replace the carry's name-shaped fields with the ids the document stores.
 *
 * Exported for its own tests: this is the step that decides whether a
 * converted record links to anything, and it is worth being able to state its
 * behaviour without mounting three providers.
 *
 * Three fields per entity, all of them prose arriving where an id belongs:
 *
 * - a **location**'s `parentId` carries `parentLocation` — "The Shire", not an
 *   id. Unresolved, it becomes `""`, which is what `buildDocument` already
 *   writes for a top-level place; the place shows under "Unplaced", honestly,
 *   rather than holding a reference to nothing.
 * - a **quest**'s `relatedNPCIds` carries `relatedNPCNames`. Names that do not
 *   resolve are dropped rather than stored, because stored they render as
 *   "Someone no longer in the directory" for a person who is right there.
 * - an **NPC**'s and a **quest**'s `locationId` is derived from the `location`
 *   name the model gave. The name stays in `location`, which is a prose field
 *   by contract (`NPCDetailPage`: "`NPC.location` describes; `locationId` is
 *   what resolves"), so this adds a link without moving the text.
 */
/**
 * A location reference that may already be an id, or may be a name.
 *
 * Both reach this path. *Add a place inside* passes a real `parentId` through
 * `QuickAddDialog`; note conversion passes `parentLocation`, which is prose.
 * `splitInitialData` cannot tell them apart -- it sees one `parentId` key --
 * so the question is settled here, against the loaded collection: a value that
 * *is* an id of a known location is one, and anything else is tried as a name.
 */
export function resolveLocationRef(
  value: unknown,
  locations: readonly NamedRecord[]
): string {
  if (typeof value !== "string" || !value.trim()) return "";
  // A provider mid-load hands back an empty list, and a caller may hand back
  // nothing at all. Neither is a reason to throw on the write path.
  if (!Array.isArray(locations)) return "";
  if (locations.some((location) => location?.id === value)) return value;
  return resolveNameToId(value, locations);
}

export function resolveCarriedNames(
  entity: QuickAddEntity,
  carry: QuickAddCarry | undefined,
  npcs: readonly NamedRecord[],
  locations: readonly NamedRecord[]
): QuickAddCarry | undefined {
  if (!carry) return carry;

  const knownNPCs = Array.isArray(npcs) ? npcs : [];
  const knownLocations = Array.isArray(locations) ? locations : [];
  const resolved: QuickAddCarry = { ...carry };

  if (entity === "location") {
    resolved.parentId = resolveLocationRef(carry.parentId, knownLocations);
  }

  if (entity === "quest") {
    // The schema's field is `relatedNPCNames`; the document's is
    // `relatedNPCIds`. They were the same key for as long as the mismatch
    // went unnoticed.
    resolved.relatedNPCIds = resolveNamesToIds(carry.relatedNPCNames, knownNPCs);
    delete resolved.relatedNPCNames;
  }

  if (entity === "npc" || entity === "quest") {
    const locationId = resolveNameToId(carry.location, knownLocations);
    if (locationId) resolved.locationId = locationId;
  }

  return resolved;
}

/**
 * The one write path behind all three quick-add mounts.
 *
 * All three entity contexts are read unconditionally -- hooks cannot be called
 * behind a branch -- and exactly one of them is used per call. The component
 * tree already mounts all three providers above `Layout`, so this costs a
 * subscription, not a fetch.
 *
 * Returns the new record's id, which is what `Create & open` navigates to.
 * Nothing is caught here: a rejected write must reach the caller so the
 * surface can keep the typed text and say what happened (§7).
 */
export function useQuickAddCreate() {
  const { addNPC, npcs } = useNPCs();
  const { addQuest } = useQuests();
  const { createLocation, locations } = useLocations();
  const { markEntityAsConverted } = useNotes();

  return useCallback(
    async (
      entity: QuickAddEntity,
      values: QuickAddValues,
      options: QuickAddCreateOptions = {}
    ): Promise<string> => {
      /*
        Names become ids here, and nowhere earlier.

        Everything relational the extractor returns is prose -- it has never
        seen the NPC directory or the location tree -- and it was being written
        into id-shaped fields verbatim. `convertEntity` could not fix that: it
        has no access to the loaded collections. This hook already reads both,
        one line above, immediately before the write, which makes it the only
        place the translation can honestly happen.

        `resolveNameToId` fails closed on no match and on an ambiguous one, so
        an unresolved name leaves the id empty rather than dangling. The name
        itself is kept in the prose field it came from (`location`), so nothing
        the session said is lost -- only the false claim of a link.
      */
      const carry = resolveCarriedNames(entity, options.carry, npcs, locations);
      /*
        `values.parentId` too, and not only the carry. `splitInitialData` lifts
        `parentId` out of `initialData` into the typed values, and
        `buildDocument` gives it precedence -- so resolving only the carry
        would have left the raw name winning, and this whole step doing
        nothing for the one field that provoked it.
      */
      const resolvedValues: QuickAddValues =
        entity === "location" && values.parentId !== undefined
          ? { ...values, parentId: resolveLocationRef(values.parentId, locations) }
          : values;
      const document = QUICK_ADD_SPECS[entity].buildDocument(resolvedValues, carry);

      let id: string;
      switch (entity) {
        case "npc":
          id = await addNPC(document as Parameters<typeof addNPC>[0]);
          break;
        case "quest":
          id = await addQuest(document as Parameters<typeof addQuest>[0]);
          break;
        case "location":
          id = await createLocation(document as Parameters<typeof createLocation>[0]);
          break;
      }

      // Mark the source note's extracted entity as converted, exactly as the
      // four existing create forms do. Deliberately after the write and before
      // the caller navigates, so a failure here surfaces rather than stranding
      // a note that still offers to convert something already created.
      if (options.noteId && options.entityId) {
        await markEntityAsConverted(options.noteId, options.entityId, id);
      }

      return id;
    },
    [addNPC, addQuest, createLocation, markEntityAsConverted, npcs, locations]
  );
}

export default useQuickAddCreate;
