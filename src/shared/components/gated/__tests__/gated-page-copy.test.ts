// src/shared/components/gated/__tests__/gated-page-copy.test.ts
import {
  GATED_COPY,
  GATED_FOOTNOTE,
  gatedHeading,
  GatedPageKey,
} from "../gated-page-copy";

const ALL_KEYS: GatedPageKey[] = [
  "home",
  "story",
  "quests",
  "npcs",
  "locations",
  "rumors",
  "notes",
];

describe("GATED_COPY", () => {
  it("has an entry for every page key", () => {
    expect(Object.keys(GATED_COPY).sort()).toEqual([...ALL_KEYS].sort());
  });

  it.each(ALL_KEYS)("%s carries a heading, a blurb and a noun", (key) => {
    const copy = GATED_COPY[key];
    expect(copy.heading.length).toBeGreaterThan(0);
    expect(copy.blurb.length).toBeGreaterThan(0);
    expect(copy.noun.length).toBeGreaterThan(0);
  });

  // Rewritten: this used to assert `notes.requires === "group"` on the
  // premise that `NoteContext` fetches on `activeGroupId` and only filters by
  // `activeCampaignId` afterwards, so a member with a group but no campaign
  // chosen would still have notes to read. That premise is false --
  // `NoteContext.tsx` sets `filteredNotes = []` whenever `activeCampaignId` is
  // absent ("If no active campaign, show no notes") -- so `notes` now
  // requires a campaign like every other page. `"group"` remains a valid
  // value of `GatedContextRequirement` (see its JSDoc) for a page that
  // genuinely only needs one; this test just confirms none currently claims
  // to be one, and that every `requires` field is one of the two valid values.
  it("requires a campaign for every page", () => {
    ALL_KEYS.forEach((key) => {
      expect(GATED_COPY[key].requires).toBe("campaign");
    });
  });

  it.each(ALL_KEYS)("%s's requires field is a valid GatedContextRequirement", (key) => {
    expect(["group", "campaign"]).toContain(GATED_COPY[key].requires);
  });

  it("never repeats a heading between two pages", () => {
    const headings = ALL_KEYS.map((key) => GATED_COPY[key].heading);
    expect(new Set(headings).size).toBe(headings.length);
  });

  it("tells every reader that a campaign is private to its group", () => {
    // The one promise the panel must make on each entity page.
    ["quests", "npcs", "locations", "rumors", "story"].forEach((key) => {
      expect(GATED_COPY[key as GatedPageKey].blurb).toMatch(
        /visible only to the group/i
      );
    });
  });
});

describe("gatedHeading", () => {
  it("returns the read heading in read mode", () => {
    expect(gatedHeading(GATED_COPY.quests, "read")).toBe(
      GATED_COPY.quests.heading
    );
  });

  it("returns the write heading in write mode", () => {
    expect(gatedHeading(GATED_COPY.quests, "write")).toBe(
      GATED_COPY.quests.writeHeading
    );
  });

  it("falls back to the read heading when a page has no write heading", () => {
    expect(gatedHeading(GATED_COPY.home, "write")).toBe(GATED_COPY.home.heading);
  });
});

describe("GATED_FOOTNOTE", () => {
  it("explains that joining is by invite", () => {
    expect(GATED_FOOTNOTE).toMatch(/join link/i);
  });
});
