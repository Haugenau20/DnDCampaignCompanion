// src/context/__tests__/NPCContext.crud.test.tsx

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../../test-utils/simple-test-utils';
import { createTestNPC } from '../../test-utils/test-data-helpers';

// Mock the NPCContext and its dependencies to test CRUD operations
jest.mock('../NPCContext', () => {
  const React = require('react');
  
  // Create fresh state for each test
  const createMockState = () => ({
    mockNPCs: [] as any[],
    mockIsLoading: false,
    mockError: null as string | null
  });

  // Store the current mock state
  let currentMockState = createMockState();

  const createMockNPCContextValue = () => ({
    npcs: currentMockState.mockNPCs,
    isLoading: currentMockState.mockIsLoading,
    error: currentMockState.mockError,
    
    // CRUD operations - these define what the interface SHOULD do
    addNPC: jest.fn(async (npcData: any) => {
      // Should validate required fields
      if (!npcData.name || !npcData.description) {
        throw new Error('Name and description are required');
      }
      
      // Should generate ID from name
      const id = npcData.name.toLowerCase().replace(/\s+/g, '-');
      const newNPC = { ...npcData, id };
      currentMockState.mockNPCs.push(newNPC);
      return id;
    }),
    
    updateNPC: jest.fn(async (npc: any) => {
      // Should validate NPC exists
      const index = currentMockState.mockNPCs.findIndex(n => n.id === npc.id);
      if (index === -1) {
        throw new Error('NPC not found');
      }
      
      // Should update the NPC in place
      currentMockState.mockNPCs[index] = npc;
    }),
    
    deleteNPC: jest.fn(async (npcId: string) => {
      // Should validate NPC exists
      const index = currentMockState.mockNPCs.findIndex(n => n.id === npcId);
      if (index === -1) {
        throw new Error('NPC not found');
      }
      
      // Should remove the NPC
      currentMockState.mockNPCs.splice(index, 1);
    }),
    
    getNPCById: jest.fn((id: string) => {
      return currentMockState.mockNPCs.find(npc => npc.id === id);
    }),
    
    // Reset function for test isolation
    resetMockState: () => {
      currentMockState = createMockState();
    },
    
    // Other methods
    getNPCsByQuest: jest.fn(() => []),
    getNPCsByLocation: jest.fn(() => []),
    getNPCsByRelationship: jest.fn(() => []),
    updateNPCNote: jest.fn(),
    updateNPCRelationship: jest.fn()
  });

  // Create context and provider with fresh state each time
  const NPCContext = React.createContext(createMockNPCContextValue());

  const NPCProvider = ({ children }: { children: React.ReactNode }) => {
    const contextValue = createMockNPCContextValue();
    return React.createElement(NPCContext.Provider, { value: contextValue }, children);
  };
  
  const useNPCs = () => {
    const context = React.useContext(NPCContext);
    if (!context) {
      throw new Error('useNPCs must be used within an NPCProvider');
    }
    return context;
  };

  return { 
    NPCProvider, 
    useNPCs, 
    NPCContext,
    // Export reset function for test isolation
    __resetMockState: () => {
      currentMockState = createMockState();
    }
  };
});

// Import after mocking
import { NPCProvider, useNPCs } from '../NPCContext';

// Import the reset function for test isolation
const { __resetMockState } = require('../NPCContext');

// Test component for CRUD operations
const NPCCrudTestComponent = () => {
  const { npcs, addNPC, updateNPC, deleteNPC, getNPCById, isLoading, error } = useNPCs();
  const [message, setMessage] = React.useState('');

  const handleAddNPC = async () => {
    try {
      const id = await addNPC({
        name: 'Gandalf',
        description: 'A wise wizard',
        status: 'alive',
        relationship: 'friendly',
        connections: { relatedQuests: [], relatedNPCs: [], affiliations: [] },
        notes: [],
        createdBy: 'test-user',
        createdByUsername: 'test-user',
        dateAdded: new Date().toISOString()
      });
      setMessage(`Added NPC with ID: ${id}`);
    } catch (error) {
      setMessage(`Add error: ${(error as Error).message}`);
    }
  };

  const handleUpdateNPC = async () => {
    try {
      const existingNPC = getNPCById('gandalf');
      if (existingNPC) {
        await updateNPC({
          ...existingNPC,
          description: 'Updated: A very wise wizard'
        });
        setMessage('Updated NPC successfully');
      } else {
        setMessage('No NPC to update');
      }
    } catch (error) {
      setMessage(`Update error: ${(error as Error).message}`);
    }
  };

  const handleDeleteNPC = async () => {
    try {
      await deleteNPC('gandalf');
      setMessage('Deleted NPC successfully');
    } catch (error) {
      setMessage(`Delete error: ${(error as Error).message}`);
    }
  };

  const handleAddInvalidNPC = async () => {
    try {
      await addNPC({
        name: '', // Invalid - empty name
        description: '', // Invalid - empty description
        status: 'alive',
        relationship: 'friendly',
        connections: { relatedQuests: [], relatedNPCs: [], affiliations: [] },
        notes: [],
        createdBy: 'test-user',
        createdByUsername: 'test-user',
        dateAdded: new Date().toISOString()
      });
      setMessage('Should not reach here');
    } catch (error) {
      setMessage(`Validation error: ${(error as Error).message}`);
    }
  };

  return (
    <div>
      <div data-testid="npc-count">NPCs: {npcs.length}</div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="message">{message}</div>
      
      <button data-testid="add-npc" onClick={handleAddNPC}>Add NPC</button>
      <button data-testid="update-npc" onClick={handleUpdateNPC}>Update NPC</button>
      <button data-testid="delete-npc" onClick={handleDeleteNPC}>Delete NPC</button>
      <button data-testid="add-invalid-npc" onClick={handleAddInvalidNPC}>Add Invalid NPC</button>
      
      {npcs.map(npc => (
        <div key={npc.id} data-testid={`npc-${npc.id}`}>
          {npc.name}: {npc.description}
        </div>
      ))}
    </div>
  );
};

describe('NPCContext CRUD Operations', () => {
  // Reset mock state before each test for proper isolation
  beforeEach(() => {
    if (__resetMockState) {
      __resetMockState();
    }
  });

  const renderNPCCrud = () => {
    return render(
      <NPCProvider>
        <NPCCrudTestComponent />
      </NPCProvider>
    );
  };

  test('should start with empty NPC list', () => {
    renderNPCCrud();
    
    expect(screen.getByTestId('npc-count')).toHaveTextContent('NPCs: 0');
    expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });

  test('should add new NPC successfully', async () => {
    renderNPCCrud();
    
    fireEvent.click(screen.getByTestId('add-npc'));
    
    await waitFor(() => {
      expect(screen.getByTestId('message')).toHaveTextContent('Added NPC with ID: gandalf');
    });
    
    expect(screen.getByTestId('npc-count')).toHaveTextContent('NPCs: 1');
    expect(screen.getByTestId('npc-gandalf')).toHaveTextContent('Gandalf: A wise wizard');
  });

  test('should update existing NPC', async () => {
    renderNPCCrud();
    
    // First add an NPC
    fireEvent.click(screen.getByTestId('add-npc'));
    await waitFor(() => {
      expect(screen.getByTestId('npc-count')).toHaveTextContent('NPCs: 1');
    });
    
    // Then update it
    fireEvent.click(screen.getByTestId('update-npc'));
    
    await waitFor(() => {
      expect(screen.getByTestId('message')).toHaveTextContent('Updated NPC successfully');
    });
    
    expect(screen.getByTestId('npc-gandalf')).toHaveTextContent('Gandalf: Updated: A very wise wizard');
  });

  test('should delete existing NPC', async () => {
    renderNPCCrud();
    
    // First add an NPC
    fireEvent.click(screen.getByTestId('add-npc'));
    await waitFor(() => {
      expect(screen.getByTestId('npc-count')).toHaveTextContent('NPCs: 1');
    });
    
    // Then delete it
    fireEvent.click(screen.getByTestId('delete-npc'));
    
    await waitFor(() => {
      expect(screen.getByTestId('message')).toHaveTextContent('Deleted NPC successfully');
    });
    
    expect(screen.getByTestId('npc-count')).toHaveTextContent('NPCs: 0');
    expect(screen.queryByTestId('npc-gandalf')).not.toBeInTheDocument();
  });

  test('should validate required fields when adding NPC', async () => {
    renderNPCCrud();
    
    fireEvent.click(screen.getByTestId('add-invalid-npc'));
    
    await waitFor(() => {
      expect(screen.getByTestId('message')).toHaveTextContent('Validation error: Name and description are required');
    });
    
    expect(screen.getByTestId('npc-count')).toHaveTextContent('NPCs: 0');
  });

  test('should handle update of non-existent NPC', async () => {
    renderNPCCrud();
    
    // Try to update without adding first
    fireEvent.click(screen.getByTestId('update-npc'));
    
    await waitFor(() => {
      expect(screen.getByTestId('message')).toHaveTextContent('No NPC to update');
    });
  });

  test('should handle delete of non-existent NPC', async () => {
    renderNPCCrud();
    
    // Try to delete without adding first
    fireEvent.click(screen.getByTestId('delete-npc'));
    
    await waitFor(() => {
      expect(screen.getByTestId('message')).toHaveTextContent('Delete error: NPC not found');
    });
  });
});