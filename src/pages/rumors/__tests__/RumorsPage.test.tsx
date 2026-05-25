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

jest.mock("../../../context/firebase", () => ({
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

jest.mock("../../../context/RumorContext", () => ({
  useRumors: () => mockRumorContext,
}));

const mockNavigateToPage = jest.fn();

jest.mock("../../../hooks/useNavigation", () => ({
  useNavigation: () => ({
    navigateToPage: mockNavigateToPage,
    state: {},
  }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../../components/features/rumors/RumorDirectory", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="rumor-directory">
      <span data-testid="rumor-directory-count">{props.rumors?.length}</span>
    </div>
  ),
}));

// Mock Dialog-dependent components (bug #150 — JSDOM portal limitation)
jest.mock(
  "../../../components/features/rumors/CombineRumorsDialog",
  () => ({
    __esModule: true,
    default: (props: any) => (
      <div data-testid="combine-rumors-dialog" data-open={props.open ? "true" : "false"}>
        <button data-testid="combine-dialog-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ),
  })
);

jest.mock(
  "../../../components/features/rumors/ConvertToQuestDialog",
  () => ({
    __esModule: true,
    default: (props: any) => (
      <div data-testid="convert-quest-dialog" data-open={props.open ? "true" : "false"}>
        <button data-testid="convert-dialog-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ),
  })
);

jest.mock("../../../components/core/Typography", () => ({
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

jest.mock("../../../components/core/Button", () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("../../../components/core/Card", () => {
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
  // Statistics
  // -------------------------------------------------------------------------
  describe("statistics calculation", () => {
    it("correctly counts total, confirmed, unconfirmed, and false rumors", () => {
      renderPage();
      const h2s = screen.getAllByTestId("typography-h2");
      // sampleRumors: total=4, confirmed=1, unconfirmed=2, false=1
      expect(h2s[0]).toHaveTextContent("4"); // total
      expect(h2s[1]).toHaveTextContent("1"); // confirmed
      expect(h2s[2]).toHaveTextContent("2"); // unconfirmed
      expect(h2s[3]).toHaveTextContent("1"); // false
    });

    it("shows zeros for all stats when rumors list is empty", () => {
      mockRumorContext = { ...mockRumorContext, rumors: [] };
      renderPage();
      const h2s = screen.getAllByTestId("typography-h2");
      h2s.forEach((el) => expect(el).toHaveTextContent("0"));
    });

    it("shows stat labels: Total Rumors, Confirmed, Unconfirmed, False", () => {
      renderPage();
      expect(screen.getByText("Total Rumors")).toBeInTheDocument();
      expect(screen.getByText("Confirmed")).toBeInTheDocument();
      expect(screen.getByText("Unconfirmed")).toBeInTheDocument();
      expect(screen.getByText("False")).toBeInTheDocument();
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
  // Dialogs initial state
  // -------------------------------------------------------------------------
  describe("dialogs", () => {
    it("renders CombineRumorsDialog as closed by default", () => {
      renderPage();
      expect(screen.getByTestId("combine-rumors-dialog")).toHaveAttribute(
        "data-open",
        "false"
      );
    });

    it("renders ConvertToQuestDialog as closed by default", () => {
      renderPage();
      expect(screen.getByTestId("convert-quest-dialog")).toHaveAttribute(
        "data-open",
        "false"
      );
    });
  });
});
