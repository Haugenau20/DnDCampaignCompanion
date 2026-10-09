// src/features/campaign-entities/locations/context/__tests__/LocationContext.delete-fence.test.tsx
//
// T088 (DATA-006): deleting a location took its children from this client's
// list, so a place added inside it or moved into it meanwhile was orphaned,
// and one moved out was deleted anyway. Now the place is marked first --
// the rules then refuse anything new inside it -- and each level is found by
// asking the server, after its parent was marked. A child is marked (or, when
// the children are kept, moved) only if the server still has it inside.
//
// "The server" here is `serverTree`, which a test lets drift from the list
// the provider holds.
import React from 'react';
import { render, act } from '@testing-library/react';
import { LocationProvider, useLocations } from '../LocationContext';
import { Location } from '../../types';

const mockUseLocationData = jest.fn();
const mockUseFirebaseData = jest.fn();

// Notes are documents of their own (T133); see the mock.
jest.mock('features/campaign-entities/shared/recordNotes', () => require('@/test-utils/record-notes-mock').recordNotesMock());

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

const place = (id: string, parentId = '', extra: Partial<Location> = {}): Location =>
  ({ id, name: id, type: 'city', status: 'known', description: '', parentId, ...extra } as Location);

/** Beleriand > Gondolin > King's square > Fountain, and Doriath beside Gondolin. */
const LOCAL = [
  place('beleriand'),
  place('gondolin', 'beleriand'),
  place('kings-square', 'gondolin'),
  place('fountain', 'kings-square'),
  place('doriath', 'beleriand'),
];

let serverTree: Location[];
/** Every write, in order, as `op:id` plus what it wrote. */
let log: Array<{ op: string; id: string; data?: Partial<Location> }>;
let context: ReturnType<typeof useLocations>;

const Probe = () => {
  context = useLocations();
  return null;
};

/** Applies an update to the fake server, as a committed write would. */
const apply = (id: string, data: Partial<Location>) => {
  serverTree = serverTree.map((l) => (l.id === id ? { ...l, ...data } : l));
};

beforeEach(() => {
  serverTree = LOCAL.map((l) => ({ ...l }));
  log = [];
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
      log.push({ op: 'delete', id });
      serverTree = serverTree.filter((l) => l.id !== id);
    }),
    queryData: jest.fn(async (field: string, value: unknown) => {
      log.push({ op: `query:${String(value)}`, id: String(value) });
      return serverTree.filter((l) => (l as any)[field] === value).map((l) => ({ ...l }));
    }),
    updateManyAfterReading: jest.fn(async (decide: any) => {
      const updates = await decide(async (id: string) => serverTree.find((l) => l.id === id));
      for (const update of updates) {
        log.push({ op: 'update', id: update.id, data: update.data });
        apply(update.id, update.data);
      }
    }),
  });
});

const mount = () =>
  render(
    <LocationProvider>
      <Probe />
    </LocationProvider>
  );

const ids = (op: string) => log.filter((entry) => entry.op === op).map((entry) => entry.id);
const remove = (id: string, strategy?: 'delete-subtree' | 'promote-to-grandparent') => {
  mount();
  return act(async () => {
    await context.deleteLocation(id, strategy);
  });
};

describe('deleting a whole subtree', () => {
  it('marks the place before it asks what is inside it', async () => {
    await remove('gondolin', 'delete-subtree');

    expect(log[0]).toEqual({ op: 'update', id: 'gondolin', data: { deleting: 'delete-subtree' } });
    expect(log[1].op).toBe('query:gondolin');
  });

  it('marks each level before asking what is inside it, and deletes deepest first', async () => {
    await remove('gondolin', 'delete-subtree');

    const marked = log.filter((entry) => entry.op === 'update').map((entry) => entry.id);
    expect(marked).toEqual(['gondolin', 'kings-square', 'fountain']);
    expect(log.findIndex((e) => e.op === 'update' && e.id === 'kings-square'))
      .toBeLessThan(log.findIndex((e) => e.op === 'query:kings-square'));
    expect(ids('delete')).toEqual(['fountain', 'kings-square', 'gondolin']);
  });

  it('deletes a place another member added inside it, which this client never saw', async () => {
    serverTree.push(place('hidden-gate', 'gondolin'));

    await remove('gondolin', 'delete-subtree');

    expect(ids('delete')).toContain('hidden-gate');
  });

  it('keeps a place another member moved out of it before it was marked', async () => {
    apply('kings-square', { parentId: 'doriath' });

    await remove('gondolin', 'delete-subtree');

    expect(ids('delete')).toEqual(['gondolin']);
    expect(serverTree.map((l) => l.id)).toEqual(expect.arrayContaining(['kings-square', 'fountain']));
  });

  it('keeps a place moved out between the question and the mark', async () => {
    // The server's answer still lists it; the transaction that marks it
    // reads it again and finds it gone elsewhere.
    const { queryData } = mockUseFirebaseData();
    const ask = queryData.getMockImplementation();
    queryData.mockImplementation(async (field: string, value: unknown) => {
      const found = await ask(field, value);
      if (value === 'gondolin') apply('kings-square', { parentId: 'doriath' });
      return found;
    });

    await remove('gondolin', 'delete-subtree');

    expect(ids('delete')).toEqual(['gondolin']);
    // Nor marked: a marked place takes no edit, so it would be frozen where it went.
    expect(serverTree.find((l) => l.id === 'kings-square')).not.toHaveProperty('deleting');
    expect(serverTree.find((l) => l.id === 'fountain')).not.toHaveProperty('deleting');
  });

  it('finishes a deletion that failed partway, marking nothing twice', async () => {
    apply('gondolin', { deleting: 'delete-subtree' } as Partial<Location>);
    apply('kings-square', { deleting: 'delete-subtree' } as Partial<Location>);
    serverTree = serverTree.filter((l) => l.id !== 'fountain');

    await remove('gondolin');

    expect(log.filter((e) => e.op === 'update')).toEqual([]);
    expect(ids('delete')).toEqual(['kings-square', 'gondolin']);
  });

  it('terminates on a parent cycle', async () => {
    serverTree = [place('a', 'b'), place('b', 'a'), place('inner', 'a')];

    await remove('a', 'delete-subtree');

    expect(ids('delete').sort()).toEqual(['a', 'b', 'inner']);
  });
});

describe('deleting a place and keeping what is inside it', () => {
  it('marks it, then moves every child the server still has inside it up a level, then deletes it', async () => {
    serverTree.push(place('hidden-gate', 'gondolin'));

    await remove('gondolin', 'promote-to-grandparent');

    expect(log[0]).toEqual({ op: 'update', id: 'gondolin', data: { deleting: 'promote-to-grandparent' } });
    const moved = log.filter((e) => e.op === 'update' && e.data?.parentId !== undefined);
    expect(moved.map((e) => [e.id, e.data?.parentId])).toEqual([
      ['kings-square', 'beleriand'],
      ['hidden-gate', 'beleriand'],
    ]);
    expect(ids('delete')).toEqual(['gondolin']);
    expect(log[log.length - 1]).toEqual({ op: 'delete', id: 'gondolin' });
  });

  it('leaves a child that moved elsewhere where it went', async () => {
    apply('kings-square', { parentId: 'doriath' });

    await remove('gondolin', 'promote-to-grandparent');

    expect(serverTree.find((l) => l.id === 'kings-square')?.parentId).toBe('doriath');
  });

  it('finishes the way the deletion started, whatever the retry asks', async () => {
    apply('gondolin', { deleting: 'promote-to-grandparent' } as Partial<Location>);

    await remove('gondolin', 'delete-subtree');

    expect(serverTree.find((l) => l.id === 'kings-square')?.parentId).toBe('beleriand');
    expect(ids('delete')).toEqual(['gondolin']);
  });
});

it('refuses a place the server no longer has, and writes nothing', async () => {
  serverTree = serverTree.filter((l) => l.id !== 'gondolin');
  mount();

  await act(async () => {
    await expect(context.deleteLocation('gondolin')).rejects.toThrow('Location not found');
  });
  expect(ids('delete')).toEqual([]);
});
