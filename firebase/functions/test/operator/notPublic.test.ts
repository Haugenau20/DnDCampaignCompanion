// functions/test/operator/notPublic.test.ts
//
// T137: the operator page runs behind Identity-Aware Proxy, as its own
// service. Anything `src/index.ts` exports is deployed as a public Cloud
// Function, outside that proxy, so nothing from `src/operator/` may reach it,
// directly or through another module.
import * as fs from "fs";
import * as path from "path";

const SRC = path.resolve(__dirname, "../../src");

/** Every `.ts` file under `dir`. */
function sources(dir: string): string[] {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return entry.name.endsWith(".ts") ? [full] : [];
  });
}

/** The relative modules a file imports or re-exports, resolved to paths. */
function importsOf(file: string): string[] {
  const text = fs.readFileSync(file, "utf8");
  const specifiers = [...text.matchAll(/(?:from|import|require\()\s*["'](\.[^"']+)["']/g)]
    .map((match) => match[1]);
  return specifiers.map((specifier) => path.resolve(path.dirname(file), specifier));
}

const OPERATOR = path.join(SRC, "operator");
const inOperator = (file: string) => file.startsWith(OPERATOR + path.sep) || file === OPERATOR;

describe("the operator code", () => {
  it("exists, so this test is looking in the right place", () => {
    expect(sources(OPERATOR).length).toBeGreaterThan(0);
  });

  it("is imported by no module outside it, so src/index.ts cannot export it", () => {
    const leaks = sources(SRC)
      .filter((file) => !inOperator(file))
      .flatMap((file) => importsOf(file)
        .filter(inOperator)
        .map((target) => `${path.relative(SRC, file)} -> ${path.relative(SRC, target)}`));

    expect(leaks).toEqual([]);
  });

  it("is not named in src/index.ts", () => {
    expect(fs.readFileSync(path.join(SRC, "index.ts"), "utf8")).not.toMatch(/operator/i);
  });
});
