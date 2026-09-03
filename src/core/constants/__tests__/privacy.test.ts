// src/core/constants/__tests__/privacy.test.ts
import {
  PRIVACY_LAST_UPDATED,
  PRIVACY_CHANGELOG,
  PRIVACY_CONTROLLER,
  PRIVACY_TABLE_ROWS,
  PRIVACY_SECTIONS,
  EXTRACTION_FACTS,
} from "../privacy";

describe("privacy constants", () => {
  it("is shaped like an ISO date", () => {
    expect(PRIVACY_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("does not move when the clock does", () => {
    // The bug this file exists to prevent was `new Date()` in the render path,
    // so the page re-dated itself daily. Asserting "the constant is not today"
    // would be a proxy that passes by luck and fails on the very day the policy
    // is genuinely updated. Re-evaluating the module under a faked clock tests
    // the real property: the value is a literal, not a computation.
    jest.useFakeTimers().setSystemTime(new Date("2031-01-15T12:00:00Z"));

    let reloaded: string | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      reloaded = require("../privacy").PRIVACY_LAST_UPDATED;
    });

    jest.useRealTimers();

    expect(reloaded).toBe(PRIVACY_LAST_UPDATED);
    expect(reloaded).not.toMatch(/^2031/);
  });

  it("parses as a real calendar date", () => {
    expect(Number.isNaN(Date.parse(PRIVACY_LAST_UPDATED))).toBe(false);
  });

  it("records what changed", () => {
    expect(PRIVACY_CHANGELOG.length).toBeGreaterThanOrEqual(2);
  });

  it("names a controller and routes contact through the contact page", () => {
    expect(PRIVACY_CONTROLLER.name).not.toHaveLength(0);
    expect(PRIVACY_CONTROLLER.contactPath).toBe("/contact");
  });

  it("puts no email address on the page", () => {
    const serialised = JSON.stringify({
      PRIVACY_CONTROLLER,
      PRIVACY_TABLE_ROWS,
      EXTRACTION_FACTS,
    });
    expect(serialised).not.toMatch(/@[\w.-]+\.\w+/);
  });

  it("covers all five disclosed data categories, with extraction highlighted", () => {
    expect(PRIVACY_TABLE_ROWS).toHaveLength(5);
    const highlighted = PRIVACY_TABLE_ROWS.filter((row) => row.highlighted);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].where).toContain("OpenAI");
  });

  it("gives every table row a unique id", () => {
    const ids = PRIVACY_TABLE_ROWS.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every prose section a unique id and a label", () => {
    const ids = PRIVACY_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    PRIVACY_SECTIONS.forEach((section) => {
      expect(section.label).not.toHaveLength(0);
    });
  });

  it("names the provider and its product so the claim is checkable", () => {
    expect(EXTRACTION_FACTS.provider).toBe("OpenAI");
    expect(EXTRACTION_FACTS.product).toContain("API");
  });
});
