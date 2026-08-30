// src/shared/components/contact/__tests__/contact-categories.test.ts
import {
  CONTACT_CATEGORIES,
  getContactCategory,
  categoryFromLegacySubject,
  ContactCategoryId,
} from "../contact-categories";

describe("contact-categories", () => {
  describe("CONTACT_CATEGORIES", () => {
    it("declares exactly the five categories, in chip order", () => {
      expect(CONTACT_CATEGORIES.map((c) => c.id)).toEqual([
        "broken",
        "feature",
        "smart-detection",
        "account",
        "other",
      ]);
    });

    it("gives every category a chip label and a subject label", () => {
      CONTACT_CATEGORIES.forEach((category) => {
        expect(category.chipLabel.length).toBeGreaterThan(0);
        expect(category.subjectLabel.length).toBeGreaterThan(0);
      });
    });

    it("uses the subject labels the cloud function mirrors", () => {
      const subjects = Object.fromEntries(
        CONTACT_CATEGORIES.map((c) => [c.id, c.subjectLabel])
      );
      expect(subjects).toEqual({
        "broken": "Bug report",
        "feature": "Feature request",
        "smart-detection": "Smart detection limit increase",
        "account": "Account or group",
        "other": "General enquiry",
      });
    });

    it("gives guidance only to the categories that need it", () => {
      // account and other deliberately have none -- inventing filler copy
      // would rebuild the permanent column of prose in a new location.
      const withGuidance = CONTACT_CATEGORIES.filter((c) => c.guidance !== null);
      expect(withGuidance.map((c) => c.id)).toEqual([
        "broken",
        "feature",
        "smart-detection",
      ]);
    });

    it("asks for a second field only for smart-detection", () => {
      const withExtra = CONTACT_CATEGORIES.filter(
        (c) => c.extraFieldLabel !== null
      );
      expect(withExtra.map((c) => c.id)).toEqual(["smart-detection"]);
      expect(withExtra[0].extraFieldLabel).toBe("Why do you need more?");
    });

    it("tells a bug reporter the three things that help most", () => {
      const broken = getContactCategory("broken");
      expect(broken.guidance).toBe(
        "For a bug, three things help most: what you clicked, what happened, and what you expected instead."
      );
    });
  });

  describe("getContactCategory", () => {
    it("returns the category for a known id", () => {
      expect(getContactCategory("feature").chipLabel).toBe("Feature idea");
    });

    it("throws for an unknown id rather than returning undefined", () => {
      expect(() =>
        getContactCategory("nonsense" as ContactCategoryId)
      ).toThrow(/nonsense/);
    });
  });

  describe("categoryFromLegacySubject", () => {
    it("maps the deep link EntityExtractionService actually sends", () => {
      expect(
        categoryFromLegacySubject("Smart Detection Limit Increase Request")
      ).toBe("smart-detection");
    });

    it("matches on the Limit Increase substring alone", () => {
      expect(categoryFromLegacySubject("Usage Limit Increase")).toBe(
        "smart-detection"
      );
    });

    it("returns null for a subject that maps to no category", () => {
      expect(categoryFromLegacySubject("Hello there")).toBeNull();
    });

    it("returns null for an empty subject", () => {
      expect(categoryFromLegacySubject("")).toBeNull();
    });
  });
});
