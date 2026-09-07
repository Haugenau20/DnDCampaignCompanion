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

  // Replaces "tells every reader that a campaign is private to its group",
  // which required every entity blurb to end with "each campaign is visible
  // only to the group that plays it". That was the access model narrated in
  // the product's voice: players already assume a campaign is theirs, so the
  // sentence spent the panel's one paragraph explaining the back of the
  // application instead of giving a reason to come in. The inverted test is
  // the one worth keeping -- it stops the phrasing coming back.
  it("never explains the access model in a blurb", () => {
    ALL_KEYS.forEach((key) => {
      expect(GATED_COPY[key].blurb).not.toMatch(/visible only|nobody else/i);
    });
  });

  // Any player can be the group admin, and a campaign here works whether or
  // not the DM ever signs in -- a missing player costs the record more than a
  // missing DM does. Copy that routes people to "your DM" is therefore wrong
  // for a real share of groups, not merely off-tone. `\b` on both sides so
  // this cannot be tripped by an unrelated word that happens to contain "dm".
  it("never sends the reader to the DM", () => {
    ALL_KEYS.forEach((key) => {
      const copy = GATED_COPY[key];
      expect(copy.blurb).not.toMatch(/\bDMs?\b|dungeon master/i);
      expect(copy.heading).not.toMatch(/\bDMs?\b|dungeon master/i);
      expect(copy.writeHeading ?? "").not.toMatch(/\bDMs?\b|dungeon master/i);
    });
    expect(GATED_FOOTNOTE).not.toMatch(/\bDMs?\b|dungeon master/i);
  });

  it("pitches extraction on the notes page, naming only what it returns", () => {
    // The four nouns are the `ExtractedEntity` union in `notes/types.ts`; a
    // fifth here would be a promise the extractor cannot keep.
    const { blurb } = GATED_COPY.notes;
    expect(blurb).toMatch(/AI/);
    ["NPCs", "locations", "quests", "rumors"].forEach((noun) => {
      expect(blurb).toContain(noun);
    });
    expect(blurb).not.toMatch(/\bchapters?\b|\bsagas?\b/i);
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
  // Was "explains that joining is by invite", asserting /join link/. The
  // footnote no longer explains anything: it opens the question and the link
  // beside it goes to Home, which answers it once instead of twenty times.
  // `SignedOutHome.test.tsx` now owns the join-link assertion.
  it("opens the question and leaves the answer to Home", () => {
    expect(GATED_FOOTNOTE).toMatch(/new here/i);
    expect(GATED_FOOTNOTE).not.toMatch(/join link|invite-only|private/i);
  });
});
