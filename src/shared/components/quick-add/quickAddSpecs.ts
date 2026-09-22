// src/shared/components/quick-add/quickAddSpecs.ts
import type { NPC } from "features/campaign-entities";
import type { Location, Quest } from "features/campaign-entities";
import { normaliseObjectives } from "features/campaign-entities";
import type { DomainData } from "core/types/common";

/**
 * The entities quick add can create.
 *
 * The rumour is deliberately absent. `00-entity-authoring.md` §4 gives it a
 * composer row rather than a dialog, and `15-1` item 9 allows that row to wait
 * for `15-7` -- which it must here, because `RumorForm` requires a third field
 * (`sourceName`) that a two-field surface cannot supply without relaxing
 * validation, and relaxing validation is forbidden by item 1.
 */
export const quickAddEntities = ["npc", "quest", "location"] as const;

export type QuickAddEntity = (typeof quickAddEntities)[number];

/** The two typed fields, plus the one pre-set value the phase allows. */
export interface QuickAddValues {
  name: string;
  line: string;
  /**
   * Pre-set only for a location launched from *Add a place inside*
   * (`00-entity-authoring.md` §6.2). It is the phase's only pre-filled case.
   */
  parentId?: string;
}

/**
 * Everything the surface renders as words.
 *
 * Design language §4: the entity's own name is the campaign's voice and takes
 * the serif; these labels are the application's and take the sans.
 */
export interface QuickAddLabels {
  /** The surface's own heading, e.g. "Add an NPC". */
  title: string;
  nameLabel: string;
  namePlaceholder: string;
  lineLabel: string;
  linePlaceholder: string;
  /** Plural noun for the quiet running count, e.g. "NPCs". */
  countNoun: string;
}

export interface QuickAddErrors {
  name?: string;
  line?: string;
}

/**
 * Fields carried through from note conversion but never shown.
 *
 * The AI extraction supplies an NPC's race and occupation, a quest's
 * objectives and relations, a location's type. `15-1` says to pre-fill the two
 * fields and leave note conversion's wiring alone -- so the rest rides along
 * untouched rather than being dropped on the floor, which would silently throw
 * away the extraction's work. Nothing here can override a typed field or a
 * status default; see `buildDocument`.
 */
export type QuickAddCarry = Record<string, unknown>;

export interface QuickAddSpec {
  entity: QuickAddEntity;
  labels: QuickAddLabels;
  /** Error text for each field, keyed by the field it sits under (§7). */
  messages: { name: string; line: string };
  /** The create payload, defaults included. */
  buildDocument: (values: QuickAddValues, carry?: QuickAddCarry) => unknown;
  /** Where *Create & open* lands, given the new record's id. */
  destinationFor: (id: string) => string;
  /**
   * The first unwritten field on that destination.
   *
   * Passed to the destination in router state as `quickAddFocus`. The prompts
   * themselves belong to `15-4`…`15-6`, which this PR must not implement, so
   * today this is a contract those PRs consume rather than a field anything
   * focuses yet.
   */
  focusField: string;
}

/** Strip the keys a carried payload may never decide. */
const withoutOwned = (carry: QuickAddCarry | undefined, owned: string[]): QuickAddCarry => {
  if (!carry) return {};
  const rest: QuickAddCarry = {};
  Object.keys(carry).forEach((key) => {
    if (!owned.includes(key)) rest[key] = carry[key];
  });
  return rest;
};

export const QUICK_ADD_SPECS: Record<QuickAddEntity, QuickAddSpec> = {
  npc: {
    entity: "npc",
    labels: {
      title: "New NPC",
      nameLabel: "Name",
      namePlaceholder: "Bard the Bowman",
      lineLabel: "Who are they, in a line?",
      linePlaceholder: "A bargeman of Lake-town…",
      countNoun: "NPCs",
    },
    messages: {
      name: "Give them a name.",
      line: "Say who they are, in a line.",
    },
    buildDocument: (values, carry) => {
      const carried = withoutOwned(carry, ["name", "description", "status", "relationship"]);
      const doc: DomainData<NPC> = {
        title: "",
        race: "",
        occupation: "",
        location: "",
        locationId: "",
        appearance: "",
        personality: "",
        background: "",
        tags: [],
        ...(carried as Partial<DomainData<NPC>>),
        name: values.name.trim(),
        description: values.line.trim(),
        // §4: a new NPC is alive with an unknown stance. `NPCForm` defaults the
        // stance to "neutral" instead, which is a judgement the creator has not
        // made yet -- "unknown" is the honest value and is one click to change
        // from the row once `15-3` lands.
        status: "alive",
        relationship: "unknown",
        connections: {
          relatedNPCs: [],
          affiliations: [],
          relatedQuests: [],
        },
        notes: [],
      };
      return doc;
    },
    destinationFor: (id) => `/npcs/${id}`,
    focusField: "appearance",
  },

  quest: {
    entity: "quest",
    labels: {
      title: "New Quest",
      nameLabel: "Title",
      namePlaceholder: "Reclaim Erebor",
      lineLabel: "What was the party asked to do?",
      linePlaceholder: "Take back the mountain from Smaug…",
      countNoun: "quests",
    },
    messages: {
      name: "Give the quest a title.",
      line: "Say what the party was asked to do.",
    },
    buildDocument: (values, carry) => {
      const carried = withoutOwned(carry, ["title", "description", "status"]);
      const doc: DomainData<Quest> = {
        background: "",
        leads: [],
        keyLocations: [],
        relatedNPCIds: [],
        complications: [],
        rewards: [],
        location: "",
        locationId: "",
        levelRange: "",
        ...(carried as Partial<DomainData<Quest>>),
        title: values.name.trim(),
        description: values.line.trim(),
        status: "active",
        /*
          After the spread, deliberately. `objectives` is not an owned key --
          the carry is allowed to bring some -- but `Quest.objectives` is
          `QuestObjective[]` and the extractor's schema says `string[]`, so
          what the spread lands here is whatever the caller had. Bare strings
          used to reach Firestore and then crash `QuestDirectory`'s search on
          `obj.description.toLowerCase()`. This is the last point the type can
          still be made to hold. It is also the default: `normaliseObjectives`
          returns [] for the undefined the other three call sites pass.
        */
        objectives: normaliseObjectives(carried.objectives),
      };
      return doc;
    },
    // The quest's own page, which `15-5` added. A quest created here used to
    // land on the directory with its row highlighted, because a quest had no
    // address at all -- the very gap that PR closed.
    destinationFor: (id) => `/quests/${id}`,
    focusField: "objectives",
  },

  location: {
    entity: "location",
    labels: {
      title: "New Location",
      nameLabel: "Name",
      namePlaceholder: "Gondolin",
      lineLabel: "What is this place, in a line?",
      linePlaceholder: "A hidden city of the Noldor…",
      countNoun: "places",
    },
    messages: {
      name: "Give the place a name.",
      line: "Say what this place is, in a line.",
    },
    buildDocument: (values, carry) => {
      const carried = withoutOwned(carry, ["name", "description", "status", "parentId"]);
      const doc: DomainData<Location> = {
        type: "poi",
        features: [],
        connectedNPCs: [],
        relatedQuests: [],
        notes: [],
        tags: [],
        ...(carried as Partial<DomainData<Location>>),
        name: values.name.trim(),
        description: values.line.trim(),
        // §4: a new location is known. The ladder runs known → explored →
        // visited and is one click to advance from the row.
        status: "known",
        // Firestore rejects `undefined`, and the existing form writes ''.
        parentId: values.parentId ?? (carried.parentId as string | undefined) ?? "",
      };
      return doc;
    },
    // `15-4` gives a location a page, so *Create & open* lands on it rather
    // than on the directory with the row expanded.
    destinationFor: (id) => `/locations/${id}`,
    focusField: "parent",
  },
};

/**
 * Validate the two fields.
 *
 * Returns a message per offending field rather than one sentence naming both,
 * so the error can sit under the field it belongs to (§7). An empty object
 * means the values are good.
 */
export function validateQuickAdd(
  entity: QuickAddEntity,
  values: Pick<QuickAddValues, "name" | "line">
): QuickAddErrors {
  const spec = QUICK_ADD_SPECS[entity];
  const errors: QuickAddErrors = {};
  if (!values.name.trim()) errors.name = spec.messages.name;
  if (!values.line.trim()) errors.line = spec.messages.line;
  return errors;
}

/** Type guard for a path segment or menu id that may name a quick-add entity. */
export function isQuickAddEntity(value: string): value is QuickAddEntity {
  return (quickAddEntities as readonly string[]).includes(value);
}

/** Which key on a note-conversion payload holds each of the two fields. */
const INITIAL_DATA_KEYS: Record<QuickAddEntity, { name: string; line: string }> = {
  npc: { name: "name", line: "description" },
  quest: { name: "title", line: "description" },
  location: { name: "name", line: "description" },
};

export interface QuickAddInitialValues {
  initialName: string;
  initialLine: string;
  carry: QuickAddCarry;
  parentId?: string;
}

/**
 * Split note conversion's payload into the two shown fields and the rest.
 *
 * `NoteContext.convertEntity` hands the create route a rich object -- an NPC's
 * race and occupation, a quest's objectives and related NPC ids, a location's
 * type and parent. Two of those keys become the fields quick add shows; every
 * other key rides along untouched so the extraction's work is not thrown away.
 * `noteId` and `entityId` are not part of this: they travel beside the payload
 * and are passed to `markEntityAsConverted` unchanged.
 */
export function splitInitialData(
  entity: QuickAddEntity,
  initialData?: Record<string, unknown> | null
): QuickAddInitialValues {
  const keys = INITIAL_DATA_KEYS[entity];
  if (!initialData) return { initialName: "", initialLine: "", carry: {} };

  const carry: QuickAddCarry = {};
  Object.keys(initialData).forEach((key) => {
    if (key === keys.name || key === keys.line) return;
    // `noteId`/`entityId` are wiring, not record fields -- never write them
    // onto the document.
    if (key === "noteId" || key === "entityId") return;
    if (initialData[key] === undefined) return;
    carry[key] = initialData[key];
  });

  return {
    initialName: typeof initialData[keys.name] === "string" ? (initialData[keys.name] as string) : "",
    initialLine: typeof initialData[keys.line] === "string" ? (initialData[keys.line] as string) : "",
    carry,
    parentId: typeof initialData.parentId === "string" ? (initialData.parentId as string) : undefined,
  };
}
