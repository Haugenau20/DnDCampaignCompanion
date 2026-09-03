// src/shared/components/context-switcher/__tests__/ContextSwitcher.test.tsx

import React from 'react';
import { render, screen, within, fireEvent, waitFor, act } from '@testing-library/react';
import ContextSwitcher from '../ContextSwitcher';

// ---------------------------------------------------------------------------
// Mock firebase context hooks
// ---------------------------------------------------------------------------
const mockSetActiveGroup = jest.fn();
const mockSetActiveCampaign = jest.fn();
const mockGetCampaigns = jest.fn();

jest.mock('@/features/user-management', () => ({
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
  get JoinGroupDialog() {
    return require('@/features/user-management/groups/components/JoinGroupDialog').default;
  },
}));

const { useGroups, useCampaigns } = require('@/features/user-management');

// ContextSwitcher must not mount this itself -- Header owns the single
// mount. This stub is what `queryByTestId('join-group-dialog')` would find
// if ContextSwitcher ever reintroduced its own <JoinGroupDialog>; without
// this mock, a reintroduced import would resolve to `undefined` from the
// barrel stub above and crash the render instead of being asserted on.
jest.mock('@/features/user-management/groups/components/JoinGroupDialog', () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-group-dialog" /> : null,
}));

// ---------------------------------------------------------------------------
// CampaignStep now pulls in useStory() / useNPCs(), both of which THROW
// outside their providers -- neither is mounted here, so both barrels are
// mocked with minimal stand-ins. Their exact numbers are exercised by
// CampaignStep's own suite; here they only need to not crash the tree.
// ---------------------------------------------------------------------------
jest.mock('@/features/storytelling', () => ({
  useStory: () => ({
    chapters: [],
    storyProgress: { currentChapter: '' },
  }),
}));

jest.mock('@/features/campaign-entities', () => ({
  useNPCs: () => ({ npcs: [] }),
}));

// ---------------------------------------------------------------------------
// useCampaignCounts / useGroupSummaries reach `core/services/firebase`
// directly (not through the mocked user-management barrel above), so without
// this mock mounting the popover would exercise BaseFirebaseService's real
// constructor and crash under jsdom (no firebase/analytics or
// firebase/functions mock is registered globally -- see setupTests.ts and
// test-utils/enhanced-test-utils.tsx for the same problem solved the same
// way). The promises never resolve: this suite only asserts on names and
// navigation, never on counts, so there is nothing to gain from letting them
// settle, and a lot of act() noise to lose by doing so.
// ---------------------------------------------------------------------------
const mockGetCampaignCounts = jest.fn();
const mockFirebaseGetCampaigns = jest.fn();
const mockFirebaseGetGroupUsers = jest.fn();
const mockGetCurrentUserId = jest.fn();

jest.mock('@/core/services/firebase', () => ({
  __esModule: true,
  default: {
    auth: { getCurrentUserId: (...args: any[]) => mockGetCurrentUserId(...args) },
    campaign: {
      getCampaignCounts: (...args: any[]) => mockGetCampaignCounts(...args),
      getCampaigns: (...args: any[]) => mockFirebaseGetCampaigns(...args),
    },
    group: {
      getGroupUsers: (...args: any[]) => mockFirebaseGetGroupUsers(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// window.location.reload must never be called by this component again
// ---------------------------------------------------------------------------
const mockReload = jest.fn();

// ContextSwitcher no longer mounts JoinGroupDialog itself -- its owner does,
// through this callback.
const mockOnJoinGroup = jest.fn();

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

function renderContextSwitcher(props: { onJoinGroup?: () => void } = {}) {
  return render(<ContextSwitcher onJoinGroup={props.onJoinGroup ?? mockOnJoinGroup} />);
}

/** Open the popover from its trigger. */
function openSwitcher() {
  fireEvent.click(screen.getAllByRole('button')[0]);
}

/** Go from the campaign step to the group step. */
async function openGroupStep() {
  await act(async () => {
    fireEvent.click(screen.getByRole('menuitem', { name: /change/i }));
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContextSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCampaignCounts.mockImplementation(() => new Promise(() => {}));
    mockFirebaseGetCampaigns.mockImplementation(() => new Promise(() => {}));
    mockFirebaseGetGroupUsers.mockImplementation(() => new Promise(() => {}));
    mockGetCurrentUserId.mockReturnValue('user-1');
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
      expect(screen.queryByText('Campaigns in this group')).not.toBeInTheDocument();
    });

    test('opens from the trigger', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('Campaigns in this group')).toBeInTheDocument();
    });

    test('lists the campaigns once open', () => {
      renderContextSwitcher();
      openSwitcher();
      const menu = screen.getByRole('menu');
      expect(within(menu).getByText('Middle Earth Adventures')).toBeInTheDocument();
      expect(within(menu).getByText('Hogwarts Campaign')).toBeInTheDocument();
    });

    test('closes when clicking outside', async () => {
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('Campaigns in this group')).toBeInTheDocument();

      await act(async () => {
        fireEvent.mouseDown(document.body);
      });

      await waitFor(() => {
        expect(screen.queryByText('Campaigns in this group')).not.toBeInTheDocument();
      });
    });

    test('disables the trigger while groups are loading', () => {
      (useGroups as jest.Mock).mockReturnValue(makeGroupsMock({ loading: true }));
      renderContextSwitcher();
      expect(screen.getAllByRole('button')[0]).toBeDisabled();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('reports when there are no campaigns', () => {
      (useCampaigns as jest.Mock).mockReturnValue(
        makeCampaignsMock({ campaigns: [] })
      );
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('No campaigns in this group')).toBeInTheDocument();
    });

    // The group list is now a second step behind `Change`, reached from the
    // campaign step -- this replaces the old "lists the groups once open"
    // coverage, since groups are no longer visible on the default view.
    test('reaches the group list behind Change', async () => {
      renderContextSwitcher();
      openSwitcher();

      await openGroupStep();

      expect(screen.getByText('Choose a group')).toBeInTheDocument();
      expect(screen.getByText('Fellowship of the Ring')).toBeInTheDocument();
      expect(screen.getByText('Order of the Phoenix')).toBeInTheDocument();
    });

    test('returns to the campaigns after choosing a group', async () => {
      renderContextSwitcher();
      openSwitcher();

      await openGroupStep();
      await act(async () => {
        fireEvent.click(screen.getByText('Order of the Phoenix'));
      });

      expect(mockSetActiveGroup).toHaveBeenCalledWith('group-2');
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

    test('clicking a group (reached behind Change) switches to it immediately', async () => {
      renderContextSwitcher();
      openSwitcher();
      await openGroupStep();

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
        expect(screen.queryByText('Campaigns in this group')).not.toBeInTheDocument();
      });
    });

    test('does not switch when the active campaign is clicked', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(within(screen.getByRole('menu')).getByText('Middle Earth Adventures'));
      });

      expect(mockSetActiveCampaign).not.toHaveBeenCalled();
    });

    // Critical 2, restated for the two-step shell: clicking the already-active
    // group on the group step is "changed my mind" rather than "close the
    // whole popover" -- it returns to the campaign step, which stays open.
    // handleSelectGroup's `if (groupId === activeGroupId) { setStep('campaigns'); return; }`
    // branch is what this exercises.
    test('does not switch when the active group is clicked, and returns to the campaign step', async () => {
      renderContextSwitcher();
      openSwitcher();
      await openGroupStep();
      expect(screen.getByText('Choose a group')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByText('Fellowship of the Ring'));
      });

      expect(mockSetActiveGroup).not.toHaveBeenCalled();
      expect(screen.getByText('Campaigns in this group')).toBeInTheDocument();
      expect(screen.getByRole('menu')).toBeInTheDocument();
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

    // Finding 2 of the 2026-09-01 review: the error used to render as a
    // same-position sibling overlay that painted over the still-open popover
    // (a failed switch never closes it) rather than inside it. Scoping the
    // query to the menu itself is what would have caught that -- a sibling
    // element positioned on top of the popover still satisfies a bare
    // `screen.getByText`.
    test('reports the failure inside the still-open popover', async () => {
      mockSetActiveCampaign.mockRejectedValue(new Error('Campaign write failed'));
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(
        within(screen.getByRole('menu')).getByText(/Campaign write failed/)
      ).toBeInTheDocument();
    });

    // The error used to be cleared only inside applySwitch, so it survived
    // Escape and click-outside and hung under the header until the next
    // switch attempt. It must instead die with the popover it belongs to.
    test('clears the switch error once the popover closes, and does not resurface on reopen', async () => {
      mockSetActiveCampaign.mockRejectedValue(new Error('Campaign write failed'));
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });
      expect(screen.getByText(/Campaign write failed/)).toBeInTheDocument();

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
      expect(screen.queryByText(/Campaign write failed/)).not.toBeInTheDocument();

      openSwitcher();
      expect(screen.queryByText(/Campaign write failed/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Regression coverage for the bug fixed in 592b548: selecting a group used
  // to leave the PREVIOUS group's campaigns on screen, so applying could pair
  // a new group with an old group's campaign. Staged selection is gone now,
  // so that pairing is impossible by construction -- CampaignStep reads
  // `campaigns` straight from `useCampaigns()` on every render rather than
  // caching a list keyed off a "selected" group. This test asserts the
  // transition (switch group -> the group's own campaign is what a further
  // click acts on), not merely an end state, so it would fail if a future
  // change reintroduced a locally cached / stale campaign list -- including
  // one hiding inside the CampaignStep rewrite this task performed.
  // -------------------------------------------------------------------------
  describe('campaigns follow the selected group', () => {
    test('after switching group, selecting a campaign acts on the NEW group\'s campaign, not the previous group\'s', async () => {
      const { rerender } = renderContextSwitcher();
      openSwitcher();
      await openGroupStep();

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
      rerender(<ContextSwitcher onJoinGroup={mockOnJoinGroup} />);

      // The switch closed the popover; reopen it to act on the new list. The
      // reopened panel lands back on the campaign step (the popover-close
      // effect resets `step`), so no extra navigation is needed here.
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
      rerender(<ContextSwitcher onJoinGroup={mockOnJoinGroup} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /undo/i }));
      });

      expect(mockSetActiveCampaign).toHaveBeenCalledWith('campaign-1');
    });

    // Correction 1: a bare mock-return-value swap does not itself trigger a
    // re-render, so handleUndo would otherwise run against the PREVIOUS
    // render's closure -- activeGroupId still 'group-1' -- and its
    // `!== active` guard would be false, calling neither setter. `rerender`
    // forces the component to actually see the post-switch values before
    // Undo is clicked, so this genuinely exercises undo across a group
    // switch.
    //
    // This test used to assert BOTH setters were called -- that was the bug
    // this suite failed to catch (finding 1 of the 2026-09-01 review):
    // `setActiveGroup(previousGroupId)` already restores group-1's own
    // stored campaign via `setActiveGroupContext`, so a follow-up
    // `setActiveCampaign` call runs against THIS closure's still-stale
    // `activeGroupId` ('group-2', the group being undone away from) and
    // writes group-1's campaign onto group-2's profile -- the exact
    // cross-group pairing this switcher exists to prevent, arriving through
    // undo. `setActiveCampaign` being a bare `jest.fn()` made both setters
    // firing look like success. It must NOT be called when undo also
    // switches the group.
    test('undo of a group switch restores only the group, not the campaign', async () => {
      const { rerender } = renderContextSwitcher();
      openSwitcher();
      await openGroupStep();

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

      rerender(<ContextSwitcher onJoinGroup={mockOnJoinGroup} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /undo/i }));
      });

      expect(mockSetActiveGroup).toHaveBeenCalledWith('group-1');
      expect(mockSetActiveCampaign).not.toHaveBeenCalled();
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
      rerender(<ContextSwitcher onJoinGroup={mockOnJoinGroup} />);

      mockSetActiveCampaign.mockRejectedValue(new Error('Could not switch back'));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /undo/i }));
      });

      expect(screen.getByText(/Could not switch back/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  describe('joining a group', () => {
    test('offers a way to join a group', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('Join a group with an invite code')).toBeInTheDocument();
    });

    test('calls onJoinGroup when the join row is clicked', () => {
      renderContextSwitcher();
      openSwitcher();
      fireEvent.click(screen.getByText('Join a group with an invite code'));
      expect(mockOnJoinGroup).toHaveBeenCalled();
    });

    test('does not mount a join dialog of its own', async () => {
      const onJoinGroup = jest.fn();
      renderContextSwitcher({ onJoinGroup });
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByRole('menuitem', { name: /join a group/i }));
      });

      // Header owns the single mount. A second one here is what gave the
      // same action two different outcomes depending on which door the user
      // came through, so the switcher must delegate and render nothing
      // itself.
      expect(onJoinGroup).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('join-group-dialog')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  describe('trigger', () => {
    test('names the active campaign', () => {
      renderContextSwitcher();
      expect(
        screen.getByRole('button', { name: /Active campaign: Middle Earth Adventures/ })
      ).toBeInTheDocument();
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
      expect(screen.getByText('No Campaign')).toBeInTheDocument();
    });

    // The header row crowds this chip under flex pressure (see the
    // header-command-palette design doc §6: the campaign chip is the
    // designated shrink point, since the search trigger next to it never
    // yields). A flex item cannot shrink below its content width without
    // `min-w-0` even when it also carries `max-w-*` and `truncate` -- the
    // `max-w-*` caps its preferred size but does nothing for the automatic
    // minimum size the browser floors it at otherwise.
    test('allows the chip to shrink below its content width under flex pressure', () => {
      renderContextSwitcher();
      const trigger = screen.getAllByRole('button')[0];
      expect(trigger.className).toMatch(/\bmin-w-0\b/);
    });

    // `min-w-0` on the trigger button is inert if the wrapper it sits in
    // (this component's own root, a direct flex item of the header row)
    // still has the default `min-width: auto` -- the automatic minimum size
    // the browser floors a flex item at, absent `min-w-0`, is derived from
    // the item's own overflow property, not a descendant's, so the wrapper
    // needs the same class for the shrink to actually reach the chip.
    test('allows its own root to shrink, so the chip\'s min-w-0 is not stranded', () => {
      const { container } = renderContextSwitcher();
      expect(container.firstElementChild?.className).toMatch(/\bmin-w-0\b/);
    });

    // ...and the root must also be a flex container. Letting the root shrink is
    // only half the job: while it was a plain block, the trigger inside it was
    // still sized shrink-to-fit up to its own `max-w-[14rem]`, so a shrunken
    // root did not shrink the chip -- the chip simply overflowed it and painted
    // over the first navigation item. Only as a flex item does the chip's own
    // `min-w-0` apply and its label's `truncate` engage.
    test('makes its root a flex container, so the chip shrinks with it rather than overflowing', () => {
      const { container } = renderContextSwitcher();
      expect(container.firstElementChild?.className).toMatch(/\bflex\b/);
    });

    test('reports the popover state to assistive technology', () => {
      renderContextSwitcher();
      const trigger = screen.getAllByRole('button')[0];
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  // -------------------------------------------------------------------------
  describe('keyboard', () => {
    test('Escape closes the popover and returns focus to the trigger', async () => {
      renderContextSwitcher();
      const trigger = screen.getAllByRole('button')[0];
      fireEvent.click(trigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
      expect(trigger).toHaveFocus();
    });
  });
});
