// src/core/services/firebase/auth/signInErrors.ts

/**
 * Markers the `gateAccountCreation` blocking function puts in a refusal.
 *
 * A blocking function's refusal reaches the client as `auth/internal-error`
 * with the function's own message embedded in Firebase's, so matching on these
 * strings is the only way to tell "no invitation" from a real fault. They
 * mirror `REFUSAL` in `firebase/functions/src/signUp/signUpGate.ts` -- the two
 * packages cannot share a module, so keep them in step.
 */
export const SIGN_UP_REFUSAL = {
  inviteRequired: 'INVITE_REQUIRED',
  accountsFull: 'ACCOUNTS_FULL',
} as const;

/** Why the sign-up gate refused, or `null` when it was not the gate. */
export type SignUpRefusal = 'inviteRequired' | 'accountsFull' | null;

/**
 * The Firebase error code, when `error` carries one.
 * @param error Whatever was thrown
 */
const codeOf = (error: unknown): string | undefined =>
  typeof (error as { code?: unknown })?.code === 'string'
    ? (error as { code: string }).code
    : undefined;

/**
 * Whether the sign-up gate refused, and why.
 * @param error Whatever the sign-in threw
 */
export function signUpRefusal(error: unknown): SignUpRefusal {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes(SIGN_UP_REFUSAL.inviteRequired)) return 'inviteRequired';
  if (message.includes(SIGN_UP_REFUSAL.accountsFull)) return 'accountsFull';
  return null;
}

/** True when the person closed or abandoned the Google popup themselves. */
export function isPopupDismissed(error: unknown): boolean {
  const code = codeOf(error);
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}

/**
 * A sentence to show for a failed sign-in, link or link-up.
 *
 * `inviteRequiredMessage` lets each surface say what the refusal means where
 * it happened: on the sign-in page it means "you have no account", on the
 * join page it means "you picked a different address from the one above".
 *
 * @param error Whatever was thrown
 * @param inviteRequiredMessage What to say when the gate found no invitation
 */
export function describeSignInError(
  error: unknown,
  inviteRequiredMessage = 'There is no account for this address. Accounts are created from an invitation link — ask someone in your group for one.'
): string {
  const refusal = signUpRefusal(error);
  if (refusal === 'inviteRequired') return inviteRequiredMessage;
  if (refusal === 'accountsFull') {
    return 'This site is not taking new accounts right now. Let whoever invited you know.';
  }

  switch (codeOf(error)) {
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return 'This sign-in link has expired or has already been used. Ask for a new one.';
    case 'auth/invalid-email':
      return 'That email address does not match the one this link was sent to.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google window. Press the button again to open it.';
    case 'auth/account-exists-with-different-credential':
      return 'This email already has an account here. Sign in with an email link, then connect Google from your profile.';
    case 'auth/credential-already-in-use':
      return 'That Google account is already used by a different account here.';
    case 'auth/provider-already-linked':
      return 'Google is already connected to this account.';
    case 'auth/network-request-failed':
      return 'Could not reach the server. Check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.';
    default:
      break;
  }

  // Our own callables (`reserveSignUp`, `redeemInvitation`) and services word
  // their errors for the reader already; Firebase's own do not.
  const code = codeOf(error);
  if (error instanceof Error && (!code || code.startsWith('functions/'))) {
    return error.message;
  }
  return 'Something went wrong signing you in. Please try again.';
}
