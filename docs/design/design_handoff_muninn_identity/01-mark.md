# 01 · The mark (ᛗ)

## Glyph
- Character: **ᛗ**, U+16D7 RUNIC LETTER MANNAZ MAN M.
- Source: **Noto Sans Runic** (Google Fonts, OFL licence).

## Icon files (favicon, apple-touch, manifest)
The glyph's strokes are too thin at 16px, so **don't render it from the font in the icon files**. Make it vector paths instead:
1. Extract the ᛗ outline from Noto Sans Runic as an SVG path, using fonttools or opentype.js.
2. Thicken the strokes to roughly match the stroke weight of the current slab M in `public/favicon.svg`. Check that it reads clearly at 16×16.
3. Build `public/favicon.svg` with the same frame as today: a 64×64 viewBox, a rounded square (rx 12) filled with chrome `#1B1611`, and the glyph in amber `#D69253`, centred, filling about 70% of the height.
4. Regenerate the PNG icons from that SVG, replacing the existing files at the same paths and sizes: `apple-touch-icon.png` (180) and the `manifest.json` icons (192, 512, plus any others listed). Use a corner radius of about 18% for the larger sizes.
5. Dark browser tabs: add a 1px ring in `#3B3630` just inside the rounded square so the dark square doesn't disappear against a dark tab bar.

Keep the old M SVG in git history and don't delete anything else.

## Header (`src/app/layout/Header.tsx`)
- Add the mark **to the left of** the existing "Muninn" wordmark. Leave everything else in the header as it is.
- The mark is a 28×28 square with 6px radius, filled amber (`#D69253`, the existing amber/brand token if there is one), with the ᛗ glyph in the chrome colour (`#1B1611` light / `#0A0704` dark) at about 20px.
- Gap between mark and wordmark: 12px (or the header's existing gap).
- The mark and wordmark together form one link to home, as the wordmark does today. Put `aria-hidden` on the glyph so screen readers only announce "Muninn".
- In the header, render the glyph with the font (see below), not as an SVG, so it inherits colour. (An inline SVG built from the step-1 path is also fine.)
- **Dark theme:** the amber square is accepted as the one bright brand element. The fallback, if review finds it too loud, is the amber glyph on the chrome colour with a 1px `#3B3630` ring.

## Font loading
Load Noto Sans Runic **with only that one character**, so it costs almost nothing:
```
https://fonts.googleapis.com/css2?family=Noto+Sans+Runic&text=%E1%9B%97&display=swap
```
Follow however the app loads Zilla Slab and Archivo today (a `<link>` in `index.html`, or self-hosting). If fonts are self-hosted, subset the file to U+16D7 only.

Add a utility class or component, e.g. `<RuneMark size=… />`, that renders `<span aria-hidden="true" style="font-family:'Noto Sans Runic'">ᛗ</span>`. It's reused by empty states, the 404, the About page and the sign-in band.

## Tab titles
Format: `{Page} · {Campaign} · Muninn`, e.g. "Quests · The Sunless Citadel · Muninn". Leave out parts that don't apply ("About · Muninn", or just "Muninn" on the signed-out home). Use ` · ` (a middle dot with spaces) as the separator. If there is no title hook yet, add a small `useDocumentTitle` hook.

## Done when
- The favicon shows ᛗ in light and dark browser chrome and reads clearly at 16px.
- The header shows mark + wordmark in both themes, and nothing else in the header moved.
- Network: the runic font request is a few KB at most.
