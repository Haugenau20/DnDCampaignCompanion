// src/shared/components/context-switcher/__tests__/GroupStep.test.tsx

import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import GroupStep from "../GroupStep";

const mockUseGroups = jest.fn();
const mockUseGroupSummaries = jest.fn();

jest.mock("@/features/user-management", () => ({
  useGroups: () => mockUseGroups(),
}));

jest.mock("../useGroupSummaries", () => ({
  useGroupSummaries: (...args: any[]) => mockUseGroupSummaries(...args),
}));

const groups = [
  { id: "group-1", name: "Fellowship of the Ring" },
  { id: "group-2", name: "Order of the Phoenix" },
];

function setup(overrides: {
  activeGroupId?: string | null;
  summaries?: Record<string, any>;
} = {}) {
  mockUseGroups.mockReturnValue({
    groups,
    activeGroupId:
      overrides.activeGroupId === undefined ? "group-1" : overrides.activeGroupId,
  });
  mockUseGroupSummaries.mockReturnValue(overrides.summaries ?? {});
}

const onSelectGroup = jest.fn();
const onBack = jest.fn();

function renderStep() {
  return render(<GroupStep onSelectGroup={onSelectGroup} onBack={onBack} />);
}

describe("GroupStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  test("the back action calls onBack", () => {
    renderStep();
    fireEvent.click(screen.getByRole("menuitem", { name: /choose a group/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test("a row shows counts and the admin clause", () => {
    setup({
      summaries: {
        "group-1": {
          campaignCount: 2,
          memberCount: 3,
          isAdmin: true,
          joinedAt: "2026-04-02T00:00:00.000Z",
        },
      },
    });
    renderStep();
    expect(
      screen.getByText("2 campaigns · 3 members · you're an admin")
    ).toBeInTheDocument();
  });

  test("a row shows counts and the joined clause when not an admin", () => {
    setup({
      summaries: {
        "group-1": {
          campaignCount: 1,
          memberCount: 1,
          isAdmin: false,
          joinedAt: "2026-04-02T00:00:00.000Z",
        },
      },
    });
    renderStep();
    // The month name's exact casing depends on the runtime's ICU data (this
    // Jest environment renders it lowercase), so it is computed the same way
    // production code computes it rather than hardcoded, to avoid coupling
    // the assertion to that quirk.
    const month = new Date("2026-04-02T00:00:00.000Z").toLocaleString(
      undefined,
      { month: "long" }
    );
    expect(
      screen.getByText(`1 campaign · 1 member · joined in ${month}`)
    ).toBeInTheDocument();
  });

  test("omits the joined clause when the date does not parse", () => {
    setup({
      summaries: {
        "group-1": {
          campaignCount: 1,
          memberCount: 1,
          isAdmin: false,
          joinedAt: "not-a-date",
        },
      },
    });
    renderStep();
    expect(screen.getByText("1 campaign · 1 member")).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });

  test("a row with no summary shows its name alone", () => {
    setup({ summaries: {} });
    renderStep();

    const row = screen.getByRole("menuitem", { name: /order of the phoenix/i });
    expect(within(row).getByText("Order of the Phoenix")).toBeInTheDocument();
    expect(within(row).queryByText(/member/)).not.toBeInTheDocument();
    expect(within(row).queryByText(/campaign/)).not.toBeInTheDocument();
  });

  test("clicking a row calls onSelectGroup", () => {
    renderStep();
    fireEvent.click(screen.getByText("Order of the Phoenix"));
    expect(onSelectGroup).toHaveBeenCalledWith("group-2");
  });

  test("exactly one check mark appears, on the active row", () => {
    const { container } = renderStep();
    const checkIcons = container.querySelectorAll("svg.lucide-check");
    expect(checkIcons).toHaveLength(1);

    const activeRow = screen.getByRole("menuitem", {
      name: /fellowship of the ring/i,
    });
    expect(activeRow.querySelector("svg.lucide-check")).not.toBeNull();
  });

  test("the footnote is present", () => {
    renderStep();
    expect(
      screen.getByText(
        "Choosing a group loads that group's campaigns and picks the one you last opened there."
      )
    ).toBeInTheDocument();
  });

  // Finding 4 of the 2026-09-01 review: a bare `border-b` draws Tailwind
  // preflight's hardcoded grey rather than a theme colour -- must pair with
  // `card-divider` (the codebase's colour-only class for this).
  test("the back button's divider uses the theme border colour", () => {
    renderStep();
    expect(
      screen.getByRole("menuitem", { name: /choose a group/i })
    ).toHaveClass("border-b", "card-divider");
  });
});
