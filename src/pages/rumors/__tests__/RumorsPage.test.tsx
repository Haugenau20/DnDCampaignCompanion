// src/pages/rumors/__tests__/RumorsPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RumorsPage from "../RumorsPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => ({ pathname: "/rumors", search: "", hash: "" }),
}));

// ---------------------------------------------------------------------------
// Context mocks
// ---------------------------------------------------------------------------
let mockUser: any = { uid: "user-1" };

jest.mock("@/features/user-management", () => ({
  useAuth: () => ({ user: mockUser }),
}));

interface RumorContextMock {
  rumors: any[];
  isLoading: boolean;
  error: string | null;
  combineRumors: jest.Mock;
  convertToQuest: jest.Mock;
}

let mockRumorContext: RumorContextMock = {
  rumors: [],
  isLoading: false,
  error: null,
  combineRumors: jest.fn(),
  convertToQuest: jest.fn(),
};

const mockNavigateToPage = jest.fn();

jest.mock("shared/hooks/useNavigation", () => ({
  useNavigation: () => ({
    navigateToPage: mockNavigateToPage,
    state: {},
  }),
}));

// ---------------------------------------------------------------------------
// Barrel mock: useRumors hook + child components consumed via the
// campaign-entities public API (RumorDirectory, CombineRumorsDialog,
// ConvertToQuestDialog). Dialog-dependent components are mocked inline
// (bug #150 — JSDOM portal limitation).
// ---------------------------------------------------------------------------
jest.mock("features/campaign-entities", () => ({
  useRumors: () => mockRumorContext,
  RumorDirectory: (props: any) => (
    <div data-testid="rumor-directory">
      <span data-testid="rumor-directory-count">{props.rumors?.length}</span>
    </div>
  ),
  CombineRumorsDialog: (props: any) => (
    <div data-testid="combine-rumors-dialog" data-open={props.open ? "true" : "false"}>
      <button data-testid="combine-dialog-close" onClick={props.onClose}>
        close
      </button>
    </div>
  ),
  ConvertToQuestDialog: (props: any) => (
    <div data-testid="convert-quest-dialog" data-open={props.open ? "true" : "false"}>
      <button data-testid="convert-dialog-close" onClick={props.onClose}>
        close
      </button>
    </div>
  ),
}));

jest.mock("../../../core/components/Typography", () => ({
  __esModule: true,
  default: ({ children, variant, color }: any) => {
    const testId = variant
      ? `typography-${variant}`
      : color
      ? `typography-${color}`
      : "typography";
    return <div data-testid={testId}>{children}</div>;
  },
}));

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
  MessageSquare: () => <span data-testid="message-square-icon" />,
  XCircle: () => <span data-testid="x-circle-icon" />,
  HelpCircle: () => <span data-testid="help-circle-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
  CheckCircle2: () => <span data-testid="check-circle-icon" />,
}));

// ---------------------------------------------------------------------------
// Sample rumor data
// ---------------------------------------------------------------------------
const sampleRumors = [
  { id: "r1", title: "The Dragon Returns", status: "confirmed" },
  { id: "r2", title: "Missing Merchant", status: "unconfirmed" },
  { id: "r3", title: "Haunted Mill", status: "unconfirmed" },
  { id: "r4", title: "False Prophecy", status: "false" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<RumorsPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("RumorsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: "user-1" };
    mockRumorContext = {
      rumors: [...sampleRumors],
      isLoading: false,
      error: null,
      combineRumors: jest.fn(),
      convertToQuest: jest.fn(),
    };
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    beforeEach(() => {
      mockRumorContext = { ...mockRumorContext, isLoading: true };
    });

    it("renders loading indicator", () => {
      renderPage();
      expect(screen.getByText("Loading rumors...")).toBeInTheDocument();
    });

    it("does NOT render rumor directory while loading", () => {
      renderPage();
      expect(screen.queryByTestId("rumor-directory")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe("error state", () => {
    beforeEach(() => {
      mockRumorContext = { ...mockRumorContext, error: "Firebase error" };
    });

    it("renders error message", () => {
      renderPage();
      expect(
        screen.getByText("Error Loading Rumors. Sign in to view content.")
      ).toBeInTheDocument();
    });

    it("does NOT render rumor directory on error", () => {
      renderPage();
      expect(screen.queryByTestId("rumor-directory")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loaded state
  // -------------------------------------------------------------------------
  describe("loaded state", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders the page heading 'Rumors'", () => {
      renderPage();
      expect(screen.getByTestId("typography-h1")).toHaveTextContent("Rumors");
    });

    it("renders the rumor directory", () => {
      renderPage();
      expect(screen.getByTestId("rumor-directory")).toBeInTheDocument();
    });

    it("passes all rumors to the directory", () => {
      renderPage();
      expect(screen.getByTestId("rumor-directory-count")).toHaveTextContent("4");
    });
  });

  // -------------------------------------------------------------------------
  // Create button
  // -------------------------------------------------------------------------
  describe("Add Rumor button", () => {
    it("renders 'Add Rumor' button when user is authenticated", () => {
      renderPage();
      expect(screen.getByText("Add Rumor")).toBeInTheDocument();
    });

    it("navigates to /rumors/create on click", () => {
      renderPage();
      fireEvent.click(screen.getByText("Add Rumor"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/rumors/create");
    });

    it("does NOT render 'Add Rumor' button when user is not authenticated", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByText("Add Rumor")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Dialogs: RumorsPage no longer owns a batch-actions flow. The working
  // combine/convert flow lives in RumorDirectory -> RumorBatchActions, which
  // renders its own CombineRumorsDialog/ConvertToQuestDialog instances. The
  // copies formerly rendered directly by RumorsPage were unreachable dead
  // code (none of their controlling setters was ever called) and were
  // removed; assert they are gone rather than present.
  // -------------------------------------------------------------------------
  describe("dialogs", () => {
    it("does NOT render its own CombineRumorsDialog", () => {
      renderPage();
      expect(
        screen.queryByTestId("combine-rumors-dialog")
      ).not.toBeInTheDocument();
    });

    it("does NOT render its own ConvertToQuestDialog", () => {
      renderPage();
      expect(
        screen.queryByTestId("convert-quest-dialog")
      ).not.toBeInTheDocument();
    });
  });
});
