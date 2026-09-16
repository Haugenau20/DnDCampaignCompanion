// src/pages/locations/__tests__/LocationEditPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LocationEditPage from "../LocationEditPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
let mockLocationId: string | undefined = "loc-1";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ locationId: mockLocationId }),
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
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("shared/context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

interface LocationContextMock {
  locations: any[];
  isLoading: boolean;
  error: string | null;
}

let mockLocationContext: LocationContextMock = {
  locations: [
    { id: "loc-1", name: "Rivendell" },
    { id: "loc-2", name: "Moria" },
  ],
  isLoading: false,
  error: null,
};

jest.mock("features/campaign-entities", () => ({
  useLocations: () => mockLocationContext,
  LocationEditForm: (props: any) => (
    <div data-testid="location-edit-form">
      <span data-testid="edit-form-location-id">{props.location?.id}</span>
      <span data-testid="edit-form-location-name">{props.location?.name}</span>
      <button data-testid="edit-form-success" onClick={props.onSuccess}>
        success
      </button>
      <button data-testid="edit-form-cancel" onClick={props.onCancel}>
        cancel
      </button>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------

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

jest.mock("core/components/Card", () => {
  const Card = ({ children }: any) => <div data-testid="card">{children}</div>;
  Card.Content = ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  );
  return { __esModule: true, default: Card };
});

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
      <LocationEditPage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("LocationEditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationId = "loc-1";
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
    mockLocationContext = {
      locations: [
        { id: "loc-1", name: "Rivendell" },
        { id: "loc-2", name: "Moria" },
      ],
      isLoading: false,
      error: null,
    };
  });

  // -------------------------------------------------------------------------
  // Gated states
  // -------------------------------------------------------------------------
  describe("gated states", () => {
    it("renders the page title while signed out", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit Rivendell" })
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
        screen.queryByTestId("location-edit-form")
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
        screen.queryByTestId("location-edit-form")
      ).not.toBeInTheDocument();
    });

    // Rewritten: the pre-gate page redirected a signed-out visitor straight
    // back to /locations via a `!user` effect, so they never saw why (and,
    // per bug #1423, that effect also had to be careful not to fire while
    // auth was merely still rehydrating). The write-mode panel now shows in
    // place instead for every one of those cases -- see
    // LocationEditPage.tsx's file header -- so there is no redirect left to
    // guard at all.
    it("does NOT redirect a signed-out visitor away from the page", () => {
      mockUser = null;
      renderPage();
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });

    it("does NOT redirect while auth is still resolving", () => {
      mockUser = null;
      mockIsResolving = true;
      renderPage();
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Rendering — location found
  // -------------------------------------------------------------------------
  describe("when location is found and context is ready", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    // Rewritten: the title now renders via PageShell as the page's h1.
    it("renders heading with location name as the h1", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit Rivendell" })
      ).toBeInTheDocument();
    });

    it("renders LocationEditForm", () => {
      renderPage();
      expect(screen.getByTestId("location-edit-form")).toBeInTheDocument();
    });

    it("passes the correct location to LocationEditForm", () => {
      renderPage();
      expect(screen.getByTestId("edit-form-location-id")).toHaveTextContent(
        "loc-1"
      );
      expect(screen.getByTestId("edit-form-location-name")).toHaveTextContent(
        "Rivendell"
      );
    });

    it("shows 'Back to Locations' button", () => {
      renderPage();
      expect(screen.getByText("Back to Locations")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Location not found
  // -------------------------------------------------------------------------
  describe("when location is not found by URL param", () => {
    beforeEach(() => {
      mockLocationId = "nonexistent-loc";
    });

    it("shows 'Location not found' error", () => {
      renderPage();
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Location not found"
      );
    });

    it("does NOT render LocationEditForm", () => {
      renderPage();
      expect(
        screen.queryByTestId("location-edit-form")
      ).not.toBeInTheDocument();
    });

    it("renders fallback heading 'Edit Location'", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit Location" })
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    beforeEach(() => {
      mockLocationContext = {
        ...mockLocationContext,
        isLoading: true,
        locations: [],
      };
    });

    // Rewritten: `isLoading` now folds into the shared "resolving" state via
    // `usePageGate`; the page's own bare "Loading location data..." text is
    // gone.
    it("shows a skeleton, not the page's own loading text", () => {
      renderPage();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
      expect(
        screen.queryByText("Loading location data...")
      ).not.toBeInTheDocument();
    });

    it("does NOT render LocationEditForm during loading", () => {
      renderPage();
      expect(
        screen.queryByTestId("location-edit-form")
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  //
  // Rewritten: the page's own "Error Loading Location Data..." card is gone.
  // The fetch error now surfaces through GatedContent's shared error panel,
  // which names the noun from GATED_COPY ("locations") and renders the raw
  // error text underneath it.
  // -------------------------------------------------------------------------
  describe("error state", () => {
    beforeEach(() => {
      mockLocationContext = {
        ...mockLocationContext,
        isLoading: false,
        error: "Firebase error",
        locations: [],
      };
    });

    it("renders the shared error panel with the fetch error", () => {
      renderPage();
      expect(
        screen.getByText(/couldn't load locations/i)
      ).toBeInTheDocument();
      expect(screen.getByText("Firebase error")).toBeInTheDocument();
    });

    it("does NOT render LocationEditForm on error", () => {
      renderPage();
      expect(
        screen.queryByTestId("location-edit-form")
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    it("navigates to /locations on back button click", () => {
      renderPage();
      fireEvent.click(screen.getByText("Back to Locations"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/locations");
    });

    it("navigates to /locations on form success", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("edit-form-success"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/locations");
    });

    it("navigates to /locations on form cancel", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("edit-form-cancel"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/locations");
    });
  });
});
