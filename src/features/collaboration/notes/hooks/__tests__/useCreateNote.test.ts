// src/features/collaboration/notes/hooks/__tests__/useCreateNote.test.ts

import { renderHook, act } from '@testing-library/react';
import { useCreateNote } from '../useCreateNote';

const mockCreateNote = jest.fn();
const mockNavigateToPage = jest.fn();

jest.mock('../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));

jest.mock('@/features/user-management', () => ({
  useCampaigns: jest.fn(),
}));

jest.mock('shared/hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

const { useNotes } = require('../../context/NoteContext');
const { useCampaigns } = require('@/features/user-management');
const { useNavigation } = require('shared/hooks/useNavigation');

function setupMocks({ activeCampaignId = 'campaign-1' as string | null } = {}) {
  (useNotes as jest.Mock).mockReturnValue({ createNote: mockCreateNote });
  (useCampaigns as jest.Mock).mockReturnValue({ activeCampaignId });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    currentPath: '/notes',
  });
}

describe('useCreateNote', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('should create the note with an EMPTY title', async () => {
    setupMocks();
    mockCreateNote.mockResolvedValue('note-7');

    const { result } = renderHook(() => useCreateNote());
    await act(async () => {
      await result.current.createAndOpen();
    });

    expect(mockCreateNote).toHaveBeenCalledWith('', '');
    // The regression this whole redesign starts from.
    expect(mockCreateNote).not.toHaveBeenCalledWith('New Note', '');
  });

  test('should navigate to the created note', async () => {
    setupMocks();
    mockCreateNote.mockResolvedValue('note-7');

    const { result } = renderHook(() => useCreateNote());
    await act(async () => {
      await result.current.createAndOpen();
    });

    expect(mockNavigateToPage).toHaveBeenCalledWith('/notes/note-7');
  });

  test('should not create or navigate without an active campaign', async () => {
    setupMocks({ activeCampaignId: null });

    const { result } = renderHook(() => useCreateNote());
    await act(async () => {
      await result.current.createAndOpen();
    });

    expect(mockCreateNote).not.toHaveBeenCalled();
    expect(mockNavigateToPage).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test('should not navigate when creation rejects', async () => {
    setupMocks();
    mockCreateNote.mockRejectedValue(new Error('firestore down'));

    const { result } = renderHook(() => useCreateNote());
    await act(async () => {
      await result.current.createAndOpen();
    });

    expect(mockNavigateToPage).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
