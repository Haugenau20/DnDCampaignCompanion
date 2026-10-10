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

  it("draws the icon in the header's colour and the logo's amber", () => {
    const fills = [...svg.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]);
    expect(fills).toEqual([light.surface.chrome.bg, light.logo.bg]);
  });

  // A near-black square vanishes into a dark tab bar without an edge.
  it("rings the icon in the dark theme's card border", () => {
    const strokes = [...svg.matchAll(/stroke="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]);
    expect(strokes).toEqual([dark.surface.card.border]);
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

describe("the link preview", () => {
  const html = read(path.join(ROOT, "index.html"));
  const meta = (property: string): string | undefined =>
    html.match(new RegExp(`<meta property="${property}" content="([^"]*)"`))?.[1];

  // A chat app fetches the image from the live site, so the tag names it
  // there; the file it names must be one this repo ships.
  it("names a 1200x630 image that ships in public/", () => {
    const image = meta("og:image");
    expect(image).toBe("https://muninn.quest/og-image.png");
    expect(fs.existsSync(path.join(PUBLIC, new URL(image as string).pathname))).toBe(true);
    expect([meta("og:image:width"), meta("og:image:height")]).toEqual(["1200", "630"]);

    const png = fs.readFileSync(path.join(PUBLIC, "og-image.png"));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });

  // The PNG cannot read the theme, so its generator writes the chrome out.
  it("is drawn in the header's colours", () => {
    const script = read(path.join(ROOT, "scripts", "build-og-image.js"));
    const chrome = script.match(/const CHROME = (\{[^}]*\});/)?.[1];
    expect(chrome).toBeDefined();
    const literals = Object.fromEntries(
      [...(chrome as string).matchAll(/(\w+): "(#[0-9A-Fa-f]{6})"/g)].map((m) => [m[1], m[2]])
    );
    const { bg, on, onMuted, border } = light.surface.chrome;
    expect(literals).toEqual({ bg, on, onMuted, border });
  });

  it("draws the mark in the logo's colours", () => {
    const script = read(path.join(ROOT, "scripts", "build-og-image.js"));
    const logo = script.match(/const LOGO = \{ bg: "(#[0-9A-Fa-f]{6})", on: "(#[0-9A-Fa-f]{6})" \};/);
    expect(logo?.slice(1)).toEqual([light.logo.bg, light.logo.on]);
  });
});
