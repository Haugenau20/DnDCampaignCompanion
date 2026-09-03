// src/pages/privacy/__tests__/PrivacyLastUpdated.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PrivacyLastUpdated from "../PrivacyLastUpdated";
import { PRIVACY_LAST_UPDATED, PRIVACY_CHANGELOG } from "core/constants/privacy";

describe("PrivacyLastUpdated", () => {
  it("renders a machine-readable time element carrying the ISO date", () => {
    const { container } = render(<PrivacyLastUpdated />);
    const time = container.querySelector("time");
    expect(time).not.toBeNull();
    expect(time).toHaveAttribute("dateTime", PRIVACY_LAST_UPDATED);
  });

  it("formats the date en-GB — day before month, month spelled out", () => {
    render(<PrivacyLastUpdated />);
    expect(screen.getByText(/3 September 2026/)).toBeInTheDocument();
  });

  it("does not follow the clock", () => {
    // This replaces a version guarded by `if (today !== rendered)`, which made
    // the assertion inside it tautological -- and which would have gone quiet
    // on precisely the day someone genuinely updates the policy. Moving the
    // clock instead tests the real property: the rendered date is a constant,
    // not a computation. This is the bug the whole file exists to prevent.
    jest.useFakeTimers().setSystemTime(new Date("2031-06-01T12:00:00Z"));

    const { container } = render(<PrivacyLastUpdated />);
    const time = container.querySelector("time");

    expect(time).toHaveAttribute("dateTime", PRIVACY_LAST_UPDATED);
    expect(time?.textContent).not.toMatch(/2031/);

    jest.useRealTimers();
  });

  it("keeps the changelog collapsed until asked", () => {
    render(<PrivacyLastUpdated />);
    expect(screen.queryByText(PRIVACY_CHANGELOG[0])).not.toBeInTheDocument();
  });

  it("reveals every changelog line when the disclosure is opened", () => {
    render(<PrivacyLastUpdated />);
    fireEvent.click(screen.getByRole("button", { name: /what changed/i }));
    PRIVACY_CHANGELOG.forEach((line) => {
      expect(screen.getByText(line)).toBeInTheDocument();
    });
  });

  it("reports its expanded state to assistive technology", () => {
    render(<PrivacyLastUpdated />);
    const trigger = screen.getByRole("button", { name: /what changed/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
