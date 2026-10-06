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

/**
 * What a missing route chunk is rejected with. A deploy removes the old
 * chunks, Hosting answers their URLs with `index.html`, and the browser will
 * not run HTML as a module. Each engine words that differently (Chromium,
 * Firefox, Safari, in that order), and Vite's preload helper words a missing
 * stylesheet its own way.
 */
const MISSING_CHUNK = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
];

/** Whether `error` says a route chunk could not be loaded. */
function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && MISSING_CHUNK.some((pattern) => pattern.test(error.message));
}

/** Every page's loader, so `prefetchPages` can warm them all. */
const loaders: Array<() => Promise<unknown>> = [];

/**
 * A route's page, loaded on first visit instead of in the entry bundle (T030).
 *
 * Takes a named export because the page barrels (`pages/story`,
 * `pages/quests`, …) export by name; `React.lazy` wants a default.
 *
 * **A deploy removes the chunks a running tab expects.** Firebase Hosting
 * rewrites every unknown path to `index.html`, so a tab opened before a deploy
 * asks for a chunk that no longer exists and gets HTML back, which the
 * browser refuses to run as a module. The remedy is the new `index.html`, so the
 * first such failure reloads the page. The flag in `sessionStorage` makes it
 * once: if the chunk is still missing after the reload, the error goes to
 * `ErrorBoundary` like any other. Any other error -- a page that throws while
 * its module evaluates -- is not a stale deploy, and is rethrown at once.
 */
export function lazyPage<M extends { [P in K]: ComponentType<any> }, K extends keyof M>(
  load: () => Promise<M>,
  name: K
): LazyExoticComponent<M[K]> {
  loaders.push(load);
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

/**
 * Loads every route's chunk once the browser is idle, so a later visit finds
 * it cached (T030). webpack did this from `webpackPrefetch` comments; Vite
 * has none. A failed prefetch is ignored: the visit itself loads the chunk
 * again, and `lazyPage` handles that failure.
 */
export function prefetchPages(): void {
  const run = () => loaders.forEach((load) => load().catch(() => undefined));
  if ("requestIdleCallback" in window) window.requestIdleCallback(run);
  else setTimeout(run, 2000); // Safari before 18.2 has no requestIdleCallback.
}
