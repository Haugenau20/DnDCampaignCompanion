// src/features/campaign-entities/__tests__/stale-writes.test.tsx
//
// T083 (DATA-003, IMG-002, TEST-002): an edit writes the fields it changes and
// nothing else.
//
// Every page works from the listener's copy of a record, and that copy can be
// behind the server: another player has just renamed the NPC, or replaced its
// picture and deleted the old file. The writers used to send the whole copy
// back with their one change, so ticking an objective or adding a note
// reverted the rename and pointed the record at the deleted picture again.
//
// The real providers and `useFirebaseData` are mounted over a fake
// `useFirestore` whose update merges the fields it is given into the stored
// document, as Firestore's `updateDoc` does. The listener delivers each
// collection once, so after `anotherPlayer` changes the store the providers
// hold a stale copy -- the window every one of these writes can fall into.
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { NPCProvider, useNPCs } from '@/features/campaign-entities/npcs/context/NPCContext';
import { QuestProvider, useQuests } from '@/features/campaign-entities/quests/context/QuestContext';
import { LocationProvider, useLocations } from '@/features/campaign-entities/locations/context/LocationContext';
import { RumorProvider, useRumors } from '@/features/campaign-entities/rumors/context/RumorContext';

type Doc = Record<string, any>;

const CAMPAIGN = 'groups/group-1/campaigns/campaign-1';

/** Stored documents, by full collection path. */
let mockStore: Record<string, Doc[]> = {};

const mockResolve = (collection: string) =>
  collection.includes('/') ? collection : `${CAMPAIGN}/${collection}`;

const mockFirestore = {
  subscribeToCollection: (path: string, onNext: (documents: Doc[]) => void) => {
    // One delivery, copied: later changes to the store stay unseen.
    const snapshot = JSON.parse(JSON.stringify(mockStore[path] ?? []));
    Promise.resolve().then(() => onNext(snapshot));
    return () => undefined;
  },
  getCollection: async (collection: string) => mockStore[mockResolve(collection)] ?? [],
  getDocument: async () => null,
  /** `updateDoc`: the given fields replace theirs, every other field stays. */
  updateDocumentWithAttribution: async (collection: string, id: string, data: Doc) => {
    const stored = (mockStore[mockResolve(collection)] ?? []).find((doc) => doc.id === id);
    if (!stored) throw new Error(`No document ${collection}/${id}`);
    Object.assign(stored, JSON.parse(JSON.stringify(data)));
  },
  /**
   * A transaction: `decide` reads the stored documents, not the listener's
   * copy, and its fields are merged in. (Firestore re-runs it if a read
   * changes before commit; `DocumentService`'s own tests cover that.)
   */
  updateDocumentAfterReading: async (
    collection: string,
    id: string,
    decide: (read: (otherId: string) => Promise<Doc | undefined>) => Promise<Doc>
  ) => {
    const documents = mockStore[mockResolve(collection)] ?? [];
    const read = async (otherId: string) => {
      const found = documents.find((doc) => doc.id === otherId);
      return found ? JSON.parse(JSON.stringify(found)) : undefined;
    };
    const fields = await decide(read);
    const stored = documents.find((doc) => doc.id === id);
    if (!stored) throw new Error(`No document ${collection}/${id}`);
    Object.assign(stored, JSON.parse(JSON.stringify(fields)));
  },
  createDocument: async (_collection: string, _data: Doc, id: string) => id,
  deleteDocument: async () => undefined,
  batchOperations: async () => undefined,
};

// Stable objects, as the real hooks return: effects depend on them.
const mockAuth = { user: { uid: 'user-1' }, loading: false };
const mockUserState = {
  userProfile: { uid: 'user-1' },
  activeGroupUserProfile: { username: 'Bilbo', activeCharacterId: null, characters: [] },
};
const mockGroupsState = { activeGroupId: 'group-1' };
const mockCampaignsState = { activeCampaignId: 'campaign-1' };

jest.mock('@/features/user-management', () => ({
  AUTH_STATE_CHANGED_EVENT: 'auth-state-changed',
  useFirestore: () => mockFirestore,
  useAuth: () => mockAuth,
  useUser: () => mockUserState,
  useGroups: () => mockGroupsState,
  useCampaigns: () => mockCampaignsState,
}));

jest.mock('@/shared/hooks/useCampaignContextStatus', () => ({
  useCampaignContextStatus: () => ({ isResolving: false, hasRequiredContext: true, missingContext: null }),
}));

jest.mock('core/services/firebase', () => ({
  __esModule: true,
  images: { upload: jest.fn(), remove: jest.fn().mockResolvedValue(undefined) },
  default: { document: { batchOperations: () => Promise.resolve() } },
}));

/** The latest render's context values, for the test to call. */
let npcs: ReturnType<typeof useNPCs>;
let quests: ReturnType<typeof useQuests>;
let locations: ReturnType<typeof useLocations>;
let rumors: ReturnType<typeof useRumors>;

const Harness: React.FC = () => {
  npcs = useNPCs();
  quests = useQuests();
  locations = useLocations();
  rumors = useRumors();
  return null;
};

const OLD_IMAGE = { path: `${CAMPAIGN}/npcs/aldric/old.webp`, url: 'https://example.test/old.webp' };
const NEW_IMAGE = { path: `${CAMPAIGN}/npcs/aldric/new.webp`, url: 'https://example.test/new.webp' };

beforeEach(() => {
  mockStore = {
    [`${CAMPAIGN}/npcs`]: [{
      id: 'aldric',
      name: 'Aldric',
      description: 'A smith',
      status: 'alive',
      relationship: 'neutral',
      connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
      notes: [],
      image: OLD_IMAGE,
    }],
    [`${CAMPAIGN}/quests`]: [{
      id: 'ring',
      title: 'The ring',
      description: 'Take it east',
      status: 'active',
      objectives: [
        { id: 'o1', description: 'Leave the Shire', completed: false },
        { id: 'o2', description: 'Reach Rivendell', completed: false },
      ],
    }],
    [`${CAMPAIGN}/locations`]: [{
      id: 'bree',
      name: 'Bree',
      description: 'A village',
      type: 'town',
      status: 'known',
      notes: [],
      image: { ...OLD_IMAGE, path: `${CAMPAIGN}/locations/bree/old.webp` },
    }],
    [`${CAMPAIGN}/rumors`]: [{
      id: 'smoke',
      title: 'Smoke over the hills',
      content: 'Seen from Bree',
      status: 'unconfirmed',
      sourceType: 'tavern',
      sourceName: 'Barliman',
      relatedNPCs: [],
      relatedLocations: [],
      notes: [],
    }],
  };
});

/** Mounts the providers and waits until every record has arrived. */
async function mount() {
  render(
    <NPCProvider>
      <QuestProvider>
        <LocationProvider>
          <RumorProvider>
            <Harness />
          </RumorProvider>
        </LocationProvider>
      </QuestProvider>
    </NPCProvider>
  );
  await waitFor(() =>
    expect([npcs.npcs, quests.quests, locations.locations, rumors.rumors].map((list) => list.length))
      .toEqual([1, 1, 1, 1])
  );
}

/** Another player's write, which this client's listener has not delivered. */
function anotherPlayer(collection: string, id: string, fields: Doc) {
  Object.assign(mockStore[`${CAMPAIGN}/${collection}`].find((doc) => doc.id === id)!, fields);
}

/** The document as the server now holds it. */
const stored = (collection: string, id: string) =>
  mockStore[`${CAMPAIGN}/${collection}`].find((doc) => doc.id === id)!;

describe('an NPC edit leaves what it did not change (T083)', () => {
  beforeEach(async () => {
    await mount();
    anotherPlayer('npcs', 'aldric', { name: 'Aldric the Bold', image: NEW_IMAGE });
  });

  const keptTheirs = () => {
    expect(stored('npcs', 'aldric').name).toBe('Aldric the Bold');
    // The old file is deleted once a replace saves; pointing back at it is a
    // broken picture that no sweep can mend (IMG-002).
    expect(stored('npcs', 'aldric').image).toEqual(NEW_IMAGE);
  };

  it('adding a note', async () => {
    await act(() => npcs.updateNPCNote('aldric', { date: '2026-10-04', text: 'Owes us a sword' } as any));
    expect(stored('npcs', 'aldric').notes).toHaveLength(1);
    keptTheirs();
  });

  it('changing the stance', async () => {
    await act(() => npcs.updateNPCRelationship('aldric', 'friendly'));
    expect(stored('npcs', 'aldric').relationship).toBe('friendly');
    keptTheirs();
  });

  it('saving one field from the page', async () => {
    await act(() => npcs.updateNPC('aldric', { description: 'A smith in Bree' }));
    expect(stored('npcs', 'aldric').description).toBe('A smith in Bree');
    keptTheirs();
  });
});

describe('a quest edit leaves what it did not change (T083)', () => {
  beforeEach(async () => {
    await mount();
    anotherPlayer('quests', 'ring', { title: 'The One Ring', status: 'paused' });
  });

  const keptTitle = () => expect(stored('quests', 'ring').title).toBe('The One Ring');

  it('ticking an objective writes the objectives alone', async () => {
    await act(() => quests.updateQuestObjective('ring', 'o1', true));
    expect(stored('quests', 'ring').objectives[0].completed).toBe(true);
    keptTitle();
    // Ticking is not a status change: theirs stands.
    expect(stored('quests', 'ring').status).toBe('paused');
  });

  it('changing the status', async () => {
    await act(() => quests.updateQuestStatus('ring', 'failed'));
    expect(stored('quests', 'ring').status).toBe('failed');
    keptTitle();
  });

  it('completing it', async () => {
    await act(() => quests.markQuestCompleted('ring'));
    expect(stored('quests', 'ring').status).toBe('completed');
    expect(stored('quests', 'ring').dateCompleted).toEqual(expect.any(String));
    keptTitle();
  });

  it('failing it', async () => {
    await act(() => quests.markQuestFailed('ring'));
    expect(stored('quests', 'ring').status).toBe('failed');
    keptTitle();
  });

  it('saving one field from the page', async () => {
    await act(() => quests.updateQuest('ring', { description: 'Take it to Mordor' }));
    expect(stored('quests', 'ring').description).toBe('Take it to Mordor');
    keptTitle();
    expect(stored('quests', 'ring').status).toBe('paused');
  });
});

describe('a location edit leaves what it did not change (T083)', () => {
  const NEW_PLACE_IMAGE = { ...NEW_IMAGE, path: `${CAMPAIGN}/locations/bree/new.webp` };

  beforeEach(async () => {
    await mount();
    anotherPlayer('locations', 'bree', { name: 'Bree-land', image: NEW_PLACE_IMAGE });
  });

  const keptTheirs = () => {
    expect(stored('locations', 'bree').name).toBe('Bree-land');
    expect(stored('locations', 'bree').image).toEqual(NEW_PLACE_IMAGE);
  };

  it('adding a note', async () => {
    await act(() => locations.updateLocationNote('bree', { text: 'The Prancing Pony' } as any));
    expect(stored('locations', 'bree').notes).toHaveLength(1);
    keptTheirs();
  });

  it('changing the status', async () => {
    await act(() => locations.updateLocationStatus('bree', 'visited'));
    expect(stored('locations', 'bree').status).toBe('visited');
    keptTheirs();
  });
});

describe('a rumour edit leaves what it did not change (T083)', () => {
  beforeEach(async () => {
    await mount();
    anotherPlayer('rumors', 'smoke', { title: 'Smoke over Weathertop', content: 'Seen from the Road' });
  });

  const keptTheirs = () => {
    expect(stored('rumors', 'smoke').title).toBe('Smoke over Weathertop');
    expect(stored('rumors', 'smoke').content).toBe('Seen from the Road');
  };

  it('changing the status', async () => {
    await act(() => rumors.updateRumorStatus('smoke', 'confirmed'));
    expect(stored('rumors', 'smoke').status).toBe('confirmed');
    keptTheirs();
  });

  it('adding a note', async () => {
    await act(() => rumors.updateRumorNote('smoke', { id: 'n1', content: 'Rangers about' } as any));
    expect(stored('rumors', 'smoke').notes).toHaveLength(1);
    keptTheirs();
  });

  it('saving one field from the page', async () => {
    await act(() => rumors.updateRumor('smoke', { relatedNPCs: ['aldric'] }));
    expect(stored('rumors', 'smoke').relatedNPCs).toEqual(['aldric']);
    keptTheirs();
  });
});

// T083, the list half: a list is computed from what the server holds, so two
// changes to the same list from copies of the same moment both survive.
// `anotherPlayer` below stands for a change that landed after this client's
// copy was taken -- the same race as two people clicking at once.
describe('two changes to one list both survive (T083)', () => {
  beforeEach(mount);

  it('two objective ticks', async () => {
    anotherPlayer('quests', 'ring', {
      objectives: [
        { id: 'o1', description: 'Leave the Shire', completed: false },
        { id: 'o2', description: 'Reach Rivendell', completed: true },
      ],
    });
    await act(() => quests.updateQuestObjective('ring', 'o1', true));
    expect(stored('quests', 'ring').objectives.map((o: Doc) => o.completed)).toEqual([true, true]);
  });

  it('an objective added while another is ticked', async () => {
    anotherPlayer('quests', 'ring', {
      objectives: [
        { id: 'o1', description: 'Leave the Shire', completed: false },
        { id: 'o2', description: 'Reach Rivendell', completed: false },
        { id: 'o3', description: 'Cross the Misty Mountains', completed: false },
      ],
    });
    await act(() => quests.updateQuestObjective('ring', 'o2', true));
    expect(stored('quests', 'ring').objectives.map((o: Doc) => o.id)).toEqual(['o1', 'o2', 'o3']);
    expect(stored('quests', 'ring').objectives[1].completed).toBe(true);
  });

  it('an objective added by two people', async () => {
    anotherPlayer('quests', 'ring', {
      objectives: [
        { id: 'o1', description: 'Leave the Shire', completed: false },
        { id: 'o2', description: 'Reach Rivendell', completed: false },
        { id: 'o3', description: 'Cross the Misty Mountains', completed: false },
      ],
    });
    await act(() => quests.addQuestObjective('ring', 'Find a guide'));
    expect(stored('quests', 'ring').objectives.map((o: Doc) => o.description)).toEqual([
      'Leave the Shire', 'Reach Rivendell', 'Cross the Misty Mountains', 'Find a guide',
    ]);
  });

  it('completing the quest ticks every objective the server holds', async () => {
    anotherPlayer('quests', 'ring', {
      objectives: [
        { id: 'o1', description: 'Leave the Shire', completed: false },
        { id: 'o2', description: 'Reach Rivendell', completed: false },
        { id: 'o3', description: 'Cross the Misty Mountains', completed: false },
      ],
    });
    await act(() => quests.markQuestCompleted('ring'));
    expect(stored('quests', 'ring').objectives).toHaveLength(3);
    expect(stored('quests', 'ring').objectives.every((o: Doc) => o.completed)).toBe(true);
  });

  it('two notes on an NPC', async () => {
    anotherPlayer('npcs', 'aldric', { notes: [{ date: '2026-10-03', text: 'Mends armour' }] });
    await act(() => npcs.updateNPCNote('aldric', { date: '2026-10-04', text: 'Owes us a sword' } as any));
    expect(stored('npcs', 'aldric').notes.map((n: Doc) => n.text)).toEqual(['Mends armour', 'Owes us a sword']);
  });

  it('two notes on a location', async () => {
    anotherPlayer('locations', 'bree', { notes: [{ date: '2026-10-03', text: 'Bill Ferny lurks' }] });
    await act(() => locations.updateLocationNote('bree', { text: 'The Prancing Pony' } as any));
    expect(stored('locations', 'bree').notes.map((n: Doc) => n.text)).toEqual(['Bill Ferny lurks', 'The Prancing Pony']);
  });

  it('two notes on a rumour', async () => {
    anotherPlayer('rumors', 'smoke', { notes: [{ id: 'n0', content: 'Seen twice' }] });
    await act(() => rumors.updateRumorNote('smoke', { id: 'n1', content: 'Rangers about' } as any));
    expect(stored('rumors', 'smoke').notes.map((n: Doc) => n.id)).toEqual(['n0', 'n1']);
  });

  it('a page change worked out from the record, not the copy', async () => {
    anotherPlayer('rumors', 'smoke', { relatedNPCs: ['barliman'] });
    await act(() =>
      rumors.updateRumor('smoke', (rumor) => ({ relatedNPCs: [...rumor.relatedNPCs, 'aldric'] }))
    );
    expect(stored('rumors', 'smoke').relatedNPCs).toEqual(['barliman', 'aldric']);

    anotherPlayer('npcs', 'aldric', { tags: ['smith'] });
    await act(() => npcs.updateNPC('aldric', (npc) => ({ tags: [...(npc.tags ?? []), 'bree'] })));
    expect(stored('npcs', 'aldric').tags).toEqual(['smith', 'bree']);

    anotherPlayer('quests', 'ring', { leads: ['Ask Gandalf'] });
    await act(() => quests.updateQuest('ring', (quest) => ({ leads: [...(quest.leads ?? []), 'Ask Elrond'] })));
    expect(stored('quests', 'ring').leads).toEqual(['Ask Gandalf', 'Ask Elrond']);

    anotherPlayer('locations', 'bree', { features: ['The Pony'] });
    await act(() =>
      locations.updateLocation('bree', (place) => ({ features: [...(place.features ?? []), 'The gate'] }))
    );
    expect(stored('locations', 'bree').features).toEqual(['The Pony', 'The gate']);
  });

  it('a change to a record deleted meanwhile is refused, not written', async () => {
    mockStore[`${CAMPAIGN}/npcs`] = [];
    await expect(
      act(() => npcs.updateNPC('aldric', (npc) => ({ tags: [...(npc.tags ?? []), 'bree'] })))
    ).rejects.toThrow();
  });
});
