// functions/src/shared/httpsErrors.ts
import {HttpsError} from "firebase-functions/v2/https";

/**
 * Rethrows an already-deliberate `HttpsError` unchanged, and wraps any other
 * error as `HttpsError("internal", fallbackMessage)`.
 *
 * Every callable in this package throws precise codes (`permission-denied`,
 * `not-found`, `failed-precondition`, ...) from inside a `try`. A catch-all
 * that does not special-case `HttpsError` collapses all of those into
 * `internal` -- the code monitoring and retry logic read as "server fault,
 * try again", which is exactly wrong for a permission denial that will
 * never succeed on retry (bug #1407). Routing every catch block through this
 * one function means that rule has a single implementation instead of being
 * re-copied (and occasionally missed) in each callable.
 *
 * `HttpsError` is a singleton class per module resolution, so this check is
 * correct regardless of whether the call site imported it as
 * `functions.HttpsError` (namespace import) or `HttpsError` (named import)
 * -- both refer to the same class from `firebase-functions/v2/https`.
 *
 * Some call sites log every caught error unconditionally before calling this
 * (matching their pre-fix behavior); others only want to log when the error
 * is genuinely unexpected, i.e. when it is about to be wrapped as
 * `internal`. `onWrapped` covers the second case without reintroducing a
 * second `instanceof HttpsError` check at the call site.
 *
 * @param {unknown} error - The value caught in a callable's catch block.
 * @param {string} fallbackMessage - Message to use when `error` is not
 *   already an `HttpsError`. Built by the caller (often interpolating the
 *   original error's message) so this helper does not dictate wording.
 * @param {function(unknown): void} [onWrapped] - Optional callback invoked
 *   with `error` only when it is being wrapped as `internal` (i.e. it was
 *   not already an `HttpsError`). Use this to log only genuine failures.
 */
export function rethrowHttpsError(
  error: unknown,
  fallbackMessage: string,
  onWrapped?: (error: unknown) => void
): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  onWrapped?.(error);
  throw new HttpsError("internal", fallbackMessage);
}
