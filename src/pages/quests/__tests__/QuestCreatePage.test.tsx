// src/pages/quests/__tests__/QuestCreatePage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import QuestCreatePage from "../QuestCreatePage";

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
    pathname: "/quests/create",
  }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../../components/features/quests/QuestCreateForm", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="quest-create-form">
      <span data-testid="quest-form-initial-data">
        {JSON.stringify(props.initialData)}
      </span>
      <button data-testid="quest-form-success" onClick={props.onSuccess}>
        success
      </button>
      <button data-testid="quest-form-cancel" onClick={props.onCancel}>
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
  return render(<QuestCreatePage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("QuestCreatePage", () => {
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

    it("renders breadcrumb with Quests and Create labels", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent(
        "Quests"
      );
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent(
        "Create"
      );
    });

    it("renders the page heading", () => {
      renderPage();
      expect(screen.getByTestId("typography-h2")).toHaveTextContent(
        "Create New Quest"
      );
    });

    it("renders the QuestCreateForm", () => {
      renderPage();
      expect(screen.getByTestId("quest-create-form")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Back button label
  // -------------------------------------------------------------------------
  describe("back button label", () => {
    it("shows 'Back to Quests' when no noteId in state", () => {
      mockLocationState = {};
      renderPage();
      expect(screen.getByText("Back to Quests")).toBeInTheDocument();
    });

    it("shows 'Back to Note' when noteId is in state", () => {
      mockLocationState = { noteId: "note-10" };
      renderPage();
      expect(screen.getByText("Back to Note")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // initialData derivation
  // -------------------------------------------------------------------------
  describe("initialData derivation", () => {
    it("passes undefined when no initialData in state", () => {
      mockLocationState = {};
      renderPage();
      const raw = screen.getByTestId("quest-form-initial-data").textContent;
      expect(raw).toBe("");
    });

    it("merges initialData, noteId, entityId into formInitialData", () => {
      mockLocationState = {
        initialData: { title: "Rescue the Princess", description: "..." },
        noteId: "note-5",
        entityId: "entity-9",
      };
      renderPage();
      const raw = screen.getByTestId("quest-form-initial-data").textContent!;
      const parsed = JSON.parse(raw);
      expect(parsed.title).toBe("Rescue the Princess");
      expect(parsed.noteId).toBe("note-5");
      expect(parsed.entityId).toBe("entity-9");
    });
  });

  // -------------------------------------------------------------------------
  // Navigation handlers
  // -------------------------------------------------------------------------
  describe("onSuccess navigation", () => {
    it("navigates to /quests on form success", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("quest-form-success"));
      expect(mockNavigate).toHaveBeenCalledWith("/quests");
    });
  });

  describe("onCancel navigation", () => {
    it("navigates to /quests on cancel when no noteId", () => {
      mockLocationState = {};
      renderPage();
      fireEvent.click(screen.getByTestId("quest-form-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/quests");
    });

    it("navigates to note page on cancel when noteId is present", () => {
      mockLocationState = { noteId: "note-77" };
      renderPage();
      fireEvent.click(screen.getByTestId("quest-form-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/notes/note-77");
    });
  });
});
