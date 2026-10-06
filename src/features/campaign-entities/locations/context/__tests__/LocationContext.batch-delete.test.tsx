// src/features/campaign-entities/locations/context/__tests__/LocationContext.batch-delete.test.tsx
//
// T017: deleting several places at once, with one answer for what is inside
// them (decided 2026-10-06). Each ticked place goes through the same
// mark-then-ask-the-server protocol `deleteLocation` uses (T088), so what is
// asserted here is the end state on the fake server, `serverTree`.
import React from 'react';
import { render, act } from '@testing-library/react';
import { LocationProvider, useLocations } from '../LocationContext';
import { Location } from '../../types';

const mockUseLocationData = jest.fn();
const mockUseFirebaseData = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
  useUser: () => ({ userProfile: {}, activeGroupUserProfile: {} }),
  useGroups: () => ({ activeGroupId: 'group-1' }),
  useCampaigns: () => ({ activeCampaignId: 'campaign-1' }),
}));

jest.mock('../../hooks/useLocationData', () => ({
  useLocationData: () => mockUseLocationData(),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

const place = (id: string, parentId = ''): Location =>
  ({ id, name: id, type: 'city', status: 'known', description: '', parentId } as Location);

/** Beleriand > Gondolin > King's square > Fountain, Doriath beside Gondolin, and Angband alone. */
const LOCAL = [
  place('beleriand'),
  place('gondolin', 'beleriand'),
  place('kings-square', 'gondolin'),
  place('fountain', 'kings-square'),
  place('doriath', 'beleriand'),
  place('angband'),
];

let serverTree: Location[];
let deleted: string[];
let context: ReturnType<typeof useLocations>;

const Probe = () => {
  context = useLocations();
  return null;
};

beforeEach(() => {
  serverTree = LOCAL.map((l) => ({ ...l }));
  deleted = [];
  mockUseLocationData.mockReturnValue({
    locations: LOCAL,
    loading: false,
    error: null,
    refreshLocations: jest.fn(),
    hasRequiredContext: true,
  });
  mockUseFirebaseData.mockReturnValue({
    addData: jest.fn(),
    updateData: jest.fn(),
    updateDataAfterReading: jest.fn(),
    deleteData: jest.fn(async (id: string) => {
      deleted.push(id);
      serverTree = serverTree.filter((l) => l.id !== id);
    }),
    queryData: jest.fn(async (field: string, value: unknown) =>
      serverTree.filter((l) => (l as any)[field] === value).map((l) => ({ ...l }))
    ),
    updateManyAfterReading: jest.fn(async (decide: any) => {
      const updates = await decide(async (id: string) => serverTree.find((l) => l.id === id));
      for (const update of updates) {
        serverTree = serverTree.map((l) => (l.id === update.id ? { ...l, ...update.data } : l));
      }
    }),
  });
});

const removeAll = async (ids: string[], strategy: 'delete-subtree' | 'promote-to-grandparent') => {
  render(
    <LocationProvider>
      <Probe />
    </LocationProvider>
  );
  await act(async () => {
    await context.deleteLocations(ids, strategy);
  });
};

const parentOf = (id: string) => serverTree.find((l) => l.id === id)?.parentId;
const remaining = () => serverTree.map((l) => l.id).sort();

describe('deleting several places and everything inside them', () => {
  it('removes every ticked place and everything below it', async () => {
    await removeAll(['gondolin', 'angband'], 'delete-subtree');

    expect(remaining()).toEqual(['beleriand', 'doriath']);
  });

  it('takes a ticked place inside another with its ancestor, without failing on it', async () => {
    await removeAll(['kings-square', 'beleriand'], 'delete-subtree');

    expect(remaining()).toEqual(['angband']);
    expect(deleted.filter((id) => id === 'kings-square')).toHaveLength(1);
  });
});

describe('deleting several places and moving what is inside them up', () => {
  it('removes only the ticked places', async () => {
    await removeAll(['gondolin', 'angband'], 'promote-to-grandparent');

    expect(remaining()).toEqual(['beleriand', 'doriath', 'fountain', 'kings-square']);
    expect(parentOf('kings-square')).toBe('beleriand');
  });

  it('moves what a ticked place holds to the nearest place that is not being deleted', async () => {
    await removeAll(['gondolin', 'kings-square'], 'promote-to-grandparent');

    expect(parentOf('fountain')).toBe('beleriand');
  });

  it('stops climbing at the first place that stays', async () => {
    await removeAll(['beleriand', 'kings-square'], 'promote-to-grandparent');

    expect(parentOf('fountain')).toBe('gondolin');
    expect(parentOf('gondolin')).toBe('');
    expect(parentOf('doriath')).toBe('');
  });
});

it('skips a ticked place another member already deleted, and deletes the rest', async () => {
  serverTree = serverTree.filter((l) => l.id !== 'angband');

  await removeAll(['angband', 'doriath'], 'delete-subtree');

  expect(remaining()).not.toContain('doriath');
});

it('rejects when a write fails, so the confirmation can say so', async () => {
  const { deleteData } = mockUseFirebaseData();
  deleteData.mockImplementationOnce(async () => {
    throw new Error('Missing or insufficient permissions.');
  });
  render(
    <LocationProvider>
      <Probe />
    </LocationProvider>
  );

  await act(async () => {
    await expect(context.deleteLocations(['angband'], 'delete-subtree')).rejects.toThrow(
      'Missing or insufficient permissions.'
    );
  });
});
