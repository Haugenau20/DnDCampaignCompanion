// src/features/campaign-entities/locations/components/__tests__/LocationDirectory.batch.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocationDirectory from '../LocationDirectory';
import { Location } from 'features/campaign-entities/locations/types';

/**
 * T017: select several locations, then change their status in one go. There is
 * no batch Delete: deleting one place asks what becomes of what is inside it,
 * and a selection has no single answer to that yet.
 */

const mockUpdateLocationsStatus = jest.fn();

jest.mock('shared/context/NavigationContext', () => ({
  useNavigation: () => ({
    navigateToPage: jest.fn(),
    createPath: jest.fn((path: string) => path),
    getCurrentQueryParams: jest.fn(() => ({})),
  }),
}));

jest.mock('../../../npcs/context/NPCContext', () => ({
  useNPCs: () => ({ getNPCById: jest.fn(() => undefined) }),
}));
jest.mock('../../../quests/context/QuestContext', () => ({
  useQuests: () => ({ getQuestById: jest.fn(() => undefined) }),
}));

jest.mock('../../context/LocationContext', () => ({
  useLocations: () => ({
    updateLocationStatus: jest.fn(),
    updateLocationsStatus: mockUpdateLocationsStatus,
  }),
}));

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(() => ({ user: { uid: 'user-1' } })),
  useFirebase: jest.fn(() => ({ activeGroupId: 'group-1' })),
}));

jest.mock('shared/utils/attribution-utils', () => ({
  determineAttributionActor: jest.fn(() => ''),
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));
jest.mock('core/services/firebase', () => ({ default: {} }));

function makeLocation(id: string, name: string, overrides: Partial<Location> = {}): Location {
  return {
    id,
    name,
    type: 'city',
    status: 'known',
    description: `Description for ${name}`,
    features: [],
    connectedNPCs: [],
    relatedQuests: [],
    notes: [],
    tags: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

const locations = [
  makeLocation('bree', 'Bree'),
  makeLocation('rivendell', 'Rivendell'),
  makeLocation('moria', 'Moria'),
];

const enterSelection = () => fireEvent.click(screen.getByRole('button', { name: 'Select Locations' }));
const tick = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name: `Select ${name}` }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateLocationsStatus.mockResolvedValue(undefined);
});

describe('LocationDirectory batch actions', () => {
  it('shows checkboxes only in selection mode', () => {
    render(<LocationDirectory locations={locations} />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    enterSelection();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('offers every location status, and no Delete', () => {
    render(<LocationDirectory locations={locations} />);
    enterSelection();
    tick('Bree');

    expect(screen.getByText('1 location selected')).toBeInTheDocument();
    for (const label of ['Mark Explored', 'Mark Visited', 'Mark Known']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('sets the status of every ticked location in one call, then leaves selection mode', async () => {
    render(<LocationDirectory locations={locations} />);
    enterSelection();
    tick('Bree');
    tick('Moria');

    fireEvent.click(screen.getByRole('button', { name: 'Mark Explored' }));

    await waitFor(() => expect(mockUpdateLocationsStatus).toHaveBeenCalledWith(['bree', 'moria'], 'explored'));
    expect(mockUpdateLocationsStatus).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('checkbox')).not.toBeInTheDocument());
  });

  it('reports a failed status change and keeps the selection', async () => {
    mockUpdateLocationsStatus.mockRejectedValue(new Error('permission-denied'));
    render(<LocationDirectory locations={locations} />);
    enterSelection();
    tick('Rivendell');

    fireEvent.click(screen.getByRole('button', { name: 'Mark Visited' }));

    expect(
      await screen.findByText(/Failed to update location status: permission-denied/)
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Rivendell' })).toBeChecked();
  });
});
