// src/pages/rumors/__tests__/RumorCreatePage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RumorCreatePage from "../RumorCreatePage";

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
    pathname: "/rumors/create",
  }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../../components/features/rumors/RumorForm", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="rumor-form">
      <span data-testid="rumor-form-initial-data">
        {JSON.stringify(props.initialData)}
      </span>
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
  return render(<RumorCreatePage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("RumorCreatePage", () => {
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

    it("renders breadcrumb with Rumors and Create labels", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent(
        "Rumors"
      );
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent(
        "Create"
      );
    });

    it("renders the page heading", () => {
      renderPage();
      expect(screen.getByTestId("typography-h2")).toHaveTextContent(
        "Create New Rumor"
      );
    });

    it("renders RumorForm", () => {
      renderPage();
      expect(screen.getByTestId("rumor-form")).toBeInTheDocument();
    });

    it("passes 'Create Rumor' as the form title", () => {
      renderPage();
      expect(screen.getByTestId("rumor-form-title")).toHaveTextContent(
        "Create Rumor"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Back button label
  // -------------------------------------------------------------------------
  describe("back button label", () => {
    it("shows 'Back to Rumors' when no noteId in state", () => {
      mockLocationState = {};
      renderPage();
      expect(screen.getByText("Back to Rumors")).toBeInTheDocument();
    });

    it("shows 'Back to Note' when noteId is in state", () => {
      mockLocationState = { noteId: "note-20" };
      renderPage();
      expect(screen.getByText("Back to Note")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // initialData derivation
  // RumorCreatePage maps initialData.description -> content, unlike NPC/Quest
  // -------------------------------------------------------------------------
  describe("initialData derivation", () => {
    it("passes undefined when no initialData in state", () => {
      mockLocationState = {};
      renderPage();
      const raw = screen.getByTestId("rumor-form-initial-data").textContent;
      expect(raw).toBe("");
    });

    it("maps initialData.description to content field for RumorForm", () => {
      mockLocationState = {
        initialData: {
          title: "Strange lights in the forest",
          description: "People have seen lights",
        },
        noteId: "note-3",
        entityId: "entity-7",
      };
      renderPage();
      const raw = screen.getByTestId("rumor-form-initial-data").textContent!;
      const parsed = JSON.parse(raw);
      expect(parsed.title).toBe("Strange lights in the forest");
      expect(parsed.content).toBe("People have seen lights");
      expect(parsed.noteId).toBe("note-3");
      expect(parsed.entityId).toBe("entity-7");
    });

    it("does NOT pass a description field (uses content instead)", () => {
      mockLocationState = {
        initialData: {
          title: "A rumor",
          description: "The description text",
        },
      };
      renderPage();
      const raw = screen.getByTestId("rumor-form-initial-data").textContent!;
      const parsed = JSON.parse(raw);
      // description should be mapped to content, not passed through as description
      expect(parsed.description).toBeUndefined();
      expect(parsed.content).toBe("The description text");
    });
  });

  // -------------------------------------------------------------------------
  // Navigation handlers
  // -------------------------------------------------------------------------
  describe("onSuccess navigation", () => {
    it("navigates to /rumors on form success", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("rumor-form-success"));
      expect(mockNavigate).toHaveBeenCalledWith("/rumors");
    });
  });

  describe("onCancel navigation", () => {
    it("navigates to /rumors on cancel when no noteId", () => {
      mockLocationState = {};
      renderPage();
      fireEvent.click(screen.getByTestId("rumor-form-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/rumors");
    });

    it("navigates to note page on cancel when noteId is present", () => {
      mockLocationState = { noteId: "note-66" };
      renderPage();
      fireEvent.click(screen.getByTestId("rumor-form-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/notes/note-66");
    });
  });
});
