// src/features/campaign-entities/locations/context/__tests__/LocationContext.images.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { LocationProvider, useLocations } from 'features/campaign-entities/locations/context/LocationContext';

/**
 * T021: deleting a location also deletes its picture -- and, when the whole
 * subtree goes, every deleted place's picture. Moving children up keeps theirs.
 */

const mockDeleteData = jest.fn();
const mockUpdateData = jest.fn();
const mockRemoveImage = jest.fn();
let mockLocations: any[] = [];

jest.mock('features/user-management', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
  useUser: () => ({ userProfile: {}, activeGroupUserProfile: {} }),
  useGroups: () => ({ activeGroupId: 'g1' }),
  useCampaigns: () => ({ activeCampaignId: 'c1' }),
}));

jest.mock('features/campaign-entities/locations/hooks/useLocationData', () => ({
  useLocationData: () => ({
    locations: mockLocations,
    loading: false,
    error: null,
    refreshLocations: jest.fn().mockResolvedValue(undefined),
    hasRequiredContext: true,
  }),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: () => ({
    addData: jest.fn(),
    updateData: mockUpdateData,
    deleteData: mockDeleteData,
    error: null,
  }),
}));

jest.mock('core/services/firebase', () => ({
  images: { remove: (path: string) => mockRemoveImage(path) },
}));

const picture = (id: string) => ({
  path: `groups/g1/campaigns/c1/locations/${id}/p.webp`,
  url: 'https://example/p',
  width: 1,
  height: 1,
  uploadedBy: 'user-1',
  uploadedAt: '2026-09-24T12:00:00.000Z',
});

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
  // gondolin ⊃ square ⊃ fountain; square has no picture.
  mockLocations = [
    { id: 'gondolin', name: 'Gondolin', image: picture('gondolin') },
    { id: 'square', name: 'Square', parentId: 'gondolin' },
    { id: 'fountain', name: 'Fountain', parentId: 'square', image: picture('fountain') },
    { id: 'doriath', name: 'Doriath', image: picture('doriath') },
  ];
  mockDeleteData.mockResolvedValue(undefined);
  mockUpdateData.mockResolvedValue(undefined);
  mockRemoveImage.mockResolvedValue(undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('deleting a location', () => {
  it('with its subtree, deletes every deleted place\'s picture and no other', async () => {
    await renderContext();

    await act(() => context.deleteLocation('gondolin', 'delete-subtree'));

    expect(mockRemoveImage.mock.calls.map(([path]) => path).sort()).toEqual(
      [picture('fountain').path, picture('gondolin').path].sort()
    );
  });

  it('deletes the pictures only after the documents', async () => {
    const order: string[] = [];
    mockDeleteData.mockImplementation(async (id: string) => { order.push(`document ${id}`); });
    mockRemoveImage.mockImplementation(async () => { order.push('image'); });
    await renderContext();

    await act(() => context.deleteLocation('gondolin', 'delete-subtree'));

    expect(order.indexOf('image')).toBeGreaterThan(order.lastIndexOf('document gondolin'));
  });

  it('moving the children up deletes only this place\'s picture', async () => {
    await renderContext();

    await act(() => context.deleteLocation('gondolin', 'promote-to-grandparent'));

    expect(mockRemoveImage).toHaveBeenCalledTimes(1);
    expect(mockRemoveImage).toHaveBeenCalledWith(picture('gondolin').path);
  });

  it('keeps every picture when a document delete fails', async () => {
    mockDeleteData.mockRejectedValue(new Error('permission-denied'));
    await renderContext();

    await act(async () => {
      await context.deleteLocation('gondolin', 'delete-subtree').catch(() => undefined);
    });

    expect(mockRemoveImage).not.toHaveBeenCalled();
  });
});
