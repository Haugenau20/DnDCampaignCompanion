// src/core/utils/local-storage.ts

/**
 * `localStorage` for preferences the app can live without.
 *
 * Every access can throw: a browser with site data blocked, and some private
 * modes, raise `SecurityError` on merely touching `window.localStorage`, and
 * a full store raises `QuotaExceededError` on a write. Read unguarded during a
 * render, that takes down everything below it -- `ThemeProvider` sits above
 * the app's error boundary, so the page rendered nothing at all (T092).
 *
 * Use these for anything that is a convenience (a theme, a view toggle, a
 * dismissed notice). They make an unavailable store look like an empty one.
 */

/**
 * Read a stored value.
 * @param key The storage key
 * @returns The value, or `null` when it is absent or storage is unavailable
 */
export function readLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Store a value, best effort.
 * @param key The storage key
 * @param value The value to store
 * @returns Whether it was stored
 */
export function writeLocalStorage(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
