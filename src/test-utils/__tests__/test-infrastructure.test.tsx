// src/test-utils/__tests__/test-infrastructure.test.tsx

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../simple-test-utils';
import { createTestNPC, createInterconnectedTestData } from '../test-data-helpers';

// Simple test component to verify basic setup
const TestComponent = () => {
  return (
    <div>
      <div data-testid="test-component">Basic Test Infrastructure Works</div>
    </div>
  );
};

describe('Basic Test Infrastructure', () => {
  test('should render simple component', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Basic Test Infrastructure Works')).toBeInTheDocument();
  });
});

describe('Test Data Helpers', () => {
  test('should create test NPC with correct structure', () => {
    const npc = createTestNPC();
    
    expect(npc).toHaveProperty('id');
    expect(npc).toHaveProperty('name', 'Test NPC');
    expect(npc).toHaveProperty('status', 'alive');
    expect(npc).toHaveProperty('relationship', 'neutral');
    expect(npc).toHaveProperty('connections');
    expect(npc.connections).toHaveProperty('relatedQuests');
    expect(npc.connections).toHaveProperty('relatedNPCs');
    expect(npc.connections).toHaveProperty('affiliations');
    expect(npc.connections.relatedQuests).toEqual([]);
  });

  test('should create test NPC with custom properties', () => {
    const customNPC = createTestNPC({
      name: 'Gandalf the Grey',
      description: 'A wise wizard',
      status: 'alive',
      relationship: 'friendly'
    });
    
    expect(customNPC.name).toBe('Gandalf the Grey');
    expect(customNPC.description).toBe('A wise wizard');
    expect(customNPC.status).toBe('alive');
    expect(customNPC.relationship).toBe('friendly');
  });

  test('should create interconnected test data with proper relationships', () => {
    const { npc, quest, location, rumor } = createInterconnectedTestData();
    
    // Verify basic properties
    expect(npc.name).toBe('Thorin Oakenshield');
    expect(quest.title).toBe('Reclaim Erebor');
    expect(location.name).toBe('Erebor');
    expect(rumor.title).toBe('Dragon Sighting');
    
    // Verify relationships
    expect(npc.connections.relatedQuests).toContain(quest.id);
    expect(quest.relatedNPCIds).toContain(npc.id);
    expect(location.relatedQuests).toContain(quest.id);
    expect(location.connectedNPCs).toContain(npc.id);
  });

  test('should generate unique IDs for different entities', () => {
    const npc1 = createTestNPC();
    const npc2 = createTestNPC();
    
    expect(npc1.id).not.toBe(npc2.id);
    expect(npc1.id).toMatch(/^test-npc-\d+-\d+$/);
    expect(npc2.id).toMatch(/^test-npc-\d+-\d+$/);
  });
});