// src/hooks/__tests__/useNoteData.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNoteData } from '../useNoteData';
import { Note } from '../../types/note';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetCollection = jest.fn();
const mockGetInstance = jest.fn();

jest.mock('../../services/firebase/data/DocumentService', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../context/firebase', () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
}));

const DocumentService = require('../../services/firebase/data/DocumentService').default;
const { useAuth, useGroups, useCampaigns } = require('../../context/firebase');

const makeNote = (id: string, title: string, campaignId: string = 'campaign-1'): Note => ({
  id,
  title,
  content: `Content of ${title}`,
  extractedEntities: [],
  status: 'active',
  tags: [],
  updatedAt: '2025-06-01T10:00:00.000Z',
  campaignId,
  createdBy: 'user-1',
  createdByUsername: 'TestUser',
  dateAdded: '2025-01-01T00:00:00.000Z',
});

const setupDocumentServiceMock = () => {
  (DocumentService.getInstance as jest.Mock).mockReturnValue({
    getCollection: mockGetCollection,
  });
};

const setupContextMocks = (
  groupId: string | null = 'group-1',
  campaignId: string | null = 'campaign-1',
  uid: string | null = 'user-1'
) => {
  (useAuth as jest.Mock).mockReturnValue({ user: uid ? { uid } : null });
  (useGroups as jest.Mock).mockReturnValue({ activeGroupId: groupId });
  (useCampaigns as jest.Mock).mockReturnValue({ activeCampaignId: campaignId });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useNoteData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDocumentServiceMock();
    setupContextMocks();
    mockGetCollection.mockResolvedValue([]);
  });

  // -------------------------------------------------------------------------
  // Return shape
  // -------------------------------------------------------------------------
  describe('return shape', () => {
    test('should expose all required properties', async () => {
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current).toHaveProperty('notes');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refreshNotes');
      expect(result.current).toHaveProperty('getNotesForCampaign');
      expect(result.current).toHaveProperty('getNoteCountForCampaign');
      expect(result.current).toHaveProperty('hasRequiredContext');
      expect(result.current).toHaveProperty('activeCampaignId');
    });

    test('should start with empty notes array', async () => {
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.notes).toEqual([]);
    });

    test('should expose activeCampaignId from context', async () => {
      setupContextMocks('group-1', 'campaign-1');
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.activeCampaignId).toBe('campaign-1');
    });
  });

  // -------------------------------------------------------------------------
  // hasRequiredContext
  // -------------------------------------------------------------------------
  describe('hasRequiredContext', () => {
    test('should be true when both groupId and uid are present', async () => {
      setupContextMocks('group-1', 'campaign-1', 'user-1');
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(true);
    });

    test('should be false when groupId is null', async () => {
      setupContextMocks(null, 'campaign-1', 'user-1');
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(false);
    });

    test('should be false when user is null', async () => {
      setupContextMocks('group-1', 'campaign-1', null);
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // fetchNotes guard conditions
  // -------------------------------------------------------------------------
  describe('fetchNotes', () => {
    test('should return empty array when no user uid', async () => {
      setupContextMocks('group-1', 'campaign-1', null);
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.notes).toEqual([]);
    });

    test('should return empty array when no activeGroupId', async () => {
      setupContextMocks(null, 'campaign-1', 'user-1');
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.notes).toEqual([]);
    });

    test('should return empty notes when no activeCampaignId (not filtering by campaign)', async () => {
      setupContextMocks('group-1', null, 'user-1');
      mockGetCollection.mockResolvedValue([makeNote('1', 'Test Note', 'campaign-1')]);
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      // No activeCampaignId → empty notes
      expect(result.current.notes).toEqual([]);
    });

    test('should fetch notes from correct Firebase path', async () => {
      const notes = [makeNote('1', 'Session recap', 'campaign-1')];
      mockGetCollection.mockResolvedValue(notes);

      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetCollection).toHaveBeenCalledWith(
        'groups/group-1/users/user-1/notes'
      );
    });

    test('should filter notes by active campaignId', async () => {
      const notes = [
        makeNote('1', 'Campaign 1 note', 'campaign-1'),
        makeNote('2', 'Campaign 2 note', 'campaign-2'),
        makeNote('3', 'Another campaign 1 note', 'campaign-1'),
      ];
      mockGetCollection.mockResolvedValue(notes);

      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.notes.length).toBe(2));

      expect(result.current.notes.every(n => n.campaignId === 'campaign-1')).toBe(true);
    });

    test('should sort notes by updatedAt descending (most recent first)', async () => {
      const notes = [
        { ...makeNote('1', 'Old note', 'campaign-1'), updatedAt: '2025-01-01T00:00:00.000Z' },
        { ...makeNote('2', 'New note', 'campaign-1'), updatedAt: '2025-06-01T00:00:00.000Z' },
        { ...makeNote('3', 'Mid note', 'campaign-1'), updatedAt: '2025-03-01T00:00:00.000Z' },
      ];
      mockGetCollection.mockResolvedValue(notes);

      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.notes.length).toBe(3));

      expect(result.current.notes[0].title).toBe('New note');
      expect(result.current.notes[1].title).toBe('Mid note');
      expect(result.current.notes[2].title).toBe('Old note');
    });

    test('should handle fetch errors gracefully', async () => {
      mockGetCollection.mockRejectedValue(new Error('Firebase error'));
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe('Firebase error');
      expect(result.current.notes).toEqual([]);
    });

    test('should set error message to "Failed to fetch notes" for non-Error rejections', async () => {
      mockGetCollection.mockRejectedValue('unknown error');
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe('Failed to fetch notes');
    });
  });

  // -------------------------------------------------------------------------
  // getNotesForCampaign
  // -------------------------------------------------------------------------
  describe('getNotesForCampaign', () => {
    test('should return empty array when no user or group', async () => {
      setupContextMocks(null, null, null);
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const notes = await act(async () =>
        result.current.getNotesForCampaign('campaign-1')
      );

      expect(notes).toEqual([]);
    });

    test('should fetch and filter notes by specified campaignId', async () => {
      const allNotes = [
        makeNote('1', 'C1 Note', 'campaign-1'),
        makeNote('2', 'C2 Note', 'campaign-2'),
      ];
      mockGetCollection.mockResolvedValue(allNotes);

      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const campaignNotes = await act(async () =>
        result.current.getNotesForCampaign('campaign-2')
      );

      expect(campaignNotes).toHaveLength(1);
      expect(campaignNotes[0].title).toBe('C2 Note');
    });

    test('should sort returned notes by updatedAt descending', async () => {
      const notes = [
        { ...makeNote('1', 'Old', 'camp-1'), updatedAt: '2025-01-01T00:00:00.000Z' },
        { ...makeNote('2', 'New', 'camp-1'), updatedAt: '2025-06-01T00:00:00.000Z' },
      ];
      mockGetCollection.mockResolvedValue(notes);

      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const campaignNotes = await act(async () =>
        result.current.getNotesForCampaign('camp-1')
      );

      expect(campaignNotes[0].title).toBe('New');
      expect(campaignNotes[1].title).toBe('Old');
    });

    test('should return empty array on error', async () => {
      mockGetCollection.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const campaignNotes = await act(async () =>
        result.current.getNotesForCampaign('campaign-1')
      );

      expect(campaignNotes).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getNoteCountForCampaign
  // -------------------------------------------------------------------------
  describe('getNoteCountForCampaign', () => {
    test('should return count of notes for the specified campaign', async () => {
      const notes = [
        makeNote('1', 'A', 'camp-1'),
        makeNote('2', 'B', 'camp-1'),
        makeNote('3', 'C', 'camp-2'),
      ];
      mockGetCollection.mockResolvedValue(notes);

      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const count = await act(async () =>
        result.current.getNoteCountForCampaign('camp-1')
      );

      expect(count).toBe(2);
    });

    test('should return 0 when no notes for campaign', async () => {
      mockGetCollection.mockResolvedValue([makeNote('1', 'A', 'camp-2')]);

      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const count = await act(async () =>
        result.current.getNoteCountForCampaign('camp-1')
      );

      expect(count).toBe(0);
    });

    test('should return 0 on error', async () => {
      mockGetCollection.mockRejectedValue(new Error('Count failed'));

      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const count = await act(async () =>
        result.current.getNoteCountForCampaign('campaign-1')
      );

      expect(count).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    test('should set loading to false after successful fetch', async () => {
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    test('should set loading to false after failed fetch', async () => {
      mockGetCollection.mockRejectedValue(new Error('error'));
      const { result } = renderHook(() => useNoteData());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });
});
