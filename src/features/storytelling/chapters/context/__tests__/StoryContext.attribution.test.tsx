// src/features/storytelling/chapters/context/__tests__/StoryContext.attribution.test.tsx
import React from 'react';
import { render, act } from '@testing-library/react';
import { StoryProvider, useStory } from '../StoryContext';

/**
 * A chapter edit credits whoever is acting *now*.
 *
 * Switching character changes the group profile and nothing else the context
 * reads, so an `updateChapter` that is not rebuilt on that change credits the
 * character the player switched away from. The same defect as the rumour
 * context's; see `RumorContext.attribution.test.tsx`. Real attribution code.
 */

let mockGroupProfile: any;
// Stable across renders, as the real hooks' values are: a fresh object or
// function each render would rebuild the callback anyway and hide the defect.
const mockUser = { uid: 'user-1' };
const mockUpdateData = jest.fn().mockResolvedValue(undefined);
const mockDeleteData = jest.fn();
const mockRefreshChapters = jest.fn().mockResolvedValue(undefined);
const mockRefreshProgress = jest.fn().mockResolvedValue(undefined);
const mockChapters = [{ id: 'chapter-1', title: 'An Unexpected Party', order: 1, content: '' }];
const mockProgressData: any[] = [];

jest.mock('features/user-management', () => ({
  useAuth: () => ({ user: mockUser }),
  useUser: () => ({ activeGroupUserProfile: mockGroupProfile }),
  useCampaigns: () => ({ activeCampaignId: 'campaign-1' }),
}));

jest.mock('features/storytelling/chapters/hooks/useChapterData', () => ({
  useChapterData: () => ({
    chapters: mockChapters,
    loading: false,
    error: null,
    refreshChapters: mockRefreshChapters,
    hasRequiredContext: true,
  }),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: ({ collection }: { collection: string }) =>
    collection === 'chapters'
      ? { updateData: mockUpdateData, deleteData: mockDeleteData }
      : { data: mockProgressData, getData: mockRefreshProgress },
}));

jest.mock('core/services/firebase', () => ({
  __esModule: true,
  default: { document: { setDocument: jest.fn(), getDocument: jest.fn() } },
}));

const profileActingAs = (characterName: string) => ({
  username: 'bilbo',
  activeCharacterId: characterName,
  characters: [{ id: characterName, name: characterName }],
});

let context: ReturnType<typeof useStory>;
const Capture = () => {
  context = useStory();
  return null;
};

const tree = (
  <StoryProvider>
    <Capture />
  </StoryProvider>
);

it('after a character switch, a chapter edit credits the new character', async () => {
  mockGroupProfile = profileActingAs('Mr. Baggins');
  const { rerender } = render(tree);

  mockGroupProfile = profileActingAs('Burglar');
  rerender(
    <StoryProvider>
      <Capture />
    </StoryProvider>
  );

  await act(async () => {
    await context.updateChapter('chapter-1', { title: 'A Short Rest' });
  });

  expect(mockUpdateData.mock.calls[0][1].modifiedByCharacterName).toBe('Burglar');
});
