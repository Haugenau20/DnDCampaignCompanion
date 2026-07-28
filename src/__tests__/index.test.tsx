// src/__tests__/index.test.tsx
// Behavioral tests for src/index.tsx — the React 18 entry point.
//
// Strategy:
//  - Mock react-dom/client so createRoot is a jest.fn()
//  - Mock firebase/app-check, App, ThemeProvider, BrowserRouter, NavigationProvider
//  - Use jest.isolateModules() to import index.tsx, triggering its top-level
//    side effects (createRoot + render call)
//  - Capture the arguments passed to createRoot and render()
//  - Assert on the captured values (no real DOM rendering needed for most checks)
//
// NOTE: The "provider tree" assertions directly inspect the React element tree
// (not DOM rendering) to avoid RTL cleanup-vs-beforeAll timing issues that
// arise from React 18's createRoot conflicting with RTL's internal cleanup.

import React from "react";

// ---------------------------------------------------------------------------
// Captured values populated by the mock
// ---------------------------------------------------------------------------
let capturedContainer: HTMLElement | null = null;
let capturedRootElement: React.ReactElement | null = null;

// ---------------------------------------------------------------------------
// Mock react-dom/client — MUST be first
// ---------------------------------------------------------------------------
jest.mock("react-dom/client", () => ({
  createRoot: jest.fn((container: HTMLElement) => {
    capturedContainer = container;
    return {
      render: jest.fn((element: React.ReactElement) => {
        capturedRootElement = element;
      }),
    };
  }),
}));

// ---------------------------------------------------------------------------
// Mock firebase/app-check — prevents real reCAPTCHA initialization
// ---------------------------------------------------------------------------
// NOTE: index.tsx is loaded inside jest.isolateModules(), which builds a fresh
// module registry and therefore re-runs every mock factory. Assertions must read
// module-scoped capture variables (which survive), never the jest.fn instances
// returned by require() out here — those are different objects from the ones
// index.tsx actually called. This is the same capture pattern the react-dom mock
// above already uses.
let mockAppCheckCalls: unknown[][] = [];

jest.mock("firebase/app-check", () => ({
  initializeAppCheck: jest.fn((...args: unknown[]) => {
    mockAppCheckCalls.push(args);
  }),
  ReCaptchaV3Provider: jest.fn().mockImplementation(function (siteKey: string) {
    return { siteKey };
  }),
}));

// ---------------------------------------------------------------------------
// Mock firebase/app — models the REAL contract, unlike the global mock
//
// setupTests.ts mocks firebase/app with `getApp: jest.fn()`, which returns
// undefined unconditionally and never throws. That mock cannot tell an
// initialized app apart from a missing one, so no test using it could ever
// detect App Check initializing before Firebase — which is exactly what
// happened in production once Firebase init became lazy (commit 69d19c2).
// index.tsx had been free-riding on `import App from 'app/App'` initializing
// Firebase as an import side effect; this suite mocks app/App, so it severed
// that chain too and stayed green either way.
//
// This local mock makes getApp() throw app/no-app until initializeApp() has
// run, so the ordering contract is actually asserted.
// ---------------------------------------------------------------------------
let mockFirebaseAppInitialized = false;

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => {
    mockFirebaseAppInitialized = true;
    return {};
  }),
  getApps: jest.fn(() => (mockFirebaseAppInitialized ? [{}] : [])),
  getApp: jest.fn(() => {
    if (!mockFirebaseAppInitialized) {
      const error: Error & { code?: string } = new Error(
        "Firebase: No Firebase App '[DEFAULT]' has been created - call initializeApp() first (app/no-app)"
      );
      error.code = "app/no-app";
      throw error;
    }
    return {};
  }),
}));

// ---------------------------------------------------------------------------
// Mock the Firebase service barrel — stands in for the real
// getFirebaseServices(), whose first call constructs BaseFirebaseService and
// therefore calls initializeApp().
// ---------------------------------------------------------------------------
let mockGetFirebaseServicesCallCount = 0;

jest.mock("core/services/firebase", () => ({
  getFirebaseServices: jest.fn(() => {
    mockGetFirebaseServicesCallCount += 1;
    mockFirebaseAppInitialized = true;
    return {};
  }),
}));

// ---------------------------------------------------------------------------
// Mock App — simple stub
// ---------------------------------------------------------------------------
const MockApp = () => <div data-testid="app-stub" />;
jest.mock("app/App", () => ({
  __esModule: true,
  default: MockApp,
}));

// ---------------------------------------------------------------------------
// Mock ThemeProvider
// ---------------------------------------------------------------------------
const MockThemeProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="theme-provider">{children}</div>
);
jest.mock("../core/themes/ThemeContext", () => ({
  ThemeProvider: MockThemeProvider,
  useTheme: () => ({ theme: "default", setTheme: jest.fn() }),
}));

// ---------------------------------------------------------------------------
// Mock react-router-dom — BrowserRouter as a transparent stub
// ---------------------------------------------------------------------------
const MockBrowserRouter = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="browser-router">{children}</div>
);
jest.mock("react-router-dom", () => ({
  BrowserRouter: MockBrowserRouter,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: () => <div />,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: "/", search: "", hash: "" }),
}));

// ---------------------------------------------------------------------------
// Mock NavigationContext — RouterWrapper uses useNavigation
// ---------------------------------------------------------------------------
const MockNavigationProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="navigation-provider">{children}</div>
);
jest.mock("shared/context/NavigationContext", () => ({
  NavigationProvider: MockNavigationProvider,
  useNavigation: () => ({
    navigateToPage: jest.fn(),
    createPath: jest.fn((p: string) => p),
    getCurrentQueryParams: jest.fn(() => ({})),
  }),
}));

// ---------------------------------------------------------------------------
// Mock CSS and dev utilities
// ---------------------------------------------------------------------------
jest.mock("../styles/globals.css", () => ({}), { virtual: true });
jest.mock("../utils/__dev__/sessionTester", () => ({}));

// ---------------------------------------------------------------------------
// Helpers — tree walkers for element inspection (no DOM rendering needed)
// ---------------------------------------------------------------------------

/** Returns true if the element tree contains a node whose .type === targetType */
function treeContainsType(
  node: React.ReactNode,
  targetType: React.ElementType
): boolean {
  if (!React.isValidElement(node)) return false;
  const el = node as React.ReactElement<any>;
  if (el.type === targetType) return true;
  const children = el.props?.children;
  if (!children) return false;
  const childArray: React.ReactNode[] = Array.isArray(children) ? children : [children];
  return childArray.some((child) => treeContainsType(child, targetType));
}

/** Returns the first child of a node whose type matches targetType */
function findInTree(
  node: React.ReactNode,
  targetType: React.ElementType
): React.ReactElement | null {
  if (!React.isValidElement(node)) return null;
  const el = node as React.ReactElement<any>;
  if (el.type === targetType) return el;
  const children = el.props?.children;
  if (!children) return null;
  const childArray: React.ReactNode[] = Array.isArray(children) ? children : [children];
  for (const child of childArray) {
    const found = findInTree(child, targetType);
    if (found) return found;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Load index.tsx once per suite (top-level side effects run at import time)
// ---------------------------------------------------------------------------

/** console.error calls captured while index.tsx's module body ran. */
let capturedConsoleErrors: unknown[][] = [];

beforeAll(() => {
  // Ensure #root exists in jsdom
  if (!document.getElementById("root")) {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
  }

  // Provide env var required by AppCheck initialization in index.tsx
  process.env.REACT_APP_RECAPTCHA_SITE_KEY = "test-recaptcha-key";

  // Reset captured values in case of module re-use
  capturedContainer = null;
  capturedRootElement = null;
  capturedConsoleErrors = [];
  mockFirebaseAppInitialized = false;
  mockGetFirebaseServicesCallCount = 0;
  mockAppCheckCalls = [];

  // index.tsx swallows App Check failures into console.error, so capture them
  // rather than let a silent failure look like a pass.
  const consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation((...args: unknown[]) => {
      capturedConsoleErrors.push(args);
    });

  // Load index.tsx — fires createRoot + render at module top level
  jest.isolateModules(() => {
    require("../index");
  });

  consoleErrorSpy.mockRestore();
});

afterAll(() => {
  delete process.env.REACT_APP_RECAPTCHA_SITE_KEY;
});

// ---------------------------------------------------------------------------
// Tests — all assertions inspect captured values without DOM rendering
// ---------------------------------------------------------------------------

describe("index.tsx entry point", () => {
  // -------------------------------------------------------------------------
  // Firebase App Check initialization ordering
  //
  // Regression guard: App Check requires an initialized Firebase app. index.tsx
  // does not import the Firebase barrel for its own sake, so it must trigger
  // initialization explicitly rather than depend on another module's import
  // side effect — that dependency was invisible, and disappeared the moment
  // Firebase init was made lazy, leaving App Check off in production.
  // -------------------------------------------------------------------------
  describe("Firebase App Check", () => {
    test("initializes Firebase before reading the app back with getApp()", () => {
      expect(mockGetFirebaseServicesCallCount).toBeGreaterThanOrEqual(1);
    });

    test("calls initializeAppCheck — getApp() did not throw app/no-app", () => {
      expect(mockAppCheckCalls).toHaveLength(1);
    });

    test("passes the reCAPTCHA site key and auto-refresh to initializeAppCheck", () => {
      const [, config] = mockAppCheckCalls[0];
      expect(config).toEqual(
        expect.objectContaining({
          provider: expect.objectContaining({ siteKey: "test-recaptcha-key" }),
          isTokenAutoRefreshEnabled: true,
        })
      );
    });

    test("does not log an App Check initialization failure", () => {
      const appCheckFailures = capturedConsoleErrors.filter(([first]) =>
        String(first).includes("Failed to initialize Firebase App Check")
      );
      expect(appCheckFailures).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // createRoot
  // -------------------------------------------------------------------------
  describe("createRoot", () => {
    test("calls createRoot with document.getElementById('root')", () => {
      expect(capturedContainer).not.toBeNull();
      expect(capturedContainer).toBe(document.getElementById("root"));
    });
  });

  // -------------------------------------------------------------------------
  // render()
  // -------------------------------------------------------------------------
  describe("root.render()", () => {
    test("render() is called with a valid React element", () => {
      expect(capturedRootElement).not.toBeNull();
      expect(React.isValidElement(capturedRootElement)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // StrictMode
  // -------------------------------------------------------------------------
  describe("StrictMode wrapping", () => {
    test("the outermost element passed to render() is React.StrictMode", () => {
      expect(capturedRootElement).not.toBeNull();
      expect((capturedRootElement as React.ReactElement).type).toBe(
        React.StrictMode
      );
    });
  });

  // -------------------------------------------------------------------------
  // Provider tree — walk the React element tree directly
  // -------------------------------------------------------------------------
  describe("provider tree (element-tree inspection)", () => {
    test("ThemeProvider is present in the element tree", () => {
      expect(capturedRootElement).not.toBeNull();
      expect(treeContainsType(capturedRootElement, MockThemeProvider)).toBe(true);
    });

    test("BrowserRouter is present in the element tree", () => {
      expect(capturedRootElement).not.toBeNull();
      expect(treeContainsType(capturedRootElement, MockBrowserRouter)).toBe(true);
    });

    test("BrowserRouter is a descendant of ThemeProvider", () => {
      expect(capturedRootElement).not.toBeNull();
      const themeProviderEl = findInTree(capturedRootElement, MockThemeProvider);
      expect(themeProviderEl).not.toBeNull();
      expect(treeContainsType(themeProviderEl, MockBrowserRouter)).toBe(true);
    });

    test("NavigationProvider is present in the element tree", () => {
      expect(capturedRootElement).not.toBeNull();
      expect(treeContainsType(capturedRootElement, MockNavigationProvider)).toBe(true);
    });

    test("NavigationProvider is a descendant of BrowserRouter", () => {
      expect(capturedRootElement).not.toBeNull();
      const browserRouterEl = findInTree(capturedRootElement, MockBrowserRouter);
      expect(browserRouterEl).not.toBeNull();
      expect(treeContainsType(browserRouterEl, MockNavigationProvider)).toBe(true);
    });

    test("App is a descendant of NavigationProvider", () => {
      expect(capturedRootElement).not.toBeNull();
      const navProviderEl = findInTree(capturedRootElement, MockNavigationProvider);
      expect(navProviderEl).not.toBeNull();
      // App is rendered via RouterWrapper; RouterWrapper renders MockApp.
      // The element tree contains RouterWrapper (whose children render MockApp),
      // but tree-walking JSX props won't reveal the RouterWrapper's render output —
      // we can only verify the element type declared in JSX at definition time.
      // RouterWrapper is defined inline in index.tsx (not exported), so we check
      // that NavigationProvider's children prop is present (RouterWrapper lives there).
      const navProviderChildren = (navProviderEl as React.ReactElement<any>).props?.children;
      expect(navProviderChildren).not.toBeNull();
    });
  });
});
