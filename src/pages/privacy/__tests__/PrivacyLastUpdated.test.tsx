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

  it("does not render today's date when today is not the constant", () => {
    const today = new Date().toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const { container } = render(<PrivacyLastUpdated />);
    const rendered = container.querySelector("time")?.textContent ?? "";
    if (today !== rendered) {
      expect(rendered).not.toBe(today);
    }
    expect(container.querySelector("time")).toHaveAttribute(
      "dateTime",
      PRIVACY_LAST_UPDATED
    );
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
