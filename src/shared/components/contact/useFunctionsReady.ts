// src/shared/components/contact/useFunctionsReady.ts
import { useEffect, useRef, useState } from "react";
import ServiceRegistry from "core/services/firebase/core/ServiceRegistry";

/** How often to re-check whether the functions service has registered */
export const FUNCTIONS_POLL_INTERVAL_MS = 250;

/** How long to keep checking before calling it a real failure */
export const FUNCTIONS_POLL_TIMEOUT_MS = 5000;

/**
 * Whether the Firebase Functions service is available yet.
 */
export interface FunctionsReadyState {
  /** True once the service is registered */
  ready: boolean;
  /** True once the polling window has closed without the service appearing */
  failed: boolean;
}

/**
 * Wait for the Firebase Functions service to register, without hanging.
 *
 * The previous implementation checked once, retried once after a second,
 * and then set a terminal error while the submit button read
 * "Initializing..." forever. This polls for a bounded window instead.
 *
 * `failed` is informational: callers should surface it but must NOT disable
 * submit on it. The registry may have recovered since the window closed, and
 * the submit path fetches the callable itself and reports its own errors.
 *
 * @returns The current readiness state
 */
export const useFunctionsReady = (): FunctionsReadyState => {
  const [state, setState] = useState<FunctionsReadyState>(() => {
    try {
      return {
        ready: ServiceRegistry.getInstance().has("functions"),
        failed: false,
      };
    } catch (error) {
      console.error("Failed to access the service registry:", error);
      return { ready: false, failed: true };
    }
  });

  // Held in a ref so the effect below never needs `state` as a dependency,
  // which would tear down and rebuild the interval on every tick.
  const settled = useRef(state.ready || state.failed);

  useEffect(() => {
    if (settled.current) {
      return;
    }

    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += FUNCTIONS_POLL_INTERVAL_MS;

      try {
        if (ServiceRegistry.getInstance().has("functions")) {
          settled.current = true;
          clearInterval(interval);
          setState({ ready: true, failed: false });
          return;
        }
      } catch (error) {
        console.error("Failed to access the service registry:", error);
        settled.current = true;
        clearInterval(interval);
        setState({ ready: false, failed: true });
        return;
      }

      if (elapsed >= FUNCTIONS_POLL_TIMEOUT_MS) {
        settled.current = true;
        clearInterval(interval);
        setState({ ready: false, failed: true });
      }
    }, FUNCTIONS_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return state;
};
