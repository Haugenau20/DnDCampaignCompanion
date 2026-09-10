# Drift log

Every decision that shapes the work, and every later reversal of one. The
point is that on day nine you can tell the difference between *this was
decided* and *this drifted*.

Append only. Do not edit a decision — supersede it with a revision entry, so
the reasoning survives alongside the change.

---

## Format

```
### D<n> — <short title>
Date: YYYY-MM-DD   Status: active | superseded by R<n>
Decision:  what was decided, one or two sentences
Because:   the reason, in terms that can be argued with later
```

```
### R<n> — revises D<n>
Date: YYYY-MM-DD
Change:    what is now true instead
Because:   what changed — new information, or a wrong assumption
Cost:      what had to be redone
```

---

## Decisions

### D1 — Two finishes, one build
Date: 2026-09-08   Status: active
Decision: `2a` and `3a` differ in token values only. Build the shared
structure; defer the choice to Phase 5.
Because: structure, markup and token names are identical between them, so
deferring costs nothing, and the choice is better made against real campaign
data than a mock with four rows.

### D2 — Interleaved with theme-contract, not after it
Date: 2026-09-08   Status: active
Decision: restructure tokens in-app in the contract's shape now; extract the
versioned package afterwards.
Because: today's ~95 flat colour leaves exercise none of the hard parts of a
generation spec. The visual work produces the awkward cases — surfaces
carrying a foreground, ordered collections, enum values. Finishing the package
first would freeze a spec its first consumer immediately strains. Extraction
is mechanical; speculation is not.

### D3 — Scope is Home plus global chrome
Date: 2026-09-08   Status: active
Decision: Home and the global header/footer. All other pages keep today's look
and must not break.
Because: the chrome is global — a header cannot ship half-done — but every
other surface can adopt the model later at no extra cost.

### D4 — Default theme at parity; dark and medieval follow
Date: 2026-09-08   Status: active
Decision: only the default theme reaches parity before merge.
Because: safe **only** because of D5. Without it, an unmigrated theme loses
its chrome instead of merely looking dated.

### D5 — Every new token falls back to an existing one
Date: 2026-09-08   Status: active
Decision: each new token resolves to the theme's value, else the token it
replaces, else a documented last resort.
Because: makes adding a token a non-breaking change, lets Phase 1 be
screenshot-identical while introducing the whole model, and keeps unmigrated
themes correct. This is the load-bearing rule of the plan.

### D6 — No bitmap imagery at launch
Date: 2026-09-08   Status: active
Decision: image slots ship with a designed empty fallback. No plates, uploads,
Storage, AI generation, licensing or attribution.
Because: the atmosphere has to come from shipped structure, not from content a
user may never add — otherwise the page feels like nothing on day one. Uploads
are an enhancement on top, and a project of their own.

### D7 — Procedural sigils stay in scope
Date: 2026-09-08   Status: active
Decision: deterministic per-entity marks ship; bitmap imagery does not.
Because: identity marks were asked for everywhere, and they need no art files
— one function and a palette. They are also what makes a long list scannable
rather than uniform, which is most of the perceived life on Home.

### D8 — The three existing bugs go in Phase 0
Date: 2026-09-08   Status: active
Decision: the `.selectable-item` cascade, `Typography`'s `leading-none` and
the ~2.87:1 active nav item are fixed before any visual work.
Because: all three are independent of direction, all three improve the product
with no new tokens, and the cascade ambiguity would otherwise make Phase 2
unpredictable.

### D9 — Surface owns paint, state owns feedback
Date: 2026-09-08   Status: active
Decision: surface classes own resting background, border and ink; state
classes own only hover, selected, focus, disabled. Layer order declared
explicitly.
Because: `.selectable-item` currently owns both and is declared last, so its
resting background beats `.card` and `.bg-secondary` — the direct cause of
every list rendering one flat tone. A contract bug, not a typo.

### D10 — Contrast is verified per pair, once
Date: 2026-09-08   Status: active
Decision: contrast is checked on surface/foreground pairs in the token set,
not per usage.
Because: three separate defects in this work shared one shape — a valid token
in a valid slot, wrong in relation to its background. Pairs make that class of
bug unrepresentable, and make the check computable from tokens alone.

### D11 — Long-lived integration branch, one branch per phase
Date: 2026-09-08   Status: superseded by R20
Decision: an integration branch off `main`; each phase a branch off it, merged
independently.
Because: each phase is independently revertable, and a half-migrated token
model — the one genuinely bad state — is visible as an unmerged branch rather
than something living on `main`.

### D12 — Selection draws an outline, not a border
Date: 2026-09-08   Status: active
Decision: `.selected-item` uses `outline` + `outline-offset: -2px` instead of a
2px border, so `.selectable-item` can stop reserving a transparent border.
Because: D9 requires the state class to own no resting paint, but its
`border: 2px solid transparent` was load-bearing -- it reserved the space the
selected border later filled. Removing it alone would have shifted row content
by 2px on select, failing the Phase 0 gate. An outline is outside layout flow
entirely, so the state costs nothing. `.highlighted-item` already worked this
way, so this is a consistency win as well.

### D13 — Active nav and dropdown ink becomes `--text-primary`
Date: 2026-09-08   Status: active
Decision: `.navigation-item-active` and `.dropdown-item-active` take
`--text-primary`, not `--color-primary`, on `--hover-medium`.
Because: the pair measured 2.87:1 in light. No value of `--hover-medium` fixes
it -- anything light enough to clear 4.5:1 against `#2563EB` lands within
~1.1:1 of the page and the state stops being visible at all. Darkening the ink
is the only move available without a new token. Verified on rendered pixels:
2.87:1 -> 9.90:1 light, 9.26:1 dark, 13.40:1 medieval. Both rules were fixed,
not just the nav one the plan named, because they are byte-identical instances
of the same defect and fixing one would have left the other.

### D14 — `variables.css` declares no custom properties at all
Date: 2026-09-08   Status: active   (settles Q7)
Decision: the `:root` block declaring all ~95 tokens as `--x: ;` is removed.
The file keeps only a comment explaining why it must not come back. A jest
guard, `themes/__tests__/css-custom-properties.test.ts`, fails on any empty
custom property in `themes/css/`.
Because: an empty custom property is *defined*, not guaranteed-invalid, so
`var(--new, --old)` never reaches its fallback -- substitution yields nothing,
the declaration becomes invalid at computed-value time, and the property
resolves to `unset` with no warning. Confirmed in Chrome: a declared-empty
token skipped its fallback while an undeclared one used it. That silently
defeats D5, the load-bearing rule, precisely where it is meant to save dark
and medieval. No existing `var()` fallback was affected -- the codebase has
none yet -- so this is preventive, landed before Phase 1 writes its first one.
The declarations were also inert: every token is set at runtime by
`applyThemeToCssVariables`, and removing the block changed nothing on screen.
The guard was verified against a control that made it fail.

### D15 — `.navigation-item:hover` ink becomes `--text-primary`
Date: 2026-09-08   Status: active   (settles Q8)
Decision: the nav hover rule takes `--text-primary` instead of
`--color-primary`, matching D13.
Because: it is the same defect as D13 one tint lighter -- the accent on
`--hover-light` measured 4.01:1 in light, below AA. Verified on rendered
pixels: 4.01:1 -> 13.84:1 light, 6.53:1 -> 10.43:1 dark, medieval 14.4:1.
Hover still reads as hover: the ground goes from nothing to `--hover-light`
and the ink strengthens from `--text-secondary`. Taken in Phase 0 rather than
deferred to Phase 2 at the maintainer's direction.

### D16 — Phase 1's gate is a token-value diff, not screenshots
Date: 2026-09-08   Status: active
Decision: Phase 1 is gated by `themes/__tests__/token-values.test.tsx`, which
drives the real `ThemeProvider`, reads the variables it writes to the root
element, and compares them against a baseline captured before any
restructuring. Semantics: no existing token may change value or disappear;
adding tokens passes.
Because: the repo has no visual-regression tooling, and adding it is a project
of its own that Phase 1 would have to finish first. A screenshot is also the
weaker instrument here -- it cannot separate a value change from a rendering
difference, and it needs a human to read it. What Phase 1 actually promises is
narrower and exactly checkable: same values, new structure. Additions must
pass, because introducing surface pairs is the point of the phase. Verified
against a control: a one-hex-digit change to lightTheme's primary failed the
light theme only and named the three affected tokens.
Note this does not cover markup or layout drift. Phase 1 changes no markup, so
that is in scope for the phase as written; if it starts to, the gate needs a
second instrument.

### D17 — Clean names now, all consumers migrated in one pass
Date: 2026-09-08   Status: active
Decision: traversal produces model-shaped variable names, and all consumer
sites were rewritten in Phase 1. No aliases, no second pass.
Because: chosen by the maintainer over two lower-risk alternatives (emitting
legacy names alongside new ones, or bending the tree to reproduce today's
names). The cost is the largest diff of the three and a big mechanical rename
inside the phase whose value is being unchanged; the benefit is that the tree
is shaped by the model rather than by history, and the work is finished rather
than half-done across phases. 211 replacements across 6 files; a scan
confirms zero references to any pre-rename name remain.
Naming derivation: path segments join with `-`, and camelCase inside a segment
splits on the same character, so `surface.card.onMuted` gives
`--surface-card-on-muted`. `flattenTokens` throws on two paths deriving one
name rather than letting key order decide the survivor.

### D18 — Seven alias variables retired; the eight location-type ones kept
Date: 2026-09-08   Status: active
Decision: `--book-bg`, `--book-content-bg`, `--book-header-bg`,
`--book-nav-bg`, `--book-pagination-bg`, `--spinner-border` and
`--spinner-active` are gone; their consumers name the token they always
equalled. The eight `--location-type-*` survive.
Because: those seven were pure indirection -- each was defined as another
token's value, so the variable added a name without adding a decision, and all
were consumed only inside components.css. Retiring them is free and reduces
the set. `--location-type-*` is different: the entity palette replaces it in
Phase 3, and retiring it is a listed one-way door, so it stays until the
palette exists to absorb it.

### D19 — `chrome` and `footer` are separate surfaces for now
Date: 2026-09-08   Status: active
Decision: the surface group has both `chrome` and `footer`, rather than one
chrome surface as the design language describes.
Because: today the header is white and the footer is tinted. Collapsing them
into one surface is a visual change, and Phase 1 makes none. Phase 2 merges
them when the chrome becomes one dark band, which is the point at which the
design language's description becomes true of the code.

### D20 — Surface `on` roles repeat the page ink in Phase 1
Date: 2026-09-08   Status: active
Decision: every surface's `on`, `onMuted` and `border` currently hold the same
values as the page's, and `--text-primary` / `--text-secondary` were renamed
to `--surface-page-on` / `--surface-page-on-muted` everywhere rather than
being split per surface.
Because: there is one ink value in each theme today, so any split would be a
rename with no visual consequence -- and choosing a surface for each of the 32
usages is a judgement that only becomes real when a surface's ink actually
differs from the page's. That happens in Phase 2 with the dark chrome. Doing
it now would be unverifiable churn inside a phase gated on changing nothing.
Cost of deferring: until then, text inside a card names the page's ink. The
pair model is in place; it is not yet being exercised.

### D21 — Contrast is enforced on ink pairs, ratcheted on control boundaries
Date: 2026-09-08   Status: active
Decision: `token-contrast.test.ts` enforces 4.5:1 for every surface's `on` and
`onMuted` against its own `bg`, in all three themes. Control boundaries
(`action.outline.border`, `field.border`) are recorded at their measured
ratios and asserted as a floor rather than against 3:1. A surface's own
`border` is not checked.
Because: the ink pairs all pass, so enforcing them costs nothing and locks
them. The control boundaries do not pass and fixing them means changing colour
values, which this phase does not do -- a floor makes the shortfall visible
and prevents it worsening, without adding a red test to a suite whose contract
is that red means regression. A card's hairline is deliberately quiet
structure rather than the thing identifying a control, so WCAG 1.4.11 does not
bind on it and asserting 3:1 there would be inventing a requirement.

### D22 — The chrome is one deep near-neutral band, header and footer together
Date: 2026-09-08   Status: active   (completes D19)
Decision: the light theme's chrome becomes `#171A21` with `#F7F9FC` ink and
`#9AA4B5` muted ink. `surface.footer` is retired; the footer consumes the
chrome pair. Dark and medieval keep their own chrome values.
Because: value contrast belongs in the frame, and the surfaces you scan every
session stay quiet -- the page and cards are untouched. The chrome's ink is the
page's own ground, which ties the band to the paper rather than making it a
separate visual system. D19 deferred the header/footer merge to the phase where
the chrome became one band; this is that phase.

### D23 — Surfaces gained `hover` and `selected` roles
Date: 2026-09-08   Status: active
Decision: `SurfacePair` is six roles, not four. Every surface defines its own
feedback tints, and the two global `state.hover*` tokens no longer serve the
chrome.
Because: a tint is only meaningful relative to what it sits on. A dark chrome
needs a light overlay where the light page needs a dark one, and no single
value is both -- the light theme's opaque `#93C5FD` active pill would have been
a bright slab on a near-black bar. This is token-model section 2 applied as
written: when a component needs something the pair does not offer, the surface
is under-specified, so the role goes on the surface rather than into a one-off
token. Seeded from each theme's existing tints, so nothing outside the chrome
changed.

### D24 — `Typography` inherits its colour
Date: 2026-09-08   Status: active
Decision: `.typography` sets `color: inherit` instead of `--surface-page-on`.
Because: it named an ink unconditionally, so every piece of text carried the
page's colour regardless of the surface under it. That was invisible while all
surfaces shared one ink, and became four unreadable labels the moment the
chrome went dark -- the nav items, the campaign switcher and the footer links
all rendered near-black on near-black. This is the exact defect the pair model
exists to prevent, found by the first surface that stopped matching the page.
`body` still sets the page ink, so the page and cards are unchanged.
Ghost buttons in the chrome are scoped the same way. That is a structural
scope, not a theme-conditional patch: it says a ghost button on this surface
takes this surface's values. Their accent ink measured 2.0:1 on the band.

### D25 — Sigils are monogram chips; the palette is an ordered collection
Date: 2026-09-08   Status: active   (settles Q1)
Decision: an entity's mark is its name's initial on a chip whose hue comes from
`hash(id) % SIGIL_BUCKET_COUNT`, indexing an ordered `entityPalette`. The
palette becomes index-suffixed variables (`--entity-palette-0` …), not one
joined value.
Because: recognition wins over atmosphere, and a letter is read where an
abstract glyph must be learned. Index suffixes let a manifest assert that a
specific entry exists and let CSS name one entry without parsing a list, which
is what Q1 was actually asking. The hue comes from the id and the letter from
the name, deliberately: renaming an entity keeps its colour, because the id is
what identity is anchored to.
A type icon was ruled out -- the row already states its type once, and a
coloured icon beside a coloured type chip is the redundant encoding section 8
names as a reliable source of noise. Colouring the location icon was in fact
exactly that, and it is now uncoloured.

### D26 — The bucket count is a constant, not the palette length
Date: 2026-09-08   Status: active
Decision: `SIGIL_BUCKET_COUNT = 8`, declared independently of
`entityPalette.length`. Themes must define at least that many entries.
Because: the acceptance criteria require that appending a palette entry does
not change existing marks, and `hash % palette.length` breaks that outright --
adding a ninth hue would renumber every entity in every campaign on deploy.
With a fixed count, appending is inert until the constant is raised, which
makes growing the palette a visible decision rather than a side effect.
Reordering still changes existing marks; that is the documented trade, and why
order is part of the contract rather than an implementation detail.
The hash is FNV-1a 32-bit: fully specified, dependency-free and identical in
every engine, which is what "the same mark across reloads and devices"
actually requires. Its outputs are pinned in a test, so a refactor that
silently renumbered every mark would fail.

### D27 — Palette values are generated in OKLCH, not hand-picked
Date: 2026-09-08   Status: active
Decision: each theme's eight hues are produced at one OKLCH lightness and
chroma with only the hue angle varying, then written in as sRGB hex.
Because: the design language asks for "a single narrow band of lightness and
chroma", and that is a property you can either assert or actually have.
Picking hexes by eye gets the first part and misses the second. Measured
against each theme's ink: light 11.23-11.78:1, dark 6.95-7.37:1, medieval
10.80-11.26:1 -- spreads of 0.55, 0.42 and 0.46, every entry clearing AA. A
test asserts both the floor and the spread, so a future hand-edit that made one
entry shout would fail rather than merely look wrong.

### D28 — The mark carries no inline colour
Date: 2026-09-08   Status: active
Decision: `EntitySigil` renders `data-sigil-index`, and one CSS rule per index
supplies the hue.
Because: paint belongs where a theme can reach it. An inline
`background-color` would put every mark in the product beyond the reach of the
token system, which is the thing this whole project exists to establish. It
also made the component testable in jsdom, which drops `var()` from inline
styles -- a smaller reason, but it pointed at the right design.

### D29 — The hero is a band, and the campaign's sigil is its empty slot
Date: 2026-09-08   Status: active
Decision: the campaign header becomes a band on `surface.band`, one step
lighter than the chrome (`#2A3242` against `#171A21`, 1.35:1). Its image slot
is empty in this phase and its empty state is the campaign's own sigil,
derived from the campaign id by the same function every entity mark uses.
Because: value contrast belongs in the frame -- the chrome, the hero, the
footer -- while the surfaces you scan every session stay quiet. A step of
1.35:1 keeps the two reading as layers of one frame rather than one tall
header; at 1.12:1 they merged into a single mass. The empty state is the real
design here, since most slots will be empty most of the time and nothing on
the page may depend on content a user might never add. Reusing the sigil costs
nothing and ties the hero to the identity system rather than inventing a
second one.

### D30 — Surface-aware components are scoped, not duplicated
Date: 2026-09-08   Status: active
Decision: `.typography-heading` and the view toggle keep page-shaped defaults
and are overridden inside `.hero-band`.
Because: both appear on more than one surface -- the toggle sits on the band on
the dashboard and on the page in the journal -- so neither can name one set of
colours. `--color-heading` is a page-level notion (in the dark theme it is
deliberately brighter than body ink) and is simply wrong on a surface whose ink
differs; unscoped it rendered near-black on the dark band, and the toggle's
active segment rendered the band's near-white ink on a white card, invisible.
The rule is the same one the chrome's ghost buttons follow: the surface claims
its own values, rather than every component learning about every surface.

### D31 — The band stacks below `sm`
Date: 2026-09-08   Status: active
Decision: the hero's identity block and the view toggle stack vertically until
the `sm` breakpoint.
Because: side by side, the `shrink-0` toggle claims roughly 180px of a 320px
viewport, which squeezed the title column to almost nothing and set the
campaign name one character per line -- a vertical column of letters. Found by
rendering Home in a 320px iframe, which is a real test where resizing a
maximised window is not. Verified afterwards with a 96-character campaign name
at both widths: no horizontal overflow, header still one line.

### D32 — Control boundaries raised to 3:1
Date: 2026-09-09   Status: active   (settles Q9)
Decision: `field.border` and `action.outline.border` are darkened in every
theme until the least favourable of the page and card grounds clears 3:1 with
margin. Light 1.40 -> 3.25 and 1.71 -> 3.59; dark 1.98 -> 4.01 and 1.38 ->
4.17; medieval 2.34 -> 3.56 (its outline border already passed at 6.55).
`token-contrast.test.ts` now enforces 3:1 instead of ratcheting a recorded
failure.
Because: an outline button and a text input are identified by their borders, so
WCAG 1.4.11 genuinely binds. It was recorded rather than fixed through Phases
1-4 because each of those phases was fenced against changing values, and a
floor kept it from worsening in the meantime. Values were chosen at >= 3.2
rather than exactly 3.0 so a later tuning nudge cannot silently drop below the
line. `--spinner-border` follows automatically, having always aliased
`field.border`.

### D33 — Cascade layer order, declared in the first imported stylesheet
Date: 2026-09-09   Status: active   (settles Q6, completes D9)
Decision: `@layer tw-base, tw-components, app, app-state, app-theme,
tw-utilities;` declared at the top of `variables.css`. Tailwind's own output is
wrapped in `tw-base` / `tw-components` / `tw-utilities`; `components.css` is
`app` with its state block in `app-state`; `theme-effects.css` is `app-theme`;
`globals.css`'s own utility classes join `tw-utilities`.
Because: precedence was a function of file order, which is what let a rule
declared 500 lines later beat `.card` and flatten every list surface. R1
reverted the first attempt after discovering that unlayered CSS beats every
layer regardless of specificity -- so Tailwind's output had to be layered too,
with utilities last, which is where they already sat.
The second attempt failed differently and instructively: the order was declared
in `globals.css`, but `@import` is hoisted above everything there, so the
declaration arrived *after* the imported files had already created their layers.
Creation order then decided, putting Tailwind's preflight above the app's rules
and letting `button { color: inherit }` beat every class that set a colour --
1135 of 3361 elements changed, the chrome losing both its ink and its border.
Moving the declaration into the first imported file fixed it.
Verified by computed-style diff rather than by eye: 23 properties on all 3361
elements across nine routes, before and after. Zero tag mismatches and zero
real style differences -- the only variance was a handful of continuously
animating elements sampled at different phases, whose values differ between two
consecutive runs of the *same* build.
Cost: a new footgun -- an unlayered rule added later would outrank everything.
`css-layers.test.ts` asserts nothing in the theme stylesheets or `globals.css`
is unlayered, verified against a control.

### D34 — The mobile nav row scrolls instead of crushing its labels
Date: 2026-09-09   Status: active
Decision: mobile nav items use `basis-0 grow shrink-0` with a `3.75rem` floor
and `text-xs`, replacing `flex-1 min-w-0`.
Because: seven items sharing 304px gave each about 43px while "Locations" needs
roughly 65px, and `min-w-0` let each one collapse below its content, so every
label overflowed its own box and collided with its neighbours. The container
already had `overflow-x-auto`; `flex-1` was what stopped it working. Now the
row shares width when there is room and scrolls when there is not. Measured at
320px: 0 overlapping pairs, 0 labels overflowing, scroll width 444 against a
292 client width.

### D35 — Finish 3a; the banded chronicle in warm ivory
Date: 2026-09-09   Status: active   (settles the D1 deferral)
Decision: the light theme is retuned to the banded chronicle -- a warm ivory
page (`#F3EFE6`) that reads as paper rather than screen, a near-black warm
chrome (`#17140F`) and hero band (`#211C16`) carrying the value contrast, one
deep red accent (`#8C1D1D`), and medium-tone sigils with light ink. Finish 3a
is chosen: no second accent below the chrome. 73 light-theme values changed;
dark and medieval are untouched, verified by diffing the baseline per theme.
Because: chosen by the maintainer against Claude Design's two reference
mockups. 3a keeps the accent budget at one hue below the chrome, which is what
"contrast lives in the chrome; calm lives in the content" asks for, and avoids
the failure the design language records from its own first draft -- competing
accents stacked in the top 300px.
The old page was `#F7F9FC`, a cool blue-grey: the design language asked for
"warm off-white -- paper, not screen" and the previous value was the second of
those. That single change does more of the visual work than any other here.

### R4 — revises D1's claim that the finishes differ only in token values
Date: 2026-09-09
Change: 2a and 3a differ structurally as well. In the reference mockups 2a puts
a coloured type eyebrow above each row title, while 3a folds the type into one
meta line -- "Story · Gauthak · 2 days ago". Implementing 3a therefore included
a markup change to the activity row, not only values.
Because: the plan asserted the two were value-only variants, and the mockups
that arrived later do not bear that out. The eyebrow also could not be
expressed as a value difference while it shared `--surface-band-on-muted` with
the meta line, so it was given `--color-emphasis` of its own -- a small CSS
change that makes the accent-load difference expressible in values, which is
what the plan assumed was already true.
Cost: Phase 5's "diff contains token values only" gate does not hold as
written. The diff is token values plus one row-structure change and one CSS
role, each recorded here.

### D36 — Value tuning runs through a generator with contrast gates
Date: 2026-09-09   Status: active
Decision: the finishes were produced by a script holding the shared base and
each finish's overrides, which recomputes every contrast rule the jest suite
enforces and refuses to write a theme that fails one.
Because: a tuning pass is exactly where accessibility quietly regresses -- the
whole activity is chasing a look. Gating the write meant the failures surfaced
before they reached the browser. It caught one immediately: the 3a hero eyebrow
at 4.36:1, small uppercase type on the band, which is the precise case section
10 warns is treated as though it were large. The generator's own checks did not
originally cover that pair; the browser audit found it, and the check was added
so it cannot recur.

### D39 — The journal mode is retired, not migrated
Date: 2026-09-09   Status: active
Decision: `pages/layouts/journal/` and the Dashboard/Journal toggle are deleted,
along with the eleven `--journal-*` tokens, every CSS rule that read one, and
`formatJournalDate`. Home renders the dashboard, full stop. No stored layout
preference is migrated into anything.
Because: never used on the live site, and the dashboard already answers the
question it was for. Its premise -- that someone files every entry under the
right session -- is a maintenance burden that pays nothing the first time anyone
forgets. Deleting it before the rest of Phase 6 means Phases 8, 9 and 11 never
touch those files.
Two of its classes were not its own: `.journal-loading` and `.journal-empty`
were shared with the dashboard from the start and carried the prefix only
because that layout defined them first. They are renamed `.section-*`, which is
what they always were. A third, `.journal-heading`, looked shared and was not --
`SectionHeading` had exactly two consumers, both journal sections -- so the
component, its test and its rule went with the mode. Found in the browser, after
the change: the class rendered nowhere.
Correction to the handoff: eleven tokens, not twelve. The handoff counted from
memory; the baseline held 33 entries across three themes.

### D40 — Medieval is retired in Phase 11
Date: 2026-09-09   Status: planned
Decision: the medieval theme is deleted rather than brought to parity, in Phase
11, as a deletion PR plus a migration PR for anyone whose stored preference is
`medieval`.
Because: roughly a third of `theme-effects.css` is its ornament, and the surface
model the token restructure produced does not need a costume theme to prove it
generalises -- light and dark at parity does that. Keeping it means every later
phase pays for a third theme nobody uses.

### D41 — Entity detail is a new route, reached from "More info"
Date: 2026-09-09   Status: planned
Decision: Phase 7 adds a route per entity, reached from a "More info" action on
the directory row. The row's inline expansion is unchanged; the phase is purely
additive.
Because: the row deliberately does not carry full notes, an edit timeline, every
relationship or an image slot -- it is the highest-frequency surface in the
product, and design language section 2 says ornament recedes as frequency rises.
Those things need a surface met rarely. Making the page additive means the phase
cannot regress the directories.
Scope is NPCs and Locations only; quests, rumours and notes stay row-only until
the pattern proves itself.

### D42 — A timeline is a future feature, not a mode
Date: 2026-09-09   Status: active
Decision: nothing replaces the journal. A timeline over entries that already
carry dates may be built later as a feature; it is not a second layout Home can
switch to.
Because: the journal's actual failure was being a *mode* -- a second place the
same data lived, that had to be maintained in parallel and chosen between. A
timeline reading the entries everything else reads has none of that cost. The
distinction is what makes deleting the journal safe rather than a loss.

### D43 — The entity page is complete and semi-working, not read-only
Date: 2026-09-09   Status: planned
Decision: the Phase 7 entity page shows everything the row shows plus the full
note history and every relationship, and its description edits in place with a
note addable without leaving the page.
Because: a read-only detail page is a worse version of the row with more
scrolling, and nothing earns the click. Editing in place is what makes the extra
route pay for itself.

### D44 — The image slot has no focal point and no crop UI
Date: 2026-09-09   Status: planned
Decision: one slot per entity page, fixed aspect, cropped to fill, centred. No
focal-point picker, no crop tool. Designed empty state; the upload path is a
separate, optional PR.
Because: D6 stands -- the page must look finished with an empty slot, because
most slots will be empty most of the time. A crop UI is a feature built for
content that does not exist yet, and the empty state is the design rather than a
placeholder (design language section 6).

### D45 — Full CommonMark, raw HTML disabled at the parser
Date: 2026-09-09   Status: planned
Decision: chapter bodies, saga and story descriptions, and notes render full
CommonMark with raw HTML disabled at the parser, authored in a plain textarea
with a bold / italic / blockquote toolbar. Everything else in the app stays
plain text.
Because: the reading design in 4b needs a pull quote and real emphasis, and
neither can exist in the data without a markup layer -- so this is a dependency
of Phase 9's look, not a feature beside it. Disabling raw HTML at the parser
rather than sanitising output is the difference between a policy and a filter.
Keeping every other surface plain text means a directory row never needs a
parser.
Renderer choice, and write-time versus read-time rendering, is Q10; it is the
first PR of Phase 9.

### D46 — Entity names are serif; everything about them is sans
Date: 2026-09-09   Status: active
Decision: in every collection row the entity's name renders serif, and every
other field -- type, status, disposition, role, dates, attribution -- renders
sans.
Because: this is design language section 4's rule applied at the row level. The
name is content of the world; the rest is the app describing it. Stating it as a
rollout rule means eight directories inherit one answer instead of each deciding
for itself.

### D47 — Removing an encoding is what audits the one that remains
Date: 2026-09-09   Status: active
Decision: when a fact is stated twice and one encoding is deleted, the survivor
gets re-checked before the change ships. Two defects surfaced this way in PR
6.1, both invisible while the redundancy stood.
Because: redundant encoding does not just add noise, it hides bugs in the
encodings it duplicates. `LocationDirectory` drew its status dot from
`STATUS_ORDER` and its status *word* from `.location-status-*`, and the two
disagreed: `explored` and `visited` were swapped, so a row said "Explored" in
the green the filter legend used for `visited`. For as long as both were
present the dot was right, the word was wrong, and they sat side by side
looking like decoration. Deleting the dot made the row contradict its own
legend, which is how it was found.
The same deletion turned every status word into the only encoding of its fact,
which promoted the status hues from decoration to text -- and that is what
exposed D48.

### D48 — Status hues are AA text pairs, and were never gated as such
Date: 2026-09-09   Status: active
Decision: `token-contrast.test.ts` gains a block asserting every `status.*` hue
meets 4.5:1 against the worst of `page`, `card` and `sunken`. Light theme's
`status.unknown` moves from `#A67C1F` to `#7E5E17` (2.98:1 -> 4.70:1 on the
worst ground). Dark's `completed` (3.05:1) and `failed` (2.41:1) and medieval's
`unknown` (1.83:1) are recorded and ratcheted, not fixed: Phase 11 owns those
values, and the ratchet is what stops them worsening meanwhile.
Because: the test file covered surface pairs and control boundaries and nothing
else, so a status hue used as a word was measured by no gate at all. `tsc`,
`npm test` and `npm run build` were all green with `#A67C1F` on `sunken` at
2.98:1. This is the failure mode design language section 10 describes almost
word for word -- a legitimate colour, in a legitimate slot, wrong in relation to
what sits behind it -- and the reason the token model makes pairs the unit is
that pairs are what a test can enumerate. A pair nobody enumerated was a pair
nobody checked.
The generator (D36) held the same `#A67C1F`, so it was updated in the same
commit; leaving it would have regenerated the failure on the next tuning pass.
Verified as a gate rather than assumed: darkening dark's `completed` past its
ratchet was written in as a control and the test failed, then reverted.
A ratchet is not a pass. `dark.status.failed` at 2.41:1 is unreadable as a
word, and the word is now the only encoding it has.

### D49 — The identity mark sits beside the row's grid, not inside it
Date: 2026-09-09   Status: active
Decision: `RosterRow`'s button is a flex row of `[mark, grid]`, and the four
directories' column templates are untouched.
Because: the alternative was a leading `auto` column in `NPCDirectory`,
`LocationDirectory`, `QuestDirectory` and `RumorDirectory` -- the same slot
declared four times, drifting the first time one of them was edited, which is
exactly the failure `Roster` exists to prevent. One consequence worth recording:
the grid template no longer lands on the button, so the test that asserted it
there was retargeted at the element that holds the cells, and strengthened to
assert the cells are inside it so it cannot pass on an empty grid.

### D50 — A row without an entity id throws
Date: 2026-09-09   Status: active
Decision: `RosterRow` takes `entityId` as a required, non-empty prop and throws
when it is missing.
Because: both quiet alternatives are worse than a crash. Rendering no mark
leaves one row visibly unlike its neighbours for no stated reason; deriving from
`''` gives every id-less row the same hue, which reads as a deliberate grouping
that does not exist -- wrong in a way that looks right. The id is also the
reason the mark is stable at all: deriving from the name instead would move a
mark whenever anyone fixed a spelling.

### D51 — The active filter is an accent outline, and "All" is not a filter
Date: 2026-09-09   Status: active
Decision: a filter pill's active state is an accent border and accent ink over
the ordinary control background, never a fill. The option meaning "no filter"
-- `all` in every directory -- renders idle no matter that it is selected.
Because: two things were wrong with the fill. It named `status.general` for
something that is not a status, and looked right only because in finish 3a that
token and the accent happen to be the same value; and a fill is the heaviest
treatment available, spent on the most repeated control on the page. More
importantly, every directory loads with `all` selected, so the old rule put an
accent on every collection in the product at rest -- an accent that says
nothing, which is exactly what the budget exists to prevent.
Selected and accented are now separate questions: `aria-pressed` still reports
`all` as selected, because dropping it would be a real accessibility regression
worn as a visual improvement. An existing test caught that, having pinned
`aria-pressed` rather than the class.
Both states carry the same border width, so choosing a filter never reflows the
row.

### D52 — A group heading's link out is quiet, not accented
Date: 2026-09-09   Status: active
Decision: `RosterGroup`'s "Open location" renders as muted ink with an
underline.
Because: it repeats once per group. Measured on the NPC directory: five accent
links down one page, against one active filter -- the accent that actually means
something was outnumbered five to one by a navigation affordance. The underline
carries the affordance, so nothing here is encoded by colour alone either.

### D53 — A skeleton stands in for rows; a spinner stands in for nothing
Date: 2026-09-09   Status: active
Decision: `RosterSkeleton` draws the row rhythm -- mark, name, metadata, at
their real sizes -- and every collection uses it. `RosterEmpty` states what the
collection is for and offers the one action that fills it, except when a
*filter* emptied it, where it offers none.
Because: four directories had drifted to three different loading states (two
spinners with different icons, two bare lines of text) and four differently
worded empty states, none of which offered an action. A spinner says "something
is happening"; a skeleton says "a list of rows is happening, and it will be
about this tall", so the page does not jump when the rows arrive.
The filter distinction matters: offering "Add the first NPC" to someone who has
sixteen of them and mistyped a search answers a question nobody asked.

### D54 — `section-loading` names a colour instead of dimming one
Date: 2026-09-09   Status: active
Decision: the skeleton block is `surface-sunken-border` at full opacity, not
`surface-sunken-bg` at `opacity: 0.3`.
Because: measured in the browser, the old rule composited to **1.06:1** against
a card -- a skeleton indistinguishable from a blank card, so the "designed
loading state" was the absence of one. It went unnoticed while it stood in for
four rows on the dashboard, and mattered the moment five collections started
leaning on it. `surface-sunken-border` is the quietest token meant to be *seen*
rather than felt: 1.44:1 on light's card, 1.38:1 on dark's, close enough that no
theme-conditional rule is needed.
Opacity was the deeper mistake -- it made the value depend on whatever happened
to sit behind it, which is the one thing the surface-pair model exists to stop.

### D55 — Row density lives in the stylesheet
Date: 2026-09-09   Status: active
Decision: `.roster-row` owns the row's padding, and `RosterRow` and
`RosterSkeleton` both wear it.
Because: the rhythm of the row is the rhythm of the product -- the unit here is
a row you scan -- so it is set once where a theme can reach it, rather than as a
utility on one component. It also keeps the skeleton honest: the placeholder
rows are exactly as tall as the rows they stand in for, because they are the
same rule.

### D56 — Dark's `completed` and `failed` become readable words
Date: 2026-09-09   Status: active   (closes the ratchet D48 opened)
Decision: dark `status.completed` `#12873d` -> `#3FB950` (3.05:1 -> 5.90:1 on
its card) and `status.failed` `#c52020` -> `#F87171` (2.41:1 -> 5.08:1). Their
ratchet entries in `token-contrast.test.ts` are gone; light and dark now both
answer the uniform 4.5. Medieval's `unknown` keeps its ratchet.
Because: D48 recorded these as failures and ratcheted them because Phase 11
owned the values. Phase 6's own gate is stricter -- "every status hue at AA
against the surface its text sits on, both themes" -- and it is stricter for a
reason this PR made concrete: after Phase 6 the word is the *only* encoding a
status has, so a status hue below AA is a status nobody can read. Deferring to
Phase 11 would have shipped that for however long Phase 11 takes.
Medieval stays ratcheted deliberately. It is deleted in Phase 11 (D40), so
raising its value is work on a theme with a scheduled end; the ratchet only has
to stop it getting worse first.
Values chosen with margin rather than at the bar -- 5.08 and 5.90 against a 4.5
requirement -- so a later surface tweak does not silently push them under.
Both are conventional dark-theme status hues, which matters because the theme
is unmigrated and these are the first values in it chosen deliberately.

### D57 — One status treatment, in one component
Date: 2026-09-09   Status: active
Decision: `RosterStatus` renders every status in every collection: same weight,
same placement, same vocabulary of hues. The four parallel class families
(`quest-status-*`, `rumor-status-*`, `npc-status-*`, `location-status-*`) stop
being consumed by the directories, though the CSS stays until Phase 7 migrates
the cards that still use it.
Because: four families resolving to the same five tokens is four chances to
drift, and they had already taken one -- `location-status-explored` and
`-visited` were swapped against their own status bar for as long as a dot was
there to cover it (D47). A confirmed rumour and a completed quest are the same
kind of fact, one thing the party now knows, and should look like it; that is
true by construction when they pass the same tone rather than by coincidence
when two class families happen to name the same token.
`muted` is a tone in the set, not an absence of one. A location that is merely
`known` is the least-advanced point on its axis, and spending the one status hue
on "nothing has happened here yet" would say the opposite of what it means -- so
it keeps the treatment and drops only the hue.
Scope note: the handoff listed quests and rumours. NPCs and Locations were
migrated too, because leaving two of four directories on the old families would
have recreated the drift this decision exists to end.

### D58 — Selection paints from the row's own surface
Date: 2026-09-09   Status: active
Decision: a row ticked for a batch action takes `surface.card.selected`. Not the
accent, not a status hue.
Because: selection is feedback about what you are *about to act on* -- true for
the length of one interaction -- while a status is a property of the record that
outlives it. A status hue here would also mean a selected rumour and a confirmed
one shared a colour, on the one screen where you are about to change exactly that
field. Until now a selected row had no paint at all; only its checkbox changed.

### D59 — Two colour-only encodings removed from expanded rows
Date: 2026-09-09   Status: active
Decision: in a quest's linked-locations list the `MapPin` becomes muted; in a
location's linked-quests list the `Scroll` becomes muted and the quest's status
is stated as a word beside its title.
Because: the first was hard-coded to `location-status-explored` for *every*
location in the list, so it asserted a status the location may not have had --
decoration wearing the status hue, and sometimes lying. The second carried the
quest's real status by hue alone with no legend anywhere on the page: unreadable
for anyone who cannot separate the hues, and undecodable for everyone else.
Design language section 2 forbids both. The second keeps its information by
stating it, which is strictly better than the hue it replaced.

### D60 — Dead code is deleted, not migrated
Date: 2026-09-09   Status: active
Decision: `NPCCard`, `LocationCard` and `RumorCard` are deleted, with their
tests and their barrel exports, and with every CSS family whose only consumer
they were.
Because: nothing rendered them. They were stranded when the directories became
rosters, and 2,637 lines of component and test were reachable only from
themselves. Migrating them to the token system would have been paint applied to
a surface no one can see.
The receipt is unusual and worth recording: after deleting them the **JS bundle
is byte-identical** — the same content hash, 295.77 kB before and after.
Webpack had already tree-shaken all three out, so the production bundle never
contained them. A shrink would have been weaker evidence; an unchanged hash
proves the code was unreachable rather than merely unused. Only the CSS moved
(11.06 kB -> 10.79 kB), because CSS is not tree-shaken — which is precisely why
dead CSS has to be deleted by hand and dead components largely delete
themselves.

---

### D61 — The entity page is NPCs only; Locations keep the row
Date: 2026-09-09   Status: active
Decision: Phase 7 builds `/npcs/:npcId` and no Location route. D41's "NPCs and
Locations only" narrows to NPCs only. Answers Q14.
Because: a detail page's job is to show what the row cannot fit, and for
Locations there is nothing left. Phase 6 gave the Location row all ten of its
content fields — description, features, notes, tags, lastVisited, connectedNPCs,
relatedQuests, and type/status in the collapsed row — with `parentId` expressed
by nesting. A Location page would restate the row at a different URL. The
permalink argument does not save it either: `/locations?highlight=<id or name>`
already exists, resolves by id *or* name, and expands the parent chain to reveal
the row.
NPCs are the opposite, and the measurement is what settled this. The NPC type
has ten content fields; the row shows four. Six are **collected by the form,
written to Firestore, and rendered nowhere**: `appearance`, `personality`,
`background`, and all three `connections.*`. Both the create and edit forms
carry inputs for them, and every seeded record holds real prose — Gandalf's
"secretly a Maia spirit" was typed in, saved, and has never been readable in the
app. That is write-only data, and surfacing it is recovered value rather than a
new surface.
Considered and rejected: enriching `Location` with prose fields (history, what
happened here) so that a page would have something to show. That inverts the
reasoning — a field should be added because a player wants to record something
they currently cannot, and the page follows the field. Building the page first
and filling it to excuse itself is invented work, and a data-model change is not
what a redesign phase is for. If such a need appears later it brings its own
page.
Cost: the two entity types now behave differently, which is a real
inconsistency. Accepted because D41 already framed this as a trial ("until the
pattern proves itself") and one entity is a better trial than two. 7.2 and 7.3
narrow to the NPC page with it.

### D62 — The page speaks the row's vocabulary, not a page dialect
Date: 2026-09-09   Status: active
Decision: the NPC page is assembled from what the directories already use --
`RosterField` for every labelled value, `EntitySigil` for identity,
`resolveLocationName` for the location, and a status stated as a word. It
introduces no new field component, no new token and no new CSS.
Because: the page and the row show the same record. If they disagreed about
what a label looks like, or about how an unresolved location reads, the product
would have two dialects for one entity and the page would feel like a different
application. Two concrete places this mattered:
- `resolveLocationName` carries #1412's deliberate behaviour -- a dangling
  reference stays visible as itself rather than being prettified into a
  location that does not exist. Reimplementing that on the page would have
  forked a decision that took a bug to settle. It is now exported from
  `campaign-entities`' barrel instead, because `pages/` may not reach into a
  feature's internals. The seeded data proves the point: Gandalf's `location`
  is the slug `mines-of-moria`, which the page must render as "Mines of Moria".
- `RosterField` already answers "what does an empty value look like" -- it says
  so in italics rather than hiding the field. On a page where most of the six
  new fields will be empty for most campaigns, that answer is the design.
Cost: one prop widened. `PageShell.title` takes a `ReactNode` so the sigil can
sit inside the `h1` beside the name. `EntitySigil` is `aria-hidden` by design,
so the heading's accessible name is still "Gandalf" and not "G Gandalf" --
asserted in the page's tests.

### D63 — A write that never settles is its own state, and says so
Date: 2026-09-09   Status: active
Decision: an inline save has four states, not three: `saving`, then `slow`
after eight seconds, then `saved` or `failed`. The `slow` state claims neither
outcome. It says "Still saving. Your text is safe, and the change will land
when the connection returns", keeps every typed character, and re-enables
Cancel so the user is not trapped.
Because: found by blocking the emulator's transport and trying to save.
**Firestore does not reject a write when the connection is gone** -- it queues
it, and the promise simply never settles. The editor sat on "Saving..."
indefinitely, which is exactly the failure 07-2 forbids ("never a spinner that
leaves you guessing whether it took"), only spelled in words rather than drawn
as a spinner. Words do not make an unresolved state honest.
The tempting fix -- time out and say "Not saved" -- is the same lie as claiming
success, pointed the other way: the queued write may well land the moment the
connection returns, and telling someone their sentence was lost when it was not
will cost them the sentence a second time when they retype it. "We do not know
yet" is the true state, so it is the one the user is given.
Cost: one more state to hold, and an eight-second timer. Cheap next to the
alternative, which is a user staring at a word that stopped being true.

### D64 — The accent follows the action being taken
Date: 2026-09-09   Status: active
Decision: while an inline editor is open, the page's header action (`Edit NPC`)
drops from filled to outline, so the save is the only accent on the page.
Because: the design language gives a page one accent, earned by action. Opening
an editor makes the save the action, and leaving both filled put two primaries
on screen -- "go and change everything" competing with "keep the sentence I
just typed", at the exact moment the second matters more. 7.1's test already
pinned "exactly one accented action"; without this the invariant would have
been broken silently by 7.2 rather than deliberately. It is now asserted in
both states.

### D65 — The entity page is a stack of cards, not one slab
Date: 2026-09-09   Status: active
Decision: the NPC page is composed of cards that each hold one kind of thing --
identity, description, the three prose fields, notes -- beside a sidebar of
relationships, tags and record. Rebuilt from a design mock after the first cut
was rejected.
Because: 7.1 put every field into a single card with a metadata aside, and it
read as a **form**: an undifferentiated column of uppercase labels with values
under them, where nothing was more important than anything else and the eye had
nowhere to rest. A record is not a form. Cards give the page joints, so a reader
can skip a whole section at a glance instead of reading every label to find the
one they want.
Three things carry most of the difference, and none of them is decoration:
- **The identity card starts with the image band**, and the two are one object
  rather than a band floating above a card. That fixes the page's proportions
  at the top, which is why the slot came forward from 7.3 rather than arriving
  after the layout had already been judged without it.
- **The description is serif italic at reading size.** It is the only running
  prose on the page; everything else is metadata and lists, and setting it the
  same as a field value was what made the page read as a form.
- **One Relationships list, each row saying why it is there.** Location,
  associates, affiliations, quests and rumors were four separate labelled
  fields; they are one list now, because "who and what is this person connected
  to" is one question. The reasons are derived from the kind of link -- a
  location is where they are, an affiliation is something they claim, a quest
  and a rumor each carry their own status -- so no field was added to store
  them. Only NPC-to-NPC has nothing to say beyond the other character's title,
  because `relatedNPCs` is a bare list of ids.

### D66 — An accent marks a control that writes; navigation is never accented
Date: 2026-09-09   Status: active
Decision: supersedes D64's "exactly one accent, following the action being
taken". The page's accents are the controls that change the record -- `Add
note`, `Delete`, and a `Save` while an editor is open. `Edit all fields` is
outline, because going to a form is not an act.
Because: D64 held only while every editor was summoned. The note composer is now
permanently on screen (a composer you have to summon is a composer you forget
exists), so the page always carries a writing action and "exactly one accent" is
no longer a rule anything can obey. Counting accents was the wrong invariant; it
was a proxy for the real one, which is *what kind of control earns emphasis*.
That version survives the composer, survives the editor being open, and is the
rule the design mock was already following -- its own footnote reads "Two
accents on the page, both actions: Add note and Delete".

### D67 — A note records who wrote it, from now on
Date: 2026-09-09   Status: active
Decision: `NPCNote` gains an optional `author`, set from the acting character
(falling back to the username) when a note is added from the page. Notes written
before the field existed keep no author and render with the column blank.
Because: the page shows a note history, and "who said this" is the second thing
a reader wants after "when". The field is optional rather than required, and
existing notes are **not** backfilled from the record's creator: the person who
created an NPC is not necessarily the person who wrote any note on it, so
backfilling would be inventing history to fill a column. A blank is honest; a
plausible wrong name is not.
Cost: `updateNPCNote`'s payload grows a field, and the composer needs the acting
profile. Both were already available.

### D68 — NPCs carry tags, and the forms that create them can set them
Date: 2026-09-09   Status: active
Decision: `NPC` gains `tags?: string[]`, matching `Location.tags`, with entry
added to both `NPCForm` and `NPCEditForm`.
Because: the design gives the sidebar a Tags card, and a card that can only ever
be empty is worse than no card. Adding the field without the form work would
have produced exactly that -- which is the trap this decision exists to record:
a display-only field is not a feature, it is a permanent empty state.
The control is the one `LocationFormSections` already uses, borrowed rather than
invented, and its button says "Add tag" rather than "Add" so it is not confused
with the affiliations control beside it -- by a reader or by a screen reader.

### D69 — Relationships are grouped by kind, and the grouping replaces the reasons
Date: 2026-09-09   Status: active
Decision: the Relationships card groups its rows under People, Places,
Affiliations, Quests and Rumors, in that order, and a group with no members
shows no heading. A row keeps a second line only where its heading cannot say
it.
Because: D65 merged five labelled fields into one list, which was right for the
question being asked -- "who and what is this person connected to" is one
question -- and wrong for the answer, once the answer was twelve rows. A
well-connected NPC turned the card into a bowl: people, places, affiliations,
quests and rumors interleaved in a single column, so finding an associate meant
reading past four quests. Grouping restores the joints without splitting the
card into five, which would have said the connections are five separate
subjects rather than one.
The second half matters as much as the first. The flat list needed a reason on
every row, so every affiliation read "Claims membership". Under a heading that
says Affiliations, that is **the type stated twice** -- the same redundancy 6.1
removed from directory rows, arriving by a different route. A row now carries
only what its heading cannot: an associate's own title, a quest's or rumor's
status, and which place a location is to them. Affiliations became
single-line, which also makes them look like what they are: names, not records
with somewhere to go.
Cost: the sidebar card title had to take the page's ink rather than the muted
tone, because a card heading and five group headings at the same weight is no
hierarchy at all.

---

## Revisions

### R1 — revises D9 (the layer-order half only)
Date: 2026-09-08
Change: Phase 0 does **not** declare a CSS layer order. The rest of D9 stands
and is implemented: surface classes own resting paint, `.selectable-item` owns
only hover and transition.
Because: an assumption in D9 turned out to be false. CSS cascade layers are
not a tie-breaker layered on top of specificity -- **unlayered declarations
beat layered ones outright, regardless of specificity**. Tailwind's utilities
are emitted unlayered (the `@import`s are hoisted above them, so utilities
land last). Putting `.selectable-item:hover` in a `state` layer therefore made
it lose to a plain `.bg-secondary` utility, silently killing hover on the
quest-progress cell -- the opposite of the intent, and a breach of the Phase 0
gate. Verified in the browser, not reasoned about: a layered rule with triple
class specificity lost to a single unlayered class.
Cost: the layer blocks were written and reverted the same session; no other
work depended on them. Declaring an order means also wrapping Tailwind's
output (`@layer tw-base, tw-components, surface, state, tw-utilities;` with
`@tailwind` inside each), which changes precedence app-wide -- including
inverting `theme-effects.css` against the utilities. That belongs in Phase 1
alongside the token restructure, not in a phase fenced as "nothing else
changes". Tracked as Q6.

### R2 — revises the recorded test baseline
Date: 2026-09-08
Change: the pre-Phase-0 baseline on `main` is **243 suites / 4883 tests, 0
failed, 2 skipped**.
Because: CLAUDE.md recorded 235 suites / 4717 tests, measured on a branch that
has since merged. Measured fresh at the top of this phase, per that file's own
"measure it, don't carry one forward" rule.
Cost: none -- caught before any change was made, so the after-run had a true
comparison. Post-Phase-0 run is identical: 243 / 4883, 0 failed.

### R3 — revises D5's role in Phase 1
Date: 2026-09-08
Change: Phase 1 introduces **no** `var(--new, --old)` fallbacks. D5 stands as a
rule for adding a token to a partially-migrated set; it simply had nothing to
do here.
Because: D5 exists to keep an unmigrated theme rendering while new tokens
appear. All three themes were migrated in the same commit, so no unmigrated
theme ever existed. The guarantee is now carried by something stronger than a
fallback chain: `themes.test.ts` asserts that light, dark and medieval define
exactly the same token paths as each other, so a theme cannot be missing a
token for a fallback to rescue. A fallback would have been unreachable code
asserting a state the tests forbid.
Cost: none. If a future phase adds a token to one theme before the others --
Phase 2's dark chrome is the likely case -- D5 applies again as written, and
the parity test is what will force the question.
Note also that fallbacks would have been actively unsafe here until D14: while
`variables.css` declared every name as `--x: ;`, `var(--new, --old)` could not
reach its fallback at all.

### R5 — revises D29: the hero band renders above the page column
Date: 2026-09-09
Change: `CampaignBanner` is rendered by `HomePage`, above
`max-w-7xl` / `.container`, rather than by `DashboardLayout` inside it. The
bleed is `-mx-4`, cancelling `main`'s padding exactly, instead of `50vw`
arithmetic.
Because: the band read as a floating card with page showing either side, even
though it measured full width. Both halves of that are worth remembering.
`getBoundingClientRect` reports the **layout box**; the column the band lived in
sets `overflow-x-hidden`, so the bleed was laid out correctly and then clipped
back to the column. Nothing inside a clipping ancestor can bleed past it, and
measuring the layout box will never show it. The fix is structural: render the
band outside the clip.
Once outside, `main`'s 16px padding is the only inset, so cancelling it is exact
-- and `50vw` was wrong anyway, because `vw` includes the scrollbar and left the
band 4px off-centre at narrow widths.
Cost: `DashboardLayout` no longer renders the band, so five of its tests moved
to `HomePage`, and `HomePage` needed the band mocked because it now reaches for
campaign context.

### D37 — The party crest lives in the aside; the hero carries no crest
Date: 2026-09-09   Status: active   (revises D29's slot placement)
Decision: the hero band's monogram is removed. A `PartyCrest` card sits at the
foot of the aside with an image slot whose empty state is a hatched panel drawn
from the page's own tokens.
Because: a large monogram beside the campaign name restated the title's first
letter next to the title -- redundant encoding, and it made the band's left edge
shout before the name did. The reference mockups place a wide plate slot in the
hero and the party crest in the aside, which is the better division: the hero
names the campaign, the crest identifies the group. The slot is empty now and
will be for most groups, so the hatched empty state is the design rather than a
placeholder.
Not matched to the mockup: its summary line reads "32 chapters" where the
mockup says "Four players, fourteen chapters". `Group` carries no member count,
so the player half needs data plumbing that this change did not do.

### D38 — The footer reserves space on the horizontal axis
Date: 2026-09-09   Status: active
Decision: the footer is one compact row -- copyright left, links right from `sm`
up, stacked and left-aligned below it. `pb-20` is replaced by `sm:pr-20`.
Because: the floating create button is `fixed right-6 bottom-6` and 48px square,
so it only ever overlaps the bottom **right**. Reserving 80px of bottom padding
answered that on the wrong axis and cost roughly 64px of dead height at the foot
of every page, including for signed-out users who get no button at all. A
right-hand gutter costs nothing, because the row has spare width. Below `sm` the
row stacks left-aligned, so its last line ends well short of the button rather
than wrapping under it. Footer height: 140px -> 60px wide, 88px at 320px.

### R6 — revises R2's recorded test baseline
Date: 2026-09-09
Change: the pre-Phase-6 baseline on `main` is **250 suites / 4899 tests, 0
failed, 2 skipped**.
Because: R2 recorded 243 / 4883, measured before Phases 1-5 merged. Measured
fresh at the top of this phase, per CLAUDE.md's "measure it, don't carry one
forward" rule -- which has now caught a stale figure three times running.
Cost: none; caught before any change was made.

### R7 — revises Phase 6's PR count from five to four
Date: 2026-09-09
Change: `handoff/06-1` (sigil paint and adoption) is folded into `06-2` (row
anatomy), which becomes the phase's second PR. Phase 6 is 6.0, 6.1, 6.2, 6.3.
Because: two of 06-1's three steps had already shipped in Phase 3 -- the
`--entity-palette-*` variables resolve, and `.entity-sigil` with its eight index
rules is already in `components.css`. What remained was one import and a threaded
id, which is a commit rather than a PR. More to the point, landing it alone would
have left the app in exactly the state 06-2 exists to fix: a sigil, a coloured
type chip and a type-derived colour, three encodings of one fact. The seam
between 06-2 and 06-3 is kept, because a density change moves every pixel in a
screenshot and mixing it with an encoding change makes the diff unreadable.
Cost: the second PR is the phase's largest. Its two halves are separate commits.

### R8 — revises 04-rollout.md's claim that nothing uses `EntitySigil`
Date: 2026-09-09
Change: `ActivityFeed` has rendered `EntitySigil` since Phase 4. The claim was
written against the tree as of Phase 3.
Because: recorded so the next reader does not repeat the check. The substance
survives -- no *directory* renders one, which is what Phase 6 fixes -- but "one
import in `Roster.tsx`" is the second adoption, not the first.

### R9 — revises Q11: the status dot goes
Date: 2026-09-09
Change: Q11 is settled. A status is stated as a word in the status hue, and the
coloured dot beside it is removed from all four directories.
Because: the dot and the word encode one fact, and the dot is the encoding that
fails first -- it is the half nobody can read. It also turned out to be actively
harmful here: in `LocationDirectory` the dot and the word disagreed (D47), and
across all four directories the dot was quietly compensating for status hues
that do not meet AA as text (D48). Redundancy was propping up two defects.
Cost: the status hue now carries the fact alone, which raises the bar on those
values. That bar is now a test.

### R10 — revises the recorded test baseline
Date: 2026-09-09
Change: `main` after PR 6.0 is **239 suites / 4659 tests, 0 failed, 2 skipped**.
PR 6.1 takes it to 239 / 4676.
Because: R6 recorded 250 / 4899, measured before 6.0 deleted the journal's
eleven suites and `SectionHeading`'s. Measured fresh, per CLAUDE.md.

### R11 — revises the recorded test baseline
Date: 2026-09-09
Change: `main` after PR 6.1 is **239 suites / 4693 tests**. PR 6.2 takes it to
239 / 4694.
Because: measured fresh at the top of the PR, per CLAUDE.md.

### R12 — revises D48's ratchet, and closes Phase 6
Date: 2026-09-09
Change: the dark entries in the status-contrast ratchet are removed, having been
fixed rather than tolerated (D56). Only `medieval.unknown` remains.
Because: D48 wrote "a ratchet is not a pass" and named `dark.status.failed` at
2.41:1 as unreadable. Phase 6 made that concrete by removing the last redundant
encoding, so the PR that finished the phase is the one that had to answer it.
Cost: dark's status hues are now two deliberately chosen values in an otherwise
unmigrated theme. Phase 11 should treat them as already done rather than
re-tuning them from scratch.

### R13 — revises 04-rollout's Phase 7 scope: the cards are dead, not unmigrated
Date: 2026-09-09
Change: Phase 7 **deletes** `NPCCard`, `LocationCard` and `RumorCard` rather
than migrating them, and drops no `[data-theme=…]` patches, because there are
none to drop.
Because: both halves of that sentence were written against the tree before
Phase 6. Measured now: the three cards are exported from
`features/campaign-entities/index.ts` and rendered by **nothing** — 1,341 lines
of component plus roughly 1,300 lines of test, reachable only from their own
test files. They were stranded when the directories moved to `Roster` rows.
`NoteCard` is the exception and is live, rendered by `NotesList`.
The 21 `[data-theme=…]` rules that remain are medieval ornament (10),
scrollbars (4), a dark dialog shadow, a light card hover and book/reader
typography (4). Not one is a card colour patch.
Found by grepping for the identifier rather than for `<NPCCard`, which is the
lesson CLAUDE.md already records about this codebase: a barrel export is a
reference that a JSX-shaped grep does not see.
Cost: none, and a saving. It also gives Phase 7 a genuine ordering: `07-0`
deletes them, having first been read, because they are the closest thing the
repo has to a specification for what an entity page shows. That field list is
copied into `07-1` so it does not depend on the files surviving.

### R14 — revises 07-0's claim that `quest-status-*` still has a consumer
Date: 2026-09-09
Change: `.quest-status-{active,completed,failed}` are deleted. The handoff said
to keep them because "LocationDirectory still renders it, and Phase 12 retires
that family".
Because: that stopped being true in 6.3. D59 replaced the hue-coded `Scroll`
icon in a location's linked-quests list with the quest's status stated as a
word, which removed the last dynamic `quest-status-${status}` consumer. The two
cards deleted here were the only others. The handoff was written before 6.3
merged and carried the stale fact forward — the third time in this phase a
recorded fact was stale at the moment it was read, and the reason each PR
re-measures instead of citing.

### R15 — records a fourth stranded component, and does not delete it
Date: 2026-09-09
Change: `NPCLegend` is left in the tree, but `.npc-status-*` is now documented
as having no *rendered* consumer.
Because: `NPCLegend` is stranded in exactly the shape the three cards were —
exported from the barrel, covered by its own test file, rendered by no
component. The difference is that it looks deliberate: `core/config/buildConfig`
carries `showNPCLegend: false`, with tests pinning it false. Except **no code
reads that flag**, so the legend cannot be switched on either; the flag records
an intention that was never wired.
It is not deleted here because 7.0's scope is the three cards, and because the
choice between wiring it up and retiring it is a real one: a legend is the one
place the design language permits a hue to carry meaning alone, since the
legend is itself the key. That makes it the natural home for the `npc-status-*`
family rather than dead weight. Deciding needs an owner; see Q15.

### R19 — revises 04-rollout's and A3's account of Phase 8
Date: 2026-09-09
Change: Phase 8 is not "almost all consumption, not design", and its one open
question is already closed. Measured across the eleven form files while writing
the handoffs:
- **There is no `Select` primitive**, and the forms render **11 raw
  `<select>`** between them (RumorForm 4, NPCForm 2, NPCEditForm 2,
  LocationFormSections 2, QuestFormSections 1). A3 says the `field.*` tokens
  are complete so the phase is consumption — true of text fields, false here.
  There is nothing to consume, so `08-0` builds one before anything else runs.
- **17 hand-written labels are not associated with their controls** — all the
  same line, `<label className="block text-sm font-medium mb-1 form-label">`
  with no `htmlFor`, against 8 places in the same files that do it correctly.
  Those controls are unnamed to a screen reader (WCAG 1.3.1, 4.1.2). It is the
  form set's largest accessibility defect and nothing in the plan mentioned it,
  because the plan was written about colour.
- **The colour half is already done**: zero hardcoded hex values and zero
  `[data-theme=…]` patches survive in any of the eleven files. The same shape
  of correction R13 had to make for Phase 7 -- a phase scoped around repainting
  arriving to find the paint already right and the structure wrong.
- **"Whether a form sits on `card` or on `page`" is answered.** All eleven
  render inside `<Card>`, unanimously. `08-3` ratifies it in a decision rather
  than reopening it.
Because: the plan's Phase 8 paragraph was written before Phases 3a-7 ran, and
the token work those phases did is exactly what removed the colour problem it
describes. Measuring first is what turned a repaint into an accessibility fix.

### R18 — revises 07-3: the image slot shipped inside 7.2.5
Date: 2026-09-09
Change: Phase 7 has no separate 7.3. The image slot -- the shared `ImageSlot`
component, the generalised `.image-slot` rule, and the NPC page's band -- landed
as part of the 7.2.5 redo.
Because: the mock's layout begins with the band, and the identity card's
proportions are set by it. Reviewing a new layout with a hole where its first
element belongs would have meant judging it twice and rebuilding it once.
07-3's own rules were kept rather than skipped: no Storage, no picker, no
upload, no generation, and the empty state is the whole component. One thing in
the mock was **not** built -- its caption reads "drop a photo", which promises
an upload this build cannot do. The slot says the state honestly instead.
`.party-crest-slot` became `.image-slot` and `PartyCrest` now renders the shared
component: two callers is the threshold 07-3 set for generalising, and the
second one had just arrived.

### R17 — revises R16: the raw ISO date is not LocationDirectory's alone
Date: 2026-09-09
Change: R16 named `LocationDirectory` as the place that prints a note's date
raw. `NPCDirectory` does it too -- an expanded Gandalf row reads
`2025-05-31T19:27:30.387Z` in exactly the same way. R16's fix is therefore
two rows wide, not one.
Because: seen in the browser while verifying 7.1, on the row this PR was adding
a button to. The cause is that `NPCNote.date` has no agreed shape: the create
form writes `YYYY-MM-DD`, the sample-data generator writes a full ISO
timestamp, and both directories print whichever they were handed.
The new page formats it -- a date the reader cannot read is not a date -- and
returns anything unparseable untouched, the same principle `resolveLocationName`
applies to a dangling location. The rows are deliberately left alone: 7.1 is
additive and must not change what a row renders (D41), so the page and the row
disagree about this one value until R16 is taken. That is a knowingly accepted
inconsistency with a short life, not an oversight.

### R16 — records a defect found while verifying, out of scope to fix here
Date: 2026-09-09
Change: none in this PR. `LocationDirectory` renders a note's date as the raw
stored string, so an expanded Isengard row reads
`2025-05-31T19:27:30.387Z` where the NPC row would read `31/05/2025`.
Because: found in the browser while checking that this deletion changed
nothing. It is a Phase 6 miss, not a Phase 7 one — `RosterField` "Notes" prints
`{note.date}` directly while `NPCDirectory` formats the same shape through
`toLocaleDateString`. Recorded rather than fixed because this PR only deletes,
and a deletion PR that also changes rendering cannot honestly claim "nothing
rendered differently anywhere". Whoever opens `LocationDirectory` next should
take it.

---

### R20 — revises D11: there is no integration branch, and has not been since Phase 3
Date: 2026-09-10
Change: a phase branches off `main` and its PRs merge to `main`.
`04-rollout.md` §3 said "off the integration branch"; it no longer does.
Because: measured rather than decided. Every PR from #44 (Phase 3) through #55
(Phase 7) merged a `visual/phase-*` branch straight into `main` —
`visual/integration` was never the target for any of them. D11's reasoning was
that a half-migrated token model should live as an unmerged branch rather than
on `main`, and that risk expired when Phase 1 landed: from Phase 3 onward each
phase has been a self-contained visual change that is fine to have on `main`
half-rolled-out, because the archetypes inherit rather than depend on each
other. The documented rule outlived the reason for it by six phases, and a rule
nobody follows is worse than no rule — the next person reads it, branches off a
stale `visual/integration`, and rebases for an afternoon.
Cost: none. This records what was already happening.

### R21 — revises 08-1's scope: the three non-form `<select>` come too
Date: 2026-09-10
Change: `08-1` migrates 14 raw `<select>`, not 11. The three outside the form
set — `ActivityFeed.tsx` (the activity filter), `NotesList.tsx` (the sort
control) and `CombineRumorsDialog.tsx` — are added to its scope.
Because: `08-1` as written set a gate its own scope could not pass. The gate
says `grep -rn '<select' src/features src/pages` returns nothing; the scope
listed only the eleven form files, which hold 11 of the 14. Something had to
give, and widening is the right direction: once `Select` exists each of the
three is a one-line swap, and leaving them is precisely the "shared component
with two remaining hand-rolled cousins" that `08-2` names as having made things
worse rather than better. A native `<select>` styled by hand is also where the
unassociated-label defect came from in the first place.
Cost: three more files in a PR that was already wide and shallow, and three
more test files that may need their queries strengthened. The behavioural rule
is unchanged and applies to them identically — this PR changes what the DOM
says about a control, never what the control does.



### D70 — `Select` is a native `<select>`, and Input's sibling in every other way
Date: 2026-09-10   Status: active
Decision: `core/components/Select.tsx` wraps a native `<select>`, takes the same
prop names as `Input` for the same jobs (`label`, `helperText`, `error`,
`successMessage`, `size`, `disabled`, `containerClassName`), forwards its ref,
generates an id with `useId` when a label is given, and paints from `field.*`
through the existing `.input` classes. It adds no token and no CSS: the
production stylesheet is byte-identical at 10.94 kB after the build.
Because: the browser's own control is keyboard-accessible, screen-reader-correct
and gets a native picker on a phone, all for free and all of it work we would
otherwise have to write and then keep right. The options arrive as children
rather than through an `options` prop, so a call site that maps an array keeps
reading like the markup it replaces.
The prop names matter more than they look. 8.1 moves 17 hand-written labels onto
a primitive's `label` prop across eleven files; a caller who has to remember
which component wants `label` and which wants something else will get some of
them wrong, and the ones they get wrong are silently unlabelled again.

### D71 — the Dialog audit found three of its four items broken, and fixed them
Date: 2026-09-10   Status: active
Decision: `Dialog` gains `role="dialog"`, `aria-modal="true"`, an
`aria-labelledby` pointing at its own title, focus moved into the panel on open,
focus returned to the opener on close, and a Tab/Shift+Tab trap.
Because: 8.0 asked for an audit against four items — focus trap, restore on
close, Escape, labelled by its own title. Escape was the only one that worked.
The other three were not merely absent but **actively misdescribed**: the
component's own JSDoc said it provided "a backdrop, close button, and focus
trap", and there was no focus code in the file at all. A keyboard user tabbed
straight out of the dialog into the page behind the backdrop, and a screen
reader met an anonymous `<div>` of text rather than a dialog with a name.
Verified in the browser on `CombineRumorsDialog`, not only in jsdom: the panel
reports its accessible name as "Combine Rumors", twelve consecutive Tab presses
never left it, and Escape returned focus to the `Combine` button that opened it
rather than to `<body>`. Seven components render `Dialog` today and inherit all
of this.
Cost: 7 tests added to a suite that had 16 and asserted nothing about focus or
role. The trap is bound to the panel rather than the document, so a nested
dialog traps on its own without either instance knowing about the other.

### D72 — a field's own ground is a contrast pair, and was never gated
Date: 2026-09-10   Status: active
Decision: `token-contrast.test.ts` gains a block measuring the control's ink
against `field.bg` (AA) and `field.border` against the worst of `field.bg` and
`surface.card.bg` (3:1), in all three themes.
Because: `.input` paints `color: var(--surface-page-on)` on
`background-color: var(--field-bg)`, and those two tokens come from different
halves of the model. `field.bg` is a distinct value from every surface
background in all three themes, so the ink inside a control was never measured
against what is actually behind it — the surface-pair block checks page ink on
the *page*, which is not where a field's text sits. That is precisely the
failure shape the file's own header describes, left open on the one surface
every form in the app is made of.
All six new assertions passed on the existing values, so no token moved. That is
the useful outcome rather than a disappointing one: the gate now holds a
property that was true by luck, and Phase 11 is about to change dark's values.
Proved it can fail before believing it — mutating light's `field.bg` to `#3A342C`
turns it red, and only it.

### R22 — records a dark-theme select defect, out of scope to fix here
Date: 2026-09-10
Change: none in this PR. In the dark theme, `color-scheme` computes to `normal`
on the root while `data-theme` is `dark`, so the browser paints a `<select>`'s
**dropdown popup** in its light appearance while the `<option>` ink is
`#E0E0E0` — light grey on a light popup. The closed control is fine and was
checked: `#2a2a2a` fill, `#82829A` border, `#E0E0E0` ink, chevron following
`color`.
Because: found while verifying 8.0 in the browser. It is pre-existing and
affects all 14 raw `<select>` identically, so it is not `Select`'s defect and
fixing it here would mean a repaint PR smuggled into a primitive PR. It is also
not a CSS patch: saying "this theme is dark" is something the **surface model
cannot currently express**, and design language §12.8 is explicit that a new
theme-conditional rule means the model is missing something. That makes it
Phase 11's work (dark to parity), where a theme gains a scheme token honestly,
rather than a `[data-theme="dark"] { color-scheme: dark }` patch that gate 4
forbids on sight.
Not confirmed by eye: a native popup is drawn by the OS and does not appear in a
CDP screenshot, so the reading above is from computed styles plus Chrome's
documented behaviour. Whoever takes Phase 11 should open one select in dark
first and look.



### D73 — a repeated row is named in the accessibility tree, not with a visible label
Date: 2026-09-10   Status: active
Decision: controls that repeat per list row -- a quest objective, a lead, a key
location, a complication, a reward, a location feature, the tag and affiliation
entries -- get an indexed `aria-label` ("Objective 3", "Reward 2") rather than a
visible `<label>` each.
Because: 8.1's rule is that an input whose only name is a placeholder loses its
name the moment someone types, and that is true of all of these. But stamping a
visible label above every row of a repeating list is *adding chrome*, which the
same handoff forbids ("do not restyle, re-space or reorder anything") and which
8.3 owns. The index is what a visible label could not carry anyway: with six
rewards on screen, "Reward" names none of them usefully and "Reward 4" does.
The checkbox beside each objective was the worst case -- it had no name at all,
visible or otherwise, so a screen reader announced an unlabelled checkbox six
times in a row. It now says which objective it completes.

### D74 — the gate walks the DOM, because a grep cannot see a dropped prop
Date: 2026-09-10   Status: active
Decision: `test-utils/accessible-names.ts` exposes `unnamedControlsIn`, and every
migrated form suite asserts it returns nothing. Eleven tests, one per form.
Because: 8.1's own gate was two greps -- no `form-label` line, no `<select>`.
Both pass on markup that is silently worse: a `<Select>` whose `label` prop got
dropped during the move greps identically clean. Walking the rendered DOM and
asking each control for its accessible name is the only check that tests the
property the phase is about. Placeholders deliberately do not count as a name.
It earned itself immediately. It caught **four unnamed controls that the greps
could not see**: the tag and affiliation inputs on both NPC forms, added in
7.2.5 with a placeholder and no label. Proved it can fail before trusting it --
restoring the pre-8.1 `RumorForm` turns it red and names the three unnamed
selects.

### D75 — a stub must not be laxer than the thing it stands in for
Date: 2026-09-10   Status: active
Decision: `SagaEditPage.test.tsx`'s `Input` mock now sets `htmlFor`/`id` the way
the real `Input` does.
Because: the new gate failed on that page, and the defect was in the **mock**,
not the page -- the stub rendered `<label>{label}</label>` beside a control with
no id, so every control it produced was unnamed. The page itself was correct all
along. A stub that is more permissive than the real component turns a real gate
into a green light, and this one would have reported a page as accessible no
matter what the page did.
Not fixed by deleting the mock: 20 assertions in that file query the stub's
`data-testid`s, so unmocking is a larger and riskier diff than the migration it
would be riding along with. Logged instead -- those queries should become
`getByLabelText` when someone is next in that file with a reason to be there.

### R23 — revises R21: the count is 13, not 14
Date: 2026-09-10
Change: 8.1 migrated **13** raw `<select>`, not 14. `ActivityFeed.tsx` has none.
Because: R21 counted a `<select>` that appears only inside a **comment** --
ActivityFeed's own docblock says its filter "is a visible pill row rather than a
`<select>` that hid five of its six options behind a click", describing a control
it deliberately does not have. `grep '<select'` matched the prose.
This is the grep lesson in CLAUDE.md arriving by a new route: the previous
version was about `^export` missing indented exports, this one is about a pattern
matching a comment. Both have the same fix, which is to open the file. The two
genuinely outside the form set were `NotesList` (the sort control, already
correctly `aria-label`led) and `CombineRumorsDialog` (a hand-written label).
Cost: none in code. The gate is unchanged and passes; only the number was wrong.

### R24 — revises 08-1's "1 raw `<input>` in QuestFormSections"
Date: 2026-09-10
Change: that input is a **checkbox**, and it was not routed through `Input`.
Because: 8.1 lists it among "the raw controls that bypass `Input`", which was
written from a grep rather than from the markup. `Input` paints
`h-10 text-base px-3 w-full rounded-lg border` -- putting a checkbox through it
renders a stretched empty box where a tick belongs, which is a restyle, and a
bad one, in the PR that forbids restyling. The handoff named the wrong remedy for
a real defect: the checkbox had **no accessible name at all**. It has one now
(D73), which is the fix the observation was actually pointing at.



### D76 — two chips, because filling is right once and wrong six times
Date: 2026-09-10   Status: active
Decision: `core/components/Chip.tsx` exports `SelectableChip` (a toggle, painted
`.chip-toggle`) and `RemovableChip` (a label with a delete, painted `.chip-tag`).
Neither is `.chip`, which already existed and stays exactly as it is.
Because: 8.2 asked for "one shared chip", and the tree turned out to already have
one -- `.chip`, used by `shared/components/contact/CategoryChips`, whose own CSS
comment records a deliberate decision to **fill** the chosen chip with
`--color-primary`. That looked like a direct contradiction of 8.2's
"accent-bordered, not accent-filled" and it is not: `CategoryChips` is
**single-select**. Exactly one chip is ever chosen, so filling costs exactly one
accent and makes the answer unmistakable. The entity forms are multi-select,
where six chosen NPCs filled with the accent would put six accents on a form and
leave the control that writes competing with them.
So the rule is not "chips are bordered". It is that **fill marks the one chosen
thing, and border marks each of many**. Two kinds of chip, two treatments, two
class names -- rather than one name whose meaning depends on which list it landed
in.
Cost: three class names where 8.2 imagined one, and a paragraph in
`components.css` explaining why. Cheaper than the alternative, which was silently
redefining `.chip` under `CategoryChips` -- and which is exactly what the first
cut of this PR did, until the browser showed selected chips rendering filled.

### D77 — a chip's border is `--color-primary`, never `--action-primary-bg`
Date: 2026-09-10   Status: active
Decision: `.chip-toggle-selected` takes its border and ink from `--color-primary`.
Because: `--action-primary-bg` is tuned to be a **fill** that dark text sits on,
which is a different job. In medieval it is `#E8D0AA`, pale tan on a `#FDF5E6`
parchment page: **1.38:1**, a line you cannot see. `--color-primary` is the token
every theme tunes to stand against its own page -- 7.93 light, 7.78 dark, 9.24
medieval -- so it is the one a border can rely on.
`.chip`'s existing comment had already worked this out and said so, which is the
argument for reading the file you are about to duplicate. This decision is that
comment, generalised and now gated.

### D78 — the accent budget is per surface, not per DOM tree
Date: 2026-09-10   Status: active
Decision: the gate "a form with several selections has exactly one accent"
counts filled accents **per surface**: at most one on the form, and at most one
inside any open modal.
Because: written as a single count it failed immediately and correctly -- an open
selection dialog has its own `Add Selected` button, so the form's submit and the
dialog's confirm are two filled accents in one DOM tree. That is not the defect
the rule exists to catch. A modal is its own surface and the form behind it is
inert; what must never happen is the *chips* adding to either count, and they do
not. The test asserts both counts separately for exactly that reason.
Noted while doing it, not fixed: the "Done" buttons that merely close a selection
dialog are filled primaries, and closing a dialog is not a write (D66). 8.3 owns
primary actions and should decide that once across all eleven forms rather than
have it smuggled in here.

### R25 — records an invisible filter-pill border in medieval, and its fix
Date: 2026-09-10
Change: none in code. `.roster-filter-active` borders with `--action-primary-bg`,
which in medieval measures **1.38:1** against the page -- so the chosen directory
filter has been drawing an edge nobody can see since D51 shipped in Phase 6, with
every gate green.
Because: no gate measured that token as a boundary; it is named as a fill and was
only ever checked as one. Found while gating the chips, which is the second time
in three PRs that adding a contrast pair has turned up a live defect (D72 was the
first). The fix is known and is the one the chips took -- `--color-primary`, which
clears 3:1 in all three themes -- but the filter pills are Phase 6's surface and a
change to a shipped directory does not belong in a PR about form chips.
Ratcheted in `token-contrast.test.ts` meanwhile, with a companion test that fails
if medieval ever *passes* 3:1, so the exemption cannot quietly outlive its reason.
Phase 11 deletes medieval regardless (D40).

### R26 — a frozen tab makes `getComputedStyle` lie, and it cost an hour
Date: 2026-09-10
Change: none in code. A note about verifying CSS through browser automation.
Because: while checking the chips, `getComputedStyle` reported a selected chip's
`color` and `border-color` as the *unselected* values, repeatedly, across a hard
reload -- while an identical element built by hand in the same parent reported the
right ones. The element also refused to change when its classes were removed.
The cause was `element.getAnimations()`: five `CSSTransition`s, `playState:
"running"`, `currentTime: 0`, still 0 after 2.5 seconds. An automated tab does
not advance its animation timeline, so every transitioned property reads as the
**start** of a transition that never runs. `.chip-toggle` sets `transition: all`,
so colour, border and outline were all affected.
Two things to take from it: a screenshot forces a paint and told the truth
immediately, and a cloned node has no in-flight transition so it reports the
resolved value. Reach for either before believing a computed style that contradicts
what the CSS plainly says. The real bug underneath was found by the screenshot,
not by the introspection -- selected chips were rendering filled, because `.chip`
was already taken (D76).



### D79 — a form sits on `card`, ratified rather than decided
Date: 2026-09-10   Status: active
Decision: the form surface is `card`. All eleven forms already render inside
`<Card>`, without exception.
Because: `04-rollout.md` listed this as Phase 8's one open question. R19 measured
it closed by unanimous practice before the handoffs were written, and 8.3's job
was only to say so out loud rather than reopen a question the codebase had
already answered by itself.

### D80 — an accent marks the control that writes the record, not the draft
Date: 2026-09-10   Status: active
Decision: on a form, the only filled accent is the submit. `Add`, `Add tag` and
the dialog-opening buttons are outline. Inside a modal, the confirm that commits
a selection (`Add Selected`, `Done`) keeps one filled accent of its own; a
`Close` that only dismisses an informational dialog does not.
Because: D66 says an accent marks a control that changes the record, and D78
added that the count is per surface. `Add tag` changes the **draft** -- the
record changes when you save -- so a form carrying `Add`, `Add tag` and `Create
NPC` all filled had three places for the eye to go and no answer to "where is
save". Measured before changing anything: NPCForm and NPCEditForm had three
filled accents each, LocationFormSections one competing with the submit of
whatever form composed it, and SagaEditPage's export dialog a filled `Close`.
The modal half is not an exception to the rule but the same rule applied to a
second surface: `Add Selected` commits the choice the dialog exists to make, so
it is that surface's writing control. `Close` on a dialog that only tells you
something writes nothing, and is now outline.

### D81 — one column, and the grid cells go with it
Date: 2026-09-10   Status: active
Decision: the five two-column field grids become one column, and the bare `<div>`
grid cells they held are unwrapped so each control is a direct sibling at the
form's own rhythm.
Because: a form is read and filled top to bottom, and a second column doubles the
number of places the eye has to check for the error it just triggered. It also
pays at 320px, where a two-column row gave each control 160px: `Status` and
`Relationship` now stack instead of being crammed side by side. The wrapper divs
were kept deliberately in 8.1 -- that PR was forbidden from touching layout, so
`<div><Select/></div>` was the honest intermediate state -- and removing them is
this PR's business. The two `grid-cols-2 md:grid-cols-3` grids in `RumorForm`
stay: they lay out chips inside a dialog, not fields.

### R27 — revises 08-3's account of section heads and delete placement
Date: 2026-09-10
Change: two of 8.3's five items were already done, and are recorded rather than
performed.
- **Section heads are unanimous.** 08-3 says they "are `Typography variant="h4"`
  in some files and `variant="body" className="font-medium"` in others -- pick
  one". Measured: every section head in every one of the eleven forms is `h4`,
  and the five files with no section heads have none. The `body`+`font-medium`
  instances the handoff saw are in `NPCLegend`, `QuestDirectory` and two dialogs,
  none of which is a form section head.
- **Delete is already separated.** Only one of the eleven forms has a delete at
  all (`ChapterForm`), and it already sits left, grouped with Cancel, against a
  right-hand Save in a `justify-between` footer. `DangerZoneCard`'s separation is
  already the practice here.
Because: the same shape of correction as R13 and R19 -- a handoff written from a
survey rather than from the files, describing a state two phases of work had
already changed. The rule stands and is now asserted; there was simply nothing to
move.

### R28 — a third stub laxer than its component, and the pattern is now the point
Date: 2026-09-10
Change: `SagaEditPage.test.tsx`'s `Button` mock now emits `button button-<variant>`
like the real one, defaulting to `primary`.
Because: the accent-budget gate reported **zero** filled accents on a page that
has one. The stub dropped `variant` entirely, so nothing it rendered ever wore
`.button-primary`. The page was correct; the test could not see it.
This is the third time in Phase 8 (D75 for `Input`, 8.2 for the `Dialog` mocks,
now `Button`) that a hand-written stub was more permissive than the component it
replaced, and each time the effect was the same: a gate that reports a pass it
has not earned. The mocks predate the properties being gated, which is how it
keeps happening -- 8.0 gave `Dialog` a role, 8.1 gave labels an association, 8.3
counts button variants, and every stub written before those was silently exempt.
Worth a standing habit rather than three separate fixes: when a PR gates a
property, grep the mocks of the component that carries it.



### R29 — revises 04-rollout's account of Phase 9, measured before the handoffs
Date: 2026-09-10
Change: Phase 9 is not the reading-surface build its paragraph describes. Most
of that shipped in `413259e` ("rebuild the chapter reader around scrolling and a
persistent rail") before the phase started. Measured across the nine A4 files
while writing `handoff/09-0` … `09-3`:
- **The reader is finished.** `ChapterReader` caps at `max-w-[68ch]`, wears
  `.reader-prose` (Newsreader serif, medieval variant included), carries sans
  chrome in one footer row, and `ChapterRail` is persistent at `lg` and a drawer
  below. A4's "capped measure, serif running text, navigation as quiet chrome"
  is describing something that exists.
- **The colour half is already done, again.** Zero hardcoded hex and zero
  `[data-theme=…]` patches across all nine files. Third phase running (R13 for
  Phase 7, R19 for Phase 8) where a phase scoped around repainting arrives to
  find the paint right and the structure the work.
- **Markdown is genuinely missing**, and is the only part of the description
  that survived intact. No `react-markdown`, no `remark`, no `marked`, no
  sanitiser -- nothing in the family is in `package.json`. Q10 is greenfield.
- **Notes have no reading surface.** D45 names notes as a markdown field, but
  `NotePage` mounts `NoteEditor` directly, so a note is only ever an editable
  textarea, a truncated `NoteCard` preview, or a row on the NPC page. Rendering
  markdown for notes therefore needs a decision about *where* before it needs a
  renderer; `09-0` carries it.
- **`ChapterRail` is on `card`, not the `sunken` A4 specifies.** Left alone
  pending a judgement rather than silently changed either way.
- **A fifth stranded component**: `LatestChapter`, 75 lines, barrel-exported,
  12 tests, rendered by nothing -- the same shape as R13's three cards and R15's
  `NPCLegend`. Most likely lost its consumer when Phase 4 recomposed Home around
  `ActivityFeed`.
Because: the phase paragraph was written before Phases 3a-8 ran, and the reader
rebuild happened in between. Measuring first turned a repaint-and-compose phase
into a dependency phase with a cleanup attached, which is a different four PRs
than the ones a plan-driven handoff would have produced.

### R30 — a decision that lives only in a commit message is not recorded
Date: 2026-09-10
Change: none yet in code. Flagging that `BookViewer`'s pagination is a
deliberate design decision documented nowhere a reader of this file would find
it. `413259e`'s commit body says: "BookViewer is deliberately untouched:
SagaPage still uses it, and the saga is one continuous work that keeps the
page-turning presentation."
Because: the product now has two reading models on purpose -- a chapter scrolls,
a saga turns pages -- and the reasoning for that is one `git log` away from
being invisible. Found while writing `09-1`, where the honest first instinct was
"the reader scrolls and the saga paginates, unify them", which would have
reversed a decision without knowing one had been made. `09-3` gives it a
D-number. The general point is worth more than the instance: this log exists so
that on day nine you can tell *this was decided* from *this drifted*, and a
decision recorded only in a commit message reads as drift to everyone who
arrives later.


---

## Open questions

Answer as the work reaches them; move to a decision when settled.

- **Q1** — Entity palette as index-suffixed variables or one joined value?
  Changes what a manifest can assert. Decide before package extraction.
- **Q2** — Does the package validate enum token *values*, or only that
  variables exist? Ornament needs the former, which is stronger than a
  spelling check.
- **Q3** — Should the precedence lint (no resting background in a state class)
  live in the app or the shared package?
- **Q4** — Which surface does the hero band's empty fallback use, and does it
  differ per theme?
- **Q5** — When do fallbacks get removed? Proposal: only once every theme
  defines the token, as deliberate cleanup.
- **Q10** — Which CommonMark renderer, and does it run at write time or read
  time? First PR of Phase 9 (`handoff/09-0`). Measured greenfield: nothing in
  the markdown family is installed. Also carries "where do rendered notes
  appear", since notes have no reading surface (R29).
- **Q17** — Is the chapter rail `sunken` (A4) or `card` (what `413259e` built)?
  See `handoff/09-3`. Whichever wins, the other has to stop saying otherwise.
- **Q18** — Wire `LatestChapter` up or retire it? The fifth stranded component
  (R29), and the same shape of question as Q15. Needs someone to say whether
  Home wants a "continue reading" affordance.
- **Q12** — Does an entity keep real edit history? `ContentAttribution` stores
  created and last-modified and nothing between, so the "timeline of edits"
  Phase 7 was scoped around cannot exist without a data change. Answer before
  anything promises a timeline.
- **Q13** — Can a note be edited or deleted after it is written? 7.2 adds
  notes only. Changing a shared record's history is a decision about the
  record, not about the page.
- **Q16** — How does a theme say it is dark, so the browser paints native
  controls (a `<select>`'s popup, scrollbars, a date picker) to match? See R22.
  Phase 11 needs an answer; a `[data-theme=…]` rule is not one.
- **Q15** — Wire `NPCLegend` up or retire it? See R15. A legend is where a hue
  may legitimately stand alone, so this decides whether `.npc-status-*` has a
  future or follows the card families out.


Settled: **Q1** by D25, **Q6** by D33, **Q7** by D14, **Q8** by D15, **Q9** by D32,
**Q11** by R9, **Q14** by D61.
