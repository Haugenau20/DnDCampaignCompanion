// src/app/__tests__/lazyPage.test.tsx
import React, { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { lazyPage } from "app/lazyPage";

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

/** What webpack rejects a failed chunk request with. */
function chunkLoadError(): Error {
  const error = new Error("Loading chunk 123 failed.");
  error.name = "ChunkLoadError";
  return error;
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

  test("a missing chunk reloads the page and marks the session", async () => {
    const Page = lazyPage(failing(chunkLoadError()), "default");

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

    expect(await screen.findByTestId("boundary")).toHaveTextContent("Loading chunk 123 failed.");
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
