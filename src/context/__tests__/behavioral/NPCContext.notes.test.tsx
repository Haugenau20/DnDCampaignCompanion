// src/context/__tests__/behavioral/NPCContext.notes.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { NPCProvider, useNPCs } from '../../NPCContext';
import { NPC, NPCNote } from '../../../types/npc';

/**
 * NPC Context Note Management Behavioral Testing
 * 
 * Tests ACTUAL NPC note behavior including creation, updates, and validation.
 * This focuses on the note management features of NPCs.
 */

// Mock Firebase dependencies
const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseGroups = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseNPCData = jest.fn();
const mockUseFirebaseData = jest.fn();

jest.mock('../../firebase', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useGroups: () => mockUseGroups(),
  useCampaigns: () => mockUseCampaigns(),
}));

jest.mock('../../../hooks/useNPCData', () => ({
  useNPCData: () => mockUseNPCData(),
}));

jest.mock('../../../hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

const NPCTestComponent = ({ onContextChange }: { onContextChange: (context: any) => void }) => {
  const npcContext = useNPCs();
  
  React.useEffect(() => {
    onContextChange(npcContext);
  }, [npcContext, onContextChange]);
  
  return <div data-testid="npc-notes-test">NPC Notes Test</div>;
};

describe('NPCContext Note Management Behavior', () => {
  let npcContext: any;
  let mockUpdateData: jest.Mock;
  let mockRefreshNPCs: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    npcContext = null;

    mockUpdateData = jest.fn();
    mockRefreshNPCs = jest.fn();

    // Setup authenticated context
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user' },
    });

    mockUseUser.mockReturnValue({
      userProfile: { uid: 'test-user' },
      activeGroupUserProfile: { uid: 'test-user', username: 'TestUser' },
    });

    mockUseGroups.mockReturnValue({
      activeGroupId: 'test-group',
    });

    mockUseCampaigns.mockReturnValue({
      activeCampaignId: 'test-campaign',
    });

    mockUseFirebaseData.mockReturnValue({
      addData: jest.fn(),
      updateData: mockUpdateData,
      deleteData: jest.fn(),
    });

    mockUpdateData.mockResolvedValue(undefined);
    mockRefreshNPCs.mockResolvedValue([]);
  });

  const renderNPCContext = () => {
    const handleContextChange = (context: any) => {
      npcContext = context;
    };

    return render(
      <NPCProvider>
        <NPCTestComponent onContextChange={handleContextChange} />
      </NPCProvider>
    );
  };

  describe('Note Addition Behavior', () => {
    test('should add note to existing NPC', async () => {
      const existingNPC: NPC = {
        id: 'test-npc',
        name: 'Test NPC',
        description: 'A test character',
        status: 'alive',
        relationship: 'neutral',
        connections: {
          relatedNPCs: [],
          affiliations: [],
          relatedQuests: []
        },
        notes: [],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseNPCData.mockReturnValue({
        npcs: [existingNPC],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(existingNPC),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const noteData = {
        date: '2023-06-15',
        text: 'Met this NPC at the tavern. Seems trustworthy.'
      };

      // BEHAVIOR: Should add note to NPC
      await act(async () => {
        await npcContext.updateNPCNote('test-npc', noteData);
      });

      // BEHAVIOR: Should call Firebase with updated NPC data
      expect(mockUpdateData).toHaveBeenCalledTimes(1);
      const [npcId, updatedNPCData] = mockUpdateData.mock.calls[0];

      expect(npcId).toBe('test-npc');
      
      // Verify note was added correctly
      expect(updatedNPCData.notes).toHaveLength(1);
      expect(updatedNPCData.notes[0]).toMatchObject({
        date: '2023-06-15',
        text: 'Met this NPC at the tavern. Seems trustworthy.'
      });

      // Should have modification metadata
      expect(updatedNPCData.modifiedBy).toBe('test-user');
      expect(updatedNPCData.modifiedByUsername).toBe('TestUser');
      expect(updatedNPCData.dateModified).toBeDefined();

      // BEHAVIOR: Should refresh NPCs after note addition
      expect(mockRefreshNPCs).toHaveBeenCalledTimes(1);
    });

    test('should add multiple notes to NPC', async () => {
      const npcWithOneNote: NPC = {
        id: 'test-npc',
        name: 'Test NPC',
        description: 'A test character',
        status: 'alive',
        relationship: 'neutral',
        connections: {
          relatedNPCs: [],
          affiliations: [],
          relatedQuests: []
        },
        notes: [
          { date: '2023-06-01', text: 'First meeting notes' }
        ],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseNPCData.mockReturnValue({
        npcs: [npcWithOneNote],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(npcWithOneNote),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const secondNote = {
        date: '2023-06-15',
        text: 'Second encounter - learned more about their background'
      };

      // BEHAVIOR: Should add second note while preserving first
      await act(async () => {
        await npcContext.updateNPCNote('test-npc', secondNote);
      });

      const [npcId, updatedNPCData] = mockUpdateData.mock.calls[0];

      // BEHAVIOR: Should have both notes
      expect(updatedNPCData.notes).toHaveLength(2);
      expect(updatedNPCData.notes[0]).toMatchObject({
        date: '2023-06-01',
        text: 'First meeting notes'
      });
      expect(updatedNPCData.notes[1]).toMatchObject({
        date: '2023-06-15',
        text: 'Second encounter - learned more about their background'
      });
    });

    test('should validate note data structure', async () => {
      const existingNPC: NPC = {
        id: 'test-npc',
        name: 'Test NPC',
        description: 'A test character',
        status: 'alive',
        relationship: 'neutral',
        connections: {
          relatedNPCs: [],
          affiliations: [],
          relatedQuests: []
        },
        notes: [],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseNPCData.mockReturnValue({
        npcs: [existingNPC],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(existingNPC),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIORAL TEST: What happens with minimal note data?
      const minimalNote = {
        date: '2023-06-15',
        text: 'Brief note'
      };

      await act(async () => {
        await npcContext.updateNPCNote('test-npc', minimalNote);
      });

      const [npcId, updatedNPCData] = mockUpdateData.mock.calls[0];

      // BEHAVIOR: Note should be stored exactly as provided
      expect(updatedNPCData.notes[0]).toMatchObject({
        date: '2023-06-15',
        text: 'Brief note'
      });

      // BEHAVIOR: Note should follow NPCNote interface (date + text only)
      const addedNote = updatedNPCData.notes[0];
      expect(Object.keys(addedNote)).toEqual(['date', 'text']);
    });
  });

  describe('Note Validation Behavior', () => {
    test('should reject note addition for nonexistent NPC', async () => {
      mockUseNPCData.mockReturnValue({
        npcs: [],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(undefined),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const noteData = {
        date: '2023-06-15',
        text: 'Note for nonexistent NPC'
      };

      // BEHAVIOR: updateNPCNote doesn't throw for nonexistent NPC - just returns undefined
      // DISCOVERY: This reveals that updateNPCNote doesn't validate NPC existence!
      await act(async () => {
        const result = await npcContext.updateNPCNote('nonexistent-npc', noteData);
        expect(result).toBeUndefined();
      });

      // BEHAVIOR: Firebase should not be called for nonexistent NPC
      expect(mockUpdateData).not.toHaveBeenCalled();
    });

    test('should require authentication for note addition', async () => {
      // Remove authentication
      mockUseAuth.mockReturnValue({ user: null });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const noteData = {
        date: '2023-06-15',
        text: 'Unauthorized note'
      };

      // BEHAVIOR: Should reject note addition without authentication
      await expect(
        npcContext.updateNPCNote('test-npc', noteData)
      ).rejects.toThrow('User must be authenticated to add notes');

      // BEHAVIOR: Firebase should not be called
      expect(mockUpdateData).not.toHaveBeenCalled();
    });

    test('should require group and campaign context for note addition', async () => {
      // Remove group context
      mockUseGroups.mockReturnValue({ activeGroupId: null });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const noteData = {
        date: '2023-06-15',
        text: 'Note without context'
      };

      // BEHAVIOR: updateNPCNote doesn't throw for missing context - logs error and returns
      // DISCOVERY: This reveals that updateNPCNote logs but doesn't throw!
      await act(async () => {
        const result = await npcContext.updateNPCNote('test-npc', noteData);
        expect(result).toBeUndefined();
      });

      // BEHAVIOR: Firebase should not be called without context
      expect(mockUpdateData).not.toHaveBeenCalled();
    });
  });

  describe('Note Data Integrity Behavior', () => {
    test('should handle empty note text', async () => {
      const existingNPC: NPC = {
        id: 'test-npc',
        name: 'Test NPC',
        description: 'A test character',
        status: 'alive',
        relationship: 'neutral',
        connections: {
          relatedNPCs: [],
          affiliations: [],
          relatedQuests: []
        },
        notes: [],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseNPCData.mockReturnValue({
        npcs: [existingNPC],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(existingNPC),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIORAL TEST: What happens with empty note text?
      const emptyNote = {
        date: '2023-06-15',
        text: ''
      };

      // BEHAVIOR: Should handle empty text (current implementation allows it)
      await act(async () => {
        await npcContext.updateNPCNote('test-npc', emptyNote);
      });

      const [npcId, updatedNPCData] = mockUpdateData.mock.calls[0];

      // DISCOVERY: Documents current behavior with empty text
      expect(updatedNPCData.notes[0].text).toBe('');
      
      // Future enhancement could add validation for empty notes
    });

    test('should handle malformed note data', async () => {
      const existingNPC: NPC = {
        id: 'test-npc',
        name: 'Test NPC',
        description: 'A test character',
        status: 'alive',
        relationship: 'neutral',
        connections: {
          relatedNPCs: [],
          affiliations: [],
          relatedQuests: []
        },
        notes: [],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseNPCData.mockReturnValue({
        npcs: [existingNPC],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(existingNPC),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIORAL TEST: What happens with malformed note data?
      const malformedNote = {
        date: '2023-06-15',
        text: 'Valid text',
        extraField: 'Should this be preserved?'
      } as any;

      await act(async () => {
        await npcContext.updateNPCNote('test-npc', malformedNote);
      });

      const [npcId, updatedNPCData] = mockUpdateData.mock.calls[0];

      // DISCOVERY: Documents how extra fields are handled
      const addedNote = updatedNPCData.notes[0];
      expect(addedNote.date).toBe('2023-06-15');
      expect(addedNote.text).toBe('Valid text');
      
      // This test reveals if extra fields are preserved or stripped
      // Current behavior: extra fields are preserved in the object
    });

    test('should preserve existing notes when adding new ones', async () => {
      const npcWithNotes: NPC = {
        id: 'test-npc',
        name: 'Test NPC',
        description: 'A test character',
        status: 'alive',
        relationship: 'neutral',
        connections: {
          relatedNPCs: [],
          affiliations: [],
          relatedQuests: []
        },
        notes: [
          { date: '2023-06-01', text: 'First note' },
          { date: '2023-06-05', text: 'Second note' },
          { date: '2023-06-10', text: 'Third note' }
        ],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseNPCData.mockReturnValue({
        npcs: [npcWithNotes],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(npcWithNotes),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const newNote = {
        date: '2023-06-15',
        text: 'Fourth note'
      };

      // BEHAVIOR: Should add new note while preserving all existing notes
      await act(async () => {
        await npcContext.updateNPCNote('test-npc', newNote);
      });

      const [npcId, updatedNPCData] = mockUpdateData.mock.calls[0];

      // BEHAVIOR: Should have all original notes plus new one
      expect(updatedNPCData.notes).toHaveLength(4);
      
      // Original notes should be preserved
      expect(updatedNPCData.notes[0]).toMatchObject({
        date: '2023-06-01',
        text: 'First note'
      });
      expect(updatedNPCData.notes[1]).toMatchObject({
        date: '2023-06-05',
        text: 'Second note'
      });
      expect(updatedNPCData.notes[2]).toMatchObject({
        date: '2023-06-10',
        text: 'Third note'
      });
      
      // New note should be added
      expect(updatedNPCData.notes[3]).toMatchObject({
        date: '2023-06-15',
        text: 'Fourth note'
      });
    });
  });
});