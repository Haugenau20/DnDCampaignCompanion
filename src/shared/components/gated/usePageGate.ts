// src/shared/components/gated/usePageGate.ts
import { useMemo } from "react";
import { useAuth } from "features/user-management";
import { useCampaignContextStatus } from "shared/hooks/useCampaignContextStatus";
import {
  GATED_COPY,
  gatedHeading,
  GatedPageCopy,
  GatedPageKey,
} from "./gated-page-copy";

/**
 * Where a page is in the gated ladder.
 *
 * `ready` is the only value that renders the page's own content. The
 * empty-campaign state is deliberately absent: an empty campaign is a
 * *successful* load, and its copy belongs to the directory that knows what is
 * missing ("Add the first quest") rather than to a machine that only knows
 * whether anything could be fetched at all.
 */
export type GateState =
  | "resolving"
  | "signed-out"
  | "pick-campaign"
  | "error"
  | "ready";

/** What a page needs in order to render every state consistently. */
export interface PageGate {
  state: GateState;
  /**
   * `state === "ready"`. Gates every control that acts on data — create
   * buttons, filters, sorts, progress bars, bulk-select.
   *
   * It lives on the gate rather than inside a wrapper component because those
   * controls sit in the page *header*, above the gated body, where a wrapper
   * that swallows children cannot reach them.
   */
  canAct: boolean;
  page: GatedPageKey;
  mode: "read" | "write";
  copy: GatedPageCopy;
  /** `copy.heading` or `copy.writeHeading`, already resolved for `mode`. */
  heading: string;
  error: string | null;
  onRetry?: () => void;
}

/** Everything a page can tell the gate about its own fetch. */
export interface PageGateOptions {
  /** The caller's own loading flag, folded into `resolving`. */
  loading?: boolean;
  /** The caller's own fetch error. */
  error?: string | null;
  /** Retry handler, rendered as a button in the error state. */
  onRetry?: () => void;
  /** `"write"` on create and edit routes. Defaults to `"read"`. */
  mode?: "read" | "write";
}

/**
 * The one place the gated-state ladder is written down.
 *
 * Order matters, and it is the spec's table top to bottom, first match winning:
 *
 * 1. `resolving` — auth/group/campaign restoration, or the caller's own fetch.
 * 2. `signed-out` — no user. Ahead of the context check on purpose: being
 *    signed out is *why* there is no campaign, and naming the campaign sends
 *    the visitor looking for a switcher `Header` only renders for members.
 * 3. `pick-campaign` — signed in, but the selection this page needs is absent.
 * 4. `error` — a real failure, once everything above has settled.
 * 5. `ready`.
 *
 * @param page Which page's copy to use
 * @param options The caller's own loading/error state and route mode
 * @returns The page's gate
 */
export function usePageGate(
  page: GatedPageKey,
  options: PageGateOptions = {}
): PageGate {
  const { loading = false, error = null, onRetry, mode = "read" } = options;

  const { user } = useAuth();
  const { isResolving, missingContext } = useCampaignContextStatus();
  const copy = GATED_COPY[page];

  return useMemo(() => {
    // `missingContext` is already null while resolution is in flight (bug
    // #1413), so this can only be true once the selection has settled on
    // nothing. A group-only page ignores a missing campaign entirely.
    const contextMissing =
      copy.requires === "campaign"
        ? missingContext !== null
        : missingContext === "group";

    const state: GateState =
      isResolving || loading
        ? "resolving"
        : !user
        ? "signed-out"
        : contextMissing
        ? "pick-campaign"
        : error
        ? "error"
        : "ready";

    return {
      state,
      canAct: state === "ready",
      page,
      mode,
      copy,
      heading: gatedHeading(copy, mode),
      error,
      onRetry,
    };
  }, [
    copy,
    isResolving,
    loading,
    user,
    missingContext,
    error,
    onRetry,
    page,
    mode,
  ]);
}

export default usePageGate;
