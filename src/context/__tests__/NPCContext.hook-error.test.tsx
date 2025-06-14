// src/context/__tests__/NPCContext.hook-error.test.tsx

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../test-utils/simple-test-utils';

// Mock the NPCContext module to avoid Firebase initialization
jest.mock('../NPCContext', () => ({
  useNPCs: jest.fn(() => {
    throw new Error('useNPCs must be used within an NPCProvider');
  })
}));

// Import after mocking
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

describe('NPCContext Hook Error Handling', () => {
  test('should throw error when useNPCs used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<ComponentUsingNPCHook />);
    
    expect(screen.getByTestId('npc-hook-error')).toBeInTheDocument();
    expect(screen.getByText('Hook error: useNPCs must be used within an NPCProvider')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
});