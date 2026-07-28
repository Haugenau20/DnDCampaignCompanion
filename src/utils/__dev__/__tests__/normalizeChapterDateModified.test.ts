// src/utils/__dev__/__tests__/normalizeChapterDateModified.test.ts
//
// Unit tests for the PURE decision logic behind the bug #1202 data-repair
// script (src/utils/__dev__/normalizeChapterDateModified.ts). These tests
// exercise the predicate/converter/report-building functions directly with
// fabricated records — no Firestore, no emulator, no network. The
// Firestore-touching orchestration (walkReachableChapters, runAudit,
// runMigrate, runRevert, main) is deliberately NOT exercised here: it cannot
// be, without a live or emulated project, and this file must never connect
// to one.

import {
  isTimestampLike,
  classifyDateFieldType,
  computeFieldHistogram,
  needsDateModifiedRepair,
  convertDateFieldToIsoString,
  planChapterDateModifiedRepairs,
  buildAuditReport,
  serializeTimestampLike,
  deserializeTimestampLike,
  buildJournalEntry,
  parseJournalLine,
  parseCliArgs,
  type ChapterRecord,
  type StoryProgressRecord,
} from "../normalizeChapterDateModified";

/** Builds a fake Firestore Timestamp-like object with a working `.toDate()`. */
function fakeTimestamp(iso: string) {
  const millis = new Date(iso).getTime();
  const seconds = Math.floor(millis / 1000);
  const nanoseconds = (millis % 1000) * 1_000_000;
  return {
    seconds,
    nanoseconds,
    toDate: () => new Date(seconds * 1000 + nanoseconds / 1_000_000),
  };
}

describe("isTimestampLike", () => {
  it("recognizes a Timestamp-shaped object with toDate()", () => {
    expect(isTimestampLike(fakeTimestamp("2025-01-01T00:00:00.000Z"))).toBe(true);
  });

  it("recognizes a plain {seconds, nanoseconds} object without toDate()", () => {
    expect(isTimestampLike({ seconds: 123, nanoseconds: 0 })).toBe(true);
  });

  it("rejects strings", () => {
    expect(isTimestampLike("2025-01-01T00:00:00.000Z")).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isTimestampLike(null)).toBe(false);
    expect(isTimestampLike(undefined)).toBe(false);
  });

  it("rejects an object missing seconds/nanoseconds", () => {
    expect(isTimestampLike({ foo: "bar" })).toBe(false);
  });

  it("rejects numbers and arrays", () => {
    expect(isTimestampLike(12345)).toBe(false);
    expect(isTimestampLike([1, 2, 3])).toBe(false);
  });
});

describe("classifyDateFieldType", () => {
  it("classifies absent values", () => {
    expect(classifyDateFieldType(undefined)).toBe("absent");
    expect(classifyDateFieldType(null)).toBe("absent");
  });

  it("classifies strings, valid or not", () => {
    expect(classifyDateFieldType("2025-01-01T00:00:00.000Z")).toBe("string");
    expect(classifyDateFieldType("not-a-date")).toBe("string");
  });

  it("classifies Timestamp-like values", () => {
    expect(classifyDateFieldType(fakeTimestamp("2025-01-01T00:00:00.000Z"))).toBe("timestamp");
    expect(classifyDateFieldType({ seconds: 1, nanoseconds: 2 })).toBe("timestamp");
  });

  it("classifies anything else as other", () => {
    expect(classifyDateFieldType(42)).toBe("other");
    expect(classifyDateFieldType(["x"])).toBe("other");
    expect(classifyDateFieldType({})).toBe("other");
  });
});

describe("computeFieldHistogram", () => {
  it("tallies each bucket correctly", () => {
    const histogram = computeFieldHistogram([
      "2025-01-01T00:00:00.000Z",
      undefined,
      null,
      fakeTimestamp("2025-01-01T00:00:00.000Z"),
      { seconds: 1, nanoseconds: 0 },
      42,
    ]);

    expect(histogram).toEqual({ string: 1, timestamp: 2, other: 1, absent: 2 });
  });

  it("returns all-zero buckets for an empty input", () => {
    expect(computeFieldHistogram([])).toEqual({ string: 0, timestamp: 0, other: 0, absent: 0 });
  });
});

describe("needsDateModifiedRepair", () => {
  it("returns false for absent values (not corrupt, just unset)", () => {
    expect(needsDateModifiedRepair(undefined)).toBe(false);
    expect(needsDateModifiedRepair(null)).toBe(false);
  });

  it("returns false for any string, valid ISO or not", () => {
    expect(needsDateModifiedRepair("2025-01-01T00:00:00.000Z")).toBe(false);
    expect(needsDateModifiedRepair("garbage")).toBe(false);
  });

  it("returns true for a Timestamp-like value", () => {
    expect(needsDateModifiedRepair(fakeTimestamp("2025-01-01T00:00:00.000Z"))).toBe(true);
    expect(needsDateModifiedRepair({ seconds: 1, nanoseconds: 0 })).toBe(true);
  });

  it("returns true for any other non-string shape (numbers, objects, arrays)", () => {
    expect(needsDateModifiedRepair(42)).toBe(true);
    expect(needsDateModifiedRepair({})).toBe(true);
    expect(needsDateModifiedRepair([])).toBe(true);
  });

  it("is idempotent: a value that has already been repaired (a string) is never flagged again", () => {
    const original = fakeTimestamp("2025-01-01T00:00:00.000Z");
    expect(needsDateModifiedRepair(original)).toBe(true);

    const conversion = convertDateFieldToIsoString(original);
    expect(conversion.ok).toBe(true);
    const repaired = conversion.ok ? conversion.isoString : "";

    // Running the predicate again on the repaired (string) value must be false,
    // which is exactly what makes a second `migrate` pass a no-op.
    expect(needsDateModifiedRepair(repaired)).toBe(false);
  });
});

describe("convertDateFieldToIsoString", () => {
  it("converts a real Timestamp-like value (with toDate()) to an ISO string", () => {
    const result = convertDateFieldToIsoString(fakeTimestamp("2025-06-15T12:30:00.000Z"));
    expect(result).toEqual({ ok: true, isoString: "2025-06-15T12:30:00.000Z" });
  });

  it("converts a plain {seconds, nanoseconds} object (no toDate()) to an ISO string", () => {
    // 2025-06-15T12:30:00.000Z
    const millis = new Date("2025-06-15T12:30:00.000Z").getTime();
    const result = convertDateFieldToIsoString({ seconds: Math.floor(millis / 1000), nanoseconds: 0 });
    expect(result).toEqual({ ok: true, isoString: "2025-06-15T12:30:00.000Z" });
  });

  it("refuses (never guesses) an unrecognized shape", () => {
    const result = convertDateFieldToIsoString({ weird: "shape" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/Unrecognized/);
    }
  });

  it("refuses a number", () => {
    const result = convertDateFieldToIsoString(1700000000);
    expect(result.ok).toBe(false);
  });

  it("refuses a string (this function is only ever called on non-strings by the planner, but must not silently accept one)", () => {
    const result = convertDateFieldToIsoString("2025-01-01T00:00:00.000Z");
    expect(result.ok).toBe(false);
  });
});

describe("planChapterDateModifiedRepairs", () => {
  it("plans a repair only for Timestamp-like dateModified values", () => {
    const chapters: ChapterRecord[] = [
      { path: "groups/g1/campaigns/c1/chapters/chapter-01", dateModified: "2025-01-01T00:00:00.000Z" },
      { path: "groups/g1/campaigns/c1/chapters/chapter-02", dateModified: fakeTimestamp("2025-02-02T00:00:00.000Z") },
      { path: "groups/g1/campaigns/c1/chapters/chapter-03", dateModified: undefined },
      { path: "groups/g1/campaigns/c1/chapters/chapter-04", dateModified: { seconds: 1, nanoseconds: 0 } },
    ];

    const plan = planChapterDateModifiedRepairs(chapters);

    expect(plan.toRepair).toHaveLength(2);
    expect(plan.toRepair.map((r) => r.path)).toEqual([
      "groups/g1/campaigns/c1/chapters/chapter-02",
      "groups/g1/campaigns/c1/chapters/chapter-04",
    ]);
    expect(plan.toRepair[0].newValueIso).toBe("2025-02-02T00:00:00.000Z");
    expect(plan.unrecognized).toHaveLength(0);
  });

  it("routes unrecognized non-string, non-Timestamp values to `unrecognized`, not `toRepair`", () => {
    const chapters: ChapterRecord[] = [
      { path: "groups/g1/campaigns/c1/chapters/chapter-05", dateModified: 12345 },
      { path: "groups/g1/campaigns/c1/chapters/chapter-06", dateModified: { nonsense: true } },
    ];

    const plan = planChapterDateModifiedRepairs(chapters);

    expect(plan.toRepair).toHaveLength(0);
    expect(plan.unrecognized).toHaveLength(2);
    expect(plan.unrecognized[0].path).toBe("groups/g1/campaigns/c1/chapters/chapter-05");
  });

  it("produces an empty plan for an all-clean input (idempotence at the batch level)", () => {
    const chapters: ChapterRecord[] = [
      { path: "a", dateModified: "2025-01-01T00:00:00.000Z" },
      { path: "b", dateModified: undefined },
    ];

    const plan = planChapterDateModifiedRepairs(chapters);
    expect(plan.toRepair).toHaveLength(0);
    expect(plan.unrecognized).toHaveLength(0);
  });
});

describe("buildAuditReport", () => {
  it("reports totals, affected paths, unrecognized items and histograms", () => {
    const chapters = [
      {
        path: "groups/g1/campaigns/c1/chapters/chapter-01",
        dateModified: "2025-01-01T00:00:00.000Z",
        dateAdded: "2025-01-01T00:00:00.000Z",
      },
      {
        path: "groups/g1/campaigns/c1/chapters/chapter-02",
        dateModified: fakeTimestamp("2025-02-02T00:00:00.000Z"),
        dateAdded: "2025-01-15T00:00:00.000Z",
      },
      {
        path: "groups/g1/campaigns/c1/chapters/chapter-03",
        dateModified: undefined,
        dateAdded: fakeTimestamp("2025-01-20T00:00:00.000Z"), // measured, never repaired
      },
    ];

    const storyProgress: StoryProgressRecord[] = [
      {
        path: "groups/g1/campaigns/c1/story-progress/current-progress",
        lastRead: fakeTimestamp("2025-03-01T00:00:00.000Z"),
        chapterProgress: {
          "chapter-01": { lastRead: fakeTimestamp("2025-03-01T00:00:00.000Z") },
          "chapter-02": { lastRead: "2025-03-02T00:00:00.000Z" },
        },
      },
    ];

    const report = buildAuditReport(chapters, storyProgress);

    expect(report.totalChaptersScanned).toBe(3);
    expect(report.needingRepairCount).toBe(1);
    expect(report.affectedPaths).toEqual(["groups/g1/campaigns/c1/chapters/chapter-02"]);
    expect(report.unrecognized).toHaveLength(0);

    expect(report.histograms.dateModified).toEqual({ string: 1, timestamp: 1, other: 0, absent: 1 });
    // dateAdded is measured (including its one Timestamp) but this report never
    // plans a repair for it -- confirmed by needingRepairCount/affectedPaths
    // above being based only on dateModified.
    expect(report.histograms.dateAdded).toEqual({ string: 2, timestamp: 1, other: 0, absent: 0 });

    expect(report.histograms.storyProgressLastRead).toEqual({ string: 0, timestamp: 1, other: 0, absent: 0 });
    expect(report.histograms.chapterProgressLastRead).toEqual({ string: 1, timestamp: 1, other: 0, absent: 0 });
  });

  it("handles an empty walk (no chapters, no story-progress) without throwing", () => {
    const report = buildAuditReport([], []);
    expect(report.totalChaptersScanned).toBe(0);
    expect(report.needingRepairCount).toBe(0);
    expect(report.histograms.dateModified).toEqual({ string: 0, timestamp: 0, other: 0, absent: 0 });
    expect(report.histograms.storyProgressLastRead).toEqual({ string: 0, timestamp: 0, other: 0, absent: 0 });
  });

  it("defaults storyProgress to an empty array when omitted", () => {
    const report = buildAuditReport([
      { path: "a", dateModified: "2025-01-01T00:00:00.000Z", dateAdded: "2025-01-01T00:00:00.000Z" },
    ]);
    expect(report.histograms.storyProgressLastRead).toEqual({ string: 0, timestamp: 0, other: 0, absent: 0 });
  });
});

describe("serializeTimestampLike / deserializeTimestampLike round-trip", () => {
  it("round-trips a Timestamp-like value through JSON", () => {
    const original = fakeTimestamp("2025-04-04T04:04:04.000Z");
    const serialized = serializeTimestampLike(original);
    expect(serialized).toEqual({ __type: "timestamp", seconds: original.seconds, nanoseconds: original.nanoseconds });

    const roundTripped = JSON.parse(JSON.stringify(serialized));
    const deserialized = deserializeTimestampLike(roundTripped);
    expect(deserialized).toEqual({ seconds: original.seconds, nanoseconds: original.nanoseconds });
  });

  it("serializeTimestampLike returns null for a non-Timestamp value", () => {
    expect(serializeTimestampLike("not a timestamp")).toBeNull();
    expect(serializeTimestampLike(42)).toBeNull();
  });

  it("deserializeTimestampLike returns null (never guesses) for a malformed journal value", () => {
    expect(deserializeTimestampLike({ seconds: 1 })).toBeNull();
    expect(deserializeTimestampLike("2025-01-01T00:00:00.000Z")).toBeNull();
    expect(deserializeTimestampLike(null)).toBeNull();
    // __type must be exactly "timestamp" -- a mismatched tag is refused, not
    // guessed at, even though seconds/nanoseconds are both present and numeric.
    expect(deserializeTimestampLike({ __type: "not-a-timestamp", seconds: 1, nanoseconds: 2 })).toBeNull();
  });
});

describe("buildJournalEntry", () => {
  it("builds a journal entry with the raw old Timestamp-like value serialized and the new ISO string", () => {
    const fixedNow = new Date("2025-05-05T05:05:05.000Z");
    const item = {
      path: "groups/g1/campaigns/c1/chapters/chapter-02",
      oldValue: fakeTimestamp("2025-02-02T00:00:00.000Z"),
      newValueIso: "2025-02-02T00:00:00.000Z",
    };

    const entry = buildJournalEntry(item, fixedNow);

    expect(entry).not.toBeNull();
    expect(entry?.path).toBe(item.path);
    expect(entry?.field).toBe("dateModified");
    expect(entry?.newValue).toBe("2025-02-02T00:00:00.000Z");
    expect(entry?.recordedAt).toBe("2025-05-05T05:05:05.000Z");
    expect(entry?.oldValue.__type).toBe("timestamp");
  });

  it("returns null when the old value cannot be serialized as Timestamp-like (defensive path)", () => {
    const item = {
      path: "groups/g1/campaigns/c1/chapters/chapter-99",
      oldValue: "already-a-string-should-never-happen",
      newValueIso: "2025-01-01T00:00:00.000Z",
    };
    expect(buildJournalEntry(item)).toBeNull();
  });
});

describe("parseJournalLine", () => {
  it("parses a well-formed journal line", () => {
    const line = JSON.stringify({
      path: "groups/g1/campaigns/c1/chapters/chapter-02",
      field: "dateModified",
      oldValue: { __type: "timestamp", seconds: 1, nanoseconds: 0 },
      newValue: "2025-01-01T00:00:00.000Z",
      recordedAt: "2025-01-01T00:00:00.000Z",
    });

    const entry = parseJournalLine(line);
    expect(entry?.path).toBe("groups/g1/campaigns/c1/chapters/chapter-02");
  });

  it("returns null for a blank line", () => {
    expect(parseJournalLine("")).toBeNull();
    expect(parseJournalLine("   \n")).toBeNull();
  });

  it("returns null for malformed JSON rather than throwing", () => {
    expect(parseJournalLine("{not valid json")).toBeNull();
  });
});

describe("parseCliArgs", () => {
  it("parses a bare mode with no flags", () => {
    expect(parseCliArgs(["audit"])).toEqual({
      mode: "audit",
      confirm: false,
      journalPath: null,
      outPath: null,
    });
  });

  it("parses migrate with --confirm", () => {
    expect(parseCliArgs(["migrate", "--confirm"])).toEqual({
      mode: "migrate",
      confirm: true,
      journalPath: null,
      outPath: null,
    });
  });

  it("parses revert with --journal= and --confirm in either order", () => {
    expect(parseCliArgs(["revert", "--journal=./j.ndjson", "--confirm"])).toEqual({
      mode: "revert",
      confirm: true,
      journalPath: "./j.ndjson",
      outPath: null,
    });

    expect(parseCliArgs(["revert", "--confirm", "--journal=./j.ndjson"])).toEqual({
      mode: "revert",
      confirm: true,
      journalPath: "./j.ndjson",
      outPath: null,
    });
  });

  it("parses audit with --out=", () => {
    expect(parseCliArgs(["audit", "--out=./report.json"])).toEqual({
      mode: "audit",
      confirm: false,
      journalPath: null,
      outPath: "./report.json",
    });
  });

  it("returns a null mode for an unrecognized or missing mode, without throwing", () => {
    expect(parseCliArgs([]).mode).toBeNull();
    expect(parseCliArgs(["bogus"]).mode).toBeNull();
  });
});
