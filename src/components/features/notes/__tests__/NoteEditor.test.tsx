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
});
