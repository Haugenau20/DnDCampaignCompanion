// src/context/__tests__/behavioral/NoteContext.bugs.test.tsx
import React from 'react';
import { render, act } from '@testing-library/react';
import { NoteProvider, useNotes } from '../../NoteContext';
import { Note, ExtractedEntity, EntityType, NoteStatus } from '../../../types/note';

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
  deleteDocument: jest.fn()
};

jest.mock('../../../services/firebase/data/DocumentService', () => ({
  __esModule: true,
  default: {
    getInstance: () => mockDocumentService
  }
}));

// Mock user utilities - these should return proper values but consistently return empty/null
jest.mock('../../../utils/user-utils', () => ({
  getUserName: jest.fn(),
  getActiveCharacterName: jest.fn()
}));

const { getUserName, getActiveCharacterName } = require('../../../utils/user-utils');

describe('NoteContext Bug Tests', () => {
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
    
    // Default empty collection
    mockDocumentService.getCollection.mockResolvedValue([]);
  });

  describe('User Attribution Requirements', () => {
    test('should include proper user attribution metadata in created notes', async () => {
      // Mock utilities to return EXPECTED values (specification-based testing)
      getUserName.mockReturnValue('Test User');
      getActiveCharacterName.mockReturnValue('Test Character');
      
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });

      const note = capturedContext.notes[0];
      
      // Test for EXPECTED behavior - fails until implementation is correct
      expect(note.createdByUsername).toBe('Test User'); // FAILS until bug fixed
      expect(note.createdByCharacterName).toBe('Test Character'); // FAILS until bug fixed
      expect(note.modifiedByUsername).toBe('Test User'); // FAILS until bug fixed
      expect(note.modifiedByCharacterName).toBe('Test Character'); // FAILS until bug fixed
    });

    test('should call user attribution utilities with correct profile data', async () => {
      getUserName.mockReturnValue('Test User'); // Expected return value
      getActiveCharacterName.mockReturnValue('Test Character'); // Expected return value
      
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
      });

      // Verify utilities are called with correct profile data
      expect(getUserName).toHaveBeenCalledWith({
        userId: 'test-user', 
        username: 'Test User',
        role: 'member',
        joinedAt: '2025-06-15T00:00:00.000Z',
        activeCharacterId: 'char-1',
        characters: [
          { id: 'char-1', name: 'Test Character' }
        ]
      });
      expect(getActiveCharacterName).toHaveBeenCalledWith({
        userId: 'test-user', 
        username: 'Test User',
        role: 'member',
        joinedAt: '2025-06-15T00:00:00.000Z',
        activeCharacterId: 'char-1',
        characters: [
          { id: 'char-1', name: 'Test Character' }
        ]
      });
    });

    test('should include user attribution in note save operations', async () => {
      getUserName.mockReturnValue('Test User'); // Expected return value
      getActiveCharacterName.mockReturnValue('Test Character'); // Expected return value
      
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
        await capturedContext.saveNote('note-1', { title: 'Updated Title' });
      });

      // Test for EXPECTED behavior - save operations should have proper attribution
      expect(mockDocumentService.createDocument).toHaveBeenCalledWith(
        'groups/test-group/users/test-user/notes',
        expect.objectContaining({
          modifiedByUsername: 'Test User', // FAILS until bug fixed
          modifiedByCharacterName: 'Test Character' // FAILS until bug fixed
        }),
        'note-1'
      );
    });
  });

  describe('Sequential ID Generation Requirements', () => {
    test('should generate sequential IDs based on existing notes', async () => {
      getUserName.mockReturnValue('Test User');
      getActiveCharacterName.mockReturnValue('Test Character');
      
      // Mock existing notes to test sequence calculation
      const existingNotes: Note[] = [
        {
          id: 'note-5', // Higher number to test max calculation
          title: 'Existing Note',
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
      mockDocumentService.getCollection.mockResolvedValue(existingNotes);

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      await act(async () => {
        const noteId = await capturedContext.createNote('New Note', 'New content');
        
        // EXPECTED: Sequential ID generation should handle existing notes correctly
        expect(noteId).toBe('note-6'); // Should be next in sequence (FAILS until fixed)
      });
    });

    test('should reveal ID generation with malformed existing IDs', async () => {
      // Test with malformed note IDs that don't follow pattern
      const existingNotes: Note[] = [
        {
          id: 'invalid-id-format', // Doesn't match note-X pattern
          title: 'Malformed ID Note',
          content: 'Content',
          extractedEntities: [],
          status: 'active' as NoteStatus,
          tags: [],
          updatedAt: '2025-06-15T00:00:00.000Z',
          campaignId: 'test-campaign',
          createdBy: 'test-user',
          createdByUsername: '',
          createdByCharacterName: null,
          dateAdded: '2025-06-15T00:00:00.000Z',
          dateModified: '2025-06-15T00:00:00.000Z',
          modifiedBy: 'test-user',
          modifiedByUsername: '',
          modifiedByCharacterName: null
        }
      ];
      mockDocumentService.getCollection.mockResolvedValue(existingNotes);

      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      await act(async () => {
        const noteId = await capturedContext.createNote('New Note', 'New content');
        
        // Should default to note-1 when no valid sequential IDs exist
        expect(noteId).toBe('note-1');
        
        console.log('Generated ID with malformed existing IDs:', noteId);
      });
    });
  });

  describe('Entity Conversion Requirements', () => {
    test('should handle entity conversion with minimal data', async () => {
      getUserName.mockReturnValue('Test User'); 
      getActiveCharacterName.mockReturnValue('Test Character');
      
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
        
        // Add entity with missing required fields
        const incompleteEntity: ExtractedEntity = {
          id: 'entity-1',
          text: '', // EMPTY TEXT - should this be allowed?
          type: 'npc' as EntityType,
          confidence: 0.1, // VERY LOW CONFIDENCE - should this be converted?
          isConverted: false,
          createdAt: '2025-06-15T00:00:00.000Z',
          extraData: {} // EMPTY EXTRA DATA - will this cause issues?
        };
        
        await capturedContext.updateNote('note-1', {
          extractedEntities: [incompleteEntity]
        });
        
        // BUG POTENTIAL: Should there be validation before conversion?
        const result = await capturedContext.convertEntity('note-1', 'entity-1', 'npc');
        expect(result).toBe(''); // Function completes without validation
        
        // Check what data gets passed to navigation
        expect(mockNavigate).toHaveBeenCalledWith('/npcs/create', {
          state: expect.objectContaining({
            initialData: expect.objectContaining({
              name: '', // EMPTY NAME from empty text
              description: expect.stringContaining('Created from note:')
            })
          })
        });
        
        // EXPECTED: Entity conversion should work with minimal but valid data
      });
    });

    test('should handle rumor conversion with invalid source type', async () => {
      getUserName.mockReturnValue('Test User');
      getActiveCharacterName.mockReturnValue('Test Character');
      
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
        
        const rumorEntity: ExtractedEntity = {
          id: 'entity-1',
          text: 'Strange Rumor',
          type: 'rumor' as EntityType,
          confidence: 0.9,
          isConverted: false,
          createdAt: '2025-06-15T00:00:00.000Z',
          extraData: {
            sourceType: 'invalid-source-type' // NOT in valid list: ['npc', 'tavern', 'notice', 'traveler', 'other']
          }
        };
        
        await capturedContext.updateNote('note-1', {
          extractedEntities: [rumorEntity]
        });
        
        await capturedContext.convertEntity('note-1', 'entity-1', 'rumor');
        
        // BUG DISCOVERY: How does invalid sourceType get handled?
        expect(mockNavigate).toHaveBeenCalledWith('/rumors/create', {
          state: expect.objectContaining({
            initialData: expect.objectContaining({
              sourceType: 'other', // Should default to 'other'
              sourceName: 'invalid-source-type' // Original value should be preserved in sourceName
            })
          })
        });
        
        // EXPECTED: Invalid source types should be handled gracefully
      });
    });
  });

  describe('Campaign Filtering Requirements', () => {
    test('should handle campaign switching properly', async () => {
      getUserName.mockReturnValue('Test User');
      getActiveCharacterName.mockReturnValue('Test Character');
      
      // Start with campaign A
      mockUseCampaigns.mockReturnValue({ activeCampaignId: 'campaign-a' });
      
      let capturedContext: any;
      const { rerender } = render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      await act(async () => {
        await capturedContext.createNote('Campaign A Note', 'Content for campaign A');
      });

      expect(capturedContext.notes).toHaveLength(1);
      expect(capturedContext.notes[0].campaignId).toBe('campaign-a');

      // Switch to campaign B
      mockUseCampaigns.mockReturnValue({ activeCampaignId: 'campaign-b' });
      
      rerender(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      // BUG POTENTIAL: What happens to unsaved notes when campaign switches?
      // The unsaved note for campaign A should disappear since it's filtered by campaign
      expect(capturedContext.notes).toHaveLength(0);
      
      // EXPECTED: Campaign filtering should handle unsaved notes appropriately
    });
  });

  describe('Bug #024: Error Handling and State Management', () => {
    test('should reveal error handling in fetch operations', async () => {
      mockDocumentService.getCollection.mockRejectedValue(new Error('Firebase connection failed'));
      
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      // Should handle error gracefully
      expect(capturedContext.error).toBe('Failed to fetch notes');
      expect(capturedContext.notes).toEqual([]);
      expect(capturedContext.isLoading).toBe(false);
      
      // BUG POTENTIAL: Can notes still be created when in error state?
      await act(async () => {
        const noteId = await capturedContext.createNote('Test Note', 'Test content');
        expect(noteId).toBe('note-1'); // Should still work locally
      });
      
      console.log('Notes can be created locally even when fetch errors occur');
    });

    test('should handle partial Firebase failures correctly', async () => {
      getUserName.mockReturnValue('Test User');
      getActiveCharacterName.mockReturnValue('Test Character');
      
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
        
        // Simulate save failure
        mockDocumentService.createDocument.mockRejectedValue(new Error('Save failed'));
        
        await expect(capturedContext.saveNote('note-1')).rejects.toThrow('Save failed');
      });

      // BUG POTENTIAL: Note should remain marked as unsaved after save failure
      const note = capturedContext.notes[0];
      expect(note.isUnsaved).toBe(true); // Should remain unsaved after failure
      
      // EXPECTED: Note should remain unsaved after save failure
    });
  });

  describe('Entity Data Processing Requirements', () => {
    test('should handle malformed entity extraData gracefully', async () => {
      getUserName.mockReturnValue('Test User');
      getActiveCharacterName.mockReturnValue('Test Character');
      
      let capturedContext: any;
      render(
        <NoteProvider>
          <TestComponent onRender={(ctx) => capturedContext = ctx} />
        </NoteProvider>
      );

      await act(async () => {
        await capturedContext.createNote('Test Note', 'Test content');
        
        const malformedEntity: ExtractedEntity = {
          id: 'entity-1',
          text: 'Test Entity',
          type: 'quest' as EntityType,
          confidence: 0.9,
          isConverted: false,
          createdAt: '2025-06-15T00:00:00.000Z',
          extraData: {
            objectives: 'not-an-array', // BUG: Should be array but is string
            relatedNPCIds: null, // BUG: Should be array but is null
            title: ['array', 'instead', 'of', 'string'] // BUG: Should be string but is array
          }
        };
        
        await capturedContext.updateNote('note-1', {
          extractedEntities: [malformedEntity]
        });
        
        // BUG POTENTIAL: How does malformed extraData get processed?
        await capturedContext.convertEntity('note-1', 'entity-1', 'quest');
        
        expect(mockNavigate).toHaveBeenCalledWith('/quests/create', {
          state: expect.objectContaining({
            initialData: expect.objectContaining({
              title: ['array', 'instead', 'of', 'string'], // Malformed data passes through
              objectives: 'not-an-array', // Non-array passes through
              relatedNPCIds: null // Null passes through instead of defaulting to []
            })
          })
        });
        
        // EXPECTED: System should handle malformed data gracefully (may need validation)
      });
    });
  });
});