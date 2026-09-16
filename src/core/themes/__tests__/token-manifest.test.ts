// src/core/themes/__tests__/token-manifest.test.ts
// Every variable the stylesheets consume must be one a theme actually defines.
//
// The token model makes the produced set enumerable, which is what lets this
// check exist at all. It catches the failure a rename is most likely to cause:
// a `var(--surface-crad-bg)` that no theme defines resolves to nothing, the
// declaration becomes invalid at computed-value time, and the property
// silently falls back to inherited -- no error anywhere.
//
// Note what this cannot prove: that the right variable *wins*. Precedence is a
// separate mechanism. See 01-token-model.md section 8.

import * as fs from "fs";
import * as path from "path";
import { lightTheme } from "../definitions/lightTheme";
import { darkTheme } from "../definitions/darkTheme";
import { flattenTokens, TokenTree } from "../token-variables";

const CSS_DIR = path.join(__dirname, "..", "css");
const EXTRA_FILES = [
  path.join(__dirname, "..", "..", "..", "styles", "globals.css"),
  path.join(__dirname, "..", "..", "..", "..", "tailwind.config.js"),
];

/** Variables owned by other systems, which no theme is expected to define. */
const FOREIGN_PREFIXES = ["--tw-"];

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "");

const filesToScan = (): string[] => [
  ...fs
    .readdirSync(CSS_DIR)
    .filter((f) => f.endsWith(".css"))
    .map((f) => path.join(CSS_DIR, f)),
  ...EXTRA_FILES.filter((f) => fs.existsSync(f)),
];

/**
 * Custom properties a scanned stylesheet declares for itself.
 *
 * Not every `var()` names a theme token. `.nav-on-chrome` and its siblings
 * declare `--nav-item-on` and three others, whose whole purpose is that
 * `.nav-item` does not hard-wire a surface (D107) -- the indirection is the
 * fix for R40, so the variables cannot come from a theme by construction.
 *
 * Collected rather than allow-listed by prefix, which is what `--tw-` gets
 * below. A prefix exemption would also excuse `--nav-item-onn`; this does not,
 * because a misspelling is still consumed-but-never-declared and still fails.
 */
const declaredInCss = (): Set<string> => {
  const out = new Set<string>();
  filesToScan().forEach((file) => {
    const source = stripComments(fs.readFileSync(file, "utf8"));
    for (const match of source.matchAll(/(--[A-Za-z0-9-]+)\s*:/g)) {
      out.add(match[1]);
    }
  });
  return out;
};

const defined = new Set([
  ...Object.keys(flattenTokens(lightTheme.tokens as unknown as TokenTree)),
  ...declaredInCss(),
]);

describe("token manifest", () => {
  test("the generated set is non-trivial", () => {
    expect(defined.size).toBeGreaterThan(90);
  });

  test("finds files to scan", () => {
    expect(filesToScan().length).toBeGreaterThan(0);
  });

  test("every consumed variable is defined by the theme", () => {
    const unknown: Array<{ file: string; variable: string }> = [];

    filesToScan().forEach((file) => {
      const source = stripComments(fs.readFileSync(file, "utf8"));
      const consumed = source.matchAll(/var\(\s*(--[A-Za-z0-9-]+)/g);
      for (const match of consumed) {
        const variable = match[1];
        if (FOREIGN_PREFIXES.some((p) => variable.startsWith(p))) continue;
        if (!defined.has(variable)) {
          unknown.push({ file: path.basename(file), variable });
        }
      }
    });

    // De-duplicate so one bad name used twenty times reads as one problem.
    const distinct = [...new Map(unknown.map((u) => [u.variable, u])).values()];
    expect(distinct).toEqual([]);
  });
});

/**
 * The other direction: a variable a theme is *supposed* to define.
 *
 * The block above walks consumed to defined, which is the direction a rename
 * breaks. It cannot see a token that exists but is not yet used anywhere --
 * and that is exactly what an additive PR produces. 12-2 adds the semantic
 * scales with **no consumers**, deliberately, so that 12-3 can be reverted on
 * its own without leaving the application unstyled (token model section 5).
 *
 * Without this block, a whole scale could be misnamed, half-defined, or absent
 * from one theme, and every gate in the project would stay green until 12-3a
 * wired it up. Enumerating it is what makes "additive" checkable rather than
 * merely invisible.
 *
 * 12-2b adds 26 more of the same kind: the `accent`, `feedback` and
 * `disposition` scales, which 12-3a and 12-3b give consumers. They are listed
 * here for the same reason and will stay listed until those PRs land -- at
 * which point the block above starts covering them from the other direction.
 */
describe("tokens with no consumers yet are still enumerated", () => {
  const EXPECTED = [
    // 12-2
    "--outcome-succeeded",
    "--outcome-failed-ink",
    "--outcome-failed-fill",
    "--cue-failure",
    "--cue-negation",
    // 12-2b
    "--accent-ink",
    "--accent-edge",
    "--accent-fill",
    "--accent-hover",
    "--accent-on",
    "--accent-ring",
    "--outcome-failed-on",
    // 13 -- the valence ramp
    "--valence-0-ink",
    "--valence-0-fill",
    "--valence-1-ink",
    "--valence-1-fill",
    "--valence-2-ink",
    "--valence-2-fill",
    "--valence-3-ink",
    "--valence-3-fill",
    "--feedback-error-ink",
    "--feedback-error-edge",
    "--feedback-error-wash",
    "--feedback-warning-ink",
    "--feedback-warning-edge",
    "--feedback-warning-wash",
    "--feedback-success-ink",
    "--feedback-success-edge",
    "--feedback-success-wash",
    "--feedback-progress-ink",
    "--feedback-progress-edge",
    "--feedback-progress-wash",
    "--disposition-friendly",
    "--disposition-neutral",
    "--disposition-hostile",
    "--disposition-unknown",
    "--danger-confirm-bg",
    "--danger-confirm-text",
  ];

  const THEMES: ReadonlyArray<[string, TokenTree]> = [
    ["light", lightTheme.tokens as unknown as TokenTree],
    ["dark", darkTheme.tokens as unknown as TokenTree],
  ];

  test.each(THEMES)("%s defines every semantic-scale variable", (_name, tokens) => {
    const produced = flattenTokens(tokens);
    const missing = EXPECTED.filter((v) => !(v in produced));
    expect(missing).toEqual([]);
  });

  test.each(THEMES)("%s gives each of them a non-empty value", (_name, tokens) => {
    const produced = flattenTokens(tokens);
    const empty = EXPECTED.filter((v) => (produced[v] ?? "").trim().length === 0);
    expect(empty).toEqual([]);
  });

  // No fallback chains, and none needed. Section 5's fallback rule exists for
  // partial migration -- a theme that has not been migrated must still render.
  // Both themes are generated from one contract now, so a token cannot exist
  // in one and not the other, and a `var(--x, var(--y))` chain here would be
  // dead weight pretending to be safety.
  test("both themes define them, so no fallback is required", () => {
    const [light, dark] = THEMES.map(([, t]) => flattenTokens(t));
    expect(EXPECTED.map((v) => [v, v in light, v in dark])).toEqual(
      EXPECTED.map((v) => [v, true, true])
    );
  });

  /*
   * The count, as its own assertion.
   *
   * The list above names what this PR adds, so it goes stale the moment a
   * later PR deletes something -- and a stale allow-list fails open. The total
   * does not: `status.*` leaving in 12-3a has to move this number, which is
   * what makes the deletion visible here rather than only in the fixture.
   */
  test.each(THEMES)("%s defines the schema's leaves, less what has retired", (_name, tokens) => {
    // 135 in the fixture, less the twelve names 12-3a and 12-3b delete:
    // six `status.*`, three `color.*` and three `state.*`.
    expect(Object.keys(flattenTokens(tokens)).length).toBe(127);
  });
});

/**
 * The third direction: a variable a theme defines that nothing consumes.
 *
 * Neither block above can see this. The first walks consumed to defined, which
 * is what a rename breaks; the second enumerates tokens landed ahead of their
 * consumers, which is what an additive PR produces. Between them sits the case
 * that actually accumulates: a token that *had* consumers and lost them, when a
 * scale is replaced and its classes are deleted one PR at a time.
 *
 * That is not hypothetical. The valence ramp took every consumer the knowledge
 * ladder had, and the ladder, its three CSS classes, its three Tailwind
 * utilities and five `RosterStatusTone` values sat dead in the tree until
 * somebody read the diff and asked. Nothing was red. Every gate passed.
 *
 * So an unconsumed variable is allowed, but it has to be *declared*, with the
 * reason, and the list is checked in both directions: a new orphan fails, and
 * so does an entry that has quietly gained a consumer and should have been
 * removed from the list.
 */
describe("every variable a theme defines is either consumed or declared unused", () => {
  /** Variables no stylesheet reads, each with the reason it is still emitted. */
  const UNCONSUMED: Readonly<Record<string, string>> = {
    "--scheme":
      "Identity, not paint. Names which theme is applied; nothing draws with it.",
    "--accent-on":
      "The accent's paired ink. Buttons reach for --action-primary-text, which " +
      "resolves to the same value through the role map, so this name has never " +
      "been the one consumed.",
    "--surface-band-selected":
      "Surface pairs are emitted whole -- bg, on, onMuted, border, hover, " +
      "selected -- so that a surface cannot be given a state belonging to " +
      "another. The band has no selectable element yet; the hole would be the " +
      "defect, not the unused member.",
    "--surface-page-border":
      "As --surface-band-selected: a complete pair, one member unused.",
    "--outcome-failed-ink":
      "outcome.* lost its consumers to the valence ramp (D41). The scale stays " +
      "because it is still the documented source for feedback.error, " +
      "disposition.hostile, the field error states and danger.deleteText -- " +
      "each of which emits its own variable carrying this value -- and because " +
      "--outcome-succeeded is still painted by .progress-bar-read.",
    "--outcome-failed-fill": "As --outcome-failed-ink.",
    "--outcome-failed-on": "As --outcome-failed-ink.",
    // `--feedback-success-wash` used to sit here. Its entry ended: "a future
    // success banner should find its ground already defined rather than reach
    // for the error one's." Phase 14.4 is that future -- `/join` confirms an
    // invitation read from a link with a standing banner, and
    // `.feedback-banner-success` is back, composed from the wash and edge this
    // scale had kept waiting. Removed from the list because it now has a
    // consumer, which is precisely what this gate exists to notice.
    "--feedback-progress-wash":
      "The feedback scale defines wash and edge for all four states; only " +
      "error, warning and now success have banners. `.feedback-banner-progress` " +
      "was deleted as dead (R73, D122) and was the sole reader of this wash. " +
      "The edge survives, because `.feedback-progress-edge` is applied " +
      "directly. Kept rather than dropped from the scale: the gap is in the " +
      "consumers, not the contract.",
  };

  /** Every way a stylesheet can read a variable, including a style query. */
  const consumedVariables = (): Set<string> => {
    const out = new Set<string>();
    filesToScan().forEach((file) => {
      const source = stripComments(fs.readFileSync(file, "utf8"));
      for (const m of source.matchAll(/var\(\s*(--[A-Za-z0-9-]+)/g)) out.add(m[1]);
      // `@container style(--cue-failure: none)` reads a variable without var().
      for (const m of source.matchAll(/style\(\s*(--[A-Za-z0-9-]+)/g)) out.add(m[1]);
    });
    return out;
  };

  const themeVariables = Object.keys(
    flattenTokens(lightTheme.tokens as unknown as TokenTree)
  );

  test("no variable is orphaned without being declared", () => {
    const consumed = consumedVariables();
    const orphaned = themeVariables
      .filter((v) => !consumed.has(v))
      .filter((v) => !(v in UNCONSUMED));
    expect(orphaned).toEqual([]);
  });

  test("and nothing on the list has quietly gained a consumer", () => {
    // The half that keeps the list honest. Without it the list only ever grows,
    // and a name listed as unused stays listed long after it is wired up --
    // which is how an exemption stops describing anything.
    const consumed = consumedVariables();
    const nowUsed = Object.keys(UNCONSUMED).filter((v) => consumed.has(v));
    expect(nowUsed).toEqual([]);
  });

  test("every declared name is still a variable the theme defines", () => {
    // And the other stale case: a name deleted from the tree but left on the
    // list, which would silently excuse a future token of the same name.
    const known = new Set(themeVariables);
    const gone = Object.keys(UNCONSUMED).filter((v) => !known.has(v));
    expect(gone).toEqual([]);
  });
});
