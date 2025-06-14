// src/context/__tests__/NPCContext.basic.test.tsx

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../test-utils/simple-test-utils';
import { createTestNPC } from '../../test-utils/test-data-helpers';
import { useNPCs } from '../NPCContext';

// Test component that tries to use NPCContext hook
const ComponentUsingNPCHook = () => {
  try {
    const { npcs } = useNPCs();
    return <div data-testid="npc-hook-success">Hook worked, NPCs: {npcs.length}</div>;
  } catch (error) {
    return <div data-testid="npc-hook-error">Hook error: {(error as Error).message}</div>;
  }
};

// Simple test component without hook usage
const SimpleTestComponent = () => {
  return (
    <div>
      <div data-testid="npc-context-test">NPCContext Test Component</div>
    </div>
  );
};

describe('NPCContext Basic Tests', () => {
  test('should render test component without NPCContext', () => {
    render(<SimpleTestComponent />);
    expect(screen.getByTestId('npc-context-test')).toBeInTheDocument();
  });

  test('should throw error when useNPCs used outside provider', () => {
    // Expect console.error to be called
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<ComponentUsingNPCHook />);
    
    expect(screen.getByTestId('npc-hook-error')).toBeInTheDocument();
    expect(screen.getByText('Hook error: useNPCs must be used within an NPCProvider')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  test('should create test NPC data', () => {
    const testNPC = createTestNPC({
      name: 'Test Character',
      description: 'A character for testing'
    });

    expect(testNPC.name).toBe('Test Character');
    expect(testNPC.description).toBe('A character for testing');
    expect(testNPC.status).toBe('alive');
    expect(testNPC.relationship).toBe('neutral');
    expect(testNPC.connections.relatedQuests).toEqual([]);
  });
});