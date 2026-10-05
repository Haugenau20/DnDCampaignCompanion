// src/features/campaign-entities/rumors/context/__tests__/RumorContext.cross-session.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { RumorProvider, useRumors } from '../RumorContext';
import { DocumentAlreadyExistsError } from 'core/services/firebase/data/DocumentAlreadyExistsError';
import { createWithUpdatesThrough } from '@/test-utils/update-after-reading';

/**
 * Bug #1402 for rumors: another session already took the slug.
 *
 * Three paths derive an id from a title and so can hit the write-layer guard:
 * `addRumor` (writes to `rumors` through `addData`), `combineRumors` and
 * `convertToQuest` (write to `rumors` and `quests` through
 * `createDocumentWithUpdates`, with the marks on their sources, T088). The
 * fake server refuses ids it holds, like `DocumentService` does, while this
 * client's loaded lists stay stale.
 */

const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseFirestore = jest.fn();
const mockUseRumorData = jest.fn();
const mockUseFirebaseData = jest.fn();

jest.mock('@/features/user-management', () => ({
  // The provider's writes name the active group and campaign by full path (T082).
  useGroups: () => ({ activeGroupId: 'group-1' }),
  useCampaigns: () => ({ activeCampaignId: 'campaign-1' }),
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useFirestore: () => mockUseFirestore(),
}));

jest.mock('../../hooks/useRumorData', () => ({
  useRumorData: () => mockUseRumorData(),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

const Probe = ({ onContext }: { onContext: (context: any) => void }) => {
  const context = useRumors();
  React.useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return null;
};

const rumorData = (title: string) => ({
  title,
  content: 'Smoke over the mountain',
  status: 'unconfirmed' as const,
  sourceType: 'tavern' as const,
  sourceName: 'The Prancing Pony',
  relatedNPCs: [],
  relatedLocations: [],
  notes: [],
});

const existingRumor = (id: string) => ({ ...rumorData(id), id });

describe('RumorContext: cross-session id collision (#1402)', () => {
  let context: any;
  let rumorServerIds: Set<string>;
  let questServerIds: Set<string>;
  let mockAddData: jest.Mock;
  let mockCommit: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    context = null;
    rumorServerIds = new Set();
    questServerIds = new Set();

    mockAddData = jest.fn(async (_data: unknown, id: string) => {
      if (rumorServerIds.has(id)) throw new DocumentAlreadyExistsError('rumors', id);
      rumorServerIds.add(id);
      return id;
    });
    // Combine and conversion: the new record, refused if its id is taken.
    mockCommit = jest.fn(async (collection: string, id: string) => {
      const serverIds = collection.endsWith('/quests') ? questServerIds : rumorServerIds;
      if (serverIds.has(id)) throw new DocumentAlreadyExistsError(collection, id);
      serverIds.add(id);
    });

    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } });
    mockUseUser.mockReturnValue({
      userProfile: { uid: 'u1' },
      activeGroupUserProfile: { username: 'Pip', activeCharacterId: null, characters: [] },
    });
    mockUseFirestore.mockReturnValue({
      createDocumentWithUpdates: createWithUpdatesThrough(
        (id) => [existingRumor('rumor-a'), existingRumor('rumor-b')].find((rumor) => rumor.id === id),
        mockCommit
      ),
    });
    mockUseRumorData.mockReturnValue({
      rumors: [existingRumor('rumor-a'), existingRumor('rumor-b')],
      loading: false,
      error: null,
      refreshRumors: jest.fn(),
    });
    mockUseFirebaseData.mockReturnValue({
      addData: mockAddData,
      updateData: jest.fn().mockResolvedValue(undefined),
      deleteData: jest.fn(),
    });
  });

  const renderContext = async () => {
    render(
      <RumorProvider>
        <Probe onContext={c => { context = c; }} />
      </RumorProvider>
    );
    await waitFor(() => expect(context).not.toBeNull());
  };

  test('addRumor takes the next free id when another session already took the slug', async () => {
    rumorServerIds.add('smoke-over-the-mountain');
    await renderContext();

    let id = '';
    await act(async () => {
      id = await context.addRumor(rumorData('Smoke over the Mountain'));
    });

    expect(id).toBe('smoke-over-the-mountain-2');
    expect(mockAddData).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'smoke-over-the-mountain-2' }),
      'smoke-over-the-mountain-2'
    );
  });

  test('combineRumors takes the next free id when another session already took the slug', async () => {
    rumorServerIds.add('combined-report');
    await renderContext();

    let id = '';
    await act(async () => {
      id = await context.combineRumors(['rumor-a', 'rumor-b'], { title: 'Combined Report' });
    });

    expect(id).toBe('combined-report-2');
    expect(mockCommit).toHaveBeenLastCalledWith(
      'groups/group-1/campaigns/campaign-1/rumors',
      'combined-report-2',
      'groups/group-1/campaigns/campaign-1/rumors',
      expect.objectContaining({ create: expect.objectContaining({ id: 'combined-report-2' }) })
    );
  });

  test('convertToQuest takes the next free quest id when another session already took the slug', async () => {
    questServerIds.add('investigate-the-smoke');
    await renderContext();

    let id = '';
    await act(async () => {
      id = await context.convertToQuest(['rumor-a'], { title: 'Investigate the Smoke' });
    });

    expect(id).toBe('investigate-the-smoke-2');
    expect(mockCommit).toHaveBeenLastCalledWith(
      'groups/group-1/campaigns/campaign-1/quests',
      'investigate-the-smoke-2',
      'groups/group-1/campaigns/campaign-1/rumors',
      expect.objectContaining({ create: expect.objectContaining({ id: 'investigate-the-smoke-2' }) })
    );
  });

  test('never lets the guard\'s developer message reach the caller, even when every retry is refused', async () => {
    mockAddData.mockImplementation(async (_data: unknown, id: string) => {
      throw new DocumentAlreadyExistsError('rumors', id);
    });
    await renderContext();

    let caught: Error | null = null;
    await act(async () => {
      try {
        await context.addRumor(rumorData('Smoke over the Mountain'));
      } catch (e) {
        caught = e as Error;
      }
    });

    expect(caught).not.toBeNull();
    expect(caught!.message).not.toMatch(/updateDocumentWithAttribution|setDocument|createDocument/);
    expect(mockAddData.mock.calls.length).toBeLessThanOrEqual(25);
  });
});
