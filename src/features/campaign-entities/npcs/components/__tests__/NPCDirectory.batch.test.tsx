// src/features/campaign-entities/npcs/components/__tests__/NPCDirectory.batch.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import NPCDirectory from '../NPCDirectory';
import { NPC, NPCStatus, NPCRelationship } from 'features/campaign-entities/npcs/types';

/**
 * T017: select several NPCs, then change their status or delete them in one go.
 * The rumour directory's batch actions are the pattern; these are NPC-shaped.
 */

jest.mock('shared/context/NavigationContext', () => ({
  useNavigation: () => ({
    navigateToPage: jest.fn(),
    createPath: jest.fn((path: string) => path),
    getCurrentQueryParams: jest.fn(() => ({})),
  }),
}));

jest.mock('../../../quests/context/QuestContext', () => ({
  useQuests: () => ({ getQuestById: jest.fn(() => undefined) }),
}));

const mockUpdateNPCsStatus = jest.fn();
const mockDeleteNPCs = jest.fn();

jest.mock('features/campaign-entities/npcs/context/NPCContext', () => ({
  useNPCs: () => ({
    updateNPCNote: jest.fn(),
    deleteNPC: jest.fn(),
    updateNPCRelationship: jest.fn(),
    updateNPCsStatus: mockUpdateNPCsStatus,
    deleteNPCs: mockDeleteNPCs,
  }),
}));

jest.mock('../../../locations/context/LocationContext', () => ({
  useLocations: () => ({ locations: [] }),
}));

jest.mock('@/features/user-management', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
  useFirebase: jest.fn(() => ({ activeGroupId: 'group-1' })),
}));

jest.mock('shared/utils/attribution-utils', () => ({
  determineAttributionActor: jest.fn(() => ''),
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));
jest.mock('core/services/firebase', () => ({ default: {} }));

function makeNPC(overrides: Partial<NPC>): NPC {
  return {
    id: 'npc',
    name: 'Test NPC',
    status: 'alive' as NPCStatus,
    relationship: 'neutral' as NPCRelationship,
    description: '',
    location: 'Silverkeep',
    race: 'Human',
    connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
    notes: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  } as NPC;
}

const npcs = [
  makeNPC({ id: 'npc-1', name: 'Aldric' }),
  makeNPC({ id: 'npc-2', name: 'Mira', location: 'Ironhold' }),
  makeNPC({ id: 'npc-3', name: 'Rolf' }),
];

const renderDirectory = () => render(<NPCDirectory npcs={npcs} />);
const enterSelection = () => fireEvent.click(screen.getByRole('button', { name: 'Select NPCs' }));
const tick = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name: `Select ${name}` }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateNPCsStatus.mockResolvedValue(undefined);
  mockDeleteNPCs.mockResolvedValue(undefined);
});

describe('NPCDirectory batch actions', () => {
  it('shows no checkboxes until selection mode is entered', () => {
    renderDirectory();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    enterSelection();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('offers the actions once something is ticked, and counts the selection', () => {
    renderDirectory();
    enterSelection();
    expect(screen.queryByRole('button', { name: 'Mark Deceased' })).not.toBeInTheDocument();

    tick('Aldric');
    expect(screen.getByText('1 NPC selected')).toBeInTheDocument();
    tick('Mira');
    expect(screen.getByText('2 NPCs selected')).toBeInTheDocument();
  });

  it('sets the status of every ticked NPC in one call, then leaves selection mode', async () => {
    renderDirectory();
    enterSelection();
    tick('Aldric');
    tick('Rolf');

    fireEvent.click(screen.getByRole('button', { name: 'Mark Deceased' }));

    await waitFor(() => expect(mockUpdateNPCsStatus).toHaveBeenCalledTimes(1));
    expect(mockUpdateNPCsStatus).toHaveBeenCalledWith(['npc-1', 'npc-3'], 'deceased');
    await waitFor(() => expect(screen.queryByRole('checkbox')).not.toBeInTheDocument());
  });

  it('offers every status the NPC model has', () => {
    renderDirectory();
    enterSelection();
    tick('Aldric');
    for (const label of ['Mark Alive', 'Mark Unknown', 'Mark Missing', 'Mark Deceased']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('reports a failed status change and keeps the selection', async () => {
    mockUpdateNPCsStatus.mockRejectedValue(new Error('permission-denied'));
    renderDirectory();
    enterSelection();
    tick('Aldric');

    fireEvent.click(screen.getByRole('button', { name: 'Mark Missing' }));

    expect(await screen.findByText(/Failed to update NPC status: permission-denied/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Aldric' })).toBeChecked();
  });

  it('deletes every ticked NPC in one call, only after confirmation', async () => {
    renderDirectory();
    enterSelection();
    tick('Aldric');
    tick('Mira');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mockDeleteNPCs).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /delete npc/i }));

    await waitFor(() => expect(mockDeleteNPCs).toHaveBeenCalledWith(['npc-1', 'npc-2']));
    expect(mockDeleteNPCs).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('checkbox')).not.toBeInTheDocument());
  });

  it('forgets the selection when selection mode is left', () => {
    renderDirectory();
    enterSelection();
    tick('Aldric');
    fireEvent.click(screen.getByRole('button', { name: 'Exit Selection' }));
    enterSelection();

    expect(screen.getByRole('checkbox', { name: 'Select Aldric' })).not.toBeChecked();
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();
  });
});
