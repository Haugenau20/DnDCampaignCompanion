// src/features/user-management/auth/components/__tests__/SessionManager.test.tsx

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import SessionManager from '../SessionManager';

// ---------------------------------------------------------------------------
// Mock useSessionManager hook
// The component imports via: import useSessionManager from '../hooks/useSessionManager'
// The hook file exports: export default useSessionManager;
// ---------------------------------------------------------------------------
jest.mock('../../hooks/useSessionManager', () => {
  const mockFn = jest.fn().mockReturnValue({ checkSession: jest.fn() });
  return {
    __esModule: true,
    default: mockFn,
    useSessionManager: mockFn,
  };
});

const useSessionManagerModule = require('../../hooks/useSessionManager');

// ---------------------------------------------------------------------------
// Mock context/firebase -- SessionManager reads the account profile and the
// account writer from useUser, the active group's membership from useGroups,
// and the signed-in user from useAuth. All three live behind the domain
// barrel; sibling imports are re-pointed at the same mock so every hook
// resolves to one shared set of jest.fn()s.
// ---------------------------------------------------------------------------
const mockSetTheme = jest.fn();
const mockUpdateUserProfile = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useUser: jest.fn(),
}));

jest.mock('../../hooks/useAuth', () => require('@/features/user-management'));
jest.mock('../../../groups/hooks/useGroups', () => require('@/features/user-management'));
jest.mock('../../../profiles/hooks/useUser', () => require('@/features/user-management'));

const { useAuth, useGroups, useUser } = require('@/features/user-management');

// ---------------------------------------------------------------------------
// Mock ThemeContext
// ---------------------------------------------------------------------------
jest.mock('@/core/themes/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const { useTheme } = require('@/core/themes/ThemeContext');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUser = { uid: 'user-1' };

function setupMocks(
  userProfile: any = null,
  activeGroupUserProfile: any = null,
  theme: any = { name: 'light', colors: { primary: '#fff' } }
) {
  useAuth.mockReturnValue({ user: mockUser });

  useGroups.mockReturnValue({
    activeGroupUserProfile,
  });

  useUser.mockReturnValue({
    userProfile,
    updateUserProfile: mockUpdateUserProfile,
  });

  useTheme.mockReturnValue({
    theme,
    setTheme: mockSetTheme,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUserProfile.mockResolvedValue(undefined);
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Child rendering
  // -------------------------------------------------------------------------
  describe('children rendering', () => {
    test('should render its children', () => {
      render(
        <SessionManager>
          <div data-testid="child-content">Hello</div>
        </SessionManager>
      );
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    test('should render multiple children', () => {
      render(
        <SessionManager>
          <div data-testid="child-1">First</div>
          <div data-testid="child-2">Second</div>
        </SessionManager>
      );
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });

    test('should not add wrapper DOM elements', () => {
      const { container } = render(
        <SessionManager>
          <div data-testid="child">child</div>
        </SessionManager>
      );
      // SessionManager renders a React.Fragment (no extra DOM wrapper)
      expect(container.firstChild).toHaveAttribute('data-testid', 'child');
    });
  });

  // -------------------------------------------------------------------------
  // Theme synchronization -- account-scoped, with a one-time migration from
  // whichever group happens to be active when it runs.
  // -------------------------------------------------------------------------
  describe('theme synchronization', () => {
    test('applies the account theme when one is stored', () => {
      setupMocks({ id: 'user-1', preferences: { theme: 'dark' } }, null);

      render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
      // No migration write is needed -- the account already has a theme.
      expect(mockUpdateUserProfile).not.toHaveBeenCalled();
    });

    test("with no account theme, applies the active group's theme", () => {
      setupMocks(
        { id: 'user-1' },
        { preferences: { theme: 'medieval' } }
      );

      render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockSetTheme).toHaveBeenCalledWith('medieval');
    });

    test("with no account theme, writes the group's theme up to the account exactly once", () => {
      setupMocks(
        { id: 'user-1' },
        { preferences: { theme: 'medieval' } }
      );

      const { rerender } = render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockUpdateUserProfile).toHaveBeenCalledTimes(1);
      expect(mockUpdateUserProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ preferences: expect.objectContaining({ theme: 'medieval' }) })
      );

      // A re-render with the exact same profiles (nothing about the stored
      // theme values changed) must not repeat the write.
      rerender(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockUpdateUserProfile).toHaveBeenCalledTimes(1);
    });

    test('with neither, leaves the theme on its localStorage value', () => {
      setupMocks({ id: 'user-1' }, null);

      render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockSetTheme).not.toHaveBeenCalled();
      expect(mockUpdateUserProfile).not.toHaveBeenCalled();
    });

    test('does not re-apply a theme when the active group changes', () => {
      setupMocks(
        { id: 'user-1', preferences: { theme: 'dark' } },
        { id: 'membership-a', preferences: { theme: 'dark' } }
      );

      const { rerender } = render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockSetTheme).toHaveBeenCalledTimes(1);

      // Switch group: a different membership object, same account theme.
      useGroups.mockReturnValue({
        activeGroupUserProfile: { id: 'membership-b', preferences: { theme: 'medieval' } },
      });

      rerender(
        <SessionManager>
          <div />
        </SessionManager>
      );

      // The account theme already wins, so the group's value (even a
      // different one) must not cause another application.
      expect(mockSetTheme).toHaveBeenCalledTimes(1);
    });

    test('ignores an unrecognised stored theme name', () => {
      setupMocks({ id: 'user-1', preferences: { theme: 'rainbow' } }, null);

      render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockSetTheme).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Session manager hook
  // -------------------------------------------------------------------------
  describe('session manager hook invocation', () => {
    test('should invoke useSessionManager hook', () => {
      render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      // The default export of useSessionManager is the named export
      expect(
        useSessionManagerModule.default.mock.calls.length +
        useSessionManagerModule.useSessionManager.mock.calls.length
      ).toBeGreaterThan(0);
    });
  });
});
