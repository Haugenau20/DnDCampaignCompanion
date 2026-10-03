#!/usr/bin/env node
// scripts/check-test-lint.js
//
// Lints the test files against a committed baseline that may only go down
// (T061). `npm run lint` covers app code with zero warnings allowed; the test
// files it ignores carry ~1,000 problems, mostly `testing-library/*`, that
// nothing enforced before this. Fixing them all at once is not the plan --
// files get fixed as they are touched.
//
// The baseline is per file, in scripts/test-lint-baseline.json, so a failure
// names the file that got worse rather than a total that moved.
//
//   - A file with MORE problems than its baseline fails. A file the baseline
//     does not list (a new test) is held to zero.
//   - A file with FEWER problems also fails, until the baseline is lowered in
//     the same PR: `npm run lint:tests -- --update`. Otherwise the slack is
//     spent by the next PR without anyone noticing.
//
// `--update` writes whatever the tree holds now, so it will just as happily
// record a rise. Read the baseline's diff before committing it.

const fs = require("fs");
const path = require("path");
const { ESLint } = require("eslint");

const root = path.resolve(__dirname, "..");
const baselineFile = path.join(__dirname, "test-lint-baseline.json");

/** Exactly what `npm run lint` ignores, so the two together cover all of `src/`. */
const TEST_FILES = [
  "src/**/__tests__/**/*.{ts,tsx}",
  "src/**/*.test.{ts,tsx}",
  "src/test-utils/**/*.{ts,tsx}",
  "src/__mocks__/**/*.{ts,tsx}",
  "src/setupTests.ts",
];

/** Repo-relative with forward slashes, so Windows and CI write the same keys. */
const relative = (file) => path.relative(root, file).split(path.sep).join("/");

/**
 * Lints the test files and counts problems (errors and warnings alike) per file.
 * @returns {Promise<Record<string, number>>} files with at least one problem, sorted by path
 */
async function measure() {
  const eslint = new ESLint({ cwd: root });
  const results = await eslint.lintFiles(TEST_FILES);
  const counts = {};
  for (const result of results) {
    const problems = result.errorCount + result.warningCount;
    if (problems > 0) counts[relative(result.filePath)] = problems;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

const sum = (counts) => Object.values(counts).reduce((total, n) => total + n, 0);

async function main() {
  const current = await measure();

  if (process.argv.includes("--update")) {
    fs.writeFileSync(baselineFile, JSON.stringify(current, null, 2) + "\n");
    console.log(`Baseline written: ${sum(current)} problems in ${Object.keys(current).length} files.`);
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
  const files = [...new Set([...Object.keys(baseline), ...Object.keys(current)])].sort();
  const worse = [];
  const better = [];
  for (const file of files) {
    const was = baseline[file] || 0;
    const now = current[file] || 0;
    if (now > was) worse.push(`  ${file}: ${now} (baseline ${was})`);
    if (now < was) better.push(`  ${file}: ${now} (baseline ${was})`);
  }

  console.log(`test files  ${sum(current)} problems in ${Object.keys(current).length} files (baseline ${sum(baseline)})`);

  if (worse.length > 0) {
    console.error(
      "\nThese test files have more lint problems than their baseline:\n" +
        worse.join("\n") +
        "\n\nFix the new problems (`npx eslint <file>` lists them). A new test file starts at zero."
    );
  }
  if (better.length > 0) {
    console.error(
      "\nThese test files have fewer lint problems than their baseline -- good. Lower it in this PR:\n" +
        better.join("\n") +
        "\n\nRun `npm run lint:tests -- --update` and commit scripts/test-lint-baseline.json."
    );
  }
  if (worse.length > 0 || better.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
