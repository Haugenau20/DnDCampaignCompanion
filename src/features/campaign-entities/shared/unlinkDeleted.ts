// src/features/campaign-entities/shared/unlinkDeleted.ts
import firebaseServices from 'core/services/firebase';
import { useCampaignCollectionPath } from 'shared/hooks/useCampaignCollectionPath';
import type { NPC } from '../npcs/types';
import type { Quest } from '../quests/types';
import type { Location } from '../locations/types';
import type { Rumor } from '../rumors/types';

/** The campaign's record collections, as full paths; null without a campaign. */
export interface CampaignRecordPaths {
  npcs: string | null;
  quests: string | null;
  locations: string | null;
  rumors: string | null;
}

/** What kind of record was deleted. Nothing links *to* a rumour. */
export type DeletedKind = 'npc' | 'quest' | 'location';

/** One collection to clean: how to find the records naming a deleted id, and what to write. */
interface Cleanup<T> {
  collection: string | null;
  /** The list fields that may hold the id, queried with `array-contains`. */
  find: ReadonlyArray<{ field: string; operator: '==' | 'array-contains' }> | 'scan';
  /** The fields to write, or null when the record names none of the ids. */
  strip: (record: T, ids: ReadonlySet<string>) => Partial<T> | null;
}

const minus = (list: readonly string[] | undefined, ids: ReadonlySet<string>) =>
  (list ?? []).filter((id) => !ids.has(id));

const holds = (list: readonly string[] | undefined, ids: ReadonlySet<string>) =>
  (list ?? []).some((id) => ids.has(id));

/** The `connections` map with its people stripped, the other lists as they are. */
const stripConnections = (npc: NPC, ids: ReadonlySet<string>): Partial<NPC> | null =>
  holds(npc.connections?.relatedNPCs, ids)
    ? { connections: { ...npc.connections, relatedNPCs: minus(npc.connections?.relatedNPCs, ids) } }
    : null;

/**
 * What each kind of deletion leaves behind, and where.
 *
 * Lists lose the id (T131: "deleting a record removes its id from the
 * owner's lists"). A single reference -- a quest's or rumour's `locationId`
 * -- is left as it is: a reference to a place that no longer exists stays
 * visible as one (#1412). A quest's place inside it keeps its name and
 * description and only stops pointing at the place.
 */
function cleanupsFor(kind: DeletedKind, paths: CampaignRecordPaths): Cleanup<NPC | Quest | Location | Rumor>[] {
  switch (kind) {
    case 'npc':
      return [
        {
          collection: paths.quests,
          find: [{ field: 'relatedNPCIds', operator: 'array-contains' }],
          strip: (quest, ids) => holds((quest as Quest).relatedNPCIds, ids)
            ? { relatedNPCIds: minus((quest as Quest).relatedNPCIds, ids) } : null,
        },
        {
          collection: paths.locations,
          find: [{ field: 'connectedNPCs', operator: 'array-contains' }],
          strip: (location, ids) => holds((location as Location).connectedNPCs, ids)
            ? { connectedNPCs: minus((location as Location).connectedNPCs, ids) } : null,
        },
        {
          collection: paths.rumors,
          find: [
            { field: 'relatedNPCs', operator: 'array-contains' },
            { field: 'sourceNpcId', operator: '==' },
          ],
          strip: (record, ids) => {
            const rumor = record as Rumor;
            const people = holds(rumor.relatedNPCs, ids);
            const source = !!rumor.sourceNpcId && ids.has(rumor.sourceNpcId);
            if (!people && !source) return null;
            return {
              ...(people ? { relatedNPCs: minus(rumor.relatedNPCs, ids) } : {}),
              // The source's name stays, as written; only the link goes.
              ...(source ? { sourceNpcId: '' } : {}),
            };
          },
        },
        {
          collection: paths.npcs,
          find: [{ field: 'connections.relatedNPCs', operator: 'array-contains' }],
          strip: (npc, ids) => stripConnections(npc as NPC, ids),
        },
      ];
    case 'quest':
      // The quest owned its links, and they went with it: no list elsewhere
      // names a quest.
      return [];
    case 'location':
      return [
        {
          collection: paths.rumors,
          find: [{ field: 'relatedLocations', operator: 'array-contains' }],
          strip: (rumor, ids) => holds((rumor as Rumor).relatedLocations, ids)
            ? { relatedLocations: minus((rumor as Rumor).relatedLocations, ids) } : null,
        },
        {
          // A place inside a quest is an object in a list, which no query can
          // match on one field: the quests are read whole. Places are deleted
          // rarely enough for that to be the cheaper design.
          collection: paths.quests,
          find: 'scan',
          strip: (record, ids) => {
            const quest = record as Quest;
            const places = quest.keyLocations ?? [];
            if (!places.some((place) => place.locationId && ids.has(place.locationId))) return null;
            return {
              keyLocations: places.map((place) => {
                if (!place.locationId || !ids.has(place.locationId)) return place;
                const { locationId: _gone, ...rest } = place;
                return rest;
              }),
            };
          },
        },
      ];
  }
}

/**
 * Remove deleted records' ids from every list that named them (T131), as one
 * transaction per collection, each record re-read on the server so a link
 * another player added meanwhile survives.
 *
 * Run after the deletion has committed. The records are gone either way, and
 * every reader already drops an id that resolves to nothing, so a failure
 * here leaves only harmless leftovers, which `scripts/migrate-links.js`
 * finds; the caller reports it rather than undoing the deletion.
 *
 * @param paths - the campaign's record collections
 * @param kind - what was deleted
 * @param deletedIds - the deleted records' ids
 */
export async function unlinkDeleted(
  paths: CampaignRecordPaths,
  kind: DeletedKind,
  deletedIds: readonly string[]
): Promise<void> {
  const ids = new Set(deletedIds.filter(Boolean));
  if (ids.size === 0) return;

  for (const cleanup of cleanupsFor(kind, paths)) {
    if (!cleanup.collection) continue;
    const collection = cleanup.collection;

    let candidates: Array<{ id: string }>;
    if (cleanup.find === 'scan') {
      candidates = await firebaseServices.document.getCollectionFromServer(collection);
    } else {
      const found = await Promise.all(
        Array.from(ids).flatMap((id) =>
          (cleanup.find as Exclude<typeof cleanup.find, 'scan'>).map(({ field, operator }) =>
            firebaseServices.document.queryFromServer<{ id: string }>(collection, field, id, operator)
          )
        )
      );
      candidates = found.flat();
    }
    const candidateIds = Array.from(new Set(candidates.map((record) => record.id))).filter((id) => !ids.has(id));
    if (candidateIds.length === 0) continue;

    // At most 500 writes in one transaction.
    for (let start = 0; start < candidateIds.length; start += 400) {
      const chunk = candidateIds.slice(start, start + 400);
      await firebaseServices.document.updateDocumentsAfterReading<Record<string, unknown>>(collection, async (read) => {
        const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
        for (const id of chunk) {
          const record = await read(id);
          if (!record) continue;
          const data = cleanup.strip(record as never, ids);
          if (data) updates.push({ id, data: data as Record<string, unknown> });
        }
        return updates;
      });
    }
  }
}

/**
 * The campaign's record collections, for {@link unlinkDeleted}.
 *
 * @returns their full paths, null without a campaign
 */
export function useCampaignRecordPaths(): CampaignRecordPaths {
  return {
    npcs: useCampaignCollectionPath('npcs'),
    quests: useCampaignCollectionPath('quests'),
    locations: useCampaignCollectionPath('locations'),
    rumors: useCampaignCollectionPath('rumors'),
  };
}

/**
 * {@link unlinkDeleted}, reported rather than thrown: the deletion it follows
 * has already happened.
 */
export async function unlinkDeletedQuietly(
  paths: CampaignRecordPaths,
  kind: DeletedKind,
  deletedIds: readonly string[]
): Promise<void> {
  try {
    await unlinkDeleted(paths, kind, deletedIds);
  } catch (error) {
    console.warn(`Deleted, but its links were not all removed (${kind}):`, error);
  }
}
