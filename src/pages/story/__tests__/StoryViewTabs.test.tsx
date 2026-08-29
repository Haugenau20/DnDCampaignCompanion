// src/pages/story/__tests__/StoryViewTabs.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import StoryViewTabs from "../components/StoryViewTabs";

// ---------------------------------------------------------------------------
// react-router-dom mock — only useLocation is used by this component, and
// tests need to move it around freely without a real Router, so it's mocked
// directly rather than wrapped in a MemoryRouter.
// ---------------------------------------------------------------------------
let mockPathname = "/story/chapters";

jest.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: mockPathname }),
}));

const mockNavigateToPage = jest.fn();

jest.mock("shared/context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

function renderTabs() {
  return render(<StoryViewTabs />);
}

describe("StoryViewTabs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/story/chapters";
  });

  it("renders both segments", () => {
    renderTabs();
    expect(screen.getByText("Session chapters")).toBeInTheDocument();
    expect(screen.getByText("Campaign saga")).toBeInTheDocument();
  });

  it("renders real buttons for each segment", () => {
    renderTabs();
    expect(screen.getByText("Session chapters").closest("button")).not.toBeNull();
    expect(screen.getByText("Campaign saga").closest("button")).not.toBeNull();
  });

  describe("active segment", () => {
    it("marks 'Session chapters' current on /story/chapters", () => {
      mockPathname = "/story/chapters";
      renderTabs();
      expect(screen.getByText("Session chapters").closest("button")).toHaveAttribute(
        "aria-current",
        "page"
      );
      expect(screen.getByText("Campaign saga").closest("button")).not.toHaveAttribute(
        "aria-current"
      );
    });

    it("marks 'Session chapters' current on the bare /story index route", () => {
      mockPathname = "/story";
      renderTabs();
      expect(screen.getByText("Session chapters").closest("button")).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    it("marks 'Campaign saga' current on /story/saga", () => {
      mockPathname = "/story/saga";
      renderTabs();
      expect(screen.getByText("Campaign saga").closest("button")).toHaveAttribute(
        "aria-current",
        "page"
      );
      expect(screen.getByText("Session chapters").closest("button")).not.toHaveAttribute(
        "aria-current"
      );
    });
  });

  describe("navigation", () => {
    it("navigates to /story/chapters when 'Session chapters' is clicked", () => {
      mockPathname = "/story/saga";
      renderTabs();
      fireEvent.click(screen.getByText("Session chapters"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/chapters");
    });

    it("navigates to /story/saga when 'Campaign saga' is clicked", () => {
      mockPathname = "/story/chapters";
      renderTabs();
      fireEvent.click(screen.getByText("Campaign saga"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/saga");
    });
  });
});
