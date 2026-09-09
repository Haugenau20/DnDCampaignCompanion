# The five archetypes

The rollout unit. A route does not get a design; it gets assigned an
archetype, and the archetype is designed once.

Written after reading the app: eight routes share A1, six share A3. The
per-route work left over after an archetype lands is typically deleting class
names.

---

## A1 — Collection you scan

**Owns:** `core/components/Roster.tsx`, `NPCDirectory`, `LocationDirectory`,
`QuestDirectory`, `RumorDirectory`, `NotesList`, `ChapterList`, `NPCLegend`,
`CharacterRow`.

The unit of the product (design language §8). Highest frequency surface, so
the quietest.

- Row leading slot: `EntitySigil` at 28px. Hue from the id, letter from the
  name, `aria-hidden`.
- Entity names in serif, everything about them in sans (D23).
- No status dot: the word carries the state, in the status hue (Q9).
- The row's existing field set is the requirement, not a starting point:
  name, subtitle, status with its dot, disposition, role, and on expansion
  description, dated notes, race, recorded-by, edit and delete. Nothing leaves
  the row in this rollout.
- A row states its type **once**. Today `NPCDirectory` renders a
  `bg-secondary` type chip *and* colour; with a sigil present that is three
  encodings of one fact. Keep the label, drop the rest.
- Rows separated by inset rules inside one card — not boxed individually
  (§5). Inset rules read as one object with parts.
- `.selectable-item` for feedback only; the card owns resting paint (D9).
- Accent appears on one thing inside the collection: the active filter. The
  page's primary action is accented too, and is counted separately — it belongs
  to the route, not to the list.
- Designed empty state, designed loading state. Not blank.

## A2 — Entity you open

**Owns:** a new route per entity, reached from "More info" on a directory row
(D17), plus `NPCCard`, `LocationCard`, `RumorCard`, `NoteCard`, `EntityCard`
where they name colours directly.

Additive, and **complete**: everything the row shows, plus the full note
history and every relationship (D20). The row's inline expansion keeps every
field and action it has today.

Semi-working, not read-only: the description edits in place and a note is
added without leaving the page. That is what earns the click.

- One image slot, fixed aspect, cropped to fill, centred. No focal point, no
  crop UI (D21). Designed empty state; the page looks finished without it.
- Sigil at 44px beside a serif name.
- `surface.card` for the body, `surface.sunken` for the aside — relations,
  tags, attribution.
- Scope: NPCs and Locations. Quests, Rumors and Notes stay row-only until this
  proves itself.

Met rarely, so it can afford ornament A1 cannot.

- Sigil at 40–48px beside the name, same derivation.
- One image slot with a designed empty state; text over it always on a scrim
  (§6). Never load-bearing for legibility.
- Serif for the entity's name and any in-world description; sans for
  metadata, relations, tags (§4).
- Attribution is visual, not a footnote (§11).
- `surface.card` for the body, `surface.sunken` for secondary blocks —
  relations, tags, linked notes.

## A3 — Form you fill

**Owns:** `NPCForm`, `NPCEditForm`, `LocationFormSections`,
`LocationCreateForm`, `LocationEditForm`, `QuestFormSections`,
`QuestCreateForm`, `QuestEditForm`, `RumorForm`, `ChapterForm`,
`SagaEditPage`, `NoteEditor`, `RegistrationForm`, `SignInForm`,
`UsernameEditor`, plus `core/components/Input.tsx` and `Dialog.tsx`.

The `field.*` tokens are already complete and 3a-tuned; almost all of this is
consumption, not design.

- One column, generous rhythm, sections separated by rules and a sans section
  head.
- Labels above fields, helper text below, error text replacing helper — never
  both.
- Multi-select chip lists (the `selectable-item` ternaries in
  `LocationFormSections` and `NPCEditForm`) become one shared chip: selected
  is accent-bordered, not accent-filled.
- Primary action once, bottom right, `action.primary`. Delete is
  `danger.delete*` and never sits beside save.

## A4 — Text you read

**Owns:** `StoryPage`, `ChaptersPage`, `SagaPage`, `ChapterReader`,
`ChapterRail`, `BookViewer`, `BookshelfView`, `LatestChapter`, `NotePage`.

The one archetype where the design is genuinely open, and the one that gets a
full mock.

- Measure capped around 68–72 characters regardless of viewport.
- Serif body at a real reading size, normal line height. This is the only
  place in the app where serif carries running text.
- Chapter navigation is chrome: sans, quiet, out of the way of the text.
- Renders full CommonMark with raw HTML disabled at the parser (D22), on
  chapter bodies, saga/story descriptions and notes. Authoring is a plain
  textarea with a bold / italic / blockquote toolbar.
- Everything not in that list stays plain text, so a row never needs a parser.
- No journal spread: the mode is retired (R1), and a session-record surface is
  not part of this rollout.

## A5 — Utility page

**Owns:** `PrivacyPolicyPage`, `PrivacyDataTable`, `PrivacySectionNav`,
`PrivacyLastUpdated`, `ContactPage`, `ProfilePage` and its cards,
`AdminPanel` and its views, `PrivacyNotice`, `SessionTimeoutWarning`.

Visited twice a year. Success is that it inherits correctly and reads well; it
does not need to be interesting.

- Sans throughout. Nothing here is content of the world (§4).
- `surface.card` sections on the page ground, one rule between, no ornament.
- Tables get rules, not zebra fills.
- Admin views may be dense; they are the one place density beats rhythm.
