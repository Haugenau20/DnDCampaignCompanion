// src/pages/privacy/__tests__/PrivacyDataTable.test.tsx
import React from "react";
import { render, screen, within } from "@testing-library/react";
import PrivacyDataTable from "../PrivacyDataTable";
import { PRIVACY_TABLE_ROWS } from "core/constants/privacy";
import { INACTIVITY_TIMEOUT_TEXT, REMEMBER_ME_TEXT } from "core/constants/time";

describe("PrivacyDataTable", () => {
  it("is a real table, so it is navigable as one", () => {
    render(<PrivacyDataTable />);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("has the four promised column headers", () => {
    render(<PrivacyDataTable />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual([
      "What we keep",
      "Why",
      "Where it goes",
      "How long",
    ]);
  });

  it("renders one row per disclosed category, plus the header row", () => {
    render(<PrivacyDataTable />);
    expect(screen.getAllByRole("row")).toHaveLength(PRIVACY_TABLE_ROWS.length + 1);
  });

  it("names the extraction destination in the row that matters most", () => {
    render(<PrivacyDataTable />);
    const row = screen.getByTestId("privacy-row-extraction");
    expect(within(row).getByText(/OpenAI/)).toBeInTheDocument();
  });

  it("marks the extraction row with a theme token, not a colour", () => {
    render(<PrivacyDataTable />);
    const row = screen.getByTestId("privacy-row-extraction");
    expect(row).toHaveClass("card-subtle");
    expect(row.getAttribute("style") ?? "").not.toMatch(/background|color/);
  });

  it("expands the session sentinel from the time constants, not from literals", () => {
    render(<PrivacyDataTable />);
    const row = screen.getByTestId("privacy-row-session");
    expect(within(row).getByText(new RegExp(REMEMBER_ME_TEXT))).toBeInTheDocument();
    expect(
      within(row).getByText(new RegExp(INACTIVITY_TIMEOUT_TEXT))
    ).toBeInTheDocument();
    expect(row.textContent).not.toContain("SESSION_DURATIONS");
  });

  it("labels every cell for the stacked layout, where headers are off-screen", () => {
    render(<PrivacyDataTable />);
    const row = screen.getByTestId("privacy-row-identifiers");
    const labels = within(row)
      .getAllByRole("cell")
      .map((cell) => cell.getAttribute("data-label"));
    expect(labels).toEqual(["What we keep", "Why", "Where it goes", "How long"]);
  });

  it("exposes those labels to assistive technology, not just to sighted readers", () => {
    // The header row is `hidden sm:table-row`, so below `sm` it is display:none
    // and out of the accessibility tree -- and overriding `display` on tr/td
    // drops the table role in several browsers, so header association is gone at
    // that width too. The per-cell label span is therefore the only column
    // context a narrow-viewport screen-reader user gets. Marking it decorative
    // would leave them hearing bare values.
    render(<PrivacyDataTable />);
    const row = screen.getByTestId("privacy-row-identifiers");
    within(row)
      .getAllByRole("cell")
      .forEach((cell) => {
        const label = cell.querySelector("span");
        expect(label).not.toBeNull();
        expect(label).toHaveTextContent(cell.getAttribute("data-label") ?? "");
        expect(label).not.toHaveAttribute("aria-hidden");
      });
  });

  it("scrolls inside its own container rather than the page", () => {
    const { container } = render(<PrivacyDataTable />);
    expect(container.querySelector(".overflow-x-auto")).not.toBeNull();
  });
});
