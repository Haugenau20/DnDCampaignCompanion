// src/core/services/firebase/auth/sessionTimeout.ts
import { INACTIVITY_TIMEOUT } from 'core/constants/time';

/**
 * The session record kept in `localStorage.sessionInfo` at sign-in.
 */
export interface StoredSessionInfo {
  createdAt: number;
  /** Epoch millis at which the session ends, however active it was. */
  expiresAt: number;
  lastActivityAt?: number;
  rememberMe?: boolean;
}

/**
 * When an idle session times out, or `null` when it never does.
 *
 * "Keep me signed in for 30 days" promises 30 days, so a remembered session
 * has no idle limit: only its `expiresAt` ends it (T109). Every other session
 * ends after `INACTIVITY_TIMEOUT` without activity. The sign-out check and the
 * warning before it both ask this, so they cannot disagree.
 *
 * @param info The stored session record
 * @returns Epoch millis of the idle deadline, or `null` for a remembered session
 */
export function idleDeadline(info: StoredSessionInfo): number | null {
  if (info.rememberMe) return null;
  return (info.lastActivityAt ?? info.createdAt) + INACTIVITY_TIMEOUT;
}

/** Where the session record is kept in `localStorage`. */
export const SESSION_INFO_KEY = 'sessionInfo';
