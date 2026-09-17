// src/shared/components/quick-add/useQuickAddCreate.ts
import { useCallback } from "react";
import { useNPCs, useQuests, useLocations } from "features/campaign-entities";
import { useNotes } from "features/collaboration";
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
  const { addNPC } = useNPCs();
  const { addQuest } = useQuests();
  const { createLocation } = useLocations();
  const { markEntityAsConverted } = useNotes();

  return useCallback(
    async (
      entity: QuickAddEntity,
      values: QuickAddValues,
      options: QuickAddCreateOptions = {}
    ): Promise<string> => {
      const document = QUICK_ADD_SPECS[entity].buildDocument(values, options.carry);

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
    [addNPC, addQuest, createLocation, markEntityAsConverted]
  );
}

export default useQuickAddCreate;
