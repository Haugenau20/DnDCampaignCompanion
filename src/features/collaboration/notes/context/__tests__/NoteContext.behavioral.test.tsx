// src/features/collaboration/notes/context/__tests__/NoteContext.behavioral.test.tsx
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { NoteProvider, useNotes } from '../NoteContext';
import { Note, ExtractedEntity, EntityType, NoteStatus } from '../../types';

// Mock Firebase dependencies (NOT the context being tested)
const mockUseAuth = jest.fn();
const mockUseGroups = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseUser = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useGroups: () => mockUseGroups(),
  useCampaigns: () => mockUseCampaigns(),
  useUser: () => mockUseUser()
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock DocumentService
const mockDocumentService = {
  getCollection: jest.fn(),
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
  updateDocumentWithAttribution: jest.fn(),
  deleteDocument: jest.fn()
};

jest.mock('core/services/firebase/data/DocumentService', () => ({
  __esModule: true,
  default: {
    getInstance: () => mockDocumentService
  }
}));

// Mock user utilities
jest.mock('core/utils/user-utils', () => ({
  getUserName: jest.fn(),
  getActiveCharacterName: jest.fn()
}));

const { getUserName, getActiveCharacterName } = require('core/utils/user-utils');

describe('NoteContext Behavioral Tests', () => {
  // Test component to access context
  const TestComponent = ({ onRender }: { onRender?: (context: any) => void }) => {
    const context = useNotes();
    React.useEffect(() => {
      if (onRender) onRender(context);
    }, [context, onRender]);
    return <div data-testid="test-component">Test</div>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock returns
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' }
    });
    mockUseGroups.mockReturnValue({
      activeGroupId: 'test-group'
    });
    mockUseCampaigns.mockReturnValue({
      activeCampaignId: 'test-campaign'
    });
    mockUseUser.mockReturnValue({
      userProfile: { id: 'test-user', name: 'Test User' },
      activeGroupUserProfile: {
        userId: 'test-user',
        username: 'Test User',
        role: 'member',
        joinedAt: '2025-06-15T00:00:00.000Z',
        activeCharacterId: 'char-1',
        characters: [
          { id: 'char-1', name: 'Test Character' }
        ]
      }
    });

    getUserName.mockReturnValue('Test User');
    getActiveCharacterName.mockReturnValue('Test Character');

    // Default empty collection
    mockDocumentService.getCollection.mockResolvedValue([]);
  });

  describe('Authentication Requirements', () => {
    test('should throw error when creating note without authentication', async () => {
      mockUseAuth.mockReturnValue({ user: null });

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      await act(async () => {
        await expect(capturedContext.createNote('Test Title', 'Test Content'))
          .rejects.toThrow('User not authenticated or no active group');
      });
    });

    test('should throw error when creating note without active group', async () => {
      mockUseGroups.mockReturnValue({ activeGroupId: null });

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      await act(async () => {
        await expect(capturedContext.createNote('Test Title', 'Test Content'))
          .rejects.toThrow('User not authenticated or no active group');
      });
    });

    test('should throw error when creating note without active campaign', async () => {
      mockUseCampaigns.mockReturnValue({ activeCampaignId: null });

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      await act(async () => {
        await expect(capturedContext.createNote('Test Title', 'Test Content'))
          .rejects.toThrow('No active campaign selected. Please select a campaign before creating notes.');
      });
    });
  });

  describe('Note Creation (createNote)', () => {
    test('should create note with sequential ID and metadata', async () => {
      // NOTE: The mount-time fetchNotes() call is asynchronous (mocked
      // getCollection resolves on a later microtask). If we act on the
      // context before that initial fetch settles, fetchNotes' own
      // setNotes(sortedNotes) call resolves afterwards and silently
      // overwrites whatever createNote() just added. Waiting for
      // isLoading to go false first avoids that race -- see the bug
      // report on this test suite's diagnosis for detail.
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        const noteId = await capturedContext.createNote('Test Note', 'Test content here');
        expect(noteId).toBe('note-1');
      });

      // Verify note was added to local state
      expect(capturedContext.notes).toHaveLength(1);
      expect(capturedContext.notes[0]).toMatchObject({
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content here',
        status: 'active',
        campaignId: 'test-campaign',
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        createdByCharacterName: 'Test Character',
        isUnsaved: true
      });
    });

    test('should generate sequential note IDs', async () => {
      // Mock existing notes to test sequence
      const existingNotes: Note[] = [
        {
          id: 'note-3',
          title: 'Existing Note',
          content: 'Existing content',
          extractedEntities: [],
          status: 'active' as NoteStatus,
          tags: [],
          updatedAt: '2025-06-15T00:00:00.000Z',
          campaignId: 'test-campaign',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          createdByCharacterName: 'Test Character',
          dateAdded: '2025-06-15T00:00:00.000Z',
          dateModified: '2025-06-15T00:00:00.000Z',
          modifiedBy: 'test-user',
          modifiedByUsername: 'Test User',
          modifiedByCharacterName: 'Test Character'
        }
      ];
      mockDocumentService.getCollection.mockResolvedValue(existingNotes);

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      // Wait for the mocked existing notes to actually land in state before
      // generating the next sequential ID off of them.
      await waitFor(() => {
        expect(capturedContext.notes).toHaveLength(1);
      });

      await act(async () => {
        const noteId = await capturedContext.createNote('New Note', 'New content');
        expect(noteId).toBe('note-4'); // Should be next in sequence
      });
    });

    test('should include required BaseContent fields', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });

      const note = capturedContext.notes[0];
      expect(note).toHaveProperty('dateAdded');
      expect(note).toHaveProperty('dateModified');
      expect(note).toHaveProperty('createdBy', 'test-user');
      expect(note).toHaveProperty('createdByUsername', 'Test User');
      expect(note).toHaveProperty('createdByCharacterName', 'Test Character');
      expect(note).toHaveProperty('modifiedBy', 'test-user');
      expect(note).toHaveProperty('modifiedByUsername', 'Test User');
      expect(note).toHaveProperty('modifiedByCharacterName', 'Test Character');
    });
  });

  describe('Note Saving (saveNote)', () => {
    test('should save unsaved note to Firebase', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      // createNote and saveNote are split into separate act() calls: saveNote
      // reads the just-created note via getNoteById, which is a useCallback
      // closed over `notes` from the last committed render. If both calls
      // happen inside the same act() with no render in between, saveNote
      // still sees the pre-createNote (empty) `notes` and throws "Note not
      // found" -- a stale-closure timing issue, not a behavior under test.
      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });
      await act(async () => {
        await capturedContext.saveNote('note-1');
      });

      // Verify Firebase createDocument was called
      expect(mockDocumentService.createDocument).toHaveBeenCalledWith(
        'groups/test-group/users/test-user/notes',
        expect.objectContaining({
          id: 'note-1',
          title: 'Test Note',
          content: 'Test content'
        }),
        'note-1'
      );

      // Verify isUnsaved flag was removed locally
      expect(capturedContext.notes[0].isUnsaved).toBe(false);
    });

    test('should update existing saved note in Firebase', async () => {
      // Start with a saved note
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });
      await act(async () => {
        await capturedContext.saveNote('note-1'); // Save it first
      });
      jest.clearAllMocks();

      // Now update it
      await act(async () => {
        await capturedContext.saveNote('note-1', { title: 'Updated Title' });
      });

      // Verify the update reached Firebase through the attribution-aware write.
      // This assertion previously named updateDocument; saveNote's update branch
      // was deliberately moved onto updateDocumentWithAttribution so that note
      // edits get attribution from the same single write path as every other
      // content type. The old assertion encoded the superseded contract.
      expect(mockDocumentService.updateDocumentWithAttribution).toHaveBeenCalledWith(
        'groups/test-group/users/test-user/notes',
        'note-1',
        expect.objectContaining({
          title: 'Updated Title'
        })
      );
    });

    test('should route updates to an already-saved note through updateDocumentWithAttribution, preserving updatedAt and the caller\'s updates', async () => {
      // Seed an already-saved note via the initial fetch, rather than via
      // createNote()+saveNote() in the same act(), to avoid the pre-existing,
      // unrelated stale-closure bug where getNoteById can't see a note
      // created moments earlier in the same act() callback.
      const existingNote: Note = {
        id: 'note-42',
        title: 'Existing Note',
        content: 'Original content',
        extractedEntities: [],
        status: 'active' as NoteStatus,
        tags: [],
        updatedAt: '2025-06-01T00:00:00.000Z',
        campaignId: 'test-campaign',
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        createdByCharacterName: 'Test Character',
        dateAdded: '2025-06-01T00:00:00.000Z',
        dateModified: '2025-06-01T00:00:00.000Z',
        modifiedBy: 'test-user',
        modifiedByUsername: 'Test User',
        modifiedByCharacterName: 'Test Character'
      };
      mockDocumentService.getCollection.mockResolvedValue([existingNote]);

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      // The initial fetch that populates `notes` (and therefore what
      // getNoteById can see) resolves asynchronously; wait for it to land
      // before acting, rather than assuming it beat the next statement.
      await waitFor(() => {
        expect(capturedContext.notes).toHaveLength(1);
      });

      await act(async () => {
        await capturedContext.saveNote('note-42', { title: 'Updated Title', tags: ['lore'] });
      });

      // BEHAVIOR: Updating an already-saved note must go through the
      // attribution-aware updateDocumentWithAttribution (the same single
      // write path createDocument already uses for new notes), while still
      // sending updatedAt -- a Note-specific field, not attribution -- and
      // the caller's own ...updates.
      expect(mockDocumentService.updateDocumentWithAttribution).toHaveBeenCalledWith(
        'groups/test-group/users/test-user/notes',
        'note-42',
        expect.objectContaining({
          title: 'Updated Title',
          tags: ['lore'],
          updatedAt: expect.any(String)
        })
      );
      expect(mockDocumentService.updateDocument).not.toHaveBeenCalled();
    });

    test('should throw error when saving note without authentication', async () => {
      mockUseAuth.mockReturnValue({ user: null });

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(capturedContext.saveNote('note-1'))
          .rejects.toThrow('User not authenticated or no active group');
      });
    });

    test('should throw error when saving nonexistent note', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(capturedContext.saveNote('nonexistent-note'))
          .rejects.toThrow('Note not found');
      });
    });
  });

  describe('Note Updates (updateNote)', () => {
    test('should update unsaved note locally only', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });
      await act(async () => {
        await capturedContext.updateNote('note-1', { title: 'Updated Title' });
      });

      // Should update locally but not call Firebase
      expect(capturedContext.notes[0].title).toBe('Updated Title');
      expect(capturedContext.notes[0].isUnsaved).toBe(true);
      expect(mockDocumentService.updateDocument).not.toHaveBeenCalled();
    });

    test('should save updates to Firebase for saved notes', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });
      await act(async () => {
        await capturedContext.saveNote('note-1'); // Save it first
      });
      jest.clearAllMocks();

      await act(async () => {
        await capturedContext.updateNote('note-1', { title: 'Updated Title' });
      });

      // Should call saveNote internally, which routes an already-saved note
      // through the attribution-aware updateDocumentWithAttribution. This
      // assertion previously named updateDocument, the pre-refactor contract.
      expect(mockDocumentService.updateDocumentWithAttribution).toHaveBeenCalled();
    });

    test('should throw error when updating nonexistent note', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(capturedContext.updateNote('nonexistent-note', { title: 'New Title' }))
          .rejects.toThrow('Note not found');
      });
    });
  });

  describe('Entity Conversion (convertEntity)', () => {
    const mockEntity: ExtractedEntity = {
      id: 'entity-1',
      text: 'Galadriel the Wise',
      type: 'npc' as EntityType,
      confidence: 0.9,
      isConverted: false,
      createdAt: '2025-06-15T00:00:00.000Z',
      extraData: {
        name: 'Galadriel',
        title: 'the Wise',
        race: 'Elf'
      }
    };

    test('should navigate to NPC creation with entity data', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });
      await act(async () => {
        // Add entity to note
        await capturedContext.updateNote('note-1', {
          extractedEntities: [mockEntity]
        });
      });
      await act(async () => {
        const result = await capturedContext.convertEntity('note-1', 'entity-1', 'npc');
        expect(result).toBe(''); // Returns empty string for navigation
      });

      expect(mockNavigate).toHaveBeenCalledWith('/npcs/create', {
        state: {
          initialData: expect.objectContaining({
            name: 'Galadriel',
            title: 'the Wise',
            race: 'Elf'
          }),
          noteId: 'note-1',
          entityId: 'entity-1'
        }
      });
    });

    test('should navigate to location creation with entity data', async () => {
      const locationEntity: ExtractedEntity = {
        ...mockEntity,
        type: 'location',
        extraData: {
          name: 'Waterdeep',
          locationType: 'city',
          description: 'A great trading city'
        }
      };

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });
      await act(async () => {
        await capturedContext.updateNote('note-1', {
          extractedEntities: [locationEntity]
        });
      });
      await act(async () => {
        await capturedContext.convertEntity('note-1', 'entity-1', 'location');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/locations/create', {
        state: {
          initialData: expect.objectContaining({
            name: 'Waterdeep',
            type: 'city'
          }),
          noteId: 'note-1',
          entityId: 'entity-1'
        }
      });
    });

    test('should navigate to quest creation with entity data', async () => {
      const questEntity: ExtractedEntity = {
        ...mockEntity,
        type: 'quest',
        extraData: {
          title: 'Find the Lost Treasure',
          objectives: ['Search the cave', 'Defeat the guardian'],
          relatedNPCIds: ['npc-1', 'npc-2']
        }
      };

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });
      await act(async () => {
        await capturedContext.updateNote('note-1', {
          extractedEntities: [questEntity]
        });
      });
      await act(async () => {
        await capturedContext.convertEntity('note-1', 'entity-1', 'quest');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/quests/create', {
        state: {
          initialData: expect.objectContaining({
            title: 'Find the Lost Treasure',
            objectives: ['Search the cave', 'Defeat the guardian'],
            relatedNPCIds: ['npc-1', 'npc-2']
          }),
          noteId: 'note-1',
          entityId: 'entity-1'
        }
      });
    });

    test('should navigate to rumor creation with entity data', async () => {
      const rumorEntity: ExtractedEntity = {
        ...mockEntity,
        type: 'rumor',
        extraData: {
          title: 'Strange Lights in the Forest',
          content: 'Travelers report seeing strange lights',
          sourceType: 'traveler',
          status: 'unconfirmed'
        }
      };

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });
      await act(async () => {
        await capturedContext.updateNote('note-1', {
          extractedEntities: [rumorEntity]
        });
      });
      await act(async () => {
        await capturedContext.convertEntity('note-1', 'entity-1', 'rumor');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/rumors/create', {
        state: {
          initialData: expect.objectContaining({
            title: 'Strange Lights in the Forest',
            content: 'Travelers report seeing strange lights',
            sourceType: 'traveler'
          }),
          noteId: 'note-1',
          entityId: 'entity-1'
        }
      });
    });

    test('should throw error when converting entity from nonexistent note', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(capturedContext.convertEntity('nonexistent-note', 'entity-1', 'npc'))
          .rejects.toThrow('Note not found');
      });
    });

    test('should throw error when converting nonexistent entity', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });
      await act(async () => {
        await expect(capturedContext.convertEntity('note-1', 'nonexistent-entity', 'npc'))
          .rejects.toThrow('Entity not found');
      });
    });
  });

  describe('Entity Conversion Marking (markEntityAsConverted)', () => {
    test('should mark entity as converted with created ID', async () => {
      const mockEntity: ExtractedEntity = {
        id: 'entity-1',
        text: 'Galadriel the Wise',
        type: 'npc',
        confidence: 0.9,
        isConverted: false,
        createdAt: '2025-06-15T00:00:00.000Z'
      };

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });
      await act(async () => {
        await capturedContext.updateNote('note-1', {
          extractedEntities: [mockEntity]
        });
      });
      await act(async () => {
        await capturedContext.markEntityAsConverted('note-1', 'entity-1', 'galadriel-the-wise');
      });

      const updatedNote = capturedContext.notes[0];
      const updatedEntity = updatedNote.extractedEntities[0];
      expect(updatedEntity.isConverted).toBe(true);
      expect(updatedEntity.convertedToId).toBe('galadriel-the-wise');
    });

    test('should throw error when marking entity in nonexistent note', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(capturedContext.markEntityAsConverted('nonexistent-note', 'entity-1', 'created-id'))
          .rejects.toThrow('Note not found');
      });
    });
  });

  describe('Note Retrieval (getNoteById)', () => {
    test('should retrieve note by ID', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });

      const note = capturedContext.getNoteById('note-1');
      expect(note).toBeDefined();
      expect(note?.title).toBe('Test Note');
    });

    test('should return undefined for nonexistent note', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      const note = capturedContext.getNoteById('nonexistent-note');
      expect(note).toBeUndefined();
    });
  });

  describe('Note Archiving (archiveNote)', () => {
    test('should archive note by setting status', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });
      await act(async () => {
        await capturedContext.archiveNote('note-1');
      });

      const note = capturedContext.notes[0];
      expect(note.status).toBe('archived');
    });
  });

  describe('Note Deletion (deleteNote)', () => {
    test('should delete note from Firebase and refresh list', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });
      await act(async () => {
        await capturedContext.saveNote('note-1'); // Save it first
      });
      await act(async () => {
        await capturedContext.deleteNote('note-1');
      });

      expect(mockDocumentService.deleteDocument).toHaveBeenCalledWith(
        'groups/test-group/users/test-user/notes',
        'note-1'
      );
      expect(mockDocumentService.getCollection).toHaveBeenCalledTimes(2); // Initial fetch + refresh
    });

    test('should throw error when deleting without authentication', async () => {
      mockUseAuth.mockReturnValue({ user: null });

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(capturedContext.deleteNote('note-1'))
          .rejects.toThrow('User not authenticated or no active group');
      });
    });
  });

  describe('Data Loading and Filtering', () => {
    test('should filter notes by active campaign ID', async () => {
      const mockNotes: Note[] = [
        {
          id: 'note-1',
          title: 'Campaign 1 Note',
          content: 'Content',
          extractedEntities: [],
          status: 'active' as NoteStatus,
          tags: [],
          updatedAt: '2025-06-15T00:00:00.000Z',
          campaignId: 'test-campaign',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          createdByCharacterName: 'Test Character',
          dateAdded: '2025-06-15T00:00:00.000Z',
          dateModified: '2025-06-15T00:00:00.000Z',
          modifiedBy: 'test-user',
          modifiedByUsername: 'Test User',
          modifiedByCharacterName: 'Test Character'
        },
        {
          id: 'note-2',
          title: 'Campaign 2 Note',
          content: 'Content',
          extractedEntities: [],
          status: 'active' as NoteStatus,
          tags: [],
          updatedAt: '2025-06-15T00:00:00.000Z',
          campaignId: 'other-campaign',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          createdByCharacterName: 'Test Character',
          dateAdded: '2025-06-15T00:00:00.000Z',
          dateModified: '2025-06-15T00:00:00.000Z',
          modifiedBy: 'test-user',
          modifiedByUsername: 'Test User',
          modifiedByCharacterName: 'Test Character'
        }
      ];
      mockDocumentService.getCollection.mockResolvedValue(mockNotes);

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      // Should only show notes for active campaign, once the async fetch
      // has actually resolved and filtered them into state.
      await waitFor(() => {
        expect(capturedContext.notes).toHaveLength(1);
      });
      expect(capturedContext.notes[0].campaignId).toBe('test-campaign');
    });

    test('should show no notes when no active campaign', async () => {
      mockUseCampaigns.mockReturnValue({ activeCampaignId: null });

      const mockNotes: Note[] = [
        {
          id: 'note-1',
          title: 'Test Note',
          content: 'Content',
          extractedEntities: [],
          status: 'active' as NoteStatus,
          tags: [],
          updatedAt: '2025-06-15T00:00:00.000Z',
          campaignId: 'test-campaign',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          createdByCharacterName: 'Test Character',
          dateAdded: '2025-06-15T00:00:00.000Z',
          dateModified: '2025-06-15T00:00:00.000Z',
          modifiedBy: 'test-user',
          modifiedByUsername: 'Test User',
          modifiedByCharacterName: 'Test Character'
        }
      ];
      mockDocumentService.getCollection.mockResolvedValue(mockNotes);

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      // Wait for the fetch to settle so this reflects the actual filtered
      // result, not just the pre-fetch initial state (which also happens
      // to be an empty array, coincidentally).
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });
      expect(capturedContext.notes).toHaveLength(0);
    });

    test('should handle loading states correctly', async () => {
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      // isLoading starts true and only becomes false once the mocked
      // getCollection() promise resolves and the fetch's `finally` block
      // runs -- that takes at least one microtask tick, so this must be
      // awaited rather than checked synchronously right after render().
      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false);
      });
    });

    test('should handle errors gracefully', async () => {
      mockDocumentService.getCollection.mockRejectedValue(new Error('Firebase error'));

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      // The rejection is only reflected in state after the fetch's catch
      // block runs, which is asynchronous relative to render().
      await waitFor(() => {
        expect(capturedContext.error).toBe('Failed to fetch notes');
      });
      expect(capturedContext.notes).toEqual([]);
    });
  });

  describe('Hook Usage Requirements', () => {
    test('should throw error when useNotes is used outside provider', () => {
      // Mock console.error to suppress error output in test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => render(<TestComponent />)).toThrow(
        'useNotes must be used within a NoteProvider'
      );

      consoleSpy.mockRestore();
    });
  });
});
