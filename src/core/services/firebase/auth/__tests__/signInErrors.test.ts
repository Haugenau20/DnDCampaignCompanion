// src/core/services/firebase/auth/__tests__/signInErrors.test.ts
import {
  describeSignInError,
  isPopupDismissed,
  signUpRefusal,
} from '../signInErrors';

const withCode = (code: string, message = 'firebase says no') =>
  Object.assign(new Error(message), { code });

/**
 * A refusal from the `gateAccountCreation` blocking function, as the web SDK
 * actually delivers it: a generic internal error whose message embeds the
 * function's own. Shape taken from the Auth emulator's response.
 */
const blocked = (marker: string) =>
  withCode(
    'auth/internal-error',
    `Firebase: HTTP Cloud Function returned an error: {"error":{"message":"${marker}: refused","status":"PERMISSION_DENIED"}} (auth/internal-error).`
  );

describe('signUpRefusal', () => {
  test('recognises the invitation refusal', () => {
    expect(signUpRefusal(blocked('INVITE_REQUIRED'))).toBe('inviteRequired');
  });

  test('recognises the account limit', () => {
    expect(signUpRefusal(blocked('ACCOUNTS_FULL'))).toBe('accountsFull');
  });

  test('is null for anything else', () => {
    expect(signUpRefusal(withCode('auth/internal-error'))).toBeNull();
    expect(signUpRefusal(undefined)).toBeNull();
  });
});

describe('isPopupDismissed', () => {
  test.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])('is true for %s', (code) => {
    expect(isPopupDismissed(withCode(code))).toBe(true);
  });

  test('is false for a blocked popup, which needs saying', () => {
    expect(isPopupDismissed(withCode('auth/popup-blocked'))).toBe(false);
  });
});

describe('describeSignInError', () => {
  test('explains the invitation refusal, in the words the caller chose', () => {
    expect(describeSignInError(blocked('INVITE_REQUIRED'))).toMatch(/invitation link/i);
    expect(describeSignInError(blocked('INVITE_REQUIRED'), 'Pick the other account.')).toBe(
      'Pick the other account.'
    );
  });

  test('never shows the raw marker', () => {
    expect(describeSignInError(blocked('ACCOUNTS_FULL'))).not.toContain('ACCOUNTS_FULL');
  });

  test.each([
    ['auth/invalid-action-code', /expired or has already been used/i],
    ['auth/expired-action-code', /expired or has already been used/i],
    ['auth/popup-blocked', /blocked the google window/i],
    ['auth/account-exists-with-different-credential', /connect google from your profile/i],
    ['auth/network-request-failed', /check your connection/i],
  ])('explains %s', (code, expected) => {
    expect(describeSignInError(withCode(code))).toMatch(expected);
  });

  // `reserveSignUp` and `redeemInvitation` already word their errors for the
  // reader; Firebase's own internals do not.
  test('passes our own callables\' messages through', () => {
    expect(describeSignInError(withCode('functions/failed-precondition', 'This invitation has expired.'))).toBe(
      'This invitation has expired.'
    );
    expect(describeSignInError(new Error('Invalid or expired invitation token'))).toBe(
      'Invalid or expired invitation token'
    );
  });

  test('falls back to a generic sentence for an unrecognised Firebase error', () => {
    expect(describeSignInError(withCode('auth/operation-not-allowed', 'internal detail'))).toBe(
      'Something went wrong signing you in. Please try again.'
    );
  });
});
