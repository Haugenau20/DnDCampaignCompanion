// src/context/firebase/hooks/__tests__/useFirestore.test.tsx

import { renderHook, act } from "@testing-library/react";
import { useFirestore } from "../useFirestore";

/**
 * useFirestore Behavioral Testing
 *
 * Tests the useFirestore hook against a mocked useFirebaseContext and
 * firebaseServices. Validates:
 * - Returned API shape
 * - Success paths: each function forwards correct arguments
 * - Error paths: read-side errors are swallowed (returns null/[]);
 *   write-side errors surface via setError and are re-thrown
 * - Memoization: callbacks stable across re-renders
 */

// ---------------------------------------------------------------------------
// Mock firebaseServices
// ---------------------------------------------------------------------------
const mockGetDocument = jest.fn();
const mockGetCollection = jest.fn();
const mockSetDocument = jest.fn();
const mockUpdateDocument = jest.fn();
const mockDeleteDocument = jest.fn();
const mockQueryDocuments = jest.fn();
const mockBatchOperations = jest.fn();

jest.mock("@/services/firebase", () => ({
  __esModule: true,
  default: {
    document: {
      getDocument: (...args: any[]) => mockGetDocument(...args),
      getCollection: (...args: any[]) => mockGetCollection(...args),
      setDocument: (...args: any[]) => mockSetDocument(...args),
      updateDocument: (...args: any[]) => mockUpdateDocument(...args),
      deleteDocument: (...args: any[]) => mockDeleteDocument(...args),
      queryDocuments: (...args: any[]) => mockQueryDocuments(...args),
      batchOperations: (...args: any[]) => mockBatchOperations(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock useFirebaseContext
// ---------------------------------------------------------------------------
const mockSetError = jest.fn();

let mockContextValue: any = {};

jest.mock("@/features/user-management/auth/context/FirebaseContext", () => ({
  useFirebaseContext: () => mockContextValue,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeContext(overrides: Record<string, any> = {}) {
  return {
    user: null,
    userProfile: null,
    loading: false,
    error: null,
    setError: mockSetError,
    groups: [],
    activeGroupId: null,
    activeGroupUserProfile: null,
    campaigns: [],
    activeCampaignId: null,
    refreshGroups: jest.fn().mockResolvedValue([]),
    refreshCampaigns: jest.fn().mockResolvedValue([]),
    refreshUserProfile: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe("useFirestore Behavioral Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue = makeContext();
  });

  // -------------------------------------------------------------------------
  describe("Initialization / Shape", () => {
    test("should expose all required API members", () => {
      const { result } = renderHook(() => useFirestore());

      expect(typeof result.current.getDocument).toBe("function");
      expect(typeof result.current.getCollection).toBe("function");
      expect(typeof result.current.setDocument).toBe("function");
      expect(typeof result.current.updateDocument).toBe("function");
      expect(typeof result.current.deleteDocument).toBe("function");
      expect(typeof result.current.queryDocuments).toBe("function");
      expect(typeof result.current.batchOperations).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  describe("getDocument Behavior", () => {
    test("should call document.getDocument with correct args", async () => {
      const doc = { id: "d1", name: "Test" };
      mockGetDocument.mockResolvedValue(doc);

      const { result } = renderHook(() => useFirestore());

      let res: any;
      await act(async () => {
        res = await result.current.getDocument("npcs", "d1");
      });

      expect(mockGetDocument).toHaveBeenCalledWith("npcs", "d1", true);
      expect(res).toEqual(doc);
    });

    test("should pass requireContext=false when specified", async () => {
      mockGetDocument.mockResolvedValue(null);

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        await result.current.getDocument("npcs", "d1", false);
      });

      expect(mockGetDocument).toHaveBeenCalledWith("npcs", "d1", false);
    });

    test("should return null on error (error swallowed)", async () => {
      mockGetDocument.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => useFirestore());

      let res: any;
      await act(async () => {
        res = await result.current.getDocument("npcs", "missing");
      });

      expect(res).toBeNull();
      // setError is NOT called for read failures
      expect(mockSetError).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("getCollection Behavior", () => {
    test("should call document.getCollection with correct args", async () => {
      const docs = [{ id: "d1" }, { id: "d2" }];
      mockGetCollection.mockResolvedValue(docs);

      const { result } = renderHook(() => useFirestore());

      let res: any;
      await act(async () => {
        res = await result.current.getCollection("npcs");
      });

      expect(mockGetCollection).toHaveBeenCalledWith("npcs", []);
      expect(res).toEqual(docs);
    });

    test("should pass constraints when provided", async () => {
      mockGetCollection.mockResolvedValue([]);
      const fakeConstraint = { type: "where" } as any;

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        await result.current.getCollection("npcs", [fakeConstraint]);
      });

      expect(mockGetCollection).toHaveBeenCalledWith("npcs", [fakeConstraint]);
    });

    test("should return empty array on error (error swallowed)", async () => {
      mockGetCollection.mockRejectedValue(new Error("Read error"));

      const { result } = renderHook(() => useFirestore());

      let res: any;
      await act(async () => {
        res = await result.current.getCollection("npcs");
      });

      expect(res).toEqual([]);
      expect(mockSetError).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("setDocument Behavior", () => {
    test("should call document.setDocument with correct args", async () => {
      mockSetDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        await result.current.setDocument("npcs", "d1", { name: "Goblin" });
      });

      expect(mockSetDocument).toHaveBeenCalledWith("npcs", "d1", { name: "Goblin" });
    });

    test("should clear error before writing", async () => {
      mockSetDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        await result.current.setDocument("npcs", "d1", {});
      });

      expect(mockSetError).toHaveBeenCalledWith(null);
    });

    test("should call setError with message on failure", async () => {
      mockSetDocument.mockRejectedValue(new Error("Write failed"));

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        try {
          await result.current.setDocument("npcs", "d1", {});
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Write failed");
    });

    test("should re-throw on failure", async () => {
      mockSetDocument.mockRejectedValue(new Error("Firestore error"));

      const { result } = renderHook(() => useFirestore());

      await expect(
        act(async () => {
          await result.current.setDocument("npcs", "d1", {});
        })
      ).rejects.toThrow("Firestore error");
    });
  });

  // -------------------------------------------------------------------------
  describe("updateDocument Behavior", () => {
    test("should call document.updateDocument with correct args", async () => {
      mockUpdateDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        await result.current.updateDocument("npcs", "d1", { name: "Orc" });
      });

      expect(mockUpdateDocument).toHaveBeenCalledWith("npcs", "d1", { name: "Orc" });
    });

    test("should clear error before updating", async () => {
      mockUpdateDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        await result.current.updateDocument("npcs", "d1", {});
      });

      expect(mockSetError).toHaveBeenCalledWith(null);
    });

    test("should call setError and re-throw on failure", async () => {
      mockUpdateDocument.mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        try {
          await result.current.updateDocument("npcs", "d1", {});
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Update failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("deleteDocument Behavior", () => {
    test("should call document.deleteDocument with correct args", async () => {
      mockDeleteDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        await result.current.deleteDocument("npcs", "d1");
      });

      expect(mockDeleteDocument).toHaveBeenCalledWith("npcs", "d1");
    });

    test("should clear error before deleting", async () => {
      mockDeleteDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        await result.current.deleteDocument("npcs", "d1");
      });

      expect(mockSetError).toHaveBeenCalledWith(null);
    });

    test("should call setError and re-throw on failure", async () => {
      mockDeleteDocument.mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        try {
          await result.current.deleteDocument("npcs", "d1");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Delete failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("queryDocuments Behavior", () => {
    test("should call document.queryDocuments with correct args", async () => {
      const results = [{ id: "d1" }];
      mockQueryDocuments.mockResolvedValue(results);

      const { result } = renderHook(() => useFirestore());

      let res: any;
      await act(async () => {
        res = await result.current.queryDocuments("npcs", "status", "==", "alive");
      });

      expect(mockQueryDocuments).toHaveBeenCalledWith("npcs", "status", "==", "alive");
      expect(res).toEqual(results);
    });

    test("should return empty array on error (error swallowed)", async () => {
      mockQueryDocuments.mockRejectedValue(new Error("Query error"));

      const { result } = renderHook(() => useFirestore());

      let res: any;
      await act(async () => {
        res = await result.current.queryDocuments("npcs", "status", "==", "alive");
      });

      expect(res).toEqual([]);
      // setError is NOT called for query failures (read-side)
      expect(mockSetError).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("batchOperations Behavior", () => {
    test("should call document.batchOperations with the operations array", async () => {
      mockBatchOperations.mockResolvedValue(undefined);

      const ops = [
        { type: "set" as const, collection: "npcs", id: "d1", data: { name: "Troll" } },
        { type: "delete" as const, collection: "npcs", id: "d2" },
      ];

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        await result.current.batchOperations(ops);
      });

      expect(mockBatchOperations).toHaveBeenCalledWith(ops);
    });

    test("should clear error before batch operation", async () => {
      mockBatchOperations.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        await result.current.batchOperations([]);
      });

      expect(mockSetError).toHaveBeenCalledWith(null);
    });

    test("should call setError and re-throw on failure", async () => {
      mockBatchOperations.mockRejectedValue(new Error("Batch failed"));

      const { result } = renderHook(() => useFirestore());

      await act(async () => {
        try {
          await result.current.batchOperations([]);
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Batch failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("Memoization Behavior", () => {
    test("getDocument reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useFirestore());

      const firstRef = result.current.getDocument;
      rerender();

      expect(result.current.getDocument).toBe(firstRef);
    });

    test("setDocument reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useFirestore());

      const firstRef = result.current.setDocument;
      rerender();

      expect(result.current.setDocument).toBe(firstRef);
    });

    test("batchOperations reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useFirestore());

      const firstRef = result.current.batchOperations;
      rerender();

      expect(result.current.batchOperations).toBe(firstRef);
    });
  });
});
