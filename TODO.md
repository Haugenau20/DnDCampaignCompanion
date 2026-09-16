# TODO

Everything still outstanding from the visual redesign, lifted out of
`docs/design/plan/03-drift-log.md` before that plan closes with Phase 13.

The drift log is a *record*, not a tracker — it is append-only, it runs to 198
entries, and once the redesign is finished nobody will read it again. Anything
left open in there would be lost. This file is where those items live now.

**Every item below was re-checked against the tree on 2026-09-16**, not copied
on the log's word. That mattered: seven findings the log still describes as open
had in fact been fixed, and are not listed here. Each entry says what was
verified and where, so the next person can start from a measurement rather than
a claim.

Drift-log references (`R16`, `Q15`, …) point back to the original reasoning,
which is usually worth reading before acting — most of these were deferred for a
stated reason, not forgotten.

---

## 1. Bugs — verified present in the tree

### 1.1 Note dates render as raw ISO strings in two directories
`R16`, `R17`

An expanded row shows `2025-05-31T19:27:30.387Z` where it should read
`31/05/2025`.

- `src/features/campaign-entities/locations/components/LocationDirectory.tsx:392`
- `src/features/campaign-entities/npcs/components/NPCDirectory.tsx:294`

Both print `{note.date}` directly. The NPC **detail page** already formats the
same value and returns anything unparseable untouched — `formatNoteDate` at
`src/pages/npcs/NPCDetailPage.tsx:70`, currently a file-local helper. So there is
a working implementation to lift somewhere shared, and the page and the row
currently disagree about one value.

The underlying cause is worth fixing at the same time: `NPCNote.date` has no
agreed shape. The create form writes `YYYY-MM-DD`, the sample-data generator
writes a full ISO timestamp, and each consumer prints whatever it was handed.
Formatting at the two call sites is the small fix; agreeing the stored shape is
the real one.

### 1.2 `AccountCard` clips its own content at 320px
`R41`

`src/features/user-management/profiles/components/AccountCard.tsx:43` — rows are
`grid grid-cols-[170px_1fr_auto]` with no responsive variant. At a 320px
viewport the card is 247px wide and the grid is 426px, and `Card`'s
`overflow-hidden` clips the difference. The email is cut off, and "used to sign
in" and **"Join another" sit off the card entirely** — the second is an action,
so this is unreachable functionality, not just an ugly row.

Pre-existing; the profile page's container is unchanged around it.

Related but separate, and recorded in `CLAUDE.md` rather than here: the header
itself overflows below ~380px on every route. Don't attribute one to the other.

### 1.3 Auth context logs user profile data to the console on every render
`R39` (left behind with the admin cluster)

23 `console.log` calls remain under `src/features/user-management/`, the bulk in
`auth/context/FirebaseContext.tsx`. They print user IDs, loaded profile objects,
group profiles and campaign counts — on every auth state change, in production.

Noise at best; profile data in the browser console at worst. Was logged as
something to pick up "wherever admin lands", which never happened.

---

## 2. Decisions the project deferred and never made

These are genuine open questions about the app. Each blocks something small.

### 2.1 `NPCLegend`: wire it up or retire it
`Q15`, `R15`

`NPCLegend.tsx` is exported from the `campaign-entities` barrel, has its own
test file, and is **rendered by nothing**. `core/config/buildConfig.ts:5` carries
`showNPCLegend: false` with tests pinning it false — but no code reads the flag,
so the legend cannot be switched on either. The flag records an intention that
was never wired.

Not a straightforward deletion: a legend is the one place the design language
permits a hue to carry meaning alone, because the legend is itself the key. That
makes it the natural home for the `npc-status-*` family rather than dead weight.
Decide, then either wire it or delete the component, its test, its barrel export
and the flag together.

### 2.2 Does an entity keep real edit history?
`Q12`

`ContentAttribution` (`src/core/types/common.ts:7`) stores created-by and
last-modified-by and **nothing in between**. The "timeline of edits" that Phase 7
was scoped around cannot exist without a data change.

Answer before anything in the UI promises a timeline.

### 2.3 Can a note be edited or deleted after it is written?
`Q13`

Campaign notes have `updateNote`. **NPC notes do not** — `NPCDetailPage` appends
and renders, with no edit or delete path. So the answer is currently "yes for
one kind of note, no for the other", by accident rather than decision.

This is a decision about the shared record, not about the page: changing a
note someone else wrote is a question about who owns campaign history.

### 2.4 Does `AdminPanel` get a real route?
`R39`

`AdminPanel` is a dialog, not a page, and has no route. Phase 10 deliberately
deferred this rather than making a feature change inside a composition phase.
Left behind with it: the 3-second loading timeout that `10-1` said to keep and
log.

### 2.5 A legend swatch cannot distinguish "confirmed" from "false"
`Q20`

Confirmed and disproved rumours sit on the same ramp stop — correct, because
both are fully known, and what separates them is the strike cue rather than the
hue. That reads fine in a row. In the **stacked summary bar** above the
directory, two adjacent segments of the same hue merge into one band, and a
reader filtering by "false" sees a legend swatch identical to "confirmed".

The open question is whether a bar segment is a different kind of surface from a
label — one where adjacency itself carries meaning — and therefore owes a rule
the rows do not. Related to 2.1: both ask where a hue may stand alone.

### 2.6 The hero band's empty fallback surface was never recorded
`Q4`

Answered by practice — `.image-slot` sits on `--surface-sunken-bg`, the same in
both themes — but never written down as a decision. Low stakes; listed so the
question isn't re-opened from scratch.

---

## 3. Dormant — only live if `theme-contract` happens

`theme-contract` (a theme system to share across projects) is **deferred
indefinitely**; see `docs/design/plan/04-rollout.md` §3, Phase 13. These four
were all filed "decide before package extraction". None blocks this repository.

Do not answer them speculatively. Designing a package against a consumer that
does not exist is precisely the failure `D2` was written to avoid.

- **`Q1`** — entity palette as index-suffixed variables or one joined value?
  (Settled for the app by `D25`; the package question is what shape a manifest
  can assert over an ordered collection.)
- **`Q2`** — does the package validate enum token *values*, or only that the
  variables exist? The app already does the stronger thing (`D103`, for
  `scheme`), so this is whether the package inherits it.
- **`Q3`** — does the precedence lint (no resting background in a state class)
  live in the app or the package?
- **`Q19`** — can an ordered collection have named siblings? Recast since it was
  filed: its original instance, the knowledge ladder, was deleted in `D121`. But
  the model now spells "ordered collection" **two ways** — `valence` is a
  numeric-keyed record `{0,1,2,3}` and `entityPalette` is a `string[]`. A package
  cannot carry both.

The only existing artifact is branch `codex/theme-contract-poc-20260902`, cut
before Phase 6: two flat tokens, medieval alive, `status-*` classes. All three
are now wrong. It is a record that the idea was tried, not a starting point.

---

## 4. Documentation debt

Both need a hand allowed to edit the schema files, which no implementing change
may touch.

- **`R67`** — `docs/design/colour-schema.md` §8 has **two** entries numbered
  `D36` ("The fixture reproduces the generator's algorithm, to the byte" and "v6
  is additive over v2"). They are unrelated, and `D36` is cited from four places,
  so every citation is ambiguous. Not renumbered, because that means editing a
  read-only handoff.
- **`R68`** — `docs/design/colour-schema.json` still carries
  `inCodeAfter: {"12-1 + 12-2": 109}` and `pendingIn: {"12-2b": 26}`. Every PR in
  Phase 12 is merged, so nothing is pending and the in-code count is 123. Left
  alone because the intended semantics of those fields are the maintainer's, and
  guessing is how a source of truth grows a second, wrong voice.

---

## 5. Checked and found already fixed — not carried forward

Listed so nobody re-opens them from the drift log's wording, which still
describes several as outstanding.

| Item | Was | Now |
|---|---|---|
| `R22` | dark-theme select unreadable | closed by `D103` (`scheme` token) |
| `R32` | chapter rail active row invisible in light (~1.04:1) | rail uses `nav-item-active`; `.sunken-border` added |
| `R40` | `navigation-item` fails contrast outside the chrome | closed by `D107` |
| `R44` | A5's fourth rule worded wrong | amended in `05-archetypes.md` |
| `R45` | every `Card` carries a drop shadow, against §5/§14 | no `shadow` in `Card.tsx` |
| `R52` | light `--field-placeholder` at 3.72:1, under AA | regenerated; now gated as ink at 4.5:1 and green |
| `R57` | dark's accent reduction reverted and deferred | closed by `D110` — roles decided before hues |
| `R69`, `R70`, `R73` | dead classes and orphaned scales | closed by `D121` and `D122` |

---

## Scope note

This file covers the **design drift log only**, which is the document that was
about to go quiet. Two other trackers are live and unaffected:
`docs/testing/bug-tracking/README.md` and `CLAUDE.md`'s known-issues notes.
