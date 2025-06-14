// src/test-utils/__tests__/enhanced-test-utils.test.tsx

import React from 'react';
import { screen } from '@testing-library/react';
import { 
  render, 
  renderWithMinimalProviders, 
  renderWithFirebaseOnly,
  renderWithNPCContext 
} from '../enhanced-test-utils';
import { createTestNPC, createInterconnectedTestData } from '../test-data-helpers';

// Simple test component to verify provider setup
const TestComponent = () => {
  return (
    <div>
      <div data-testid="test-component">Test Component Rendered</div>
    </div>
  );
};

describe('Enhanced Test Utils', () => {
  test('should render with all providers by default', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });

  test('should render with minimal providers', () => {
    renderWithMinimalProviders(<TestComponent />);
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });

  test('should render with Firebase only', () => {
    renderWithFirebaseOnly(<TestComponent />);
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });

  test('should render with NPC context', () => {
    renderWithNPCContext(<TestComponent />);
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });
});

describe('Test Data Helpers', () => {
  test('should create test NPC with default values', () => {
    const npc = createTestNPC();
    
    expect(npc).toHaveProperty('id');
    expect(npc.name).toBe('Test NPC');
    expect(npc.description).toBe('A test character for testing purposes');
    expect(npc.createdBy).toBe('test-user-1');
    expect(npc.connections.relatedQuests).toEqual([]);
  });

  test('should create test NPC with overrides', () => {
    const npc = createTestNPC({
      name: 'Custom NPC',
      description: 'Custom description'
    });
    
    expect(npc.name).toBe('Custom NPC');
    expect(npc.description).toBe('Custom description');
  });

  test('should create interconnected test data', () => {
    const { npc, quest, location, rumor } = createInterconnectedTestData();
    
    // Verify relationships are established
    expect(npc.connections.relatedQuests).toContain(quest.id);
    expect(quest.relatedNPCIds).toContain(npc.id);
    expect(location.relatedQuests).toContain(quest.id);
    expect(location.connectedNPCs).toContain(npc.id);
    
    // Verify data structure
    expect(npc.name).toBe('Thorin Oakenshield');
    expect(quest.title).toBe('Reclaim Erebor');
    expect(location.name).toBe('Erebor');
    expect(rumor.title).toBe('Dragon Sighting');
  });
});