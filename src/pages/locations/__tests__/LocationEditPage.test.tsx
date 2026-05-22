// src/pages/locations/__tests__/LocationEditPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("../../../context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

interface LocationContextMock {
  locations: any[];
  isLoading: boolean;
  error: string | null;
  hasRequiredContext: boolean;
}

let mockLocationContext: LocationContextMock = {
  locations: [
    { id: "loc-1", name: "Rivendell" },
    { id: "loc-2", name: "Moria" },
  ],
  isLoading: false,
  error: null,
  hasRequiredContext: true,
};

jest.mock("../../../context/LocationContext", () => ({
  useLocations: () => mockLocationContext,
}));

jest.mock("../../../context/firebase", () => ({
  useAuth: () => ({ user: { uid: "user-1" } }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock(
  "../../../components/features/locations/LocationEditForm",
  () => ({
    __esModule: true,
    default: (props: any) => (
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
  })
);

jest.mock("../../../components/core/Typography", () => ({
  __esModule: true,
  default: ({ children, color, variant }: any) => (
    <div
      data-testid={
        color
          ? `typography-${color}`
          : variant
          ? `typography-${variant}`
          : "typography"
      }
    >
      {children}
    </div>
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
  Card.Content = ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  );
  return { __esModule: true, default: Card };
});

jest.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
  Loader2: () => <span data-testid="loader" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<LocationEditPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("LocationEditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationId = "loc-1";
    mockLocationContext = {
      locations: [
        { id: "loc-1", name: "Rivendell" },
        { id: "loc-2", name: "Moria" },
      ],
      isLoading: false,
      error: null,
      hasRequiredContext: true,
    };
  });

  // -------------------------------------------------------------------------
  // Rendering — location found
  // -------------------------------------------------------------------------
  describe("when location is found and context is ready", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders heading with location name", () => {
      renderPage();
      // Typography variant="h1" produces data-testid="typography-h1"
      expect(screen.getByTestId("typography-h1")).toHaveTextContent(
        "Edit Rivendell"
      );
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
      // The heading uses variant="h1" so it renders as typography-h1
      expect(screen.getByTestId("typography-h1")).toHaveTextContent(
        "Edit Location"
      );
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

    it("renders loading indicator", () => {
      renderPage();
      expect(screen.getByText("Loading location data...")).toBeInTheDocument();
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

    it("renders error message", () => {
      renderPage();
      expect(
        screen.getByText(
          "Error Loading Location Data. Please try again later."
        )
      ).toBeInTheDocument();
    });

    it("does NOT render LocationEditForm on error", () => {
      renderPage();
      expect(
        screen.queryByTestId("location-edit-form")
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // No context guard
  // -------------------------------------------------------------------------
  describe("when hasRequiredContext is false", () => {
    beforeEach(() => {
      mockLocationContext = {
        ...mockLocationContext,
        hasRequiredContext: false,
      };
    });

    it("renders 'No Active Group or Campaign' message", () => {
      renderPage();
      expect(
        screen.getByText("No Active Group or Campaign")
      ).toBeInTheDocument();
    });

    it("does NOT render LocationEditForm", () => {
      renderPage();
      expect(
        screen.queryByTestId("location-edit-form")
      ).not.toBeInTheDocument();
    });

    it("renders 'Back to Locations' button in context-guard view", () => {
      renderPage();
      expect(screen.getByText("Back to Locations")).toBeInTheDocument();
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
