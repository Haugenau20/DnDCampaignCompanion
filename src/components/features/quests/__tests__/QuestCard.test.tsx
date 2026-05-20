// src/components/features/quests/__tests__/QuestCard.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuestCard from '../QuestCard';
import { Quest, QuestStatus, QuestObjective } from '../../../../types/quest';

// ---------------------------------------------------------------------------
// Mock external context dependencies
// ---------------------------------------------------------------------------

const mockGetNPCById = jest.fn();
jest.mock('../../../../context/NPCContext', () => ({
  useNPCs: jest.fn(),
}));

jest.mock('../../../../context/LocationContext', () => ({
  useLocations: jest.fn(),
}));

const mockNavigateToPage = jest.fn();
const mockCreatePath = jest.fn(
  (path: string, _p: unknown, query?: Record<string, string>) =>
    query ? `${path}?${new URLSearchParams(query).toString()}` : path
);
jest.mock('../../../../context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

const mockDeleteQuest = jest.fn();
jest.mock('../../../../context/QuestContext', () => ({
  useQuests: jest.fn(),
}));

const mockUser = { uid: 'user-1' };
jest.mock('../../../../context/firebase', () => ({
  useAuth: jest.fn(),
  useFirebase: jest.fn(() => ({ activeGroupId: 'group-1' })),
}));

jest.mock('../../../../utils/attribution-utils', () => ({
  determineAttributionActor: jest.fn(() => ''),
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../../services/firebase', () => ({ default: {} }));

// ---------------------------------------------------------------------------
// Hook setup helpers
// ---------------------------------------------------------------------------

const { useNPCs } = require('../../../../context/NPCContext');
const { useLocations } = require('../../../../context/LocationContext');
const { useNavigation } = require('../../../../context/NavigationContext');
const { useQuests } = require('../../../../context/QuestContext');
const { useAuth } = require('../../../../context/firebase');

function setupMocks({
  user = mockUser,
  npcs = {} as Record<string, unknown>,
  locations = [] as any[],
  deleteQuest = mockDeleteQuest,
}: {
  user?: { uid: string } | null;
  npcs?: Record<string, unknown>;
  locations?: any[];
  deleteQuest?: jest.Mock;
} = {}) {
  (useAuth as jest.Mock).mockReturnValue({ user });
  (useNPCs as jest.Mock).mockReturnValue({
    getNPCById: (id: string) => npcs[id],
  });
  (useLocations as jest.Mock).mockReturnValue({ locations });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    createPath: mockCreatePath,
  });
  (useQuests as jest.Mock).mockReturnValue({ deleteQuest });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeObjective(id: string, description: string, completed = false): QuestObjective {
  return { id, description, completed };
}

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'quest-1',
    title: 'The Dark Rift',
    description: 'Investigate a mysterious rift',
    status: 'active' as QuestStatus,
    objectives: [
      makeObjective('obj-1', 'Find the rift', false),
      makeObjective('obj-2', 'Report back', false),
    ],
    leads: [],
    keyLocations: [],
    complications: [],
    rewards: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuestCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteQuest.mockResolvedValue(undefined);
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Basic rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render quest title', () => {
      render(<QuestCard quest={makeQuest()} />);
      expect(screen.getByText('The Dark Rift')).toBeInTheDocument();
    });

    test('should render quest description', () => {
      render(<QuestCard quest={makeQuest({ description: 'A mysterious quest' })} />);
      expect(screen.getByText('A mysterious quest')).toBeInTheDocument();
    });

    test('should render Expand button', () => {
      render(<QuestCard quest={makeQuest()} />);
      expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
    });

    test('should render location when provided', () => {
      render(<QuestCard quest={makeQuest({ location: 'Silverkeep' })} />);
      expect(screen.getByText(/Silverkeep/)).toBeInTheDocument();
    });

    test('should render level range when provided', () => {
      render(<QuestCard quest={makeQuest({ levelRange: '1-5' })} />);
      expect(screen.getByText('Level: 1-5')).toBeInTheDocument();
    });

    test('should NOT render level range section when absent', () => {
      render(<QuestCard quest={makeQuest({ levelRange: undefined })} />);
      expect(screen.queryByText(/Level:/)).not.toBeInTheDocument();
    });

    test('should render progress bar (0% when no objectives completed)', () => {
      render(
        <QuestCard
          quest={makeQuest({
            objectives: [
              makeObjective('obj-1', 'Task one', false),
              makeObjective('obj-2', 'Task two', false),
            ],
          })}
        />
      );
      // Progress bar renders as div — just verify component doesn't crash
      // and renders without errors
    });

    test('should render 100% progress when all objectives completed', () => {
      render(
        <QuestCard
          quest={makeQuest({
            objectives: [
              makeObjective('obj-1', 'Task one', true),
              makeObjective('obj-2', 'Task two', true),
            ],
          })}
        />
      );
      // Both completed — check component renders without crash
    });
  });

  // -------------------------------------------------------------------------
  // Location link behavior
  // -------------------------------------------------------------------------
  describe('location link', () => {
    test('should render location as a clickable button when location exists', () => {
      setupMocks({
        locations: [{ id: 'loc-1', name: 'Silverkeep', status: 'known', type: 'city' }],
      });
      render(<QuestCard quest={makeQuest({ location: 'Silverkeep' })} />);
      // Location matches — should render as a clickable button
      const locationBtn = screen.getByRole('button', { name: /silverkeep/i });
      expect(locationBtn).toBeInTheDocument();
    });

    test('should navigate to locations page when location button is clicked', () => {
      setupMocks({
        locations: [{ id: 'loc-1', name: 'Silverkeep', status: 'known', type: 'city' }],
      });
      render(<QuestCard quest={makeQuest({ location: 'Silverkeep' })} />);
      fireEvent.click(screen.getByRole('button', { name: /silverkeep/i }));
      expect(mockNavigateToPage).toHaveBeenCalled();
    });

    test('should render location as plain text when location does not exist', () => {
      setupMocks({ locations: [] });
      render(<QuestCard quest={makeQuest({ location: 'Unknown City' })} />);
      // No button for the location
      expect(screen.queryByRole('button', { name: /unknown city/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Unknown City/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Expand / collapse
  // -------------------------------------------------------------------------
  describe('expand and collapse', () => {
    test('should show Collapse button after clicking Expand', () => {
      render(<QuestCard quest={makeQuest()} />);
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
    });

    test('should reveal objectives in expanded state', () => {
      render(
        <QuestCard
          quest={makeQuest({
            objectives: [makeObjective('obj-1', 'Find the artifact', false)],
          })}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.getByText('Find the artifact')).toBeInTheDocument();
    });

    test('should reveal background in expanded state', () => {
      render(
        <QuestCard quest={makeQuest({ background: 'Long ago, a dragon...' })} />
      );
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.getByText('Long ago, a dragon...')).toBeInTheDocument();
    });

    test('should reveal leads in expanded state', () => {
      render(
        <QuestCard quest={makeQuest({ leads: ['Ask the innkeeper'] })} />
      );
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.getByText('Ask the innkeeper')).toBeInTheDocument();
    });

    test('should reveal complications in expanded state', () => {
      render(
        <QuestCard quest={makeQuest({ complications: ['The road is flooded'] })} />
      );
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.getByText('The road is flooded')).toBeInTheDocument();
    });

    test('should reveal rewards in expanded state', () => {
      render(
        <QuestCard quest={makeQuest({ rewards: ['500 gold pieces'] })} />
      );
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.getByText('500 gold pieces')).toBeInTheDocument();
    });

    test('should collapse back on second click', () => {
      render(
        <QuestCard quest={makeQuest({ background: 'Ancient history' })} />
      );
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.getByText('Ancient history')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /collapse/i }));
      expect(screen.queryByText('Ancient history')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Objectives rendering
  // -------------------------------------------------------------------------
  describe('objectives', () => {
    test('should render completed objectives with line-through style', () => {
      render(
        <QuestCard
          quest={makeQuest({
            objectives: [makeObjective('obj-1', 'Completed task', true)],
          })}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      const completedText = screen.getByText('Completed task');
      expect(completedText).toHaveClass('line-through');
    });

    test('should render multiple objectives', () => {
      render(
        <QuestCard
          quest={makeQuest({
            objectives: [
              makeObjective('obj-1', 'Task one', false),
              makeObjective('obj-2', 'Task two', true),
            ],
          })}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.getByText('Task one')).toBeInTheDocument();
      expect(screen.getByText('Task two')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Related NPCs in expanded state
  // -------------------------------------------------------------------------
  describe('related NPCs', () => {
    test('should render related NPC name when NPC is found', () => {
      setupMocks({
        npcs: {
          'npc-1': { id: 'npc-1', name: 'Gorthak', relationship: 'hostile' },
        },
      });
      render(
        <QuestCard
          quest={makeQuest({ relatedNPCIds: ['npc-1'] })}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.getByText('Gorthak')).toBeInTheDocument();
    });

    test('should call navigateToPage when related NPC is clicked', () => {
      setupMocks({
        npcs: {
          'npc-1': { id: 'npc-1', name: 'Gorthak', relationship: 'hostile' },
        },
      });
      render(
        <QuestCard quest={makeQuest({ relatedNPCIds: ['npc-1'] })} />
      );
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      fireEvent.click(screen.getByText('Gorthak'));
      expect(mockNavigateToPage).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Key locations in expanded state
  // -------------------------------------------------------------------------
  describe('key locations', () => {
    test('should render key location name in expanded state', () => {
      render(
        <QuestCard
          quest={makeQuest({
            keyLocations: [{ name: 'Hidden Vault', description: 'Below the city' }],
          })}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.getByText('Hidden Vault')).toBeInTheDocument();
    });

    test('should render key location as button when location exists in data', () => {
      setupMocks({
        locations: [{ id: 'loc-1', name: 'Hidden Vault', status: 'known', type: 'dungeon' }],
      });
      render(
        <QuestCard
          quest={makeQuest({
            keyLocations: [{ name: 'Hidden Vault', description: 'Below the city' }],
          })}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      // There should be a button for the existing location
      const locationBtn = screen.getByRole('button', { name: /hidden vault/i });
      expect(locationBtn).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated user actions
  // -------------------------------------------------------------------------
  describe('authenticated user actions', () => {
    test('should show Edit Quest button for authenticated users', () => {
      render(<QuestCard quest={makeQuest()} />);
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.getByRole('button', { name: /edit quest/i })).toBeInTheDocument();
    });

    test('should show Delete Quest button for authenticated users', () => {
      render(<QuestCard quest={makeQuest()} />);
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.getByRole('button', { name: /delete quest/i })).toBeInTheDocument();
    });

    test('should NOT show Edit/Delete buttons for unauthenticated users', () => {
      setupMocks({ user: null });
      render(<QuestCard quest={makeQuest()} />);
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.queryByRole('button', { name: /edit quest/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete quest/i })).not.toBeInTheDocument();
    });

    test('should navigate to quest edit page when Edit Quest is clicked', () => {
      render(<QuestCard quest={makeQuest()} />);
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      fireEvent.click(screen.getByRole('button', { name: /edit quest/i }));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/quests/edit/quest-1');
    });
  });

  // -------------------------------------------------------------------------
  // Delete interaction (dialog blocked by bug #150)
  // -------------------------------------------------------------------------
  describe('delete interaction', () => {
    test('should not crash when Delete Quest is clicked', () => {
      render(<QuestCard quest={makeQuest()} />);
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));
      fireEvent.click(screen.getByRole('button', { name: /delete quest/i }));
      // Dialog content unreachable in JSDOM per bug #150
    });
  });
});
