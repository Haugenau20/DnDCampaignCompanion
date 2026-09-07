// src/pages/rumors/__tests__/RumorEditPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RumorEditPage from "../RumorEditPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
let mockRumorId: string | undefined = "rumor-1";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ rumorId: mockRumorId }),
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

// RumorEditPage imports useNavigation from shared/hooks/useNavigation, which
// wraps NavigationContext -- mocked directly here rather than through the
// context so the page's own import path is exercised.
jest.mock("shared/hooks/useNavigation", () => ({
  __esModule: true,
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
  default: () => ({ navigateToPage: mockNavigateToPage }),
}));

interface RumorContextMock {
  rumors: any[];
  isLoading: boolean;
  error: string | null;
}

let mockRumorContext: RumorContextMock = {
  rumors: [
    { id: "rumor-1", title: "The Golden Dragon Awakens" },
    { id: "rumor-2", title: "Missing Merchants" },
  ],
  isLoading: false,
  error: null,
};

jest.mock("features/campaign-entities", () => ({
  useRumors: () => mockRumorContext,
  RumorForm: (props: any) => (
    <div data-testid="rumor-form">
      <span data-testid="rumor-form-rumor-id">{props.rumor?.id}</span>
      <span data-testid="rumor-form-rumor-title">{props.rumor?.title}</span>
      <span data-testid="rumor-form-title">{props.title}</span>
      <button data-testid="rumor-form-success" onClick={props.onSuccess}>
        success
      </button>
      <button data-testid="rumor-form-cancel" onClick={props.onCancel}>
        cancel
      </button>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------

// Typography is mapped to its real semantic tag (h1/h2/h3/h4, else `p`) so
// that `getByRole("heading", ...)` works against both this page's own title
// (via PageShell) and the shared gated panel's headings (via GatedPageState),
// while still exposing the same `data-testid` scheme the existing assertions
// below rely on.
jest.mock("../../../core/components/Typography", () => {
  const TAGS: Record<string, string> = { h1: "h1", h2: "h2", h3: "h3", h4: "h4" };
  return {
    __esModule: true,
    default: ({ children, color, variant }: any) => {
      const Tag = (TAGS[variant] || "p") as any;
      return (
        <Tag
          data-testid={
            color
              ? `typography-${color}`
              : variant
              ? `typography-${variant}`
              : "typography"
          }
        >
          {children}
        </Tag>
      );
    },
  };
});

jest.mock("../../../core/components/Button", () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("../../../core/components/Card", () => {
  const Card = ({ children }: any) => <div data-testid="card">{children}</div>;
  Card.Content = ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
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
      <RumorEditPage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("RumorEditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRumorId = "rumor-1";
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
    mockRumorContext = {
      rumors: [
        { id: "rumor-1", title: "The Golden Dragon Awakens" },
        { id: "rumor-2", title: "Missing Merchants" },
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
        screen.getByRole("heading", {
          level: 1,
          name: "Edit The Golden Dragon Awakens",
        })
      ).toBeInTheDocument();
    });

    it("asks a signed-out visitor to sign in to record a rumor, and never to select a group", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { name: /sign in to record a rumor/i })
      ).toBeInTheDocument();
      expect(screen.queryByText(/select a group/i)).not.toBeInTheDocument();
    });

    it("hides RumorForm while signed out", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByTestId("rumor-form")).not.toBeInTheDocument();
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
      expect(screen.queryByTestId("rumor-form")).not.toBeInTheDocument();
    });

    // Rewritten: bug #1423's redirect effect (`!isLoading && !user` ->
    // navigateToPage('/rumors')) is gone. A signed-out visitor now sees the
    // write-mode gated panel in place instead of being bounced to /rumors
    // before the page could say why -- see RumorEditPage.tsx's file header.
    it("does NOT redirect a signed-out visitor away from the page", () => {
      mockUser = null;
      renderPage();
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Rendering — rumor found
  // -------------------------------------------------------------------------
  describe("when rumor is found and context is ready", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders heading with the rumor title", () => {
      renderPage();
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Edit The Golden Dragon Awakens",
        })
      ).toBeInTheDocument();
    });

    it("renders RumorForm", () => {
      renderPage();
      expect(screen.getByTestId("rumor-form")).toBeInTheDocument();
    });

    it("passes the correct rumor to RumorForm", () => {
      renderPage();
      expect(screen.getByTestId("rumor-form-rumor-id")).toHaveTextContent(
        "rumor-1"
      );
      expect(screen.getByTestId("rumor-form-rumor-title")).toHaveTextContent(
        "The Golden Dragon Awakens"
      );
    });

    it("passes 'Edit Rumor' as the form title", () => {
      renderPage();
      expect(screen.getByTestId("rumor-form-title")).toHaveTextContent(
        "Edit Rumor"
      );
    });

    it("shows 'Back to Rumors' button", () => {
      renderPage();
      expect(screen.getByText("Back to Rumors")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Rumor not found
  // -------------------------------------------------------------------------
  describe("when rumor is not found by URL param", () => {
    beforeEach(() => {
      mockRumorId = "nonexistent-rumor";
    });

    it("shows 'Rumor not found' error", () => {
      renderPage();
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Rumor not found"
      );
    });

    it("does NOT render RumorForm with a rumor", () => {
      renderPage();
      expect(screen.queryByTestId("rumor-form")).not.toBeInTheDocument();
    });

    it("renders fallback heading 'Edit Rumor'", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit Rumor" })
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    beforeEach(() => {
      mockRumorContext = {
        ...mockRumorContext,
        isLoading: true,
        rumors: [],
      };
    });

    // Rewritten: `isLoading` now folds into the shared "resolving" state via
    // `usePageGate`; the page's own bare "Loading rumor data..." text and
    // spinner card are gone.
    it("shows a skeleton, not the page's own loading text", () => {
      renderPage();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
      expect(
        screen.queryByText("Loading rumor data...")
      ).not.toBeInTheDocument();
    });

    it("does NOT render RumorForm during loading", () => {
      renderPage();
      expect(screen.queryByTestId("rumor-form")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe("error state", () => {
    beforeEach(() => {
      mockRumorContext = {
        ...mockRumorContext,
        isLoading: false,
        error: "Firebase error",
        rumors: [],
      };
    });

    // Rewritten: the page's own inline "Error loading rumor data. Please try
    // again later." card is gone. `GatedContent` now owns the error panel and
    // names the noun and the real error message instead.
    it("shows the shared error panel, not the old inline copy", () => {
      renderPage();
      expect(
        screen.queryByText(
          "Error loading rumor data. Please try again later."
        )
      ).not.toBeInTheDocument();
      expect(screen.getByText(/couldn't load rumors/i)).toBeInTheDocument();
      expect(screen.getByText("Firebase error")).toBeInTheDocument();
    });

    it("does NOT render RumorForm on error", () => {
      renderPage();
      expect(screen.queryByTestId("rumor-form")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    it("navigates to /rumors on back button click", () => {
      renderPage();
      fireEvent.click(screen.getByText("Back to Rumors"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/rumors");
    });

    it("navigates to /rumors on form success", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("rumor-form-success"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/rumors");
    });

    it("navigates to /rumors on form cancel", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("rumor-form-cancel"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/rumors");
    });
  });
});
