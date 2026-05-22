// src/pages/notes/__tests__/NotesPage.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotesPage from "../NotesPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => ({ pathname: "/notes", search: "", hash: "" }),
}));

// ---------------------------------------------------------------------------
// Context mocks
// ---------------------------------------------------------------------------
interface CampaignsMock {
  activeCampaignId: string | null;
  activeCampaign: { id: string; name: string } | null;
}

let mockCampaigns: CampaignsMock = {
  activeCampaignId: "campaign-1",
  activeCampaign: { id: "campaign-1", name: "The Fellowship" },
};

jest.mock("../../../context/firebase", () => ({
  useCampaigns: () => mockCampaigns,
}));

const mockCreateNote = jest.fn().mockResolvedValue("new-note-id");

jest.mock("../../../context/NoteContext", () => ({
  useNotes: () => ({
    createNote: mockCreateNote,
  }),
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
jest.mock("../../../components/features/notes/NotesList", () => ({
  __esModule: true,
  default: () => <div data-testid="notes-list" />,
}));

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

jest.mock("lucide-react", () => ({
  Plus: () => <span data-testid="plus-icon" />,
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<NotesPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("NotesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCampaigns = {
      activeCampaignId: "campaign-1",
      activeCampaign: { id: "campaign-1", name: "The Fellowship" },
    };
    mockCreateNote.mockResolvedValue("new-note-id");
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders the page heading 'My Notes'", () => {
      renderPage();
      expect(screen.getByTestId("typography-h2")).toHaveTextContent("My Notes");
    });

    it("renders NotesList", () => {
      renderPage();
      expect(screen.getByTestId("notes-list")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Campaign context display
  // -------------------------------------------------------------------------
  describe("campaign name display", () => {
    it("shows the active campaign name when a campaign is selected", () => {
      renderPage();
      expect(screen.getByText("The Fellowship")).toBeInTheDocument();
    });

    it("does NOT show campaign name when no campaign is selected", () => {
      mockCampaigns = { activeCampaignId: null, activeCampaign: null };
      renderPage();
      expect(screen.queryByText("The Fellowship")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // No campaign warning
  // -------------------------------------------------------------------------
  describe("no campaign selected", () => {
    beforeEach(() => {
      mockCampaigns = { activeCampaignId: null, activeCampaign: null };
    });

    it("shows the no-campaign warning message", () => {
      renderPage();
      expect(
        screen.getByText(
          "No campaign selected - select a campaign to view and create notes"
        )
      ).toBeInTheDocument();
    });

    it("does NOT show 'New Note' button when no campaign is active", () => {
      renderPage();
      expect(screen.queryByText("New Note")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Create note button
  // -------------------------------------------------------------------------
  describe("New Note button", () => {
    it("renders 'New Note' button when campaign is selected", () => {
      renderPage();
      expect(screen.getByText("New Note")).toBeInTheDocument();
    });

    it("calls createNote with default title and content on click", async () => {
      renderPage();
      fireEvent.click(screen.getByText("New Note"));
      await waitFor(() => {
        expect(mockCreateNote).toHaveBeenCalledWith("New Note", "");
      });
    });

    it("navigates to the new note's page after creation", async () => {
      renderPage();
      fireEvent.click(screen.getByText("New Note"));
      await waitFor(() => {
        expect(mockNavigateToPage).toHaveBeenCalledWith("/notes/new-note-id");
      });
    });

    it("does NOT navigate when no active campaign", async () => {
      mockCampaigns = { activeCampaignId: null, activeCampaign: null };
      renderPage();
      // Button is not rendered, so no navigation should happen
      expect(screen.queryByText("New Note")).not.toBeInTheDocument();
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
  });
});
