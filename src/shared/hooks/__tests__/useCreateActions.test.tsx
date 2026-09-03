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

const { useNavigation } = require("../../context/NavigationContext");
const { useCreateNote } = require("features/collaboration");

beforeEach(() => {
  jest.clearAllMocks();
  useNavigation.mockReturnValue({ navigateToPage: mockNavigateToPage, createPath: jest.fn() });
  useCreateNote.mockReturnValue({ createAndOpen: mockCreateAndOpen });
});

describe("useCreateActions", () => {
  it("returns the six create actions in the order the action button renders them", () => {
    const { result } = renderHook(() => useCreateActions());
    expect(result.current.map((a) => a.entityLabel)).toEqual([
      "Note", "Location", "NPC", "Rumor", "Quest", "Chapter",
    ]);
  });

  it("gives every action a stable id and an icon component", () => {
    const { result } = renderHook(() => useCreateActions());
    expect(result.current.map((a) => a.id)).toEqual([
      "note", "location", "npc", "rumor", "quest", "chapter",
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

  it("navigates to the create route for the five navigating actions", () => {
    const { result } = renderHook(() => useCreateActions());
    const routes: Record<string, string> = {
      location: "/locations/create",
      npc: "/npcs/create",
      rumor: "/rumors/create",
      quest: "/quests/create",
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

  it("creates and opens a note rather than navigating, for the note action", async () => {
    const { result } = renderHook(() => useCreateActions());
    await act(async () => {
      await result.current.find((a) => a.id === "note")!.run();
    });
    expect(mockCreateAndOpen).toHaveBeenCalledTimes(1);
    expect(mockNavigateToPage).not.toHaveBeenCalled();
  });
});
