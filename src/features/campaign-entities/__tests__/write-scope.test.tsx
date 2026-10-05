// src/features/campaign-entities/__tests__/write-scope.test.tsx
//
// T082 (DATA-002, IMG-001): an operation finishes in the campaign it was
// started in.
//
// Campaigns routinely hold records with the same id (`aldric` in both here).
// Writes used to name a bare collection, which `DocumentService` resolves
// against whatever campaign is active when the write finally runs. So an
// operation that awaited anything first -- an image upload, a quest create --
// and then wrote, followed a campaign switch into the other campaign's record.
//
// The real providers and `useFirebaseData` are mounted over a fake
// `useFirestore` that resolves names exactly that way: a full path as given, a
// bare name against the campaign active at the moment of the call. Each test
// switches campaign while an operation is in flight and asserts where every
// write landed.
import React from 'react';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import { NPCProvider, useNPCs } from '@/features/campaign-entities/npcs/context/NPCContext';
import { RumorProvider, useRumors } from '@/features/campaign-entities/rumors/context/RumorContext';
import { useImageAttachment } from '@/shared/hooks/useImageAttachment';
import { useFirebaseData } from '@/shared/hooks/useFirebaseData';

type Doc = Record<string, any>;

/** The scope `DocumentService` would resolve a bare name against right now. */
let mockActive = { group: 'group-1', campaign: 'campaign-a' };
/** Stored documents, by full collection path. */
let mockStore: Record<string, Doc[]> = {};
/** Every write that reached the fake, with the full path it resolved to. */
let mockWrites: Array<{ op: string; path: string; id: string; data?: Doc }> = [];
/** Lets a test hold a create until it has switched campaign. */
let mockCreateGate: Promise<void> = Promise.resolve();

/** Resolves a collection the way `DocumentService.getCollectionRef` does. */
const mockResolve = (collection: string) =>
  collection.includes('/')
    ? collection
    : `groups/${mockActive.group}/campaigns/${mockActive.campaign}/${collection}`;

const mockFirestore = {
  subscribeToCollection: (path: string, onNext: (documents: Doc[]) => void) => {
    Promise.resolve().then(() => onNext([...(mockStore[path] ?? [])]));
    return () => undefined;
  },
  getCollection: async (collection: string) => mockStore[mockResolve(collection)] ?? [],
  getDocument: async () => null,
  updateDocumentWithAttribution: async (collection: string, id: string, data: Doc) => {
    mockWrites.push({ op: 'update', path: mockResolve(collection), id, data });
  },
  createDocument: async (collection: string, data: Doc, id: string) => {
    const path = mockResolve(collection);
    await mockCreateGate;
    mockWrites.push({ op: 'create', path, id, data });
    return id;
  },
  // One transaction: the new record and the marks on its sources (T088).
  createDocumentWithUpdates: async (
    collection: string,
    id: string,
    sourceCollection: string,
    decide: (read: (id: string) => Promise<Doc | undefined>) => Promise<{ create: Doc; updates: Array<{ id: string; data: Doc }> }>
  ) => {
    const path = mockResolve(collection);
    const sourcePath = mockResolve(sourceCollection);
    await mockCreateGate;
    const { create, updates } = await decide(async (otherId) =>
      (mockStore[sourcePath] ?? []).find((stored) => stored.id === otherId)
    );
    mockWrites.push({ op: 'create', path, id, data: create });
    updates.forEach((update) => mockWrites.push({ op: 'update', path: sourcePath, id: update.id, data: update.data }));
  },
  deleteDocument: async (collection: string, id: string) => {
    mockWrites.push({ op: 'delete', path: mockResolve(collection), id });
  },
  batchOperations: async (operations: Array<{ type: string; collection: string; id: string; data?: Doc }>) => {
    operations.forEach((operation) =>
      mockWrites.push({ op: `batch-${operation.type}`, path: mockResolve(operation.collection), id: operation.id, data: operation.data })
    );
  },
};

// Stable objects, as the real hooks return: effects depend on them.
const mockAuth = { user: { uid: 'user-1' }, loading: false };
const mockUserState = {
  userProfile: { uid: 'user-1' },
  activeGroupUserProfile: { username: 'Bilbo', activeCharacterId: null, characters: [] },
};
const mockGroupsState = { activeGroupId: 'group-1' };
let mockCampaignsState = { activeCampaignId: 'campaign-a' };

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

const mockUpload = jest.fn();
const mockRemove = jest.fn();
jest.mock('core/services/firebase', () => ({
  __esModule: true,
  images: {
    upload: (...args: unknown[]) => mockUpload(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    recordReleasedImage: jest.fn(),
    clearReleasedImage: jest.fn(),
  },
  default: { document: { batchOperations: (operations: any) => mockFirestore.batchOperations(operations) } },
}));

const PATH_A = 'groups/group-1/campaigns/campaign-a';
const PATH_B = 'groups/group-1/campaigns/campaign-b';

/** A deferred promise, to hold an operation mid-flight. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** The latest render's context values, for the test to call. */
let npcs: ReturnType<typeof useNPCs>;
let rumors: ReturnType<typeof useRumors>;
let portraitUpload: ReturnType<typeof useImageAttachment>['upload'] | undefined;

/** Captures the providers' values and wires an NPC portrait like the detail page does. */
const Harness: React.FC = () => {
  npcs = useNPCs();
  rumors = useRumors();
  // Destructured in this render's scope, as `NPCDetailPage` does: the upload
  // keeps the `save` of the render it started in.
  const { npcs: list, updateNPC } = npcs;
  const aldric = list.find((npc) => npc.id === 'aldric');
  const portrait = useImageAttachment({
    prefix: aldric ? `${mockCampaignsState.activeCampaignId}/npcs/aldric` : null,
    current: aldric?.image,
    save: (image) => updateNPC(aldric!.id, { image }),
  });
  portraitUpload = aldric ? portrait.upload : undefined;
  return null;
};

const tree = () => (
  <RumorProvider>
    <NPCProvider>
      <Harness />
    </NPCProvider>
  </RumorProvider>
);

/** Switches the active campaign, in the services and in React, as the switcher does. */
async function switchTo(campaign: string, rerender: (ui: React.ReactElement) => void) {
  mockActive = { ...mockActive, campaign };
  mockCampaignsState = { activeCampaignId: campaign };
  rerender(tree());
  // Let the providers' effects for the new campaign run.
  await act(async () => undefined);
}

/** An NPC record; each campaign keeps its own under the same id. */
const aldricIn = (campaign: string): Doc => ({
  id: 'aldric',
  name: 'Aldric',
  status: 'alive',
  relationship: 'neutral',
  description: `Aldric of ${campaign}`,
  connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
  notes: [],
  image: { path: `${campaign}/npcs/aldric/old.webp`, url: 'https://example.test/old.webp' },
});

const rumorIn = (campaign: string): Doc => ({
  id: 'smoke',
  title: 'Smoke over the hills',
  content: `Seen from ${campaign}`,
  status: 'unconfirmed',
  sourceType: 'tavern',
  sourceName: 'Barliman',
  notes: [],
});

beforeEach(() => {
  mockActive = { group: 'group-1', campaign: 'campaign-a' };
  mockCampaignsState = { activeCampaignId: 'campaign-a' };
  mockStore = {
    [`${PATH_A}/npcs`]: [aldricIn('campaign-a')],
    [`${PATH_B}/npcs`]: [aldricIn('campaign-b')],
    [`${PATH_A}/rumors`]: [rumorIn('campaign-a')],
    [`${PATH_B}/rumors`]: [rumorIn('campaign-b')],
  };
  mockWrites = [];
  mockCreateGate = Promise.resolve();
  mockUpload.mockReset();
  mockRemove.mockReset().mockResolvedValue(undefined);
});

/** Mounts the providers in campaign A and waits for its records. */
async function mountInCampaignA() {
  const view = render(tree());
  await waitFor(() => expect(npcs.npcs.map((npc) => npc.description)).toEqual(['Aldric of campaign-a']));
  await waitFor(() => expect(rumors.rumors.length).toBe(1));
  return view;
}

describe('an operation finishes in the campaign it started in (T082)', () => {
  it('a portrait upload that completes after a switch lands on the original record', async () => {
    const { rerender } = await mountInCampaignA();
    const upload = deferred<Doc>();
    mockUpload.mockReturnValueOnce(upload.promise);

    let attaching!: Promise<void>;
    act(() => {
      attaching = portraitUpload!({} as any, () => undefined);
    });
    await switchTo('campaign-b', rerender);
    await act(async () => {
      upload.resolve({ path: 'campaign-a/npcs/aldric/new.webp', url: 'https://example.test/new.webp' });
      await attaching;
    });

    expect(mockWrites).toEqual([
      expect.objectContaining({
        op: 'update',
        path: `${PATH_A}/npcs`,
        id: 'aldric',
        data: expect.objectContaining({ image: expect.objectContaining({ path: 'campaign-a/npcs/aldric/new.webp' }) }),
      }),
    ]);
    // Only the file A's record stopped pointing at; B's picture is untouched.
    expect(mockRemove.mock.calls).toEqual([['campaign-a/npcs/aldric/old.webp']]);
  });

  it("a rumour's conversion to a quest stays whole: quest and rumour both in the original campaign", async () => {
    const { rerender } = await mountInCampaignA();
    const gate = deferred();
    mockCreateGate = gate.promise;

    let converting!: Promise<string>;
    act(() => {
      converting = rumors.convertToQuest(['smoke'], { title: 'Find the fire', description: 'x', status: 'active' });
    });
    await switchTo('campaign-b', rerender);
    await act(async () => {
      gate.resolve();
      await converting;
    });

    expect(mockWrites.map(({ op, path, id }) => [op, path, id])).toEqual([
      ['create', `${PATH_A}/quests`, 'find-the-fire'],
      ['update', `${PATH_A}/rumors`, 'smoke'],
    ]);
  });

  it('an edit made with the previous campaign’s functions still writes to that campaign', async () => {
    const { rerender } = await mountInCampaignA();
    const { updateNPC } = npcs;
    const aldricA = npcs.npcs[0];

    await switchTo('campaign-b', rerender);
    await waitFor(() => expect(npcs.npcs.map((npc) => npc.description)).toEqual(['Aldric of campaign-b']));
    await act(async () => {
      await updateNPC(aldricA.id, { description: 'meant for A' });
    });

    expect(mockWrites.map(({ op, path, id }) => [op, path, id])).toEqual([['update', `${PATH_A}/npcs`, 'aldric']]);
  });

  it('with no campaign to write to, a write refuses rather than guess', async () => {
    // A bare name with no campaign used to resolve to a group-level collection.
    const { result } = renderHook(() => useFirebaseData<Doc>({ collection: null, autoFetch: false }));

    await act(async () => {
      await expect(result.current.updateData('aldric', { name: 'x' })).rejects.toThrow('No campaign selected');
      await expect(result.current.addData({ name: 'x' } as any, 'aldric')).rejects.toThrow('No campaign selected');
      await expect(result.current.deleteData('aldric')).rejects.toThrow('No campaign selected');
    });
    expect(mockWrites).toEqual([]);
  });
});
