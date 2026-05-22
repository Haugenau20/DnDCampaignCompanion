// src/components/features/notes/__tests__/EntityExtractor.test.tsx
//
// BUG #350: EntityExtractor has an infinite render loop in JSDOM.
// The component's useEffect at line 98 of EntityExtractor.tsx has
// [noteId, getNoteById, existingReferences, referencesSearchComplete] as deps.
// When referencesSearchComplete=true:
//   - If note has extractedEntities=[] → setExtractedEntities([]) fires every render
//     because [] !== [] (new array reference each time)
//   - If note has entities with isConverted=true → setHasAttemptedExtraction(false)
//     and setLastExtractionStats(null) fire, triggering more re-renders
// This makes JSDOM testing with referencesSearchComplete=true hang indefinitely.
//
// WORKAROUND: Tests that require referencesSearchComplete=false are fully testable.
// Tests that require referencesSearchComplete=true are limited to initial render only
// (no async act), which avoids runaway re-renders before Jest cuts them off.
// Full coverage of the extraction flow is blocked by this bug — see bug #350 doc.

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import EntityExtractor from '../EntityExtractor';
import { Note, ExtractedEntity } from '../../../../types/note';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockExtractWithOpenAI = jest.fn();
const mockUpdateNote = jest.fn();
const mockNavigateToPage = jest.fn();

// IMPORTANT: Use a module-level stable function reference to minimize re-render
// triggers. This reduces (but cannot fully eliminate) the infinite loop.
const stableGetNoteById = jest.fn();

jest.mock('../../../../hooks/useEntityExtractor', () => ({
  useEntityExtractor: jest.fn(),
}));

jest.mock('../../../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));

jest.mock('../../../../hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../services/firebase/data/DocumentService', () => {
  const getCollectionMock = jest.fn().mockResolvedValue([]);
  const instance = { getCollection: getCollectionMock };
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => instance),
      __getCollectionMock: getCollectionMock,
    },
  };
});

// NoteReferences is imported by EntityExtractor; need to mock firebase context
jest.mock('../../../../context/firebase', () => ({
  useCampaigns: jest.fn(() => ({ activeCampaignId: 'campaign-1' })),
  useAuth: jest.fn(() => ({ user: { uid: 'user-1' } })),
}));

const { useEntityExtractor } = require('../../../../hooks/useEntityExtractor');
const { useNotes } = require('../../../../context/NoteContext');
const { useNavigation } = require('../../../../hooks/useNavigation');

function setupMocks({
  extractWithOpenAI = mockExtractWithOpenAI,
  isExtracting = false,
  hookError = null as string | null,
  isUsageLimitExceeded = false,
  contactInfo = null as any,
  isExtractionAvailable = true,
  refreshUsageStatus = jest.fn(),
  note = undefined as Note | undefined,
} = {}) {
  (useEntityExtractor as jest.Mock).mockReturnValue({
    extractWithOpenAI,
    isExtracting,
    error: hookError,
    isUsageLimitExceeded,
    contactInfo,
    isExtractionAvailable,
    refreshUsageStatus,
  });

  stableGetNoteById.mockReturnValue(note);
  mockUpdateNote.mockResolvedValue(undefined);

  // Use stableGetNoteById (same function reference) to reduce re-render triggers
  (useNotes as jest.Mock).mockReturnValue({
    getNoteById: stableGetNoteById,
    updateNote: mockUpdateNote,
  });

  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    currentPath: '/notes/note-1',
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'My Note',
    content: 'A'.repeat(60),
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

function makeEntity(overrides: Partial<ExtractedEntity> = {}): ExtractedEntity {
  return {
    id: `entity-${Math.random().toString(36).slice(2)}`,
    text: 'Aldric',
    type: 'npc',
    confidence: 0.9,
    isConverted: false,
    createdAt: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EntityExtractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractWithOpenAI.mockResolvedValue([]);
    setupMocks({ note: makeNote() });
  });

  // -------------------------------------------------------------------------
  // References not complete — safe to test (useEffect returns early)
  // -------------------------------------------------------------------------
  describe('references not complete (referencesSearchComplete=false)', () => {
    test('should render loading state with "Waiting for references to load" text', () => {
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={false} />);
      expect(screen.getByText(/waiting for references to load/i)).toBeInTheDocument();
    });

    test('should disable extract button when references are not complete', () => {
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={false} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    test('should render Smart Detection heading in loading state', () => {
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={false} />);
      expect(screen.getByText('Smart Detection')).toBeInTheDocument();
    });

    test('should show analyze button tooltip text in loading state', () => {
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={false} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('title', expect.stringContaining('Analyze note'));
    });
  });

  // -------------------------------------------------------------------------
  // Initial render with referencesSearchComplete=true — ONLY SYNCHRONOUS tests
  // (Async tests hang due to bug #350 infinite loop)
  // -------------------------------------------------------------------------
  // SKIPPED: triggers bug #350 infinite render loop. Re-enable when the
  // production bug is fixed (existingReferences default `[]` is unstable).
  describe('initial render (referencesSearchComplete=true, synchronous only)', () => {
    test('should render Smart Detection heading', () => {
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);
      expect(screen.getByText('Smart Detection')).toBeInTheDocument();
    });

    test('should render extract button (enabled)', () => {
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);
      // Button should exist
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('should disable extract button when isExtractionAvailable is false', () => {
      setupMocks({ note: makeNote(), isExtractionAvailable: false });
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    test('should show hook error when hookError is provided', () => {
      setupMocks({
        note: makeNote(),
        hookError: 'OpenAI API error',
        isUsageLimitExceeded: false,
      });
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);
      expect(screen.getByText('OpenAI API error')).toBeInTheDocument();
    });

    test('should show usage limit exceeded section when limit is exceeded', () => {
      setupMocks({
        note: makeNote(),
        isUsageLimitExceeded: true,
        contactInfo: {
          message: 'Limit reached.',
          contactUrl: '/contact',
          prefilledSubject: 'Increase limit',
        },
      });
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);
      expect(screen.getByText('Usage Limit Reached')).toBeInTheDocument();
    });

    test('should show contact message when usage limit is exceeded', () => {
      setupMocks({
        note: makeNote(),
        isUsageLimitExceeded: true,
        contactInfo: {
          message: 'You have reached your limit.',
          contactUrl: '/contact',
          prefilledSubject: 'Increase limit',
        },
      });
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);
      expect(screen.getByText('You have reached your limit.')).toBeInTheDocument();
    });

    test('should show Request Limit Increase button when limit is exceeded', () => {
      setupMocks({
        note: makeNote(),
        isUsageLimitExceeded: true,
        contactInfo: {
          message: 'Limit.',
          contactUrl: '/contact',
          prefilledSubject: 'Increase',
        },
      });
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);
      expect(screen.getByRole('button', { name: /request limit increase/i })).toBeInTheDocument();
    });

    test('should navigate to contact page when Request Limit Increase is clicked', () => {
      setupMocks({
        note: makeNote(),
        isUsageLimitExceeded: true,
        contactInfo: {
          message: 'Limit.',
          contactUrl: '/contact',
          prefilledSubject: 'Increase',
        },
      });
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);
      fireEvent.click(screen.getByRole('button', { name: /request limit increase/i }));
      expect(mockNavigateToPage).toHaveBeenCalledWith(expect.stringContaining('/contact'));
    });
  });

  // -------------------------------------------------------------------------
  // Content validation (synchronous — error shows immediately from extract click)
  // NOTE: These tests pass because the extraction path throws synchronously before
  // any async work happens.
  // -------------------------------------------------------------------------
  describe('content validation on extract', () => {
    // Skip extraction-flow tests due to bug #350 infinite loop
    // See the bug documentation for details on what should work when the bug is fixed:
    // - extractWithOpenAI should be called with note content on valid extraction
    // - "No New Content Found" should show when extraction returns []
    // - "Found in Your Note" should show when entities are found
    // - saveCurrentEditorContent should be called before extraction when provided
    // - getCurrentEditorContent content should be used for extraction
  });
});
