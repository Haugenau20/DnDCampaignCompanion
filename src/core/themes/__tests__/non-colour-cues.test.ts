// src/core/themes/__tests__/non-colour-cues.test.ts
// The two shape cues, and the direction their enum branch runs in.
//
// Schema section 6. The accent and `outcome.failed` sit 40 degrees apart on a
// warm palette -- the closest pair in the schema, and the one real cost of
// choosing amber. Under deuteranopia they collapse toward each other, and in
// greyscale a progress bar's fill is the only thing separating a failed quest
// from an active one. These cues are what make both safe, so they are gated
// rather than eyeballed.

import * as fs from "fs";
import * as path from "path";

const COMPONENTS_CSS = path.join(__dirname, "..", "css", "components.css");
const raw = fs.readFileSync(COMPONENTS_CSS, "utf8");

/** Comments stripped, so prose about a cue is never mistaken for one. */
const source = raw.replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of a rule, given its selector. */
const ruleBody = (selector: string): string => {
  const at = source.indexOf(selector + " {");
  expect(at).toBeGreaterThan(-1);
  return source.slice(at, source.indexOf("}", at));
};

describe("cue.failure -- the hatch", () => {
  test("a failed bar is hatched, not merely filled", () => {
    const body = ruleBody(".progress-bar-failed");
    expect({
      fill: /background-color:\s*var\(--valence-4-fill\)/.test(body),
      hatch: /background-image:\s*repeating-linear-gradient\(\s*45deg/.test(body),
    }).toEqual({ fill: true, hatch: true });
  });

  test("nothing else is hatched", () => {
    // A texture that means two things means nothing, so `outcome.failed` is
    // the only thing that carries one.
    const hatched = [
      ...source.matchAll(/([.#][\w-]+)\s*\{[^}]*repeating-linear-gradient\(\s*45deg/g),
    ].map((m) => m[1]);
    expect(hatched).toEqual([".progress-bar-failed"]);
  });
});

describe("cue.negation -- the strike", () => {
  test("a negated label is ruled through in its own ink", () => {
    const body = ruleBody(".cue-negated");
    expect({
      strike: /text-decoration:\s*line-through/.test(body),
      hairline: /text-decoration-thickness:\s*1px/.test(body),
      // `line-through` takes `currentColor`, so the rule is the label's own
      // ink without naming a colour -- which keeps it out of the hue budget.
      namesNoColour: !/--[\w-]+|#[0-9a-fA-F]{3,8}/.test(body),
    }).toEqual({ strike: true, hairline: true, namesNoColour: true });
  });
});

describe("the enum is the only way to turn a cue off", () => {
  // Token model section 6: ornament is an enum, not a code path, so changing a
  // cue is a value change rather than an edit to a component.
  const cases: ReadonlyArray<[string, string, string]> = [
    ["--cue-failure", ".progress-bar-failed", "background-image"],
    ["--cue-negation", ".cue-negated", "text-decoration"],
  ];

  test.each(cases)("%s: none removes the cue", (token, selector, property) => {
    const opener = "@container style(" + token + ": none) {";
    const at = source.indexOf(opener);
    expect(at).toBeGreaterThan(-1);
    const block = source.slice(at, source.indexOf("\n  }", at));
    expect({
      selector: block.includes(selector + " {"),
      removes: block.includes(property + ": none"),
    }).toEqual({ selector: true, removes: true });
  });

  test("the branch runs one way only: the cue is on by default", () => {
    // The part worth pinning. A browser without style-query support ignores
    // the `@container` block entirely, so the cue must be the *default* and
    // the enum must only be able to remove it. The other way round, an
    // unsupported browser would silently drop an accessibility feature --
    // the worst possible failure for a cue whose whole job is to not depend
    // on colour.
    const blocks = [
      ...source.matchAll(/@container\s+style\([^)]*\)\s*\{[\s\S]*?\n  \}/g),
    ].map((m) => m[0]);

    expect(blocks.length).toBe(cases.length);
    expect(
      blocks.filter((block) => /repeating-linear-gradient|line-through/.test(block))
    ).toEqual([]);
  });
});
