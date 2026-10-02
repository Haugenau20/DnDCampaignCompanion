// src/core/errors/errorRegistry.ts

/**
 * Every failure the app shows as "Something went wrong" carries a reference,
 * `AREA-NN`, so a player can quote it and the maintainer can look it up here.
 * The player never sees Firebase's own text.
 *
 * **A reference is permanent.** Once shipped it is never reused for another
 * failure and never renumbered: a player may quote it months later. To retire
 * one, move it to `RETIRED_REFS` rather than deleting it, so its number is
 * not handed out again.
 *
 * Areas:
 * - `AUTH` — signing in, following an email link, joining from an
 *   invitation, connecting Google to an account
 */

/** One known failure. */
export interface ErrorEntry {
  /** What went wrong, for the maintainer. Never shown to a player. */
  meaning: string;
  /**
   * The error codes that mean this failure: Firebase's (`auth/…`), or a
   * callable's (`functions/…`). Empty for an entry matched by shape instead.
   */
  causes: readonly string[];
}

export const ERROR_REGISTRY = {
  'AUTH-01': {
    meaning: 'App Check rejected the request: the device could not prove it is running the real app (reCAPTCHA Enterprise / App Check). Seen on iOS Safari in PR #117.',
    causes: ['auth/firebase-app-check-token-is-invalid'],
  },
  'AUTH-02': {
    meaning: 'Firebase Auth reported an internal error that was not the sign-up gate refusing (a gate refusal is shown in words). Usually the gateAccountCreation blocking function crashed or timed out.',
    causes: ['auth/internal-error'],
  },
  'AUTH-03': {
    meaning: 'The sign-in method is switched off for the project (Firebase console > Authentication > Sign-in method).',
    causes: ['auth/operation-not-allowed'],
  },
  'AUTH-04': {
    meaning: 'The site\'s domain, or the email link\'s continue URL, is not on the authorised list (Firebase console > Authentication > Settings > Authorised domains).',
    causes: ['auth/unauthorized-domain', 'auth/unauthorized-continue-uri', 'auth/invalid-continue-uri', 'auth/missing-continue-uri'],
  },
  'AUTH-05': {
    meaning: 'The account has been disabled in Firebase Auth.',
    causes: ['auth/user-disabled'],
  },
  'AUTH-06': {
    meaning: 'The browser will not let Firebase store the session: storage blocked, a private mode that refuses it, or an embedded browser.',
    causes: ['auth/web-storage-unsupported', 'auth/operation-not-supported-in-this-environment'],
  },
  'AUTH-07': {
    meaning: 'The app\'s Firebase configuration was refused: API key, app id or app credential.',
    causes: ['auth/invalid-api-key', 'auth/app-not-authorized', 'auth/invalid-app-credential', 'auth/app-deleted'],
  },
  'AUTH-08': {
    meaning: 'A Firebase Auth quota was exceeded (for example the daily email-link sends).',
    causes: ['auth/quota-exceeded'],
  },
  'AUTH-09': {
    meaning: 'A sign-in callable (reserveSignUp, redeemInvitation, the device sign-in functions) failed on the server: an uncaught fault, wrapped by rethrowHttpsError as "internal". Check the function logs.',
    causes: ['functions/internal', 'functions/unknown', 'functions/data-loss', 'functions/aborted', 'functions/unimplemented'],
  },
  'AUTH-10': {
    meaning: 'A sign-in callable could not be reached or did not answer in time.',
    causes: ['functions/unavailable', 'functions/deadline-exceeded', 'functions/cancelled'],
  },
  'AUTH-98': {
    meaning: 'Something that is not an Error, or a JavaScript error such as a TypeError, reached the sign-in error handler: a bug in the app, not a Firebase refusal. Reproduce it with the console open.',
    causes: [],
  },
  'AUTH-99': {
    meaning: 'A Firebase or callable error code that has no entry above. Add one when it is identified.',
    causes: [],
  },
} as const satisfies Record<string, ErrorEntry>;

/** A reference a player can be shown. */
export type ErrorRef = keyof typeof ERROR_REGISTRY;

/**
 * References that were shipped and then withdrawn, with what they meant.
 * Their numbers are never reused.
 */
export const RETIRED_REFS: Readonly<Record<string, string>> = {};

/**
 * The reference for an error code within an area, if the registry knows it.
 *
 * @param area The area prefix, e.g. `AUTH`
 * @param code A Firebase or callable error code, e.g. `auth/user-disabled`
 * @returns The matching reference, or `undefined`
 */
export function refForCode(area: string, code: string): ErrorRef | undefined {
  const refs = Object.keys(ERROR_REGISTRY) as ErrorRef[];
  return refs.find(ref => ref.startsWith(`${area}-`) && (ERROR_REGISTRY[ref].causes as readonly string[]).includes(code));
}

/**
 * A sentence for the player with its reference appended.
 *
 * @param sentence What to tell the player
 * @param ref The failure's reference
 * @returns e.g. "Something went wrong signing you in. Please try again. (Ref: AUTH-01)"
 */
export function withRef(sentence: string, ref: ErrorRef): string {
  return `${sentence} (Ref: ${ref})`;
}
