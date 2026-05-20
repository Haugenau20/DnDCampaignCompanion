// src/components/features/notes/__tests__/NotesList.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotesList from '../NotesList';
import { Note } from '../../../../types/note';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockCreateNote = jest.fn();
const mockNavigateToPage = jest.fn();

jest.mock('../../../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));

jest.mock('../../../../context/firebase', () => ({
  useCampaigns: jest.fn(),
}));

jest.mock('../../../../hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

const { useNotes } = require('../../../../context/NoteContext');
const { useCampaigns } = require('../../../../context/firebase');
const { useNavigation } = require('../../../../hooks/useNavigation');

function setupMocks({
  notes = [] as Note[],
  isLoading = false,
  error = null as string | null,
  activeCampaignId = 'campaign-1' as string | null,
  activeCampaign = { id: 'campaign-1', name: 'Test Campaign' } as any,
  createNote = mockCreateNote,
} = {}) {
  (useNotes as jest.Mock).mockReturnValue({
    notes,
    isLoading,
    error,
    createNote,
  });
  (useCampaigns as jest.Mock).mockReturnValue({
    activeCampaignId,
    activeCampaign,
  });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    currentPath: '/notes',
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: `note-${Math.random().toString(36).slice(2)}`,
    title: 'Test Note',
    content: 'Some content here.',
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

describe('NotesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateNote.mockResolvedValue('new-note-id');
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    test('should render loading indicator when isLoading is true', () => {
      setupMocks({ isLoading: true });
      render(<NotesList />);
      expect(screen.getByText(/loading notes/i)).toBeInTheDocument();
    });

    test('should not render notes list when loading', () => {
      const note = makeNote({ title: 'Hidden Note' });
      setupMocks({ isLoading: true, notes: [note] });
      render(<NotesList />);
      expect(screen.queryByText('Hidden Note')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe('error state', () => {
    test('should render error message when error is set', () => {
      setupMocks({ error: 'Failed to load notes' });
      render(<NotesList />);
      expect(screen.getByText('Failed to load notes')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // No campaign selected state
  // -------------------------------------------------------------------------
  describe('no campaign selected', () => {
    test('should show "No Campaign Selected" when activeCampaignId is null', () => {
      setupMocks({ activeCampaignId: null, activeCampaign: null });
      render(<NotesList />);
      expect(screen.getByText('No Campaign Selected')).toBeInTheDocument();
    });

    test('should show disabled "Select Campaign" button when no campaign', () => {
      setupMocks({ activeCampaignId: null, activeCampaign: null });
      render(<NotesList />);
      const btn = screen.getByRole('button', { name: /select campaign/i });
      expect(btn).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state (campaign selected, no notes)
  // -------------------------------------------------------------------------
  describe('empty state with campaign', () => {
    test('should show "No notes for this campaign" when notes array is empty', () => {
      setupMocks({ notes: [] });
      render(<NotesList />);
      expect(screen.getByText(/no notes for this campaign/i)).toBeInTheDocument();
    });

    test('should show Create Note button in empty state', () => {
      setupMocks({ notes: [] });
      render(<NotesList />);
      expect(screen.getByRole('button', { name: /create note/i })).toBeInTheDocument();
    });

    test('should include campaign name in empty-state message', () => {
      setupMocks({
        notes: [],
        activeCampaign: { id: 'c1', name: 'Dragon Campaign' },
      });
      render(<NotesList />);
      expect(screen.getByText(/Dragon Campaign/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Notes rendering
  // -------------------------------------------------------------------------
  describe('notes rendering', () => {
    test('should render all saved notes', () => {
      const n1 = makeNote({ id: 'n1', title: 'Note Alpha' });
      const n2 = makeNote({ id: 'n2', title: 'Note Beta' });
      setupMocks({ notes: [n1, n2] });
      render(<NotesList />);
      expect(screen.getByText('Note Alpha')).toBeInTheDocument();
      expect(screen.getByText('Note Beta')).toBeInTheDocument();
    });

    test('should show note count', () => {
      const notes = [makeNote(), makeNote()];
      setupMocks({ notes });
      render(<NotesList />);
      expect(screen.getByText(/2 notes/i)).toBeInTheDocument();
    });

    test('should show singular "note" for count of 1', () => {
      setupMocks({ notes: [makeNote()] });
      render(<NotesList />);
      expect(screen.getByText(/1 note/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Unsaved notes
  // -------------------------------------------------------------------------
  describe('unsaved notes', () => {
    test('should render "Unsaved Notes" section header when unsaved notes exist', () => {
      const unsaved = makeNote({ id: 'u1', title: 'Unsaved Note', isUnsaved: true });
      const saved = makeNote({ id: 's1', title: 'Saved Note', isUnsaved: false });
      setupMocks({ notes: [unsaved, saved] });
      render(<NotesList />);
      expect(screen.getByText('Unsaved Notes')).toBeInTheDocument();
    });

    test('should render "Not Saved" badge on unsaved notes', () => {
      const unsaved = makeNote({ id: 'u1', title: 'Unsaved Note', isUnsaved: true });
      setupMocks({ notes: [unsaved] });
      render(<NotesList />);
      expect(screen.getByText('Not Saved')).toBeInTheDocument();
    });

    test('should show unsaved count in summary', () => {
      const unsaved = makeNote({ id: 'u1', isUnsaved: true });
      setupMocks({ notes: [unsaved] });
      render(<NotesList />);
      expect(screen.getByText(/1 unsaved/i)).toBeInTheDocument();
    });

    test('should render "Saved Notes" section header when both saved and unsaved notes exist', () => {
      const unsaved = makeNote({ id: 'u1', isUnsaved: true });
      const saved = makeNote({ id: 's1', isUnsaved: false });
      setupMocks({ notes: [unsaved, saved] });
      render(<NotesList />);
      expect(screen.getByText('Saved Notes')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Create note flow
  // -------------------------------------------------------------------------
  describe('create note flow', () => {
    test('should call createNote when Create Note button is clicked', async () => {
      setupMocks({ notes: [] });
      render(<NotesList />);
      fireEvent.click(screen.getByRole('button', { name: /create note/i }));
      await waitFor(() => {
        expect(mockCreateNote).toHaveBeenCalledWith('New Note', '');
      });
    });

    test('should navigate to new note page after creation', async () => {
      setupMocks({ notes: [] });
      render(<NotesList />);
      fireEvent.click(screen.getByRole('button', { name: /create note/i }));
      await waitFor(() => {
        expect(mockNavigateToPage).toHaveBeenCalledWith('/notes/new-note-id');
      });
    });

    test('should not call createNote when no campaign is selected', async () => {
      setupMocks({ activeCampaignId: null, activeCampaign: null, notes: [] });
      render(<NotesList />);
      // The Create Note button is not shown in the no-campaign state
      expect(screen.queryByRole('button', { name: /create note/i })).not.toBeInTheDocument();
    });
  });
});
