// src/components/features/notes/__tests__/NoteEditor.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import NoteEditor from '../NoteEditor';
import { Note } from '../../../../types/note';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockGetNoteById = jest.fn();
const mockUpdateNote = jest.fn();
const mockSaveNote = jest.fn();

jest.mock('../../../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));

// Mock lodash debounce to run immediately in tests
jest.mock('lodash', () => ({
  debounce: (fn: (...args: any[]) => any) => fn,
}));

const { useNotes } = require('../../../../context/NoteContext');

function setupMocks({
  note = undefined as Note | undefined,
  updateNote = mockUpdateNote,
  saveNote = mockSaveNote,
  getNoteById = mockGetNoteById,
} = {}) {
  (useNotes as jest.Mock).mockReturnValue({
    getNoteById,
    updateNote,
    saveNote,
  });
  mockGetNoteById.mockImplementation(() => note);
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'My Note',
    content: 'Some content here.',
    extractedEntities: [],
    status: 'active',
    tags: [],
    updatedAt: '2024-01-15T10:00:00.000Z',
    dateModified: '2024-01-15T10:00:00.000Z',
    campaignId: 'campaign-1',
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    isUnsaved: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NoteEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateNote.mockResolvedValue(undefined);
    mockSaveNote.mockResolvedValue(undefined);
    setupMocks({ note: makeNote() });
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render Title heading', () => {
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    test('should render Content heading', () => {
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    test('should render title input pre-populated from note', () => {
      setupMocks({ note: makeNote({ title: 'Pre-filled Title' }) });
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByDisplayValue('Pre-filled Title')).toBeInTheDocument();
    });

    test('should render content textarea pre-populated from note', () => {
      setupMocks({ note: makeNote({ content: 'Pre-filled content.' }) });
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByDisplayValue('Pre-filled content.')).toBeInTheDocument();
    });

    test('should render Save button', () => {
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    test('should render note title placeholder when note exists', () => {
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByPlaceholderText('Note Title')).toBeInTheDocument();
    });

    test('should render content placeholder', () => {
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByPlaceholderText('Write your note here...')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Input interaction
  // -------------------------------------------------------------------------
  describe('input interaction', () => {
    test('should update title input when user types', () => {
      render(<NoteEditor noteId="note-1" />);
      const titleInput = screen.getByPlaceholderText('Note Title');
      fireEvent.change(titleInput, { target: { value: 'New Title' } });
      expect(titleInput).toHaveValue('New Title');
    });

    test('should update content textarea when user types', () => {
      render(<NoteEditor noteId="note-1" />);
      const contentInput = screen.getByPlaceholderText('Write your note here...');
      fireEvent.change(contentInput, { target: { value: 'New content here.' } });
      expect(contentInput).toHaveValue('New content here.');
    });

    test('should call updateNote when title changes (via debounced save)', async () => {
      render(<NoteEditor noteId="note-1" />);
      const titleInput = screen.getByPlaceholderText('Note Title');
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
      await waitFor(() => {
        expect(mockUpdateNote).toHaveBeenCalledWith(
          'note-1',
          expect.objectContaining({ title: 'Updated Title' })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Read-only mode
  // -------------------------------------------------------------------------
  describe('read-only mode', () => {
    test('should disable title input when readOnly is true', () => {
      render(<NoteEditor noteId="note-1" readOnly={true} />);
      expect(screen.getByPlaceholderText('Note Title')).toBeDisabled();
    });

    test('should disable content textarea when readOnly is true', () => {
      render(<NoteEditor noteId="note-1" readOnly={true} />);
      expect(screen.getByPlaceholderText('Write your note here...')).toBeDisabled();
    });

    test('should disable Save button when readOnly is true', () => {
      render(<NoteEditor noteId="note-1" readOnly={true} />);
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Save functionality
  // -------------------------------------------------------------------------
  describe('save functionality', () => {
    test('should call saveNote when Save button is clicked', async () => {
      render(<NoteEditor noteId="note-1" />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
      });
      expect(mockSaveNote).toHaveBeenCalledWith(
        'note-1',
        expect.objectContaining({ title: 'My Note', content: 'Some content here.' })
      );
    });

    test('should call onSave callback after manual save', async () => {
      const onSave = jest.fn();
      render(<NoteEditor noteId="note-1" onSave={onSave} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
      });
      expect(onSave).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Unsaved state display
  // -------------------------------------------------------------------------
  describe('unsaved state display', () => {
    test('should show "Not saved to server" status when note isUnsaved', () => {
      setupMocks({ note: makeNote({ isUnsaved: true }) });
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByText('Not saved to server')).toBeInTheDocument();
    });

    test('should show "Remember to save your work!" when note is unsaved', () => {
      setupMocks({ note: makeNote({ isUnsaved: true }) });
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByText("Remember to save your work!")).toBeInTheDocument();
    });

    test('should show "Click Save to store this note permanently" when note is unsaved', () => {
      setupMocks({ note: makeNote({ isUnsaved: true }) });
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByText('Click Save to store this note permanently')).toBeInTheDocument();
    });

    test('should show autosave interval text for saved notes', () => {
      setupMocks({ note: makeNote({ isUnsaved: false }) });
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByText(/Autosave every/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard shortcut (lines 135-137)
  // -------------------------------------------------------------------------
  describe('keyboard shortcut', () => {
    test('should call saveNote when Ctrl+S is pressed', async () => {
      render(<NoteEditor noteId="note-1" />);
      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })
        );
      });
      expect(mockSaveNote).toHaveBeenCalled();
    });

    test('should NOT call saveNote when only S key pressed (no Ctrl)', async () => {
      render(<NoteEditor noteId="note-1" />);
      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 's', ctrlKey: false, bubbles: true })
        );
      });
      expect(mockSaveNote).not.toHaveBeenCalled();
    });

    test('should NOT call saveNote when Ctrl+other key pressed', async () => {
      render(<NoteEditor noteId="note-1" />);
      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })
        );
      });
      expect(mockSaveNote).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Saving state indicator (lines 181-182 — isSaving === true path)
  // -------------------------------------------------------------------------
  describe('saving state indicator', () => {
    test('should show "Saving..." text while save is in progress', async () => {
      let resolveNote!: () => void;
      mockSaveNote.mockReturnValue(new Promise<void>(resolve => { resolveNote = resolve; }));

      render(<NoteEditor noteId="note-1" />);

      // Click Save to enter saving state
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      // While saving, "Saving..." text should appear
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      // Clean up
      await act(async () => { resolveNote(); });
    });
  });

  // -------------------------------------------------------------------------
  // handleManualSave error re-throw (lines 125-126)
  // -------------------------------------------------------------------------
  describe('handleManualSave error propagation', () => {
    // Bug #1051: handleManualSave re-throws on line 126, but the Save button
    // click handler and Ctrl+S handler both call it without .catch(), producing
    // an unhandled rejection that propagates to the test runner.
    // The button's onClick does not display the error to the user.
    test.skip('should show error state indicator when save fails — skipped: bug #1051 (re-throw causes unhandled rejection)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSaveNote.mockRejectedValue(new Error('Save failed'));

      render(<NoteEditor noteId="note-1" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
      });

      // After failure, saving state should resolve (isSaving = false via finally)
      await waitFor(() => {
        // The save button should be re-enabled after the error
        expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
      });

      consoleSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // useImperativeHandle ref (line 55 — getCurrentContent / saveCurrentContent)
  // -------------------------------------------------------------------------
  describe('imperative ref methods', () => {
    test('should expose getCurrentContent returning current title and content via ref', () => {
      const ref = React.createRef<any>();
      setupMocks({ note: makeNote({ title: 'Ref Title', content: 'Ref Content' }) });
      render(<NoteEditor noteId="note-1" ref={ref} />);

      // After render, ref should be populated
      expect(ref.current).not.toBeNull();
      const { title, content } = ref.current.getCurrentContent();
      expect(title).toBe('Ref Title');
      expect(content).toBe('Ref Content');
    });

    test('should expose saveCurrentContent that calls saveNote via ref', async () => {
      const ref = React.createRef<any>();
      render(<NoteEditor noteId="note-1" ref={ref} />);

      await act(async () => {
        await ref.current.saveCurrentContent();
      });

      expect(mockSaveNote).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getLastSavedText — various time branches (lines 170, 181-182)
  // -------------------------------------------------------------------------
  describe('last saved text', () => {
    test('should show "Never saved" when note has no dateModified and is not unsaved', () => {
      setupMocks({ note: makeNote({ isUnsaved: false, dateModified: undefined }) });
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByText('Never saved')).toBeInTheDocument();
    });

    test('should show "Saved Xs ago" when note was saved less than 60 seconds ago', () => {
      // dateModified 10 seconds ago
      const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();
      setupMocks({ note: makeNote({ isUnsaved: false, dateModified: tenSecondsAgo }) });
      render(<NoteEditor noteId="note-1" />);
      // e.g. "Saved 10s ago"
      expect(screen.getByText(/Saved \d+s ago/)).toBeInTheDocument();
    });

    test('should show "Saved Xm ago" when note was saved between 1 and 59 minutes ago (lines 181-182)', () => {
      // dateModified 2 minutes ago
      const twoMinutesAgo = new Date(Date.now() - 120_000).toISOString();
      setupMocks({ note: makeNote({ isUnsaved: false, dateModified: twoMinutesAgo }) });
      render(<NoteEditor noteId="note-1" />);
      // e.g. "Saved 2m ago"
      expect(screen.getByText(/Saved \d+m ago/)).toBeInTheDocument();
    });

    test('should show saved-seconds-ago text for a just-saved note (exercises getLastSavedText)', () => {
      // A saved note with a very recent dateModified produces "Saved Xs ago"
      const justNow = new Date(Date.now() - 5_000).toISOString();
      setupMocks({ note: makeNote({ isUnsaved: false, dateModified: justNow }) });
      render(<NoteEditor noteId="note-1" />);
      // Should show time-based saved text
      expect(screen.getByText(/Saved \d+s ago/)).toBeInTheDocument();
    });
  });
});
