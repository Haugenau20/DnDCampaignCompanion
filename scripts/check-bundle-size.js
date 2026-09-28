#!/usr/bin/env node
// scripts/check-bundle-size.js
//
// Fails when the entry bundle outgrows its ceiling (T030). Run after
// `npm run build`: `npm run check:bundle`.
//
// Only `main.*.js` has a ceiling. It is what every visit downloads and parses
// before anything renders; a route chunk costs only the visits to that route,
// and is fetched at idle besides (`webpackPrefetch` in `app/App.tsx`).
//
// Sizes are gzipped at level 9 and reported in base-10 kB, which is what
// `react-scripts build` prints -- so the number here and the number in the
// build log are the same number.
//
// RAISING THE CEILING is allowed, and is a decision: say in the PR what grew
// and why it has to be in the entry bundle rather than in a route's chunk.
// The usual cause is an eager module (a provider, the layout, a feature
// barrel's public API) importing something only one page needs.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

/** Measured 264.23 kB on 2026-09-28, after the route split; ~4% headroom. */
const MAIN_CEILING_KB = 275;

// `BUILD_PATH` as `react-scripts build` reads it: relative to the repo, or absolute.
const jsDir = path.join(path.resolve(__dirname, "..", process.env.BUILD_PATH || "build"), "static", "js");

/** Gzipped size in kB, the way `react-scripts build` measures it. */
function gzipKb(file) {
  return zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length / 1000;
}

if (!fs.existsSync(jsDir)) {
  console.error(`No build at ${jsDir}. Run \`npm run build\` first.`);
  process.exit(2);
}

const files = fs.readdirSync(jsDir).filter((name) => name.endsWith(".js"));
const main = files.filter((name) => /^main\.[0-9a-f]+\.js$/.test(name));
if (main.length !== 1) {
  console.error(`Expected one main.*.js in ${jsDir}, found ${main.length}: ${main.join(", ")}`);
  process.exit(2);
}

const mainKb = gzipKb(path.join(jsDir, main[0]));
const chunks = files
  .filter((name) => name.endsWith(".chunk.js"))
  .map((name) => ({ name, kb: gzipKb(path.join(jsDir, name)) }))
  .sort((a, b) => b.kb - a.kb);

console.log(`main      ${mainKb.toFixed(2)} kB gzip (ceiling ${MAIN_CEILING_KB} kB)`);
console.log(`chunks    ${chunks.length}, largest ${chunks.slice(0, 3).map((c) => `${c.name} ${c.kb.toFixed(2)} kB`).join(", ")}`);

if (mainKb > MAIN_CEILING_KB) {
  console.error(
    `\nThe entry bundle is ${(mainKb - MAIN_CEILING_KB).toFixed(2)} kB over its ceiling.\n` +
      "Something that only a page needs is probably being imported from an eager module.\n" +
      "Compare `npx source-map-explorer build/static/js/main.*.js` against main, or raise\n" +
      "MAIN_CEILING_KB in scripts/check-bundle-size.js and say why in the PR."
  );
  process.exit(1);
}
