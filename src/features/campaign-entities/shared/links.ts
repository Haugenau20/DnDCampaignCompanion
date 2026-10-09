// src/features/campaign-entities/shared/links.ts
import type { NPC } from '../npcs/types';
import type { Quest } from '../quests/types';
import type { Location } from '../locations/types';
import type { Rumor } from '../rumors/types';
import { keyPlaceIsLocation } from '../locations/utils/location-display';

/**
 * Where every link between two records is stored, and how each side reads it
 * (T131; `docs/architecture/data-model-review.md`, F1).
 *
 * **Each link has one owner field**, and the other side derives it, the way a
 * rumour's people always worked. A link added on either page lands in the
 * owner, so both pages show it:
 *
 * | Link | Owner | The old second half, still read |
 * |---|---|---|
 * | person ↔ quest | `Quest.relatedNPCIds` | `NPC.connections.relatedQuests` |
 * | person ↔ place | `Location.connectedNPCs` (a person may be in several) | `NPC.locationId` |
 * | place ↔ quest | `Quest.locationId`, `Quest.keyLocations[].locationId` | `Location.relatedQuests` |
 * | rumour → place | `Rumor.locationId` (where it was heard) and `Rumor.relatedLocations` | — |
 * | person ↔ person | `NPC.connections.relatedNPCs`, on either one, once | — |
 * | rumour → person | `Rumor.relatedNPCs` | — |
 *
 * The old halves are read until `scripts/migrate-links.js` has merged them
 * into the owners in production; nothing writes them any more except to
 * clear them when a link is removed. A rumour's two place fields are not
 * halves of one link: both live on the rumour, the directory groups by the
 * first, and both are read together. Ids that resolve to no record are left
 * for the reader to drop, as every reader already does.
 */

/** Ids without empties or repeats, in the order first seen. */
function unique(ids: ReadonlyArray<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

// ------------------------------------------------------------ person ↔ quest

/** The quests a person is in: the quests that name them, and the old half. */
export function questIdsOfNpc(npc: NPC, quests: readonly Quest[]): string[] {
  return unique([
    ...quests.filter((quest) => quest.relatedNPCIds?.includes(npc.id)).map((quest) => quest.id),
    ...(npc.connections?.relatedQuests ?? []),
  ]);
}

/** The people on a quest: the quest's own list, and the old half. */
export function npcIdsOfQuest(quest: Quest, npcs: readonly NPC[]): string[] {
  return unique([
    ...(quest.relatedNPCIds ?? []),
    ...npcs.filter((npc) => npc.connections?.relatedQuests?.includes(quest.id)).map((npc) => npc.id),
  ]);
}

// ------------------------------------------------------------ person ↔ place

/** The places a person is linked to: the places that list them, and the old half. */
export function locationIdsOfNpc(npc: NPC, locations: readonly Location[]): string[] {
  return unique([
    ...locations.filter((location) => location.connectedNPCs?.includes(npc.id)).map((location) => location.id),
    npc.locationId,
  ]);
}

/** The people linked to a place: its own list, and the old half. */
export function npcIdsOfLocation(location: Location, npcs: readonly NPC[]): string[] {
  return unique([
    ...(location.connectedNPCs ?? []),
    ...npcs.filter((npc) => npc.locationId === location.id).map((npc) => npc.id),
  ]);
}

// ------------------------------------------------------------- place ↔ quest

/** Whether a quest itself names a place: as its location, or as one of its places. */
export function questNamesLocation(quest: Quest, location: Location): boolean {
  return (
    (!!quest.locationId && quest.locationId === location.id) ||
    (quest.keyLocations ?? []).some((place) => keyPlaceIsLocation(place, location))
  );
}

/** The quests linked to a place: those that name it, and the old half. */
export function questIdsOfLocation(location: Location, quests: readonly Quest[]): string[] {
  return unique([
    ...quests.filter((quest) => questNamesLocation(quest, location)).map((quest) => quest.id),
    ...(location.relatedQuests ?? []),
  ]);
}

// ------------------------------------------------------------ rumour → place

/** The places a rumour is linked to: where it was heard, and what it concerns. */
export function locationIdsOfRumor(rumor: Rumor): string[] {
  return unique([...(rumor.relatedLocations ?? []), rumor.locationId]);
}

/** The rumours linked to a place. */
export function rumorIdsOfLocation(location: Location, rumors: readonly Rumor[]): string[] {
  return rumors.filter((rumor) => locationIdsOfRumor(rumor).includes(location.id)).map((rumor) => rumor.id);
}

// ----------------------------------------------------------- person ↔ person

/**
 * The people a person is linked to, both ways (maintainer, 2026-10-08):
 * "Aragorn knows Arwen" is stored once, on either of them, and both pages
 * show it.
 */
export function npcIdsOfNpc(npc: NPC, npcs: readonly NPC[]): string[] {
  return unique([
    ...(npc.connections?.relatedNPCs ?? []),
    ...npcs
      .filter((other) => other.id !== npc.id && other.connections?.relatedNPCs?.includes(npc.id))
      .map((other) => other.id),
  ]).filter((id) => id !== npc.id);
}

// ----------------------------------------------------------- rumour → person

/** The rumours that name a person. */
export function rumorIdsOfNpc(npc: NPC, rumors: readonly Rumor[]): string[] {
  return rumors.filter((rumor) => rumor.relatedNPCs?.includes(npc.id)).map((rumor) => rumor.id);
}
