// src/features/collaboration/notes/utils/entity-path.ts

import { EntityType } from "../types";

/**
 * Where a link to a campaign entity mentioned in a note should land.
 *
 * A record with its own page opens that page: quests since `15-5`, NPCs and
 * locations since T014. A rumour has no page by design, so it lands on its row
 * in the directory via `?highlight=` -- which is what that parameter is for:
 * finding a row *in a list*, not standing in for a record's address.
 *
 * Shared by `NoteReferences` and `CampaignLinksPanel`, which each carried their
 * own copy of this map.
 */
export function entityPath(type: EntityType, id: string): string {
  switch (type) {
    case "quest":
      return `/quests/${id}`;
    case "npc":
      return `/npcs/${id}`;
    case "location":
      return `/locations/${id}`;
    case "rumor":
      return `/rumors?highlight=${id}`;
  }
}
