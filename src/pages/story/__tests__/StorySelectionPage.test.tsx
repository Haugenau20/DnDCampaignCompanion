// src/pages/story/__tests__/StorySelectionPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import StorySelectionPage from "../StorySelectionPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks (no router hooks used in StorySelectionPage directly)
// ---------------------------------------------------------------------------
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
}));

// ---------------------------------------------------------------------------
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("../../../context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../../components/core/Typography", () => ({
  __esModule: true,
  default: ({ children, variant, color }: any) => (
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

jest.mock("../../../components/core/Card", () => {
  const Card = ({ children, onClick, hoverable }: any) => (
    <div
      data-testid="card"
      onClick={onClick}
      data-hoverable={String(!!hoverable)}
    >
      {children}
    </div>
  );
  Card.Content = ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  );
  return { __esModule: true, default: Card };
});

jest.mock("lucide-react", () => ({
  ScrollText: () => <span data-testid="scroll-text-icon" />,
  BookOpen: () => <span data-testid="book-open-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<StorySelectionPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("StorySelectionPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders the page title 'Campaign Chronicles'", () => {
      renderPage();
      expect(screen.getByTestId("typography-h1")).toHaveTextContent(
        "Campaign Chronicles"
      );
    });

    it("renders the page subtitle", () => {
      renderPage();
      // Typography has variant="body-lg" AND color="secondary"; mock prioritizes color
      // so it renders as typography-secondary
      expect(
        screen.getByText(
          "Choose how you want to experience your campaign's story"
        )
      ).toBeInTheDocument();
    });

    it("renders 'Session Chapters' card heading", () => {
      renderPage();
      // There are two h2 typography elements - get all
      const headings = screen.getAllByTestId("typography-h2");
      const sessionHeading = headings.find((el) =>
        el.textContent?.includes("Session Chapters")
      );
      expect(sessionHeading).toBeInTheDocument();
    });

    it("renders 'Campaign Saga' card heading", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h2");
      const sagaHeading = headings.find((el) =>
        el.textContent?.includes("Campaign Saga")
      );
      expect(sagaHeading).toBeInTheDocument();
    });

    it("renders two hoverable cards", () => {
      renderPage();
      const cards = screen.getAllByTestId("card");
      // The outer container is not a card, just the two story-selection cards
      const hoverableCards = cards.filter(
        (c) => c.getAttribute("data-hoverable") === "true"
      );
      expect(hoverableCards).toHaveLength(2);
    });

    it("renders ScrollText icon", () => {
      renderPage();
      expect(screen.getByTestId("scroll-text-icon")).toBeInTheDocument();
    });

    it("renders BookOpen icon", () => {
      renderPage();
      expect(screen.getByTestId("book-open-icon")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    it("navigates to /story/chapters when Session Chapters card is clicked", () => {
      renderPage();
      const cards = screen.getAllByTestId("card");
      const chaptersCard = cards.find((c) =>
        c.textContent?.includes("Session Chapters")
      );
      expect(chaptersCard).toBeTruthy();
      fireEvent.click(chaptersCard!);
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/chapters");
    });

    it("navigates to /story/saga when Campaign Saga card is clicked", () => {
      renderPage();
      const cards = screen.getAllByTestId("card");
      const sagaCard = cards.find((c) =>
        c.textContent?.includes("Campaign Saga")
      );
      expect(sagaCard).toBeTruthy();
      fireEvent.click(sagaCard!);
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/saga");
    });
  });

  // -------------------------------------------------------------------------
  // Card descriptions
  // -------------------------------------------------------------------------
  describe("card descriptions", () => {
    it("displays description for Session Chapters", () => {
      renderPage();
      expect(
        screen.getByText(/Relive your adventures as they happened/i)
      ).toBeInTheDocument();
    });

    it("displays description for Campaign Saga", () => {
      renderPage();
      expect(
        screen.getByText(/Experience your campaign as one continuous epic tale/i)
      ).toBeInTheDocument();
    });
  });
});
