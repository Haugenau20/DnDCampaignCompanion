// src/features/campaign-entities/locations/context/__tests__/LocationContext.batch.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { LocationProvider, useLocations } from 'features/campaign-entities/locations/context/LocationContext';

/**
 * T017: the location directory's batch status change, ONE batched write for
 * the whole selection. There is no batch delete: see `updateLocationsStatus`.
 */

const mockBatchOperations = jest.fn();
const mockUpdateData = jest.fn();
let mockLocations: any[] = [];

jest.mock('features/user-management', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
  useUser: () => ({
    userProfile: { username: 'Frodo' },
    activeGroupUserProfile: { username: 'Frodo', activeCharacterId: null },
  }),
  useGroups: () => ({ activeGroupId: 'g1' }),
  useCampaigns: () => ({ activeCampaignId: 'c1' }),
}));

jest.mock('features/campaign-entities/locations/hooks/useLocationData', () => ({
  useLocationData: () => ({
    locations: mockLocations,
    loading: false,
    error: null,
    refreshLocations: jest.fn(),
    hasRequiredContext: true,
  }),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: () => ({
    addData: jest.fn(),
    updateData: mockUpdateData,
    deleteData: jest.fn(),
    error: null,
  }),
}));

jest.mock('core/services/firebase', () => ({
  __esModule: true,
  default: { document: { batchOperations: (ops: unknown) => mockBatchOperations(ops) } },
}));

let context: ReturnType<typeof useLocations>;
const Probe = () => {
  context = useLocations();
  return null;
};

async function renderContext() {
  render(
    <LocationProvider>
      <Probe />
    </LocationProvider>
  );
  await waitFor(() => expect(context.locations).toHaveLength(mockLocations.length));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLocations = [
    { id: 'gondolin', name: 'Gondolin', status: 'known' },
    { id: 'square', name: 'Square', parentId: 'gondolin', status: 'known' },
    { id: 'bree', name: 'Bree', status: 'visited' },
  ];
  mockBatchOperations.mockResolvedValue(undefined);
});

describe('LocationContext.updateLocationsStatus', () => {
  it('sets the status of every selected location in one batch, attributed to the writer', async () => {
    await renderContext();

    await act(async () => {
      await context.updateLocationsStatus(['gondolin', 'bree'], 'explored');
    });

    expect(mockBatchOperations).toHaveBeenCalledTimes(1);
    const writes = mockBatchOperations.mock.calls[0][0];
    expect(writes.map((w: any) => [w.type, w.collection, w.id, w.data.status])).toEqual([
      ['update', 'groups/g1/campaigns/c1/locations', 'gondolin', 'explored'],
      ['update', 'groups/g1/campaigns/c1/locations', 'bree', 'explored'],
    ]);
    for (const write of writes) {
      expect(write.data.modifiedBy).toBe('user-1');
    }
    expect(mockUpdateData).not.toHaveBeenCalled();
  });

  it('changes only the selected places, not what is inside them', async () => {
    await renderContext();

    await act(async () => {
      await context.updateLocationsStatus(['gondolin'], 'visited');
    });

    const ids = mockBatchOperations.mock.calls[0][0].map((w: any) => w.id);
    expect(ids).toEqual(['gondolin']);
  });

  it('writes nothing when any selected location is unknown', async () => {
    await renderContext();

    await expect(context.updateLocationsStatus(['bree', 'gone'], 'explored')).rejects.toThrow(
      'One or more locations not found'
    );
    expect(mockBatchOperations).not.toHaveBeenCalled();
  });
});
