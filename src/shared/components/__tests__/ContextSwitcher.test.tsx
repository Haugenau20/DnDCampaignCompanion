// src/shared/components/__tests__/ContextSwitcher.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ContextSwitcher from '../ContextSwitcher';

// ---------------------------------------------------------------------------
// Mock firebase context hooks
// ---------------------------------------------------------------------------
const mockSetActiveGroup = jest.fn();
const mockSetActiveCampaign = jest.fn();
const mockGetCampaigns = jest.fn();

// ContextSwitcher consumes JoinGroupDialog through the domain barrel, so the
// barrel mock re-exports the component stub defined further down.
jest.mock('@/features/user-management', () => ({
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
  get JoinGroupDialog() {
    // the stub below returns the component directly, not a { default } module
    const mod = require('@/features/user-management/groups/components/JoinGroupDialog');
    return mod.default || mod;
  },
}));

const { useGroups, useCampaigns } = require('@/features/user-management');

// ---------------------------------------------------------------------------
// Mock JoinGroupDialog to avoid deep dependency chain
// ---------------------------------------------------------------------------
jest.mock('@/features/user-management/groups/components/JoinGroupDialog', () => {
  const MockJoinGroupDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }> = ({ open }) => {
    if (!open) return null;
    return <div data-testid="join-group-dialog">Join Group Dialog</div>;
  };
  return MockJoinGroupDialog;
});

// ---------------------------------------------------------------------------
// window.location.reload must never be called by this component again
// ---------------------------------------------------------------------------
const mockReload = jest.fn();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockGroups = [
  { id: 'group-1', name: 'Fellowship of the Ring' },
  { id: 'group-2', name: 'Order of the Phoenix' },
];

const mockCampaigns = [
  { id: 'campaign-1', name: 'Middle Earth Adventures' },
  { id: 'campaign-2', name: 'Hogwarts Campaign' },
];

function makeGroupsMock(overrides = {}) {
  return {
    groups: mockGroups,
    activeGroupId: 'group-1',
    activeGroup: mockGroups[0],
    loading: false,
    setActiveGroup: mockSetActiveGroup,
    ...overrides,
  };
}

function makeCampaignsMock(overrides = {}) {
  return {
    campaigns: mockCampaigns,
    activeCampaignId: 'campaign-1',
    activeCampaign: mockCampaigns[0],
    setActiveCampaign: mockSetActiveCampaign,
    getCampaigns: mockGetCampaigns,
    ...overrides,
  };
}

function renderContextSwitcher(
  props: { onClose?: jest.Mock; inDialog?: boolean } = {}
) {
  return render(<ContextSwitcher {...props} />);
}

/** Open the popover from its trigger. */
function openSwitcher() {
  fireEvent.click(screen.getAllByRole('button')[0]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContextSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGroups as jest.Mock).mockReturnValue(makeGroupsMock());
    (useCampaigns as jest.Mock).mockReturnValue(makeCampaignsMock());
    mockSetActiveGroup.mockResolvedValue(undefined);
    mockSetActiveCampaign.mockResolvedValue(undefined);
    mockGetCampaigns.mockResolvedValue([]);
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });
  });

  // -------------------------------------------------------------------------
  describe('opening and closing', () => {
    test('starts closed', () => {
      renderContextSwitcher();
      expect(screen.queryByText('Select Group')).not.toBeInTheDocument();
    });

    test('opens from the trigger', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('Select Group')).toBeInTheDocument();
    });

    test('lists the groups once open', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('Fellowship of the Ring')).toBeInTheDocument();
      expect(screen.getByText('Order of the Phoenix')).toBeInTheDocument();
    });

    test('lists the campaigns once open', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('Middle Earth Adventures')).toBeInTheDocument();
      expect(screen.getByText('Hogwarts Campaign')).toBeInTheDocument();
    });

    test('closes when clicking outside', async () => {
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('Select Group')).toBeInTheDocument();

      await act(async () => {
        fireEvent.mouseDown(document.body);
      });

      await waitFor(() => {
        expect(screen.queryByText('Select Group')).not.toBeInTheDocument();
      });
    });

    test('disables the trigger while groups are loading', () => {
      (useGroups as jest.Mock).mockReturnValue(makeGroupsMock({ loading: true }));
      renderContextSwitcher();
      expect(screen.getAllByRole('button')[0]).toBeDisabled();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('reports when there are no groups', () => {
      (useGroups as jest.Mock).mockReturnValue(
        makeGroupsMock({ groups: [], loading: false })
      );
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('No groups available')).toBeInTheDocument();
    });

    test('reports when there are no campaigns', () => {
      (useCampaigns as jest.Mock).mockReturnValue(
        makeCampaignsMock({ campaigns: [] })
      );
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('No campaigns in this group')).toBeInTheDocument();
    });

    // Critical 1: CampaignSelector's `if (!activeGroupId) return null;` guard
    // is live and, until now, untested.
    test('hides the campaign section when there is no active group', () => {
      (useGroups as jest.Mock).mockReturnValue(
        makeGroupsMock({ activeGroupId: null, activeGroup: null })
      );
      renderContextSwitcher();
      openSwitcher();
      expect(screen.queryByText('Select Campaign')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Selection IS application. There is no Apply button and no staged state.
  // -------------------------------------------------------------------------
  describe('switching', () => {
    test('clicking a campaign switches to it immediately', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      expect(mockSetActiveCampaign).toHaveBeenCalledWith('campaign-2');
    });

    test('clicking a group switches to it immediately', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Order of the Phoenix'));
      });

      expect(mockSetActiveGroup).toHaveBeenCalledWith('group-2');
    });

    test('offers no Apply button', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(
        screen.queryByRole('button', { name: /apply changes/i })
      ).not.toBeInTheDocument();
    });

    test('offers no Close Without Applying button', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(
        screen.queryByRole('button', { name: /close without applying/i })
      ).not.toBeInTheDocument();
    });

    test('never reloads the page', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      expect(mockReload).not.toHaveBeenCalled();
    });

    test('closes the popover after switching', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      await waitFor(() => {
        expect(screen.queryByText('Select Group')).not.toBeInTheDocument();
      });
    });

    test('does not switch when the active campaign is clicked', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Middle Earth Adventures'));
      });

      expect(mockSetActiveCampaign).not.toHaveBeenCalled();
    });

    // Critical 2: the group-side twin of the test above -- handleSelectGroup's
    // `if (groupId === activeGroupId)` early return was untested.
    test('does not switch when the active group is clicked, but still closes the popover', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Fellowship of the Ring'));
      });

      expect(mockSetActiveGroup).not.toHaveBeenCalled();
      expect(screen.queryByText('Select Group')).not.toBeInTheDocument();
    });

    test('reports a failed switch and leaves the context alone', async () => {
      mockSetActiveCampaign.mockRejectedValue(new Error('Campaign write failed'));
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      expect(screen.getByText(/Campaign write failed/)).toBeInTheDocument();
      expect(mockReload).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Regression coverage for the bug fixed in 592b548: selecting a group used
  // to leave the PREVIOUS group's campaigns on screen, so applying could pair
  // a new group with an old group's campaign. Staged selection is gone now,
  // so that pairing is impossible by construction -- this component reads
  // `campaigns` straight from `useCampaigns()` on every render rather than
  // caching a list keyed off a "selected" group. This test asserts the
  // transition (switch group -> the group's own campaign is what a further
  // click acts on), not merely an end state, so it would fail if a future
  // change reintroduced a locally cached / stale campaign list.
  // -------------------------------------------------------------------------
  describe('campaigns follow the selected group', () => {
    test('after switching group, selecting a campaign acts on the NEW group\'s campaign, not the previous group\'s', async () => {
      const { rerender } = renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Order of the Phoenix'));
      });

      expect(mockSetActiveGroup).toHaveBeenCalledWith('group-2');

      // Simulate the app's own state catching up with the switch: the active
      // group is now group-2, and useCampaigns reports THAT group's list --
      // a list that does not even contain campaign-1's group-1 sibling.
      const councilCampaigns = [{ id: 'campaign-3', name: 'Council Business' }];
      (useGroups as jest.Mock).mockReturnValue(
        makeGroupsMock({ activeGroupId: 'group-2', activeGroup: mockGroups[1] })
      );
      (useCampaigns as jest.Mock).mockReturnValue(
        makeCampaignsMock({
          campaigns: councilCampaigns,
          activeCampaignId: null,
          activeCampaign: null,
        })
      );
      rerender(<ContextSwitcher />);

      // The switch closed the popover; reopen it to act on the new list.
      openSwitcher();
      expect(screen.getByText('Council Business')).toBeInTheDocument();
      expect(screen.queryByText('Middle Earth Adventures')).not.toBeInTheDocument();

      mockSetActiveCampaign.mockClear();

      await act(async () => {
        fireEvent.click(screen.getByText('Council Business'));
      });

      expect(mockSetActiveCampaign).toHaveBeenCalledWith('campaign-3');
      expect(mockSetActiveCampaign).not.toHaveBeenCalledWith('campaign-1');
    });
  });

  // -------------------------------------------------------------------------
  describe('undo', () => {
    test('offers an undo after switching campaign', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
      expect(screen.getByText(/Switched to/)).toBeInTheDocument();
    });

    // Same defect as the one named for the group+campaign case below: a bare
    // mock-return-value swap does not itself trigger a re-render, so without
    // `rerender` here `activeCampaignId` would still read 'campaign-1' (the
    // mock never reflects the switch on its own), handleUndo's
    // `campaignId !== activeCampaignId` guard would be trivially false, and
    // the assertion below would pass for the wrong reason -- because nothing
    // ran, not because undo worked.
    test('undo restores the previous campaign', async () => {
      const { rerender } = renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      (useCampaigns as jest.Mock).mockReturnValue(
        makeCampaignsMock({ activeCampaignId: 'campaign-2', activeCampaign: mockCampaigns[1] })
      );
      mockSetActiveCampaign.mockClear();
      rerender(<ContextSwitcher />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /undo/i }));
      });

      expect(mockSetActiveCampaign).toHaveBeenCalledWith('campaign-1');
    });

    // Correction 1: a bare mock-return-value swap does not itself trigger a
    // re-render, so handleUndo would otherwise run against the PREVIOUS
    // render's closure -- activeGroupId still 'group-1' -- and both of its
    // `!== active` guards would be false, calling neither setter. `rerender`
    // forces the component to actually see the post-switch values before
    // Undo is clicked, so this genuinely exercises undo across a group
    // switch (both setters called).
    test('undo restores the previous group and campaign pair', async () => {
      const { rerender } = renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Order of the Phoenix'));
      });

      // The switch moved the context; report it as the app now sees it.
      (useGroups as jest.Mock).mockReturnValue(
        makeGroupsMock({ activeGroupId: 'group-2', activeGroup: mockGroups[1] })
      );
      (useCampaigns as jest.Mock).mockReturnValue(
        makeCampaignsMock({ activeCampaignId: 'campaign-9', campaigns: [] })
      );
      mockSetActiveGroup.mockClear();
      mockSetActiveCampaign.mockClear();

      rerender(<ContextSwitcher />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /undo/i }));
      });

      expect(mockSetActiveGroup).toHaveBeenCalledWith('group-1');
      expect(mockSetActiveCampaign).toHaveBeenCalledWith('campaign-1');
    });

    // As above: `rerender` with the post-switch `activeCampaignId` is what
    // makes handleUndo's guard true, so it actually calls setActiveCampaign
    // (and therefore actually hits the rejection this test is about).
    test('reports a failed undo in the toast', async () => {
      const { rerender } = renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      (useCampaigns as jest.Mock).mockReturnValue(
        makeCampaignsMock({ activeCampaignId: 'campaign-2', activeCampaign: mockCampaigns[1] })
      );
      rerender(<ContextSwitcher />);

      mockSetActiveCampaign.mockRejectedValue(new Error('Could not switch back'));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /undo/i }));
      });

      expect(screen.getByText(/Could not switch back/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Important 2: in dialog mode there is no ContextButton to reopen the
  // lists with, so a switch collapsing them would strand the user with an
  // empty dialog and a toast. A later task deletes `inDialog` (and this
  // guard) entirely; until then it must not regress.
  // -------------------------------------------------------------------------
  describe('dialog mode', () => {
    test('switching inside the dialog does not collapse the lists', async () => {
      renderContextSwitcher({ inDialog: true });
      expect(screen.getByText('Select Group')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      expect(screen.getByText('Select Group')).toBeInTheDocument();
      expect(screen.getByText('Select Campaign')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    });

    test('clicking the active group in the dialog is a no-op that keeps the lists open', async () => {
      renderContextSwitcher({ inDialog: true });

      await act(async () => {
        fireEvent.click(screen.getByText('Fellowship of the Ring'));
      });

      expect(mockSetActiveGroup).not.toHaveBeenCalled();
      expect(screen.getByText('Select Group')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  describe('joining a group', () => {
    test('offers a way to join a group', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('Join Group')).toBeInTheDocument();
    });

    test('opens the join dialog', () => {
      renderContextSwitcher();
      openSwitcher();
      fireEvent.click(screen.getByText('Join Group'));
      expect(screen.getByTestId('join-group-dialog')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  describe('trigger text', () => {
    test('names the active group and campaign', () => {
      renderContextSwitcher();
      expect(screen.getByText(/Fellowship of t/)).toBeInTheDocument();
    });

    test('says so when no group is active', () => {
      (useGroups as jest.Mock).mockReturnValue(
        makeGroupsMock({ activeGroupId: null, activeGroup: null })
      );
      renderContextSwitcher();
      expect(screen.getByText('Select Group')).toBeInTheDocument();
    });

    test('says so when no campaign is active', () => {
      (useCampaigns as jest.Mock).mockReturnValue(
        makeCampaignsMock({ activeCampaignId: null, activeCampaign: null })
      );
      renderContextSwitcher();
      expect(screen.getByText(/No Campaign/)).toBeInTheDocument();
    });
  });
});
