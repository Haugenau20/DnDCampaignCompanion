// src/features/user-management/__tests__/no-console-logging.test.ts
import * as fs from "fs";
import * as path from "path";

/**
 * Code handling user, group and campaign data must not print it to the
 * console in production.
 *
 * These files logged user ids, loaded profile objects, group profiles,
 * campaign ids and names, and Cloud Function result payloads -- on every auth
 * state change and every campaign load. Noise at best, someone's profile in a
 * stranger's browser console at worst (T003).
 *
 * The rule is stated once, here, so the calls cannot grow back one debugging
 * session at a time. `console.error` and `console.warn` are untouched: a
 * failure someone needs to see is not this.
 *
 * Scope is deliberately per-file rather than "all of core/services". Three
 * call sites there are legitimate and must keep working:
 * `firebaseConfig.ts` logs emulator wiring behind an explicit
 * `NODE_ENV === "development"` guard AND is pinned by its own suite asserting
 * those calls happen; `BaseFirebaseService` and `AuthService` each emit one
 * environment diagnostic carrying no user data. Widening this walk to the
 * whole directory would fail on all three and invite someone to "fix" a
 * correct guard.
 */

const SOURCE_ROOTS = [
  path.join(__dirname, "..", "..", "user-management"),
  path.join(__dirname, "..", "..", "collaboration", "notes", "context"),
];

/** Individual files outside those roots that carry the same obligation. */
const SOURCE_FILES = [
  path.join(__dirname, "..", "..", "..", "core", "services", "firebase", "campaign", "CampaignService.ts"),
  path.join(__dirname, "..", "..", "..", "core", "services", "firebase", "group", "GroupService.ts"),
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

describe("no console.log in auth, note and campaign code", () => {
  const offenders: string[] = [];
  let scanned = 0;

  beforeAll(() => {
    const targets = SOURCE_ROOTS.flatMap(sourceFilesUnder).concat(SOURCE_FILES);

    for (const file of targets) {
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
      scanned += 1;
      lines.forEach((line, index) => {
        // Skip commented-out lines; a comment ships nothing.
        if (/^\s*(\/\/|\*)/.test(line)) return;
        if (/\bconsole\s*\.\s*log\s*\(/.test(line)) {
          offenders.push(`${path.relative(process.cwd(), file)}:${index + 1}`);
        }
      });
    }
  });

  test("ships no console.log calls", () => {
    expect(offenders).toEqual([]);
  });

  /*
    Without this, a walk that silently resolved to nothing -- a renamed
    directory, a typo in a path -- would report zero offenders and pass, which
    is indistinguishable from the rule being honoured. This very test was
    briefly in that state while being extended: the two added files were
    listed but never actually read, and it went green anyway. The guard has to
    prove it looked.
  */
  test("actually scanned the files it claims to guard", () => {
    expect(scanned).toBeGreaterThan(20);
    for (const file of SOURCE_FILES) {
      expect(fs.existsSync(file)).toBe(true);
    }
  });
});
