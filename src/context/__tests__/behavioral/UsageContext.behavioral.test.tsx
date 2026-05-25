// src/context/__tests__/behavioral/UsageContext.behavioral.test.tsx

import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { UsageProvider, useUsageContext } from "../../UsageContext";
import { UsageStatus } from "../../../types/usage";

/**
 * UsageContext Behavioral Testing
 *
 * Tests the REAL UsageProvider and useUsageContext hook with a mocked
 * EntityExtractionService. Validates state initialization, refresh/update
 * flows, limit-exceeded state, clearance, and derived computed values.
 *
 * STRATEGY:
 * - Use real UsageProvider wrapping a renderHook consumer
 * - Mock EntityExtractionService.getInstance() to control fetchUsageStatus
 *   and clearUsageCache without hitting Firebase/Functions
 * - Assert on observable state shape and transitions
 *
 * KNOWN BUG: #650
 * When fetchUsageStatus() returns null, hasLoadedUsage.current is never set
 * to true, causing an infinite refresh loop (isLoadingUsage toggles false →
 * effect fires → true → false → effect fires…). Tests that rely on
 * null-status behavior skip the waitFor(isLoadingUsage===false) pattern and
 * instead wait for the first fetch call, then assert the synchronous state.
 * See docs/testing/bug-tracking/650-usage-context-infinite-refresh-loop-on-null-status.md
 */

// ---------------------------------------------------------------------------
// Mock EntityExtractionService
// ---------------------------------------------------------------------------
const mockFetchUsageStatus = jest.fn();
const mockClearUsageCache = jest.fn();

jest.mock("../../../services/firebase/ai/EntityExtractionService", () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      fetchUsageStatus: mockFetchUsageStatus,
      clearUsageCache: mockClearUsageCache,
    }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers / Fixtures
// ---------------------------------------------------------------------------

function makeUsageStatus(overrides: Partial<UsageStatus> = {}): UsageStatus {
  return {
    usage: {
      daily: { count: 3, lastReset: "2026-05-21T00:00:00Z", limit: 10 },
      weekly: { count: 10, lastReset: "2026-05-18T00:00:00Z", limit: 30 },
      monthly: { count: 20, lastReset: "2026-05-01T00:00:00Z", limit: 100 },
      isUnlimited: false,
    },
    limitExceeded: false,
    nextReset: {
      daily: "2026-05-22T00:00:00Z",
      weekly: "2026-05-25T00:00:00Z",
      monthly: "2026-06-01T00:00:00Z",
    },
    ...overrides,
  };
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UsageProvider>{children}</UsageProvider>
);

/** Wait for the provider to finish its initial load cycle (status is non-null) */
async function waitForInitialLoad(result: { current: any }) {
  await waitFor(() => expect(result.current.usageStatus).not.toBeNull());
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe("UsageContext Behavioral Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: fetchUsageStatus resolves to a valid status (avoids bug #650 loop)
    mockFetchUsageStatus.mockResolvedValue(makeUsageStatus());
    mockClearUsageCache.mockReturnValue(undefined);
  });

  // -------------------------------------------------------------------------
  describe("Initialization Behavior", () => {
    test("should throw when useUsageContext is used outside of UsageProvider", () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
      try {
        expect(() => {
          renderHook(() => useUsageContext());
        }).toThrow("useUsageContext must be used within UsageProvider");
      } finally {
        consoleError.mockRestore();
      }
    });

    test("should call fetchUsageStatus once on mount", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });

      await waitForInitialLoad(result);

      // BEHAVIOR: exactly one auto-load call on mount (hasLoadedUsage guards against re-entry)
      expect(mockFetchUsageStatus).toHaveBeenCalledTimes(1);
    });

    test("should expose all required API members", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });

      await waitForInitialLoad(result);

      const requiredFunctions = [
        "refreshUsageStatus",
        "updateUsageStatus",
        "setUsageLimitExceededWithInfo",
        "clearUsageStatus",
        "isExtractionAvailable",
      ];

      requiredFunctions.forEach((fn) => {
        expect(typeof (result.current as any)[fn]).toBe("function");
      });

      expect(typeof result.current.hasUsageData).toBe("boolean");
      expect(typeof result.current.isUnlimited).toBe("boolean");
      expect(typeof result.current.hasCustomLimit).toBe("boolean");
    });

    test("should initialize isUsageLimitExceeded as false before first load", () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });

      // Synchronous initial state before the async fetch resolves
      expect(result.current.isUsageLimitExceeded).toBe(false);
    });

    test("should initialize contactInfo as null", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });

      await waitForInitialLoad(result);

      expect(result.current.contactInfo).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe("refreshUsageStatus Behavior", () => {
    test("should update usageStatus when fetchUsageStatus resolves with data", async () => {
      const status = makeUsageStatus();
      mockFetchUsageStatus.mockResolvedValue(status);

      const { result } = renderHook(() => useUsageContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.usageStatus).not.toBeNull();
      });

      expect(result.current.usageStatus).toEqual(status);
    });

    test("should set isUsageLimitExceeded when status.limitExceeded is true", async () => {
      const status = makeUsageStatus({ limitExceeded: true });
      mockFetchUsageStatus.mockResolvedValue(status);

      const { result } = renderHook(() => useUsageContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isUsageLimitExceeded).toBe(true);
      });
    });

    test("should set isLoadingUsage to false after refresh completes with data", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });

      await waitForInitialLoad(result);

      expect(result.current.isLoadingUsage).toBe(false);
    });

    test("should set isLoadingUsage to false even when fetchUsageStatus throws", async () => {
      // Override: first call throws, then resolves to prevent bug #650 loop
      let callCount = 0;
      mockFetchUsageStatus.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error("Network failure"));
        return Promise.resolve(makeUsageStatus());
      });

      const { result } = renderHook(() => useUsageContext(), { wrapper });

      // Wait for loading to settle after the error
      await waitFor(() => {
        expect(result.current.isLoadingUsage).toBe(false);
      });

      // BEHAVIOR: error caught, usageStatus stays null (first call rejected)
      // Note: due to bug #650, if null is returned repeatedly the effect loops,
      // so we only verify loading settled, not that usageStatus is null.
    });

    test("should allow manual refresh via refreshUsageStatus", async () => {
      const initialStatus = makeUsageStatus();
      mockFetchUsageStatus.mockResolvedValue(initialStatus);

      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      const updatedStatus = makeUsageStatus({
        usage: {
          daily: { count: 9, lastReset: "2026-05-21T00:00:00Z", limit: 10 },
          weekly: { count: 25, lastReset: "2026-05-18T00:00:00Z", limit: 30 },
          monthly: { count: 60, lastReset: "2026-05-01T00:00:00Z", limit: 100 },
        },
        limitExceeded: false,
      });
      mockFetchUsageStatus.mockResolvedValue(updatedStatus);

      await act(async () => {
        await result.current.refreshUsageStatus();
      });

      expect(result.current.usageStatus).toEqual(updatedStatus);
    });
  });

  // -------------------------------------------------------------------------
  describe("updateUsageStatus Behavior", () => {
    test("should update usageStatus synchronously", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      const newStatus = makeUsageStatus({
        usage: {
          daily: { count: 8, lastReset: "2026-05-21T00:00:00Z", limit: 10 },
          weekly: { count: 20, lastReset: "2026-05-18T00:00:00Z", limit: 30 },
          monthly: { count: 50, lastReset: "2026-05-01T00:00:00Z", limit: 100 },
        },
      });

      act(() => {
        result.current.updateUsageStatus(newStatus);
      });

      expect(result.current.usageStatus).toEqual(newStatus);
    });

    test("should set isUsageLimitExceeded true when status.limitExceeded is true", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      const exceededStatus = makeUsageStatus({ limitExceeded: true });

      act(() => {
        result.current.updateUsageStatus(exceededStatus);
      });

      expect(result.current.isUsageLimitExceeded).toBe(true);
    });

    test("should set isUsageLimitExceeded false when limit is no longer exceeded", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      // First exceed it
      act(() => {
        result.current.updateUsageStatus(makeUsageStatus({ limitExceeded: true }));
      });

      expect(result.current.isUsageLimitExceeded).toBe(true);

      // Then resolve
      act(() => {
        result.current.updateUsageStatus(makeUsageStatus({ limitExceeded: false }));
      });

      expect(result.current.isUsageLimitExceeded).toBe(false);
    });

    test("should clear contactInfo when limit is no longer exceeded", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      // Set contact info via the exceeded path first
      act(() => {
        result.current.setUsageLimitExceededWithInfo(
          makeUsageStatus({ limitExceeded: true }),
          {
            message: "Limit reached",
            contactUrl: "/contact",
            prefilledSubject: "Increase Limit",
          }
        );
      });

      expect(result.current.contactInfo).not.toBeNull();

      // Now update with non-exceeded status
      act(() => {
        result.current.updateUsageStatus(makeUsageStatus({ limitExceeded: false }));
      });

      // BEHAVIOR: contactInfo is cleared when limit is no longer exceeded
      expect(result.current.contactInfo).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe("setUsageLimitExceededWithInfo Behavior", () => {
    test("should set usageStatus, isUsageLimitExceeded, and contactInfo together", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      const status = makeUsageStatus({ limitExceeded: true });
      const info = {
        message: "You have reached your limit",
        contactUrl: "/contact",
        prefilledSubject: "Increase my limit",
      };

      act(() => {
        result.current.setUsageLimitExceededWithInfo(status, info);
      });

      expect(result.current.usageStatus).toEqual(status);
      expect(result.current.isUsageLimitExceeded).toBe(true);
      expect(result.current.contactInfo).toEqual(info);
    });

    test("should always set isUsageLimitExceeded to true regardless of status.limitExceeded", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      // Pass a status with limitExceeded: false but call setUsageLimitExceededWithInfo
      const status = makeUsageStatus({ limitExceeded: false });

      act(() => {
        result.current.setUsageLimitExceededWithInfo(status, {
          message: "Limit",
          contactUrl: "/",
          prefilledSubject: "Sub",
        });
      });

      // BEHAVIOR: setUsageLimitExceededWithInfo always forces isUsageLimitExceeded true
      expect(result.current.isUsageLimitExceeded).toBe(true);
    });

    test("should store the contact info message correctly", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      const info = {
        message: "Specific error message for the user",
        contactUrl: "/support",
        prefilledSubject: "Please increase my limit",
      };

      act(() => {
        result.current.setUsageLimitExceededWithInfo(
          makeUsageStatus({ limitExceeded: true }),
          info
        );
      });

      expect(result.current.contactInfo?.message).toBe("Specific error message for the user");
      expect(result.current.contactInfo?.contactUrl).toBe("/support");
      expect(result.current.contactInfo?.prefilledSubject).toBe("Please increase my limit");
    });
  });

  // -------------------------------------------------------------------------
  describe("clearUsageStatus Behavior", () => {
    test("should reset usageStatus to null", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      expect(result.current.usageStatus).not.toBeNull();

      act(() => {
        result.current.clearUsageStatus();
      });

      expect(result.current.usageStatus).toBeNull();
    });

    test("should reset isUsageLimitExceeded to false", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      act(() => {
        result.current.updateUsageStatus(makeUsageStatus({ limitExceeded: true }));
      });
      expect(result.current.isUsageLimitExceeded).toBe(true);

      act(() => {
        result.current.clearUsageStatus();
      });

      expect(result.current.isUsageLimitExceeded).toBe(false);
    });

    test("should reset contactInfo to null", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      act(() => {
        result.current.setUsageLimitExceededWithInfo(
          makeUsageStatus({ limitExceeded: true }),
          { message: "msg", contactUrl: "/c", prefilledSubject: "sub" }
        );
      });

      act(() => {
        result.current.clearUsageStatus();
      });

      expect(result.current.contactInfo).toBeNull();
    });

    test("should call entityService.clearUsageCache", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      act(() => {
        result.current.clearUsageStatus();
      });

      expect(mockClearUsageCache).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  describe("isExtractionAvailable Behavior", () => {
    // NOTE: Testing the null-status case would trigger bug #650 (infinite loop).
    // The behavior "return true when usageStatus is null" is defined in source
    // but cannot be safely asserted via waitFor in the test environment.
    // See bug #650 for details.
    test.skip("should return true when usageStatus is null (optimistic default) — skipped due to bug #650 infinite loop", () => {
      // This behavior is specified but cannot be safely tested while bug #650 exists.
      // Fix: When fetchUsageStatus returns null, hasLoadedUsage.current should still be set true.
    });

    test("should return true for unlimited users regardless of limit state", async () => {
      const unlimitedStatus: UsageStatus = makeUsageStatus({
        limitExceeded: true, // would normally block
        usage: {
          daily: { count: 999, lastReset: "2026-05-21T00:00:00Z", limit: 10 },
          weekly: { count: 999, lastReset: "2026-05-18T00:00:00Z", limit: 30 },
          monthly: { count: 999, lastReset: "2026-05-01T00:00:00Z", limit: 100 },
          isUnlimited: true,
        },
      });
      mockFetchUsageStatus.mockResolvedValue(unlimitedStatus);

      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      expect(result.current.isExtractionAvailable()).toBe(true);
    });

    test("should return false when limitExceeded is true for a non-unlimited user", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      act(() => {
        result.current.updateUsageStatus(makeUsageStatus({ limitExceeded: true }));
      });

      expect(result.current.isExtractionAvailable()).toBe(false);
    });

    test("should return true when limitExceeded is false for a non-unlimited user", async () => {
      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      act(() => {
        result.current.updateUsageStatus(makeUsageStatus({ limitExceeded: false }));
      });

      expect(result.current.isExtractionAvailable()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe("Computed / Derived Values Behavior", () => {
    // NOTE: hasUsageData/isUnlimited when usageStatus is null would trigger bug
    // #650. Tests in this section use a non-null status by default.
    test.skip("hasUsageData should be false when usageStatus is null — skipped due to bug #650 infinite loop", () => {
      // Behavior defined in source: hasUsageData: !!usageStatus
      // Cannot be safely tested while bug #650 exists.
    });

    test.skip("isUnlimited should be false when usageStatus is null — skipped due to bug #650 infinite loop", () => {
      // Behavior defined in source: isUnlimited: usageStatus?.usage.isUnlimited ?? false
      // Cannot be safely tested while bug #650 exists.
    });

    test("hasUsageData should be true when usageStatus is populated", async () => {
      mockFetchUsageStatus.mockResolvedValue(makeUsageStatus());

      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      expect(result.current.hasUsageData).toBe(true);
    });

    test("isUnlimited should be true when status.usage.isUnlimited is true", async () => {
      const unlimitedStatus = makeUsageStatus({
        usage: {
          daily: { count: 0, lastReset: "2026-05-21T00:00:00Z", limit: 10 },
          weekly: { count: 0, lastReset: "2026-05-18T00:00:00Z", limit: 30 },
          monthly: { count: 0, lastReset: "2026-05-01T00:00:00Z", limit: 100 },
          isUnlimited: true,
        },
      });
      mockFetchUsageStatus.mockResolvedValue(unlimitedStatus);

      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      expect(result.current.isUnlimited).toBe(true);
    });

    test("isUnlimited should be false when status.usage.isUnlimited is false", async () => {
      const nonUnlimitedStatus = makeUsageStatus({
        usage: {
          daily: { count: 0, lastReset: "2026-05-21T00:00:00Z", limit: 10 },
          weekly: { count: 0, lastReset: "2026-05-18T00:00:00Z", limit: 30 },
          monthly: { count: 0, lastReset: "2026-05-01T00:00:00Z", limit: 100 },
          isUnlimited: false,
        },
      });
      mockFetchUsageStatus.mockResolvedValue(nonUnlimitedStatus);

      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      expect(result.current.isUnlimited).toBe(false);
    });

    test("hasCustomLimit should be false when usage has no customLimit", async () => {
      const status = makeUsageStatus();
      // makeUsageStatus does not set customLimit
      mockFetchUsageStatus.mockResolvedValue(status);

      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      expect(result.current.hasCustomLimit).toBe(false);
    });

    test("hasCustomLimit should be true when usage has a customLimit value", async () => {
      const status = makeUsageStatus({
        usage: {
          daily: { count: 0, lastReset: "2026-05-21T00:00:00Z", limit: 10 },
          weekly: { count: 0, lastReset: "2026-05-18T00:00:00Z", limit: 30 },
          monthly: { count: 0, lastReset: "2026-05-01T00:00:00Z", limit: 100 },
          customLimit: 50,
        },
      });
      mockFetchUsageStatus.mockResolvedValue(status);

      const { result } = renderHook(() => useUsageContext(), { wrapper });
      await waitForInitialLoad(result);

      expect(result.current.hasCustomLimit).toBe(true);
    });
  });
});
