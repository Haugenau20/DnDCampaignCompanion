import React from "react";
import { renderHook, act, render } from "@testing-library/react";
import { useCreateActions } from "../useCreateActions";

const mockNavigateToPage = jest.fn();
const mockCreateAndOpen = jest.fn();

jest.mock("../../context/NavigationContext", () => ({
  useNavigation: jest.fn(),
}));
jest.mock("features/collaboration", () => ({
  useCreateNote: jest.fn(),
}));
jest.mock("../../context/QuickAddContext", () => ({
  useQuickAdd: jest.fn(),
}));

const { useNavigation } = require("../../context/NavigationContext");
const { useCreateNote } = require("features/collaboration");
const { useQuickAdd } = require("../../context/QuickAddContext");

const mockOpenQuickAdd = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useNavigation.mockReturnValue({ navigateToPage: mockNavigateToPage, createPath: jest.fn() });
  useCreateNote.mockReturnValue({ createAndOpen: mockCreateAndOpen });
  useQuickAdd.mockReturnValue({
    openQuickAdd: mockOpenQuickAdd,
    closeQuickAdd: jest.fn(),
    openEntity: null,
  });
});

describe("useCreateActions", () => {
  it("returns the six create actions in display order", () => {
    const { result } = renderHook(() => useCreateActions());
    expect(result.current.map((a) => a.entityLabel)).toEqual([
      "Note", "Chapter", "NPC", "Location", "Rumor", "Quest",
    ]);
  });

  it("gives every action a stable id and an icon component", () => {
    const { result } = renderHook(() => useCreateActions());
    expect(result.current.map((a) => a.id)).toEqual([
      "note", "chapter", "npc", "location", "rumor", "quest",
    ]);
    result.current.forEach((action) => {
      // lucide-react icons are React.forwardRef exotic components, so
      // `typeof action.icon` is "object", not "function" -- render each one
      // and confirm it produces real markup instead of asserting a typeof
      // that no forwardRef-based icon library satisfies.
      const Icon = action.icon;
      const { container } = render(<Icon />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  it("navigates to the create route for the two actions that still have one", () => {
    // Since `15-1` only the chapter and the rumour navigate. The chapter has
    // no quick-add surface at all -- Phase 15 is about the four campaign
    // entities -- and the rumour keeps its form until `15-7` builds its
    // composer row, because `RumorForm` requires a third field.
    const { result } = renderHook(() => useCreateActions());
    const routes: Record<string, string> = {
      rumor: "/rumors/create",
      chapter: "/story/chapters/create",
    };
    Object.entries(routes).forEach(([id, path]) => {
      act(() => {
        result.current.find((a) => a.id === id)!.run();
      });
      expect(mockNavigateToPage).toHaveBeenCalledWith(path);
    });
    expect(mockCreateAndOpen).not.toHaveBeenCalled();
  });

  it("opens quick add in place for the NPC, the location and the quest", () => {
    // The whole point of `15-1`: adding an NPC while you are looking at the
    // NPC list must not take the list away. The `/{entity}/create` route still
    // exists and still renders the same component; the menu just stops
    // sending you to it.
    const { result } = renderHook(() => useCreateActions());
    (["npc", "location", "quest"] as const).forEach((id) => {
      act(() => {
        result.current.find((a) => a.id === id)!.run();
      });
      expect(mockOpenQuickAdd).toHaveBeenCalledWith(id);
    });
    expect(mockOpenQuickAdd).toHaveBeenCalledTimes(3);
    expect(mockNavigateToPage).not.toHaveBeenCalled();
  });

  it("creates and opens a note rather than navigating, for the note action", async () => {
    const { result } = renderHook(() => useCreateActions());
    await act(async () => {
      await result.current.find((a) => a.id === "note")!.run();
    });
    expect(mockCreateAndOpen).toHaveBeenCalledTimes(1);
    expect(mockNavigateToPage).not.toHaveBeenCalled();
  });

  it("gives every action a non-empty sectionPath rooted at the app's top level", () => {
    const { result } = renderHook(() => useCreateActions());
    result.current.forEach((action) => {
      expect(action.sectionPath).toEqual(expect.any(String));
      expect(action.sectionPath.length).toBeGreaterThan(0);
      expect(action.sectionPath.startsWith("/")).toBe(true);
    });
  });

  it("gives every action a single-letter shortcut, all distinct", () => {
    const { result } = renderHook(() => useCreateActions());
    const shortcuts = result.current.map((a) => a.shortcut);
    shortcuts.forEach((shortcut) => {
      expect(shortcut).toHaveLength(1);
    });
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });
});
