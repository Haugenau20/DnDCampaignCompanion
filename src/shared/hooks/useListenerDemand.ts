// src/shared/hooks/useListenerDemand.ts
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * How long a listener stays open after the last component reading it has
 * unmounted (T032, `PERF-03`).
 *
 * Reopening a listener reads its whole collection again, while an open,
 * quiet listener costs nothing -- so going from a page to its detail page and
 * back, or glancing at another page for a minute, should not pay for the
 * collection twice.
 */
export const LISTENER_LINGER_MS = 5 * 60 * 1000;

/** Registers interest in a listener; call the returned function to drop it. */
export type RetainListener = () => () => void;

/**
 * Counts the components that want a provider's listener open.
 *
 * The providers sit above the router, because quick add and the header
 * search need their write methods and lists from any route. Listening there
 * unconditionally meant every signed-in route read every collection -- the
 * privacy page included. With this, a provider listens only while something
 * reads its list, and for `lingerMs` after.
 *
 * @param lingerMs How long `wanted` stays true after the last release
 * @returns `wanted`, and `retain`, which is stable for the provider's life
 */
export function useListenerDemand(lingerMs: number = LISTENER_LINGER_MS) {
  const [wanted, setWanted] = useState(false);
  const holders = useRef(0);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);

  const retain = useCallback<RetainListener>(() => {
    holders.current += 1;
    if (closing.current !== null) {
      clearTimeout(closing.current);
      closing.current = null;
    }
    setWanted(true);

    let released = false;
    return () => {
      if (released) return;
      released = true;
      holders.current -= 1;
      if (holders.current > 0) return;
      if (lingerMs <= 0) {
        setWanted(false);
        return;
      }
      closing.current = setTimeout(() => {
        closing.current = null;
        setWanted(false);
      }, lingerMs);
    };
  }, [lingerMs]);

  useEffect(() => () => {
    if (closing.current !== null) clearTimeout(closing.current);
  }, []);

  return { wanted, retain };
}

/**
 * Holds a listener open while the calling component is mounted and `enabled`
 * is true. A missing `retain` (no provider above, as in suites that mock the
 * context) holds nothing.
 */
export function useRetainListener(retain: RetainListener | undefined, enabled = true) {
  useEffect(() => (enabled && retain ? retain() : undefined), [retain, enabled]);
}

/**
 * Creates the context a provider publishes its `retain` through, and the hook
 * its consumer hook calls. Kept apart from the provider's main value so that
 * value's public type does not change.
 */
export function createListenerDemandContext() {
  const DemandContext = createContext<RetainListener | undefined>(undefined);

  /** Holds the provider's listener open while mounted, unless `subscribe` is false. */
  const useDemand = (subscribe = true) => {
    useRetainListener(useContext(DemandContext), subscribe);
  };

  return { DemandProvider: DemandContext.Provider, useDemand };
}

/** What every list-reading hook accepts: whether this caller reads the list. */
export interface ListReaderOptions {
  /**
   * `false` for a caller that only writes (or reads the list only sometimes,
   * and says when): it then does not hold the listener open. Defaults to
   * `true`.
   */
  subscribe?: boolean;
}
