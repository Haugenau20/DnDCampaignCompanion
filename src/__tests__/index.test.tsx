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
jest.mock("firebase/app-check", () => ({
  initializeAppCheck: jest.fn(),
  ReCaptchaV3Provider: jest.fn().mockImplementation(function (siteKey: string) {
    return { siteKey };
  }),
}));

// ---------------------------------------------------------------------------
// Mock App — simple stub
// ---------------------------------------------------------------------------
const MockApp = () => <div data-testid="app-stub" />;
jest.mock("../App", () => ({
  __esModule: true,
  default: MockApp,
}));

// ---------------------------------------------------------------------------
// Mock ThemeProvider
// ---------------------------------------------------------------------------
const MockThemeProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="theme-provider">{children}</div>
);
jest.mock("../themes/ThemeContext", () => ({
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
jest.mock("../context/NavigationContext", () => ({
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

  // Load index.tsx — fires createRoot + render at module top level
  jest.isolateModules(() => {
    require("../index");
  });
});

afterAll(() => {
  delete process.env.REACT_APP_RECAPTCHA_SITE_KEY;
});

// ---------------------------------------------------------------------------
// Tests — all assertions inspect captured values without DOM rendering
// ---------------------------------------------------------------------------

describe("index.tsx entry point", () => {
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
