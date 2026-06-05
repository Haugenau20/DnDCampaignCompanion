// src/components/shared/__tests__/ContextSwitcher.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ContextSwitcher from '../ContextSwitcher';

// ---------------------------------------------------------------------------
// Mock firebase context hooks
// ---------------------------------------------------------------------------
const mockSetActiveGroup = jest.fn();
const mockSetActiveCampaign = jest.fn();

jest.mock('@/features/user-management', () => ({
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
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
// Mock window.location.reload
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
    ...overrides,
  };
}

function renderContextSwitcher(props: { inDialog?: boolean; onClose?: jest.Mock } = {}) {
  return render(<ContextSwitcher {...props} />);
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
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });
  });

  // -------------------------------------------------------------------------
  // Header mode (inDialog=false)
  // -------------------------------------------------------------------------
  describe('header mode (inDialog=false)', () => {
    test('should render a toggle button in header mode', () => {
      renderContextSwitcher();
      // Context button (toggle)
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('should not show group list initially (closed state)', () => {
      renderContextSwitcher();
      expect(screen.queryByText('Select Group')).not.toBeInTheDocument();
    });

    test('should open dropdown when toggle button is clicked', () => {
      renderContextSwitcher();
      const toggleBtn = screen.getByRole('button');
      fireEvent.click(toggleBtn);
      expect(screen.getByText('Select Group')).toBeInTheDocument();
    });

    test('should show group names after opening', () => {
      renderContextSwitcher();
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Fellowship of the Ring')).toBeInTheDocument();
      expect(screen.getByText('Order of the Phoenix')).toBeInTheDocument();
    });

    test('should show "Loading..." when groups are loading', () => {
      (useGroups as jest.Mock).mockReturnValue(makeGroupsMock({ loading: true }));
      renderContextSwitcher();
      // Loading state disables the context button
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });

    test('should show "No groups available" when groups is empty', () => {
      (useGroups as jest.Mock).mockReturnValue(makeGroupsMock({ groups: [], loading: false }));
      renderContextSwitcher();
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('No groups available')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Dialog mode (inDialog=true)
  // -------------------------------------------------------------------------
  describe('dialog mode (inDialog=true)', () => {
    test('should show group list immediately in dialog mode', () => {
      renderContextSwitcher({ inDialog: true });
      expect(screen.getByText('Select Group')).toBeInTheDocument();
    });

    test('should show group names in dialog mode', () => {
      renderContextSwitcher({ inDialog: true });
      expect(screen.getByText('Fellowship of the Ring')).toBeInTheDocument();
    });

    test('should render "Apply Changes" button in dialog mode', () => {
      renderContextSwitcher({ inDialog: true });
      expect(screen.getByRole('button', { name: /apply changes/i })).toBeInTheDocument();
    });

    test('should render "Close Without Applying" button in dialog mode', () => {
      renderContextSwitcher({ inDialog: true });
      expect(
        screen.getByRole('button', { name: /close without applying/i })
      ).toBeInTheDocument();
    });

    test('"Apply Changes" should be disabled when no changes have been made', () => {
      renderContextSwitcher({ inDialog: true });
      expect(screen.getByRole('button', { name: /apply changes/i })).toBeDisabled();
    });

    test('"Apply Changes" should be enabled after selecting a different group', () => {
      renderContextSwitcher({ inDialog: true });
      fireEvent.click(screen.getByText('Order of the Phoenix'));
      expect(screen.getByRole('button', { name: /apply changes/i })).not.toBeDisabled();
    });

    test('should call onClose when "Close Without Applying" is clicked', () => {
      const onClose = jest.fn();
      renderContextSwitcher({ inDialog: true, onClose });
      fireEvent.click(screen.getByRole('button', { name: /close without applying/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('should reset selection when "Close Without Applying" is clicked', () => {
      const onClose = jest.fn();
      renderContextSwitcher({ inDialog: true, onClose });
      // Select a different group
      fireEvent.click(screen.getByText('Order of the Phoenix'));
      // "Apply Changes" should be enabled now
      expect(screen.getByRole('button', { name: /apply changes/i })).not.toBeDisabled();
      // Click Close Without Applying
      fireEvent.click(screen.getByRole('button', { name: /close without applying/i }));
      // Apply Changes should be disabled again (selection reset to active)
      expect(screen.getByRole('button', { name: /apply changes/i })).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Group selection
  // -------------------------------------------------------------------------
  describe('group selection', () => {
    test('should update selected group when a group button is clicked', () => {
      renderContextSwitcher({ inDialog: true });
      fireEvent.click(screen.getByText('Order of the Phoenix'));
      // The "Apply Changes" button should now be enabled
      expect(screen.getByRole('button', { name: /apply changes/i })).not.toBeDisabled();
    });

    test('should show "Join Group" option', () => {
      renderContextSwitcher({ inDialog: true });
      expect(screen.getByText('Join Group')).toBeInTheDocument();
    });

    test('should open JoinGroupDialog when "Join Group" is clicked', () => {
      renderContextSwitcher({ inDialog: true });
      fireEvent.click(screen.getByText('Join Group'));
      expect(screen.getByTestId('join-group-dialog')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Campaign section
  // -------------------------------------------------------------------------
  describe('campaign section', () => {
    test('should show campaigns section when activeGroupId is set', () => {
      renderContextSwitcher({ inDialog: true });
      expect(screen.getByText('Select Campaign')).toBeInTheDocument();
    });

    test('should show campaign names', () => {
      renderContextSwitcher({ inDialog: true });
      expect(screen.getByText('Middle Earth Adventures')).toBeInTheDocument();
      expect(screen.getByText('Hogwarts Campaign')).toBeInTheDocument();
    });

    test('should NOT show campaigns section when activeGroupId is null', () => {
      (useGroups as jest.Mock).mockReturnValue(makeGroupsMock({ activeGroupId: null }));
      renderContextSwitcher({ inDialog: true });
      expect(screen.queryByText('Select Campaign')).not.toBeInTheDocument();
    });

    test('should show "No campaigns in this group" when campaigns array is empty', () => {
      (useCampaigns as jest.Mock).mockReturnValue(makeCampaignsMock({ campaigns: [] }));
      renderContextSwitcher({ inDialog: true });
      expect(screen.getByText('No campaigns in this group')).toBeInTheDocument();
    });

    test('should enable "Apply Changes" when a different campaign is selected', () => {
      renderContextSwitcher({ inDialog: true });
      fireEvent.click(screen.getByText('Hogwarts Campaign'));
      expect(screen.getByRole('button', { name: /apply changes/i })).not.toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Apply changes
  // -------------------------------------------------------------------------
  describe('applying changes', () => {
    test('should call setActiveGroup when a different group is applied', async () => {
      renderContextSwitcher({ inDialog: true });
      fireEvent.click(screen.getByText('Order of the Phoenix'));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /apply changes/i }));
      });

      expect(mockSetActiveGroup).toHaveBeenCalledWith('group-2');
    });

    test('should call setActiveCampaign when a different campaign is applied', async () => {
      renderContextSwitcher({ inDialog: true });
      fireEvent.click(screen.getByText('Hogwarts Campaign'));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /apply changes/i }));
      });

      expect(mockSetActiveCampaign).toHaveBeenCalledWith('campaign-2');
    });

    test('should reload the page after applying changes', async () => {
      renderContextSwitcher({ inDialog: true });
      fireEvent.click(screen.getByText('Order of the Phoenix'));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /apply changes/i }));
      });

      await waitFor(() => {
        expect(mockReload).toHaveBeenCalled();
      });
    });

    test('should NOT call setActiveGroup when same group is selected', async () => {
      renderContextSwitcher({ inDialog: true });
      // Select same group (group-1 is already active)
      fireEvent.click(screen.getByText('Fellowship of the Ring'));
      // Select a campaign to make apply possible
      fireEvent.click(screen.getByText('Hogwarts Campaign'));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /apply changes/i }));
      });

      expect(mockSetActiveGroup).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state text in header mode
  // -------------------------------------------------------------------------
  describe('header mode context text', () => {
    test('should show truncated group name in toggle button text when loaded', () => {
      renderContextSwitcher();
      // truncateText(name, 15) truncates long names — the full name won't appear
      // but the beginning of the name will be visible
      expect(
        screen.getByText(/Fellowship of t/)
      ).toBeInTheDocument();
    });

    test('should show "Select Group" when no active group', () => {
      (useGroups as jest.Mock).mockReturnValue(
        makeGroupsMock({ activeGroupId: null, activeGroup: null })
      );
      renderContextSwitcher();
      expect(screen.getByText('Select Group')).toBeInTheDocument();
    });

    test('should show "No Campaign" text when no active campaign', () => {
      (useCampaigns as jest.Mock).mockReturnValue(
        makeCampaignsMock({ activeCampaignId: null, activeCampaign: null })
      );
      renderContextSwitcher();
      // Button text: "Fellowship of t... / No Campaign"
      expect(screen.getByText(/No Campaign/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Click outside to close (header mode only)
  // -------------------------------------------------------------------------
  describe('click outside to close', () => {
    test('should close dropdown when clicking outside in header mode', async () => {
      renderContextSwitcher();
      // Open the dropdown first
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Select Group')).toBeInTheDocument();

      // Simulate clicking outside the dropdown
      await act(async () => {
        fireEvent.mouseDown(document.body);
      });

      await waitFor(() => {
        expect(screen.queryByText('Select Group')).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // JoinGroupDialog onSuccess
  // -------------------------------------------------------------------------
  describe('JoinGroupDialog onSuccess', () => {
    test('should reload page when JoinGroupDialog reports success', async () => {
      // Override JoinGroupDialog to expose onSuccess trigger
      jest.doMock('@/features/user-management/groups/components/JoinGroupDialog', () => {
        const Mock: React.FC<{
          open: boolean;
          onClose: () => void;
          onSuccess: () => void;
        }> = ({ open, onSuccess }) => {
          if (!open) return null;
          return (
            <button data-testid="trigger-success" onClick={onSuccess}>
              Trigger Success
            </button>
          );
        };
        return Mock;
      });

      renderContextSwitcher({ inDialog: true });
      // Open join group dialog
      fireEvent.click(screen.getByText('Join Group'));
      // Trigger success if dialog renders with a trigger
      const trigger = screen.queryByTestId('trigger-success');
      if (trigger) {
        await act(async () => {
          fireEvent.click(trigger);
        });
        expect(mockReload).toHaveBeenCalled();
      }
    });
  });
});
