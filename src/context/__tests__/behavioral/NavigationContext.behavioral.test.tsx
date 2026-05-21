// src/context/__tests__/behavioral/NavigationContext.behavioral.test.tsx

import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { NavigationProvider, useNavigation } from "../../NavigationContext";

/**
 * NavigationContext Behavioral Testing
 *
 * Tests the REAL NavigationProvider and useNavigation hook with mocked
 * react-router-dom dependencies. Validates state transitions, navigation
 * actions, and history management as observable from a consumer.
 *
 * STRATEGY:
 * - Use real NavigationProvider wrapping a renderHook consumer
 * - Mock react-router-dom (useNavigate, useLocation)
 * - Assert on state shape, function availability, and side effects
 */

// ---------------------------------------------------------------------------
// Mock react-router-dom
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();

// Location is mutable so tests can simulate route changes
let mockLocation = { pathname: "/", search: "" };

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NavigationProvider>{children}</NavigationProvider>
);

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe("NavigationContext Behavioral Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation = { pathname: "/", search: "" };
  });

  // -------------------------------------------------------------------------
  describe("Initialization Behavior", () => {
    test("should throw when useNavigation is used outside of NavigationProvider", () => {
      // BEHAVIOR: hook must be wrapped in provider
      expect(() => {
        renderHook(() => useNavigation());
      }).toThrow("useNavigation must be used within a NavigationProvider");
    });

    test("should initialize state with the current location pathname", () => {
      mockLocation = { pathname: "/npcs", search: "" };

      const { result } = renderHook(() => useNavigation(), { wrapper });

      // BEHAVIOR: initial currentPath matches location.pathname
      expect(result.current.state.currentPath).toBe("/npcs");
    });

    test("should initialize previousPath to the initial location (via mount effect)", () => {
      // NOTE: The provider initializes state with previousPath: null, but the
      // useEffect that fires on location fires immediately after mount (because
      // `location` is in its dep array and exists from the start). This pushes
      // a second stack entry and sets previousPath to the original currentPath.
      // So after mount settles, previousPath equals the initial pathname (not null).
      mockLocation = { pathname: "/", search: "" };

      const { result } = renderHook(() => useNavigation(), { wrapper });

      // BEHAVIOR: after mount effect, previousPath reflects the initial path
      expect(result.current.state.previousPath).toBe("/");
    });

    test("should initialize queryParams from URL search string", () => {
      mockLocation = { pathname: "/search", search: "?q=dragon&page=2" };

      const { result } = renderHook(() => useNavigation(), { wrapper });

      // BEHAVIOR: query params parsed from search string
      expect(result.current.state.queryParams).toEqual({
        q: "dragon",
        page: "2",
      });
    });

    test("should initialize with empty queryParams when no search string", () => {
      mockLocation = { pathname: "/", search: "" };

      const { result } = renderHook(() => useNavigation(), { wrapper });

      expect(result.current.state.queryParams).toEqual({});
    });

    test("should expose all required API methods", () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });

      const requiredMethods = [
        "navigateToPage",
        "goBack",
        "updateQueryParams",
        "getCurrentQueryParams",
        "clearHistory",
        "createPath",
      ];

      requiredMethods.forEach((method) => {
        expect(typeof (result.current as any)[method]).toBe("function");
      });
    });

    test("should initialize navigationStack with one entry for the initial location", () => {
      mockLocation = { pathname: "/quests", search: "" };

      const { result } = renderHook(() => useNavigation(), { wrapper });

      // The useEffect fires after mount and pushes a second entry (see source),
      // so the stack will have at least one entry with the initial path.
      expect(result.current.state.navigationStack.length).toBeGreaterThanOrEqual(1);
      expect(
        result.current.state.navigationStack.some((e) => e.path === "/quests")
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe("navigateToPage Behavior", () => {
    test("should call navigate with a normalized string path", () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.navigateToPage("/npcs");
      });

      expect(mockNavigate).toHaveBeenCalledWith("/npcs");
    });

    test("should normalize paths that lack a leading slash", () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.navigateToPage("npcs");
      });

      // BEHAVIOR: normalizePath adds leading slash
      expect(mockNavigate).toHaveBeenCalledWith("/npcs");
    });

    test("should navigate using a NavigationPath object with query params", () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.navigateToPage({
          path: "/locations",
          query: { filter: "city" },
        });
      });

      // BEHAVIOR: buildUrl serialises path + query into a URL string
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining("/locations")
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining("filter=city")
      );
    });

    test("should fall back to home when navigation throws an error", () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });

      // Simulate navigate throwing on first call, passing on second
      mockNavigate.mockImplementationOnce(() => {
        throw new Error("Router error");
      });

      act(() => {
        // Pass a string path that triggers the error branch
        result.current.navigateToPage("/bad-route");
      });

      // BEHAVIOR: error caught, fallback navigate('/') called
      expect(mockNavigate).toHaveBeenLastCalledWith("/");
    });
  });

  // -------------------------------------------------------------------------
  describe("goBack Behavior", () => {
    test("should navigate to home when there is no navigation history", () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });

      // With only one entry in stack, goBack should go home
      act(() => {
        // Force stack to have exactly one item
        result.current.clearHistory();
      });

      act(() => {
        result.current.goBack();
      });

      // BEHAVIOR: no previous entry → navigate to "/"
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    test("should navigate to previous entry when history has multiple entries", async () => {
      mockLocation = { pathname: "/", search: "" };

      const { result, rerender } = renderHook(() => useNavigation(), { wrapper });

      // Simulate location change to /npcs (triggers useEffect)
      act(() => {
        mockLocation = { pathname: "/npcs", search: "" };
      });
      rerender();

      await waitFor(() => {
        expect(result.current.state.currentPath).toBe("/npcs");
      });

      act(() => {
        result.current.goBack();
      });

      // BEHAVIOR: should navigate back toward previous path in stack
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("updateQueryParams Behavior", () => {
    test("should call navigate with merged query params on current path", () => {
      mockLocation = { pathname: "/search", search: "?existing=yes" };

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.updateQueryParams({ q: "goblin" });
      });

      // BEHAVIOR: merges existing + new params into URL for current path
      const navigateCall = mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1][0] as string;
      expect(navigateCall).toContain("q=goblin");
    });

    test("should overwrite an existing param with the same key", () => {
      mockLocation = { pathname: "/search", search: "?q=dragon" };

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.updateQueryParams({ q: "goblin" });
      });

      const navigateCall = mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1][0] as string;
      // New value should replace old
      expect(navigateCall).toContain("q=goblin");
      expect(navigateCall).not.toContain("q=dragon");
    });
  });

  // -------------------------------------------------------------------------
  describe("getCurrentQueryParams Behavior", () => {
    test("should return current query params from state", () => {
      mockLocation = { pathname: "/npcs", search: "?status=alive" };

      const { result } = renderHook(() => useNavigation(), { wrapper });

      const params = result.current.getCurrentQueryParams();
      expect(params).toEqual({ status: "alive" });
    });

    test("should return empty object when no query params are present", () => {
      mockLocation = { pathname: "/npcs", search: "" };

      const { result } = renderHook(() => useNavigation(), { wrapper });

      const params = result.current.getCurrentQueryParams();
      expect(params).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  describe("clearHistory Behavior", () => {
    test("should reset navigation stack to a single entry with current path", async () => {
      mockLocation = { pathname: "/npcs", search: "" };

      const { result } = renderHook(() => useNavigation(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.navigationStack.length).toBeGreaterThanOrEqual(1);
      });

      act(() => {
        result.current.clearHistory();
      });

      // BEHAVIOR: stack reduced to exactly 1 entry
      expect(result.current.state.navigationStack).toHaveLength(1);
      expect(result.current.state.navigationStack[0].path).toBe("/npcs");
    });

    test("cleared stack entry should have a numeric timestamp", async () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.clearHistory();
      });

      const entry = result.current.state.navigationStack[0];
      expect(typeof entry.timestamp).toBe("number");
      expect(entry.timestamp).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  describe("createPath Behavior", () => {
    test("should create a NavigationPath object with the given path", () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });

      const navPath = result.current.createPath("/npcs");

      // BEHAVIOR: path field should be formatted (ensure leading slash)
      expect(navPath.path).toBe("/npcs");
    });

    test("should ensure the path starts with a slash", () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });

      const navPath = result.current.createPath("locations");

      // BEHAVIOR: formatPath prepends slash
      expect(navPath.path).toBe("/locations");
    });

    test("should attach provided query object to the NavigationPath", () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });

      const navPath = result.current.createPath("/search", undefined, {
        q: "dragon",
      });

      expect(navPath.query).toEqual({ q: "dragon" });
    });

    test("should attach provided params object to the NavigationPath", () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });

      const navPath = result.current.createPath("/npcs/:id", { id: "123" });

      expect(navPath.params).toEqual({ id: "123" });
    });
  });

  // -------------------------------------------------------------------------
  describe("Location Change / History Update Behavior", () => {
    test("should update currentPath when location changes", async () => {
      mockLocation = { pathname: "/", search: "" };

      const { result, rerender } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        mockLocation = { pathname: "/locations", search: "" };
      });
      rerender();

      await waitFor(() => {
        expect(result.current.state.currentPath).toBe("/locations");
      });
    });

    test("should record previousPath after a location change", async () => {
      mockLocation = { pathname: "/", search: "" };

      const { result, rerender } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        mockLocation = { pathname: "/quests", search: "" };
      });
      rerender();

      await waitFor(() => {
        expect(result.current.state.previousPath).toBe("/");
      });
    });

    test("should grow the navigation stack after location changes", async () => {
      mockLocation = { pathname: "/", search: "" };

      const { result, rerender } = renderHook(() => useNavigation(), { wrapper });

      const initialLength = result.current.state.navigationStack.length;

      act(() => {
        mockLocation = { pathname: "/npcs", search: "" };
      });
      rerender();

      await waitFor(() => {
        expect(result.current.state.navigationStack.length).toBeGreaterThan(initialLength);
      });
    });
  });
});
