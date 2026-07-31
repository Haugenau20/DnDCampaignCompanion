// src/components/features/layouts/dashboard/sections/__tests__/OpenQuests.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OpenQuests from "../OpenQuests";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigateToPage = jest.fn();

jest.mock("shared/context/NavigationContext", () => ({
  useNavigation: () => ({
    navigateToPage: mockNavigateToPage,
    state: { currentPath: "/" },
    goBack: jest.fn(),
    updateQueryParams: jest.fn(),
    getCurrentQueryParams: jest.fn(() => ({})),
    clearHistory: jest.fn(),
    createPath: jest.fn(),
  }),
}));

jest.mock("core/components/Typography", () => ({
  __esModule: true,
  default: ({ children, variant, color, className }: any) => {
    const Tag = variant === "h2" ? "h2" : "span";
    return (
      <Tag data-testid={`typography-${variant || "body"}`} data-color={color} className={className}>
        {children}
      </Tag>
    );
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeQuest = (
  id: string,
  title: string,
  status: "active" | "completed" | "failed" = "active"
) => ({ id, title, status } as any);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OpenQuests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the heading", () => {
    render(<OpenQuests />);
    expect(screen.getByText("Open quests")).toBeInTheDocument();
  });

  it("names the open quests rather than only counting them", () => {
    render(
      <OpenQuests
        quests={[
          makeQuest("q1", "Lokaliser Boggarts"),
          makeQuest("q2", "Find Obelisken"),
        ]}
      />
    );
    expect(screen.getByText("Lokaliser Boggarts")).toBeInTheDocument();
    expect(screen.getByText("Find Obelisken")).toBeInTheDocument();
  });

  it("lists only active quests", () => {
    render(
      <OpenQuests
        quests={[
          makeQuest("q1", "Still Open", "active"),
          makeQuest("q2", "Already Done", "completed"),
          makeQuest("q3", "Went Wrong", "failed"),
        ]}
      />
    );
    expect(screen.getByText("Still Open")).toBeInTheDocument();
    expect(screen.queryByText("Already Done")).not.toBeInTheDocument();
    expect(screen.queryByText("Went Wrong")).not.toBeInTheDocument();
  });

  it("says so plainly when nothing is open", () => {
    render(<OpenQuests quests={[makeQuest("q1", "Done", "completed")]} />);
    expect(
      screen.getByText("Nothing open — every quest is settled.")
    ).toBeInTheDocument();
  });

  it("renders nothing but the heading with no quests at all", () => {
    render(<OpenQuests quests={[]} />);
    expect(screen.getByText("Open quests")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("caps the list and links out for the remainder", () => {
    const quests = Array.from({ length: 6 }, (_, i) =>
      makeQuest(`q${i}`, `Quest ${i}`)
    );
    render(<OpenQuests quests={quests} limit={4} />);

    expect(screen.getByText("Quest 0")).toBeInTheDocument();
    expect(screen.getByText("Quest 3")).toBeInTheDocument();
    expect(screen.queryByText("Quest 4")).not.toBeInTheDocument();
    expect(screen.getByText("2 more open quests")).toBeInTheDocument();
  });

  it("uses the singular for a single remaining quest", () => {
    const quests = Array.from({ length: 5 }, (_, i) =>
      makeQuest(`q${i}`, `Quest ${i}`)
    );
    render(<OpenQuests quests={quests} limit={4} />);
    expect(screen.getByText("1 more open quest")).toBeInTheDocument();
  });

  it("navigates to the highlighted quest when a row is clicked", async () => {
    render(<OpenQuests quests={[makeQuest("q7", "Find Obelisken")]} />);
    await userEvent.click(screen.getByText("Find Obelisken").closest("button")!);
    expect(mockNavigateToPage).toHaveBeenCalledWith("/quests?highlight=q7");
  });

  it("navigates to the quests page from the remainder link", async () => {
    const quests = Array.from({ length: 6 }, (_, i) =>
      makeQuest(`q${i}`, `Quest ${i}`)
    );
    render(<OpenQuests quests={quests} limit={4} />);
    await userEvent.click(screen.getByText("2 more open quests"));
    expect(mockNavigateToPage).toHaveBeenCalledWith("/quests");
  });

  it("renders a skeleton while loading", () => {
    const { container } = render(<OpenQuests loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("does not render quest rows while loading", () => {
    render(<OpenQuests quests={[makeQuest("q1", "Hidden While Loading")]} loading />);
    expect(screen.queryByText("Hidden While Loading")).not.toBeInTheDocument();
  });
});
