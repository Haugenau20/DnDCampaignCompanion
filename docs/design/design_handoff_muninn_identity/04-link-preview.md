# 04 · Link preview (Open Graph)

## Image
- `public/og-image.png`, 1200×630, one static image for every page.
- Background: chrome `#1B1611`, with 80px padding.
- Top left: the mark (72px square, radius 14, amber with the ᛗ glyph in the chrome colour) + "Muninn" in Zilla Slab 700, 56px, `#F7EFE6`, with a 24px gap.
- Bottom left, max width about 760px: "Everything your table agreed happened, in one place" in Zilla Slab 700, 60px, line-height 1.15, `#F7EFE6`. Below it, "muninn.quest" in Archivo 28px, `#B2ABA3`.
- Watermark: ᛗ at about 600px in `#2F2A25`, bleeding off the bottom-right corner, behind the text.
- See the "404 and link preview" section of `design/Muninn Mockups.dc.html` (shown at 50% scale).
- Make it with a one-off script (e.g. Playwright screenshot of a small HTML file, or satori), commit the PNG, and put the generator script in `scripts/`.

## Meta tags (`index.html`)
```html
<meta name="description" content="A shared record for your tabletop campaign: chapters, quests, NPCs, locations and rumors, kept between sessions.">
<meta property="og:site_name" content="Muninn">
<meta property="og:title" content="Muninn">
<meta property="og:description" content="Everything your table agreed happened, in one place.">
<meta property="og:url" content="https://muninn.quest/">
<meta property="og:image" content="https://muninn.quest/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
```
Replace the current description "Muninn - Track your adventures, quests, and NPCs".

## Done when
- Pasting `https://muninn.quest` and a join link into Discord shows the card. Discord caches previews, so test with a query string to bypass the cache.
