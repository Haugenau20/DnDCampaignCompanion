// src/shared/utils/entity-notes.ts

/**
 * The shape an NPC's and a location's notes share: each a document of its own
 * under its record (T133, `features/campaign-entities/shared/recordNotes.ts`).
 */
export interface EntityNote {
  date: string;
  text: string;
  author?: string;
}
