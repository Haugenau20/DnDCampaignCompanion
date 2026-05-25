// src/pages/locations/__tests__/LocationCreatePage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock(
  "../../../components/features/locations/LocationCreateForm",
  () => ({
    __esModule: true,
    default: (props: any) => (
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
  })
);

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
  return render(<LocationCreatePage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("LocationCreatePage", () => {
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

    it("renders breadcrumb with Locations and Create labels", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent(
        "Locations"
      );
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent(
        "Create"
      );
    });

    it("renders the page heading", () => {
      renderPage();
      expect(screen.getByTestId("typography-h2")).toHaveTextContent(
        "Create New Location"
      );
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
  // Bug note: LocationCreatePage always passes an object (never undefined) —
  // even with empty state it passes `{ noteId: undefined, entityId: undefined }`
  // This differs from NPC/Quest/Rumor CreatePages which conditionally pass initialData.
  // See bug #750 for details.
  // -------------------------------------------------------------------------
  describe("initialData derivation", () => {
    it("always passes an object (possibly with undefined fields) when no state", () => {
      mockLocationState = {};
      renderPage();
      const raw = screen.getByTestId("location-form-initial-data").textContent!;
      // The component spreads `{ ...initialData, noteId, entityId }` unconditionally
      // so the form always receives an object (not undefined)
      const parsed = JSON.parse(raw);
      expect(typeof parsed).toBe("object");
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
