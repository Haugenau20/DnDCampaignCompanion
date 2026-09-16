// src/shared/components/__tests__/GlobalActionButton.test.tsx

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FileText, Scroll } from "lucide-react";
import GlobalActionButton from "../GlobalActionButton";
import type { CreateAction } from "shared/hooks/useCreateActions";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseCampaignContextStatus = jest.fn();
jest.mock("shared/hooks/useCampaignContextStatus", () => ({
  useCampaignContextStatus: () => mockUseCampaignContextStatus(),
}));

const mockUseCreateActions = jest.fn();
jest.mock("shared/hooks/useCreateActions", () => ({
  useCreateActions: () => mockUseCreateActions(),
}));

const mockUseCampaigns = jest.fn();
const mockUseGroups = jest.fn();
jest.mock("features/user-management", () => ({
  useCampaigns: () => mockUseCampaigns(),
  useGroups: () => mockUseGroups(),
}));

// A light stub standing in for the card another agent is building
// concurrently. It renders just enough structure -- a `role="menu"` and one
// `role="menuitem"` button per action -- to exercise GlobalActionButton's own
// behaviour (gating, keyboard, route promotion, the trigger), and surfaces
// every prop it was handed as text/data attributes so tests can assert on
// them without depending on the real card's markup, which is tested
// separately in CreateMenuCard's own suite.
jest.mock("shared/components/create-menu/CreateMenuCard", () => ({
  __esModule: true,
  default: React.forwardRef(function CreateMenuCardStub(
    { actions, promotedId, isOnPromotedSection, campaignName, creditedName, onSelect }: any,
    ref: any
  ) {
    return (
      <div
        ref={ref}
        role="menu"
        data-promoted-id={promotedId}
        data-on-promoted-section={String(isOnPromotedSection)}
        data-campaign-name={campaignName}
        data-credited-name={creditedName}
      >
        {actions.map((action: CreateAction) => (
          <button key={action.id} role="menuitem" onClick={() => onSelect(action)}>
            {action.entityLabel}
          </button>
        ))}
      </div>
    );
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockRunNote = jest.fn();
const mockRunQuest = jest.fn();

const actions: CreateAction[] = [
  {
    id: "note",
    entityLabel: "Note",
    icon: FileText,
    sectionPath: "/notes",
    shortcut: "N",
    run: mockRunNote,
  },
  {
    id: "quest",
    entityLabel: "Quest",
    icon: Scroll,
    sectionPath: "/quests",
    shortcut: "Q",
    run: mockRunQuest,
  },
];

function renderButton(initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <GlobalActionButton />
    </MemoryRouter>
  );
}

function openMenu(initialEntry = "/") {
  const utils = renderButton(initialEntry);
  fireEvent.click(screen.getByRole("button", { name: "Create content" }));
  return utils;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCampaignContextStatus.mockReturnValue({ hasRequiredContext: true });
  mockUseCreateActions.mockReturnValue(actions);
  mockUseCampaigns.mockReturnValue({ activeCampaign: { id: "c1", name: "Phandelver" } });
  mockUseGroups.mockReturnValue({
    activeGroupUserProfile: { username: "someuser", characters: [], activeCharacterId: null },
  });
});

// ---------------------------------------------------------------------------
// Gating
// ---------------------------------------------------------------------------

describe("GlobalActionButton gating", () => {
  it("renders nothing for a signed-out visitor or a user with no campaign selected (bug fix)", () => {
    mockUseCampaignContextStatus.mockReturnValue({ hasRequiredContext: false });
    const { container } = renderButton();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the trigger once context is resolved and both a group and campaign are selected", () => {
    renderButton();
    expect(screen.getByRole("button", { name: "Create content" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// The trigger
// ---------------------------------------------------------------------------

describe("GlobalActionButton trigger", () => {
  it("is 48px (w-12 h-12), not the old 56px", () => {
    renderButton();
    const trigger = screen.getByRole("button", { name: "Create content" });
    expect(trigger.className).toContain("w-12");
    expect(trigger.className).toContain("h-12");
  });

  it("rotates its single icon 45 degrees when open, with no second icon appearing", () => {
    renderButton();
    const trigger = screen.getByRole("button", { name: "Create content" });
    const icon = trigger.querySelector("svg");
    expect(icon).not.toHaveClass("rotate-45");

    fireEvent.click(trigger);
    expect(trigger.querySelectorAll("svg").length).toBe(1);
    expect(trigger.querySelector("svg")).toHaveClass("rotate-45");
  });

  it("tracks aria-expanded and aria-label with open state", () => {
    renderButton();
    const trigger = screen.getByRole("button", { name: "Create content" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Close create menu" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });
});

// ---------------------------------------------------------------------------
// Route-contextual promotion
// ---------------------------------------------------------------------------

describe("GlobalActionButton route promotion", () => {
  it("promotes the quest action and marks it 'on section' on /quests", () => {
    openMenu("/quests");
    const menu = screen.getByRole("menu");
    expect(menu).toHaveAttribute("data-promoted-id", "quest");
    expect(menu).toHaveAttribute("data-on-promoted-section", "true");
  });

  it("falls back to the note action on Home, not marked 'on section'", () => {
    openMenu("/");
    const menu = screen.getByRole("menu");
    expect(menu).toHaveAttribute("data-promoted-id", "note");
    expect(menu).toHaveAttribute("data-on-promoted-section", "false");
  });

  it("still promotes the quest action on a nested quest route", () => {
    openMenu("/quests/some-id");
    const menu = screen.getByRole("menu");
    expect(menu).toHaveAttribute("data-promoted-id", "quest");
    expect(menu).toHaveAttribute("data-on-promoted-section", "true");
  });
});

// ---------------------------------------------------------------------------
// Identity passthrough
// ---------------------------------------------------------------------------

describe("GlobalActionButton identity", () => {
  it("passes the active campaign name and the active character's name through", () => {
    mockUseGroups.mockReturnValue({
      activeGroupUserProfile: {
        username: "someuser",
        characters: [{ id: "char1", name: "Elminster" }],
        activeCharacterId: "char1",
      },
    });
    openMenu();
    const menu = screen.getByRole("menu");
    expect(menu).toHaveAttribute("data-campaign-name", "Phandelver");
    expect(menu).toHaveAttribute("data-credited-name", "Elminster");
  });

  it("falls back to the username when there is no active character", () => {
    mockUseGroups.mockReturnValue({
      activeGroupUserProfile: { username: "someuser", characters: [], activeCharacterId: null },
    });
    openMenu();
    expect(screen.getByRole("menu")).toHaveAttribute("data-credited-name", "someuser");
  });

  it("falls back to 'you' when there is neither a character nor a username", () => {
    mockUseGroups.mockReturnValue({ activeGroupUserProfile: null });
    openMenu();
    expect(screen.getByRole("menu")).toHaveAttribute("data-credited-name", "you");
  });
});

// ---------------------------------------------------------------------------
// Selection and closing
// ---------------------------------------------------------------------------

describe("GlobalActionButton selection", () => {
  it("runs the clicked action and closes the menu", () => {
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Quest" }));
    expect(mockRunQuest).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    openMenu();
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create content" })).toHaveFocus();
  });

  it("closes on a click outside the wrapper", () => {
    openMenu();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("does not close on a click inside the panel", () => {
    openMenu();
    fireEvent.mouseDown(screen.getByRole("menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Letter shortcuts
// ---------------------------------------------------------------------------

describe("GlobalActionButton letter shortcuts", () => {
  it("runs the matching action and closes the menu on a bare letter key", () => {
    openMenu();
    fireEvent.keyDown(document, { key: "q" });
    expect(mockRunQuest).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("matches the shortcut case-insensitively", () => {
    openMenu();
    fireEvent.keyDown(document, { key: "Q" });
    expect(mockRunQuest).toHaveBeenCalledTimes(1);
  });

  it("ignores the shortcut when ctrlKey is held", () => {
    openMenu();
    fireEvent.keyDown(document, { key: "q", ctrlKey: true });
    expect(mockRunQuest).not.toHaveBeenCalled();
  });

  it("ignores the shortcut when metaKey is held", () => {
    openMenu();
    fireEvent.keyDown(document, { key: "q", metaKey: true });
    expect(mockRunQuest).not.toHaveBeenCalled();
  });

  it("ignores the shortcut when altKey is held", () => {
    openMenu();
    fireEvent.keyDown(document, { key: "q", altKey: true });
    expect(mockRunQuest).not.toHaveBeenCalled();
  });

  it("does nothing while the menu is closed", () => {
    renderButton();
    fireEvent.keyDown(document, { key: "q" });
    expect(mockRunQuest).not.toHaveBeenCalled();
  });
});
