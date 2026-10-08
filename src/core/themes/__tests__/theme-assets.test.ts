// src/core/themes/__tests__/theme-assets.test.ts
// The site's icons and browser colours carry theme colours as literals (T121):
// `index.html`, the web manifest and `favicon.svg` are read before any CSS, so
// they cannot use the theme's variables. This keeps each literal equal to the
// token it stands for, so a change to the palette cannot leave them behind.

import * as fs from "fs";
import * as path from "path";
import { deriveTokens } from "../derive";

const ROOT = path.join(__dirname, "..", "..", "..", "..");
const PUBLIC = path.join(ROOT, "public");
const read = (file: string): string => fs.readFileSync(file, "utf8");

const light = deriveTokens("light");
const dark = deriveTokens("dark");

/** The value of the `theme-color` meta tag for one colour scheme. */
const themeColorFor = (html: string, scheme: "light" | "dark"): string | undefined =>
  html.match(
    new RegExp(
      `<meta name="theme-color" content="(#[0-9A-Fa-f]{6})" media="\\(prefers-color-scheme: ${scheme}\\)"`
    )
  )?.[1];

describe("theme colours outside the stylesheets", () => {
  const html = read(path.join(ROOT, "index.html"));
  const manifest = JSON.parse(read(path.join(PUBLIC, "manifest.json")));
  const svg = read(path.join(PUBLIC, "favicon.svg"));

  it("colours the browser bar like the header, in each scheme", () => {
    expect(themeColorFor(html, "light")).toBe(light.surface.chrome.bg);
    expect(themeColorFor(html, "dark")).toBe(dark.surface.chrome.bg);
    expect(manifest.theme_color).toBe(light.surface.chrome.bg);
  });

  it("opens an installed app on the page's own background", () => {
    expect(manifest.background_color).toBe(light.surface.page.bg);
  });

  it("draws the icon in the header's colour and the dark accent", () => {
    const fills = [...svg.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]);
    expect(fills).toEqual([light.surface.chrome.bg, dark.accent.fill]);
  });
});

describe("the icons the page and manifest name", () => {
  const html = read(path.join(ROOT, "index.html"));
  const manifest = JSON.parse(read(path.join(PUBLIC, "manifest.json")));
  const linked = [
    ...[...html.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="\/([^"]+)"/g)].map((m) => m[1]),
    ...manifest.icons.map((icon: { src: string }) => icon.src.replace(/^\//, "")),
  ];

  it("names the icon, the touch icon and the manifest's sizes", () => {
    expect(linked).toEqual(
      expect.arrayContaining(["favicon.ico", "favicon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png"])
    );
  });

  // Hosting rewrites every unknown path to index.html, so a missing icon is
  // served as a web page rather than failing (`/favicon.ico` did, before T121).
  it.each(linked)("ships %s in public/", (file) => {
    expect(fs.existsSync(path.join(PUBLIC, file))).toBe(true);
  });
});
