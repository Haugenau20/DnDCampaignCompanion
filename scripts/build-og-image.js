#!/usr/bin/env node
// scripts/build-og-image.js
//
// Renders `public/og-image.png`, the 1200x630 card a chat app shows when a
// link to the site is pasted (index.html's `og:image`). One picture for every
// page, join links included. Edit the HTML below, run this, and commit the PNG.
// It borrows the e2e package's Chromium, like build-icons.js:
//
//   npm --prefix e2e ci            (once per machine)
//   npx --prefix e2e playwright install chromium
//   node scripts/build-og-image.js
//
// It fetches Zilla Slab, Archivo and Noto Sans Runic from Google Fonts, so it
// needs the network. The colours are the light theme's chrome and logo tokens
// written out: a PNG cannot read the theme, and the card is the header's colour.

const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(__dirname, "..", "e2e", "node_modules", "playwright"));
const { MARK_GLYPH } = require("./rune-glyph");

const publicDir = path.join(__dirname, "..", "public");

/** `surface.chrome.bg`, `.on`, `.onMuted` and `.border` in the light theme. */
const CHROME = { bg: "#1B1611", on: "#F7EFE6", onMuted: "#B2ABA3", border: "#2F2A25" };

/** `logo.bg` and `logo.on` in the light theme: the mark's tile and its rune. */
const LOGO = { bg: "#D69253", on: "#1B1611" };

/** The header's mark (BrandMark), drawn at 72px from the same path. */
const mark = `<svg viewBox="0 0 28 28" width="72" height="72" style="display:block;flex-shrink:0">
  <rect width="28" height="28" rx="6" fill="${LOGO.bg}"/>
  <path d="${MARK_GLYPH}" fill="${LOGO.on}"/>
</svg>`;

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400&family=Zilla+Slab:wght@700&family=Noto+Sans+Runic&display=block" rel="stylesheet">
<style>
  html, body { margin: 0; }
  .card {
    width: 1200px; height: 630px; box-sizing: border-box; padding: 80px;
    position: relative; overflow: hidden; background: ${CHROME.bg};
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .watermark {
    position: absolute; right: -20px; bottom: -80px;
    font: 600px/1 'Noto Sans Runic'; color: ${CHROME.border};
  }
  .brand { position: relative; display: flex; align-items: center; gap: 24px; }
  .name { font: 700 56px/1 'Zilla Slab'; color: ${CHROME.on}; }
  .claim { position: relative; display: flex; flex-direction: column; gap: 20px; max-width: 760px; }
  .headline { font: 700 60px/1.15 'Zilla Slab'; color: ${CHROME.on}; text-wrap: balance; }
  .address { font: 400 28px/1 Archivo; color: ${CHROME.onMuted}; }
</style></head>
<body>
  <div class="card">
    <span class="watermark">ᛗ</span>
    <div class="brand">${mark}<span class="name">Muninn</span></div>
    <div class="claim">
      <span class="headline">Everything your table agreed happened, in one place</span>
      <span class="address">muninn.quest</span>
    </div>
  </div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const missing = await page.evaluate(() =>
    ["Zilla Slab", "Archivo", "Noto Sans Runic"].filter(
      (family) => ![...document.fonts].some((f) => f.family === family && f.status === "loaded")
    )
  );
  if (missing.length) throw new Error(`Fonts did not load: ${missing.join(", ")}`);
  await page.screenshot({ path: path.join(publicDir, "og-image.png") });
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
