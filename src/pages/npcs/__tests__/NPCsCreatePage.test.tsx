// src/pages/npcs/__tests__/NPCsCreatePage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import NPCsCreatePage from "../NPCsCreatePage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();
let mockLocationState: Record<string, any> = {};

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: mockLocationState, pathname: "/npcs/create" }),
}));

// ---------------------------------------------------------------------------
// Context mocks
// ---------------------------------------------------------------------------
const mockNPCs = [{ id: "npc-1", name: "Gandalf" }];

jest.mock("../../../context/NPCContext", () => ({
  useNPCs: () => ({ npcs: mockNPCs }),
}));

// ---------------------------------------------------------------------------
// Child component mocks — keep tests focused on page orchestration
// ---------------------------------------------------------------------------
jest.mock("../../../components/features/npcs/NPCForm", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="npc-form">
      <span data-testid="npc-form-initial-data">
        {JSON.stringify(props.initialData)}
      </span>
      <span data-testid="npc-form-existing-npcs">
        {JSON.stringify(props.existingNPCs)}
      </span>
      <button data-testid="npc-form-success" onClick={props.onSuccess}>
        success
      </button>
      <button data-testid="npc-form-cancel" onClick={props.onCancel}>
        cancel
      </button>
    </div>
  ),
}));

jest.mock("../../../components/layout/Breadcrumb", () => ({
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

jest.mock("../../../components/core/Typography", () => ({
  __esModule: true,
  default: ({ children, variant }: any) => (
    <div data-testid={`typography-${variant ?? "default"}`}>{children}</div>
  ),
}));

jest.mock("../../../components/core/Button", () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<NPCsCreatePage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("NPCsCreatePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationState = {};
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders breadcrumb with NPCs and Create labels", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent("NPCs");
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent(
        "Create"
      );
    });

    it("renders the page heading", () => {
      renderPage();
      expect(screen.getByTestId("typography-h2")).toHaveTextContent(
        "Create New NPC"
      );
    });

    it("renders the NPCForm", () => {
      renderPage();
      expect(screen.getByTestId("npc-form")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Back button label
  // -------------------------------------------------------------------------
  describe("back button label", () => {
    it("shows 'Back to NPCs' when there is no noteId in location state", () => {
      mockLocationState = {};
      renderPage();
      expect(screen.getByText("Back to NPCs")).toBeInTheDocument();
    });

    it("shows 'Back to Note' when noteId is present in location state", () => {
      mockLocationState = { noteId: "note-42" };
      renderPage();
      expect(screen.getByText("Back to Note")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Initial data derivation
  // -------------------------------------------------------------------------
  describe("initialData derivation", () => {
    it("passes undefined to NPCForm.initialData when location.state has no initialData", () => {
      mockLocationState = {};
      renderPage();
      const raw = screen.getByTestId("npc-form-initial-data").textContent;
      expect(raw).toBe(""); // JSON.stringify(undefined) === undefined → renders as ""
    });

    it("merges initialData, noteId and entityId into formInitialData", () => {
      mockLocationState = {
        initialData: { name: "Elrond", description: "Elf lord" },
        noteId: "note-7",
        entityId: "entity-3",
      };
      renderPage();
      const raw = screen.getByTestId("npc-form-initial-data").textContent!;
      const parsed = JSON.parse(raw);
      expect(parsed.name).toBe("Elrond");
      expect(parsed.noteId).toBe("note-7");
      expect(parsed.entityId).toBe("entity-3");
    });

    it("passes existing NPCs from context to NPCForm", () => {
      renderPage();
      const raw = screen.getByTestId("npc-form-existing-npcs").textContent!;
      const parsed = JSON.parse(raw);
      expect(parsed).toEqual(mockNPCs);
    });
  });

  // -------------------------------------------------------------------------
  // Navigation handlers
  // -------------------------------------------------------------------------
  describe("onSuccess navigation", () => {
    it("navigates to /npcs on form success", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("npc-form-success"));
      expect(mockNavigate).toHaveBeenCalledWith("/npcs");
    });
  });

  describe("onCancel navigation", () => {
    it("navigates to /npcs on cancel when no noteId", () => {
      mockLocationState = {};
      renderPage();
      fireEvent.click(screen.getByTestId("npc-form-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/npcs");
    });

    it("navigates to the note page on cancel when noteId is present", () => {
      mockLocationState = { noteId: "note-99" };
      renderPage();
      fireEvent.click(screen.getByTestId("npc-form-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/notes/note-99");
    });
  });
});
