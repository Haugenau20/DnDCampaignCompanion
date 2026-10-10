# 03 · About page (`/about`)

Reference: `design/About.dc.html`.

## Route
- `/about` is public and works signed in or out.
- It uses the normal app header and footer. When signed out, the header is the minimal version (mark, wordmark, theme toggle, Sign in), the same as on the signed-out home.
- Link to it from the footer ("About") and from the signed-out home ("About the name").
- Tab title: "About · Muninn".

## Layout
- **Hero band**: full width, hero-band colour, 72px top and 64px bottom padding.
  - Content column max 720px, centred, 16px vertical gap.
  - A decorative ᛗ watermark sits on the right: 280px, in the band's subtle tone (`#3A342F` light), vertically centred, `aria-hidden`, `pointer-events:none`. Its right edge is `max(24px, calc(50% - 600px))`. **Hide it below roughly 720px viewport width** if it collides with the text.
  - Eyebrow "ABOUT": 11px, weight 600, letter-spacing 0.12em, uppercase, chrome muted.
  - H1: Zilla Slab 700, `clamp(34px, 5vw, 52px)`, line-height 1.08, chrome ink.
  - Lead: Archivo 18px, line-height 1.55, chrome muted, max 560px.
- **Body**: page background, 64px top and 88px bottom padding, one column max 720px, 56px gap between sections.
  - Section heading (H2): Zilla Slab 700, 30px, line-height 1.15. Body text: Archivo 17px, line-height 1.7.
- **"The name"** is a card: card background, 1px border, radius 10px, padding 32px. It's a two-column grid, text on the left and a large ᛗ on the right (96px, accent colour, `aria-hidden`). The opening paragraph is italic Zilla Slab 20px.
- **"Who made it"**: the text, then a row of buttons.
  - "View the code on GitHub" is a secondary (outline) button linking to `https://github.com/Haugenau20/DnDCampaignCompanion`.
  - "Buy me a coffee" is a primary button, **hidden behind a flag for now**. Add the slot in code but turn it off.
  - A photo slot (140×168, radius 8) sits left of the text, **also off for now**.
- **Closing line**: a 1px top border with 24px padding, 15px muted text linking to the existing contact and privacy pages.

## Copy (final)
**Eyebrow:** ABOUT
**H1:** A memory for the table
**Lead:** I built Muninn for my own table, so we'd stop forgetting what happened between sessions. Your table is welcome to use it too.

**Why it exists**
I play in a regular tabletop campaign, and between sessions we kept losing things: who that innkeeper was, which rumor we'd already ruled out, what we promised the duke. Each of us remembered a different piece of it.

Muninn started as a place to keep our session recaps. Then it grew, one need at a time, to hold everything a party runs into: people, places, quests, rumors, and each player's own notes. All of it is written by whoever is at the table and credited to the character they play.

**The name**
*In Norse myth, Odin keeps two ravens. Every morning they fly out over the world, and every evening they come back and tell him what they saw. One is Huginn, thought. The other is Muninn, memory.*

That's what this is for: a party goes out, comes back, and keeps what it saw. The mark is ᛗ, the M of the runic alphabet.

Pronounced roughly **MOO-nin**.

**Who made it**
I'm Søren, a software engineer and an active TTRPG player. Muninn was also my way of learning to build a website through agentic coding, working with AI agents to write and review the code. Most of what's here was built that way, one session at a time, a lot like the campaigns it records.

The code is public if you're curious how it's put together.

[View the code on GitHub]   [Buy me a coffee — hidden]

**Closing:** Questions or ideas? Use the contact page. How your data is handled is on the privacy page.

(The spelling here is "rumor", following the README default.)

## Done when
- `/about` renders signed in and signed out, in both themes, and down to 360px wide with no overflow.
- The footer About link shows as active on `/about`.
- The coffee button and photo slot exist in code behind a flag and are not rendered.
