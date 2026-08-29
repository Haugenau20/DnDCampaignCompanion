// src/features/collaboration/notes/components/__tests__/NoteCard.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NoteCard from '../NoteCard';
import { Note } from '../../types';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockNavigateToPage = jest.fn();

jest.mock('shared/hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

const { useNavigation } = require('shared/hooks/useNavigation');

function setupMocks() {
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
    id: 'note-1',
    title: 'Session 5 Notes',
    content: 'We fought the dragon and retrieved the artifact.',
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

describe('NoteCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('title', () => {
    test('should render an explicit title', () => {
      render(<NoteCard note={makeNote({ title: 'Session 5 Notes' })} />);
      expect(screen.getByText('Session 5 Notes')).toBeInTheDocument();
    });

    test('should derive the title from the first content line when untitled', () => {
      render(<NoteCard note={makeNote({ title: '', content: 'Wave Echo Cave\nrest of it' })} />);
      expect(screen.getByText('Wave Echo Cave')).toBeInTheDocument();
    });

    test('should read "Untitled note" only when there is no title and no content', () => {
      render(<NoteCard note={makeNote({ title: '', content: '' })} />);
      expect(screen.getByText('Untitled note')).toBeInTheDocument();
    });

    test('should never render the string "New Note"', () => {
      render(<NoteCard note={makeNote({ title: '', content: '' })} />);
      expect(screen.queryByText('New Note')).not.toBeInTheDocument();
      expect(screen.queryByText('Untitled Note')).not.toBeInTheDocument();
    });
  });

  describe('preview', () => {
    test('should render the content without a manual ellipsis', () => {
      const longContent = 'A'.repeat(200);
      render(<NoteCard note={makeNote({ content: longContent })} />);
      // Truncation is CSS (line-clamp-2), not a substring: the full text is
      // in the DOM and there is no injected "...".
      expect(screen.getByText(longContent)).toBeInTheDocument();
      expect(screen.queryByText(`${'A'.repeat(150)}...`)).not.toBeInTheDocument();
    });

    test('should apply line-clamp-2 to the preview', () => {
      render(<NoteCard note={makeNote({ content: 'Some content here.' })} />);
      expect(screen.getByText('Some content here.')).toHaveClass('line-clamp-2');
    });
  });

  describe('entity chips', () => {
    test('should render a chip per non-zero entity type with correct plurals', () => {
      const note = makeNote({
        extractedEntities: [
          { id: 'e1', text: 'Gundren', type: 'npc', confidence: 0.9, isConverted: true, createdAt: '2024-01-15T10:00:00.000Z' },
          { id: 'e2', text: 'Sildar', type: 'npc', confidence: 0.9, isConverted: true, createdAt: '2024-01-15T10:00:00.000Z' },
          { id: 'e3', text: 'Elmo', type: 'npc', confidence: 0.9, isConverted: true, createdAt: '2024-01-15T10:00:00.000Z' },
          { id: 'e4', text: 'Phandalin', type: 'location', confidence: 0.9, isConverted: true, createdAt: '2024-01-15T10:00:00.000Z' },
          { id: 'e5', text: 'Black Spider', type: 'rumor', confidence: 0.9, isConverted: true, createdAt: '2024-01-15T10:00:00.000Z' },
        ],
      });
      render(<NoteCard note={note} />);

      expect(screen.getByText('3 NPCs')).toBeInTheDocument();
      expect(screen.getByText('1 location')).toBeInTheDocument();
      expect(screen.getByText('1 rumor')).toBeInTheDocument();
    });

    test('should not render a chip for a type with no entities', () => {
      const note = makeNote({
        extractedEntities: [
          { id: 'e1', text: 'Gundren', type: 'npc', confidence: 0.9, isConverted: true, createdAt: '2024-01-15T10:00:00.000Z' },
        ],
      });
      render(<NoteCard note={note} />);

      expect(screen.getByText('1 NPC')).toBeInTheDocument();
      expect(screen.queryByText(/quest/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/location/i)).not.toBeInTheDocument();
    });
  });

  describe('tags', () => {
    test('should render each tag as its own chip, not a joined string', () => {
      render(<NoteCard note={makeNote({ tags: ['session', 'rivendell'] })} />);
      expect(screen.getByText('session')).toBeInTheDocument();
      expect(screen.getByText('rivendell')).toBeInTheDocument();
      expect(screen.queryByText('session, rivendell')).not.toBeInTheDocument();
    });
  });

  describe('unsaved notes', () => {
    test('should show a "Not saved yet" badge', () => {
      render(<NoteCard note={makeNote({ isUnsaved: true })} />);
      expect(screen.getByText('Not saved yet')).toBeInTheDocument();
    });

    test('should offer a "Save now" action that does not navigate', () => {
      const onSaveNow = jest.fn();
      render(<NoteCard note={makeNote({ id: 'note-9', isUnsaved: true })} onSaveNow={onSaveNow} />);

      fireEvent.click(screen.getByRole('button', { name: /save now/i }));

      expect(onSaveNow).toHaveBeenCalledWith('note-9');
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });

    test('should not show the badge for a saved note', () => {
      render(<NoteCard note={makeNote({ isUnsaved: false })} />);
      expect(screen.queryByText('Not saved yet')).not.toBeInTheDocument();
      expect(screen.queryByText('Not Saved')).not.toBeInTheDocument();
    });
  });

  describe('archived notes', () => {
    test('should mark an archived note', () => {
      render(<NoteCard note={makeNote({ status: 'archived' })} />);
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    test('should navigate to the note when the row is activated', () => {
      render(<NoteCard note={makeNote({ id: 'note-3' })} />);
      fireEvent.click(screen.getByText('Session 5 Notes'));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/notes/note-3');
    });
  });
});
