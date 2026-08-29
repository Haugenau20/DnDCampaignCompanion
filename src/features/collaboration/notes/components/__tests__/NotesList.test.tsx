// src/features/collaboration/notes/components/__tests__/NotesList.test.tsx

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import NotesList from '../NotesList';
import { Note } from '../../types';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockSaveNote = jest.fn();
const mockNavigateToPage = jest.fn();
const mockCreateAndOpen = jest.fn();

jest.mock('../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));

jest.mock('../../hooks/useCreateNote', () => ({
  useCreateNote: jest.fn(),
}));

jest.mock('@/features/user-management', () => ({
  useCampaigns: jest.fn(),
}));

jest.mock('shared/hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

const { useNotes } = require('../../context/NoteContext');
const { useCreateNote } = require('../../hooks/useCreateNote');
const { useCampaigns } = require('@/features/user-management');
const { useNavigation } = require('shared/hooks/useNavigation');

function setupMocks({
  notes = [] as Note[],
  isLoading = false,
  error = null as string | null,
  activeCampaignId = 'campaign-1' as string | null,
  activeCampaign = { id: 'campaign-1', name: 'Test Campaign' } as any,
} = {}) {
  (useNotes as jest.Mock).mockReturnValue({
    notes,
    isLoading,
    error,
    saveNote: mockSaveNote,
  });
  (useCreateNote as jest.Mock).mockReturnValue({ createAndOpen: mockCreateAndOpen });
  (useCampaigns as jest.Mock).mockReturnValue({ activeCampaignId, activeCampaign });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    currentPath: '/notes',
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

let noteCounter = 0;

function makeNote(overrides: Partial<Note> = {}): Note {
  noteCounter += 1;
  return {
    id: `note-${noteCounter}`,
    title: `Note ${noteCounter}`,
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

function pillNamed(name: RegExp) {
  return screen.getByRole('button', { name });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    noteCounter = 0;
  });

  describe('states', () => {
    test('should show a loading state', () => {
      setupMocks({ isLoading: true });
      render(<NotesList />);
      expect(screen.getByText(/loading notes/i)).toBeInTheDocument();
    });

    test('should show an error state', () => {
      setupMocks({ error: 'Failed to fetch notes' });
      render(<NotesList />);
      expect(screen.getByText('Failed to fetch notes')).toBeInTheDocument();
    });

    test('should show the no-campaign state', () => {
      setupMocks({ activeCampaignId: null });
      render(<NotesList />);
      expect(screen.getByText(/no campaign selected/i)).toBeInTheDocument();
    });

    test('should show the empty state and let it create a note', () => {
      setupMocks({ notes: [] });
      render(<NotesList />);
      expect(screen.getByText(/no notes for this campaign/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /create note/i }));
      expect(mockCreateAndOpen).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    test('should filter on title', () => {
      setupMocks({
        notes: [
          makeNote({ title: 'Wave Echo Cave', content: 'aaa' }),
          makeNote({ title: 'Redbrand hideout', content: 'bbb' }),
        ],
      });
      render(<NotesList />);

      fireEvent.change(screen.getByPlaceholderText('Search note titles and text'), {
        target: { value: 'redbrand' },
      });

      expect(screen.getByText('Redbrand hideout')).toBeInTheDocument();
      expect(screen.queryByText('Wave Echo Cave')).not.toBeInTheDocument();
    });

    test('should filter on content', () => {
      setupMocks({
        notes: [
          makeNote({ title: 'One', content: 'Gundren Rockseeker was here' }),
          makeNote({ title: 'Two', content: 'nothing relevant' }),
        ],
      });
      render(<NotesList />);

      fireEvent.change(screen.getByPlaceholderText('Search note titles and text'), {
        target: { value: 'gundren' },
      });

      expect(screen.getByText('One')).toBeInTheDocument();
      expect(screen.queryByText('Two')).not.toBeInTheDocument();
    });

    test('should match a derived title', () => {
      setupMocks({
        notes: [
          makeNote({ title: '', content: 'Wave Echo Cave\nmore' }),
          makeNote({ title: 'Other', content: 'unrelated' }),
        ],
      });
      render(<NotesList />);

      fireEvent.change(screen.getByPlaceholderText('Search note titles and text'), {
        target: { value: 'wave echo' },
      });

      expect(screen.getByText('Wave Echo Cave')).toBeInTheDocument();
      expect(screen.queryByText('Other')).not.toBeInTheDocument();
    });
  });

  describe('filter pills', () => {
    function threeKinds() {
      return [
        makeNote({ title: 'Active one' }),
        makeNote({ title: 'Unsaved one', isUnsaved: true }),
        makeNote({ title: 'Archived one', status: 'archived' }),
      ];
    }

    test('should count All as non-archived', () => {
      setupMocks({ notes: threeKinds() });
      render(<NotesList />);
      expect(pillNamed(/^All 2$/)).toBeInTheDocument();
    });

    test('should count Unsaved and Archived', () => {
      setupMocks({ notes: threeKinds() });
      render(<NotesList />);
      expect(pillNamed(/^Unsaved 1$/)).toBeInTheDocument();
      expect(pillNamed(/^Archived 1$/)).toBeInTheDocument();
    });

    test('should hide archived notes under All', () => {
      setupMocks({ notes: threeKinds() });
      render(<NotesList />);
      expect(screen.queryByText('Archived one')).not.toBeInTheDocument();
    });

    test('should reveal archived notes under Archived', () => {
      setupMocks({ notes: threeKinds() });
      render(<NotesList />);

      fireEvent.click(pillNamed(/^Archived 1$/));

      expect(screen.getByText('Archived one')).toBeInTheDocument();
      expect(screen.queryByText('Active one')).not.toBeInTheDocument();
    });

    test('should show only unsaved notes under Unsaved', () => {
      setupMocks({ notes: threeKinds() });
      render(<NotesList />);

      fireEvent.click(pillNamed(/^Unsaved 1$/));

      expect(screen.getByText('Unsaved one')).toBeInTheDocument();
      expect(screen.queryByText('Active one')).not.toBeInTheDocument();
    });

    test('should mark the active pill with aria-pressed', () => {
      setupMocks({ notes: threeKinds() });
      render(<NotesList />);

      expect(pillNamed(/^All 2$/)).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(pillNamed(/^Archived 1$/));
      expect(pillNamed(/^Archived 1$/)).toHaveAttribute('aria-pressed', 'true');
      expect(pillNamed(/^All 2$/)).toHaveAttribute('aria-pressed', 'false');
    });

    test('should keep counts live as the search narrows the pool', () => {
      setupMocks({
        notes: [
          makeNote({ title: 'Keep me' }),
          makeNote({ title: 'Drop me' }),
          makeNote({ title: 'Keep me too' }),
        ],
      });
      render(<NotesList />);

      expect(pillNamed(/^All 3$/)).toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText('Search note titles and text'), {
        target: { value: 'keep' },
      });

      expect(pillNamed(/^All 2$/)).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    function datedNotes() {
      return [
        makeNote({ title: 'Middle', dateAdded: '2024-02-01T00:00:00.000Z', updatedAt: '2024-05-01T00:00:00.000Z' }),
        makeNote({ title: 'Oldest', dateAdded: '2024-01-01T00:00:00.000Z', updatedAt: '2024-06-01T00:00:00.000Z' }),
        makeNote({ title: 'Newest', dateAdded: '2024-03-01T00:00:00.000Z', updatedAt: '2024-04-01T00:00:00.000Z' }),
      ];
    }

    function renderedTitles(): string[] {
      return screen
        .getAllByRole('button')
        .filter(node => node.className.includes('note-card'))
        .map(node => within(node).getAllByText(/Oldest|Middle|Newest|Unsaved one/)[0].textContent ?? '');
    }

    test('should default to newest first by dateAdded', () => {
      setupMocks({ notes: datedNotes() });
      render(<NotesList />);
      expect(renderedTitles()).toEqual(['Newest', 'Middle', 'Oldest']);
    });

    test('should sort oldest first by dateAdded', () => {
      setupMocks({ notes: datedNotes() });
      render(<NotesList />);

      fireEvent.change(screen.getByLabelText('Sort notes'), { target: { value: 'oldest' } });

      expect(renderedTitles()).toEqual(['Oldest', 'Middle', 'Newest']);
    });

    test('should sort by updatedAt under "Recently edited"', () => {
      setupMocks({ notes: datedNotes() });
      render(<NotesList />);

      fireEvent.change(screen.getByLabelText('Sort notes'), { target: { value: 'edited' } });

      expect(renderedTitles()).toEqual(['Oldest', 'Middle', 'Newest']);
    });

    test('should pin unsaved notes to the top regardless of sort', () => {
      const notes = [
        ...datedNotes(),
        makeNote({ title: 'Unsaved one', isUnsaved: true, dateAdded: '2020-01-01T00:00:00.000Z' }),
      ];
      setupMocks({ notes });
      render(<NotesList />);

      expect(renderedTitles()[0]).toBe('Unsaved one');

      fireEvent.change(screen.getByLabelText('Sort notes'), { target: { value: 'oldest' } });
      expect(renderedTitles()[0]).toBe('Unsaved one');
    });
  });

  describe('collapsing a long list', () => {
    test('should show the first four rows and an expander', () => {
      setupMocks({ notes: Array.from({ length: 9 }, () => makeNote()) });
      render(<NotesList />);

      expect(screen.getByText('5 older notes')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show all/i })).toBeInTheDocument();
      expect(screen.queryByText('Note 9')).not.toBeInTheDocument();
    });

    test('should expand in place', () => {
      setupMocks({ notes: Array.from({ length: 9 }, () => makeNote()) });
      render(<NotesList />);

      fireEvent.click(screen.getByRole('button', { name: /show all/i }));

      expect(screen.getByText('Note 9')).toBeInTheDocument();
      expect(screen.queryByText('5 older notes')).not.toBeInTheDocument();
    });

    test('should not show the expander for a short list', () => {
      setupMocks({ notes: Array.from({ length: 3 }, () => makeNote()) });
      render(<NotesList />);
      expect(screen.queryByRole('button', { name: /show all/i })).not.toBeInTheDocument();
    });
  });

  describe('removed markup', () => {
    test('should not render the old section headings', () => {
      setupMocks({ notes: [makeNote({ isUnsaved: true }), makeNote()] });
      render(<NotesList />);

      expect(screen.queryByText('Unsaved Notes')).not.toBeInTheDocument();
      expect(screen.queryByText('Saved Notes')).not.toBeInTheDocument();
      expect(screen.queryByText('Not Saved')).not.toBeInTheDocument();
    });
  });

  describe('save now', () => {
    test('should save an unsaved note in place', () => {
      setupMocks({ notes: [makeNote({ id: 'note-x', isUnsaved: true })] });
      render(<NotesList />);

      fireEvent.click(screen.getByRole('button', { name: /save now/i }));

      expect(mockSaveNote).toHaveBeenCalledWith('note-x');
    });
  });
});
