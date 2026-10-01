// src/features/campaign-entities/quests/context/__tests__/QuestContext.cross-session.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { QuestProvider, useQuests } from '../QuestContext';
import { DocumentAlreadyExistsError } from 'core/services/firebase/data/DocumentAlreadyExistsError';

/**
 * Bug #1402 for quests: another session already took the slug.
 *
 * The fake server refuses ids it holds, like `DocumentService.createDocument`,
 * while this client's loaded `quests` list stays empty (the stale view).
 */

const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseGroups = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseQuestData = jest.fn();
const mockUseFirebaseData = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useGroups: () => mockUseGroups(),
  useCampaigns: () => mockUseCampaigns(),
}));

jest.mock('../../hooks/useQuestData', () => ({
  useQuestData: () => mockUseQuestData(),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

const Probe = ({ onContext }: { onContext: (context: any) => void }) => {
  const context = useQuests();
  React.useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return null;
};

const questData = (title: string) => ({
  title,
  description: 'Find the ring',
  status: 'active' as const,
  objectives: [],
});

describe('QuestContext: cross-session id collision (#1402)', () => {
  let context: any;
  let serverIds: Set<string>;
  let mockAddData: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    context = null;
    serverIds = new Set();

    mockAddData = jest.fn(async (_data: unknown, id: string) => {
      if (serverIds.has(id)) throw new DocumentAlreadyExistsError('quests', id);
      serverIds.add(id);
      return id;
    });

    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } });
    mockUseUser.mockReturnValue({ userProfile: { uid: 'u1' } });
    mockUseGroups.mockReturnValue({ activeGroupId: 'g1' });
    mockUseCampaigns.mockReturnValue({ activeCampaignId: 'c1' });
    mockUseQuestData.mockReturnValue({
      quests: [],
      loading: false,
      error: null,
      getQuestById: jest.fn().mockReturnValue(undefined),
      refreshQuests: jest.fn().mockResolvedValue([]),
      hasRequiredContext: true,
    });
    mockUseFirebaseData.mockReturnValue({
      addData: mockAddData,
      updateData: jest.fn(),
      deleteData: jest.fn(),
    });
  });

  const renderContext = async () => {
    render(
      <QuestProvider>
        <Probe onContext={c => { context = c; }} />
      </QuestProvider>
    );
    await waitFor(() => expect(context).not.toBeNull());
  };

  test('creates the quest under the next free id when another session already took the slug', async () => {
    serverIds.add('find-the-ring');
    await renderContext();

    let id = '';
    await act(async () => {
      id = await context.addQuest(questData('Find the Ring'));
    });

    expect(id).toBe('find-the-ring-2');
    expect(mockAddData).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'find-the-ring-2', title: 'Find the Ring' }),
      'find-the-ring-2'
    );
  });

  test('never lets the guard\'s developer message reach the caller, even when every retry is refused', async () => {
    mockAddData.mockImplementation(async (_data: unknown, id: string) => {
      throw new DocumentAlreadyExistsError('quests', id);
    });
    await renderContext();

    let caught: Error | null = null;
    await act(async () => {
      try {
        await context.addQuest(questData('Find the Ring'));
      } catch (e) {
        caught = e as Error;
      }
    });

    expect(caught).not.toBeNull();
    expect(caught!.message).not.toMatch(/updateDocumentWithAttribution|setDocument|createDocument/);
    expect(mockAddData.mock.calls.length).toBeLessThanOrEqual(25);
  });
});
