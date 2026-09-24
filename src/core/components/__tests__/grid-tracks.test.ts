// src/core/components/__tests__/grid-tracks.test.ts
// A flexible grid track in an arbitrary template is written `minmax(0,Nfr)`.
//
// A bare `1fr` track has an automatic minimum: the min-content width of what
// sits in it. A row held on one line by `truncate` has a min-content width of
// its *whole* string, so the `truncate` never fires -- the column grows
// instead, and takes the grid, the page and the hero band with it. That
// shipped once: one rumour with a 165-character title widened the whole
// dashboard past the viewport.
//
// `min-w-0` on each child fixes the same thing, but only for as long as every
// later child remembers it. `minmax(0,1fr)` in the template cannot be undone
// by a cell, so it is the form this gate asks for. Tailwind's own
// `grid-cols-N` utilities already expand to `minmax(0,1fr)`; only the
// arbitrary `grid-cols-[...]` templates are written by hand.

import * as fs from "fs";
import * as path from "path";

const SRC = path.join(__dirname, "..", "..", "..");

/** Every .tsx under `src`, excluding test files and test infrastructure. */
function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "test-utils") continue;
      sourceFiles(full, found);
    } else if (entry.name.endsWith(".tsx") && !entry.name.includes(".test.")) {
      found.push(full);
    }
  }
  return found;
}

const relative = (file: string) => path.relative(SRC, file).replace(/\\/g, "/");

/** Every arbitrary grid template in a source text, e.g. `1.5fr_minmax(0,1fr)`. */
const templates = (source: string): string[] =>
  Array.from(source.matchAll(/grid-cols-\[([^\]]+)\]/g), (match) => match[1]);

/**
 * The tracks of a template that are a bare flexible length.
 *
 * Tracks are separated by `_` (Tailwind's space). A track written inside
 * `minmax(...)` is left alone, whatever its maximum.
 */
const bareFrTracks = (template: string): string[] =>
  template.split("_").filter((track) => /^\d*\.?\d+fr$/.test(track));

describe("arbitrary grid templates bound their flexible tracks", () => {
  const files = sourceFiles(SRC);

  it("finds source files and templates to check", () => {
    // An offender list that is empty because nothing was read is not a pass.
    expect(files.length).toBeGreaterThan(100);
    const all = files.flatMap((file) => templates(fs.readFileSync(file, "utf8")));
    expect(all.length).toBeGreaterThan(10);
  });

  it("recognises a bare track and leaves a bounded one alone", () => {
    expect(bareFrTracks("1.5fr_112px_1.15fr_26px")).toEqual(["1.5fr", "1.15fr"]);
    expect(bareFrTracks("minmax(0,1.5fr)_112px_minmax(0,1fr)")).toEqual([]);
  });

  it("writes every flexible track as minmax(0,Nfr)", () => {
    const offenders = files.flatMap((file) =>
      templates(fs.readFileSync(file, "utf8"))
        .filter((template) => bareFrTracks(template).length > 0)
        .map((template) => `${relative(file)}: grid-cols-[${template}]`)
    );
    expect(offenders).toEqual([]);
  });
});
