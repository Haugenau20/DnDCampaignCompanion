// src/components/features/auth/adminPanel/__tests__/AdminPanel.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminPanel from '../AdminPanel';

// ---------------------------------------------------------------------------
// Mock context/firebase
// ---------------------------------------------------------------------------
jest.mock('../../../../../context/firebase', () => ({
  useGroups: jest.fn(),
}));

const { useGroups } = require('../../../../../context/firebase');

// ---------------------------------------------------------------------------
// Mock sub-views to avoid deep rendering
// ---------------------------------------------------------------------------
jest.mock('../TokenManagementView', () => {
  const TokenManagementView = () => <div data-testid="token-management-view">Tokens</div>;
  return TokenManagementView;
});

jest.mock('../UserManagementView', () => {
  const UserManagementView = () => <div data-testid="user-management-view">Users</div>;
  return UserManagementView;
});

jest.mock('../CampaignManagementView', () => {
  const CampaignManagementView = () => <div data-testid="campaign-management-view">Campaigns</div>;
  return CampaignManagementView;
});

jest.mock('../GroupManagementView', () => {
  const GroupManagementView = () => <div data-testid="group-management-view">Groups</div>;
  return GroupManagementView;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockGroup = { id: 'group-1', name: 'Test Group', createdAt: new Date().toISOString() };

function setupMocks(overrides: {
  isAdmin?: boolean;
  loading?: boolean;
  activeGroup?: any;
  activeGroupUserProfile?: any;
} = {}) {
  const {
    isAdmin = true,
    loading = false,
    activeGroup = mockGroup,
    activeGroupUserProfile = { username: 'admin', role: 'admin' },
  } = overrides;

  useGroups.mockReturnValue({
    isAdmin,
    loading,
    activeGroup,
    activeGroupId: activeGroup?.id || null,
    activeGroupUserProfile,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    setupMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Access control
  // -------------------------------------------------------------------------
  describe('access control', () => {
    test('should show Access Denied when user is not admin', () => {
      setupMocks({ isAdmin: false });
      render(<AdminPanel />);
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });

    test('should show Access Denied when there is no active group', () => {
      setupMocks({ activeGroup: null });
      render(<AdminPanel />);
      // After timeout (3 seconds), localLoading becomes false
      act(() => { jest.advanceTimersByTime(3500); });
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });

    test('should show reason "Your role is not admin" when not admin', () => {
      setupMocks({ isAdmin: false });
      render(<AdminPanel />);
      expect(screen.getByText(/your role is not admin/i)).toBeInTheDocument();
    });

    test('should show reason "No active group selected" when no group but user is admin', () => {
      setupMocks({ isAdmin: true, activeGroup: null });
      act(() => { jest.advanceTimersByTime(3500); });
      render(<AdminPanel />);
      expect(screen.getByText(/no active group selected/i)).toBeInTheDocument();
    });

    test('should render admin panel when user is admin with active group', () => {
      render(<AdminPanel />);
      expect(screen.getByText(/administration/i)).toBeInTheDocument();
    });

    test('should call onClose when Back button is clicked in Access Denied state', () => {
      setupMocks({ isAdmin: false });
      const onClose = jest.fn();
      render(<AdminPanel onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: /back/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    test('should show loading indicator while loading and no active group', () => {
      setupMocks({ loading: true, activeGroup: null });
      render(<AdminPanel />);
      expect(screen.getByText(/loading admin panel/i)).toBeInTheDocument();
    });

    test('should stop loading after 3 seconds even if still loading from context', () => {
      setupMocks({ loading: true, activeGroup: null });
      render(<AdminPanel />);
      expect(screen.getByText(/loading admin panel/i)).toBeInTheDocument();

      act(() => { jest.advanceTimersByTime(3100); });

      // After 3 seconds, localLoading becomes false → shows Access Denied
      expect(screen.queryByText(/loading admin panel/i)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Tab navigation
  // -------------------------------------------------------------------------
  describe('tab navigation', () => {
    test('should show "Registration Tokens" tab by default', () => {
      render(<AdminPanel />);
      expect(screen.getByTestId('token-management-view')).toBeInTheDocument();
    });

    test('should switch to Users tab when clicked', () => {
      render(<AdminPanel />);
      // Find the Users tab button (it has text "Users")
      const tabButtons = screen.getAllByRole('button');
      const usersTab = tabButtons.find(b => b.textContent?.trim() === 'Users');
      expect(usersTab).toBeTruthy();
      fireEvent.click(usersTab!);
      expect(screen.getByTestId('user-management-view')).toBeInTheDocument();
    });

    test('should switch to Campaigns tab when clicked', () => {
      render(<AdminPanel />);
      const tabButtons = screen.getAllByRole('button');
      const campaignsTab = tabButtons.find(b => b.textContent?.trim() === 'Campaigns');
      expect(campaignsTab).toBeTruthy();
      fireEvent.click(campaignsTab!);
      expect(screen.getByTestId('campaign-management-view')).toBeInTheDocument();
    });

    test('should switch to Group tab when clicked', () => {
      render(<AdminPanel />);
      const tabButtons = screen.getAllByRole('button');
      const groupTab = tabButtons.find(b => b.textContent?.trim() === 'Group');
      expect(groupTab).toBeTruthy();
      fireEvent.click(groupTab!);
      expect(screen.getByTestId('group-management-view')).toBeInTheDocument();
    });

    test('should switch back to Tokens tab from Users tab', () => {
      render(<AdminPanel />);
      const tabButtons = screen.getAllByRole('button');
      const usersTab = tabButtons.find(b => b.textContent?.trim() === 'Users');
      fireEvent.click(usersTab!);
      const tokensTab = screen.getAllByRole('button').find(b => b.textContent?.trim() === 'Registration Tokens');
      fireEvent.click(tokensTab!);
      expect(screen.getByTestId('token-management-view')).toBeInTheDocument();
    });

    test('should hide non-active tab views', () => {
      render(<AdminPanel />);
      const tabButtons = screen.getAllByRole('button');
      const usersTab = tabButtons.find(b => b.textContent?.trim() === 'Users');
      fireEvent.click(usersTab!);
      expect(screen.queryByTestId('token-management-view')).not.toBeInTheDocument();
      expect(screen.queryByTestId('campaign-management-view')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Group name display
  // -------------------------------------------------------------------------
  describe('group name display', () => {
    test('should display the group name in the heading', () => {
      render(<AdminPanel />);
      expect(screen.getByText(/test group.*administration/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Close button
  // -------------------------------------------------------------------------
  describe('close button', () => {
    test('should render Close button when onClose is provided', () => {
      render(<AdminPanel onClose={jest.fn()} />);
      expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument();
    });

    test('should call onClose when Close button is clicked', () => {
      const onClose = jest.fn();
      render(<AdminPanel onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('should not render Close button when onClose is not provided', () => {
      render(<AdminPanel />);
      expect(screen.queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument();
    });
  });
});
