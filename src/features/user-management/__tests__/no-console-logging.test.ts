// src/features/user-management/__tests__/no-console-logging.test.ts
import * as fs from "fs";
import * as path from "path";

/**
 * Auth and note code must not print to the console in production.
 *
 * These files handled user ids, loaded profile objects, group profiles and
 * campaign counts, and logged them on every auth state change -- noise at
 * best, profile data in a stranger's browser console at worst (T003).
 *
 * The rule is stated once, here, so the calls cannot grow back one debugging
 * session at a time. `console.error` and `console.warn` are untouched: a
 * failure someone needs to see is not this.
 */

const SOURCE_ROOTS = [
  path.join(__dirname, "..", "..", "user-management"),
  path.join(__dirname, "..", "..", "collaboration", "notes", "context"),
];

/** Every .ts/.tsx file under `dir`, excluding test files and __tests__ dirs. */
const sourceFilesUnder = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceFilesUnder(full);
    }
    if (!/\.tsx?$/.test(entry.name)) return [];
    if (/\.test\.tsx?$/.test(entry.name)) return [];
    return [full];
  });
};

describe("no console.log in auth and note code", () => {
  const offenders: string[] = [];

  beforeAll(() => {
    for (const root of SOURCE_ROOTS) {
      for (const file of sourceFilesUnder(root)) {
        const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
        lines.forEach((line, index) => {
          // Skip commented-out lines; a comment ships nothing.
          if (/^\s*(\/\/|\*)/.test(line)) return;
          if (/\bconsole\s*\.\s*log\s*\(/.test(line)) {
            offenders.push(`${path.relative(process.cwd(), file)}:${index + 1}`);
          }
        });
      }
    }
  });

  test("ships no console.log calls", () => {
    expect(offenders).toEqual([]);
  });
});
