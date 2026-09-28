// src/app/lazyPage.ts
import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Set for the length of one reload, so a chunk that is missing *after* the
 * reload goes to the error boundary instead of reloading forever.
 */
const RELOAD_FLAG = "lazyPage:reloaded";

/** Reads the flag; storage can be missing or refuse (private mode, blocked). */
function hasReloaded(): boolean {
  try {
    return window.sessionStorage.getItem(RELOAD_FLAG) === "1";
  } catch {
    // Unreadable: behave as if already reloaded, so nothing can loop.
    return true;
  }
}

function setReloaded(value: boolean): void {
  try {
    if (value) window.sessionStorage.setItem(RELOAD_FLAG, "1");
    else window.sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    // Nothing to do: `hasReloaded` already treats unreadable storage as set.
  }
}

/** webpack names a failed chunk request `ChunkLoadError`. */
function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && error.name === "ChunkLoadError";
}

/**
 * A route's page, loaded on first visit instead of in `main.js` (T030).
 *
 * Takes a named export because the page barrels (`pages/story`,
 * `pages/quests`, …) export by name; `React.lazy` wants a default.
 *
 * **A deploy removes the chunks a running tab expects.** Firebase Hosting
 * rewrites every unknown path to `index.html`, so a tab opened before a deploy
 * asks for a chunk that no longer exists and gets HTML back, which webpack
 * reports as a `ChunkLoadError`. The remedy is the new `index.html`, so the
 * first such failure reloads the page. The flag in `sessionStorage` makes it
 * once: if the chunk is still missing after the reload, the error goes to
 * `ErrorBoundary` like any other. Any other error -- a page that throws while
 * its module evaluates -- is not a stale deploy, and is rethrown at once.
 */
export function lazyPage<M extends { [P in K]: ComponentType<any> }, K extends keyof M>(
  load: () => Promise<M>,
  name: K
): LazyExoticComponent<M[K]> {
  return lazy(async () => {
    try {
      const module = await load();
      setReloaded(false);
      return { default: module[name] };
    } catch (error) {
      if (!isChunkLoadError(error) || hasReloaded()) throw error;
      setReloaded(true);
      window.location.reload();
      // Never settles: the page is being replaced, and resolving or
      // rejecting would only flash the fallback or the error boundary first.
      return new Promise<never>(() => undefined);
    }
  });
}
