// src/features/campaign-entities/locations/context/__tests__/LocationContext.cross-session.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { LocationProvider, useLocations } from '../LocationContext';
import { DocumentAlreadyExistsError } from 'core/services/firebase/data/DocumentAlreadyExistsError';

/**
 * Bug #1402 for locations: another session already took the slug.
 *
 * The fake server refuses ids it holds, like `DocumentService.createDocument`,
 * while this client's loaded `locations` list stays empty (the stale view).
 */

const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseGroups = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseLocationData = jest.fn();
const mockUseFirebaseData = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useGroups: () => mockUseGroups(),
  useCampaigns: () => mockUseCampaigns(),
}));

jest.mock('../../hooks/useLocationData', () => ({
  useLocationData: () => mockUseLocationData(),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

const Probe = ({ onContext }: { onContext: (context: any) => void }) => {
  const context = useLocations();
  React.useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return null;
};

const locationData = (name: string) => ({
  name,
  type: 'city' as const,
  status: 'known' as const,
  description: 'A tower city',
  features: [],
  notes: [],
});

describe('LocationContext: cross-session id collision (#1402)', () => {
  let context: any;
  let serverIds: Set<string>;
  let mockAddData: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    context = null;
    serverIds = new Set();

    mockAddData = jest.fn(async (_data: unknown, id: string) => {
      if (serverIds.has(id)) throw new DocumentAlreadyExistsError('locations', id);
      serverIds.add(id);
      return id;
    });

    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } });
    mockUseUser.mockReturnValue({ userProfile: { uid: 'u1' } });
    mockUseGroups.mockReturnValue({ activeGroupId: 'g1' });
    mockUseCampaigns.mockReturnValue({ activeCampaignId: 'c1' });
    mockUseLocationData.mockReturnValue({
      locations: [],
      loading: false,
      error: null,
      refreshLocations: jest.fn(),
      hasRequiredContext: true,
    });
    mockUseFirebaseData.mockReturnValue({
      addData: mockAddData,
      updateData: jest.fn(),
      deleteData: jest.fn(),
    });
  });

  const renderContext = async () => {
    render(
      <LocationProvider>
        <Probe onContext={c => { context = c; }} />
      </LocationProvider>
    );
    await waitFor(() => expect(context).not.toBeNull());
  };

  test('creates the location under the next free id when another session already took the slug', async () => {
    serverIds.add('minas-tirith');
    await renderContext();

    let id = '';
    await act(async () => {
      id = await context.createLocation(locationData('Minas Tirith'));
    });

    expect(id).toBe('minas-tirith-2');
    expect(mockAddData).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'minas-tirith-2', name: 'Minas Tirith' }),
      'minas-tirith-2'
    );
  });

  test('never lets the guard\'s developer message reach the caller, even when every retry is refused', async () => {
    mockAddData.mockImplementation(async (_data: unknown, id: string) => {
      throw new DocumentAlreadyExistsError('locations', id);
    });
    await renderContext();

    let caught: Error | null = null;
    await act(async () => {
      try {
        await context.createLocation(locationData('Minas Tirith'));
      } catch (e) {
        caught = e as Error;
      }
    });

    expect(caught).not.toBeNull();
    expect(caught!.message).not.toMatch(/updateDocumentWithAttribution|setDocument|createDocument/);
    expect(mockAddData.mock.calls.length).toBeLessThanOrEqual(25);
  });
});
