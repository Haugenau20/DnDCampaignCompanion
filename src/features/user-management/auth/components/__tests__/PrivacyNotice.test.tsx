// src/features/user-management/auth/components/__tests__/PrivacyNotice.test.tsx

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PrivacyNotice from "../PrivacyNotice";
import { unnamedControlsIn } from "@/test-utils/accessible-names";
import { formAccentsIn } from "@/test-utils/accent-budget";
import {
  ANALYTICS_CONSENT_KEY,
  resetAnalyticsForTests,
  setAnalyticsConsent,
} from "@/core/services/firebase/analytics/analytics";

/**
 * T138: the notice asks whether Google Analytics may run, and stays until the
 * player answers.
 */

const mockNavigateToPage = jest.fn();

jest.mock("@/shared/hooks/useNavigation", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

const notice = () => screen.queryByRole("region", { name: "Privacy" });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  resetAnalyticsForTests();
});

afterEach(() => {
  localStorage.clear();
});

describe("PrivacyNotice", () => {
  describe("before the player answers", () => {
    test("asks about Google Analytics", () => {
      render(<PrivacyNotice />);
      expect(notice()).toBeInTheDocument();
      expect(screen.getByText(/count visits with Google Analytics/)).toBeInTheDocument();
    });

    test("says what the session keeps", () => {
      render(<PrivacyNotice />);
      expect(screen.getByText(/ends after 24 hours of\s+inactivity/)).toBeInTheDocument();
    });

    test("shows again to a player who only dismissed the old notice", () => {
      localStorage.setItem("privacyNoticeSeen", "true");
      render(<PrivacyNotice />);
      expect(notice()).toBeInTheDocument();
    });

    test("offers no way to close it without answering", () => {
      render(<PrivacyNotice />);
      expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
        "Privacy policy",
        "No thanks",
        "Allow analytics",
      ]);
    });
  });

  describe("answering", () => {
    test.each([
      ["Allow analytics", "granted"],
      ["No thanks", "denied"],
    ])("%s records %s and hides the notice", (label, stored) => {
      render(<PrivacyNotice />);
      fireEvent.click(screen.getByRole("button", { name: label }));

      expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe(stored);
      expect(notice()).not.toBeInTheDocument();
    });

    test("is not shown once the player has answered", () => {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, "denied");
      const { container } = render(<PrivacyNotice />);
      expect(container).toBeEmptyDOMElement();
    });

    test("hides when the player answers elsewhere, such as on the privacy page", () => {
      render(<PrivacyNotice />);
      act(() => setAnalyticsConsent("granted"));
      expect(notice()).not.toBeInTheDocument();
    });
  });

  describe("the privacy policy link", () => {
    test("opens the privacy page and leaves the question open", () => {
      render(<PrivacyNotice />);
      fireEvent.click(screen.getByRole("button", { name: /privacy policy/i }));

      expect(mockNavigateToPage).toHaveBeenCalledWith("/privacy");
      expect(notice()).toBeInTheDocument();
      expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// A5 gates (PR 10.2). Every control has a name; the surface spends its one
// accent on the control that writes, or none where nothing writes.
// ---------------------------------------------------------------------------
describe("PrivacyNotice — names and accents", () => {
  it("names every control", () => {
    const { container } = render(<PrivacyNotice />);

    // Paired with a positive assertion so an empty list cannot mean "this
    // rendered nothing at all" (R31).
    expect(container.querySelectorAll("input, select, textarea, button").length)
      .toBeGreaterThan(0);
    expect(unnamedControlsIn(container)).toEqual([]);
  });

  it("spends no accent: neither answer writes campaign data, and they weigh the same", () => {
    const { container } = render(<PrivacyNotice />);

    // Saying no must be as easy as saying yes, so neither answer stands out
    // (D66).
    expect(formAccentsIn(container)).toEqual([]);
  });
});

describe("PrivacyNotice with storage unavailable (T092)", () => {
  beforeEach(() => {
    const refuse = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(refuse);
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(refuse);
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(refuse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("shows the notice, and an answer still hides it", () => {
    render(<PrivacyNotice />);
    expect(notice()).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "No thanks" }));

    expect(notice()).not.toBeInTheDocument();
  });
});
