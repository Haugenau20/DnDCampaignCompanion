// src/features/campaign-entities/locations/context/__tests__/LocationContext.hierarchy.test.tsx
//
// The two writes `15-4` adds: moving a location under a new parent, and
// deleting one that holds others.
//
// Both exist because the page makes the hierarchy editable for the first time.
// Nothing in the product could choose a parent before this PR, so `PERF-11`'s
// unterminating walks needed hand-edited data to reach; *Move elsewhere* puts
// them one click away, which is why §6.3 makes the cycle guard a gate.

import React from 'react';
import { render, act } from '@testing-library/react';
import { LocationProvider, useLocations } from '../LocationContext';
import { Location } from '../../types';

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

const place = (id: string, name: string, parentId?: string): Location =>
  ({
    id,
    name,
    type: 'city',
    status: 'known',
    description: '',
    parentId,
  } as Location);

/**
 * Beleriand > Gondolin > King's square > the fountain, plus Doriath as
 * Gondolin's sibling. Four levels, which is what the depth-4 gate needs.
 */
const TREE = [
  place('beleriand', 'Beleriand'),
  place('gondolin', 'Gondolin', 'beleriand'),
  place('kings-square', "King's square", 'gondolin'),
  place('fountain', 'The fountain', 'kings-square'),
  place('doriath', 'Doriath', 'beleriand'),
];

const Probe = ({ onContext }: { onContext: (context: any) => void }) => {
  const context = useLocations();
  React.useEffect(() => onContext(context), [context, onContext]);
  return null;
};

describe('LocationContext — moving and deleting in a tree', () => {
  let context: any;
  let updateData: jest.Mock;
  let deleteData: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    context = null;
    updateData = jest.fn().mockResolvedValue(undefined);
    deleteData = jest.fn().mockResolvedValue(undefined);

    mockUseAuth.mockReturnValue({ user: { uid: 'user-1' } });
    mockUseUser.mockReturnValue({ userProfile: {}, activeGroupUserProfile: {} });
    mockUseGroups.mockReturnValue({ activeGroupId: 'group-1' });
    mockUseCampaigns.mockReturnValue({ activeCampaignId: 'campaign-1' });
    mockUseLocationData.mockReturnValue({
      locations: TREE,
      loading: false,
      error: null,
      refreshLocations: jest.fn(),
      hasRequiredContext: true,
    });
    mockUseFirebaseData.mockReturnValue({
      addData: jest.fn(),
      updateData,
      deleteData,
    });

    render(
      <LocationProvider>
        <Probe onContext={(value) => { context = value; }} />
      </LocationProvider>
    );
  });

  describe('moveLocation', () => {
    it('writes the new parent', async () => {
      await act(async () => {
        await context.moveLocation('gondolin', 'doriath');
      });
      expect(updateData).toHaveBeenCalledWith('gondolin', { parentId: 'doriath' });
    });

    it("writes '' for the top level, because Firestore rejects undefined", async () => {
      await act(async () => {
        await context.moveLocation('gondolin', undefined);
      });
      expect(updateData).toHaveBeenCalledWith('gondolin', { parentId: '' });
    });

    it('refuses to put a place inside itself, and says so by name', async () => {
      await act(async () => {
        await expect(context.moveLocation('gondolin', 'gondolin')).rejects.toThrow(
          'Gondolin cannot be inside itself.'
        );
      });
      expect(updateData).not.toHaveBeenCalled();
    });

    it('refuses a descendant at any depth, naming both places', async () => {
      // The tray already excludes these, so reaching here means something
      // bypassed it. A cycle written once poisons every walk over the campaign.
      await act(async () => {
        await expect(context.moveLocation('beleriand', 'fountain')).rejects.toThrow(
          'The fountain is already inside Beleriand.'
        );
      });
      expect(updateData).not.toHaveBeenCalled();
    });

    it('allows a sibling and an ancestor', async () => {
      await act(async () => {
        await context.moveLocation('kings-square', 'beleriand');
      });
      expect(updateData).toHaveBeenCalledWith('kings-square', { parentId: 'beleriand' });
    });
  });

  describe('deleteLocation — what happens to the places inside', () => {
    it('promotes the children to the grandparent, keeping their own subtrees', async () => {
      await act(async () => {
        await context.deleteLocation('gondolin', 'promote-to-grandparent');
      });

      // King's square moves up to Beleriand...
      expect(updateData).toHaveBeenCalledWith('kings-square', { parentId: 'beleriand' });
      // ...and the fountain travels with it, untouched: only the edge that
      // pointed at the deleted location is broken.
      expect(updateData).not.toHaveBeenCalledWith('fountain', expect.anything());
      expect(deleteData).toHaveBeenCalledTimes(1);
      expect(deleteData).toHaveBeenCalledWith('gondolin');
    });

    it('re-homes the children before deleting the parent, never after', async () => {
      // The other order leaves a window in which a reader sees children
      // pointing at an id that no longer resolves -- the dangling-parent state
      // #303 catalogued, created deliberately by the fix for orphaning.
      const order: string[] = [];
      updateData.mockImplementation((id: string) => {
        order.push(`update:${id}`);
        return Promise.resolve();
      });
      deleteData.mockImplementation((id: string) => {
        order.push(`delete:${id}`);
        return Promise.resolve();
      });

      await act(async () => {
        await context.deleteLocation('gondolin', 'promote-to-grandparent');
      });

      expect(order).toEqual(['update:kings-square', 'delete:gondolin']);
    });

    it('promotes to the top level when the deleted place had no parent', async () => {
      await act(async () => {
        await context.deleteLocation('beleriand', 'promote-to-grandparent');
      });
      expect(updateData).toHaveBeenCalledWith('gondolin', { parentId: '' });
      expect(updateData).toHaveBeenCalledWith('doriath', { parentId: '' });
    });

    it('takes the whole subtree when asked to, deepest first', async () => {
      await act(async () => {
        await context.deleteLocation('gondolin', 'delete-subtree');
      });

      expect(deleteData.mock.calls.map(([id]: [string]) => id)).toEqual([
        'fountain',
        'kings-square',
        'gondolin',
      ]);
      expect(updateData).not.toHaveBeenCalled();
    });

    it('still takes the subtree when no strategy is named', async () => {
      // The default is today's behaviour rather than the kinder one: every
      // caller written before this question existed passes one argument, and
      // changing what that means silently would be the same class of surprise
      // this PR exists to fix, pointed the other way.
      await act(async () => {
        await context.deleteLocation('gondolin');
      });
      expect(deleteData.mock.calls.map(([id]: [string]) => id)).toEqual([
        'fountain',
        'kings-square',
        'gondolin',
      ]);
    });
  });

  describe('cycle safety in the writes themselves (§6.3)', () => {
    // Asserted, not eyeballed. Without the visited sets these calls do not
    // return and the suite times out.
    beforeEach(() => {
      mockUseLocationData.mockReturnValue({
        locations: [
          place('a', 'Alpha', 'b'),
          place('b', 'Beta', 'a'),
          place('inner', 'Inner', 'a'),
        ],
        loading: false,
        error: null,
        refreshLocations: jest.fn(),
        hasRequiredContext: true,
      });
      render(
        <LocationProvider>
          <Probe onContext={(value) => { context = value; }} />
        </LocationProvider>
      );
    });

    it('terminates when deleting a location inside a cycle', async () => {
      await act(async () => {
        await context.deleteLocation('a', 'delete-subtree');
      });
      expect(deleteData).toHaveBeenCalledWith('a');
    });

    it('terminates when checking a move against a cycle', async () => {
      await act(async () => {
        await expect(context.moveLocation('a', 'inner')).rejects.toThrow();
      });
    });
  });
});
