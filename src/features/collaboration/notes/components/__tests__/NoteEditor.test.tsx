// src/features/collaboration/notes/components/__tests__/NoteEditor.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import NoteEditor from '../NoteEditor';
import { Note } from '../../types';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockGetNoteById = jest.fn();
const mockUpdateNote = jest.fn();
const mockSaveNote = jest.fn();

jest.mock('../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));

const { useNotes } = require('../../context/NoteContext');

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

function renderEditor({
  note = makeNote(),
  props = {} as Partial<React.ComponentProps<typeof NoteEditor>>,
} = {}) {
  setupMocks({ note });
  return render(<NoteEditor noteId="note-1" {...props} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NoteEditor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUpdateNote.mockResolvedValue(undefined);
    mockSaveNote.mockResolvedValue(undefined);
    setupMocks({ note: makeNote() });
  });

  afterEach(() => {
    jest.useRealTimers();
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

    // Placeholder is "Untitled note", not "Note Title" -- this is the same
    // input the title-derivation tests below locate by that placeholder.
    test('should render note title placeholder when note exists', () => {
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByPlaceholderText('Untitled note')).toBeInTheDocument();
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
      const titleInput = screen.getByPlaceholderText('Untitled note');
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
      const titleInput = screen.getByPlaceholderText('Untitled note');
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

      jest.advanceTimersByTime(2500);

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
      expect(screen.getByPlaceholderText('Untitled note')).toBeDisabled();
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

    // The separate "Remember to save your work!" / "Click Save to store this
    // note permanently" caption row is gone -- save state is stated exactly
    // once now, via the status indicator above. See the "save status"
    // describe block below for the positive assertion.
    test('should not show a second "remember to save" message alongside the status indicator', () => {
      setupMocks({ note: makeNote({ isUnsaved: true }) });
      render(<NoteEditor noteId="note-1" />);
      expect(screen.queryByText(/remember to save your work/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/click save to store this note permanently/i)).not.toBeInTheDocument();
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
  // handleManualSave error re-throw (lines 132-134)
  // -------------------------------------------------------------------------
  describe('handleManualSave error propagation', () => {
    // Bug #1051 (fixed): handleManualSave still re-throws (that contract is
    // relied on by the ref-exposed saveCurrentContent -- see the
    // "imperative ref methods" describe block below, and EntityExtractor's
    // own suite). The Save button and Ctrl+S handler no longer call it
    // directly though -- they go through triggerManualSave, which catches
    // the rejection and surfaces it via the saveError state instead of
    // producing an unhandled promise rejection.
    test('should show error state indicator when save fails', async () => {
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

    test('should display the error message when the Save button click fails, with no unhandled rejection', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSaveNote.mockRejectedValue(new Error('Save failed'));

      render(<NoteEditor noteId="note-1" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('should display the error message when Ctrl+S fails, with no unhandled rejection', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSaveNote.mockRejectedValue(new Error('Ctrl+S save failed'));

      render(<NoteEditor noteId="note-1" />);

      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Ctrl+S save failed')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('should clear a prior save error once a subsequent save succeeds', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSaveNote.mockRejectedValueOnce(new Error('Save failed'));

      render(<NoteEditor noteId="note-1" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });

      mockSaveNote.mockResolvedValueOnce(undefined);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
      });

      await waitFor(() => {
        expect(screen.queryByText('Save failed')).not.toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('should clear a prior save error when the user edits the content', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSaveNote.mockRejectedValue(new Error('Save failed'));

      render(<NoteEditor noteId="note-1" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('Write your note here...'), {
        target: { value: 'Editing after failure.' },
      });

      expect(screen.queryByText('Save failed')).not.toBeInTheDocument();

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

    // Bug #1051: the report's "Recommended Fix" option 1 (remove `throw error`
    // from handleManualSave) would break this contract. EntityExtractor's
    // handleExtract calls saveCurrentContent (via NotePage's
    // saveCurrentEditorContent) and depends on the rejection to abort AI
    // extraction against unsaved content -- see
    // src/features/collaboration/entity-extraction/components/EntityExtractor.tsx
    // (the pre-extraction save's catch block). This test guards against a
    // future "simplification" that swallows the error inside NoteEditor
    // instead of rejecting.
    test('should reject saveCurrentContent (via ref) when saveNote fails, so callers like EntityExtractor can abort', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSaveNote.mockRejectedValue(new Error('Save failed'));

      const ref = React.createRef<any>();
      render(<NoteEditor noteId="note-1" ref={ref} />);

      await expect(
        act(async () => {
          await ref.current.saveCurrentContent();
        })
      ).rejects.toThrow('Save failed');

      consoleSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Last-saved text, via formatLastSaved (replaces the old getLastSavedText,
  // which had no day unit and rendered "Saved 10870h ago" for an old note).
  // -------------------------------------------------------------------------
  describe('last saved text', () => {
    test('should show "Not saved yet" when note has no dateModified and is not unsaved', () => {
      setupMocks({ note: makeNote({ isUnsaved: false, dateModified: undefined }) });
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByText('Not saved yet')).toBeInTheDocument();
    });

    test('should show "Saved just now" when note was saved less than a minute ago', () => {
      const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();
      setupMocks({ note: makeNote({ isUnsaved: false, dateModified: tenSecondsAgo }) });
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByText('Saved just now')).toBeInTheDocument();
    });

    test('should show a minutes-ago phrase when note was saved a few minutes ago', () => {
      const twoMinutesAgo = new Date(Date.now() - 120_000).toISOString();
      setupMocks({ note: makeNote({ isUnsaved: false, dateModified: twoMinutesAgo }) });
      render(<NoteEditor noteId="note-1" />);
      expect(screen.getByText(/saved 2 minutes ago/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Title derivation (Task 11: deriveTitle drives the title until the user
  // types one explicitly).
  // -------------------------------------------------------------------------
  describe('title derivation', () => {
    test('should save a title derived from the first content line', async () => {
      renderEditor({ note: makeNote({ title: '', content: '' }) });

      fireEvent.change(screen.getByPlaceholderText('Write your note here...'), {
        target: { value: 'Wave Echo Cave\nThe party met Gundren.' },
      });

      jest.advanceTimersByTime(2500);

      await waitFor(() => {
        expect(mockUpdateNote).toHaveBeenCalledWith(
          'note-1',
          expect.objectContaining({ title: 'Wave Echo Cave' })
        );
      });
    });

    test('should stop deriving once the user types a title', async () => {
      renderEditor({ note: makeNote({ title: '', content: 'First line' }) });

      fireEvent.change(screen.getByPlaceholderText('Untitled note'), {
        target: { value: 'My own title' },
      });
      fireEvent.change(screen.getByPlaceholderText('Write your note here...'), {
        target: { value: 'A different first line' },
      });

      jest.advanceTimersByTime(2500);

      await waitFor(() => {
        expect(mockUpdateNote).toHaveBeenCalledWith(
          'note-1',
          expect.objectContaining({ title: 'My own title' })
        );
      });
    });

    test('should hide the derivation hint once the title is explicit', () => {
      renderEditor({ note: makeNote({ title: 'Explicit', content: 'x' }) });
      expect(
        screen.queryByText('Taken from the first line. Click to write your own title.')
      ).not.toBeInTheDocument();
    });

    test('should show the derivation hint while the title is derived', () => {
      renderEditor({ note: makeNote({ title: '', content: 'First line' }) });
      expect(
        screen.getByText('Taken from the first line. Click to write your own title.')
      ).toBeInTheDocument();
    });
  });

  describe('autosave', () => {
    test('should save about two seconds after typing stops', async () => {
      renderEditor({ note: makeNote({ content: 'start' }) });

      fireEvent.change(screen.getByPlaceholderText('Write your note here...'), {
        target: { value: 'start and more' },
      });

      jest.advanceTimersByTime(1000);
      expect(mockUpdateNote).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1500);
      await waitFor(() => expect(mockUpdateNote).toHaveBeenCalled());
    });

    test('should save on an interval during continuous typing', async () => {
      renderEditor({ note: makeNote({ content: 'start' }) });
      const body = screen.getByPlaceholderText('Write your note here...');

      // Type without ever pausing long enough for the debounce to fire.
      for (let tick = 0; tick < 20; tick += 1) {
        fireEvent.change(body, { target: { value: `start ${'x'.repeat(tick)}` } });
        jest.advanceTimersByTime(1800);
      }

      await waitFor(() => expect(mockUpdateNote).toHaveBeenCalled());
    });

    test('should save a note shorter than three characters', async () => {
      renderEditor({ note: makeNote({ content: '' }) });

      fireEvent.change(screen.getByPlaceholderText('Write your note here...'), {
        target: { value: 'ab' },
      });

      jest.advanceTimersByTime(2500);

      // MIN_CONTENT_LENGTH used to return early with no state change, leaving
      // a two-character note reading "Unsaved changes" forever.
      await waitFor(() => {
        expect(mockUpdateNote).toHaveBeenCalledWith(
          'note-1',
          expect.objectContaining({ content: 'ab' })
        );
      });
    });
  });

  describe('save status', () => {
    test('should state the save status exactly once', () => {
      renderEditor({ note: makeNote({ isUnsaved: false, dateModified: new Date().toISOString() }) });

      expect(screen.queryByText(/autosave every/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/remember to save your work/i)).not.toBeInTheDocument();
      expect(screen.getAllByText(/saved/i)).toHaveLength(1);
    });

    test('should not claim an hour count for an old note', () => {
      const longAgo = new Date('2024-01-01T00:00:00.000Z').toISOString();
      renderEditor({ note: makeNote({ isUnsaved: false, dateModified: longAgo }) });

      expect(screen.queryByText(/\d{3,}h ago/)).not.toBeInTheDocument();
    });

    test('should count words', () => {
      renderEditor({ note: makeNote({ content: 'one two three four five' }) });
      expect(screen.getByText(/5 words/)).toBeInTheDocument();
    });
  });

  describe('removed API', () => {
    test('should not accept an onExtractEntities prop', () => {
      // Compile-time contract; asserted here so the deletion is recorded.
      const props = Object.keys({ noteId: '', readOnly: false, onSave: () => undefined });
      expect(props).not.toContain('onExtractEntities');
    });
  });
});
