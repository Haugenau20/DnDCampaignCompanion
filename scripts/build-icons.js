#!/usr/bin/env node
// scripts/build-icons.js
//
// Renders every raster icon from `public/favicon.svg` (T121): `icon-192.png` and
// `icon-512.png` for the web manifest, a square `apple-touch-icon.png` (iOS
// rounds its own corners) and a 16/32/48 px `favicon.ico`. Edit the SVG, then
// run this and commit what it writes. It borrows the e2e package's Chromium:
//
//   npm --prefix e2e ci            (once per machine)
//   npx --prefix e2e playwright install chromium
//   node scripts/build-icons.js
//
// The SVG's colours are tokens written out; theme-assets.test.ts checks them.

const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(__dirname, "..", "e2e", "node_modules", "playwright"));

const outDir = path.join(__dirname, "..", "public");
const svgPath = path.join(outDir, "favicon.svg");
(async () => {
  const svg = fs.readFileSync(svgPath, "utf8");
  const square = svg.replace(/ rx="\d+"/, "");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const render = async (source, size) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${source.replace("<svg ", `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`);
    return page.screenshot({ omitBackground: true });
  };
  fs.writeFileSync(path.join(outDir, "icon-192.png"), await render(svg, 192));
  fs.writeFileSync(path.join(outDir, "icon-512.png"), await render(svg, 512));
  fs.writeFileSync(path.join(outDir, "apple-touch-icon.png"), await render(square, 180));
  // favicon.ico: PNG entries in an ICO container (Vista+ and every current browser).
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const s of sizes) pngs.push(await render(svg, s));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const dir = sizes.map((s, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(s, 0); e.writeUInt8(s, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    return e;
  });
  fs.writeFileSync(path.join(outDir, "favicon.ico"), Buffer.concat([header, ...dir, ...pngs]));
  await browser.close();
})();
