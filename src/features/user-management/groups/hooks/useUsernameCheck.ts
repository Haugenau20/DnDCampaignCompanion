// src/features/user-management/groups/hooks/useUsernameCheck.ts
import { useEffect, useState } from 'react';
import { useUser } from '../../profiles/hooks/useUser';

/** What the caller needs to know about a candidate username. */
export interface UsernameCheck {
  /** True once the name is both valid and free. */
  ready: boolean;
  /** A message to show under the field, or `null`. */
  error: string | null;
  checking: boolean;
}

/** Below this the name is not worth a round trip. */
const MIN_LENGTH = 3;
const MAX_LENGTH = 20;

/**
 * The debounced username check, in one place.
 *
 * Lifted out of `JoinGroupForm` and `RegistrationForm`, which implemented it
 * twice with the same 500ms debounce and subtly different length rules -- one
 * checked only the lower bound, the other both. Both paths now answer the same
 * way, which matters because they lead to the same collection.
 *
 * The 500ms interval is preserved exactly: it is what keeps a name check from
 * firing on every keystroke.
 *
 * @param username The candidate, as typed
 * @returns Whether it may be submitted, and why not if it may not
 */
export function useUsernameCheck(username: string): UsernameCheck {
  const { validateUsername } = useUser();
  const [state, setState] = useState<UsernameCheck>({
    ready: false,
    error: null,
    checking: false,
  });

  useEffect(() => {
    const candidate = username.trim();

    if (!candidate) {
      setState({ ready: false, error: null, checking: false });
      return;
    }
    if (candidate.length < MIN_LENGTH) {
      setState({
        ready: false,
        error: `Name must be at least ${MIN_LENGTH} characters`,
        checking: false,
      });
      return;
    }
    if (candidate.length > MAX_LENGTH) {
      setState({
        ready: false,
        error: `Name must be ${MIN_LENGTH}–${MAX_LENGTH} characters`,
        checking: false,
      });
      return;
    }

    let cancelled = false;
    setState((previous) => ({ ...previous, checking: true }));

    const timer = setTimeout(async () => {
      try {
        const result = await validateUsername(candidate);
        if (cancelled) return;
        setState({
          ready: !!result.isValid && result.isAvailable !== false,
          error: result.error ?? null,
          checking: false,
        });
      } catch {
        if (cancelled) return;
        setState({
          ready: false,
          error: 'Could not check that name. Try again.',
          checking: false,
        });
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, validateUsername]);

  return state;
}

export default useUsernameCheck;
