// src/pages/locations/__tests__/LocationCreatePage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LocationCreatePage from "../LocationCreatePage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();
let mockLocationState: Record<string, any> = {};

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    state: mockLocationState,
    pathname: "/locations/create",
  }),
}));

// ---------------------------------------------------------------------------
// Page-suite gate mock (shared across Tasks 8-13 -- see page-suite-mock.md)
// ---------------------------------------------------------------------------
let mockUser: { uid: string } | null = { uid: "user-1" };
let mockIsResolving = false;
let mockActiveGroupId: string | null = "group-1";
let mockActiveCampaignId: string | null = "campaign-1";
let mockGroups: Array<{ id: string; name: string }> = [
  { id: "group-1", name: "The Fellowship" },
];

const mockSetActiveGroup = jest.fn().mockResolvedValue(undefined);
const mockSetActiveCampaign = jest.fn().mockResolvedValue(undefined);

jest.mock("features/user-management", () => ({
  useAuth: () => ({ user: mockUser, loading: mockIsResolving }),
  useGroups: () => ({
    activeGroupId: mockActiveGroupId,
    groups: mockGroups,
    setActiveGroup: mockSetActiveGroup,
  }),
  useCampaigns: () => ({
    activeCampaignId: mockActiveCampaignId,
    activeCampaign: mockActiveCampaignId
      ? { id: mockActiveCampaignId, name: "Phandelver" }
      : null,
    setActiveCampaign: mockSetActiveCampaign,
  }),
  SignInForm: () => <div data-testid="sign-in-form" />,
  JoinGroupDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-group-dialog" /> : null,
}));

// useSelectableCampaigns fetches through this in the pick-campaign state.
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
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("features/campaign-entities", () => ({
  LocationCreateForm: (props: any) => (
    <div data-testid="location-create-form">
      <span data-testid="location-form-initial-data">
        {JSON.stringify(props.initialData)}
      </span>
      <button
        data-testid="location-form-success"
        onClick={props.onSuccess}
      >
        success
      </button>
      <button
        data-testid="location-form-cancel"
        onClick={props.onCancel}
      >
        cancel
      </button>
    </div>
  ),
}));

jest.mock("shared/components/Breadcrumb", () => ({
  __esModule: true,
  default: (props: any) => (
    <nav data-testid="breadcrumb">
      {props.items.map((item: any, i: number) => (
        <span key={i} data-testid={`breadcrumb-item-${i}`}>
          {item.label}
        </span>
      ))}
    </nav>
  ),
}));

// Typography is mapped to its real semantic tag (h1/h2/h3/h4, else `p`) so
// that `getByRole("heading", ...)` works against both this page's own title
// (via PageShell) and the shared gated panel's headings (via GatedPageState),
// while still exposing the same `data-testid` scheme the existing assertions
// below rely on.
jest.mock("core/components/Typography", () => {
  const TAGS: Record<string, string> = { h1: "h1", h2: "h2", h3: "h3", h4: "h4" };
  return {
    __esModule: true,
    default: ({ children, color, variant }: any) => {
      const Tag = (TAGS[variant] || "p") as any;
      return (
        <Tag
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

jest.mock("core/components/Button", () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
  Lock: () => <span data-testid="lock-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(
    <MemoryRouter>
      <LocationCreatePage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("LocationCreatePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationState = {};
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
  });

  // -------------------------------------------------------------------------
  // Gated states
  // -------------------------------------------------------------------------
  describe("gated states", () => {
    it("renders the page title while signed out", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Create New Location" })
      ).toBeInTheDocument();
    });

    // Write route: the heading names adding a location and never suggests
    // picking a group.
    it("asks a signed-out visitor to sign in to add a location, and never to select a group", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { name: /sign in to add a location/i })
      ).toBeInTheDocument();
      expect(screen.queryByText(/select a group/i)).not.toBeInTheDocument();
    });

    it("hides the location form while signed out", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.queryByTestId("location-create-form")
      ).not.toBeInTheDocument();
    });

    it("shows a skeleton and no message while context is still resolving", () => {
      mockIsResolving = true;
      renderPage();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
      expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    });

    it("shows the shared pick-campaign panel when context is missing", async () => {
      mockActiveCampaignId = null;
      renderPage();
      expect(
        await screen.findByRole("heading", { name: /which campaign/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("location-create-form")
      ).not.toBeInTheDocument();
    });

    it("does NOT redirect a signed-out visitor away from the page", () => {
      mockUser = null;
      renderPage();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders breadcrumb with Locations and Create labels", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent(
        "Locations"
      );
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent(
        "Create"
      );
    });

    // Rewritten: the title now renders via PageShell as the page's h1
    // (normalised from the old h2) rather than a bare `Typography`.
    it("renders the page heading as the h1", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Create New Location" })
      ).toBeInTheDocument();
    });

    it("renders LocationCreateForm", () => {
      renderPage();
      expect(screen.getByTestId("location-create-form")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Back button label
  // -------------------------------------------------------------------------
  describe("back button label", () => {
    it("shows 'Back to Locations' when no noteId in state", () => {
      mockLocationState = {};
      renderPage();
      expect(screen.getByText("Back to Locations")).toBeInTheDocument();
    });

    it("shows 'Back to Note' when noteId is in state", () => {
      mockLocationState = { noteId: "note-33" };
      renderPage();
      expect(screen.getByText("Back to Note")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // initialData derivation
  // Bug #750 was fixed and this characterization test corrected under
  // explicit authorization on 2026-07-28 (same terms as #005/#006): it used
  // to assert the buggy behavior (always passing an object, never undefined)
  // by name. LocationCreatePage now matches NPCsCreatePage / QuestCreatePage
  // / RumorCreatePage's `initialData ? {...} : undefined` pattern.
  // -------------------------------------------------------------------------
  describe("initialData derivation", () => {
    it("passes undefined initialData when no state is present (matches NPC/Quest/Rumor CreatePages)", () => {
      mockLocationState = {};
      renderPage();
      const raw = screen.getByTestId("location-form-initial-data").textContent;
      // Fixed behavior: with no location.state, formInitialData is undefined,
      // so LocationCreateForm receives undefined rather than `{}`. The mock
      // renders `{JSON.stringify(props.initialData)}`, and JSON.stringify(undefined)
      // is the value `undefined` (not a string), so React renders no text at all —
      // hence asserting emptiness here rather than JSON.parse-ing it.
      expect(raw).toBe("");
    });

    it("spreads initialData and attaches noteId and entityId", () => {
      mockLocationState = {
        initialData: { name: "Rivendell", type: "city" },
        noteId: "note-11",
        entityId: "entity-2",
      };
      renderPage();
      const raw = screen.getByTestId("location-form-initial-data").textContent!;
      const parsed = JSON.parse(raw);
      expect(parsed.name).toBe("Rivendell");
      expect(parsed.noteId).toBe("note-11");
      expect(parsed.entityId).toBe("entity-2");
    });
  });

  // -------------------------------------------------------------------------
  // Navigation handlers
  // -------------------------------------------------------------------------
  describe("onSuccess navigation", () => {
    it("navigates to /locations on form success", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("location-form-success"));
      expect(mockNavigate).toHaveBeenCalledWith("/locations");
    });
  });

  describe("onCancel navigation", () => {
    it("navigates to /locations on cancel when no noteId", () => {
      mockLocationState = {};
      renderPage();
      fireEvent.click(screen.getByTestId("location-form-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/locations");
    });

    it("navigates to note page on cancel when noteId is present", () => {
      mockLocationState = { noteId: "note-55" };
      renderPage();
      fireEvent.click(screen.getByTestId("location-form-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/notes/note-55");
    });
  });
});
