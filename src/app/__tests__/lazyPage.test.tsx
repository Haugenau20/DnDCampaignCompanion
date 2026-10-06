// src/app/__tests__/lazyPage.test.tsx
import React, { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { lazyPage, prefetchPages } from "app/lazyPage";

/**
 * Requirements, from the helper's contract:
 * - a loaded chunk renders the named export;
 * - a chunk missing after a deploy reloads the page, once per session;
 * - a second miss, or any error that is not a missing chunk, reaches the
 *   error boundary instead of reloading.
 */

const FLAG = "lazyPage:reloaded";
const originalLocation = window.location;
const reload = jest.fn();

/**
 * What a browser rejects a missing route chunk with, once a deploy has removed
 * it and Hosting answers its URL with index.html. Each engine words it
 * differently; Vite's preload helper words a missing stylesheet its own way.
 */
const MISSING_CHUNK_ERRORS: Array<[string, () => Error]> = [
  ["Chromium", () => new TypeError("Failed to fetch dynamically imported module: https://example.test/assets/QuestsPage-abc123.js")],
  ["Firefox", () => new TypeError("error loading dynamically imported module: https://example.test/assets/QuestsPage-abc123.js")],
  ["Safari", () => new TypeError("Importing a module script failed.")],
  ["Vite, for a stylesheet", () => new Error("Unable to preload CSS for /assets/QuestsPage-abc123.css")],
];

/** The Chromium wording, for the tests that are not about wording. */
function chunkLoadError(): Error {
  return MISSING_CHUNK_ERRORS[0][1]();
}

/** A loader that fails, typed as the page module it failed to be. */
function failing(error: Error): () => Promise<{ default: React.FC }> {
  return () => Promise.reject(error);
}

/** Stands in for `ErrorBoundary`, so a rethrown load error is observable. */
class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <div data-testid="boundary">{this.state.error.message}</div>
    ) : (
      this.props.children
    );
  }
}

function renderLazy(Page: React.ComponentType) {
  return render(
    <Boundary>
      <Suspense fallback={<div data-testid="fallback" />}>
        <Page />
      </Suspense>
    </Boundary>
  );
}

beforeEach(() => {
  reload.mockReset();
  window.sessionStorage.clear();
  Object.defineProperty(window, "location", {
    value: { reload },
    writable: true,
  });
  // React logs every error a boundary catches; those are the point here.
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  jest.restoreAllMocks();
});

describe("lazyPage", () => {
  test("renders the named export once the chunk arrives", async () => {
    const Page = lazyPage(
      () => Promise.resolve({ QuestsPage: () => <p>the quests</p> }),
      "QuestsPage"
    );

    renderLazy(Page);

    expect(await screen.findByText("the quests")).toBeInTheDocument();
  });

  test.each(MISSING_CHUNK_ERRORS)("a missing chunk (%s) reloads the page and marks the session", async (_engine, makeError) => {
    const Page = lazyPage(failing(makeError()), "default");

    renderLazy(Page);

    await screen.findByTestId("fallback");
    await Promise.resolve();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(FLAG)).toBe("1");
    // The page is being replaced; nothing is surfaced in the meantime.
    expect(screen.queryByTestId("boundary")).not.toBeInTheDocument();
  });

  test("a chunk still missing after the reload reaches the error boundary", async () => {
    window.sessionStorage.setItem(FLAG, "1");
    const Page = lazyPage(failing(chunkLoadError()), "default");

    renderLazy(Page);

    expect(await screen.findByTestId("boundary")).toHaveTextContent("Failed to fetch dynamically imported module");
    expect(reload).not.toHaveBeenCalled();
  });

  test("an error that is not a missing chunk is never answered with a reload", async () => {
    const Page = lazyPage(failing(new Error("page threw on import")), "default");

    renderLazy(Page);

    expect(await screen.findByTestId("boundary")).toHaveTextContent("page threw on import");
    expect(reload).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(FLAG)).toBeNull();
  });

  test("a successful load clears the mark, so a later deploy can reload again", async () => {
    window.sessionStorage.setItem(FLAG, "1");
    const Page = lazyPage(
      () => Promise.resolve({ default: () => <p>loaded</p> }),
      "default"
    );

    renderLazy(Page);

    await screen.findByText("loaded");
    expect(window.sessionStorage.getItem(FLAG)).toBeNull();
  });

  test("unreadable storage never reloads, so it can never loop", async () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const Page = lazyPage(failing(chunkLoadError()), "default");

    renderLazy(Page);

    expect(await screen.findByTestId("boundary")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("prefetchPages", () => {
  let idle: (() => void) | undefined;

  beforeEach(() => {
    idle = undefined;
    (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback = (cb) => {
      idle = cb;
      return 1;
    };
  });

  afterEach(() => {
    delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
  });

  // The registry is module-wide, so the pages earlier tests declared are
  // prefetched too; each test asserts only on its own loaders.
  test("loads every page once the browser is idle, and not before", () => {
    const quests = jest.fn(() => Promise.resolve({ default: () => null }));
    const notes = jest.fn(() => Promise.resolve({ default: () => null }));
    lazyPage(quests, "default");
    lazyPage(notes, "default");

    prefetchPages();
    expect(quests).not.toHaveBeenCalled();

    idle?.();
    expect(quests).toHaveBeenCalledTimes(1);
    expect(notes).toHaveBeenCalledTimes(1);
  });

  test("a failed prefetch is swallowed and never reloads", async () => {
    const missing = jest.fn(() => Promise.reject(chunkLoadError()));
    lazyPage(missing, "default");

    prefetchPages();
    idle?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(missing).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(FLAG)).toBeNull();
  });
});
