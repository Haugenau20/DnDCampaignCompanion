# App-wide rollout: Phases 6–12

The continuation of `00-transition-plan.md`, which covered Home and the global
chrome. That plan is finished; this one carries the same model to the rest of
the app.

- **Design language (outranks this document):** `../design/design-language.md`
- **Token rules:** `01-token-model.md`
- **The archetypes this plan rolls out:** `05-archetypes.md`
- **Per-PR handoffs for Claude Code:** `handoff/`
- **Every decision + every reversal:** `03-drift-log.md`

---

## 1. The shape of the remaining work

**Not page by page.** The pages are thin — `LocationsPage.tsx` is 1.4 KB,
`QuestsPage.tsx` 1.5 KB; they wire a hook to a directory component and stop.
The look lives in `components.css` (~1200 lines) and in five recurring
surfaces: a collection you scan, an entity you open, a form you fill, a text
you read, a utility page you visit twice a year.

Eight routes share one directory pattern. Mocking each route would draw that
pattern eight times and then disagree with itself. So the unit of this plan is
the **archetype** (`05-archetypes.md`), and a route's migration is usually
"adopt archetype A1, delete four class names".

Where a route genuinely has a composition problem no archetype answers — the
Story/Saga reading stack, chiefly — it gets its own mock. A handful of mocks,
not twenty-three.

## 2. What is already true on `main`

Worth stating, because two of these are loose ends the rollout picks up:

- Finish **3a** is live in `lightTheme.ts`: near-black chrome and band, warm
  ivory page, one deep red accent (`#8C1D1D`), eight entity hues at one
  lightness.
- `EntitySigil` exists, is tested, and is rendered by `ActivityFeed` only (R8).
  No *directory* renders one, so the single highest-leverage change in the app
  is still one import — in `Roster.tsx`, which every collection goes through.
  Its paint (`.entity-sigil`, eight `[data-sigil-index]` rules) and its
  `--entity-palette-*` variables already ship; adoption is all that is left.
- `JournalLayout` was a live alternate Home view on eleven `--journal-*`
  ornament tokens. It is **retired** rather than migrated (D39) — done, as the
  first PR of Phase 6, so nothing later inherits it.
- Dark and medieval render through fallbacks: intact, dated.

## 3. Phases

One branch per phase off `main`; one PR per row in `handoff/`. Every PR is
independently mergeable and independently revertable, and every PR is sized to
one evening. (This said "off the integration branch" until R20 measured that
no phase since 3 has done that.)

| # | Phase | Archetype | Branch |
|---|---|---|---|
| 6 | Collections | A1 | `visual/phase-6-collections` |
| 7 | Entity detail | A2 | `visual/phase-7-entity` |
| 8 | Forms & fields | A3 | `visual/phase-8-forms` |
| 9 | Reading surfaces | A4 | `visual/phase-9-reading` |
| 10 | Utility, profile, auth | A5 | `visual/phase-10-utility` |
| 11 | Retire medieval, dark to parity | — | `visual/phase-11-themes` |
| 12 | Cleanup & package extraction | — | `visual/phase-12-cleanup` |

### Phase 6 — Collections (first, by your call)

The directory lists: NPCs, Locations, Quests, Rumors, Notes, plus `Roster`
itself. Sigils get adopted here, rows state their type once, and rules replace
boxes. Three PRs — `handoff/06-1` … `handoff/06-3` — after the deletion.

Why first, beyond preference: it is where the sigil work already paid for
becomes visible, and it is the only archetype every other phase links into.

PR `handoff/06-0` runs ahead of all three: it deletes the journal mode (D39)
and settles the drift log's bookkeeping for Phases 6–12. Deleting before
migrating means Phases 8, 9 and 11 never touch those files.

Sigil adoption and row anatomy are **one PR** (R7), not two: most of the sigil
work shipped in Phase 3, and landing what is left on its own would put every row
in exactly the three-encodings state the next PR exists to remove.

### Phase 7 — Entity detail

A **new route per entity**, reached from a "More info" action on the directory
row (D41). The row's inline expansion is unchanged — this phase is additive,
and the page's job is what the row deliberately does not carry: full notes,
timeline of edits, every relationship, the image slot with its designed empty
state (D6: no bitmaps).

Scope is **NPCs only** (D61, narrowing D41). Locations were dropped once 7.0
measured that the Location row already renders every field the type has, so a
Location page would restate it at a different URL — while the NPC row shows four
of ten fields and hides six the forms already collect. The page is complete and
semi-working (D43): description edits in place, notes added without navigating
away.

Four PRs. `handoff/07-0` runs first and **deletes** `NPCCard`, `LocationCard`
and `RumorCard`: this paragraph used to say Phase 7 would *migrate* them, which
was measured before Phase 6 and is wrong (R13). All three were stranded when the
directories moved to `Roster` rows — 1,341 lines exported from the barrel and
rendered by nothing. `NoteCard` is live and stays. No `[data-theme=…]` patch
survives in any of them either; the 21 left in the tree are medieval ornament,
scrollbars, a dialog shadow, a card hover and reader typography.

Then `handoff/07-1` and `07-2`: the NPC route and its read view, then the
in-place editing. `07-2-5` rebuilt the page against a design mock after the
first layout read as a form rather than a record (D65), and absorbed `07-3`'s
image slot along with it (R18) -- so Phase 7 ends there. The **upload path is a fifth PR
and is optional** — the slot must look intentional empty, cropped to fill with
no focal point (D44).

### Phase 8 — Forms & fields

`NPCForm`, `NPCEditForm`, `LocationFormSections`, `LocationCreateForm`,
`LocationEditForm`, `QuestFormSections`, `QuestCreateForm`, `QuestEditForm`,
`RumorForm`, `ChapterForm`, `SagaEditPage`, plus `Input`, `Dialog` and a
`Select` that does not exist yet.

Four PRs, `handoff/08-0` … `08-3`. This paragraph used to say the phase was
mostly consumption of the `field.*` tokens, and that it would settle whether a
form sits on `card` or on `page`. Measured before writing the handoffs, both
were wrong (R19): the colour work is already done — zero hardcoded hex and zero
`[data-theme=…]` patches survive in any of the eleven files — and all eleven
already sit on `Card`, so the question is closed by practice and `08-3` only
ratifies it.

What the measurement found instead is structural: **no `Select` primitive
exists** while the forms render 11 raw `<select>` elements, and **17
hand-written labels are not associated with their controls**, leaving them
unnamed to a screen reader. Phase 8 is an accessibility phase wearing a
repainting phase's description.

### Phase 9 — Reading surfaces

`StoryPage`, `ChaptersPage`, `SagaPage`, `ChapterReader`, `ChapterRail`,
`BookViewer`, `BookshelfView`, `NotePage`.

The design is 4b in the design doc: a chapter rail on `sunken`, a capped
measure, serif running text, navigation kept as quiet chrome. **Most of that is
already built** -- commit `413259e` rebuilt the reader around scrolling and a
persistent rail before Phase 9 started, and the A4 files carry zero hardcoded
hex and zero `[data-theme=…]` patches (R29). What is left is markdown, an
authoring toolbar, and four loose ends; see `handoff/09-0` … `09-3`.

Carries a dependency the visual work cannot fake: **full CommonMark with raw
HTML disabled at the parser** (D45), on chapter bodies, saga/story
descriptions and notes, with a bold / italic / blockquote toolbar over a plain
textarea. Without it the pull quote and the emphasis in 4b cannot exist in the
data. Renderer choice and write-time vs read-time is Q10, and it is the first
PR of the phase — the reading design depends on it.

No journal work — it is deleted in Phase 6 (D39).

### Phase 10 — Utility, profile, auth

`PrivacyPolicyPage`, `ContactPage`, `ProfilePage` and its nine cards,
`SignInForm`, `RegistrationForm`, `AdminPanel` and its four views. Low
frequency, so the cheapest phase: they need to inherit correctly and be
readable, not to be interesting.

### Phase 11 — Retire medieval, dark to parity

Medieval goes (D40). This is a deletion PR plus a migration PR — a stored
preference of `medieval` must resolve to something, and roughly a third of
`theme-effects.css` is its ornament.

The second sentence used to read "Dark then gets real values for every surface
pair instead of fallbacks", and it is **wrong about the premise**, measured
before the handoffs were written. Dark defines all 117 token properties, the
same count as light, and exactly one `var(--x, var(--y))` fallback chain
survives in all of `src`. Dark is not unmigrated; it is migrated and
**untuned** — five surfaces sharing one ink, one muted grey, one border and one
pair of state overlays, chrome and page at ~1.2:1 where light is ~14:1, and
three accent hues where §3 allows one. That is a different and larger job than
filling in blanks, and it is `handoff/11-2` and `11-3`.

Four PRs, `handoff/11-0` … `11-3`. `11-1` answers Q16 with `color-scheme`,
which is set nowhere today.

### Phase 12 — Cleanup and extraction

Remove the fallbacks (Q5: only once every remaining theme defines the token),
retire the eight `.location-type-*` **classes** — the tokens behind them went in
Phase 3, and the classes now read the entity palette — then hand the token model
to `theme-contract` as the versioned package. Extraction is mechanical by this point, which was the
whole argument of D2.

## 4. Gates

Per PR, in addition to whatever the phase's handoff adds:

1. `token-values.baseline.json` updated deliberately, never regenerated blind.
   A diff in it is a design decision with a drift-log line or it is a bug.
2. `token-contrast.test.ts` green — AA text, 3:1 non-text, per pair.
3. `css-layers.test.ts` green, and no new resting background in a state class
   (D9).
4. No new `[data-theme=…]` rule. One appearing means the surface model is
   missing something; fix that instead (design language §12.8).
5. One screenshot per affected route, light and dark, before and after.
6. The route still works with an **empty** campaign.

## 5. Ordering rules that survive re-argument

- **Archetype before route.** Never fix a look on one route that another route
  shares; fix it in the shared component and let the routes inherit.
- **Adoption before invention.** If a token exists, consume it. New tokens
  need a drift-log entry.
- **One accent, still.** Every phase will feel like the moment a second accent
  becomes reasonable. It is not (design language §2).
- **Frequency decides richness.** A directory row gets less ornament than an
  entity page, which gets less than the band.

## 6. Done

- All five archetypes migrated; every route inheriting rather than declaring.
- Light and dark at parity; medieval gone; no fallbacks left.
- No `--journal-*` token at all, and no journal mode. ✅ (D39)
- `--location-type-*` retired. ✅ at the token level in Phase 3; the eight CSS
  classes that inherited the name go in Phase 12.
- Contrast clean at AA across both themes.
- `theme-contract` consuming the extracted package.
- `03-drift-log.md` records what actually happened, reversals included.
