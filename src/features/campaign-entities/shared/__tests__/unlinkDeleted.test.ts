// src/features/campaign-entities/shared/__tests__/unlinkDeleted.test.ts
//
// T131: deleting a record removes its id from every list that named it.
import { unlinkDeleted } from '../unlinkDeleted';

/** The campaign as the server holds it: collection path -> id -> record. */
let mockStore: Record<string, Record<string, any>> = {};
const mockWrites: Array<{ collection: string; id: string; data: any }> = [];

/** Reads `a.b.c` from a record, as a Firestore field path. */
const fieldOf = (record: any, path: string) => path.split('.').reduce((value, key) => value?.[key], record);

jest.mock('core/services/firebase', () => ({
  __esModule: true,
  default: {
    document: {
      queryFromServer: jest.fn(async (collection: string, field: string, value: unknown, operator = '==') =>
        Object.entries(mockStore[collection] ?? {})
          .filter(([, record]) => {
            const held = fieldOf(record, field);
            return operator === 'array-contains' ? Array.isArray(held) && held.includes(value) : held === value;
          })
          .map(([id, record]) => ({ ...record, id }))
      ),
      getCollectionFromServer: jest.fn(async (collection: string) =>
        Object.entries(mockStore[collection] ?? {}).map(([id, record]) => ({ ...record, id }))
      ),
      updateDocumentsAfterReading: jest.fn(async (collection: string, decide: any) => {
        const updates = await decide(async (id: string) => {
          const record = mockStore[collection]?.[id];
          return record ? { ...record, id } : undefined;
        });
        for (const { id, data } of updates) {
          mockWrites.push({ collection, id, data });
          mockStore[collection][id] = { ...mockStore[collection][id], ...data };
        }
      }),
    },
  },
}));

const PATHS = { npcs: 'c/npcs', quests: 'c/quests', locations: 'c/locations', rumors: 'c/rumors' };
const connections = (extra: Record<string, string[]> = {}) => ({
  relatedNPCs: [],
  affiliations: ['Rangers'],
  relatedQuests: [],
  ...extra,
});

beforeEach(() => {
  mockWrites.length = 0;
  mockStore = {
    'c/npcs': {
      aragorn: { connections: connections({ relatedNPCs: ['gollum', 'arwen'], relatedQuests: ['ring'] }) },
      arwen: { connections: connections() },
    },
    'c/quests': {
      ring: { relatedNPCIds: ['gollum', 'frodo'], locationId: 'moria', keyLocations: [{ name: 'Moria', locationId: 'moria' }, { name: 'Bree' }] },
      other: { relatedNPCIds: ['frodo'] },
    },
    'c/locations': {
      moria: { connectedNPCs: ['gollum'], relatedQuests: ['ring'] },
      bree: { connectedNPCs: ['butterbur'] },
    },
    'c/rumors': {
      whisper: { relatedNPCs: ['gollum'], sourceNpcId: 'gollum', sourceName: 'Gollum', relatedLocations: ['moria', 'bree'], locationId: 'moria' },
      quiet: { relatedNPCs: [], relatedLocations: [] },
    },
  };
});

describe('unlinkDeleted', () => {
  it("takes a deleted person out of every list that named them, keeping a rumour source's name", async () => {
    await unlinkDeleted(PATHS, 'npc', ['gollum']);

    expect(mockStore['c/quests'].ring.relatedNPCIds).toEqual(['frodo']);
    expect(mockStore['c/locations'].moria.connectedNPCs).toEqual([]);
    expect(mockStore['c/rumors'].whisper).toMatchObject({ relatedNPCs: [], sourceNpcId: '', sourceName: 'Gollum' });
    expect(mockStore['c/npcs'].aragorn.connections).toEqual(
      connections({ relatedNPCs: ['arwen'], relatedQuests: ['ring'] })
    );
    // Only the records that named them were written.
    expect(mockWrites.map(({ id }) => id).sort()).toEqual(['aragorn', 'moria', 'ring', 'whisper']);
  });

  it("writes nothing for a deleted quest: it owned its links, and the old halves are read by nothing", async () => {
    await unlinkDeleted(PATHS, 'quest', ['ring']);

    expect(mockWrites).toEqual([]);
  });

  it("unlinks a deleted place from lists, and leaves a single reference visible as one (#1412)", async () => {
    await unlinkDeleted(PATHS, 'location', ['moria']);

    expect(mockStore['c/rumors'].whisper.relatedLocations).toEqual(['bree']);
    expect(mockStore['c/rumors'].whisper.locationId).toBe('moria');
    // The place inside the quest keeps its name and stops pointing anywhere.
    expect(mockStore['c/quests'].ring.keyLocations).toEqual([{ name: 'Moria' }, { name: 'Bree' }]);
    expect(mockStore['c/quests'].ring.locationId).toBe('moria');
  });

  it('writes nothing when nothing named the deleted record', async () => {
    await unlinkDeleted(PATHS, 'npc', ['nobody']);
    expect(mockWrites).toEqual([]);
  });

  it('skips a collection the campaign has no path for', async () => {
    await unlinkDeleted({ ...PATHS, quests: null }, 'npc', ['gollum']);
    expect(mockStore['c/quests'].ring.relatedNPCIds).toEqual(['gollum', 'frodo']);
  });
});
