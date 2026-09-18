// src/pages/npcs/__tests__/NPCDetailPage.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
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
  // `SignInForm` and `JoinGroupDialog` were stubbed here until 14.5 deleted
  // the dialogs. `GatedContent` now links to the routes instead, and needs
  // only the path builder.
  signInPathFor: () => "/signin",
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
const mockUpdateRumor = jest.fn().mockResolvedValue(undefined);
let mockRumors: any[] = [];
let mockQuests: any[] = [
  { id: "quest-1", title: "Destroy the Ring", status: "active" },
  { id: "quest-2", title: "Find the Entwives", status: "active" },
];

jest.mock("features/campaign-entities", () => ({
  useNPCData: () => ({ ...mockNPCDataReturn, refreshNPCs: mockRefreshNPCs }),
  useNPCs: () => ({
    updateNPC: mockUpdateNPC,
    updateNPCNote: mockUpdateNPCNote,
    deleteNPC: mockDeleteNPC,
  }),
  useQuests: () => ({ getQuestById: mockGetQuestById, quests: mockQuests }),
  useRumors: () => ({ rumors: mockRumors, updateRumor: mockUpdateRumor }),
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
    // Added in 14.5: links that must look like buttons wear this recipe.
    buttonClasses: () => "button",
    // `startIcon` and the rest are dropped on purpose; `aria-label` is not.
    // Four pencils on this page all read "Edit", and what tells them apart is
    // the accessible name -- a mock that swallowed it would hide exactly the
    // thing these tests need to distinguish.
    default: React.forwardRef(
      (
        { children, onClick, variant, disabled, "aria-label": ariaLabel }: any,
        ref: any
      ) => (
        <button
          ref={ref}
          onClick={onClick}
          disabled={disabled}
          aria-label={ariaLabel}
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
    mockQuests = [
      { id: "quest-1", title: "Destroy the Ring", status: "active" },
      { id: "quest-2", title: "Find the Entwives", status: "active" },
    ];
    mockUpdateRumor.mockResolvedValue(undefined);
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

    it("asks for what is missing, instead of dropping the fields or showing blanks", () => {
      // CHANGED DELIBERATELY in `15-6` item 3. This suite used to assert that
      // the three prose fields vanish when all three are empty -- "an empty
      // card is worse than no card". True of an empty card; not true of a
      // question. An NPC created through quick add has a name and a line, and
      // a page that answers that by hiding five of its seven fields reads as
      // broken rather than new (§10, design language §8).
      mockNpcId = "npc-3";
      renderPage();

      expect(
        screen.getByRole("button", { name: /What do they look like\?/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /How do they treat the party\?/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Where do they come from\?/ })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Who are they\?/ })).toBeInTheDocument();

      // The sidebar cards stay, as they did.
      expect(screen.getByText(/Relationships/)).toBeInTheDocument();
      expect(screen.getByText("Nothing linked yet")).toBeInTheDocument();
      expect(screen.getByText("Tags")).toBeInTheDocument();
    });

    it("shows a signed-out reader the gate rather than the prompts", () => {
      // A prompt is an invitation, and `usePageGate` only reports `canAct` for
      // a viewer the page is ready for -- so a signed-out reader never reaches
      // the record at all, let alone an invitation to fill it in.
      mockNpcId = "npc-3";
      mockUser = null;
      renderPage();
      expect(screen.queryByText(/What do they look like/)).not.toBeInTheDocument();
      expect(screen.queryByText("Appearance")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { level: 1, name: "Nameless Guard" })
      ).not.toBeInTheDocument();
    });

    it("shows no prompt where something is written", () => {
      // "An NPC with two of five sections written looks deliberately
      // incomplete; one with all five shows no prompts at all."
      renderPage();
      expect(screen.queryByText(/What do they look like/)).not.toBeInTheDocument();
      expect(screen.queryByText(/How do they treat the party/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Where do they come from/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Who are they\?/)).not.toBeInTheDocument();
      expect(screen.queryByText(/What race are they/)).not.toBeInTheDocument();
      expect(screen.queryByText(/What do they do\?/)).not.toBeInTheDocument();
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

    it("states presence as a word, and ranks it on the shared ramp", () => {
      // This reverses the assertion it replaces, by decision (schema D41).
      //
      // 12-3a took the hue off presence because alive-green and deceased-red
      // read a death as an error. That was right about the semantics and left
      // the NPC directory unrankable at a glance, so presence now sits on the
      // same five-stop ramp as every other ranked state -- alive is the same
      // green a completed quest is, deceased the same red a failed one is.
      //
      // What has to survive the reversal is that the hue is never alone. The
      // word is still rendered, and 12-5's strike still marks a deceased NPC.
      renderPage();
      const status = screen.getByText("Alive");
      expect(status.className).toContain("valence-0");
      // Positional, never named for the domain state -- that naming is what
      // made a quest's green reachable by anything that wanted green.
      expect(status.className).not.toMatch(/succeeded|completed|alive/);
    });

    it("gives disposition a hue, because a stance toward the party is valenced", () => {
      renderPage();
      const disposition = screen.getByText("Friendly");
      expect(disposition.className).toContain("disposition-friendly");
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
      expect(
        screen
          .getByRole("button", { name: "Edit description" })
          .getAttribute("data-variant")
      ).toBe("ghost");
    });

    it("opens every editor on the page, and navigates nowhere", () => {
      // CHANGED DELIBERATELY in `15-6` item 2. "Change five things at once" is
      // a real thing to want; leaving the page to do it is not. `/npcs/edit/:id`
      // still exists -- `15-8` retires it -- but nothing here routes to it.
      renderPage();
      fireEvent.click(screen.getByText("Edit all fields"));

      expect(mockNavigateToPage).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
      expect(screen.getByLabelText("Appearance")).toBeInTheDocument();
      expect(screen.getByLabelText("Personality")).toBeInTheDocument();
      expect(screen.getByLabelText("Background")).toBeInTheDocument();
      expect(screen.getByLabelText("Role")).toBeInTheDocument();
      expect(screen.getByLabelText("Race")).toBeInTheDocument();
      expect(
        screen.getByRole("group", { name: "Status of Gandalf" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("group", { name: "Disposition of Gandalf" })
      ).toBeInTheDocument();
    });

    it("opens one editor at a time when a section is opened on its own (\u00a77)", () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Edit description" }));
      expect(screen.getByLabelText("Description")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Edit appearance" }));
      expect(screen.getByLabelText("Appearance")).toBeInTheDocument();
      expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
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
      // `15-6` item 5: the same shape the record line uses, not the shape the
      // note is stored in.
      expect(screen.getByText("31/05/2025")).toBeInTheDocument();
      expect(screen.getByText("Rode to Isengard.")).toBeInTheDocument();
      expect(screen.getByText("Zendikarr")).toBeInTheDocument();
    });

    it("reads oldest first, and says so", () => {
      renderPage();
      const dates = screen
        .getAllByText(/^\d{2}\/\d{2}\/\d{4}$/)
        .map((n) => n.textContent);
      expect(dates).toEqual(["02/04/2025", "31/05/2025"]);
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
      expect(screen.getByText("31/05/2025")).toBeInTheDocument();
      expect(
        screen.queryByText("2025-05-31T19:27:30.387Z")
      ).not.toBeInTheDocument();
      // And not the stored shape either: `2025-05-31` is what this page used
      // to print beside a record line reading `31/05/2025`.
      expect(screen.queryByText("2025-05-31")).not.toBeInTheDocument();
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
      // Status and disposition always have a value -- the type requires one --
      // so they still state it.
      expect(fieldValue("Status")).toBe("Unknown");
      // Role and race do not, and now ask instead of reporting "Unrecorded"
      // (`15-6` item 3).
      expect(
        screen.getByRole("button", { name: /What do they do\?/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /What race are they\?/ })
      ).toBeInTheDocument();
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
    const editButton = () =>
      screen.getByRole("button", { name: "Edit description" });

    const openEditor = () => {
      fireEvent.click(editButton());
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
      fireEvent.click(editButton());
      fireEvent.click(screen.getByText("Cancel"));
      await waitFor(() => expect(editButton()).toHaveFocus());
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

    it("asks for a description when there is none, rather than showing a blank", () => {
      // The prompt replaces both the "Nothing written yet" line and the pencil
      // beside it: one control, and it says what to write.
      mockNpcId = "npc-3";
      renderPage();
      expect(screen.queryByText("Nothing written yet")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Who are they\?/ }));
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
    });
  });

  describe("when a save fails", () => {
    it("keeps every character the user typed", async () => {
      mockUpdateNPC.mockRejectedValue(new Error("Network unavailable"));
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Edit description" }));
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
      fireEvent.click(screen.getByRole("button", { name: "Edit description" }));
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
      fireEvent.click(screen.getByRole("button", { name: "Edit description" }));
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
      fireEvent.click(screen.getByRole("button", { name: "Edit description" }));
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
      fireEvent.click(screen.getByRole("button", { name: "Edit description" }));
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
  // Editing the rest of the record in place (`15-6` item 1)
  // -------------------------------------------------------------------------
  describe("editing every other field in place", () => {
    const openValue = (name: string) =>
      fireEvent.click(screen.getByRole("button", { name }));

    it("renames the NPC from the name itself", async () => {
      renderPage();
      openValue("Edit the name Gandalf");
      fireEvent.change(screen.getByLabelText("Name"), {
        target: { value: "Gandalf the White" },
      });
      fireEvent.click(screen.getByText("Save name"));

      await waitFor(() =>
        expect(mockUpdateNPC).toHaveBeenCalledWith(
          expect.objectContaining({ id: "npc-1", name: "Gandalf the White" })
        )
      );
    });

    it("edits appearance, personality and background where they are read", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Edit personality" }));
      fireEvent.change(screen.getByLabelText("Personality"), {
        target: { value: "Short-tempered with fools." },
      });
      fireEvent.click(screen.getByText("Save personality"));

      await waitFor(() =>
        expect(mockUpdateNPC).toHaveBeenCalledWith(
          expect.objectContaining({ personality: "Short-tempered with fools." })
        )
      );
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });

    it("changes presence from the header strip, as a ladder of words", async () => {
      renderPage();
      openValue("Edit status");

      const ladder = screen.getByRole("group", { name: "Status of Gandalf" });
      expect(ladder.textContent).toContain("Deceased");
      fireEvent.click(
        within(ladder).getByRole("button", { name: "Deceased" })
      );

      await waitFor(() =>
        expect(mockUpdateNPC).toHaveBeenCalledWith(
          expect.objectContaining({ status: "deceased" })
        )
      );
    });

    it("changes disposition the same way", async () => {
      renderPage();
      openValue("Edit disposition");
      fireEvent.click(
        within(screen.getByRole("group", { name: "Disposition of Gandalf" })).getByRole(
          "button",
          { name: "Hostile" }
        )
      );

      await waitFor(() =>
        expect(mockUpdateNPC).toHaveBeenCalledWith(
          expect.objectContaining({ relationship: "hostile" })
        )
      );
    });

    it("edits the role and the race, which are free text", async () => {
      renderPage();
      openValue("Edit role");
      fireEvent.change(screen.getByLabelText("Role"), {
        target: { value: "Istari" },
      });
      fireEvent.click(screen.getByText("Save role"));

      await waitFor(() =>
        expect(mockUpdateNPC).toHaveBeenCalledWith(
          expect.objectContaining({ occupation: "Istari" })
        )
      );
    });

    it("keeps the typed text and says why when one of these writes is refused", async () => {
      mockUpdateNPC.mockRejectedValueOnce(new Error("Permission denied"));
      renderPage();
      openValue("Edit role");
      fireEvent.change(screen.getByLabelText("Role"), {
        target: { value: "Istari" },
      });
      fireEvent.click(screen.getByText("Save role"));

      await waitFor(() =>
        expect(screen.getByText(/Permission denied/)).toBeInTheDocument()
      );
      expect(screen.getByLabelText("Role")).toHaveValue("Istari");
    });

    it("adds and removes a tag", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Add another tag/ }));
      fireEvent.change(screen.getByLabelText("Add a tag"), {
        target: { value: "grey" },
      });
      fireEvent.click(screen.getByText("Add tag"));

      await waitFor(() =>
        expect(mockUpdateNPC).toHaveBeenCalledWith(
          expect.objectContaining({ tags: ["wizard", "istari", "grey"] })
        )
      );

      fireEvent.click(screen.getByRole("button", { name: "Remove the tag wizard" }));
      await waitFor(() =>
        expect(mockUpdateNPC).toHaveBeenCalledWith(
          expect.objectContaining({ tags: ["istari"] })
        )
      );
    });
  });

  // -------------------------------------------------------------------------
  // The rail gains a way in (`15-6` item 4)
  // -------------------------------------------------------------------------
  describe("attaching a relation from the rail", () => {
    const openTray = () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Attach to what Gandalf is linked to/ })
      );
    };

    it("offers the four kinds the card already groups, without typing", () => {
      // A kind with nothing in it shows no heading, so all four need a
      // candidate for this to be a test of the grouping rather than of the
      // fixture.
      mockRumors = [
        { id: "rumor-1", title: "A wizard is coming", status: "confirmed", relatedNPCs: [] },
      ];
      renderPage();
      openTray();
      // Scoped to the tray: the rail groups by the same four words, which is
      // the point -- the tray was given the grouping the card already had.
      const tray = screen.getByRole("listbox");
      expect(within(tray).getByText("People")).toBeInTheDocument();
      expect(within(tray).getByText("Places")).toBeInTheDocument();
      expect(within(tray).getByText("Quests")).toBeInTheDocument();
      expect(within(tray).getByText("Rumours")).toBeInTheDocument();
      // Browsing is the primary act: the filter is there, and nothing was
      // typed into it to get this list.
      expect(within(tray).getAllByRole("option").length).toBeGreaterThan(1);
    });

    it("never offers the NPC themselves", () => {
      renderPage();
      openTray();
      const tray = screen.getByRole("listbox");
      expect(within(tray).queryByText("Gandalf")).not.toBeInTheDocument();
    });

    it("attaches a quest to the NPC's own connections", async () => {
      renderPage();
      openTray();
      fireEvent.click(
        within(screen.getByRole("listbox")).getByText("Find the Entwives")
      );

      await waitFor(() =>
        expect(mockUpdateNPC).toHaveBeenCalledWith(
          expect.objectContaining({
            connections: expect.objectContaining({
              relatedQuests: ["quest-1", "quest-missing", "quest-2"],
            }),
          })
        )
      );
    });

    it("writes the rumour, because that is the record that holds the link", async () => {
      // A rumour names the NPCs it concerns; an NPC does not list its rumours.
      // The relationship is real in both directions and only one direction has
      // a field for it.
      mockRumors = [
        { id: "rumor-1", title: "A wizard is coming", status: "confirmed", relatedNPCs: [] },
      ];
      renderPage();
      openTray();
      fireEvent.click(
        within(screen.getByRole("listbox")).getByText("A wizard is coming")
      );

      await waitFor(() =>
        expect(mockUpdateRumor).toHaveBeenCalledWith(
          expect.objectContaining({ id: "rumor-1", relatedNPCs: ["npc-1"] })
        )
      );
      expect(mockUpdateNPC).not.toHaveBeenCalled();
    });

    it("replaces the place rather than collecting several, because someone is in one place", async () => {
      renderPage();
      openTray();
      fireEvent.click(
        within(screen.getByRole("listbox")).getByText("Mines of Moria")
      );

      await waitFor(() =>
        expect(mockUpdateNPC).toHaveBeenCalledWith(
          expect.objectContaining({
            locationId: "mines-of-moria",
            location: "Mines of Moria",
          })
        )
      );
    });

    it("says what is already attached instead of offering it again", () => {
      renderPage();
      openTray();
      const quest = within(screen.getByRole("listbox"))
        .getByText("Destroy the Ring")
        .closest('[role="option"]');
      expect(quest).toHaveAttribute("aria-selected", "true");
    });

    it("draws no chips of its own, because the card below is the list", () => {
      renderPage();
      // Saruman is attached, and appears once: in the relationships list.
      expect(screen.getAllByText(/Saruman/)).toHaveLength(1);
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
