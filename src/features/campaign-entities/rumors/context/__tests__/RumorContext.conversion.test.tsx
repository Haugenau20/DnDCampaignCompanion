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

// Notes are documents of their own (T133); see the mock.
jest.mock('features/campaign-entities/shared/recordNotes', () => require('@/test-utils/record-notes-mock').recordNotesMock());

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
  // These held that the note recording a conversion was appended to the
  // array the server held, so another player's newer note survived. Since T133
  // (maintainer, 2026-10-08) that note is a document of its own and the
  // rumour's notes are not rewritten at all, which keeps theirs by
  // construction: the commit must not touch `notes`.
  test('a note another player added since the page loaded is kept when converting', async () => {
    mockServer = [rumor('a', [note('from-another-player')]), rumor('b')];
    await renderContext();

    await act(async () => {
      await context.convertToQuest(['a'], { title: 'Find the fire' });
    });

    const [, , , { updates, notes }] = mockCommit.mock.calls[0];
    expect(updates[0].data).not.toHaveProperty('notes');
    expect(notes.map((n: { under: unknown; data: RumorNote }) => [n.under, n.data.content])).toEqual([
      [{ updated: 'a' }, 'Converted to quest: find-the-fire'],
    ]);
  });

  test('a note another player added since the page loaded is kept when combining', async () => {
    mockServer = [rumor('a'), rumor('b', [note('from-another-player')])];
    await renderContext();

    await act(async () => {
      await context.combineRumors(['a', 'b'], { title: 'Smoke and ash', content: 'Both' });
    });

    const [, , , { updates, notes }] = mockCommit.mock.calls[0];
    expect(updates[1].data).not.toHaveProperty('notes');
    expect(notes.map((n: { under: unknown; data: RumorNote }) => [n.under, n.data.content])).toEqual([
      ['created', 'Combined from rumours: a, b'],
      [{ updated: 'a' }, 'Combined into rumour: smoke-and-ash'],
      [{ updated: 'b' }, 'Combined into rumour: smoke-and-ash'],
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
      'One or more rumours not found'
    );
    await expect(context.combineRumors(['a', 'b'], { title: 'Smoke and ash', content: 'Both' })).rejects.toThrow(
      'One or more rumours not found'
    );
    expect(mockCommit).not.toHaveBeenCalled();
  });
});

describe('a selection one commit cannot hold is refused before anything is written', () => {
  // Firestore's 500-write limit. Checked after the create, as it was, too
  // large a selection left a quest behind on every attempt (DATA-005's
  // deterministic case). Each rumour was one write until T133 made the note
  // recording what happened a document of its own: now it is two, beside the
  // new record and, when combining, its note -- 2 + 2 x 249 = 500. These held
  // 499 before.
  const many = (count: number) => Array.from({ length: count }, (_, i) => rumor(`r${i}`));

  test('250 rumours cannot be converted or combined', async () => {
    mockLoaded = many(250);
    mockServer = mockLoaded;
    await renderContext();
    const ids = mockLoaded.map((r) => r.id);

    await expect(context.convertToQuest(ids, { title: 'Too many' })).rejects.toThrow(/at most 249 rumours/);
    await expect(context.combineRumors(ids, { title: 'Too many', content: 'x' })).rejects.toThrow(/at most 249 rumours/);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  test('249 rumours fit, in at most 500 writes', async () => {
    mockLoaded = many(249);
    mockServer = mockLoaded;
    await renderContext();

    await act(async () => {
      await context.combineRumors(mockLoaded.map((r) => r.id), { title: 'Just enough', content: 'x' });
    });

    const { updates, notes } = mockCommit.mock.calls[0][3];
    expect(updates).toHaveLength(249);
    expect(1 + updates.length + notes.length).toBeLessThanOrEqual(500);
  });
});
