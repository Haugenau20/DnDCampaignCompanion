import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommandPalette from "../CommandPalette";
import type { SearchResult } from "core/types/search";

const mockNavigateToPage = jest.fn();
const mockOnSearch = jest.fn();
const mockRun = jest.fn();

jest.mock("shared/hooks/useSearch", () => ({ useSearch: jest.fn() }));
jest.mock("shared/context/NavigationContext", () => ({ useNavigation: jest.fn() }));
jest.mock("features/user-management", () => ({ useCampaigns: jest.fn() }));
jest.mock("shared/hooks/useCreateActions", () => ({ useCreateActions: jest.fn() }));

const { useSearch } = require("shared/hooks/useSearch");
const { useNavigation } = require("shared/context/NavigationContext");
const { useCampaigns } = require("features/user-management");
const { useCreateActions } = require("shared/hooks/useCreateActions");

const npc: SearchResult = {
  id: "droop", type: "npc", title: "Droop", content: "",
  matches: ["a cowardly goblin the party spared"], matchCount: 1,
};
const chapter: SearchResult = {
  id: "ch12", type: "story", title: "Chapter 12 — Cragmaw Hideout", content: "",
  matches: ["bound and shaking, Droop agreed to lead them"], matchCount: 3,
};

const searchState = (overrides = {}) => ({
  query: "droop", results: [npc, chapter], isSearching: false,
  isQueryTooShort: false, isIndexReady: true,
  onSearch: mockOnSearch, onClearSearch: jest.fn(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  useSearch.mockReturnValue(searchState());
  useNavigation.mockReturnValue({ navigateToPage: mockNavigateToPage, createPath: (p: string) => p });
  useCampaigns.mockReturnValue({ activeCampaign: { id: "p", name: "Phandelver" } });
  useCreateActions.mockReturnValue([
    { id: "npc", entityLabel: "NPC", icon: () => null, run: mockRun },
  ]);
});

const open = () =>
  render(<CommandPalette isOpen onClose={jest.fn()} triggerRef={React.createRef()} />);

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    render(<CommandPalette isOpen={false} onClose={jest.fn()} triggerRef={React.createRef()} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("puts the combobox role on the input itself", () => {
    open();
    const input = screen.getByRole("combobox");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("groups results under uppercase type headings", () => {
    open();
    expect(screen.getByText("NPCS")).toBeInTheDocument();
    expect(screen.getByText("STORY")).toBeInTheDocument();
  });

  it("marks the matched term in the title", () => {
    open();
    const marks = screen.getAllByText("Droop", { selector: "mark" });
    expect(marks.length).toBeGreaterThan(0);
  });

  it("counts the extra mentions when a result matched more than once", () => {
    open();
    expect(screen.getByText("+2 more mentions")).toBeInTheDocument();
  });

  it("does not count mentions for a single match", () => {
    open();
    expect(screen.queryByText("+0 more mentions")).not.toBeInTheDocument();
  });

  it("reports the result count against the active campaign", () => {
    open();
    expect(screen.getByText("2 results in Phandelver")).toBeInTheDocument();
    expect(screen.getByText("Searching Phandelver only")).toBeInTheDocument();
  });

  it("uses the singular for one result", () => {
    useSearch.mockReturnValue(searchState({ results: [npc] }));
    open();
    expect(screen.getByText("1 result in Phandelver")).toBeInTheDocument();
  });

  it("drops the campaign qualifier when no campaign is active", () => {
    useCampaigns.mockReturnValue({ activeCampaign: null });
    open();
    expect(screen.getByText("2 results")).toBeInTheDocument();
    expect(screen.queryByText(/Searching/)).not.toBeInTheDocument();
  });

  it("shows a skeleton, not an empty state, while the index is still building", () => {
    useSearch.mockReturnValue(searchState({ results: [], isIndexReady: false }));
    open();
    expect(screen.getByTestId("palette-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/No results/)).not.toBeInTheDocument();
  });

  it("asks for more characters below the minimum query length", () => {
    useSearch.mockReturnValue(searchState({ query: "d", results: [], isQueryTooShort: true }));
    open();
    expect(screen.getByText("Keep typing…")).toBeInTheDocument();
  });

  it("names the campaign in the empty state", () => {
    useSearch.mockReturnValue(searchState({ results: [] }));
    open();
    expect(screen.getByText("No results in Phandelver")).toBeInTheDocument();
  });

  it("offers a create command carrying the typed query", () => {
    open();
    expect(screen.getByText('New NPC named "droop"')).toBeInTheDocument();
  });

  it("runs the create command when clicked", async () => {
    open();
    await userEvent.click(screen.getByText('New NPC named "droop"'));
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it("navigates on a result click without waiting out a blur timer", async () => {
    open();
    await userEvent.click(screen.getByText("Chapter 12 — Cragmaw Hideout"));
    expect(mockNavigateToPage).toHaveBeenCalled();
  });

  it("closes when the scrim is pressed", async () => {
    const onClose = jest.fn();
    render(<CommandPalette isOpen onClose={onClose} triggerRef={React.createRef()} />);
    await userEvent.click(screen.getByTestId("palette-scrim"));
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the clear button a clear button, never a spinner", async () => {
    const onClearSearch = jest.fn();
    useSearch.mockReturnValue(searchState({ isSearching: true, onClearSearch }));
    open();
    const clear = screen.getByRole("button", { name: "Clear search" });
    expect(within(clear).queryByRole("status")).not.toBeInTheDocument();
    expect(clear.className).not.toContain("animate-spin");
    await userEvent.click(clear);
    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it("offers no clear button when there is nothing to clear", () => {
    useSearch.mockReturnValue(searchState({ query: "", results: [] }));
    open();
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("gives every option a real id and points aria-activedescendant at one of them", () => {
    open();
    const input = screen.getByRole("combobox");
    const active = input.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).toBeInTheDocument();
    expect(document.getElementById(active!)).toHaveAttribute("role", "option");
  });
});
