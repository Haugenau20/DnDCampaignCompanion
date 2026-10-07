// src/shared/components/quick-add/quickAddEntity.ts

/*
 * What quick add can create, and what a launcher may hand it -- the part of
 * quick add that names things without building them.
 *
 * Kept apart from `quickAddSpecs.ts` because the specs import the entity
 * features to build their documents, and the launchers do not need that. The
 * attach tray is a launcher, and `campaign-entities` renders it: were the tray
 * to reach the specs, every feature that renders it would import itself back
 * through `shared/`, which `lint`'s `import/no-cycle` refuses (T030). So this
 * file imports nothing, and must keep importing nothing from `features/`.
 */

/**
 * The entities quick add can create.
 *
 * The rumour is deliberately absent. It gets a composer row rather than a
 * dialog, and `15-7` built that row: one field,
 * `RumorComposer`, at the top of the rumours list. A rumour has no page for
 * *Create & open* to land on, and asks for no second field -- a title or some
 * content is enough, and its source is optional (T041, closed 2026-09-26).
 */
export const quickAddEntities = ["npc", "quest", "location"] as const;

export type QuickAddEntity = (typeof quickAddEntities)[number];

/**
 * Fields carried through from note conversion but never shown.
 *
 * The AI extraction supplies an NPC's race and occupation, a quest's
 * objectives and relations, a location's type. `15-1` says to pre-fill the two
 * fields and leave note conversion's wiring alone -- so the rest rides along
 * untouched rather than being dropped on the floor, which would silently throw
 * away the extraction's work. Nothing here can override a typed field or a
 * status default; see `buildDocument` in `quickAddSpecs.ts`.
 */
export type QuickAddCarry = Record<string, unknown>;

/** Type guard for a path segment or menu id that may name a quick-add entity. */
export function isQuickAddEntity(value: string): value is QuickAddEntity {
  return (quickAddEntities as readonly string[]).includes(value);
}
