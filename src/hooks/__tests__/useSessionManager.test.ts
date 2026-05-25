// src/hooks/__tests__/useSessionManager.test.ts
import { renderHook, act } from '@testing-library/react';
import { useSessionManager } from '../useSessionManager';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockSignOut = jest.fn();
const mockRefreshSession = jest.fn();
const mockCheckSessionExpired = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = require('@/features/user-management');

const setupAuthMock = (overrides: Record<string, unknown> = {}) => {
  (useAuth as jest.Mock).mockReturnValue({
    user: { uid: 'user-1', email: 'test@test.com' },
    signOut: mockSignOut,
    refreshSession: mockRefreshSession,
    checkSessionExpired: mockCheckSessionExpired,
    ...overrides,
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useSessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    setupAuthMock();
    mockCheckSessionExpired.mockReturnValue(false);
    mockSignOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Return shape
  // -------------------------------------------------------------------------
  describe('return shape', () => {
    test('should expose checkSession function', () => {
      const { result } = renderHook(() => useSessionManager());
      expect(typeof result.current.checkSession).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // Session check on startup
  // -------------------------------------------------------------------------
  describe('session check on startup', () => {
    test('should call checkSessionExpired on mount when user is logged in', () => {
      renderHook(() => useSessionManager());
      // checkSession is called in the useEffect when user is present
      expect(mockCheckSessionExpired).toHaveBeenCalled();
    });

    test('should not call checkSessionExpired when user is null', () => {
      setupAuthMock({ user: null });
      renderHook(() => useSessionManager());
      expect(mockCheckSessionExpired).not.toHaveBeenCalled();
    });

    test('should call signOut when session is expired on startup', () => {
      mockCheckSessionExpired.mockReturnValue(true);
      renderHook(() => useSessionManager());
      expect(mockSignOut).toHaveBeenCalled();
    });

    test('should not call signOut when session is not expired', () => {
      mockCheckSessionExpired.mockReturnValue(false);
      renderHook(() => useSessionManager());
      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // checkSession function
  // -------------------------------------------------------------------------
  describe('checkSession', () => {
    test('should call signOut when checkSessionExpired returns true', () => {
      mockCheckSessionExpired.mockReturnValue(true);
      const { result } = renderHook(() => useSessionManager());

      act(() => {
        result.current.checkSession();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });

    test('should not call signOut when checkSessionExpired returns false', () => {
      mockCheckSessionExpired.mockReturnValue(false);
      const { result } = renderHook(() => useSessionManager());
      // Reset call count after mount
      mockSignOut.mockClear();

      act(() => {
        result.current.checkSession();
      });

      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Periodic session checking
  // -------------------------------------------------------------------------
  describe('periodic session checking', () => {
    test('should check session periodically via interval', () => {
      mockCheckSessionExpired.mockReturnValue(false);
      renderHook(() => useSessionManager());

      // Record calls after mount
      const callsAfterMount = mockCheckSessionExpired.mock.calls.length;

      // Advance time by SESSION_CHECK_INTERVAL (5 minutes = 300000ms)
      act(() => {
        jest.advanceTimersByTime(300000);
      });

      expect(mockCheckSessionExpired.mock.calls.length).toBeGreaterThan(callsAfterMount);
    });

    test('should sign out when session expires during interval check', () => {
      mockCheckSessionExpired.mockReturnValueOnce(false).mockReturnValue(true);
      renderHook(() => useSessionManager());

      // After mount check (false), advance time to trigger interval
      act(() => {
        jest.advanceTimersByTime(300000);
      });

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Activity tracking
  // -------------------------------------------------------------------------
  describe('activity tracking', () => {
    test('should call refreshSession when user activity is detected after throttle period', () => {
      renderHook(() => useSessionManager());

      // Advance past ACTIVITY_UPDATE_THROTTLE (1 minute = 60000ms) so the
      // throttle check passes (now - lastActivity > ACTIVITY_UPDATE_THROTTLE)
      act(() => {
        jest.advanceTimersByTime(60001);
      });

      // Dispatch a user activity event
      act(() => {
        window.dispatchEvent(new MouseEvent('click'));
      });

      expect(mockRefreshSession).toHaveBeenCalled();
    });

    test('should throttle activity updates (not refresh on every event within throttle window)', () => {
      renderHook(() => useSessionManager());

      // Advance past throttle to allow first update
      act(() => {
        jest.advanceTimersByTime(60001);
      });

      // First click - should refresh
      act(() => {
        window.dispatchEvent(new MouseEvent('click'));
      });

      const callsAfterFirst = mockRefreshSession.mock.calls.length;

      // Immediate second click without advancing time - should be throttled
      act(() => {
        window.dispatchEvent(new MouseEvent('click'));
      });

      // Should not have called again due to throttle
      expect(mockRefreshSession.mock.calls.length).toBe(callsAfterFirst);
    });

    test('should refresh session again after throttle period expires', () => {
      renderHook(() => useSessionManager());

      // Advance past initial throttle for first activity
      act(() => {
        jest.advanceTimersByTime(60001);
      });

      // First activity
      act(() => {
        window.dispatchEvent(new MouseEvent('click'));
      });

      const callsAfterFirst = mockRefreshSession.mock.calls.length;

      // Advance past ACTIVITY_UPDATE_THROTTLE again (1 minute = 60000ms)
      act(() => {
        jest.advanceTimersByTime(60001);
      });

      // Second activity after throttle period
      act(() => {
        window.dispatchEvent(new MouseEvent('click'));
      });

      expect(mockRefreshSession.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });

    test('should not set up activity listeners when user is null', () => {
      setupAuthMock({ user: null });
      const addSpy = jest.spyOn(window, 'addEventListener');

      renderHook(() => useSessionManager());

      // Should not register activity event listeners
      const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove', 'click'];
      const registeredEvents = addSpy.mock.calls.map(([event]) => event);
      const hasActivityListeners = activityEvents.some(e => registeredEvents.includes(e));
      expect(hasActivityListeners).toBe(false);

      addSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------
  describe('cleanup on unmount', () => {
    test('should remove event listeners on unmount', () => {
      const removeSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useSessionManager());
      unmount();

      const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove', 'click'];
      const removedEvents = removeSpy.mock.calls.map(([event]) => event);
      const allRemoved = activityEvents.every(e => removedEvents.includes(e));

      expect(allRemoved).toBe(true);
      removeSpy.mockRestore();
    });

    test('should clear interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() => useSessionManager());
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});
