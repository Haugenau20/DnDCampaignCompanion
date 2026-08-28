// src/pages/story/__tests__/ResumeBar.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ResumeBar from "../components/ResumeBar";
import type { StorySummary } from "features/storytelling/chapters/utils/chapter-progress";

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("core/components/Typography", () => ({
  __esModule: true,
  default: ({ children, variant, color, className }: any) => (
    <div
      data-testid={color ? `typography-${color}` : `typography-${variant || "body"}`}
      className={className}
    >
      {children}
    </div>
  ),
}));

jest.mock("core/components/Button", () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <button
      data-testid={`button-${String(children).trim().replace(/\s+/g, "-").toLowerCase()}`}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CHAPTER = (order: number, title: string) =>
  ({
    chapter: { id: `chapter-${order}`, order, title },
    state: "reading" as const,
    percentRead: 40,
    isCurrent: true,
  } as unknown as StorySummary["current"]);

const baseSummary = (overrides: Partial<StorySummary> = {}): StorySummary => ({
  total: 39,
  read: 8,
  remaining: 31,
  percentComplete: 21,
  current: null,
  resumeChapterId: null,
  resumePosition: 0,
  hasStarted: false,
  ...overrides,
});

const mockOnResume = jest.fn();

function renderBar(summary: StorySummary) {
  return render(<ResumeBar summary={summary} onResume={mockOnResume} />);
}

describe("ResumeBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("empty campaign", () => {
    it("renders nothing when total is 0", () => {
      const { container } = renderBar(baseSummary({ total: 0, hasStarted: false }));
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("not started", () => {
    it("shows 'Start reading' heading", () => {
      renderBar(baseSummary({ hasStarted: false, resumeChapterId: "chapter-1" }));
      expect(screen.getByTestId("typography-h4")).toHaveTextContent("Start reading");
    });

    it("subtitle names chapter 1", () => {
      renderBar(baseSummary({ hasStarted: false, resumeChapterId: "chapter-1" }));
      expect(screen.getByText(/Chapter 1/)).toBeInTheDocument();
    });

    it("does NOT render a progress bar", () => {
      renderBar(baseSummary({ hasStarted: false, resumeChapterId: "chapter-1" }));
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("primary button reads 'Start reading' and calls onResume with the fallback chapter", () => {
      renderBar(baseSummary({ hasStarted: false, resumeChapterId: "chapter-1", resumePosition: 0 }));
      fireEvent.click(screen.getByTestId("button-start-reading"));
      expect(mockOnResume).toHaveBeenCalledWith("chapter-1", 0);
    });
  });

  describe("started, with a current chapter", () => {
    const summary = baseSummary({
      hasStarted: true,
      current: CHAPTER(9, "The Hard Choice"),
      resumeChapterId: "chapter-9",
      resumePosition: 62,
      read: 8,
      remaining: 31,
      percentComplete: 21,
    });

    it("shows the CONTINUE READING eyebrow", () => {
      renderBar(summary);
      expect(screen.getByText(/continue reading/i)).toBeInTheDocument();
    });

    it("shows the current chapter's number and title", () => {
      renderBar(summary);
      expect(screen.getByText(/Chapter 9: The Hard Choice/)).toBeInTheDocument();
    });

    it("renders a campaign-wide progress bar reflecting percentComplete", () => {
      renderBar(summary);
      const bar = screen.getByRole("progressbar");
      expect(bar).toHaveAttribute("aria-valuenow", "21");
    });

    it("builds the caption from read/remaining/resumePosition", () => {
      renderBar(summary);
      expect(
        screen.getByText("8 chapters read · 31 to go · you stopped 62% through")
      ).toBeInTheDocument();
    });

    it("omits the 'stopped through' clause when resumePosition is 0", () => {
      renderBar({ ...summary, resumePosition: 0 });
      expect(screen.getByText("8 chapters read · 31 to go")).toBeInTheDocument();
    });

    it("uses singular 'chapter' when read is 1", () => {
      renderBar({ ...summary, read: 1, remaining: 38 });
      expect(screen.getByText(/^1 chapter read/)).toBeInTheDocument();
    });

    it("calls onResume with resumeChapterId and resumePosition on click", () => {
      renderBar(summary);
      fireEvent.click(screen.getByTestId("button-resume"));
      expect(mockOnResume).toHaveBeenCalledWith("chapter-9", 62);
    });
  });

  describe("started, without a current chapter (partial-read fallback)", () => {
    it("falls back to a generic heading instead of fabricating a title", () => {
      renderBar(
        baseSummary({
          hasStarted: true,
          current: null,
          resumeChapterId: "chapter-3",
          resumePosition: 15,
          read: 0,
          remaining: 39,
        })
      );
      expect(screen.getByText(/continue where you left off/i)).toBeInTheDocument();
    });
  });
});
