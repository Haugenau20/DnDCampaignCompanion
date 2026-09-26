// src/features/campaign-entities/rumors/context/__tests__/RumorContext.attribution.test.tsx
import React from 'react';
import { render, act } from '@testing-library/react';
import { RumorProvider, useRumors } from '../RumorContext';

/**
 * A write credits whoever is acting *now*.
 *
 * Switching character changes the group profile and leaves the account's own
 * profile alone. Every rumour write builds its credit from the group profile,
 * so a write callback that is not rebuilt when that profile changes goes on
 * crediting the character the player switched away from. Real attribution
 * code, not a stub: the credit is exactly what is under test.
 */

let mockGroupProfile: any;
const mockUser = { uid: 'user-1' };
const mockUserProfile = { username: 'gandalf-account' };
// Stable across renders, as the real hooks' callbacks are: a mock handing out
// a fresh function each render would rebuild every write callback anyway and
// hide exactly the staleness this suite is about.
const mockUpdateData = jest.fn().mockResolvedValue(undefined);
const mockRefreshRumors = jest.fn();
const mockAddData = jest.fn();
const mockDeleteData = jest.fn();
const mockCreateDocument = jest.fn();
const mockRumors = [
  {
    id: 'rumor-1',
    title: 'A dragon stirs',
    content: 'Smoke over the mountain.',
    status: 'unconfirmed',
    sourceName: '',
    relatedNPCs: [],
    relatedLocations: [],
    notes: [],
  },
];

jest.mock('features/user-management', () => ({
  useAuth: () => ({ user: mockUser }),
  useUser: () => ({ userProfile: mockUserProfile, activeGroupUserProfile: mockGroupProfile }),
  useFirestore: () => ({ createDocument: mockCreateDocument }),
}));

jest.mock('../../hooks/useRumorData', () => ({
  useRumorData: () => ({
    rumors: mockRumors,
    loading: false,
    error: null,
    refreshRumors: mockRefreshRumors,
  }),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: () => ({
    addData: mockAddData,
    updateData: mockUpdateData,
    deleteData: mockDeleteData,
    error: null,
  }),
}));

const profileActingAs = (characterName: string) => ({
  username: 'gandalf',
  activeCharacterId: characterName,
  characters: [{ id: characterName, name: characterName }],
});

let context: ReturnType<typeof useRumors>;
const Capture = () => {
  context = useRumors();
  return null;
};

const renderProvider = () =>
  render(
    <RumorProvider>
      <Capture />
    </RumorProvider>
  );

beforeEach(() => {
  mockUpdateData.mockClear();
  mockGroupProfile = profileActingAs('Mithrandir');
});

describe('RumorContext credits the character acting now', () => {
  it('after a character switch, an edit credits the new character', async () => {
    const { rerender } = renderProvider();

    mockGroupProfile = profileActingAs('Gandalf the White');
    rerender(
      <RumorProvider>
        <Capture />
      </RumorProvider>
    );

    await act(async () => {
      await context.updateRumor(mockRumors[0] as any);
    });

    expect(mockUpdateData.mock.calls[0][1].modifiedByCharacterName).toBe('Gandalf the White');
  });

  it('after a character switch, a status change credits the new character', async () => {
    const { rerender } = renderProvider();

    mockGroupProfile = profileActingAs('Gandalf the White');
    rerender(
      <RumorProvider>
        <Capture />
      </RumorProvider>
    );

    await act(async () => {
      await context.updateRumorStatus('rumor-1', 'confirmed');
    });

    expect(mockUpdateData.mock.calls[0][1].modifiedByCharacterName).toBe('Gandalf the White');
  });
});
