# Handoff: Muninn identity (mark, voice, About page)

## Overview
The app was renamed **Muninn** (domain **muninn.quest**). In Norse myth, Muninn ("memory") is one of Odin's two ravens. This handoff works the name into the existing UI **without a redesign**:

1. **The mark** — the runic M **ᛗ** (U+16D7, "mannaz") replaces the slab "M" in the favicon and app icons, and goes next to the header wordmark.
2. **The voice** — on a few rarely-seen surfaces, Muninn is used as the subject of a plain sentence (e.g. "Muninn hasn't heard any rumors yet").
3. **An About page** — a new public route, `/about`.
4. **A link preview image** — an Open Graph image for links pasted into Discord and other chat apps.

Nothing else changes: rows, lists, filters, nav, buttons and layout stay as they are.

## About the design files
The `.dc.html` files in `design/` are **design references built in HTML**. They show the intended look and copy; they are not production code. Rebuild them in the existing React + TypeScript app using its components, theme CSS variables (`src/core/themes/css/variables.css`) and patterns. **Use theme variables, not the hex values below.** The hex values are only there to help you map each colour to the right variable.

Open the files in a browser to view them (each needs `support.js` next to it, and it's included).

## Fidelity
**High-fidelity for copy and placement; existing design system for styling.** The copy is final. Mark placement and sizes are final. Spacing and colours should come from the existing tokens and components; where a mock and the codebase differ slightly, the codebase wins.

## The voice rule (read first)
`docs/design/design-language.md` §11 says: *"Chrome copy is plain and short — the app does not perform."* The Muninn lines are a deliberate, limited exception. Add this sentence to §11:

> Muninn may be named as the record's subject on low-frequency surfaces (empty states for a whole section, sign-in, signed-out home, 404, About). It never narrates, and it never appears in buttons, labels, nav, toasts, errors or filtered "no results" states.

Do not add Muninn lines anywhere not listed in `02-copy.md`.

## Task files, in suggested order
- `01-mark.md` — favicon, app icons, header mark, runic font loading, tab titles
- `02-copy.md` — every copy change, with file locations
- `03-about-page.md` — the new `/about` route
- `04-link-preview.md` — Open Graph image and meta tags

Each task file can be done and shipped as its own PR.

## Open decision (use the default unless told otherwise)
- **rumor / rumour.** The app uses both spellings. **Default: "rumor" everywhere**, which matches the existing lists and prompts. The About page mock says "rumour"; change it to "rumor".

## Design tokens referenced in the mocks
Light: chrome `#1B1611` · hero band `#26211C` · page `#F2EBE4` · card `#FCF5EE` · border `#E8E2DB` / `#DFD8D1` · ink `#211C16` · muted ink `#605953` · accent `#8D4F00` (hover `#723F00`, on-accent `#FDF5ED`) · chrome ink `#F7EFE6` · chrome muted `#B2ABA3` · chrome border `#2F2A25` · amber `#D69253` · watermark glyph on band `#3A342F`

Dark: chrome `#0A0704` · hero band `#14100B` · page `#201B16` · card `#2A2520` · border `#3B3630` · ink `#E9E1D9` · muted ink `#AEA69F` · chrome ink `#F3EBE3` · chrome muted `#ABA39B` · accent `#D69253` (on-accent `#120D08`)

Type: Zilla Slab (display: wordmark, headings, italic lines), Archivo (UI and body), Noto Sans Runic (the ᛗ glyph only).

## Files
- `design/Muninn Mockups.dc.html` — header, empty states, sign-in, signed-out home, 404, link preview, mark at sizes, copy sheet (light and dark)
- `design/About.dc.html` — the About page
- `design/Muninn Identity.dc.html` — background only: the four angles considered. The chosen direction is 1c (mark) + 1b (voice). Don't implement the others.
