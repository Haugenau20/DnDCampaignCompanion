// src/features/campaign-entities/rumors/context/__tests__/RumorContext.conversion.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { RumorProvider, useRumors } from '../RumorContext';
import { Rumor, RumorNote } from '../../types';
import { createWithUpdatesThrough } from '@/test-utils/update-after-reading';

/**
 * T088 (DATA-005): turning rumours into a quest, or several rumours into one.
 *
 * The new record and the marks on its sources are one commit, worked out from
 * the sources as the server holds them. This suite's "server" (`mockServer`)
 * deliberately differs from the page's loaded list (`mockLoaded`), as it does
 * when another player has written since the page last heard.
 */

const RUMORS = 'groups/group-1/campaigns/campaign-1/rumors';
const QUESTS = 'groups/group-1/campaigns/campaign-1/quests';

let mockLoaded: Rumor[] = [];
let mockServer: Rumor[] = [];
const mockCommit = jest.fn();

jest.mock('@/features/user-management', () => ({
  useGroups: () => ({ activeGroupId: 'group-1' }),
  useCampaigns: () => ({ activeCampaignId: 'campaign-1' }),
  useAuth: () => ({ user: { uid: 'u1' } }),
  useUser: () => ({
    userProfile: { uid: 'u1' },
    activeGroupUserProfile: { username: 'Pip', activeCharacterId: null, characters: [] },
  }),
  useFirestore: () => ({
    createDocumentWithUpdates: createWithUpdatesThrough<Rumor>(
      (id) => mockServer.find((rumor) => rumor.id === id),
      mockCommit
    ),
  }),
}));

jest.mock('../../hooks/useRumorData', () => ({
  useRumorData: () => ({ rumors: mockLoaded, loading: false, error: null }),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: () => ({
    addData: jest.fn(),
    updateData: jest.fn(),
    updateDataAfterReading: jest.fn(),
    deleteData: jest.fn(),
    error: null,
  }),
}));

const note = (id: string): RumorNote => ({ id, content: `note ${id}` } as RumorNote);

const rumor = (id: string, notes: RumorNote[] = []): Rumor => ({
  id,
  title: `Rumour ${id}`,
  content: `Heard ${id}`,
  status: 'unconfirmed',
  sourceType: 'tavern',
  sourceName: 'Barliman',
  relatedNPCs: [`npc-${id}`],
  relatedLocations: [],
  notes,
  createdBy: 'u0',
  createdByUsername: 'Author',
  dateAdded: '2026-10-01T00:00:00.000Z',
});

let context: ReturnType<typeof useRumors>;
const Probe = () => {
  context = useRumors();
  return null;
};

async function renderContext() {
  render(
    <RumorProvider>
      <Probe />
    </RumorProvider>
  );
  await waitFor(() => expect(context).toBeDefined());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCommit.mockResolvedValue(undefined);
  mockLoaded = [rumor('a'), rumor('b')];
  mockServer = [rumor('a'), rumor('b')];
});

describe('a conversion is one commit (T088, DATA-005)', () => {
  test('converting commits the quest and every rumour mark together', async () => {
    await renderContext();

    await act(async () => {
      await context.convertToQuest(['a', 'b'], { title: 'Find the fire' });
    });

    expect(mockCommit).toHaveBeenCalledTimes(1);
    const [collection, id, sourceCollection, { create, updates }] = mockCommit.mock.calls[0];
    expect([collection, id, sourceCollection]).toEqual([QUESTS, 'find-the-fire', RUMORS]);
    expect(create).toEqual(expect.objectContaining({ id: 'find-the-fire', title: 'Find the fire' }));
    expect(updates.map((update: any) => [update.id, update.data.convertedToQuestId])).toEqual([
      ['a', 'find-the-fire'],
      ['b', 'find-the-fire'],
    ]);
  });

  test('combining commits the new rumour and every source mark together', async () => {
    await renderContext();

    await act(async () => {
      await context.combineRumors(['a', 'b'], { title: 'Smoke and ash', content: 'Both' });
    });

    expect(mockCommit).toHaveBeenCalledTimes(1);
    const [collection, id, sourceCollection, { create, updates }] = mockCommit.mock.calls[0];
    expect([collection, id, sourceCollection]).toEqual([RUMORS, 'smoke-and-ash', RUMORS]);
    expect(create).toEqual(expect.objectContaining({ id: 'smoke-and-ash', content: 'Both' }));
    expect(updates.map((update: any) => [update.id, update.data.status])).toEqual([
      ['a', 'confirmed'],
      ['b', 'confirmed'],
    ]);
  });
});

describe('the marks are worked out from the rumours as the server holds them', () => {
  test('a note another player added since the page loaded is kept when converting', async () => {
    mockServer = [rumor('a', [note('from-another-player')]), rumor('b')];
    await renderContext();

    await act(async () => {
      await context.convertToQuest(['a'], { title: 'Find the fire' });
    });

    const [, , , { updates }] = mockCommit.mock.calls[0];
    expect(updates[0].data.notes.map((n: RumorNote) => n.content)).toEqual([
      'note from-another-player',
      'Converted to quest: find-the-fire',
    ]);
  });

  test('a note another player added since the page loaded is kept when combining', async () => {
    mockServer = [rumor('a'), rumor('b', [note('from-another-player')])];
    await renderContext();

    await act(async () => {
      await context.combineRumors(['a', 'b'], { title: 'Smoke and ash', content: 'Both' });
    });

    const [, , , { updates }] = mockCommit.mock.calls[0];
    expect(updates[1].data.notes.map((n: RumorNote) => n.content)).toEqual([
      'note from-another-player',
      'Combined into rumor: smoke-and-ash',
    ]);
  });

  test('a combined rumour links what its sources link at the commit', async () => {
    mockServer = [rumor('a'), { ...rumor('b'), relatedNPCs: ['npc-b', 'npc-added-meanwhile'] }];
    await renderContext();

    await act(async () => {
      await context.combineRumors(['a', 'b'], { title: 'Smoke and ash', content: 'Both' });
    });

    const [, , , { create }] = mockCommit.mock.calls[0];
    expect(create.relatedNPCs).toEqual(['npc-a', 'npc-b', 'npc-added-meanwhile']);
  });

  test('a rumour deleted since the page loaded refuses the conversion, and nothing is committed', async () => {
    mockServer = [rumor('a')];
    await renderContext();

    await expect(context.convertToQuest(['a', 'b'], { title: 'Find the fire' })).rejects.toThrow(
      'One or more rumors not found'
    );
    await expect(context.combineRumors(['a', 'b'], { title: 'Smoke and ash', content: 'Both' })).rejects.toThrow(
      'One or more rumors not found'
    );
    expect(mockCommit).not.toHaveBeenCalled();
  });
});

describe('a selection one commit cannot hold is refused before anything is written', () => {
  // 499 rumours plus the new record is Firestore's 500-write limit. Checked
  // after the create, as it was, 501 selected rumours left a quest behind on
  // every attempt (DATA-005's deterministic case).
  const many = (count: number) => Array.from({ length: count }, (_, i) => rumor(`r${i}`));

  test('500 rumours cannot be converted or combined', async () => {
    mockLoaded = many(500);
    mockServer = mockLoaded;
    await renderContext();
    const ids = mockLoaded.map((r) => r.id);

    await expect(context.convertToQuest(ids, { title: 'Too many' })).rejects.toThrow(/at most 499 rumours/);
    await expect(context.combineRumors(ids, { title: 'Too many', content: 'x' })).rejects.toThrow(/at most 499 rumours/);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  test('499 rumours fit', async () => {
    mockLoaded = many(499);
    mockServer = mockLoaded;
    await renderContext();

    await act(async () => {
      await context.convertToQuest(mockLoaded.map((r) => r.id), { title: 'Just enough' });
    });

    expect(mockCommit.mock.calls[0][3].updates).toHaveLength(499);
  });
});
