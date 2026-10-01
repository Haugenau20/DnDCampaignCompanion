// src/features/campaign-entities/npcs/context/__tests__/NPCContext.cross-session.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { NPCProvider, useNPCs } from 'features/campaign-entities/npcs/context/NPCContext';
import { DocumentAlreadyExistsError } from 'core/services/firebase/data/DocumentAlreadyExistsError';

/**
 * Bug #1402: a second session creating an NPC whose slug the first already
 * took.
 *
 * `isTaken` consults only this client's loaded state, so it cannot see a
 * document another session wrote since the last refresh. The write layer's
 * guard refuses the overwrite (correctly); the player must then simply get the
 * next free id, and never be shown the guard's developer message.
 *
 * The fake server below refuses ids it already holds, the way
 * `DocumentService.createDocument` does, while this client's loaded `npcs`
 * list stays empty -- exactly the stale view that causes the bug.
 */

const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseNPCData = jest.fn();
const mockUseFirebaseData = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
}));

jest.mock('features/campaign-entities/npcs/hooks/useNPCData', () => ({
  useNPCData: () => mockUseNPCData(),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

const Probe = ({ onContext }: { onContext: (context: any) => void }) => {
  const context = useNPCs();
  React.useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return null;
};

const npcData = (name: string) => ({
  name,
  description: 'A wizard',
  status: 'alive' as const,
  relationship: 'ally' as const,
  connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
  notes: [],
});

describe('NPCContext: cross-session id collision (#1402)', () => {
  let context: any;
  let serverIds: Set<string>;
  let mockAddData: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    context = null;
    serverIds = new Set();

    mockAddData = jest.fn(async (_data: unknown, id: string) => {
      if (serverIds.has(id)) throw new DocumentAlreadyExistsError('npcs', id);
      serverIds.add(id);
      return id;
    });

    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } });
    mockUseUser.mockReturnValue({ userProfile: { uid: 'u1' } });
    mockUseNPCData.mockReturnValue({
      npcs: [],
      loading: false,
      error: null,
      refreshNPCs: jest.fn().mockResolvedValue([]),
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
      <NPCProvider>
        <Probe onContext={c => { context = c; }} />
      </NPCProvider>
    );
    await waitFor(() => expect(context).not.toBeNull());
  };

  test('creates the NPC under the next free id when another session already took the slug', async () => {
    serverIds.add('gandalf'); // written by another session; not in our loaded list
    await renderContext();

    let id = '';
    await act(async () => {
      id = await context.addNPC(npcData('Gandalf'));
    });

    expect(id).toBe('gandalf-2');
    expect(serverIds.has('gandalf-2')).toBe(true);
    expect(mockAddData).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'gandalf-2', name: 'Gandalf' }),
      'gandalf-2'
    );
  });

  test('also disambiguates a case variant of a slug the other session took', async () => {
    serverIds.add('gandalf');
    await renderContext();

    let id = '';
    await act(async () => {
      id = await context.addNPC(npcData('gandalf'));
    });

    expect(id).toBe('gandalf-2');
  });

  test('a later create in the same session does not retry the id that was refused', async () => {
    serverIds.add('gandalf');
    await renderContext();

    await act(async () => {
      await context.addNPC(npcData('Gandalf'));
    });
    mockAddData.mockClear();

    let id = '';
    await act(async () => {
      id = await context.addNPC(npcData('Gandalf'));
    });

    expect(id).toBe('gandalf-3');
    expect(mockAddData).toHaveBeenCalledTimes(1);
  });

  test('never lets the guard\'s developer message reach the caller, even when every retry is refused', async () => {
    mockAddData.mockImplementation(async (_data: unknown, id: string) => {
      throw new DocumentAlreadyExistsError('npcs', id);
    });
    await renderContext();

    let caught: Error | null = null;
    await act(async () => {
      try {
        await context.addNPC(npcData('Gandalf'));
      } catch (e) {
        caught = e as Error;
      }
    });

    expect(caught).not.toBeNull();
    expect(caught!.message).not.toMatch(/updateDocumentWithAttribution|setDocument|createDocument/);
    // Bounded: it gave up rather than looping forever.
    expect(mockAddData.mock.calls.length).toBeLessThanOrEqual(25);
  });

  test('does not retry an unrelated failure', async () => {
    mockAddData.mockRejectedValue(new Error('permission-denied'));
    await renderContext();

    await act(async () => {
      await expect(context.addNPC(npcData('Gandalf'))).rejects.toThrow('permission-denied');
    });

    expect(mockAddData).toHaveBeenCalledTimes(1);
  });
});
