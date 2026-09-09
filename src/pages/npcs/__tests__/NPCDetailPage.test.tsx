// src/pages/npcs/__tests__/NPCDetailPage.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, matchRoutes } from "react-router-dom";
import NPCDetailPage from "../NPCDetailPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
let mockNpcId: string | undefined = "npc-1";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ npcId: mockNpcId }),
}));

// ---------------------------------------------------------------------------
// Page-suite gate mock (shared across the page suites -- see page-suite-mock.md)
// ---------------------------------------------------------------------------
let mockUser: { uid: string } | null = { uid: "user-1" };
let mockIsResolving = false;
let mockActiveGroupId: string | null = "group-1";
let mockActiveCampaignId: string | null = "campaign-1";
let mockGroups: Array<{ id: string; name: string }> = [
  { id: "group-1", name: "The Fellowship" },
];
let mockGroupUserProfile: any = {
  username: "gandlaf",
  activeCharacterId: "char-1",
  characters: [{ id: "char-1", name: "Zendikarr" }],
};

jest.mock("features/user-management", () => ({
  useAuth: () => ({ user: mockUser, loading: mockIsResolving }),
  useGroups: () => ({
    activeGroupId: mockActiveGroupId,
    groups: mockGroups,
    setActiveGroup: jest.fn().mockResolvedValue(undefined),
  }),
  useCampaigns: () => ({
    activeCampaignId: mockActiveCampaignId,
    activeCampaign: mockActiveCampaignId
      ? { id: mockActiveCampaignId, name: "Phandelver" }
      : null,
    setActiveCampaign: jest.fn().mockResolvedValue(undefined),
  }),
  useUser: () => ({ activeGroupUserProfile: mockGroupUserProfile }),
  SignInForm: () => <div data-testid="sign-in-form" />,
  JoinGroupDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-group-dialog" /> : null,
}));

jest.mock("core/services/firebase", () => ({
  __esModule: true,
  default: {
    campaign: {
      getCampaigns: jest
        .fn()
        .mockResolvedValue([{ id: "campaign-2", name: "Icespire Peak" }]),
    },
  },
}));

// ---------------------------------------------------------------------------
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("shared/context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

/** A fully-populated NPC: every one of the six once-invisible fields is set. */
const fullNPC = {
  id: "npc-1",
  name: "Gandalf",
  title: "The Grey",
  status: "alive",
  relationship: "friendly",
  race: "Maia",
  occupation: "Wizard",
  location: "mines-of-moria",
  description: "A wandering wizard.",
  appearance: "Elderly man with a long grey beard and a tall pointed hat.",
  personality: "Wise, occasionally short-tempered, deeply kind.",
  background: "One of the five wizards sent to Middle-earth.",
  connections: {
    relatedNPCs: ["npc-2", "npc-missing"],
    affiliations: ["The Fellowship", "Istari"],
    relatedQuests: ["quest-1", "quest-missing"],
  },
  notes: [
    { date: "2025-05-31", text: "Rode to Isengard.", author: "Zendikarr" },
    { date: "2025-04-02", text: "An older note, no author recorded." },
  ],
  tags: ["wizard", "istari"],
  createdByUsername: "DungeonMaster",
};

/** The other extreme: a record with nothing but the fields the type requires. */
const bareNPC = {
  id: "npc-3",
  name: "Nameless Guard",
  status: "unknown",
  relationship: "unknown",
  description: "",
  connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
  notes: [],
};

const otherNPC = { id: "npc-2", name: "Saruman", title: "The White" };

let mockNPCDataReturn: { npcs: any[]; loading: boolean; error: any } = {
  npcs: [fullNPC, otherNPC, bareNPC],
  loading: false,
  error: null,
};

const mockGetQuestById = jest.fn();
const mockUpdateNPC = jest.fn().mockResolvedValue(undefined);
const mockUpdateNPCNote = jest.fn().mockResolvedValue(undefined);
const mockRefreshNPCs = jest.fn().mockResolvedValue(undefined);

const mockLocations = [{ id: "mines-of-moria", name: "Mines of Moria" }];
const mockDeleteNPC = jest.fn().mockResolvedValue(undefined);
let mockRumors: any[] = [];

jest.mock("features/campaign-entities", () => ({
  useNPCData: () => ({ ...mockNPCDataReturn, refreshNPCs: mockRefreshNPCs }),
  useNPCs: () => ({
    updateNPC: mockUpdateNPC,
    updateNPCNote: mockUpdateNPCNote,
    deleteNPC: mockDeleteNPC,
  }),
  useQuests: () => ({ getQuestById: mockGetQuestById }),
  useRumors: () => ({ rumors: mockRumors }),
  useLocations: () => ({ locations: mockLocations }),
  // The real resolver, not a stub: the page's contract is that it reuses the
  // directories' answer rather than inventing its own.
  resolveLocationName: jest.requireActual(
    "features/campaign-entities/locations/utils/location-display"
  ).resolveLocationName,
}));

// AttributionInfo reaches Firebase for usernames; the page only owns the label
// above it, so it is stubbed rather than exercised here.
jest.mock("shared/components/AttributionInfo", () => ({
  __esModule: true,
  default: ({ item }: any) => (
    <div data-testid="attribution-info">{item?.id}</div>
  ),
}));

jest.mock("shared/components/DeleteConfirmationDialog", () => ({
  __esModule: true,
  default: ({ isOpen, onConfirm, itemName }: any) =>
    isOpen ? (
      <div role="dialog" data-testid="delete-dialog">
        <span>{itemName}</span>
        <button onClick={onConfirm}>Confirm delete</button>
      </div>
    ) : null,
}));

jest.mock("shared/components/Breadcrumb", () => ({
  __esModule: true,
  default: ({ items }: any) => (
    <nav data-testid="breadcrumb">
      {items.map((item: any) => (
        <span key={item.label} data-href={item.href}>
          {item.label}
        </span>
      ))}
    </nav>
  ),
}));

// Any icon, stubbed. The page and the components it pulls in (Roster, the
// gated panel) import a dozen between them, and none of them is under test.
jest.mock(
  "lucide-react",
  () =>
    new Proxy(
      { __esModule: true },
      {
        get: (target: any, prop: string) =>
          prop in target ? target[prop] : () => null,
      }
    )
);

// Typography maps to its real semantic tag so `getByRole("heading")` works
// against both this page's title and the gated panel's headings.
jest.mock("../../../core/components/Typography", () => {
  const TAGS: Record<string, string> = {
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h4",
  };
  return {
    __esModule: true,
    default: ({ children, color, variant, className }: any) => {
      const Tag = (TAGS[variant] || "p") as any;
      return (
        <Tag
          className={className}
          data-testid={
            color ? `typography-${color}` : `typography-${variant ?? "default"}`
          }
        >
          {children}
        </Tag>
      );
    },
  };
});

// Forwards its ref, as the real Button now does -- the focus-return
// assertions below are meaningless against a mock that swallows it.
jest.mock("../../../core/components/Button", () => {
  const React = jest.requireActual("react");
  return {
    __esModule: true,
    default: React.forwardRef(
      ({ children, onClick, variant, disabled }: any, ref: any) => (
        <button
          ref={ref}
          onClick={onClick}
          disabled={disabled}
          data-variant={variant ?? "primary"}
        >
          {children}
        </button>
      )
    ),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(
    <MemoryRouter>
      <NPCDetailPage />
    </MemoryRouter>
  );
}

/** The text of the field whose uppercase label matches `label`. */
function fieldValue(label: string): string {
  const labelNode = screen.getByText(label);
  const field = labelNode.parentElement as HTMLElement;
  return field.textContent?.replace(label, "").trim() ?? "";
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("NPCDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNpcId = "npc-1";
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
    mockNPCDataReturn = {
      npcs: [fullNPC, otherNPC, bareNPC],
      loading: false,
      error: null,
    };
    mockRumors = [];
    mockGroupUserProfile = {
      username: "gandlaf",
      activeCharacterId: "char-1",
      characters: [{ id: "char-1", name: "Zendikarr" }],
    };
    mockDeleteNPC.mockResolvedValue(undefined);
    mockUpdateNPC.mockResolvedValue(undefined);
    mockUpdateNPCNote.mockResolvedValue(undefined);
    mockRefreshNPCs.mockResolvedValue(undefined);
    mockGetQuestById.mockImplementation((id: string) =>
      id === "quest-1"
        ? { id: "quest-1", title: "Destroy the Ring", status: "active" }
        : undefined
    );
  });

  // -------------------------------------------------------------------------
  // The whole reason the page exists.
  // -------------------------------------------------------------------------
  describe("the six fields that were previously write-only", () => {
    it("renders appearance, personality and background", () => {
      renderPage();
      expect(
        screen.getByText(
          "Elderly man with a long grey beard and a tall pointed hat."
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText("Wise, occasionally short-tempered, deeply kind.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("One of the five wizards sent to Middle-earth.")
      ).toBeInTheDocument();
    });

    it("renders each affiliation under one heading, not one label each", () => {
      renderPage();
      expect(screen.getByText("The Fellowship")).toBeInTheDocument();
      expect(screen.getByText("Istari")).toBeInTheDocument();
      // The heading says what these are. Repeating it on every row would be
      // the type stated twice.
      expect(screen.getByText("Affiliations")).toBeInTheDocument();
      expect(screen.queryByText("Claims membership")).not.toBeInTheDocument();
    });

    it("resolves related NPC ids to names", () => {
      renderPage();
      expect(screen.getByText(/Saruman/)).toBeInTheDocument();
    });

    it("resolves related quest ids to titles, with the status as a word", () => {
      renderPage();
      expect(screen.getByText("Destroy the Ring")).toBeInTheDocument();
      expect(screen.getByText("Quests")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("groups links by what kind of thing they are", () => {
      mockRumors = [
        {
          id: "rumor-1",
          title: "The Eliksir trade",
          status: "unconfirmed",
          relatedNPCs: ["npc-1"],
        },
      ];
      renderPage();
      expect(screen.getByText(/Relationships/)).toBeInTheDocument();
      expect(screen.getByText("People")).toBeInTheDocument();
      expect(screen.getByText("Places")).toBeInTheDocument();
      expect(screen.getByText("Affiliations")).toBeInTheDocument();
      expect(screen.getByText("Quests")).toBeInTheDocument();
      expect(screen.getByText("Rumors")).toBeInTheDocument();
    });

    it("keeps the per-row line only where the heading cannot say it", () => {
      mockRumors = [
        {
          id: "rumor-1",
          title: "The Eliksir trade",
          status: "unconfirmed",
          relatedNPCs: ["npc-1"],
        },
      ];
      renderPage();
      // A person's own title, a quest's and a rumor's status, and which place
      // this is to them -- none of which the headings carry.
      expect(screen.getByText("The White")).toBeInTheDocument();
      expect(screen.getByText("Last known location")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Unconfirmed")).toBeInTheDocument();
    });

    it("shows no heading for a kind this NPC has none of", () => {
      mockRumors = [];
      renderPage();
      expect(screen.queryByText("Rumors")).not.toBeInTheDocument();
    });

    it("does not dress a free-text affiliation up as somewhere to click", () => {
      renderPage();
      const affiliation = screen.getByText("Istari").closest("button");
      expect(affiliation).toBeNull();
    });

    it("drops a related id that no longer resolves rather than printing it raw", () => {
      renderPage();
      expect(screen.queryByText(/npc-missing/)).not.toBeInTheDocument();
      expect(screen.queryByText(/quest-missing/)).not.toBeInTheDocument();
    });

    it("says so in words when all six are empty, rather than hiding the fields", () => {
      mockNpcId = "npc-3";
      renderPage();
      // The three prose fields share a card that is dropped entirely when all
      // three are empty -- an empty card is worse than no card.
      expect(screen.queryByText("Appearance")).not.toBeInTheDocument();
      expect(screen.queryByText("Personality")).not.toBeInTheDocument();
      expect(screen.queryByText("Background")).not.toBeInTheDocument();
      // The sidebar cards stay, and say they are empty rather than vanishing.
      expect(screen.getByText(/Relationships/)).toBeInTheDocument();
      expect(screen.getByText("Nothing linked yet")).toBeInTheDocument();
      expect(screen.getByText("Tags")).toBeInTheDocument();
      expect(screen.getByText("No tags yet")).toBeInTheDocument();
      expect(screen.getByText("Nothing written yet")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Identity and navigation
  // -------------------------------------------------------------------------
  describe("identity", () => {
    it("names the NPC in the h1, and the sigil adds nothing to that name", () => {
      renderPage();
      // EntitySigil is aria-hidden, so the accessible name must be the plain
      // name -- not "G Gandalf".
      expect(
        screen.getByRole("heading", { level: 1, name: "Gandalf" })
      ).toBeInTheDocument();
    });

    it("renders the sigil at the page size rather than the row size", () => {
      renderPage();
      const sigils = screen.getAllByTestId("entity-sigil");
      expect(sigils[0]).toHaveStyle({ width: "56px", height: "56px" });
    });

    it("resolves a stored location id to the location's name", () => {
      renderPage();
      // Once in the breadcrumb, once in the relationships list -- the page
      // says where they are in both places it makes sense to look.
      expect(screen.getAllByText("Mines of Moria")).toHaveLength(2);
      expect(screen.getByText("Last known location")).toBeInTheDocument();
    });

    it("leaves a location reference that resolves to nothing visible as itself", () => {
      // #1412: a dangling reference must stay visible rather than be
      // prettified into a location that does not exist.
      mockNPCDataReturn = {
        npcs: [{ ...fullNPC, location: "lothlorien" }],
        loading: false,
        error: null,
      };
      renderPage();
      expect(screen.getAllByText("lothlorien").length).toBeGreaterThan(0);
    });

    it("names the NPC's title and where they are, under the name", () => {
      renderPage();
      expect(
        screen.getByText("The Grey · from Mines of Moria")
      ).toBeInTheDocument();
    });

    it("reserves the image slot, and says it is optional rather than missing", () => {
      renderPage();
      const slot = screen.getByTestId("image-slot");
      expect(slot).toHaveAttribute("role", "img");
      expect(slot.getAttribute("aria-label")).toMatch(/no image added/i);
    });

    it("states the standing facts in a fixed order", () => {
      renderPage();
      expect(fieldValue("Status")).toBe("Alive");
      expect(fieldValue("Disposition")).toBe("Friendly");
      expect(fieldValue("Role")).toBe("Wizard");
      expect(fieldValue("Race")).toBe("Maia");
    });

    it("gives status a hue that agrees with the word rather than replacing it", () => {
      renderPage();
      const status = screen.getByText("Alive");
      expect(status.className).toContain("npc-status-alive");
    });

    it("renders the NPC's tags", () => {
      renderPage();
      expect(screen.getByText("wizard")).toBeInTheDocument();
      expect(screen.getByText("istari")).toBeInTheDocument();
    });

    it("breadcrumbs back through the directory and the location", () => {
      renderPage();
      const crumb = screen.getByTestId("breadcrumb");
      expect(crumb).toHaveTextContent("NPCs");
      expect(crumb).toHaveTextContent("Mines of Moria");
      expect(crumb).toHaveTextContent("Gandalf");
      expect(crumb.querySelector('[data-href="/npcs"]')).toBeInTheDocument();
    });

    it("accents what writes, and never what merely navigates", () => {
      // Supersedes the "exactly one accent" rule 7.1 set: the note composer is
      // now permanently on screen, so the page always carries a writing action.
      // The invariant that survives is which *kind* of control is accented.
      renderPage();
      const accented = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("data-variant") === "primary");
      expect(accented.map((b) => b.textContent)).toEqual(["Add note"]);

      expect(
        screen.getByText("Edit all fields").getAttribute("data-variant")
      ).toBe("outline");
      expect(screen.getByText("Edit").getAttribute("data-variant")).toBe(
        "ghost"
      );
    });

    it("navigates to the full form from the identity card", () => {
      renderPage();
      screen.getByText("Edit all fields").click();
      expect(mockNavigateToPage).toHaveBeenCalledWith("/npcs/edit/npc-1");
    });

    it("navigates to an associate's own page", () => {
      renderPage();
      screen.getByText(/Saruman/).closest("button")!.click();
      expect(mockNavigateToPage).toHaveBeenCalledWith("/npcs/npc-2");
    });
  });

  // -------------------------------------------------------------------------
  // Notes
  // -------------------------------------------------------------------------
  describe("notes", () => {
    it("shows a note's date, text and author", () => {
      renderPage();
      expect(screen.getByText("2025-05-31")).toBeInTheDocument();
      expect(screen.getByText("Rode to Isengard.")).toBeInTheDocument();
      expect(screen.getByText("Zendikarr")).toBeInTheDocument();
    });

    it("reads oldest first, and says so", () => {
      renderPage();
      const dates = screen
        .getAllByText(/^\d{4}-\d{2}-\d{2}$/)
        .map((n) => n.textContent);
      expect(dates).toEqual(["2025-04-02", "2025-05-31"]);
      expect(screen.getByText(/oldest first/)).toBeInTheDocument();
    });

    it("leaves a note written before authors existed uncredited", () => {
      // Attributing it to the record's creator would be inventing history.
      renderPage();
      const older = screen
        .getByText("An older note, no author recorded.")
        .closest("div");
      expect(older?.textContent).not.toContain("Zendikarr");
      expect(older?.textContent).not.toContain("DungeonMaster");
    });

    it("renders a stored ISO timestamp as a date a reader can read", () => {
      // The sample-data generator writes a full ISO timestamp where the form
      // writes YYYY-MM-DD, and the directory rows print either one raw.
      mockNPCDataReturn = {
        npcs: [
          {
            ...fullNPC,
            notes: [{ date: "2025-05-31T19:27:30.387Z", text: "Fell." }],
          },
        ],
        loading: false,
        error: null,
      };
      renderPage();
      expect(screen.getByText("2025-05-31")).toBeInTheDocument();
      expect(
        screen.queryByText("2025-05-31T19:27:30.387Z")
      ).not.toBeInTheDocument();
    });

    it("leaves an unparseable date exactly as it was stored", () => {
      mockNPCDataReturn = {
        npcs: [
          { ...fullNPC, notes: [{ date: "session nine", text: "Fell." }] },
        ],
        loading: false,
        error: null,
      };
      renderPage();
      expect(screen.getByText("session nine")).toBeInTheDocument();
    });

    it("gives a note no byline, because NPCNote carries no author", () => {
      renderPage();
      const notesLabel = screen.getByText("Notes");
      const notesField = notesLabel.parentElement as HTMLElement;
      expect(notesField.textContent).not.toContain("DungeonMaster");
      expect(notesField.textContent).not.toMatch(/\bby\b/i);
    });

    it("credits the record itself through attribution, not the notes", () => {
      renderPage();
      expect(screen.getByTestId("attribution-info")).toHaveTextContent("npc-1");
    });
  });

  // -------------------------------------------------------------------------
  // Designed states
  // -------------------------------------------------------------------------
  describe("designed states", () => {
    it("renders the designed not-found for an unknown id", () => {
      mockNpcId = "does-not-exist";
      renderPage();
      expect(
        screen.getByRole("heading", { name: /no npc with that id/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/may have been deleted/i)).toBeInTheDocument();
    });

    it("offers a way onward from the not-found rather than a dead end", () => {
      mockNpcId = "does-not-exist";
      renderPage();
      const backButtons = screen.getAllByText("Back to NPCs");
      backButtons[backButtons.length - 1].click();
      expect(mockNavigateToPage).toHaveBeenCalledWith("/npcs");
    });

    it("does not claim not-found while the data is still loading", () => {
      // The found-but-not-yet-loaded case: npcs is empty during restore, and
      // claiming "no NPC with that id" there is bug #1424's shape.
      mockNPCDataReturn = { npcs: [], loading: true, error: null };
      renderPage();
      expect(
        screen.queryByText(/no npc with that id/i)
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
    });

    it("renders a record that has nothing but a name without breaking", () => {
      mockNpcId = "npc-3";
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Nameless Guard" })
      ).toBeInTheDocument();
      expect(fieldValue("Status")).toBe("Unknown");
      expect(fieldValue("Role")).toBe("Unrecorded");
      expect(screen.getByText("Nothing written yet")).toBeInTheDocument();
    });

    it("names the page even when the record cannot be loaded", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "NPC" })
      ).toBeInTheDocument();
    });

    it("confirms before deleting, and only then deletes", async () => {
      renderPage();
      expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("Delete"));
      expect(screen.getByTestId("delete-dialog")).toHaveTextContent("Gandalf");
      expect(mockDeleteNPC).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText("Confirm delete"));
      await waitFor(() => expect(mockDeleteNPC).toHaveBeenCalledWith("npc-1"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/npcs");
    });
  });

  // -------------------------------------------------------------------------
  // Editing in place (7.2)
  // -------------------------------------------------------------------------
  describe("editing the description in place", () => {
    const openEditor = () => {
      fireEvent.click(screen.getByText("Edit"));
      return screen.getByLabelText("Description");
    };

    it("edits where it sits, rather than opening a dialog or leaving the page", () => {
      renderPage();
      openEditor();
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
      expect(mockNavigateToPage).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("puts the caret in the field so a keyboard user keeps their place", () => {
      renderPage();
      expect(openEditor()).toHaveFocus();
    });

    it("writes the edited value through the context", async () => {
      renderPage();
      const field = openEditor();
      fireEvent.change(field, { target: { value: "A wizard, much changed." } });
      fireEvent.click(screen.getByText("Save description"));

      await waitFor(() =>
        expect(mockUpdateNPC).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "npc-1",
            description: "A wizard, much changed.",
          })
        )
      );
    });

    it("re-reads the record after writing, so the page shows what was written", async () => {
      renderPage();
      const field = openEditor();
      fireEvent.change(field, { target: { value: "Changed." } });
      fireEvent.click(screen.getByText("Save description"));

      // Not an optimistic patch of local state: the refetch is what makes a
      // concurrent edit by another player visible.
      await waitFor(() => expect(mockRefreshNPCs).toHaveBeenCalled());
    });

    it("says the save took, in words", async () => {
      renderPage();
      const field = openEditor();
      fireEvent.change(field, { target: { value: "Changed." } });
      fireEvent.click(screen.getByText("Save description"));
      await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    });

    it("returns focus to the control that opened it", async () => {
      renderPage();
      fireEvent.click(screen.getByText("Edit"));
      fireEvent.click(screen.getByText("Cancel"));
      await waitFor(() =>
        expect(screen.getByText("Edit")).toHaveFocus()
      );
    });

    it("discards the typed value on cancel", () => {
      renderPage();
      const field = openEditor();
      fireEvent.change(field, { target: { value: "Never mind." } });
      fireEvent.click(screen.getByText("Cancel"));
      expect(mockUpdateNPC).not.toHaveBeenCalled();
      expect(screen.queryByText("Never mind.")).not.toBeInTheDocument();
    });

    it("closes on Escape without writing", () => {
      renderPage();
      const field = openEditor();
      fireEvent.keyDown(field, { key: "Escape" });
      expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
      expect(mockUpdateNPC).not.toHaveBeenCalled();
    });

    it("refuses to save nothing", () => {
      renderPage();
      const field = openEditor();
      fireEvent.change(field, { target: { value: "   " } });
      expect(screen.getByText("Save description")).toBeDisabled();
    });

    it("accents the save while the editor is open, and still not the navigation", () => {
      renderPage();
      openEditor();
      const accented = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("data-variant") === "primary")
        .map((b) => b.textContent);
      // Two writing actions are on screen at once: this editor's save and the
      // composer that is always there. Neither navigation control is accented.
      expect(accented).toEqual(["Save description", "Add note"]);
      expect(
        screen.getByText("Edit all fields").getAttribute("data-variant")
      ).toBe("outline");
    });

    it("still offers the editor when there is no description to edit", () => {
      mockNpcId = "npc-3";
      renderPage();
      expect(screen.getByText("Nothing written yet")).toBeInTheDocument();
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });
  });

  describe("when a save fails", () => {
    it("keeps every character the user typed", async () => {
      mockUpdateNPC.mockRejectedValue(new Error("Network unavailable"));
      renderPage();
      fireEvent.click(screen.getByText("Edit"));
      const field = screen.getByLabelText("Description");
      fireEvent.change(field, { target: { value: "Hard-won sentence." } });
      fireEvent.click(screen.getByText("Save description"));

      await waitFor(() =>
        expect(screen.getByText("Not saved")).toBeInTheDocument()
      );
      // The unforgivable version of this component throws the typed words away
      // in order to show an error.
      expect(screen.getByLabelText("Description")).toHaveValue(
        "Hard-won sentence."
      );
    });

    it("says what happened rather than only that something did", async () => {
      mockUpdateNPC.mockRejectedValue(new Error("Network unavailable"));
      renderPage();
      fireEvent.click(screen.getByText("Edit"));
      fireEvent.change(screen.getByLabelText("Description"), {
        target: { value: "x" },
      });
      fireEvent.click(screen.getByText("Save description"));
      await waitFor(() =>
        expect(screen.getByText("Network unavailable")).toBeInTheDocument()
      );
    });

    it("never claims success for a write the server refused", async () => {
      mockUpdateNPC.mockRejectedValue(new Error("nope"));
      renderPage();
      fireEvent.click(screen.getByText("Edit"));
      fireEvent.change(screen.getByLabelText("Description"), {
        target: { value: "x" },
      });
      fireEvent.click(screen.getByText("Save description"));
      await waitFor(() =>
        expect(screen.getByText("Not saved")).toBeInTheDocument()
      );
      expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    });

    it("lets the user try again without retyping", async () => {
      mockUpdateNPC.mockRejectedValueOnce(new Error("nope"));
      renderPage();
      fireEvent.click(screen.getByText("Edit"));
      fireEvent.change(screen.getByLabelText("Description"), {
        target: { value: "Second time lucky." },
      });
      fireEvent.click(screen.getByText("Save description"));
      await waitFor(() =>
        expect(screen.getByText("Not saved")).toBeInTheDocument()
      );

      fireEvent.click(screen.getByText("Save description"));
      await waitFor(() =>
        expect(mockUpdateNPC).toHaveBeenLastCalledWith(
          expect.objectContaining({ description: "Second time lucky." })
        )
      );
    });
  });

  describe("when a save neither succeeds nor fails", () => {
    // Firestore queues a write when the connection is gone: updateDoc does not
    // reject, it simply never settles. Verified against a blocked emulator --
    // the editor sat on "Saving..." with no way to tell whether it had taken.
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    const startNeverSettlingSave = () => {
      mockUpdateNPC.mockImplementation(() => new Promise(() => {}));
      renderPage();
      fireEvent.click(screen.getByText("Edit"));
      fireEvent.change(screen.getByLabelText("Description"), {
        target: { value: "A sentence worth keeping." },
      });
      fireEvent.click(screen.getByText("Save description"));
    };

    it("stops implying the save is nearly done", () => {
      startNeverSettlingSave();
      // The ordinary state lives on the button and is not repeated beside it.
      expect(screen.getByText("Saving...")).toBeInTheDocument();
      expect(screen.queryByText(/Still saving/)).not.toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(8000);
      });
      expect(screen.getByText(/Still saving/)).toBeInTheDocument();
    });

    it("does not claim the save failed, because it has not", () => {
      startNeverSettlingSave();
      act(() => {
        jest.advanceTimersByTime(8000);
      });
      // Saying "Not saved" here is the same lie as saying "Saved", pointed the
      // other way: Firestore may still land the queued write.
      expect(screen.queryByText("Not saved")).not.toBeInTheDocument();
      expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    });

    it("keeps the typed text, and says it is safe", () => {
      startNeverSettlingSave();
      act(() => {
        jest.advanceTimersByTime(8000);
      });
      expect(screen.getByLabelText("Description")).toHaveValue(
        "A sentence worth keeping."
      );
      expect(screen.getByText(/Your text is safe/)).toBeInTheDocument();
    });

    it("lets a stuck user leave, which it does not while the save is brief", () => {
      startNeverSettlingSave();
      expect(screen.getByText("Cancel")).toBeDisabled();

      act(() => {
        jest.advanceTimersByTime(8000);
      });
      expect(screen.getByText("Cancel")).toBeEnabled();
    });
  });

  describe("adding a note", () => {
    // The composer is always on screen -- there is nothing to open.
    const composer = () => screen.getByLabelText("Add a note");

    it("is on screen without being summoned", () => {
      renderPage();
      expect(composer()).toBeInTheDocument();
    });

    it("does not steal the caret on load", () => {
      renderPage();
      expect(composer()).not.toHaveFocus();
    });

    it("adds one without navigating away", async () => {
      renderPage();
      fireEvent.change(composer(), {
        target: { value: "Met the Balrog." },
      });
      fireEvent.click(screen.getByText("Add note"));

      await waitFor(() =>
        expect(mockUpdateNPCNote).toHaveBeenCalledWith(
          "npc-1",
          expect.objectContaining({ text: "Met the Balrog." })
        )
      );
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });

    it("dates the note today, in the shape the forms already write", async () => {
      renderPage();
      fireEvent.change(composer(), {
        target: { value: "Met the Balrog." },
      });
      fireEvent.click(screen.getByText("Add note"));

      await waitFor(() => expect(mockUpdateNPCNote).toHaveBeenCalled());
      const [, note] = mockUpdateNPCNote.mock.calls[0];
      expect(note.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(note.date).toBe(new Date().toISOString().split("T")[0]);
    });

    it("credits the note to the acting character", async () => {
      renderPage();
      fireEvent.change(composer(), {
        target: { value: "Met the Balrog." },
      });
      fireEvent.click(screen.getByText("Add note"));
      await waitFor(() => expect(mockUpdateNPCNote).toHaveBeenCalled());
      const [, note] = mockUpdateNPCNote.mock.calls[0];
      expect(note.author).toBe("Zendikarr");
      expect(Object.keys(note).sort()).toEqual(["author", "date", "text"]);
    });

    it("falls back to the username when the player has no character", async () => {
      mockGroupUserProfile = { username: "gandlaf", characters: [] };
      renderPage();
      fireEvent.change(composer(), { target: { value: "Met the Balrog." } });
      fireEvent.click(screen.getByText("Add note"));
      await waitFor(() => expect(mockUpdateNPCNote).toHaveBeenCalled());
      const [, note] = mockUpdateNPCNote.mock.calls[0];
      expect(note.author).toBe("gandlaf");
    });

    it("writes no author at all rather than an empty one", async () => {
      mockGroupUserProfile = null;
      renderPage();
      fireEvent.change(composer(), { target: { value: "Met the Balrog." } });
      fireEvent.click(screen.getByText("Add note"));
      await waitFor(() => expect(mockUpdateNPCNote).toHaveBeenCalled());
      const [, note] = mockUpdateNPCNote.mock.calls[0];
      expect(Object.keys(note).sort()).toEqual(["date", "text"]);
    });

    it("re-reads the record after writing", async () => {
      renderPage();
      fireEvent.change(composer(), { target: { value: "Met the Balrog." } });
      fireEvent.click(screen.getByText("Add note"));
      await waitFor(() => expect(mockRefreshNPCs).toHaveBeenCalled());
    });

    it("empties itself after a note lands, ready for the next one", async () => {
      renderPage();
      fireEvent.change(composer(), { target: { value: "Met the Balrog." } });
      fireEvent.click(screen.getByText("Add note"));
      await waitFor(() => expect(composer()).toHaveValue(""));
    });

    it("keeps the note when the write fails", async () => {
      mockUpdateNPCNote.mockRejectedValue(new Error("Write refused"));
      renderPage();
      fireEvent.change(composer(), { target: { value: "Met the Balrog." } });
      fireEvent.click(screen.getByText("Add note"));
      await waitFor(() =>
        expect(screen.getByText("Write refused")).toBeInTheDocument()
      );
      expect(composer()).toHaveValue("Met the Balrog.");
    });

    it("offers no editing or deletion of an existing note", () => {
      renderPage();
      expect(screen.queryByText("Edit note")).not.toBeInTheDocument();
      expect(screen.queryByText("Delete note")).not.toBeInTheDocument();
    });
  });

  describe("read-only visitors", () => {
    it("offers no way to edit or delete while signed out", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
      expect(screen.queryByText("Add note")).not.toBeInTheDocument();
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
      expect(screen.queryByText("Edit all fields")).not.toBeInTheDocument();
    });

    it("still says which page it is", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "NPC" })
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Route ranking
  // -------------------------------------------------------------------------
  describe("route ranking", () => {
    // These patterns mirror the three /npcs routes in app/App.tsx. The failure
    // mode this guards is a create page silently becoming a detail page for an
    // NPC called "create"; React Router ranks static segments above dynamic
    // ones regardless of declaration order, and this pins that.
    const npcRoutes = [
      { path: "/npcs" },
      { path: "/npcs/create" },
      { path: "/npcs/edit/:npcId" },
      { path: "/npcs/:npcId" },
    ];

    it("keeps /npcs/create on the create route", () => {
      const matched = matchRoutes(npcRoutes, "/npcs/create");
      expect(matched?.[0].route.path).toBe("/npcs/create");
    });

    it("keeps /npcs/edit/:npcId on the edit route", () => {
      const matched = matchRoutes(npcRoutes, "/npcs/edit/npc-1");
      expect(matched?.[0].route.path).toBe("/npcs/edit/:npcId");
    });

    it("sends any other single segment to the detail route", () => {
      const matched = matchRoutes(npcRoutes, "/npcs/npc-1");
      expect(matched?.[0].route.path).toBe("/npcs/:npcId");
    });
  });
});
