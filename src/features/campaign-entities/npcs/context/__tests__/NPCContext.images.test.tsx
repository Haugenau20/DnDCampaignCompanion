// src/features/campaign-entities/npcs/context/__tests__/NPCContext.images.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { NPCProvider, useNPCs } from 'features/campaign-entities/npcs/context/NPCContext';

/**
 * T021: deleting an NPC also deletes its portrait from Storage -- after the
 * document, and without letting a failed file delete fail the NPC delete.
 */

const mockDeleteData = jest.fn();
const mockRefreshNPCs = jest.fn();
const mockRemoveImage = jest.fn();
let mockNpcs: any[] = [];

jest.mock('features/user-management', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
  useUser: () => ({ userProfile: {}, activeGroupUserProfile: {} }),
}));

jest.mock('features/campaign-entities/npcs/hooks/useNPCData', () => ({
  useNPCData: () => ({
    npcs: mockNpcs,
    loading: false,
    error: null,
    refreshNPCs: mockRefreshNPCs,
    hasRequiredContext: true,
  }),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: () => ({
    addData: jest.fn(),
    updateData: jest.fn(),
    deleteData: mockDeleteData,
    error: null,
  }),
}));

jest.mock('core/services/firebase', () => ({
  images: { remove: (path: string) => mockRemoveImage(path) },
}));

const portrait = {
  path: 'groups/g1/campaigns/c1/npcs/n1/p.webp',
  url: 'https://example/p',
  width: 1,
  height: 1,
  uploadedBy: 'user-1',
  uploadedAt: '2026-09-24T12:00:00.000Z',
};

let context: ReturnType<typeof useNPCs>;
const Probe = () => {
  context = useNPCs();
  return null;
};

async function renderContext() {
  render(
    <NPCProvider>
      <Probe />
    </NPCProvider>
  );
  await waitFor(() => expect(context).toBeDefined());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNpcs = [
    { id: 'n1', name: 'Bilbo', image: portrait },
    { id: 'n2', name: 'Frodo' },
  ];
  mockDeleteData.mockResolvedValue(undefined);
  mockRefreshNPCs.mockResolvedValue(undefined);
  mockRemoveImage.mockResolvedValue(undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('deleting an NPC', () => {
  it('deletes its portrait after the document', async () => {
    const order: string[] = [];
    mockDeleteData.mockImplementation(async () => { order.push('document'); });
    mockRemoveImage.mockImplementation(async () => { order.push('image'); });
    await renderContext();

    await act(() => context.deleteNPC('n1'));

    expect(mockRemoveImage).toHaveBeenCalledWith(portrait.path);
    expect(order).toEqual(['document', 'image']);
  });

  it('touches Storage not at all for an NPC without a portrait', async () => {
    await renderContext();
    await act(() => context.deleteNPC('n2'));
    expect(mockRemoveImage).not.toHaveBeenCalled();
  });

  it('keeps the portrait when the document delete fails', async () => {
    mockDeleteData.mockRejectedValue(new Error('permission-denied'));
    await renderContext();

    let error: unknown;
    await act(async () => {
      await context.deleteNPC('n1').catch(e => { error = e; });
    });

    expect(error).toEqual(expect.objectContaining({ message: 'permission-denied' }));
    expect(mockRemoveImage).not.toHaveBeenCalled();
  });

  it('still succeeds when the portrait cannot be deleted -- it is only an orphan', async () => {
    mockRemoveImage.mockRejectedValue(new Error('network'));
    await renderContext();

    let error: unknown;
    await act(async () => {
      await context.deleteNPC('n1').catch(e => { error = e; });
    });

    expect(error).toBeUndefined();
    expect(mockRefreshNPCs).toHaveBeenCalled();
  });
});
