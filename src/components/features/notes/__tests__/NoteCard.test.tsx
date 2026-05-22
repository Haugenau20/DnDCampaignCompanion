// src/components/features/notes/__tests__/NoteCard.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NoteCard from '../NoteCard';
import { Note } from '../../../../types/note';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockNavigateToPage = jest.fn();

jest.mock('../../../../hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

const { useNavigation } = require('../../../../hooks/useNavigation');

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

  // -------------------------------------------------------------------------
  // Basic rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render note title', () => {
      render(<NoteCard note={makeNote()} />);
      expect(screen.getByText('Session 5 Notes')).toBeInTheDocument();
    });

    test('should render "Untitled Note" when title is empty', () => {
      render(<NoteCard note={makeNote({ title: '' })} />);
      expect(screen.getByText('Untitled Note')).toBeInTheDocument();
    });

    test('should render content preview when content is short', () => {
      render(<NoteCard note={makeNote({ content: 'Short content.' })} />);
      expect(screen.getByText('Short content.')).toBeInTheDocument();
    });

    test('should render content truncated to 150 chars with ellipsis when content is long', () => {
      const longContent = 'A'.repeat(200);
      render(<NoteCard note={makeNote({ content: longContent })} />);
      const expected = 'A'.repeat(150) + '...';
      expect(screen.getByText(expected)).toBeInTheDocument();
    });

    test('should render "No content yet" when content is empty', () => {
      render(<NoteCard note={makeNote({ content: '' })} />);
      expect(screen.getByText('No content yet')).toBeInTheDocument();
    });

    test('should render "Updated:" label', () => {
      render(<NoteCard note={makeNote()} />);
      expect(screen.getByText(/Updated:/)).toBeInTheDocument();
    });

    test('should NOT render Archived badge for active notes', () => {
      render(<NoteCard note={makeNote({ status: 'active' })} />);
      expect(screen.queryByText('Archived')).not.toBeInTheDocument();
    });

    test('should render Archived badge for archived notes', () => {
      render(<NoteCard note={makeNote({ status: 'archived' })} />);
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Tags rendering
  // -------------------------------------------------------------------------
  describe('tags rendering', () => {
    test('should render tags joined by comma when tags are present', () => {
      render(<NoteCard note={makeNote({ tags: ['combat', 'dragon'] })} />);
      expect(screen.getByText('combat, dragon')).toBeInTheDocument();
    });

    test('should not render tags section when tags array is empty', () => {
      render(<NoteCard note={makeNote({ tags: [] })} />);
      // No comma-separated tags text
      expect(screen.queryByText(/,/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Click navigation
  // -------------------------------------------------------------------------
  describe('click navigation', () => {
    test('should call navigateToPage with note detail path when card is clicked', () => {
      render(<NoteCard note={makeNote({ id: 'note-42' })} />);
      // The card is a clickable div/card; click on the title
      fireEvent.click(screen.getByText('Session 5 Notes'));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/notes/note-42');
    });
  });

  // -------------------------------------------------------------------------
  // Status badge class coverage (lines 47, 51 — getStatusBadgeClass branches)
  // -------------------------------------------------------------------------
  describe('status badge styling', () => {
    test('should render Archived badge element with badge class for archived notes (line 47)', () => {
      render(<NoteCard note={makeNote({ status: 'archived' })} />);
      const badge = screen.getByText('Archived');
      // The badge span should have the archived status class applied
      expect(badge.tagName.toLowerCase()).toBe('span');
      // Class is applied via getStatusBadgeClass() returning "status-archived"
      expect(badge.className).toContain('status-archived');
    });

    test('should render no badge for notes with unknown status (default branch, line 51)', () => {
      // A status value not matching "active" or "archived" hits the default case
      render(<NoteCard note={makeNote({ status: 'unknown-status' as any })} />);
      // "Archived" badge condition is: note.status === "archived" — does not match
      expect(screen.queryByText('Archived')).not.toBeInTheDocument();
    });
  });
});
