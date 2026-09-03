// src/pages/__tests__/PrivacyPolicyPage.test.tsx
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrivacyPolicyPage from "../PrivacyPolicyPage";
import {
  PRIVACY_LAST_UPDATED,
  PRIVACY_SECTIONS,
  PRIVACY_CONTROLLER,
  PRIVACY_HOSTING_REGION,
} from "core/constants/privacy";
import { INACTIVITY_TIMEOUT_TEXT, REMEMBER_ME_TEXT } from "core/constants/time";

const mockNavigateToPage = jest.fn();

jest.mock("shared/hooks/useNavigation", () => ({
  __esModule: true,
  default: () => ({ navigateToPage: mockNavigateToPage }),
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => ({ pathname: "/privacy", search: "", hash: "" }),
}));

jest.mock("shared/context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage, state: {} }),
}));

beforeEach(() => {
  mockNavigateToPage.mockClear();
});

describe("PrivacyPolicyPage — the date", () => {
  it("renders the constant, not today", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.querySelector("time")).toHaveAttribute(
      "dateTime",
      PRIVACY_LAST_UPDATED
    );
  });

  it("does not change when the clock does", () => {
    jest.useFakeTimers().setSystemTime(new Date("2031-01-15T12:00:00Z"));
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.querySelector("time")?.textContent).not.toMatch(/2031/);
    expect(container.querySelector("time")).toHaveAttribute(
      "dateTime",
      PRIVACY_LAST_UPDATED
    );
    jest.useRealTimers();
  });
});

describe("PrivacyPolicyPage — structure", () => {
  it("leads with one h1", () => {
    render(<PrivacyPolicyPage />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Privacy");
  });

  it("puts the summary table above the prose", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const table = container.querySelector("table");
    const firstSection = container.querySelector(
      `#${PRIVACY_SECTIONS[0].id}`
    );
    expect(table).not.toBeNull();
    expect(firstSection).not.toBeNull();
    expect(
      table!.compareDocumentPosition(firstSection!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("gives every section an id that its anchor link targets", () => {
    const { container } = render(<PrivacyPolicyPage />);
    PRIVACY_SECTIONS.forEach((section) => {
      expect(container.querySelector(`#${section.id}`)).not.toBeNull();
      expect(
        container.querySelector(`a[href="#${section.id}"]`)
      ).not.toBeNull();
    });
  });

  it("does not box the prose — cards are for things you can act on", () => {
    const { container } = render(<PrivacyPolicyPage />);
    PRIVACY_SECTIONS.forEach((section) => {
      const el = container.querySelector(`#${section.id}`);
      expect(el?.closest(".card")).toBeNull();
    });
  });

  it("renders exactly the three summary cards", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.querySelectorAll(".card")).toHaveLength(3);
  });

  it("hides decorative icons from assistive technology", () => {
    const { container } = render(<PrivacyPolicyPage />);
    container.querySelectorAll("svg").forEach((icon) => {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    });
  });
});

describe("PrivacyPolicyPage — content that must be there", () => {
  it("names the controller and their country", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByText(new RegExp(PRIVACY_CONTROLLER.name))
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(PRIVACY_CONTROLLER.country))
    ).toBeInTheDocument();
  });

  it("publishes no email address", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.textContent ?? "").not.toMatch(/@[\w.-]+\.\w{2,}/);
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it("discloses entity extraction, naming the provider", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#entity-extraction");
    expect(section).not.toBeNull();
    expect(section!.textContent).toContain("OpenAI");
    expect(section!.textContent).toMatch(/only the text of that note/i);
    expect(section!.textContent).toMatch(/30 days/);
    expect(section!.textContent).toMatch(/United States/);
  });

  it("states the three extraction caps, not just a monthly one", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#entity-extraction");
    expect(section!.textContent).toMatch(/10 scans a day/);
    expect(section!.textContent).toMatch(/100 a month/);
  });

  it("describes deletion as a button, and links to the profile page", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#retention");
    expect(section!.textContent).toMatch(/Delete account/);
    expect(section!.textContent).not.toMatch(/contact us to request/i);
  });

  it("routes the delete-it-yourself card to the profile page", async () => {
    render(<PrivacyPolicyPage />);
    await userEvent.click(
      screen.getByRole("button", { name: /go to your profile/i })
    );
    expect(mockNavigateToPage).toHaveBeenCalledWith("/profile");
  });

  it("routes the contact affordance to the contact page", async () => {
    render(<PrivacyPolicyPage />);
    await userEvent.click(screen.getByRole("button", { name: /ask a question/i }));
    expect(mockNavigateToPage).toHaveBeenCalledWith("/contact");
  });

  it("says concretely what survives leaving a group", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#groups-and-sharing");
    expect(section!.textContent).toMatch(/stay(s)? (behind )?with the group/i);
    expect(section!.textContent).not.toMatch(/where appropriate/i);
  });

  it("names the hosting region, in the summary card and in the legal basis", () => {
    render(<PrivacyPolicyPage />);
    // getAllByText, not getByText: the region is deliberately stated twice --
    // once where a skimmer will see it and once where the transfers claim needs
    // it -- and getByText throws on more than one match.
    expect(
      screen.getAllByText(new RegExp(PRIVACY_HOSTING_REGION.split(" ")[0]))
    ).toHaveLength(2);
  });

  it("names Datatilsynet and says you need not come to us first", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.textContent).toContain("Datatilsynet");
    expect(container.textContent).toMatch(/don't need to go through us first/i);
  });

  it("reuses the session constants rather than restating durations", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.textContent).toContain(INACTIVITY_TIMEOUT_TEXT);
    expect(container.textContent).toContain(REMEMBER_ME_TEXT);
  });

  it("claims no analytics and no advertising", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.textContent).toMatch(/no analytics/i);
    expect(container.textContent).toMatch(/no advertising/i);
  });

  it("has dropped the claims nobody can stand behind", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/regular security assessments/i);
    expect(text).not.toMatch(/where appropriate/i);
    expect(text).not.toMatch(/industry-standard/i);
  });

  it("keeps the specific security measures that are true", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#security");
    expect(section!.textContent).toMatch(/Firebase Authentication/);
    expect(section!.textContent).toMatch(/encrypted in transit/i);
  });

  it("states a legal basis", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#legal-basis");
    expect(section).not.toBeNull();
    expect(section!.textContent).toMatch(/legitimate interest|contract|consent/i);
  });

  it("discloses browser-side storage", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#device-storage");
    expect(section!.textContent).toMatch(/your own device|your browser/i);
  });

  it("no longer ends with a Contact Us card", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const cards = Array.from(container.querySelectorAll(".card"));
    const last = cards[cards.length - 1];
    expect(last?.textContent).not.toMatch(/^Contact Us/);
  });
});
