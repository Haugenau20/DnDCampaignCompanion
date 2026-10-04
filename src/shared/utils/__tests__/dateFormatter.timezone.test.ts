// src/shared/utils/__tests__/dateFormatter.timezone.test.ts
//
// T096: a stored `YYYY-MM-DD` is a calendar date, not an instant. Parsed with
// `new Date`, it became UTC midnight, which is still the previous evening
// anywhere west of UTC, so a 2025-05-31 note read 30/05 in Los Angeles.
//
// The defect only shows in a zone west of UTC, and a jest worker's zone is
// fixed when it starts: assigning `process.env.TZ` in a test changes jest's
// copy of the environment, not the process's. So the real module is run in a
// child Node process started in the zone under test. `dateFormatter.ts`
// imports nothing, so transpiling it alone is enough to load it there.
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import ts from "typescript";

const compiled = ts.transpileModule(
  readFileSync(path.join(__dirname, "..", "dateFormatter.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }
).outputText;

/**
 * Run `formatNoteDate` over `values` in the given IANA zone.
 * @returns Each rendered value, plus the zone's offset on 2025-05-31
 */
function formatInZone(timeZone: string, values: string[]): { offset: number; rendered: string[] } {
  const script = `
    const module = { exports: {} };
    new Function("module", "exports", ${JSON.stringify(compiled)})(module, module.exports);
    const { formatNoteDate, toNoteDate } = module.exports;
    const values = ${JSON.stringify(values)}.map((v) =>
      v === "@toNoteDate" ? toNoteDate(new Date("2025-05-31T12:00:00.000Z")) : v
    );
    process.stdout.write(JSON.stringify({
      offset: new Date(2025, 4, 31).getTimezoneOffset(),
      rendered: values.map(formatNoteDate),
    }));
  `;
  const output = execFileSync(process.execPath, ["-"], {
    input: script,
    env: { ...process.env, TZ: timeZone },
  });
  return JSON.parse(output.toString());
}

describe("formatNoteDate west of UTC (T096)", () => {
  const { offset, rendered } = formatInZone("America/Los_Angeles", [
    "2025-05-31",
    "2025-06-01",
    "2025-01-01",
    "2025-05-31T19:27:30.387Z",
    "2025-06-01T03:00:00.000Z",
    "@toNoteDate",
    "2025-02-30",
  ]);
  const [may31, june1, newYear, isoSameDay, isoEvening, roundTrip, impossible] = rendered;

  it("is actually running west of UTC", () => {
    expect(offset).toBeGreaterThan(0);
  });

  it("renders a stored calendar date as that same day", () => {
    expect(may31).toBe("31/05/2025");
  });

  it("renders the first of a month and of a year without rolling back", () => {
    expect(june1).toBe("01/06/2025");
    expect(newYear).toBe("01/01/2025");
  });

  it("still renders a legacy full ISO timestamp as its local day", () => {
    // 19:27 UTC on the 31st is 12:27 the same day in Los Angeles.
    expect(isoSameDay).toBe("31/05/2025");
    // 03:00 UTC on the 1st is still the evening of the 31st there.
    expect(isoEvening).toBe("31/05/2025");
  });

  it("reads back the day toNoteDate wrote", () => {
    expect(roundTrip).toBe("31/05/2025");
  });

  it("returns an impossible calendar date untouched", () => {
    expect(impossible).toBe("2025-02-30");
  });
});

describe("formatNoteDate east of UTC", () => {
  it("renders a stored calendar date as that same day", () => {
    const { offset, rendered } = formatInZone("Pacific/Auckland", ["2025-05-31"]);
    expect(offset).toBeLessThan(0);
    expect(rendered).toEqual(["31/05/2025"]);
  });
});
