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
Date: 2026-09-08   Status: active
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

Settled: **Q1** by D25, **Q6** by D33, **Q7** by D14, **Q8** by D15, **Q9** by D32.
