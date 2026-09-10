// src/core/components/__tests__/raw-controls.test.ts
// A form control is rendered by its primitive, not by hand.
//
// This exists because a grep proved the wrong thing once. PR 09-2 converted
// `NoteEditor`'s body to `Input isTextArea` and recorded that it was "the last
// one", on the strength of
//
//     grep -rn '<textarea' src/features src/pages
//
// which returned nothing. It was accurate about what it checked: `ContactForm`
// lives in `src/shared/components/`, and it had a raw `<textarea>` the whole
// time. The sentence the grep supported was wrong, and it took until 10-3 to
// notice (R43).
//
// So the check is written down rather than retyped, and it walks all of `src`.
// The next person's "that was the last one" is either true or this fails.

import * as fs from "fs";
import * as path from "path";

const SRC = path.join(__dirname, "..", "..", "..");

/**
 * Files allowed to render a raw `<textarea>`, by repo-relative path.
 *
 * `Input.tsx` is the primitive itself -- something has to render the element.
 * Nothing else qualifies: a caller that needs a textarea needs `Input
 * isTextArea`, which is what carries the label association, the error slot and
 * the field's own paint.
 */
const TEXTAREA_ALLOWED = ["core/components/Input.tsx"];

/**
 * Files allowed to render a raw `<select>`.
 *
 * `Select.tsx` is the primitive. `Roster.tsx` is the deliberate exception, and
 * it is worth stating so nobody "fixes" it: `RosterFilterSelect` is a filter
 * *pill* that happens to be a dropdown, for the case pills cannot serve -- an
 * option set derived from the data, where a campaign with forty locations
 * would otherwise get forty pills. It wears the pills' geometry and their
 * active/idle treatment so a filter row mixing the two reads as one control
 * set, and it is named by `aria-label`. `Select` renders a labelled form
 * field, which is the right thing in a form and the wrong thing in a filter
 * row.
 */
const SELECT_ALLOWED = ["core/components/Select.tsx", "core/components/Roster.tsx"];

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

/** Strips block and line comments, so an explanation cannot trip the gate. */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const relative = (file: string) => path.relative(SRC, file).replace(/\\/g, "/");

describe("form controls come from the primitive", () => {
  const files = sourceFiles(SRC);

  it("finds source files to check", () => {
    // R31: an offender list that is empty because nothing was read is not a
    // pass. This is the positive half.
    expect(files.length).toBeGreaterThan(100);
    expect(files.map(relative)).toContain("core/components/Input.tsx");
  });

  it("renders no raw <textarea> outside Input", () => {
    const offenders = files
      .filter((file) => !TEXTAREA_ALLOWED.includes(relative(file)))
      .filter((file) => /<textarea[\s/>]/.test(stripComments(fs.readFileSync(file, "utf8"))))
      .map(relative);

    expect(offenders).toEqual([]);
  });

  it("renders no raw <select> outside Select", () => {
    // Phase 8 removed all 13 of these (R21, R23) and the A5 measurement found
    // zero left. Same shape of claim as the one above, so it gets the same
    // kind of guard rather than another grep somebody has to remember to run.
    // It immediately found the one this codebase keeps on purpose -- see
    // SELECT_ALLOWED, and note that the A5 measurement's "zero raw <select>"
    // was true of A5 and not of `src`.
    const offenders = files
      .filter((file) => !SELECT_ALLOWED.includes(relative(file)))
      .filter((file) => /<select[\s/>]/.test(stripComments(fs.readFileSync(file, "utf8"))))
      .map(relative);

    expect(offenders).toEqual([]);
  });
});
