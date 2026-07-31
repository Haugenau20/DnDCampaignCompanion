// src/components/features/layouts/dashboard/sections/__tests__/RumorPrompt.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RumorPrompt from "../RumorPrompt";

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
  default: ({ children, variant, color, className }: any) => (
    <span data-testid={`typography-${variant || "body"}`} data-color={color} className={className}>
      {children}
    </span>
  ),
}));

jest.mock("core/components/Button", () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RumorPrompt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prompts when there are no rumors", () => {
    render(<RumorPrompt rumorCount={0} />);
    expect(screen.getByText("No rumors yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Tavern gossip is the cheapest way to seed a session. Add the first one."
      )
    ).toBeInTheDocument();
  });

  it("renders nothing once a rumor exists", () => {
    const { container } = render(<RumorPrompt rumorCount={1} />);
    // The prompt is for an empty state only — it should not linger as decoration.
    expect(container).toBeEmptyDOMElement();
  });

  it("offers a way to act on the prompt", async () => {
    render(<RumorPrompt rumorCount={0} />);
    await userEvent.click(screen.getByRole("button", { name: "Add a rumor" }));
    expect(mockNavigateToPage).toHaveBeenCalledWith("/rumors/create");
  });

  it("is marked as a prompt rather than content", () => {
    render(<RumorPrompt rumorCount={0} />);
    expect(screen.getByTestId("rumor-prompt").className).toContain("border-dashed");
  });
});
