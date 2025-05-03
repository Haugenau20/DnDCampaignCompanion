// src/components/features/notes/__tests__/NoteEditor.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import NoteEditor from '../NoteEditor';
import { useNotes } from '../../../../context/NoteContext';
import { useTheme } from '../../../../themes/ThemeContext';

// Mock dependencies
jest.mock('../../../../context/NoteContext');
jest.mock('../../../../themes/ThemeContext');

describe('NoteEditor', () => {
  const mockNote = {
    id: 'test-note',
    title: 'Test Session',
    content: 'Initial content',
    sessionNumber: 1,
    sessionDate: '2025-05-03',
    status: 'active',
    attendingPlayers: [],
    extractedEntities: [],
    tags: [],
    createdBy: 'user1',
    createdByUsername: 'User 1',
    dateAdded: '2025-05-03',
    modifiedBy: 'user1',
    modifiedByUsername: 'User 1',
    dateModified: '2025-05-03'
  };

  const mockUpdateNoteContent = jest.fn();
  const mockGetNoteById = jest.fn(() => mockNote);
  const mockTheme = { themePrefix: 'theme' };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNotes as jest.Mock).mockReturnValue({
      getNoteById: mockGetNoteById,
      updateNoteContent: mockUpdateNoteContent
    });
    (useTheme as jest.Mock).mockReturnValue(mockTheme);
  });

  it('renders note content', () => {
    const { getByText, getByRole } = render(<NoteEditor noteId="test-note" />);
    
    expect(getByText('Test Session')).toBeInTheDocument();
    expect(getByRole('textbox')).toHaveValue('Initial content');
  });

  it('handles content changes', async () => {
    jest.useFakeTimers();
    
    const { getByRole } = render(<NoteEditor noteId="test-note" />);
    const textarea = getByRole('textbox');
    
    fireEvent.change(textarea, { target: { value: 'New content' } });
    
    // Should not call immediately due to debounce
    expect(mockUpdateNoteContent).not.toHaveBeenCalled();
    
    // Fast-forward past debounce time
    jest.advanceTimersByTime(1000);
    
    expect(mockUpdateNoteContent).toHaveBeenCalledWith('test-note', 'New content');
    
    jest.useRealTimers();
  });

  it('respects read-only mode', () => {
    const { getByRole } = render(<NoteEditor noteId="test-note" readOnly={true} />);
    const textarea = getByRole('textbox');
    
    expect(textarea).toBeDisabled();
  });

  it('calls onExtractEntities when button is clicked', () => {
    const mockExtractEntities = jest.fn();
    const { getByText } = render(
      <NoteEditor 
        noteId="test-note" 
        onExtractEntities={mockExtractEntities} 
      />
    );
    
    fireEvent.click(getByText('Extract Entities'));
    expect(mockExtractEntities).toHaveBeenCalled();
  });
});