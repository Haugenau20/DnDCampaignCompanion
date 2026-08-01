// src/pages/locations/__tests__/LocationsPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LocationsPage from "../LocationsPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => ({ pathname: "/locations", search: "", hash: "" }),
}));

// ---------------------------------------------------------------------------
// Context mocks
// ---------------------------------------------------------------------------
let mockUser: any = { uid: "user-1" };

jest.mock("@/features/user-management", () => ({
  useAuth: () => ({ user: mockUser }),
}));

interface LocationContextMock {
  locations: any[];
  isLoading: boolean;
  error: string | null;
  hasRequiredContext: boolean;
}

let mockLocationContext: LocationContextMock = {
  locations: [],
  isLoading: false,
  error: null,
  hasRequiredContext: true,
};

jest.mock("features/campaign-entities", () => ({
  useLocations: () => mockLocationContext,
  LocationDirectory: (props: any) => (
    <div data-testid="location-directory">
      <span data-testid="location-directory-count">
        {props.locations?.length}
      </span>
    </div>
  ),
}));

const mockNavigateToPage = jest.fn();

jest.mock("shared/context/NavigationContext", () => ({
  useNavigation: () => ({
    navigateToPage: mockNavigateToPage,
    state: {},
  }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------

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
  Map: () => <span data-testid="map-icon" />,
  MapPin: () => <span data-testid="map-pin-icon" />,
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eye-off-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
}));

// ---------------------------------------------------------------------------
// Sample location data
// ---------------------------------------------------------------------------
const sampleLocations = [
  { id: "loc-1", name: "Rivendell", status: "explored" },
  { id: "loc-2", name: "Moria", status: "visited" },
  { id: "loc-3", name: "Mordor", status: "known" },
  { id: "loc-4", name: "Lothlórien", status: "explored" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<LocationsPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("LocationsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: "user-1" };
    mockLocationContext = {
      locations: [...sampleLocations],
      isLoading: false,
      error: null,
      hasRequiredContext: true,
    };
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    beforeEach(() => {
      mockLocationContext = { ...mockLocationContext, isLoading: true };
    });

    it("renders loading indicator", () => {
      renderPage();
      expect(screen.getByText("Loading locations...")).toBeInTheDocument();
    });

    it("does NOT render location directory while loading", () => {
      renderPage();
      expect(
        screen.queryByTestId("location-directory")
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe("error state", () => {
    beforeEach(() => {
      mockLocationContext = { ...mockLocationContext, error: "Firebase error" };
    });

    it("renders error message", () => {
      renderPage();
      expect(
        screen.getByText("Error Loading Locations. Sign in to view content.")
      ).toBeInTheDocument();
    });

    it("does NOT render location directory on error", () => {
      renderPage();
      expect(
        screen.queryByTestId("location-directory")
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // No context state
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

    it("does NOT render location directory", () => {
      renderPage();
      expect(
        screen.queryByTestId("location-directory")
      ).not.toBeInTheDocument();
    });

    it("renders 'Select Group & Campaign' button when user is authenticated", () => {
      renderPage();
      expect(screen.getByText("Select Group & Campaign")).toBeInTheDocument();
    });

    it("does NOT render 'Select Group & Campaign' button when user is not authenticated", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.queryByText("Select Group & Campaign")
      ).not.toBeInTheDocument();
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

    it("renders the page heading 'Locations'", () => {
      renderPage();
      expect(screen.getByTestId("typography-h1")).toHaveTextContent(
        "Locations"
      );
    });

    it("renders the location directory", () => {
      renderPage();
      expect(screen.getByTestId("location-directory")).toBeInTheDocument();
    });

    it("passes all locations to the directory", () => {
      renderPage();
      expect(
        screen.getByTestId("location-directory-count")
      ).toHaveTextContent("4");
    });
  });

  // -------------------------------------------------------------------------
  // Create button
  // -------------------------------------------------------------------------
  describe("Add Location button", () => {
    it("renders 'Add Location' button when user is authenticated and context is ready", () => {
      renderPage();
      expect(screen.getByText("Add Location")).toBeInTheDocument();
    });

    it("navigates to /locations/create on click", () => {
      renderPage();
      fireEvent.click(screen.getByText("Add Location"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/locations/create");
    });

    it("does NOT render 'Add Location' button when user is not authenticated", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByText("Add Location")).not.toBeInTheDocument();
    });

    it("does NOT render 'Add Location' button when context is not ready", () => {
      mockLocationContext = {
        ...mockLocationContext,
        hasRequiredContext: false,
      };
      renderPage();
      // In the no-context guard screen (not the main layout), there is no Add Location button
      expect(screen.queryByText("Add Location")).not.toBeInTheDocument();
    });
  });
});
