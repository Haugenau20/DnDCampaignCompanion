// src/pages/npcs/__tests__/NPCsEditPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import NPCsEditPage from "../NPCsEditPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
let mockNpcId: string | undefined = "npc-1";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ npcId: mockNpcId }),
}));

// ---------------------------------------------------------------------------
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("../../../context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

const mockNPCsList = [
  { id: "npc-1", name: "Gandalf" },
  { id: "npc-2", name: "Saruman" },
];
let mockNPCDataReturn = { npcs: mockNPCsList };

jest.mock("../../../hooks/useNPCData", () => ({
  useNPCData: () => mockNPCDataReturn,
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../../components/features/npcs/NPCEditForm", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="npc-edit-form">
      <span data-testid="edit-form-npc-id">{props.npc?.id}</span>
      <span data-testid="edit-form-npc-name">{props.npc?.name}</span>
      <button data-testid="edit-form-success" onClick={props.onSuccess}>
        success
      </button>
      <button data-testid="edit-form-cancel" onClick={props.onCancel}>
        cancel
      </button>
    </div>
  ),
}));

jest.mock("../../../components/core/Typography", () => ({
  __esModule: true,
  default: ({ children, color }: any) => (
    <div data-testid={color ? `typography-${color}` : "typography"}>{children}</div>
  ),
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
  ArrowLeft: () => <span data-testid="arrow-left" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<NPCsEditPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("NPCsEditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNpcId = "npc-1";
    mockNPCDataReturn = { npcs: mockNPCsList };
  });

  // -------------------------------------------------------------------------
  // Rendering — NPC found
  // -------------------------------------------------------------------------
  describe("when NPC is found", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders the heading with the NPC name", () => {
      renderPage();
      expect(screen.getByTestId("typography")).toHaveTextContent(
        "Edit Gandalf"
      );
    });

    it("renders NPCEditForm", () => {
      renderPage();
      expect(screen.getByTestId("npc-edit-form")).toBeInTheDocument();
    });

    it("passes the correct NPC to NPCEditForm", () => {
      renderPage();
      expect(screen.getByTestId("edit-form-npc-id")).toHaveTextContent("npc-1");
      expect(screen.getByTestId("edit-form-npc-name")).toHaveTextContent(
        "Gandalf"
      );
    });

    it("shows 'Back to NPCs' button", () => {
      renderPage();
      expect(screen.getByText("Back to NPCs")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Rendering — NPC not found
  // -------------------------------------------------------------------------
  describe("when NPC is not found", () => {
    beforeEach(() => {
      mockNpcId = "nonexistent-npc";
    });

    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("shows 'NPC not found' error message", () => {
      renderPage();
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "NPC not found"
      );
    });

    it("does NOT render NPCEditForm", () => {
      renderPage();
      expect(screen.queryByTestId("npc-edit-form")).not.toBeInTheDocument();
    });

    it("renders fallback heading 'Edit NPC' when NPC is not found", () => {
      renderPage();
      expect(screen.getByTestId("typography")).toHaveTextContent("Edit NPC");
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    it("navigates to /npcs when back button is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByText("Back to NPCs"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/npcs");
    });

    it("navigates to /npcs on form success", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("edit-form-success"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/npcs");
    });

    it("navigates to /npcs on form cancel", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("edit-form-cancel"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/npcs");
    });
  });
});
