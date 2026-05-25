// src/components/features/notes/__tests__/NoteReferences.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NoteReferences from '../NoteReferences';
import { Note } from '../../../../types/note';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockNavigateToPage = jest.fn();
const mockGetNoteById = jest.fn();
const mockGetCollection = jest.fn();

jest.mock('../../../../hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));

jest.mock('@/features/user-management', () => ({
  useCampaigns: jest.fn(),
}));

// DocumentService mock — must use factory that doesn't capture outer let/const
// We expose __mockGetCollection so tests can control it via the module's own mock fn
jest.mock('../../../../services/firebase/data/DocumentService', () => {
  const getCollectionMock = jest.fn();
  const instance = { getCollection: getCollectionMock };
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => instance),
      __getCollectionMock: getCollectionMock,
    },
  };
});

const { useNavigation } = require('../../../../hooks/useNavigation');
const { useNotes } = require('../../../../context/NoteContext');
const { useCampaigns } = require('@/features/user-management');
const DocumentServiceModule = require('../../../../services/firebase/data/DocumentService');
const getCollectionMock: jest.Mock = DocumentServiceModule.default.__getCollectionMock;

function setupMocks({
  note = undefined as Note | undefined,
  activeCampaignId = 'campaign-1' as string | null,
  npcs = [] as any[],
  locations = [] as any[],
  quests = [] as any[],
  rumors = [] as any[],
} = {}) {
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    currentPath: '/notes/note-1',
  });
  (useNotes as jest.Mock).mockReturnValue({
    getNoteById: mockGetNoteById,
  });
  mockGetNoteById.mockReturnValue(note);

  (useCampaigns as jest.Mock).mockReturnValue({
    activeCampaignId,
  });

  // DocumentService.getCollection returns different arrays per type
  getCollectionMock.mockImplementation((collection: string) => {
    switch (collection) {
      case 'npcs': return Promise.resolve(npcs);
      case 'locations': return Promise.resolve(locations);
      case 'quests': return Promise.resolve(quests);
      case 'rumors': return Promise.resolve(rumors);
      default: return Promise.resolve([]);
    }
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'My Session Note',
    content: 'We met Aldric the wizard in Silverkeep.',
    extractedEntities: [],
    status: 'active',
    tags: [],
    updatedAt: '2024-01-15T10:00:00.000Z',
    campaignId: 'campaign-1',
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NoteReferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // No campaign state
  // -------------------------------------------------------------------------
  describe('no campaign selected', () => {
    test('should show "Loading campaign context..." when activeCampaignId is null', () => {
      setupMocks({ activeCampaignId: null });
      render(<NoteReferences noteId="note-1" />);
      expect(screen.getByText(/loading campaign context/i)).toBeInTheDocument();
    });

    test('should render "Campaign References Found" heading even without campaign', () => {
      setupMocks({ activeCampaignId: null });
      render(<NoteReferences noteId="note-1" />);
      expect(screen.getByText('Campaign References Found')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    test('should show "Searching for references..." while loading', async () => {
      // Make getCollection hang
      getCollectionMock.mockReturnValue(new Promise(() => {}));
      setupMocks({ note: makeNote() });
      (useCampaigns as jest.Mock).mockReturnValue({ activeCampaignId: 'campaign-1' });
      render(<NoteReferences noteId="note-1" />);
      // Loading text should show immediately
      await waitFor(() => {
        expect(screen.getByText(/searching for references/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    test('should show empty state message when no references are found', async () => {
      setupMocks({ note: makeNote({ content: 'Some random content xyz123.' }) });
      render(<NoteReferences noteId="note-1" />);
      await waitFor(() => {
        expect(screen.getByText(/no campaign elements found/i)).toBeInTheDocument();
      });
    });

    test('should call onSearchComplete callback after search finishes', async () => {
      const onSearchComplete = jest.fn();
      setupMocks({ note: makeNote() });
      render(<NoteReferences noteId="note-1" onSearchComplete={onSearchComplete} />);
      await waitFor(() => {
        expect(onSearchComplete).toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Reference matching
  // -------------------------------------------------------------------------
  describe('reference matching', () => {
    test('should render NPC reference when NPC name appears in note content', async () => {
      setupMocks({
        note: makeNote({ content: 'We met Aldric at the inn.' }),
        npcs: [{ id: 'npc-1', name: 'Aldric', title: 'Wizard' }],
      });
      render(<NoteReferences noteId="note-1" />);
      await waitFor(() => {
        expect(screen.getByText('Aldric')).toBeInTheDocument();
      });
    });

    test('should render Location reference when location name appears in note content', async () => {
      setupMocks({
        note: makeNote({ content: 'We traveled to Silverkeep.' }),
        locations: [{ id: 'loc-1', name: 'Silverkeep' }],
      });
      render(<NoteReferences noteId="note-1" />);
      await waitFor(() => {
        expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      });
    });

    test('should render Quest reference when quest title appears in note content', async () => {
      setupMocks({
        note: makeNote({ content: 'We began the dark rift quest.' }),
        quests: [{ id: 'q-1', title: 'dark rift' }],
      });
      render(<NoteReferences noteId="note-1" />);
      await waitFor(() => {
        expect(screen.getByText('dark rift')).toBeInTheDocument();
      });
    });

    test('should render Rumor reference when rumor title appears in note content', async () => {
      setupMocks({
        note: makeNote({ content: 'The shadow conspiracy is known.' }),
        rumors: [{ id: 'r-1', title: 'shadow conspiracy' }],
      });
      render(<NoteReferences noteId="note-1" />);
      await waitFor(() => {
        expect(screen.getByText('shadow conspiracy')).toBeInTheDocument();
      });
    });

    test('should NOT render reference when element name does NOT appear in note content', async () => {
      setupMocks({
        note: makeNote({ content: 'Nothing about goblins here.' }),
        npcs: [{ id: 'npc-2', name: 'Mysterious Stranger' }],
      });
      render(<NoteReferences noteId="note-1" />);
      await waitFor(() => {
        expect(screen.queryByText('Mysterious Stranger')).not.toBeInTheDocument();
      });
    });

    test('should call onReferencesFound with found references array', async () => {
      const onReferencesFound = jest.fn();
      setupMocks({
        note: makeNote({ content: 'Met Aldric.' }),
        npcs: [{ id: 'npc-1', name: 'Aldric' }],
      });
      render(<NoteReferences noteId="note-1" onReferencesFound={onReferencesFound} />);
      await waitFor(() => {
        expect(onReferencesFound).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 'npc-1', type: 'npc' }),
          ])
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe('navigation on reference click', () => {
    test('should navigate to NPC page with highlight when NPC reference is clicked', async () => {
      setupMocks({
        note: makeNote({ content: 'Met Aldric.' }),
        npcs: [{ id: 'npc-1', name: 'Aldric' }],
      });
      render(<NoteReferences noteId="note-1" />);
      await waitFor(() => {
        expect(screen.getByText('Aldric')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Aldric'));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/npcs?highlight=npc-1');
    });

    test('should navigate to Location page with highlight when location reference is clicked', async () => {
      setupMocks({
        note: makeNote({ content: 'Visited Silverkeep.' }),
        locations: [{ id: 'loc-1', name: 'Silverkeep' }],
      });
      render(<NoteReferences noteId="note-1" />);
      await waitFor(() => {
        expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Silverkeep'));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/locations?highlight=loc-1');
    });
  });

  // -------------------------------------------------------------------------
  // No note content
  // -------------------------------------------------------------------------
  describe('note without content', () => {
    test('should show empty state when note has no content', async () => {
      setupMocks({
        note: makeNote({ content: '' }),
        npcs: [{ id: 'npc-1', name: 'Aldric' }],
      });
      render(<NoteReferences noteId="note-1" />);
      await waitFor(() => {
        expect(screen.getByText(/no campaign elements found/i)).toBeInTheDocument();
      });
    });

    test('should show empty state when note is not found', async () => {
      setupMocks({ note: undefined });
      render(<NoteReferences noteId="note-999" />);
      await waitFor(() => {
        expect(screen.getByText(/no campaign elements found/i)).toBeInTheDocument();
      });
    });
  });
});
