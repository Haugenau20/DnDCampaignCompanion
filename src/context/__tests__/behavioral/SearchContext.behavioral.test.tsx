// src/context/__tests__/behavioral/SearchContext.behavioral.test.tsx

import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { SearchProvider, useSearch } from "../../SearchContext";

/**
 * SearchContext Behavioral Testing
 *
 * Tests the REAL SearchProvider and useSearch hook with mocked data-hook
 * and SearchService dependencies. Validates state shape, search execution,
 * index initialization triggers, and clearSearch behavior.
 *
 * STRATEGY:
 * - Use real SearchProvider wrapping a renderHook consumer
 * - Mock useChapterData, useNPCData, useLocationData, useQuests, useRumorData
 * - Mock SearchService (injected via module-level mock) to control search results
 * - Assert on observable state: query, results, isSearching
 */

// ---------------------------------------------------------------------------
// Mock data-hooks that SearchContext depends on
// ---------------------------------------------------------------------------
const mockUseChapterData = jest.fn();
const mockUseNPCData = jest.fn();
const mockUseLocationData = jest.fn();
const mockUseQuests = jest.fn();
const mockUseRumorData = jest.fn();

jest.mock("../../../hooks/useChapterData", () => ({
  useChapterData: () => mockUseChapterData(),
}));

jest.mock("../../../hooks/useNPCData", () => ({
  useNPCData: () => mockUseNPCData(),
}));

jest.mock("../../../hooks/useLocationData", () => ({
  useLocationData: () => mockUseLocationData(),
}));

jest.mock("../../QuestContext", () => ({
  useQuests: () => mockUseQuests(),
}));

jest.mock("../../../hooks/useRumorData", () => ({
  useRumorData: () => mockUseRumorData(),
}));

// ---------------------------------------------------------------------------
// Mock SearchService — we want to control what search() returns
// ---------------------------------------------------------------------------
const mockInitializeIndex = jest.fn();
const mockSearch = jest.fn();

jest.mock("../../../services/search/SearchService", () => ({
  SearchService: jest.fn().mockImplementation(() => ({
    initializeIndex: mockInitializeIndex,
    search: mockSearch,
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal stub returns for each data hook */
const defaultChapters = [
  {
    id: "ch-1",
    title: "Chapter One",
    content: "Content here",
    summary: "",
    order: 1,
  },
];
const defaultNPCs = [
  {
    id: "npc-1",
    name: "Gandalf",
    description: "A wizard",
    background: "",
    occupation: "Wizard",
    location: "Shire",
  },
];
const defaultLocations = [
  {
    id: "loc-1",
    name: "Rivendell",
    description: "Elven city",
    features: [],
    tags: [],
    type: "city",
    status: "explored",
  },
];
const defaultQuests = [
  {
    id: "q-1",
    title: "Ring Quest",
    description: "Destroy the ring",
    objectives: [{ description: "Find the ring" }],
    status: "active",
  },
];
const defaultRumors = [
  {
    id: "r-1",
    title: "Strange rumor",
    content: "Something happened",
    sourceName: "Innkeeper",
    notes: [{ content: "Interesting" }],
    status: "unverified",
  },
];

function setupDefaultMocks() {
  mockUseChapterData.mockReturnValue({ chapters: defaultChapters });
  mockUseNPCData.mockReturnValue({ npcs: defaultNPCs });
  mockUseLocationData.mockReturnValue({ locations: defaultLocations });
  mockUseQuests.mockReturnValue({ quests: defaultQuests });
  mockUseRumorData.mockReturnValue({ rumors: defaultRumors });
  mockSearch.mockReturnValue([]);
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SearchProvider>{children}</SearchProvider>
);

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe("SearchContext Behavioral Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  // -------------------------------------------------------------------------
  describe("Initialization Behavior", () => {
    test("should throw when useSearch is used outside of SearchProvider", () => {
      // The error is thrown synchronously inside renderHook — React surfaces it
      // as an error; we wrap in a try/catch to catch the React rendering error.
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
      try {
        expect(() => {
          renderHook(() => useSearch());
        }).toThrow("useSearch must be used within a SearchProvider");
      } finally {
        consoleError.mockRestore();
      }
    });

    test("should initialize with empty query string", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      expect(result.current.query).toBe("");
    });

    test("should initialize with empty results array", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      expect(result.current.results).toEqual([]);
    });

    test("should initialize with isSearching as false", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      expect(result.current.isSearching).toBe(false);
    });

    test("should expose all required API members", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      expect(typeof result.current.query).toBe("string");
      expect(typeof result.current.setQuery).toBe("function");
      expect(Array.isArray(result.current.results)).toBe(true);
      expect(typeof result.current.isSearching).toBe("boolean");
      expect(typeof result.current.handleSearch).toBe("function");
      expect(typeof result.current.clearSearch).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  describe("setQuery Behavior", () => {
    test("should update the query state when setQuery is called", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      act(() => {
        result.current.setQuery("dragon");
      });

      expect(result.current.query).toBe("dragon");
    });

    test("should allow clearing the query to an empty string", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      act(() => {
        result.current.setQuery("dragon");
      });
      act(() => {
        result.current.setQuery("");
      });

      expect(result.current.query).toBe("");
    });

    test("should not trigger a search automatically when query is set", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      act(() => {
        result.current.setQuery("dragon");
      });

      // BEHAVIOR: setQuery only updates state; does NOT call SearchService.search
      expect(mockSearch).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("handleSearch Behavior", () => {
    test("should set isSearching to false after a successful search", async () => {
      mockSearch.mockReturnValue([]);
      const { result } = renderHook(() => useSearch(), { wrapper });

      await act(async () => {
        await result.current.handleSearch("dragon");
      });

      expect(result.current.isSearching).toBe(false);
    });

    test("should populate results with what SearchService.search returns", async () => {
      const fakeResults = [
        { id: "npc-1", type: "npc", title: "Gandalf", content: "A wizard", matches: ["wizard"] },
      ];
      mockSearch.mockReturnValue(fakeResults);

      const { result } = renderHook(() => useSearch(), { wrapper });

      await act(async () => {
        await result.current.handleSearch("wizard");
      });

      expect(result.current.results).toEqual(fakeResults);
    });

    test("should call SearchService.search with the provided query string", async () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      await act(async () => {
        await result.current.handleSearch("goblin");
      });

      expect(mockSearch).toHaveBeenCalledWith("goblin");
    });

    test("should reset results to empty array when SearchService throws", async () => {
      mockSearch.mockImplementation(() => {
        throw new Error("Search exploded");
      });

      const { result } = renderHook(() => useSearch(), { wrapper });

      await act(async () => {
        await result.current.handleSearch("error-query");
      });

      // BEHAVIOR: error is caught, results reset to []
      expect(result.current.results).toEqual([]);
    });

    test("should set isSearching to false even when SearchService throws", async () => {
      mockSearch.mockImplementation(() => {
        throw new Error("Search exploded");
      });

      const { result } = renderHook(() => useSearch(), { wrapper });

      await act(async () => {
        await result.current.handleSearch("error-query");
      });

      expect(result.current.isSearching).toBe(false);
    });

    test("should return multiple results from multiple types", async () => {
      const multiTypeResults = [
        { id: "npc-1", type: "npc", title: "Gandalf", content: "wizard", matches: [] },
        { id: "loc-1", type: "location", title: "Rivendell", content: "city", matches: [] },
        { id: "q-1", type: "quest", title: "Ring Quest", content: "ring", matches: [] },
      ];
      mockSearch.mockReturnValue(multiTypeResults);

      const { result } = renderHook(() => useSearch(), { wrapper });

      await act(async () => {
        await result.current.handleSearch("ring");
      });

      expect(result.current.results).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  describe("clearSearch Behavior", () => {
    test("should reset query to empty string", async () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      act(() => {
        result.current.setQuery("dragon");
      });

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.query).toBe("");
    });

    test("should reset results to empty array", async () => {
      mockSearch.mockReturnValue([
        { id: "npc-1", type: "npc", title: "Gandalf", content: "wizard", matches: [] },
      ]);

      const { result } = renderHook(() => useSearch(), { wrapper });

      await act(async () => {
        await result.current.handleSearch("wizard");
      });
      expect(result.current.results).toHaveLength(1);

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.results).toEqual([]);
    });

    test("should reset isSearching to false", async () => {
      // We need isSearching to be false after clear (it should already be false
      // after a completed search, but clearSearch also explicitly sets it)
      const { result } = renderHook(() => useSearch(), { wrapper });

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.isSearching).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe("Search Index Initialization Behavior", () => {
    test("should call initializeIndex when all data collections are non-empty", async () => {
      // All mocks return non-empty data (default setup)
      const { result } = renderHook(() => useSearch(), { wrapper });

      await waitFor(() => {
        expect(mockInitializeIndex).toHaveBeenCalledTimes(1);
      });
    });

    test("should NOT call initializeIndex when any collection is empty", async () => {
      // Quests empty
      mockUseQuests.mockReturnValue({ quests: [] });

      renderHook(() => useSearch(), { wrapper });

      // Short settle — initializeIndex should not be called
      await new Promise((r) => setTimeout(r, 50));
      expect(mockInitializeIndex).not.toHaveBeenCalled();
    });

    test("should pass correctly shaped search documents to initializeIndex", async () => {
      renderHook(() => useSearch(), { wrapper });

      await waitFor(() => {
        expect(mockInitializeIndex).toHaveBeenCalledTimes(1);
      });

      const [indexArg] = mockInitializeIndex.mock.calls[0];

      // BEHAVIOR: all five search result types must be present
      expect(indexArg).toHaveProperty("story");
      expect(indexArg).toHaveProperty("quest");
      expect(indexArg).toHaveProperty("npc");
      expect(indexArg).toHaveProperty("location");
      expect(indexArg).toHaveProperty("rumors");

      // BEHAVIOR: each collection maps to an array of search documents
      expect(Array.isArray(indexArg.story)).toBe(true);
      expect(Array.isArray(indexArg.quest)).toBe(true);
      expect(Array.isArray(indexArg.npc)).toBe(true);
      expect(Array.isArray(indexArg.location)).toBe(true);
      expect(Array.isArray(indexArg.rumors)).toBe(true);
    });

    test("should map NPC name to search document title metadata", async () => {
      renderHook(() => useSearch(), { wrapper });

      await waitFor(() => expect(mockInitializeIndex).toHaveBeenCalledTimes(1));

      const [indexArg] = mockInitializeIndex.mock.calls[0];
      const npcDoc = indexArg.npc[0];

      expect(npcDoc.id).toBe("npc-1");
      expect(npcDoc.type).toBe("npc");
      expect(npcDoc.metadata.title).toBe("Gandalf");
    });

    test("should map chapter title to search document title metadata", async () => {
      renderHook(() => useSearch(), { wrapper });

      await waitFor(() => expect(mockInitializeIndex).toHaveBeenCalledTimes(1));

      const [indexArg] = mockInitializeIndex.mock.calls[0];
      const storyDoc = indexArg.story[0];

      expect(storyDoc.id).toBe("ch-1");
      expect(storyDoc.type).toBe("story");
      expect(storyDoc.metadata.title).toBe("Chapter One");
    });

    test("should map quest title to search document title metadata", async () => {
      renderHook(() => useSearch(), { wrapper });

      await waitFor(() => expect(mockInitializeIndex).toHaveBeenCalledTimes(1));

      const [indexArg] = mockInitializeIndex.mock.calls[0];
      const questDoc = indexArg.quest[0];

      expect(questDoc.id).toBe("q-1");
      expect(questDoc.type).toBe("quest");
      expect(questDoc.metadata.title).toBe("Ring Quest");
    });

    test("should map location name to search document title metadata", async () => {
      renderHook(() => useSearch(), { wrapper });

      await waitFor(() => expect(mockInitializeIndex).toHaveBeenCalledTimes(1));

      const [indexArg] = mockInitializeIndex.mock.calls[0];
      const locDoc = indexArg.location[0];

      expect(locDoc.id).toBe("loc-1");
      expect(locDoc.type).toBe("location");
      expect(locDoc.metadata.title).toBe("Rivendell");
    });

    test("should map rumor title to search document title metadata", async () => {
      renderHook(() => useSearch(), { wrapper });

      await waitFor(() => expect(mockInitializeIndex).toHaveBeenCalledTimes(1));

      const [indexArg] = mockInitializeIndex.mock.calls[0];
      const rumorDoc = indexArg.rumors[0];

      expect(rumorDoc.id).toBe("r-1");
      expect(rumorDoc.type).toBe("rumors");
      expect(rumorDoc.metadata.title).toBe("Strange rumor");
    });
  });

  // -------------------------------------------------------------------------
  describe("Data Integration Behavior", () => {
    test("should incorporate quest objectives into quest search content", async () => {
      renderHook(() => useSearch(), { wrapper });

      await waitFor(() => expect(mockInitializeIndex).toHaveBeenCalledTimes(1));

      const [indexArg] = mockInitializeIndex.mock.calls[0];
      const questDoc = indexArg.quest[0];

      // BEHAVIOR: objectives are flattened into search content
      expect(questDoc.content).toContain("Find the ring");
    });

    test("should incorporate rumor notes into rumor search content", async () => {
      renderHook(() => useSearch(), { wrapper });

      await waitFor(() => expect(mockInitializeIndex).toHaveBeenCalledTimes(1));

      const [indexArg] = mockInitializeIndex.mock.calls[0];
      const rumorDoc = indexArg.rumors[0];

      // BEHAVIOR: rumor notes are concatenated into search content
      expect(rumorDoc.content).toContain("Interesting");
    });

    test("should handle multiple NPCs in the index", async () => {
      mockUseNPCData.mockReturnValue({
        npcs: [
          { id: "npc-1", name: "Gandalf", description: "Wizard", background: "", occupation: "", location: "" },
          { id: "npc-2", name: "Frodo", description: "Hobbit", background: "", occupation: "", location: "Shire" },
        ],
      });

      renderHook(() => useSearch(), { wrapper });

      await waitFor(() => expect(mockInitializeIndex).toHaveBeenCalledTimes(1));

      const [indexArg] = mockInitializeIndex.mock.calls[0];
      expect(indexArg.npc).toHaveLength(2);
      expect(indexArg.npc[1].metadata.title).toBe("Frodo");
    });
  });
});
