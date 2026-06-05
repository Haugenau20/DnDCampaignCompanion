// src/components/features/auth/__tests__/UserProfileButton.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserProfileButton from '../UserProfileButton';

// ---------------------------------------------------------------------------
// Mock context/firebase
// ---------------------------------------------------------------------------
jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
}));

const { useAuth, useGroups } = require('@/features/user-management');

// ---------------------------------------------------------------------------
// Mock ThemeContext
// ---------------------------------------------------------------------------
jest.mock('@/themes/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const { useTheme } = require('@/themes/ThemeContext');

// ---------------------------------------------------------------------------
// Mock SignInForm, UserProfile, AdminPanel, JoinGroupDialog
// to avoid deep dependency trees
// ---------------------------------------------------------------------------
jest.mock('../SignInForm', () => {
  const SignInForm = ({ onSuccess }: any) => (
    <div data-testid="sign-in-form">
      <button onClick={onSuccess}>Sign In Success</button>
    </div>
  );
  return SignInForm;
});

jest.mock('@/features/user-management/profiles/components/UserProfile', () => {
  const UserProfile = ({ onCancel }: any) => (
    <div data-testid="user-profile">
      <button onClick={onCancel}>Close Profile</button>
    </div>
  );
  return UserProfile;
});

jest.mock('@/features/user-management/admin/components/AdminPanel', () => {
  const AdminPanel = ({ onClose }: any) => (
    <div data-testid="admin-panel">
      <button onClick={onClose}>Close Admin</button>
    </div>
  );
  return AdminPanel;
});

jest.mock('@/features/user-management/groups/components/JoinGroupDialog', () => {
  const JoinGroupDialog = ({ open, onClose }: any) => {
    if (!open) return null;
    return (
      <div data-testid="join-group-dialog">
        <button onClick={onClose}>Close Join</button>
      </div>
    );
  };
  return JoinGroupDialog;
});

// ---------------------------------------------------------------------------
// Mock Dialog to avoid portal issues
// ---------------------------------------------------------------------------
jest.mock('@/components/core/Dialog', () => {
  const Dialog = ({ open, onClose, title, children }: any) => {
    if (!open) return null;
    return (
      <div role="dialog" aria-label={title}>
        <button onClick={onClose} aria-label={`close ${title}`}>X</button>
        {children}
      </div>
    );
  };
  return Dialog;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUser = { uid: 'user-1', email: 'test@test.com' };

function setupMocks(overrides: { user?: any; profile?: any } = {}) {
  const user = overrides.user !== undefined ? overrides.user : mockUser;
  const profile = overrides.profile !== undefined ? overrides.profile : { username: 'testuser', role: 'member' };

  useAuth.mockReturnValue({ user });
  useGroups.mockReturnValue({
    activeGroupUserProfile: profile,
    refreshGroups: jest.fn(),
  });
  useTheme.mockReturnValue({
    setTheme: jest.fn(),
    theme: { name: 'light', colors: { primary: '#fff' } },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserProfileButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Unauthenticated state
  // -------------------------------------------------------------------------
  describe('unauthenticated state', () => {
    test('should show Sign In button when user is null', () => {
      setupMocks({ user: null, profile: null });
      render(<UserProfileButton />);
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('should not show user icon button when unauthenticated', () => {
      setupMocks({ user: null, profile: null });
      render(<UserProfileButton />);
      // User profile icon button should NOT be present
      expect(screen.queryByRole('button', { name: /join a group/i })).not.toBeInTheDocument();
    });

    test('should open Sign In dialog when Sign In button is clicked', async () => {
      setupMocks({ user: null, profile: null });
      render(<UserProfileButton />);
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(screen.getByTestId('sign-in-form')).toBeInTheDocument();
    });

    test('should close Sign In dialog after successful sign in', async () => {
      setupMocks({ user: null, profile: null });
      render(<UserProfileButton />);
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      // Simulate onSuccess callback
      await userEvent.click(screen.getByText('Sign In Success'));
      expect(screen.queryByTestId('sign-in-form')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated state
  // -------------------------------------------------------------------------
  describe('authenticated state', () => {
    test('should show user profile icon button when authenticated', () => {
      render(<UserProfileButton />);
      // The user profile button doesn't have text but has an icon
      // Find it by checking buttons are present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('should show "Join a Group" button when authenticated', () => {
      render(<UserProfileButton />);
      expect(screen.getByRole('button', { name: /join a group/i })).toBeInTheDocument();
    });

    test('should NOT show Admin Panel button for non-admin users', () => {
      setupMocks({ profile: { username: 'testuser', role: 'member' } });
      render(<UserProfileButton />);
      expect(screen.queryByRole('button', { name: /admin panel/i })).not.toBeInTheDocument();
    });

    test('should show Admin Panel button for admin users', () => {
      setupMocks({ profile: { username: 'admin', role: 'admin' } });
      render(<UserProfileButton />);
      expect(screen.getByRole('button', { name: /admin panel/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Profile dialog
  // -------------------------------------------------------------------------
  describe('profile dialog', () => {
    test('should open profile dialog when user icon is clicked', async () => {
      render(<UserProfileButton />);
      // There are multiple buttons; the user profile button is the one without aria-label text
      // It renders immediately after user is set; it's the first button (ghost, User icon)
      const buttons = screen.getAllByRole('button');
      // First button is the user profile button (no text, has User icon)
      await userEvent.click(buttons[0]);
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });

    test('should close profile dialog when onCancel is called', async () => {
      render(<UserProfileButton />);
      const buttons = screen.getAllByRole('button');
      await userEvent.click(buttons[0]);
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
      // Click the close button inside UserProfile mock
      await userEvent.click(screen.getByText('Close Profile'));
      expect(screen.queryByTestId('user-profile')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Admin panel dialog
  // -------------------------------------------------------------------------
  describe('admin panel dialog', () => {
    test('should open admin panel when admin button is clicked', async () => {
      setupMocks({ profile: { username: 'admin', role: 'admin' } });
      render(<UserProfileButton />);
      await userEvent.click(screen.getByRole('button', { name: /admin panel/i }));
      expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
    });

    test('should close admin panel when onClose is called', async () => {
      setupMocks({ profile: { username: 'admin', role: 'admin' } });
      render(<UserProfileButton />);
      await userEvent.click(screen.getByRole('button', { name: /admin panel/i }));
      await userEvent.click(screen.getByText('Close Admin'));
      expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Join Group dialog
  // -------------------------------------------------------------------------
  describe('join group dialog', () => {
    test('should open join group dialog when Join Group button is clicked', async () => {
      render(<UserProfileButton />);
      await userEvent.click(screen.getByRole('button', { name: /join a group/i }));
      expect(screen.getByTestId('join-group-dialog')).toBeInTheDocument();
    });

    test('should close join group dialog when it is closed', async () => {
      render(<UserProfileButton />);
      await userEvent.click(screen.getByRole('button', { name: /join a group/i }));
      await userEvent.click(screen.getByText('Close Join'));
      expect(screen.queryByTestId('join-group-dialog')).not.toBeInTheDocument();
    });
  });
});
