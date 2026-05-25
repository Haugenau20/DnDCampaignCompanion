// src/components/features/notes/__tests__/EntityExtractor.test.tsx
//
// Bug #350 (EntityExtractor infinite render loop) was fixed in commit ec8f3cb.
// The `existingReferences` default is now a module-level stable EMPTY_REFERENCES
// constant, so tests with referencesSearchComplete=true are fully safe to run.

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
const mockConvertEntity = jest.fn();

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
jest.mock('@/features/user-management', () => ({
  useCampaigns: jest.fn(() => ({ activeCampaignId: 'campaign-1' })),
  useAuth: jest.fn(() => ({ user: { uid: 'user-1' } })),
}));

const { useEntityExtractor } = require('../../../../hooks/useEntityExtractor');
const { useNotes } = require('../../../../context/NoteContext');
const { useNavigation } = require('../../../../hooks/useNavigation');

// Grab the DocumentService mock instance for per-test configuration
const DocumentService = require('../../../../services/firebase/data/DocumentService').default;

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
    convertEntity: mockConvertEntity,
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
    mockConvertEntity.mockResolvedValue('created-id-1');
    // Reset DocumentService mock to return empty collections by default
    DocumentService.getInstance().getCollection.mockResolvedValue([]);
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
  // Initial render with referencesSearchComplete=true
  // -------------------------------------------------------------------------
  describe('initial render (referencesSearchComplete=true)', () => {
    test('should render Smart Detection heading', () => {
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);
      expect(screen.getByText('Smart Detection')).toBeInTheDocument();
    });

    test('should render extract button (enabled)', () => {
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);
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

    test('should show empty state prompt when no extraction has been attempted', () => {
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);
      expect(
        screen.getByText(/click the search button/i)
      ).toBeInTheDocument();
    });

    test('should show auto-save note in empty state', () => {
      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);
      expect(
        screen.getByText(/saved automatically before analysis/i)
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Extraction flow — happy path
  // -------------------------------------------------------------------------
  describe('extraction flow', () => {
    test('should call extractWithOpenAI with note content on button click', async () => {
      const noteContent = 'B'.repeat(60);
      setupMocks({ note: makeNote({ content: noteContent }) });
      mockExtractWithOpenAI.mockResolvedValue([]);

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(mockExtractWithOpenAI).toHaveBeenCalledWith(noteContent);
    });

    test('should use getCurrentEditorContent when provided instead of note content', async () => {
      const editorContent = 'C'.repeat(80);
      const getCurrentEditorContent = jest.fn().mockReturnValue({ title: 'Test', content: editorContent });
      mockExtractWithOpenAI.mockResolvedValue([]);

      render(
        <EntityExtractor
          noteId="note-1"
          referencesSearchComplete={true}
          getCurrentEditorContent={getCurrentEditorContent}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(mockExtractWithOpenAI).toHaveBeenCalledWith(editorContent);
    });

    test('should call saveCurrentEditorContent BEFORE extractWithOpenAI', async () => {
      const callOrder: string[] = [];
      const saveCurrentEditorContent = jest.fn().mockImplementation(async () => {
        callOrder.push('save');
      });
      mockExtractWithOpenAI.mockImplementation(async () => {
        callOrder.push('extract');
        return [];
      });

      render(
        <EntityExtractor
          noteId="note-1"
          referencesSearchComplete={true}
          saveCurrentEditorContent={saveCurrentEditorContent}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(callOrder).toEqual(['save', 'extract']);
    });

    test('should show loading spinner during extraction', async () => {
      let resolveExtract: (val: ExtractedEntity[]) => void;
      const pendingExtract = new Promise<ExtractedEntity[]>(resolve => {
        resolveExtract = resolve;
      });
      mockExtractWithOpenAI.mockReturnValue(pendingExtract);

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      act(() => {
        // Use title attribute to uniquely identify the extract button
        fireEvent.click(screen.getByTitle(/analyze note/i));
      });

      // The extract button should be disabled while extracting
      await waitFor(() => {
        expect(screen.getByTitle(/analyze note/i)).toBeDisabled();
      });

      // Resolve to clean up
      act(() => { resolveExtract!([]); });
    });

    test('should show "Analyzing note content..." text during extraction', async () => {
      let resolveExtract: (val: ExtractedEntity[]) => void;
      const pendingExtract = new Promise<ExtractedEntity[]>(resolve => {
        resolveExtract = resolve;
      });
      mockExtractWithOpenAI.mockReturnValue(pendingExtract);

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      act(() => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(screen.getByText(/analyzing note content/i)).toBeInTheDocument();
      });

      act(() => { resolveExtract!([]); });
    });

    test('should show "Saving your work..." text when saveCurrentEditorContent is provided', async () => {
      let resolveSave: () => void;
      const pendingSave = new Promise<void>(resolve => { resolveSave = resolve; });
      const saveCurrentEditorContent = jest.fn().mockReturnValue(pendingSave);
      mockExtractWithOpenAI.mockResolvedValue([]);

      render(
        <EntityExtractor
          noteId="note-1"
          referencesSearchComplete={true}
          saveCurrentEditorContent={saveCurrentEditorContent}
        />
      );

      act(() => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(screen.getByText(/saving your work/i)).toBeInTheDocument();
      });

      act(() => { resolveSave!(); });
    });

    test('should display extracted entities after successful extraction', async () => {
      const entity = makeEntity({ text: 'Gandalf the Grey', type: 'npc', confidence: 0.95 });
      mockExtractWithOpenAI.mockResolvedValue([entity]);

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(screen.getByText('Gandalf the Grey')).toBeInTheDocument();
      });
    });

    test('should show "Found in Your Note" heading when entities are extracted', async () => {
      const entity = makeEntity({ text: 'Rivendell', type: 'location' });
      mockExtractWithOpenAI.mockResolvedValue([entity]);

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(screen.getByText('Found in Your Note')).toBeInTheDocument();
      });
    });

    test('should show "No New Content Found" when extraction returns empty results', async () => {
      mockExtractWithOpenAI.mockResolvedValue([]);

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(screen.getByText('No New Content Found')).toBeInTheDocument();
      });
    });

    test('should clear prior results before a re-extraction', async () => {
      const entity1 = makeEntity({ text: 'OldEntity', type: 'npc' });
      const entity2 = makeEntity({ text: 'NewEntity', type: 'location' });

      // First extraction returns entity1
      mockExtractWithOpenAI.mockResolvedValueOnce([entity1]);

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      await act(async () => {
        fireEvent.click(screen.getByTitle(/analyze note/i));
      });

      await waitFor(() => {
        expect(screen.getByText('OldEntity')).toBeInTheDocument();
      });

      // Second extraction returns entity2 only
      mockExtractWithOpenAI.mockResolvedValueOnce([entity2]);

      await act(async () => {
        fireEvent.click(screen.getByTitle(/analyze note/i));
      });

      await waitFor(() => {
        expect(screen.getByText('NewEntity')).toBeInTheDocument();
      });

      expect(screen.queryByText('OldEntity')).not.toBeInTheDocument();
    });

    test('should deduplicate entities with same text and type before display', async () => {
      // Use distinct texts to make deduplication observable via entity count
      const entity1 = makeEntity({ id: 'ent-1', text: 'Merlin', type: 'npc', confidence: 0.7 });
      const entity2 = makeEntity({ id: 'ent-2', text: 'Merlin', type: 'npc', confidence: 0.9 });
      const entity3 = makeEntity({ id: 'ent-3', text: 'Camelot', type: 'location', confidence: 0.8 });
      // entity1 and entity2 are duplicates; entity3 is unique
      mockExtractWithOpenAI.mockResolvedValue([entity1, entity2, entity3]);

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      await act(async () => {
        fireEvent.click(screen.getByTitle(/analyze note/i));
      });

      await waitFor(() => {
        // 'Merlin' should appear exactly once (deduped)
        expect(screen.getByText('Merlin')).toBeInTheDocument();
        // 'Camelot' should also be present (unique entity)
        expect(screen.getByText('Camelot')).toBeInTheDocument();
      });

      // Confirm only one 'Merlin' element in the DOM
      expect(screen.getAllByText('Merlin')).toHaveLength(1);
    });

    test('should show filtered-out count when items were filtered', async () => {
      // Return an entity that matches an existing campaign element so filterNewEntities removes it
      const entity = makeEntity({ text: 'Smaug', type: 'npc', confidence: 0.9 });
      mockExtractWithOpenAI.mockResolvedValue([entity]);

      // Make DocumentService return a matching NPC
      DocumentService.getInstance().getCollection.mockImplementation(async (collection: string) => {
        if (collection === 'npcs') return [{ id: 'npc-existing', name: 'Smaug' }];
        return [];
      });

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(screen.getByText(/existing/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  describe('error handling', () => {
    test('should show error message when extraction throws', async () => {
      mockExtractWithOpenAI.mockRejectedValue(new Error('Network error'));

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    test('should show error when note content is too short', async () => {
      setupMocks({ note: makeNote({ content: 'Short' }) });

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(
          screen.getByText(/too short for analysis/i)
        ).toBeInTheDocument();
      });
    });

    test('should show error when note is not found', async () => {
      stableGetNoteById.mockReturnValue(undefined);

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(screen.getByText(/note not found/i)).toBeInTheDocument();
      });
    });

    test('should show error message when saveCurrentEditorContent fails', async () => {
      const saveCurrentEditorContent = jest.fn().mockRejectedValue(new Error('Save failed'));

      render(
        <EntityExtractor
          noteId="note-1"
          referencesSearchComplete={true}
          saveCurrentEditorContent={saveCurrentEditorContent}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(
          screen.getByText(/failed to save your work before analysis/i)
        ).toBeInTheDocument();
      });
    });

    test('should not call extractWithOpenAI when save fails', async () => {
      const saveCurrentEditorContent = jest.fn().mockRejectedValue(new Error('Save failed'));

      render(
        <EntityExtractor
          noteId="note-1"
          referencesSearchComplete={true}
          saveCurrentEditorContent={saveCurrentEditorContent}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(mockExtractWithOpenAI).not.toHaveBeenCalled();
    });

    test('should not show error when hookError exists but isUsageLimitExceeded is true', () => {
      setupMocks({
        note: makeNote(),
        hookError: 'Some error',
        isUsageLimitExceeded: true,
        contactInfo: {
          message: 'Limit.',
          contactUrl: '/contact',
          prefilledSubject: 'Increase',
        },
      });

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      // Error container should not appear when usage limit is exceeded
      expect(screen.queryByText('Some error')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Usage limit path
  // -------------------------------------------------------------------------
  describe('usage limit exceeded', () => {
    test('should not show inline error text when only usage limit is exceeded', () => {
      setupMocks({
        note: makeNote(),
        isUsageLimitExceeded: true,
        hookError: 'Some hook error',
        contactInfo: { message: 'Limit.', contactUrl: '/contact', prefilledSubject: 'Subject' },
      });

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      // Usage limit block should be visible
      expect(screen.getByText('Usage Limit Reached')).toBeInTheDocument();
      // The per-component error container should NOT show when limit is exceeded
      // (even if hookError is set, the component suppresses the error display)
      expect(screen.queryByText('Some hook error')).not.toBeInTheDocument();
    });

    test('should navigate with pre-filled subject when requesting limit increase', () => {
      setupMocks({
        note: makeNote(),
        isUsageLimitExceeded: true,
        contactInfo: {
          message: 'Limit.',
          contactUrl: '/contact',
          prefilledSubject: 'Increase My Limit',
        },
      });

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);
      fireEvent.click(screen.getByRole('button', { name: /request limit increase/i }));

      expect(mockNavigateToPage).toHaveBeenCalledWith(
        expect.stringContaining('Increase+My+Limit')
      );
    });
  });

  // -------------------------------------------------------------------------
  // Entity conversion via EntityCard
  // -------------------------------------------------------------------------
  describe('entity conversion', () => {
    test('should render EntityCard for each extracted entity', async () => {
      const entities = [
        makeEntity({ id: 'ent-a', text: 'Frodo', type: 'npc' }),
        makeEntity({ id: 'ent-b', text: 'The Shire', type: 'location' }),
      ];
      mockExtractWithOpenAI.mockResolvedValue(entities);

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(screen.getByText('Frodo')).toBeInTheDocument();
        expect(screen.getByText('The Shire')).toBeInTheDocument();
      });
    });

    test('should call onEntityConverted callback after conversion', async () => {
      const onEntityConverted = jest.fn();
      const entity = makeEntity({ id: 'ent-x', text: 'Sauron', type: 'npc' });
      mockExtractWithOpenAI.mockResolvedValue([entity]);
      mockConvertEntity.mockResolvedValue('created-npc-99');

      render(
        <EntityExtractor
          noteId="note-1"
          referencesSearchComplete={true}
          onEntityConverted={onEntityConverted}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      // Wait for entities to appear
      await waitFor(() => {
        expect(screen.getByText('Sauron')).toBeInTheDocument();
      });

      // Click the convert (+) button on the EntityCard
      const convertButtons = screen.getAllByRole('button');
      // The last button should be the EntityCard's add button (the extract button is first)
      const addButton = convertButtons.find(btn => btn !== convertButtons[0]);
      if (addButton) {
        await act(async () => {
          fireEvent.click(addButton);
        });
      }

      await waitFor(() => {
        expect(onEntityConverted).toHaveBeenCalledWith('ent-x', 'created-npc-99');
      });
    });
  });

  // -------------------------------------------------------------------------
  // useEffect: loading existing entities from note
  // -------------------------------------------------------------------------
  describe('loading existing entities from note', () => {
    test('should display previously converted entities from note on load', async () => {
      const convertedEntity = makeEntity({
        id: 'conv-1',
        text: 'Aragorn',
        type: 'npc',
        isConverted: true,
        convertedToId: 'npc-999',
      });

      setupMocks({
        note: makeNote({ extractedEntities: [convertedEntity] }),
      });

      render(<EntityExtractor noteId="note-1" referencesSearchComplete={true} />);

      await waitFor(() => {
        expect(screen.getByText('Aragorn')).toBeInTheDocument();
      });
    });

    test('should filter out unconverted entities that match existing references', async () => {
      const unconvertedEntity = makeEntity({
        id: 'unc-1',
        text: 'Legolas',
        type: 'npc',
        isConverted: false,
      });

      const existingReference = {
        id: 'ref-1',
        type: 'npc' as const,
        title: 'Legolas',
        matchingText: ['Legolas'],
      };

      setupMocks({
        note: makeNote({ extractedEntities: [unconvertedEntity] }),
      });

      render(
        <EntityExtractor
          noteId="note-1"
          referencesSearchComplete={true}
          existingReferences={[existingReference]}
        />
      );

      // The entity matches an existing reference, so it should be filtered out
      await waitFor(() => {
        expect(screen.queryByText('Legolas')).not.toBeInTheDocument();
      });
    });

    test('should keep converted entities even when they match existing references', async () => {
      const convertedEntity = makeEntity({
        id: 'conv-2',
        text: 'Gimli',
        type: 'npc',
        isConverted: true,
        convertedToId: 'npc-gimli',
      });

      const existingReference = {
        id: 'ref-2',
        type: 'npc' as const,
        title: 'Gimli',
        matchingText: ['Gimli'],
      };

      setupMocks({
        note: makeNote({ extractedEntities: [convertedEntity] }),
      });

      render(
        <EntityExtractor
          noteId="note-1"
          referencesSearchComplete={true}
          existingReferences={[existingReference]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Gimli')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Content validation (synchronous)
  // -------------------------------------------------------------------------
  describe('content validation on extract', () => {
    test('should show error when editor content is too short', async () => {
      const getCurrentEditorContent = jest.fn().mockReturnValue({ title: 'T', content: 'short' });

      render(
        <EntityExtractor
          noteId="note-1"
          referencesSearchComplete={true}
          getCurrentEditorContent={getCurrentEditorContent}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(screen.getByText(/too short for analysis/i)).toBeInTheDocument();
      });
    });
  });
});
