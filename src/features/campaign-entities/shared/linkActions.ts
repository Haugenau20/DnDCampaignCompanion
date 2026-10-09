// src/features/campaign-entities/shared/linkActions.ts
import type { AttachKind } from 'shared/components/attach-tray/attachCandidates';
import type { RecordChange } from 'core/types/common';
import type { NPC, NPCConnections } from '../npcs/types';
import type { Quest, QuestLocation } from '../quests/types';
import type { Location } from '../locations/types';
import type { Rumor } from '../rumors/types';
import { keyPlaceIsLocation } from '../locations/utils/location-display';
import { questNamesLocation } from './links';

/** One end of a link. */
export interface LinkEnd {
  kind: AttachKind;
  id: string;
}

/**
 * What the actions read and write through: the lists and writers the
 * contexts hand every page (`useNPCs`, `useQuests`, `useLocations`,
 * `useRumors`).
 */
export interface LinkDeps {
  npcs: readonly NPC[];
  quests: readonly Quest[];
  locations: readonly Location[];
  updateNPC: (id: string, change: RecordChange<NPC>) => Promise<void>;
  updateQuest: (id: string, change: RecordChange<Quest>) => Promise<void>;
  updateLocation: (id: string, change: RecordChange<Location>) => Promise<void>;
  updateRumor: (id: string, change: RecordChange<Rumor>) => Promise<void>;
}

/** The two ends in a fixed order, so each pair is handled in one place. */
function ordered(a: LinkEnd, b: LinkEnd): [LinkEnd, LinkEnd] {
  const rank: Record<AttachKind, number> = { npc: 0, quest: 1, location: 2, rumor: 3 };
  return rank[a.kind] <= rank[b.kind] ? [a, b] : [b, a];
}

const NO_CONNECTIONS: NPCConnections = { relatedNPCs: [], affiliations: [] };

const add = (ids: readonly string[] | undefined, id: string) => Array.from(new Set([...(ids ?? []), id]));
const without = (ids: readonly string[] | undefined, id: string) => (ids ?? []).filter((existing) => existing !== id);

/**
 * One `connections` list of an NPC, changed, worked out from the record the
 * server holds; `connections` is one stored map, so the other lists go back
 * as they are.
 */
const changeConnections =
  (list: keyof NPCConnections, next: (ids: string[]) => string[]) => (current: NPC) => {
    const connections = current.connections ?? NO_CONNECTIONS;
    return { connections: { ...connections, [list]: next(connections[list] ?? []) } };
  };

/**
 * Links and unlinks two records, from whichever page the player is on (T131).
 *
 * Every link is written to its owner (`links.ts` has the table), so adding a
 * quest on a person's page and adding the person on the quest's page store
 * the same thing, and removing it clears the same field.
 *
 * Each write is worked out from the record the server holds (T083), so a
 * link another player added a moment ago survives this one.
 */
export function createLinkActions({
  npcs,
  quests,
  locations,
  updateNPC,
  updateQuest,
  updateLocation,
  updateRumor,
}: LinkDeps) {
  const npcOf = (id: string) => npcs.find((npc) => npc.id === id);
  const questOf = (id: string) => quests.find((quest) => quest.id === id);
  const locationOf = (id: string) => locations.find((location) => location.id === id);

  const link = async (a: LinkEnd, b: LinkEnd): Promise<void> => {
    const [first, second] = ordered(a, b);
    const pair = `${first.kind}-${second.kind}`;

    switch (pair) {
      case 'npc-npc': {
        if (first.id === second.id) return;
        // Stored once: nothing to do when the other side already holds it.
        if (npcOf(second.id)?.connections?.relatedNPCs?.includes(first.id)) return;
        await updateNPC(first.id, changeConnections('relatedNPCs', (ids) => add(ids, second.id)));
        return;
      }
      case 'npc-quest':
        await updateQuest(second.id, (current) => ({ relatedNPCIds: add(current.relatedNPCIds, first.id) }));
        return;
      case 'npc-location':
        await updateLocation(second.id, (current) => ({ connectedNPCs: add(current.connectedNPCs, first.id) }));
        return;
      case 'npc-rumor':
        await updateRumor(second.id, (current) => ({ relatedNPCs: add(current.relatedNPCs, first.id) }));
        return;
      case 'quest-location': {
        const location = locationOf(second.id);
        if (!location) return;
        // The quest's own location when it has none, else one of its places.
        await updateQuest(first.id, (current): Partial<Quest> => {
          if (questNamesLocation(current, location)) return {};
          if (!current.locationId) return { locationId: location.id, location: location.name };
          const place: QuestLocation = { name: location.name, description: '', locationId: location.id };
          return { keyLocations: [...(current.keyLocations ?? []), place] };
        });
        return;
      }
      case 'location-rumor':
        await updateRumor(second.id, (current) => ({ relatedLocations: add(current.relatedLocations, first.id) }));
        return;
      default:
        throw new Error(`A ${first.kind} cannot be linked to a ${second.kind}.`);
    }
  };

  const unlink = async (a: LinkEnd, b: LinkEnd): Promise<void> => {
    const [first, second] = ordered(a, b);
    const pair = `${first.kind}-${second.kind}`;

    switch (pair) {
      case 'npc-npc': {
        // Stored once, but on either side: clear whichever holds it.
        for (const [holder, other] of [[first.id, second.id], [second.id, first.id]]) {
          if (npcOf(holder)?.connections?.relatedNPCs?.includes(other)) {
            await updateNPC(holder, changeConnections('relatedNPCs', (ids) => without(ids, other)));
          }
        }
        return;
      }
      case 'npc-quest':
        await updateQuest(second.id, (current) => ({ relatedNPCIds: without(current.relatedNPCIds, first.id) }));
        return;
      case 'npc-location':
        await updateLocation(second.id, (current) => ({ connectedNPCs: without(current.connectedNPCs, first.id) }));
        return;
      case 'npc-rumor':
        await updateRumor(second.id, (current) => ({ relatedNPCs: without(current.relatedNPCs, first.id) }));
        return;
      case 'quest-location': {
        const location = locationOf(second.id);
        const quest = questOf(first.id);
        if (!location) return;
        if (quest && !questNamesLocation(quest, location)) return;
        await updateQuest(first.id, (current): Partial<Quest> => ({
          ...(current.locationId === location.id ? { locationId: '', location: '' } : {}),
          keyLocations: (current.keyLocations ?? []).filter((place) => !keyPlaceIsLocation(place, location)),
        }));
        return;
      }
      case 'location-rumor':
        await updateRumor(second.id, (current) => ({
          relatedLocations: without(current.relatedLocations, first.id),
          ...(current.locationId === first.id ? { locationId: '', location: '' } : {}),
        }));
        return;
      default:
        throw new Error(`A ${first.kind} cannot be linked to a ${second.kind}.`);
    }
  };

  return { link, unlink };
}
