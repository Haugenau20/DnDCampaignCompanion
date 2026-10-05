// src/features/campaign-entities/__tests__/create-alongside.test.tsx
//
// T088 (DATA-005): turning one thing into a record -- a note's detected
// entity into an NPC, a location's feature into a place -- creates the record
// and changes its source in one commit. Created first and changed after, a
// failed change left the record behind and every retry made another.
//
// The real providers and `useFirebaseData` are mounted over a fake
// `useFirestore` whose `createDocumentWithUpdates` commits nothing when the
// decision throws, as the transaction does.
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { NPCProvider, useNPCs } from '@/features/campaign-entities/npcs/context/NPCContext';
import { LocationProvider, useLocations } from '@/features/campaign-entities/locations/context/LocationContext';
import { QuestProvider, useQuests } from '@/features/campaign-entities/quests/context/QuestContext';
import { RumorProvider, useRumors } from '@/features/campaign-entities/rumors/context/RumorContext';
import type { CreateAlongside } from 'core/types/common';

type Doc = Record<string, any>;

const PATH = 'groups/group-1/campaigns/campaign-a';
const NOTES = 'groups/group-1/users/user-1/notes';

/** Stored documents, by full collection path. */
let mockStore: Record<string, Doc[]> = {};
/** Every commit that reached the fake. */
let mockCommits: Array<{ op: string; path: string; id: string; data?: Doc; updates?: Array<{ path: string; id: string; data: Doc }> }> = [];

const mockResolve = (collection: string) =>
  collection.includes('/') ? collection : `${PATH}/${collection}`;

const mockFirestore = {
  subscribeToCollection: (path: string, onNext: (documents: Doc[]) => void) => {
    Promise.resolve().then(() => onNext([...(mockStore[path] ?? [])]));
    return () => undefined;
  },
  getCollection: async (collection: string) => mockStore[mockResolve(collection)] ?? [],
  getDocument: async () => null,
  createDocument: async (collection: string, data: Doc, id: string) => {
    mockCommits.push({ op: 'create', path: mockResolve(collection), id, data });
    return id;
  },
  createDocumentWithUpdates: async (
    collection: string,
    id: string,
    sourceCollection: string,
    decide: (read: (id: string) => Promise<Doc | undefined>) => Promise<{ create: Doc; updates: Array<{ id: string; data: Doc }> }>
  ) => {
    const sourcePath = mockResolve(sourceCollection);
    const { create, updates } = await decide(async (otherId) =>
      (mockStore[sourcePath] ?? []).find((stored) => stored.id === otherId)
    );
    mockCommits.push({
      op: 'create-with-updates',
      path: mockResolve(collection),
      id,
      data: create,
      updates: updates.map((update) => ({ path: sourcePath, ...update })),
    });
  },
};

const mockAuth = { user: { uid: 'user-1' }, loading: false };
const mockUserState = {
  userProfile: { uid: 'user-1' },
  activeGroupUserProfile: { username: 'Bilbo', activeCharacterId: null, characters: [] },
};
const mockGroupsState = { activeGroupId: 'group-1' };
const mockCampaignsState = { activeCampaignId: 'campaign-a' };

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
  images: { upload: jest.fn(), remove: jest.fn(), recordReleasedImage: jest.fn(), clearReleasedImage: jest.fn() },
  default: { document: { batchOperations: jest.fn() } },
}));

let npcs: ReturnType<typeof useNPCs>;
let locations: ReturnType<typeof useLocations>;
let quests: ReturnType<typeof useQuests>;
let rumors: ReturnType<typeof useRumors>;

const Harness: React.FC = () => {
  npcs = useNPCs();
  locations = useLocations();
  quests = useQuests();
  rumors = useRumors();
  return null;
};

async function mount() {
  render(
    <NPCProvider>
      <LocationProvider>
        <QuestProvider>
          <RumorProvider>
            <Harness />
          </RumorProvider>
        </QuestProvider>
      </LocationProvider>
    </NPCProvider>
  );
  await waitFor(() => expect(rumors).toBeDefined());
}

/** Marks entity `e1` of note `note-1` as converted into the new record. */
const markNote: CreateAlongside = {
  collection: NOTES,
  id: 'note-1',
  change: (current, createdId) => {
    if (!current) throw new Error('Note not found');
    return {
      extractedEntities: current.extractedEntities.map((entity: Doc) =>
        entity.id === 'e1' ? { ...entity, isConverted: true, convertedToId: createdId } : entity
      ),
    };
  },
};

const NOTE = {
  id: 'note-1',
  extractedEntities: [{ id: 'e1', text: 'Strider', isConverted: false }, { id: 'e2', text: 'Bree' }],
};

const RECORDS: Array<[string, string, () => (alongside?: CreateAlongside) => Promise<string>]> = [
  ['an NPC', 'npcs', () => (alongside) => npcs.addNPC({ name: 'Strider' } as any, alongside)],
  ['a location', 'locations', () => (alongside) => locations.createLocation({ name: 'Strider' } as any, alongside)],
  ['a quest', 'quests', () => (alongside) => quests.addQuest({ title: 'Strider' } as any, alongside)],
  ['a rumour', 'rumors', () => (alongside) => rumors.addRumor({ title: 'Strider', content: '' } as any, alongside)],
];

beforeEach(() => {
  mockStore = { [NOTES]: [NOTE] };
  mockCommits = [];
});

describe.each(RECORDS)('creating %s with a change alongside (T088)', (_label, collection, create) => {
  it('commits the record and the change as one write', async () => {
    await mount();

    let id = '';
    await act(async () => {
      id = await create()(markNote);
    });

    expect(mockCommits).toHaveLength(1);
    expect(mockCommits[0]).toMatchObject({
      op: 'create-with-updates',
      path: `${PATH}/${collection}`,
      id,
      updates: [{
        path: NOTES,
        id: 'note-1',
        data: {
          extractedEntities: [
            { id: 'e1', text: 'Strider', isConverted: true, convertedToId: id },
            { id: 'e2', text: 'Bree' },
          ],
        },
      }],
    });
  });

  it('commits nothing when the change refuses', async () => {
    mockStore = {};
    await mount();

    await act(async () => {
      await expect(create()(markNote)).rejects.toThrow('Note not found');
    });

    expect(mockCommits).toEqual([]);
  });

  it('creates alone without one, as before', async () => {
    await mount();

    await act(async () => {
      await create()();
    });

    expect(mockCommits).toEqual([expect.objectContaining({ op: 'create', path: `${PATH}/${collection}` })]);
  });
});
