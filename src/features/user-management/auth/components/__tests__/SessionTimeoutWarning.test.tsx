// src/components/features/auth/__tests__/SessionTimeoutWarning.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SessionTimeoutWarning from '../SessionTimeoutWarning';
import { INACTIVITY_TIMEOUT, SESSION_WARNING_THRESHOLD } from '@/constants/time';

// ---------------------------------------------------------------------------
// Mock context/firebase
// ---------------------------------------------------------------------------
const mockRefreshSession = jest.fn();
const mockSignOut = jest.fn();
const mockRenewSession = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = require('@/features/user-management');

// ---------------------------------------------------------------------------
// Mock Dialog to avoid portal rendering issues
// ---------------------------------------------------------------------------
jest.mock('@/components/core/Dialog', () => {
  const Dialog = ({ open, children, title }: any) => {
    if (!open) return null;
    return (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    );
  };
  return Dialog;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser() {
  return { uid: 'user-1', email: 'test@test.com' };
}

function setupMocks(userOverride: any = makeUser()) {
  useAuth.mockReturnValue({
    user: userOverride,
    refreshSession: mockRefreshSession,
    signOut: mockSignOut,
    renewSession: mockRenewSession,
  });
}

function setSessionInfo(overrides: Record<string, any> = {}) {
  const now = Date.now();
  const defaults = {
    lastActivityAt: now,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
    rememberMe: false,
    ...overrides,
  };
  localStorage.setItem('sessionInfo', JSON.stringify(defaults));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionTimeoutWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
    setupMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  // -------------------------------------------------------------------------
  // No warning shown
  // -------------------------------------------------------------------------
  describe('no warning state', () => {
    test('should render nothing when no user is logged in', () => {
      setupMocks(null);
      const { container } = render(<SessionTimeoutWarning />);
      expect(container.firstChild).toBeNull();
    });

    test('should render nothing when sessionInfo is not in localStorage', () => {
      const { container } = render(<SessionTimeoutWarning />);
      expect(container.firstChild).toBeNull();
    });

    test('should render nothing when session has plenty of time left', () => {
      const now = Date.now();
      setSessionInfo({
        lastActivityAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours away
      });
      const { container } = render(<SessionTimeoutWarning />);
      expect(container.firstChild).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Inactivity warning
  // -------------------------------------------------------------------------
  describe('inactivity timeout warning', () => {
    test('should show warning when inactivity expiry is within SESSION_WARNING_THRESHOLD', () => {
      const now = Date.now();
      // Last activity was almost INACTIVITY_TIMEOUT ago, leaving < SESSION_WARNING_THRESHOLD
      const lastActivityAt = now - INACTIVITY_TIMEOUT + (SESSION_WARNING_THRESHOLD - 60000); // 4 min left
      setSessionInfo({
        lastActivityAt,
        expiresAt: now + 24 * 60 * 60 * 1000, // absolute expiry is far away
      });

      render(<SessionTimeoutWarning />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/session expiring soon/i)).toBeInTheDocument();
    });

    test('should show inactivity warning text', () => {
      const now = Date.now();
      const lastActivityAt = now - INACTIVITY_TIMEOUT + (SESSION_WARNING_THRESHOLD - 60000);
      setSessionInfo({ lastActivityAt, expiresAt: now + 24 * 60 * 60 * 1000 });

      render(<SessionTimeoutWarning />);

      expect(screen.getByText(/inactivity/i)).toBeInTheDocument();
    });

    test('should show "Extend Session" button for inactivity warning', () => {
      const now = Date.now();
      const lastActivityAt = now - INACTIVITY_TIMEOUT + (SESSION_WARNING_THRESHOLD - 60000);
      setSessionInfo({ lastActivityAt, expiresAt: now + 24 * 60 * 60 * 1000 });

      render(<SessionTimeoutWarning />);

      expect(screen.getByRole('button', { name: /extend session/i })).toBeInTheDocument();
    });

    test('should NOT show "Remember me" checkbox for inactivity warning', () => {
      const now = Date.now();
      const lastActivityAt = now - INACTIVITY_TIMEOUT + (SESSION_WARNING_THRESHOLD - 60000);
      setSessionInfo({ lastActivityAt, expiresAt: now + 24 * 60 * 60 * 1000 });

      render(<SessionTimeoutWarning />);

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Absolute session timeout warning
  // -------------------------------------------------------------------------
  describe('absolute session timeout warning', () => {
    test('should show warning when absolute expiry is within SESSION_WARNING_THRESHOLD', () => {
      const now = Date.now();
      // Absolute expiry in 3 minutes (within 5-min threshold)
      setSessionInfo({
        expiresAt: now + 3 * 60000,
        lastActivityAt: now, // activity is recent, so inactivity is not triggered
      });

      render(<SessionTimeoutWarning />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('should show "Renew Session" button for absolute timeout warning', () => {
      const now = Date.now();
      setSessionInfo({
        expiresAt: now + 3 * 60000,
        lastActivityAt: now,
      });

      render(<SessionTimeoutWarning />);

      expect(screen.getByRole('button', { name: /renew session/i })).toBeInTheDocument();
    });

    test('should show "Remember me" checkbox for absolute session timeout', () => {
      const now = Date.now();
      setSessionInfo({
        expiresAt: now + 3 * 60000,
        lastActivityAt: now,
      });

      render(<SessionTimeoutWarning />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    test('should pre-check rememberMe when sessionInfo.rememberMe is true', () => {
      const now = Date.now();
      setSessionInfo({
        expiresAt: now + 3 * 60000,
        lastActivityAt: now,
        rememberMe: true,
      });

      render(<SessionTimeoutWarning />);

      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });

  // -------------------------------------------------------------------------
  // Extend / Renew actions
  // -------------------------------------------------------------------------
  describe('extend and renew session actions', () => {
    test('should call refreshSession when Extend Session is clicked', async () => {
      const now = Date.now();
      const lastActivityAt = now - INACTIVITY_TIMEOUT + (SESSION_WARNING_THRESHOLD - 60000);
      setSessionInfo({ lastActivityAt, expiresAt: now + 24 * 60 * 60 * 1000 });

      render(<SessionTimeoutWarning />);

      fireEvent.click(screen.getByRole('button', { name: /extend session/i }));

      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    });

    test('should hide warning after extending session', async () => {
      const now = Date.now();
      const lastActivityAt = now - INACTIVITY_TIMEOUT + (SESSION_WARNING_THRESHOLD - 60000);
      setSessionInfo({ lastActivityAt, expiresAt: now + 24 * 60 * 60 * 1000 });

      render(<SessionTimeoutWarning />);
      fireEvent.click(screen.getByRole('button', { name: /extend session/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('should call renewSession when Renew Session is clicked', async () => {
      mockRenewSession.mockResolvedValue(undefined);
      const now = Date.now();
      setSessionInfo({ expiresAt: now + 3 * 60000, lastActivityAt: now });

      render(<SessionTimeoutWarning />);

      fireEvent.click(screen.getByRole('button', { name: /renew session/i }));

      await waitFor(() => {
        expect(mockRenewSession).toHaveBeenCalledTimes(1);
      });
    });

    test('should call renewSession with rememberMe state when renewing', async () => {
      mockRenewSession.mockResolvedValue(undefined);
      const now = Date.now();
      setSessionInfo({ expiresAt: now + 3 * 60000, lastActivityAt: now, rememberMe: false });

      render(<SessionTimeoutWarning />);

      // Check the rememberMe checkbox
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /renew session/i }));

      await waitFor(() => {
        expect(mockRenewSession).toHaveBeenCalledWith(true);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Sign out
  // -------------------------------------------------------------------------
  describe('sign out', () => {
    test('should call signOut when Sign Out button is clicked', () => {
      const now = Date.now();
      const lastActivityAt = now - INACTIVITY_TIMEOUT + (SESSION_WARNING_THRESHOLD - 60000);
      setSessionInfo({ lastActivityAt, expiresAt: now + 24 * 60 * 60 * 1000 });

      render(<SessionTimeoutWarning />);

      fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Periodic check
  // -------------------------------------------------------------------------
  describe('periodic session check', () => {
    test('should check session on interval and show warning when time runs low', async () => {
      // Start with plenty of time
      const now = Date.now();
      setSessionInfo({
        lastActivityAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000,
      });

      render(<SessionTimeoutWarning />);
      // No warning initially
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Simulate time passing so inactivity threshold is now within warning range
      // Move clock forward: nearly INACTIVITY_TIMEOUT - SESSION_WARNING_THRESHOLD + 1min
      act(() => {
        jest.advanceTimersByTime(INACTIVITY_TIMEOUT - SESSION_WARNING_THRESHOLD + 60000);
      });

      // The interval fires (every 60000ms) after time advances
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    test('should clean up interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      setSessionInfo({ lastActivityAt: Date.now(), expiresAt: Date.now() + 24 * 60 * 60 * 1000 });

      const { unmount } = render(<SessionTimeoutWarning />);
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});
