// src/features/user-management/auth/hooks/useDeviceSignInWait.ts
import { useEffect, useRef, useState } from 'react';
import type { DeviceSignInRequest } from 'core/services/firebase/auth/AuthService';
import { useAuth } from './useAuth';

/** How often to ask whether the request has been approved. */
export const DEVICE_SIGN_IN_POLL_MS = 3000;

/** Where the wait is. */
export type DeviceSignInWait = 'idle' | 'waiting' | 'expired';

/**
 * Wait for another device to approve `request`, and hand over the sign-in
 * token when it does.
 *
 * Polls `claimDeviceSignIn` every few seconds while the page is visible --
 * a hidden tab skips its turn, and catches up as soon as it is shown again.
 * A failed poll (a dropped connection) is simply tried again next turn; the
 * request's own expiry is what ends the wait.
 *
 * @param request The request to wait on, or null for none
 * @param onApproved Called once, with the token, when approved
 * @returns Where the wait is
 */
export function useDeviceSignInWait(
  request: DeviceSignInRequest | null,
  onApproved: (token: string) => void
): DeviceSignInWait {
  const { claimDeviceSignIn } = useAuth();
  const [expiredFor, setExpiredFor] = useState<string | null>(null);
  // The latest callback, without restarting the loop when it changes.
  const approved = useRef(onApproved);
  approved.current = onApproved;

  useEffect(() => {
    if (!request) return undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One claim at a time: two in flight could see "approved" and then
    // "expired" (already claimed) arrive in the wrong order.
    let inFlight = false;

    const expire = () => {
      stopped = true;
      setExpiredFor(request.requestId);
    };

    const poll = async () => {
      if (stopped) return;
      if (Date.now() >= request.expiresAt) {
        expire();
        return;
      }
      if (!document.hidden) {
        inFlight = true;
        try {
          const result = await claimDeviceSignIn(request);
          if (stopped) return;
          if (result.status === 'approved') {
            stopped = true;
            approved.current(result.token);
            return;
          }
          if (result.status === 'expired') {
            expire();
            return;
          }
        } catch (err) {
          console.error('Could not check the sign-in request:', err);
        } finally {
          inFlight = false;
        }
      }
      if (!stopped) timer = setTimeout(poll, DEVICE_SIGN_IN_POLL_MS);
    };

    const onVisible = () => {
      if (document.hidden || stopped || inFlight) return;
      clearTimeout(timer);
      poll();
    };

    timer = setTimeout(poll, DEVICE_SIGN_IN_POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [request, claimDeviceSignIn]);

  if (!request) return 'idle';
  return expiredFor === request.requestId ? 'expired' : 'waiting';
}
