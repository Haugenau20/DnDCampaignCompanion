# Phase 9: Testing & Validation


# Phase 9: Testing & Validation

## Testing Strategy Overview

This phase covers comprehensive testing for the note-taking feature, including unit tests, integration tests, and end-to-end scenarios.

## Test File Structure

```
src/components/features/notes/__tests__/
├── NoteEditor.test.tsx
├── EntityExtractor.test.tsx
├── NoteReferences.test.tsx
├── SessionFlow.test.tsx
└── NotePage.test.tsx

src/context/__tests__/
└── NoteContext.test.tsx

src/hooks/__tests__/
├── useNoteData.test.ts
├── useSessionNote.test.ts
└── useEntityExtractor.test.ts

src/utils/__tests__/
├── entity-extractor.test.ts
└── note-relationships.test.ts
```

## Unit Tests

### 1. OpenAI Entity Extractor Tests
Path: `src/services/openai/__tests__/entityExtractor.test.ts`

```typescript
// src/services/openai/__tests__/entityExtractor.test.ts
import { extractEntitiesFromNote } from '../entityExtractor';

// Mock fetch for OpenAI API calls
global.fetch = jest.fn();

describe('OpenAI Entity Extraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should extract entities successfully', async () => {
    const mockResponse = {
      entities: [
        { text: 'Lord Blackthorn', type: 'npc', confidence: 0.95 },
        { text: 'City of Waterdeep', type: 'location', confidence: 0.9 }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      })
    });

    const content = 'The party met Lord Blackthorn in the City of Waterdeep.';
    const entities = await extractEntitiesFromNote(content);

    expect(entities).toHaveLength(2);
    expect(entities[0].text).toBe('Lord Blackthorn');
    expect(entities[0].type).toBe('npc');
  });

  test('should handle API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error'
    });

    await expect(extractEntitiesFromNote('test content')).rejects.toThrow();
  });
});
```

### 2. NoteContext Tests
Path: `src/context/__tests__/NoteContext.test.tsx`

```typescript
// src/context/__tests__/NoteContext.test.tsx
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { NoteProvider, useNotes } from '../NoteContext';
import { SessionNote } from '../../types/note';

// Mock dependencies
jest.mock('../../hooks/useNoteData', () => ({
  useNoteData: () => ({
    notes: mockNotes,
    loading: false,
    error: null,
    refreshNotes: jest.fn()
  })
}));

describe('NoteContext', () => {
  const mockNotes: SessionNote[] = [
    {
      id: 'test-note-1',
      sessionNumber: 1,
      sessionDate: '2025-05-03T19:00:00Z',
      title: 'Test Session 1',
      content: 'Test content',
      attendingPlayers: ['player1'],
      extractedEntities: [],
      status: 'active',
      tags: []
    }
  ];

  const TestComponent = () => {
    const { notes, getNoteById } = useNotes();
    return (
      <div>
        <span data-testid="note-count">{notes.length}</span>
        <span data-testid="note-title">{getNoteById('test-note-1')?.title}</span>
      </div>
    );
  };

  test('provides note data to children', () => {
    const { getByTestId } = render(
      <NoteProvider>
        <TestComponent />
      </NoteProvider>
    );

    expect(getByTestId('note-count').textContent).toBe('1');
    expect(getByTestId('note-title').textContent).toBe('Test Session 1');
  });

  test('getNoteById returns correct note', () => {
    let contextValue;
    const TestComponent = () => {
      contextValue = useNotes();
      return null;
    };

    render(
      <NoteProvider>
        <TestComponent />
      </NoteProvider>
    );

    const note = contextValue.getNoteById('test-note-1');
    expect(note?.title).toBe('Test Session 1');
  });
});
```

### 3. NoteEditor Component Tests
Path: `src/components/features/notes/__tests__/NoteEditor.test.tsx`

```typescript
// src/components/features/notes/__tests__/NoteEditor.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import NoteEditor from '../NoteEditor';
import { useNotes } from '../../../../context/NoteContext';

jest.mock('../../../../context/NoteContext');

describe('NoteEditor', () => {
  const mockNote = {
    id: 'test-note',
    title: 'Test Session',
    content: 'Initial content',
    sessionNumber: 1,
    sessionDate: '2025-05-03'
  };

  const mockUpdateNoteContent = jest.fn();
  const mockGetNoteById = jest.fn(() => mockNote);

  beforeEach(() => {
    (useNotes as jest.Mock).mockReturnValue({
      getNoteById: mockGetNoteById,
      updateNoteContent: mockUpdateNoteContent
    });
  });

  test('renders note content', () => {
    const { getByText, getByRole } = render(<NoteEditor noteId="test-note" />);
    
    expect(getByText('Test Session')).toBeInTheDocument();
    expect(getByRole('textbox')).toHaveValue('Initial content');
  });

  test('debounces content updates', async () => {
    jest.useFakeTimers();
    
    const { getByRole } = render(<NoteEditor noteId="test-note" />);
    const textarea = getByRole('textbox');
    
    fireEvent.change(textarea, { target: { value: 'New content' } });
    
    // Should not call immediately
    expect(mockUpdateNoteContent).not.toHaveBeenCalled();
    
    // Fast-forward past debounce time
    jest.advanceTimersByTime(1000);
    
    expect(mockUpdateNoteContent).toHaveBeenCalledWith('test-note', 'New content');
    
    jest.useRealTimers();
  });

  test('handles read-only mode', () => {
    const { getByRole } = render(<NoteEditor noteId="test-note" readOnly={true} />);
    const textarea = getByRole('textbox');
    
    expect(textarea).toBeDisabled();
  });
});
```

## Integration Tests

### 1. Session Flow Tests
Path: `src/components/features/notes/__tests__/SessionFlow.test.tsx`

```typescript
// src/components/features/notes/__tests__/SessionFlow.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import SessionFlow from '../SessionFlow';
import { useSessionNote } from '../../../../hooks/useSessionNote';
import { useNotes } from '../../../../context/NoteContext';

jest.mock('../../../../hooks/useSessionNote');
jest.mock('../../../../context/NoteContext');

describe('SessionFlow', () => {
  const mockStartSession = jest.fn();
  const mockGetActiveNote = jest.fn();

  beforeEach(() => {
    (useSessionNote as jest.Mock).mockReturnValue({
      startSession: mockStartSession
    });
    
    (useNotes as jest.Mock).mockReturnValue({
      getActiveNote: mockGetActiveNote
    });
  });

  test('shows start button when no active session', () => {
    mockGetActiveNote.mockReturnValue(undefined);
    
    const { getByText } = render(<SessionFlow />);
    expect(getByText('Start New Session')).toBeInTheDocument();
  });

  test('shows active session when one exists', () => {
    const activeNote = {
      id: 'active-session',
      title: 'Session 5',
      sessionNumber: 5,
      sessionDate: '2025-05-03T19:00:00Z',
      status: 'active'
    };
    
    mockGetActiveNote.mockReturnValue(activeNote);
    
    const { getByText } = render(<SessionFlow />);
    expect(getByText('Session 5 in Progress')).toBeInTheDocument();
    expect(getByText('End Session')).toBeInTheDocument();
  });

  test('handles starting new session', async () => {
    mockGetActiveNote.mockReturnValue(undefined);
    
    const { getByText } = render(<SessionFlow />);
    
    fireEvent.click(getByText('Start New Session'));
    
    // Verify start session dialog appears
    await waitFor(() => {
      expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();
    });
  });
});
```

## End-to-End Test Scenarios

### E2E Test Coverage
Create comprehensive E2E tests for:

1. **Complete Session Workflow**
   - Start new session
   - Add notes during session
   - Extract entities
   - Convert entities to campaign elements
   - End session
   - Review session notes

2. **Note Relationship Management**
   - Create relationships between notes and entities
   - View related notes from entity pages
   - Navigate between related content

3. **Multi-User Session**
   - Multiple players adding notes
   - Concurrent entity extraction
   - Session completion workflow

## Performance Tests

### 1. OpenAI Integration Performance
```typescript
// src/services/openai/__tests__/performance.test.ts
import { extractEntitiesFromNote } from '../entityExtractor';

describe('OpenAI integration performance', () => {
  test('handles large text content efficiently', async () => {
    const largeContent = 'Lord Blackthorn met '.repeat(1000) + 
                      'Lady Silverleaf in the City of Waterdeep.';
    
    const startTime = Date.now();
    await extractEntitiesFromNote(largeContent);
    const endTime = Date.now();
    
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
  });
});
```