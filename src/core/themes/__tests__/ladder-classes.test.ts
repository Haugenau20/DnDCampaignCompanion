// src/core/themes/__tests__/ladder-classes.test.ts
//
// The narrow half of T042: a theme class handed to a component as **data**.
//
// `css-class-manifest.test.ts` walks defined-but-unapplied, and says in its own
// header that it deliberately does not walk the reverse -- over the whole tree
// that direction would report every Tailwind utility in the product. A class
// name that reaches a component as a *string prop* is invisible to both
// directions, which is how `15-3` shipped five ladder options naming classes no
// stylesheet defines, with every gate green.
//
// `15-4` removed the prop those five were passed to (`StateLadder`'s
// `selectedClassName`) rather than respelling them, and `location-presentation.ts`
// recorded that "`ladder-classes.test.ts` now does" catch it. **It did not
// exist.** `15-6` found the NPC directory still passing the removed prop --
// inert, invisible, and exactly the thing the comment claimed was watched.
//
// So this is the gate, written narrowly enough to be true: one closed
// vocabulary -- the options a `StateLadder` is given -- checked for the one
// property that no longer has a consumer.

import * as fs from "fs";
import * as path from "path";

const SRC_DIR = path.join(__dirname, "..", "..", "..");

/** Every `.ts`/`.tsx` file under `src/`, tests included. */
function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      sourceFiles(full, found);
    } else if (/\.tsx?$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

describe("a theme class passed as data (T042)", () => {
  const files = sourceFiles(SRC_DIR);

  it("nothing passes `selectedClassName`, which `StateLadder` no longer reads", () => {
    // The prop was deleted in `15-4`. TypeScript cannot catch what is left
    // behind: an options array declared as a `const` outside the JSX is a
    // wider type than the prop it is passed to, so excess-property checking
    // never runs and the dead key survives every build.
    const offenders = files
      .filter((file) => !file.endsWith(path.join("__tests__", "ladder-classes.test.ts")))
      .filter((file) => {
        // Comments are stripped first: naming the retired prop while
        // explaining why it went is exactly what several files now do, and
        // reporting those would make this gate something people switch off.
        const code = fs
          .readFileSync(file, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "");
        return /selectedClassName\s*[:?]/.test(code);
      })
      .map((file) => path.relative(SRC_DIR, file));

    expect(offenders).toEqual([]);
  });

  it("`StateLadder` itself accepts nothing but a value and a label per option", () => {
    // The other direction: if the prop is ever added back, it should be by
    // someone who has read why it went -- which is written above the interface.
    const source = fs.readFileSync(
      path.join(SRC_DIR, "shared", "components", "row-controls", "StateLadder.tsx"),
      "utf8"
    );
    const optionInterface = source.slice(
      source.indexOf("export interface StateLadderOption"),
      source.indexOf("export interface StateLadderProps")
    );

    expect(optionInterface).toContain("value: V");
    expect(optionInterface).toContain("label: string");
    expect(optionInterface).not.toContain("className");
  });
});
