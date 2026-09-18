// src/shared/components/row-controls/usePendingWrite.ts
import { useCallback, useRef, useState } from "react";

export interface PendingWrite {
  /** A write is in flight. The control shows it and stays operable-looking. */
  isPending: boolean;
  /** What went wrong, in words, or `null`. Cleared when the next write starts. */
  error: string | null;
  /** Run a write. Resolves `true` when it succeeded. */
  run: (write: () => Promise<unknown>) => Promise<boolean>;
  /** Dismiss the error without retrying. */
  clearError: () => void;
}

/**
 * The save contract of `00-entity-authoring.md` §7, as a hook.
 *
 * 1. **Nothing claims success before the write resolves.** No optimistic tick.
 * 2. **A failed write says what happened in words**, next to the control it
 *    happened to.
 *
 * This matters more in a directory than in a form because the record is
 * shared: four people read it, and a row showing a tick nobody's server agreed
 * to is worse than a row showing a spinner.
 *
 * The control keeps rendering the value the *record* holds throughout, so a
 * rejected write needs no rollback -- there is nothing to roll back, which is
 * the point of not being optimistic in the first place.
 */
export function usePendingWrite(): PendingWrite {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Guards `setState` after the row has gone -- a filter can unmount it. */
  const mountedRef = useRef(true);
  const cleanupRef = useRef<(() => void) | null>(null);
  if (!cleanupRef.current) {
    cleanupRef.current = () => {
      mountedRef.current = false;
    };
  }

  const run = useCallback(async (write: () => Promise<unknown>): Promise<boolean> => {
    setIsPending(true);
    setError(null);
    try {
      await write();
      return true;
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "That did not save.");
      }
      return false;
    } finally {
      if (mountedRef.current) setIsPending(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { isPending, error, run, clearError };
}

export default usePendingWrite;
