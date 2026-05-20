// src/components/features/auth/__tests__/SessionManager.test.tsx

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import SessionManager from '../SessionManager';

// ---------------------------------------------------------------------------
// Mock useSessionManager hook
// The component imports via: import useSessionManager from '../../../hooks/useSessionManager'
// The hook file exports: export default useSessionManager;
// ---------------------------------------------------------------------------
const mockUseSessionManagerFn = jest.fn().mockReturnValue({ checkSession: jest.fn() });

jest.mock('../../../../hooks/useSessionManager', () => {
  const mockFn = jest.fn().mockReturnValue({ checkSession: jest.fn() });
  return {
    __esModule: true,
    default: mockFn,
    useSessionManager: mockFn,
  };
});

const useSessionManagerModule = require('../../../../hooks/useSessionManager');

// ---------------------------------------------------------------------------
// Mock context/firebase
// ---------------------------------------------------------------------------
const mockSetTheme = jest.fn();

jest.mock('../../../../context/firebase', () => ({
  useGroups: jest.fn(),
}));

const { useGroups } = require('../../../../context/firebase');

// ---------------------------------------------------------------------------
// Mock ThemeContext
// ---------------------------------------------------------------------------
jest.mock('../../../../themes/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const { useTheme } = require('../../../../themes/ThemeContext');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMocks(
  activeGroupUserProfile: any = null,
  theme: any = { name: 'light', colors: { primary: '#fff' } }
) {
  useGroups.mockReturnValue({
    activeGroupUserProfile,
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
  // Theme synchronization
  // -------------------------------------------------------------------------
  describe('theme synchronization', () => {
    test('should call setTheme with the user profile theme preference on mount', () => {
      setupMocks(
        { preferences: { theme: 'dark' } },
        { name: 'light', colors: { primary: '#fff' } }
      );

      render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    test('should not call setTheme when activeGroupUserProfile is null', () => {
      setupMocks(null);

      render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockSetTheme).not.toHaveBeenCalled();
    });

    test('should not call setTheme when user profile has no theme preference', () => {
      setupMocks({ preferences: {} });

      render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockSetTheme).not.toHaveBeenCalled();
    });

    test('should not call setTheme for invalid theme name', () => {
      setupMocks({ preferences: { theme: 'rainbow' } });

      render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockSetTheme).not.toHaveBeenCalled();
    });

    test('should accept "medieval" as a valid theme name', () => {
      setupMocks({ preferences: { theme: 'medieval' } });

      render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockSetTheme).toHaveBeenCalledWith('medieval');
    });

    test('should accept "light" as a valid theme name', () => {
      setupMocks({ preferences: { theme: 'light' } });

      render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    test('should apply theme only once even when profile updates', () => {
      const { rerender } = render(
        <SessionManager>
          <div />
        </SessionManager>
      );

      // First render: no profile
      expect(mockSetTheme).not.toHaveBeenCalled();

      // Profile loads with theme
      useGroups.mockReturnValue({ activeGroupUserProfile: { preferences: { theme: 'dark' } } });

      rerender(
        <SessionManager>
          <div />
        </SessionManager>
      );

      expect(mockSetTheme).toHaveBeenCalledTimes(1);

      // Profile updates again (should NOT apply theme again after initial apply)
      useGroups.mockReturnValue({ activeGroupUserProfile: { preferences: { theme: 'dark' } } });

      rerender(
        <SessionManager>
          <div />
        </SessionManager>
      );

      // Still only called once (ref prevents re-application)
      expect(mockSetTheme).toHaveBeenCalledTimes(1);
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
