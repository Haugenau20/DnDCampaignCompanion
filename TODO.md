# TODO

The project backlog. Everything outstanding lives here, in one shape, verified
against the tree rather than remembered.

## How items get here

`todo.txt` is the **inbox** — type a sentence into it whenever an idea lands, no
structure expected. Running **`/todo`** drains that inbox: each line is checked
against the code, located, sized and filed below, then removed from the inbox.
`/todo <idea>` files a single item without going through the inbox.

An entry records **a measurement, not a claim**. The raw note is a hypothesis;
the entry is what was found when somebody went and looked. This matters more
than it sounds. Three separate harvests measured it: the design drift log
described seven findings as open that were already fixed, the first inbox drain
found four more, and re-checking six of the performance review's fifteen
findings found three more — including its only Critical one. That is fourteen
items that would have been picked up and rediscovered. Anything below that says
`verified <date>` was read in the tree on that date.

**Status** · `open` ready to pick up · `needs investigation` checkable, but
checking it is the first task · `needs scoping` nobody has decided what the
thing is yet · `blocked` · `in progress` · `done` · `dropped`

**Size** · `S` a sitting · `M` a session or two · `L` needs its own plan first.

Drift-log references (`R16`, `Q15`, …) point back to
`docs/design/plan/03-drift-log.md`, where the original reasoning usually explains
why something was deferred rather than forgotten.

**Two other trackers are live and unaffected by this file**:
`docs/testing/bug-tracking/README.md` (bugs found by the behavioural suites) and
`CLAUDE.md`'s known-issues notes. Items that belong there are cross-referenced,
not copied.

---

## Bugs

### T001 — Note dates render as raw ISO strings in two directories
**Type** bug · **Size** S · **Status** open · **Verified** 2026-09-16 · `R16` `R17`

**Display half closed by PR 15.3.** `formatNoteDate` is lifted to
`shared/utils/dateFormatter` and used by `LocationDirectory`, `NPCDirectory`
and `NPCDetailPage`, which previously kept its own copy. No ISO timestamp
renders anywhere; a value that cannot be parsed is shown as written rather
than replaced with a guess.

**PR 15.6 finished the display half properly.** `15.3` lifted the helper but
kept its output at `YYYY-MM-DD` -- the shape the value is *stored* in -- so the
NPC page printed `2025-05-31` for a note three cards above a record line reading
`31/05/2025`: one screen, two formats, for the same kind of fact. `formatNoteDate`
and `formatAttributionDate` now both render through `formatCalendarDate`, so they
cannot drift apart again.

**The stored-shape half stays open**, and is the real job: `NPCNote.date` still
has no agreed shape, and this changed four consumers rather than one writer.

An expanded row shows `2025-05-31T19:27:30.387Z` where it should read
`31/05/2025`.

- **Where**: `src/features/campaign-entities/locations/components/LocationDirectory.tsx:392`
  and `src/features/campaign-entities/npcs/components/NPCDirectory.tsx:294` both
  print `{note.date}` directly.
- **Touches**: those two call sites; `formatNoteDate` at
  `src/pages/npcs/NPCDetailPage.tsx:70` is a working implementation to lift
  somewhere shared — the NPC *detail* page already formats the same value, so
  the page and the row currently disagree about it.
- **Catch**: the real bug is upstream. `NPCNote.date` has no agreed shape — the
  create form writes `YYYY-MM-DD`, the sample-data generator writes a full ISO
  timestamp, and each consumer prints whatever it was handed. Formatting the two
  call sites is the small fix; agreeing the stored shape is the actual one.
- **Source**: drift log

### T002 — `AccountCard` clips its own content at 320px
**Type** bug · **Size** S · **Status** open · **Verified** 2026-09-16 · `R41`

- **Where**: `src/features/user-management/profiles/components/AccountCard.tsx:43`
  — rows are `grid grid-cols-[170px_1fr_auto]` with no responsive variant.
- **Touches**: that grid only. The profile page's container is unchanged around
  it; this is pre-existing.
- **Catch**: at a 320px viewport the card is 247px wide and the grid is 426px,
  and `Card`'s `overflow-hidden` clips the difference. The email is cut off, and
  "used to sign in" and **"Join another" sit off the card entirely** — the second
  is an action, so this is unreachable functionality, not just an ugly row.
  Separately, the header itself overflows below ~380px on every route (recorded
  in `CLAUDE.md`, not here). Don't attribute one to the other.
- **Source**: drift log

### T003 — Auth context logs user profile data to the console on every render
**Type** bug · **Size** S · **Status** open · **Verified** 2026-09-16 · `R39`

- **Where**: 23 `console.log` calls under `src/features/user-management/`, the
  bulk in `auth/context/FirebaseContext.tsx`.
- **Touches**: those call sites.
- **Catch**: they print user IDs, loaded profile objects, group profiles and
  campaign counts — on every auth state change, in production. Noise at best;
  profile data in a browser console at worst. Was logged as something to pick up
  "wherever admin lands", which never happened.
- **Source**: drift log

### T014 — Highlighting works four different ways, and not at all on `/story`
**Type** bug · **Size** M · **Status** open · **Verified** 2026-09-16

**Closed by PR 15.3**, except the `/story` half. All four directories now read
`?highlight=` through one hook (`shared/hooks/useHighlightTarget`): matched by
**id**, target and ancestors revealed, brought into view, and the parameter is
not cleared on unrelated state changes.

- **Behavioural change**: name-matching is dropped. `NPCDirectory` and
  `LocationDirectory` matched the name as well as the id, so a renamed record
  stopped answering its own links. The three emitters that sent a *name*
  (`QuestDirectory`, `NPCDirectory`, `RumorDirectory` location links) now
  resolve it to an id first.
- **Still open**: `/story` reads `?highlight=` not at all, and `15-3` left it
  that way deliberately. That is what keeps this entry open.
- **Shrinking, as pages arrive.** `15-4` and `15-5` gave locations and quests
  their own addresses, so the links that used to carry `?highlight=` to those
  two directories now name the record itself. `?highlight=` is becoming what it
  should always have been — the way to find a row *in a list* — rather than the
  product's substitute for a URL. Two emitters still send it where a page now
  exists: the command palette's `npc` and `location` cases, and the note panels'
  `npc`, `location` and `rumor` cases. `15-6` owns the NPC half; the rest wants
  one sweep once every entity has a page.

Navigating to an entity from search or from a cross-link passes `?highlight=`.
Four directories read it, each differently, and one route ignores it.

- **Where**: the emitter is
  `src/shared/components/command-palette/CommandPalette.tsx:83`, which navigates
  to `/story?highlight=<id>` — **nothing under `src/features/storytelling/` or
  `src/pages/story*` reads `highlight` at all**, so a story or chapter search hit
  navigates and highlights nothing.
- **Touches**: the four consumers, which do not agree on behaviour:
  - `npcs/components/NPCDirectory.tsx:104` and
    `locations/components/LocationDirectory.tsx:128` — match by id **or name**,
    auto-expand ancestors, then scroll to the element.
  - `rumors/components/RumorDirectory.tsx:93` — id only, scrolls, no name match.
  - `quests/components/QuestDirectory.tsx:127` — sets the `highlighted` prop and
    **nothing else**: no scroll, no auto-expand. On a long quest list the
    highlighted row may be off-screen.
- **Catch**: this wants one shared hook rather than four fixes, and the id-or-name
  matching is a real behavioural difference, not an oversight — links are emitted
  with names in some places (`{ highlight: locationName }`) and ids in others.
  Decide which the contract is before unifying. The performance review's
  `PERF-11` adds a hazard to the same code, unverified against current `main`:
  `LocationDirectory`'s parent walk uses repeated `locations.find` with **no
  visited set**, so highlighting a node inside a parent cycle never terminates.
  Any shared hook should carry a visited set and a depth guard. Confirm it first —
  see T033.
- **Source**: todo.txt, 2026-09-16 ("Implement/review proper highlighting logic
  to pages")

---

## Features and enhancements

### T012 — A user cannot change their own password
**Type** feature · **Size** M · **Status** open · **Verified** 2026-09-16

There is no password-change path anywhere, and no password reset either — a
project-wide search for `updatePassword`, `changePassword`, `reauthenticate` and
`sendPasswordResetEmail` returns **zero** hits.

- **Where**: `src/core/services/firebase/auth/AuthService.ts` exposes
  `signIn` (:152), `signOut` (:207), `renewSession` (:66) and the session helpers
  — nothing else. The UI would sit with the other account fields in
  `src/features/user-management/profiles/components/AccountCard.tsx`.
- **Touches**: `AuthService`, the profiles feature, the user-management barrel.
- **Catch**: Firebase requires a recent sign-in for `updatePassword`, so this
  needs a reauthentication prompt on the stale-session path, not just a form.
  Worth deciding at the same time whether a forgotten-password reset ships with
  it — right now a user who forgets their password has no route back in at all.
- **Source**: todo.txt, 2026-09-16

### T013 — Registration tokens never expire
**Type** feature · **Size** S · **Status** open · **Verified** 2026-09-16

A group registration token is valid forever until somebody uses or deletes it.

- **Where**: `src/core/services/firebase/group/InvitationService.ts:55`
  (`generateGroupRegistrationToken`) writes `createdAt` and `used: false` and no
  expiry field. Validation at `:103` checks only `used !== true`; the same check
  is repeated in `signUpWithToken` at `:226`.
- **Touches**: the generator, both validation paths, and
  `features/user-management/admin/components/TokenManagementView.tsx`, which
  lists tokens and would want to show the expiry.
- **Catch**: three error messages already say *"Invalid or expired invitation
  token"* (`:181`, `:217`, `:227`) for a condition that cannot currently happen —
  the wording promises a feature that was never built. Existing tokens carry no
  expiry field, so the check has to treat `undefined` as never-expiring or the
  documents need backfilling.
- **Source**: todo.txt, 2026-09-16

### T015 — Completed and failed quests should collapse by default
**Type** feature · **Size** M · **Status** done · **Verified** 2026-09-16

**Closed by PR 15.3.** `RosterGroup` grew an opt-in `collapsible` /
`defaultCollapsed` pair -- the whole heading is the control, so the target is
not a glyph -- and `QuestDirectory` collapses Completed and Failed by default.
They stay counted and stay reachable. T017 wants the same primitive grown for
batch selection: grow it, do not fork it.

- **Where**: `src/features/campaign-entities/quests/components/QuestDirectory.tsx:290`
  renders every non-empty status group unconditionally.
- **Touches**: `RosterGroup` in `src/core/components/Roster.tsx:354` and the quest
  directory.
- **Catch**: `RosterGroup` has **no collapse affordance** — its props are
  `title`, `count`, `onOpen`, `openLabel`, `muted`, `nested`. So this is a change
  to a shared core primitive used by the NPC and location directories too, not a
  quest-local tweak. Decide whether collapsibility is opt-in per group (a prop)
  or a behaviour every roster gets. See T017: both want `RosterGroup` to grow.
- **Source**: todo.txt, 2026-09-16

### T016 — Tick a quest objective without opening the edit form
**Type** feature · **Size** S · **Status** done · **Verified** 2026-09-16

**Closed by PR 15.3** (`design-handoff/15-3-directory-rows`), and extended by
**15.5**, which gave the same objectives a place to be *authored*: add, reword
and reorder on `/quests/:questId`, through the same §7 contract. 15.5 also took
one behaviour away — ticking the last objective no longer completes the quest by
itself; the page offers completion instead.

`QuestDirectory`'s
objectives are real checkboxes wired to `updateQuestObjective`, which had been
on the context and covered by an eight-case suite with no production caller.
They obey §7's save contract: pending state on the row, never an optimistic
tick, and a visible revert with the reason when the write is refused. The
`aria-hidden` decorative box is gone, so each objective is now reachable and
operable by keyboard and named by its own text.

Marking one objective done means opening the edit form and saving the whole
quest.

- **Where**: `src/features/campaign-entities/quests/components/QuestDirectory.tsx:329-345`
  renders each objective as an `aria-hidden` `div` box plus a `Typography` line.
  Read-only by construction.
- **Touches**: that block, plus its test file.
- **Catch**: almost none — **the mutation already exists and is fully tested**.
  `updateQuestObjective(questId, objectiveId, completed)` lives at
  `quests/context/QuestContext.tsx:132`, is on the context interface (`types.ts:61`),
  and has a dedicated suite (`QuestContext.objectives.test.tsx`, 8 cases). **No
  production component calls it.** The work is swapping the decorative box for a
  real checkbox and wiring it up — including giving it an accessible name, since
  the current box is deliberately hidden from screen readers.
- **Source**: todo.txt, 2026-09-16

### T017 — Batch actions for stories, quests, NPCs and locations
**Type** feature · **Size** L · **Status** open · **Verified** 2026-09-16

Select several rows, then delete or change status in one go.

- **Where**: rumors already have this, working, and it is the pattern to copy:
  `src/features/campaign-entities/rumors/components/RumorBatchActions.tsx`
  (delete, status change, combine, convert-to-quest) driven by selection state in
  `RumorDirectory.tsx:85-86` (`selectionMode`, `selectedRumors: Set<string>`),
  toggled at `:226` and rendered at `:281`.
- **Touches**: the three other entity directories, the storytelling chapter list,
  and whatever shared selection primitive comes out of generalising the rumor one.
  `RumorBatchActions.test.tsx` is the test pattern to copy too.
- **Catch**: the rumor implementation is rumor-shaped — its actions include
  combine and convert-to-quest, which have no analogue elsewhere. Pull out the
  selection mechanics (mode toggle, `Set` of ids, the action bar shell) and leave
  the actions per-entity, rather than generalising the whole component. Related to
  T015: both want `RosterGroup`/`RosterItem` to grow a capability.
- **Do not copy the rumor pattern as it stands.** The performance review found it
  is the **worst write amplification in the app** (`PERF-06`): `RumorBatchActions`
  updates and deletes sequentially, and every selected rumor costs an
  attribution-profile read, a write, **and a full re-query of the rumors
  collection**. Selecting twenty rumors runs that twenty times over. Extending it
  to four more entities multiplies a known defect by four. Fix the amplification
  first — batch the writes, update the cache in place, reserve full reloads for
  recovery — then generalise. That is T032's territory, so the two should be
  sequenced rather than run in parallel.
- **Source**: todo.txt, 2026-09-16

### T018 — Sub-chapters
**Type** feature · **Size** L · **Status** open · **Verified** 2026-09-16

- **Where**: the data model already has them —
  `src/features/storytelling/chapters/types.ts:15` declares
  `subChapters?: Chapter[]`, and the sample-data generator populates them
  (`src/utils/__dev__/generators/contentGenerators/chapterGenerator.ts:57`).
- **Touches**: everything that reads a chapter — `ChapterList`, `ChapterRail`,
  `ChapterReader`, `ChapterForm`, and the ordering logic in `StoryContext`.
- **Catch**: "partly implemented" means **the type and the generator only**. No
  production component renders, edits or orders a sub-chapter — the field is
  written by the generator and read by nothing. And bug **#017** in the tracker
  already says complex chapter reordering may lose `subChapters` and summary data
  (`StoryContext.bugs.test.tsx:440-452`), so the ordering model needs answering
  before the UI does. A recursive `Chapter` inside `Chapter` also has no depth
  limit — decide whether nesting is one level or arbitrary.
- **Source**: todo.txt, 2026-09-16

### T019 — Smart detection reads player characters as NPCs
**Type** feature · **Size** M · **Status** open · **Verified** 2026-09-16

Note extraction turns the party's own characters into NPC suggestions.

- **Where**: the cause is one line of prompt.
  `firebase/functions/src/entityExtraction.ts:418` instructs the model: *"Every
  named person or character is ALWAYS type `npc`."* (with `:417` forbidding any
  other value). It has no notion of who the players are.
- **Touches**: that prompt and its callable payload;
  `src/features/collaboration/entity-extraction/services/EntityExtractionService.ts:88`,
  which is where the client would add a PC roster to the call.
- **Catch**: **the roster already exists** — a group user profile carries
  `characters[]` with an `activeCharacterId`, read by `getActiveCharacterName` /
  `getActiveCharacterId` in `src/core/utils/user-utils.ts:38-56` and used for
  attribution. So this needs no new "define your PCs" configuration; it needs the
  group's existing character names passed into extraction and excluded. Decide
  whether to filter in the prompt (cheaper, fuzzier) or post-filter the result
  (exact, but misses nicknames). **`firebase/functions` has no test suite at all**
  (see `CLAUDE.md`) — verify against the emulator, with a control.
- **Source**: todo.txt, 2026-09-16

### T020 — Attach a screenshot to a contact-form bug report
**Type** feature · **Size** M · **Status** open · **Verified** 2026-09-16

Deliberately left out of the contact page redesign (PR 2, 2026-08-30) rather than
shipped as a disabled control that does nothing. The design mock (screenshot 5a)
has the drop zone.

- **Where**: `src/shared/components/contact/` — a new field component alongside
  the existing `CategoryChips.tsx` and `SenderIdentity.tsx`, plus a download URL
  in the callable payload that `firebase/functions/src/contact.ts` links from the
  email body (`ContactFormData` is declared at `:36`).
- **Touches**: the contact components, the callable's payload shape, the Cloud
  Function, and Firebase Storage setup — see T021, which this depends on.
- **Catch**: it is not a UI change. It needs Storage wiring, rules scoped so one
  user cannot read another's uploads, size and MIME-type limits, cleanup of
  orphaned uploads when a submission is abandoned, and a new failure mode on
  submit (upload succeeded but email failed, or the reverse).
- **Why it is worth doing**: for a bug report a screenshot is the single biggest
  quality win. "Deleting a note takes me back to the list" is three exchanges of
  questions without one.
- **Source**: todo.txt, 2026-09-16

### T021 — Firebase Storage for campaign images
**Type** feature · **Size** L · **Status** open · **Verified** 2026-09-16

Let users upload pictures for their campaigns, and let the maintainer upload
default artwork.

- **Where**: nothing in `src/` imports `firebase/storage` — no `getStorage`, no
  `uploadBytes`, anywhere. `src/core/components/ImageSlot.tsx` is the render-side
  placeholder the design already has.
- **Touches**: a new service under `src/core/services/firebase/` following the
  `BaseFirebaseService` pattern, `ImageSlot`, and the entity forms.
- **Catch**: security rules are **not deployed from this repo**, and must not
  become so. `firebase/firebase.json` deliberately carries no rules keys (see its
  `//` comments) precisely so a `firebase deploy` cannot touch them; production
  rules are authored in the Firebase console, with a reviewed copy kept in-repo
  as `firestore.rules.prod`. `firebase/storage.rules` is the permissive
  **emulator** ruleset and is correct as it stands — do not "reconcile" it with
  production, which is the mistake `firestore.rules.prod`'s header warns about by
  name. So this item includes writing a `storage.rules.prod` review copy, on the
  `firestore.rules.prod` model, and pasting it into the console — and that is a
  deploy step no CI gate will perform or verify for you. Check its
  `isMemberOfGroup` helper against the real Firestore shape while writing it; the
  draft in `storage.rules` assumes `groups/{groupId}/members/{uid}`.
- **Source**: todo.txt, 2026-09-16

### T022 — Sign in with Google (or another provider)
**Type** feature · **Size** L · **Status** needs scoping · **Verified** 2026-09-16

- **Where**: authentication is email/password only —
  `src/core/services/firebase/auth/AuthService.ts:163`
  (`signInWithEmailAndPassword`) and
  `src/core/services/firebase/group/InvitationService.ts:239`
  (`createUserWithEmailAndPassword`). No `GoogleAuthProvider` or
  `signInWithPopup` anywhere in the tree.
- **Touches**: `AuthService`, `InvitationService`, the registration form, and the
  Firebase console's provider config.
- **Catch, and why this needs scoping first**: account creation is currently
  gated *by construction*. `signUpWithToken` (`InvitationService.ts:204`) creates
  the Firebase user and consumes the invitation token inside one
  `runTransaction`, so an unauthorised person cannot get an account at all. An
  OAuth provider inverts that — the Google user exists *before* any token is
  checked, so the gate has to move to a post-sign-in step, and the app grows a
  new state it has never had: an authenticated user with no group. **Decide what
  that state looks like before writing code.** The beta-cost concern in the
  original note is a separate lever (an allow-list, or a cap on new accounts) and
  should be decided alongside it.
- **Source**: todo.txt, 2026-09-16

---

## Decisions needed

### T004 — `NPCLegend`: wire it up or retire it
**Type** decision · **Size** S · **Status** open · **Verified** 2026-09-16 · `Q15` `R15`

`NPCLegend.tsx` is exported from the `campaign-entities` barrel, has its own test
file, and is **rendered by nothing**. `core/config/buildConfig.ts:5` carries
`showNPCLegend: false` with tests pinning it false — but no code reads the flag,
so the legend cannot be switched on either. The flag records an intention that
was never wired.

Not a straightforward deletion: a legend is the one place the design language
permits a hue to carry meaning alone, because the legend is itself the key. That
makes it the natural home for the `npc-status-*` family rather than dead weight.
Decide, then either wire it or delete the component, its test, its barrel export
and the flag together. Related to T008 — both ask where a hue may stand alone.

### T005 — Does an entity keep real edit history?
**Type** decision · **Size** M · **Status** open · **Verified** 2026-09-16 · `Q12`

`ContentAttribution` (`src/core/types/common.ts:7`) stores created-by and
last-modified-by and **nothing in between**. The "timeline of edits" that Phase 7
was scoped around cannot exist without a data change. Answer before anything in
the UI promises a timeline.

**PR 15.4 held the line and recorded where.** `/locations/:locationId` states two
facts in its record card and nothing else. The visual reference (`S5`) prints
"DungeonMaster · 31 May · click to edit" under the description; that line is
deliberately not built, and a test asserts its absence so it cannot arrive by
accident. When this is answered, the per-section blocks on that page are where
it goes.

**PR 15.6 held it a third time**, on the page the other two copy: no per-field
credit under any of the seven editors it added, and no line saying who last
changed a fact. The record card states the same two points it always has.

**PR 15.5 held it again, against a sharper temptation.** `S3` draws
"gandlaf ticked *Find the secret door* · last session" on the quest page —
per-*objective* history, which is further from what the data holds than a
per-field line: nothing records who ticked a box or when. `/quests/:questId`
states the same two facts as the location page, and its suite asserts that
neither "ticked" nor "last session" appears in the record card.

### T006 — Can a note be edited or deleted after it is written?
**Type** decision · **Size** M · **Status** open · **Verified** 2026-09-16 · `Q13`

Campaign notes have `updateNote`. **NPC notes do not** — `NPCDetailPage` appends
and renders, with no edit or delete path. So the answer is currently "yes for one
kind of note, no for the other", by accident rather than decision.

This is a decision about the shared record, not about the page: changing a note
someone else wrote is a question about who owns campaign history.

**PR 15.4 adds a third append-only notes list**, on the location page, matching
the NPC page rather than the campaign notes: added, never edited or removed, and
the composer says so. `LocationNote` gained an optional `author`, as `NPCNote`
already had, so a note written from here carries its own credit; older ones stay
blank rather than being attributed to a guess.

**PR 15.6 left it exactly there, deliberately, while making everything around it
editable.** The NPC page now edits eleven fields in place; its notes are the one
thing on it that still cannot be changed after it is written. That asymmetry is
the open question, not an oversight.

### T007 — Does `AdminPanel` get a real route? — **answered: yes**
**Type** decision · **Size** S · **Status** done · **Verified** 2026-09-16 · `R39`

`AdminPanel` was a dialog with no route. Phase 10 deliberately deferred the
question rather than making a feature change inside a composition phase; left
behind with it was the 3-second loading timeout that `10-1` said to keep and log.

**Decided by `docs/design/plan/00-surface-routing.md`**: a dialog is one decision
taken about the thing behind it, and admin is not that. `/admin/people`,
`/admin/campaigns` and `/admin/group` exist as of Phase 14, and the 3-second
timeout moved onto the route verbatim, comment and all. Kept here, closed, so
the question is not asked a third time — and because T025 was waiting on it.

### T008 — A legend swatch cannot distinguish "confirmed" from "false"
**Type** decision · **Size** S · **Status** open · **Verified** 2026-09-16 · `Q20`

Confirmed and disproved rumours sit on the same ramp stop — correct, because both
are fully known, and what separates them is the strike cue rather than the hue.
That reads fine in a row. In the **stacked summary bar** above the directory, two
adjacent segments of the same hue merge into one band, and a reader filtering by
"false" sees a legend swatch identical to "confirmed".

The open question is whether a bar segment is a different kind of surface from a
label — one where adjacency itself carries meaning — and therefore owes a rule
the rows do not. Related to T004.

**PR 15.7 made the premise true.** Until then this entry described an intent the
code did not implement: the row map and the bar both put disproved on
`valence-3`, the red a failed quest wears, while the comment above the map said
confirmed and disproved shared a rung. `15-7` moved both onto `valence-0` and
kept the strike as the separator, which is what the schema, `R64` and this entry
all already said — and which means the two adjacent same-hue bar segments this
question is about are now genuinely on screen. **Verified in Chrome**: the
disproved chip computes `valence-0 cue-negated`, with no red anywhere on a
rumour.

### T009 — The hero band's empty fallback surface was never recorded
**Type** decision · **Size** S · **Status** open · **Verified** 2026-09-16 · `Q4`

Answered by practice — `.image-slot` sits on `--surface-sunken-bg`, the same in
both themes — but never written down as a decision. Low stakes; listed so the
question isn't re-opened from scratch.

### T040 — No accent pair is authored for the band surface
**Type** decision · **Size** S · **Status** open · **Verified** 2026-09-17

`docs/design/colour-schema.md` §5.2 solves `accent.*` against `page`, `card`
and `sunken`. It does not solve it against the band, and every page Phase 15
adds has a band header carrying a status chip.

- **Where**: light `accent.ink` `#8D4F00` on band `#26211C` measures ~1.9:1 —
  below any usable threshold, and there is no authored pair to reach for.
- **Touches**: four surfaces in Phase 15 (`/locations/:locationId`,
  `/quests/:questId`, and the two directories that share the header), which is
  why it wants answering at the source rather than per page.
- **Interim, now implemented (PR 15.4)**: `.band-chip` / `.band-chip-selected`
  in `components.css` draw a band control from the band's own pair and nothing
  else. The selected state consumes `--surface-band-selected`, which was emitted
  and unconsumed — the token manifest's note read "the band has no selectable
  element yet", and the entity page's knowledge ladder is that element. No value
  was invented, and `StateLadder` takes a `tone="band"` rather than each page
  spelling it out.
- **Still open**: an accent *pair* for the band. A band chip cannot be an accent
  chip, so a band can carry no primary action drawn the way every other primary
  action is drawn.
- **Catch**: the schema is read-only to an implementing PR, so this cannot be
  closed by the phase that found it.
- **Source**: `docs/design/plan/15-entity-authoring/00-entity-authoring.md` §13

### T041 — "The required pair is unchanged" is true of one entity in four
**Type** decision · **Size** S · **Status** open · **Verified** 2026-09-17

`00-entity-authoring.md` §1.2 says creating an entity asks for two fields and
that "the required pair is **unchanged** from today's forms". `15-1` item 1
sharpens that into an instruction: "do not relax it and do not add to it".
Measured against the four create forms, the premise holds for the quest only.

- **Quest** — `QuestCreateForm.tsx:122` requires `title` and `description`.
  Two. The premise is exactly right here.
- **Location** — `LocationCreateForm.tsx:153` requires `name`, `description`,
  `type` and `status`, but the last two are defaulted (`poi`, `known`) and
  never left blank, so the user supplies two. Effectively unchanged.
- **NPC** — `NPCForm.tsx:190` requires `name`, `status` and `relationship`;
  the last two are defaulted, so the user supplies **one**. `description` is
  labelled "Description" with no asterisk and is not validated — yet
  `NPC.description` is **non-optional** in `types.ts`. Form and type disagree.
- **Rumour** — `RumorForm.tsx:194` requires `title`, `content` **and**
  `sourceName`. Three.
- **What 15-1 did**: built §4's table as written — two fields for the NPC, the
  quest and the location — which *adds* a required field for the NPC against
  item 1's letter, and matches `NPC.description`'s own type. The rumour was
  left on its existing form under item 9's second branch, because a two-field
  surface cannot supply `sourceName` without relaxing validation.
- **What needs deciding**: whether the NPC's description is genuinely required
  (the type says yes, the form says no), and what the rumour's composer row in
  `15-7` does about `sourceName` — require it as a third field, default it, or
  make it optional. `15-7` cannot be written until that is answered.
- **Source**: `docs/design/plan/15-entity-authoring/handoff/15-1-quick-add.md`
  item 1 against `00-entity-authoring.md` §1.2 and §4


---

## Tech debt and platform

### T023 — Every entity collection has several independent loaders
**Type** debt · **Size** M · **Status** open · **Verified** 2026-09-16 · `PERF-08`

- **Where**: `src/shared/hooks/useFirebaseData.ts:42-44` fetches the whole
  collection in a `useEffect` on mount, and again on every auth state change
  (`:48-64`). Each entity context mounts **two** instances against the same
  collection — one via its read hook, one for writes:
  - `npcs/context/NPCContext.tsx:16` + `:25`
  - `quests/context/QuestContext.tsx:38` + `:43`
  - `locations/context/LocationContext.tsx:16` + `:26`
  - `rumors/context/RumorContext.tsx:14` + `:19`
  - `storytelling/chapters/context/StoryContext.tsx` does the same split.
  The performance review found more owners beyond the contexts:
  `shared/context/SearchContext.tsx` builds fresh chapter, NPC, location and
  rumor hooks rather than consuming the providers; `pages/npcs/NPCsPage.tsx` and
  `NPCsEditPage.tsx` load NPCs independently of `NPCProvider`; and
  `LocationDirectory.tsx:112` mounted another `locations` loader under a comment
  claiming "real-time updates" — `getDocs` is not a subscription.
  **That last one is gone as of PR 15.4**, which was the owner this entry
  singled out as producing two real Firestore targets rather than one coalesced
  one. The directory consumes the `locations` prop `LocationsPage` already reads
  from the provider. Everything else on this list is untouched, and the two
  instances per context remain.
- **Touches**: `useFirebaseData` (give the write instance a way to skip the
  fetch), or the contexts (have the write path reuse the read instance's data),
  plus the page- and search-level loaders above.
- **Catch**: the second instance exists for a reason — its `error` is bound as
  `writeError` because read and write failures were being conflated (bug #1401).
  Keep that separation; only the duplicate *fetch* should go. **The Firestore SDK
  coalesces most simultaneous identical startup queries**, so the review's
  runtime trace saw one server target per collection — the waste is in duplicated
  transforms, promises, loading state and React updates, not usually in reads.
  The `LocationDirectory` loader fires late enough to miss coalescing and did
  produce two real location targets in both runs. **The NPC-specific half of the
  original report is unmeasured**: this pattern is identical across all four
  entities, so if the NPCs page really is slower than the others, that is a
  second cause still to be found. T032's `PERF-03` is the likelier explanation —
  entity pages couple their loading UI to the global restoration chain.
- **Source**: todo.txt, 2026-09-16 ("NPCs Page seems to take longer to load");
  merged with `PERF-08` from the performance review, which is the same finding
  measured.

### T044 — Every page still folds its refetch into the gate's `resolving`
**Type** bug · **Size** S · **Status** open · **Verified** 2026-09-21

`usePageGate(page, { loading })` treats the caller's `loading` as "resolving",
and every write in this app ends with a refresh that sets that flag again. So a
save swaps the whole page for the gated skeleton, unmounts what was on it, and
takes any component state with it.

**Found in Chrome in 15.7, not in jsdom**: ticking a rumour's status closed the
row being edited, one skeleton flash per write. It is invisible to the suites
because they mock the data hooks, so `loading` never flips a second time.

- **Fixed at four call sites** by 15.7 — the ones holding state across a write:
  `RumorsPage` (`isLoading && rumors.length === 0`), and the quest, location and
  NPC detail pages (`isLoading && !record`). All four are pinned by a test.
- **Still true at the other eighteen** `usePageGate` call sites, including
  `QuestsPage`, `NPCsPage`, `LocationsPage`, `NotesPage` and the story pages.
  They lose no typed text today, so it shows as a flash rather than a defect.
- **The real fix** is probably in the hook: `loading` should mean "nothing to
  show yet", and the hook could take that directly rather than asking every
  caller to remember the conjunction. That is a shared-infrastructure change
  and wants its own pass.
- **Source**: PR 15.7's browser pass

### T042 — A theme class passed as *data* has no manifest coverage
**Type** debt · **Size** S · **Status** open · **Verified** 2026-09-18

`StateLadder` took a `selectedClassName` prop naming the theme class its
selected chip should wear. Every option that used it named a class **no
stylesheet defines**: `knowledge-0/1/2` on the location and rumour ladders,
`outcome-completed` / `outcome-failed` on the quest one. Five dead names,
shipped in `15-3`, and every gate green.

- **Why nothing caught it**: `css-class-manifest.test.ts` walks
  defined-but-unapplied, and says in its own header that it deliberately does
  not walk the reverse — over the whole tree that direction would report every
  Tailwind utility in the product. A class name reaching a component as a
  *string prop* is therefore invisible to both directions.
- **Why it looked right**: `chip-toggle-selected` was doing all the work, so the
  ladders rendered correctly and the extra class was inert. It could not have
  worked in any case: `.chip-toggle-selected` sets `color` and is declared later
  in `components.css` than `.valence-*`, so at equal specificity it wins.
- **Fixed for now by deletion**: `15-4` removed the prop rather than correcting
  the spelling — the visual reference draws every selected ladder chip as the
  same chip, because a ladder is a control and the selected chip says "this is
  the current one", not what the state means. The gap stays open because the
  *pattern* will recur: `RosterStatus`'s `tone`, `Button`'s `variant` and
  `EntitySigil`'s palette are all class families selected by data.
- **Touches**: `core/themes/__tests__/css-class-manifest.test.ts` — a narrow
  consumed-but-undefined check over a closed vocabulary (props whose values are
  known to be theme classes) is the shape that works; a general scan is not.
- **One instance is now gated, and finding it proved the point.** `15-6` wrote
  `ladder-classes.test.ts` — the file `location-presentation.ts` had *claimed
  since 15-4 merged* already existed. It did not. The gate's first run found
  `NPCDirectory` still passing `selectedClassName`: an options array declared as
  a `const` is a wider type than the prop it is passed to, so TypeScript's
  excess-property check never runs on it, and the dead key survived every build.
- **Still open** for the general case: `RosterStatus`'s `tone`, `Button`'s
  `variant` and `EntitySigil`'s palette are the same pattern with no gate.
- **Source**: found in `15-4` while wiring the location page's band control; a
  live instance found in `15-6`.

### T043 — `importantNPCs` may hold names no NPC record carries
**Type** decision · **Size** S · **Status** open · **Verified** 2026-09-18

`15.5` deleted `Quest.importantNPCs` (`D15.7`): two fields for one relationship,
both rendered, which is why the same person appeared twice on a quest card.
`relatedNPCIds` survives, and it is the only one of the two that can be resolved
to a record, a page and an occupation.

**Nothing stored was destroyed.** Every write goes through `updateDoc`, which
merges field by field, so a document that carries `importantNPCs` still carries
it — the app has simply stopped reading and writing it.

**What could not be answered from here**: whether the maintainer's real campaign
holds names in that field which `relatedNPCIds` does not already say. Production
Firestore is not reachable from a development session. In the sample data it is
measurable, and the answer is: 48 names across 20 quests, 45 of them already
said by `relatedNPCIds`; the remaining 3 ("Master of Lake-town", "Mandos", "Tom
Bombadil") name people who **have no NPC record at all**, so there is no id to
migrate them into — they are prep notes about somebody who was never entered.

- **How to answer it**:
  `npx ts-node ./src/utils/__dev__/auditQuestImportantNPCs.ts` — read-only,
  signs in as a real user, prints per quest which names are covered, which match
  an NPC record (migratable by attaching that person), and which match nobody.
- **The decision**: for a name matching no record, attaching is impossible
  without first creating the NPC. Whether those lines are worth keeping at all
  is a judgement about a campaign, not a data repair, which is why the script
  has no `migrate` mode.
- **Source**: PR 15.5, from its handoff's instruction to check before deleting

### T024 — Remove the `?route=` 404 redirect hack, and the duplicate `NavigationProvider`
**Type** debt · **Size** S · **Status** open · **Verified** 2026-09-16 · `PERF-15`

The app carries a static-host workaround it no longer needs, and the provider
that exists to serve it is mounted twice.

- **Where**: `public/404.html:16` rewrites a deep link into
  `/?route=<path>`, and `src/index.tsx:83-98` (`RouterWrapper`) unpicks it again
  on mount — reading the param, rewriting the URL with `history.replaceState`,
  then navigating. `RouterWrapper` needs `useNavigation`, which is why
  `NavigationProvider` is mounted at `src/index.tsx:109` **as well as**
  `src/app/App.tsx:43`; the inner one shadows the outer for nearly every
  consumer, and both track navigation state and update on every route change.
- **Touches**: `public/404.html`, `RouterWrapper` and the outer provider in
  `src/index.tsx`.
- **Bonus**: deleting the hack removes the only reason the outer provider exists,
  so `PERF-15`'s duplicate-provider finding falls out of the same change. The
  rest of `PERF-15` — un-memoized context values across seven providers — belongs
  to T032, not here.
- **Catch**: this is already dead weight. `firebase/firebase.json:22-27` rewrites
  `**` → `/index.html`, so Firebase Hosting serves deep links directly and
  `404.html` is never reached in production. Confirm that against a real deploy
  before deleting — the file may still be load-bearing on some other host or on
  the emulator.
- **Source**: todo.txt, 2026-09-16 ("Make project true Single Page Application").
  Note the literal request is already satisfied: the app is a `react-router`
  SPA (`src/app/App.tsx:3`), and the only remaining `window.location` writes are
  an `ErrorBoundary` reload and this hack. If something else prompted that note,
  it needs re-reporting with a symptom.

### T025 — Admin panel needs a do-over, and its bug list needs re-checking
**Type** debt · **Size** L · **Status** needs investigation · **Verified** 2026-09-16

Filed as six claims. Three are stale, two hold, one is untested — check each
before planning the rebuild.

| Claim | Finding, 2026-09-16 |
|---|---|
| Groups cannot be created — Firestore transactions require all reads before all writes | **Probably fixed.** `GroupService.createGroup` (`src/core/services/firebase/group/GroupService.ts:51`) no longer runs a client transaction; it delegates to a `createGroup` Cloud Function. Needs a live run to confirm. |
| Campaigns cannot be deleted | **Fixed.** `CampaignManagementView.tsx:32,154` has `deleteCampaign` wired to a confirm dialog. |
| Neither campaigns nor groups can be edited | **Half fixed.** `CampaignManagementView.tsx:33,64-74` has an edit dialog. Groups still have none. |
| Groups view shows only the current group | **Holds.** `GroupManagementView.tsx:33` does `groups.find(g => g.id === activeGroupId)` and renders that one, though `useGroups()` supplies the full list. |
| Groups cannot be edited or deleted | **Holds.** `GroupService` has exactly five public methods — `createGroup`, `getGroups`, `getGroupUsers`, `removeUserFromGroup`, `joinGroup`. No update, no delete. |
| Creation of groups and campaigns works? | **Untested.** Needs the emulator and a real run; nothing in the tree settles it. |

- **Touches**: `src/features/user-management/admin/components/` (`AdminPanel`,
  `GroupManagementView`, `CampaignManagementView`, `UserManagementView`,
  `TokenManagementView`) and `GroupService`.
- **Catch**: **T007 is now answered** — the panel became a route, and Phase 14
  rebuilt it as `/admin/{people,campaigns,group}`. Re-measure this item's six
  claims against that work before planning anything: the components named above
  under *Touches* (`AdminPanel`, `UserManagementView`, `TokenManagementView`) do
  not survive the phase, and the "groups cannot be edited or deleted" claims are
  now tracked in their own right as T036 and T037. T003's console logging lives
  in the same feature and was originally deferred to "wherever admin lands";
  pick it up in the same pass.
- **Source**: todo.txt, 2026-09-16

### T026 — Mobile layout on the story pages
**Type** debt · **Size** M · **Status** needs investigation · **Verified** 2026-09-16

Reported as "mobile layout issues on certain pages, story all around". Not
reproducible from the tree alone — it needs rendering.

- **How to check**: per `CLAUDE.md`, a maximized Chrome window silently ignores
  resize below its minimum width. Render the app in a **320px-wide iframe**
  instead, so media queries evaluate against the iframe's own viewport.
- **Known before you start**: the header overflows horizontally below ~380px on
  **every** route — logo and account block both sit at `min-width: auto` and
  neither yields. If something overflows at 320px, check whether the offending
  element is inside `header`/`footer` before blaming the story pages. See also
  T002 (`AccountCard`), a confirmed instance of the same class of defect.
- **One candidate found**: `src/pages/story/ChaptersPage.tsx:174` — a filter
  input at `input flex-1 min-w-[200px]` sharing a row with sibling controls. It
  cannot shrink below 200px, so a narrow row either wraps or pushes. Unconfirmed
  visually. The chapter rail is `hidden lg:flex` and the reader is capped at
  `max-w-[68ch]`, so neither of those is likely at fault.
- **Catch**: scope it before fixing. "Story all around" could be one shared
  container or four separate pages, and the answer changes whether this is an S
  or an L.
- **Source**: todo.txt, 2026-09-16

---

### T034 — Promoting or demoting a member: the rules allow it, nothing calls it
**Type** debt · **Size** S · **Status** blocked · **Verified** 2026-09-16

Blocks a role control on `/admin/people`, which is why that view renders the
role as text and offers no way to change it.

**Corrected after reading the rules rather than the bug report.** An earlier
draft of this entry claimed a Cloud Function was required. It is not.
`firebase/firestore.rules.prod:202` already carries, on a member's group
profile:

```
// Group admins and global admin can update user profiles, role included
allow update: if isGroupAdmin(groupId) || isGlobalAdmin();
```

So an admin changing another member's role **is** server-authorised today. What
is missing is entirely client-side: there is no `setMemberRole` on
`GroupService`, no hook exposing one, and no control anywhere in the UI.

Two things to settle before building it:

1. **Is the deployed ruleset the one in this repo?**
   `docs/testing/bug-tracking/1409-member-can-escalate-to-group-admin.md` is
   still marked *partially fixed, ⚠️ awaiting console deploy*, while
   `firestore.rules.prod:191` now reads
   `allow create: if isSignedIn() && request.auth.uid == userId && request.resource.data.role == "member"`
   and its own comment says that closes #1409 **completely**. The repo copy and
   the bug's status disagree. Rules live in the Firebase console, so only the
   maintainer can confirm which is live — and shipping a privilege control while
   that is unknown is the wrong order.
2. **Demotion needs the same guard as leaving** — see T035. An admin demoting
   the last admin is the same limbo by another route.

When both are settled this is a small job: one service method, one hook
function, one control on the member row.

- **Source**: Phase 14.2, while deciding what `/admin/people` may render

### T035 — The last admin can strip a group of its administration
**Type** debt · **Size** S · **Status** blocked · **Verified** 2026-09-16

Nothing stops the only admin leaving a group. Afterwards nobody can invite a
member, manage a campaign, or reach `/admin` at all — the group is not deleted,
it is simply unadministrable, and there is no recovery path inside the product.

The correct behaviour needs promotion to exist first: "choose who takes over,
then leave."

- **Blocked by**: T034.
- **Meanwhile**: `/admin/group` **states the consequence** beside the Leave
  control when you are the only admin, and does not block the action. Blocking
  was rejected twice over — with no promotion there would be no way out at all,
  and the profile page's own Leave control is a second door onto the same call,
  so a guard on one door is not a guard.
- **Source**: todo.txt, 2026-09-16; scoped during Phase 14.3

### T036 — A group cannot be renamed
**Type** debt · **Size** S · **Status** open · **Verified** 2026-09-16

There is no `updateGroup` in `src/core/services/firebase/group/GroupService.ts`
and no `updateGroup` Cloud Function — `firebase/functions/src/index.ts` exports
`createGroup` and nothing else for groups. Confirms T025's "groups still have
none" claim from the other direction.

- **Note**: the view Phase 14.3 replaced shipped an **"Edit Group" button with
  no `onClick` at all** — a dead control. It was removed rather than left in
  place, so restoring the capability means writing the service method first.
- **Source**: Phase 14.3, while building `/admin/group`

### T037 — A group cannot be deleted
**Type** debt · **Size** L · **Status** open · **Verified** 2026-09-16

No service method, no Cloud Function. Not a small one either: deleting a group
means cascading through its campaigns (each with its own subcollections), its
`users`, its `usernames` reservations and its `registrationTokens`, plus every
member's notes for every campaign in it.

- **Precedent worth copying**: `deleteCampaign` — an Admin SDK
  `recursiveDelete` in a callable. Its doc comment at
  `src/core/services/firebase/campaign/CampaignService.ts:225` explains why a
  client cannot do this itself.
- **Meanwhile**: `/admin/group`'s danger zone offers **Leave group** only,
  which is implemented (`removeUserFromGroup`).
- **Source**: Phase 14.3, while building `/admin/group`

### T038 — The two rumour dialogs each hold a nested scroll region
**Type** debt · **Size** S · **Status** open · **Verified** 2026-09-16

`CombineRumorsDialog.tsx:128` and `ConvertToQuestDialog.tsx:184` both render
`max-h-40 overflow-y-auto` inside the panel — a second scroll region, which the
dialog rule in `docs/design/plan/00-surface-routing.md` §1 names as a sign that
a surface wants to be a page.

**Both stay dialogs, and that is the right call for now**: each acts on the
entries selected on the page behind it, which answers question 1 of the rule
decisively. Neither has a URL worth returning to, and neither has tabs or a
table. A list that can outgrow its panel is weaker evidence than those, so
Phase 14.5 logged them as candidates rather than converting them, exactly as its
handoff instructed.

- **What to look at**: the scroll region exists because the selected-rumour list
  is unbounded. Capping the selection, or paginating the list, would remove the
  symptom without moving the surface.
- **15.5 left the dialog alone and changed only what it leads to.** Converting
  rumours into a quest now lands on that quest's page, and the rumour's own
  "View quest" link opens it too. That was the missing half of the conversion:
  the quest was created and then nothing in the product referred to it.
- **Source**: Phase 14.5, from its own instruction to check rather than assume

---

## Performance

A full audit exists and is the source of truth for evidence, measurements and
remediation order: **`docs/performance/performance-review-2026-08-30.md`**, with
runtime traces in `runtime-evidence-2026-08-30.md`. Fifteen findings, `PERF-01`
to `PERF-15`, each with severity, affected line links, a recommended direction
and a suggested budget. The entries below **track** what is still open; they do
not restate it. Read the review before acting on any of them.

**It audits commit `b73232a` (2026-08-30) and `main` has moved since.** The
review says so itself. Six findings were re-checked on 2026-09-16 at `ebc0a28`:

| Finding | Severity | Re-checked 2026-09-16 |
|---|---|---|
| `PERF-01` search never terminates on whitespace | Critical | **Fixed.** All three split sites are now `split(/\s+/).filter(Boolean)`, and `findWordMatches` (`SearchService.ts:291`) guards `if (!word) return []`. `SearchBar.tsx` is gone, replaced by `shared/components/command-palette/`. See T031 for the one piece that did not land. |
| `PERF-07` context switch refreshes then reloads | High | **Fixed.** The only `window.location.reload()` left in `src/` is `ErrorBoundary.tsx:62`. |
| `PERF-10` all routes + full Lodash in one bundle | Medium | **Half fixed.** Zero `lodash` imports remain in `src/`. Route splitting is still open — see T030. |
| `PERF-04` notes loaded twice, unbounded | High | **Still true** — see T029. |
| `PERF-08` duplicate collection owners | Medium | **Still true** — tracked as T023, which is the same finding. |
| `PERF-15` duplicate `NavigationProvider` | Low | **Still true** — folded into T024, same file. |

The **other nine are unverified against current `main`** — `PERF-02`, `03`,
`05`, `06`, `09`, `11`, `12`, `13`, `14`. That is T033. The review's own
prioritized list opens with a finding that is already fixed, so do not work
straight down it.

### T029 — Notes are fetched twice on every authenticated route, unbounded
**Type** debt · **Size** M · **Status** open · **Verified** 2026-09-16 · `PERF-04`

- **Where**: `src/features/collaboration/notes/context/NoteContext.tsx` reads the
  whole `groups/{group}/users/{user}/notes` path with no campaign constraint and
  filters by `campaignId` in memory at `:69-73`. Its callback lists
  `activeCampaignId` at `:99` even though the Firestore path never uses it, so it
  runs once when the group arrives and again when the campaign does.
- **Touches**: `NoteContext`, a Firestore composite index for the constrained
  query, and `app/App.tsx`, which mounts the provider for every route.
- **Catch**: cost grows with a user's notes across **all historical campaigns**,
  not with the active one, and both runtime runs saw two identical notes targets
  on Home, Privacy, NPCs, Locations and Notes alike. Fixing the dependency list
  without also constraining the query only halves it. `:76` also logs note counts
  to the console on every load — same class as T003, worth removing in the pass.
- **Source**: performance review

### T030 — One eager bundle ships every route
**Type** debt · **Size** M · **Status** open · **Verified** 2026-09-16 · `PERF-10`

- **Where**: `src/app/App.tsx` statically imports all 9 page modules; no
  `React.lazy` or `Suspense` anywhere in it. At audit the optimized build emitted
  a single 1,138,710-byte JS file (**308.17 kB gzip**) with no route chunks.
- **Touches**: `App.tsx`, and a bundle-size ceiling in CI.
- **Catch**: the Lodash half of this finding is already closed — no `lodash`
  import remains in `src/` — so re-measure before quoting the 308 kB figure. The
  review also flagged six circular dependency chains (barrel cycles between
  campaign/collaboration features, and layout helpers importing back from
  `HomePage`) that make reliable splitting harder; expect to untangle those
  first. No delay was ever attributed to the cycles themselves.
- **Source**: performance review

### T031 — No regression test pins the search-termination fix
**Type** debt · **Size** S · **Status** open · **Verified** 2026-09-16 · `PERF-01`

The Critical finding is fixed, but the guard that fixed it is unpinned.

- **Where**: `src/core/services/search/__tests__/SearchService.test.ts` has no
  case for a whitespace-only, leading-space, trailing-space or
  repeated-internal-space query. Its one whitespace test (`:331`) is about
  slicing a snippet from *content* with leading whitespace — a different thing.
- **Touches**: that suite.
- **Catch**: two separate things now prevent the hang — `filter(Boolean)` at the
  three split sites and the `if (!word)` guard in `findWordMatches`. Either could
  be removed as "redundant" by someone reading only the other. The review asked
  for exactly this test and it did not ship with the fix. Assert termination, not
  just results: a query of two spaces measured **22,538 ms** of main-thread lag
  before the fix, so a test that merely checks the return value would have hung
  rather than failed.
- **Source**: performance review

### T032 — Performance remediation programme
**Type** debt · **Size** L · **Status** needs scoping · **Verified** 2026-09-16 ·
`PERF-02` `PERF-03` `PERF-05` `PERF-06`

The four architectural findings are one workstream, not four tickets. Together
they are why an entity page took 2.5–7.6 seconds to become ready against a local
emulator.

- `PERF-02` — auth restore is a serial waterfall that reads the same global and
  group profiles twice each, then fetches group documents one at a time.
- `PERF-03` — every domain provider sits above the router, so the Privacy page
  fetches chapters, NPCs, locations, rumors, quests, progress, notes and usage.
- `PERF-05` — chapter order is encoded in the document ID, so inserting at the
  front of the 32-chapter sample costs ~**102** serialized Firestore operations.
- `PERF-06` — attributed writes re-read the group profile, and most contexts then
  reload the entire collection.
- **Catch**: all four are **unrevalidated** — do T033 first. They also want a
  shared answer (one restore orchestrator, one query cache, one owner per
  collection), so picking them off individually will produce four partial
  designs. The review's §"Suggested performance budgets" is the acceptance
  criteria to write tests against; its §"Positive observations" names the
  primitives that already exist, including `DocumentService.batchOperations`.
- **Source**: performance review

### T033 — Revalidate the nine unchecked performance findings
**Type** debt · **Size** M · **Status** needs investigation · **Verified** 2026-09-16

`PERF-02`, `03`, `05`, `06`, `09`, `11`, `12`, `13`, `14` have not been checked
against current `main`. Six others were, and **three had already been fixed** by
work that landed after the audit — including the Critical one.

- **Catch**: line numbers in the review are `b73232a` line numbers and several
  files have since moved or been deleted outright (`SearchBar.tsx`,
  `ContextSwitcher.tsx`). The review links some findings as GitHub permalinks at
  that revision for exactly this reason. Locate by symbol, not by line.
- **`PERF-11` is confirmed and closed.** It held: the walk was a
  `while (current?.parentId)` around repeated `locations.find` with no visited
  set. `15-3` moved it into `shared/hooks/useHighlightTarget` behind a visited
  set and a depth cap; `15-4` put every other walk over the location tree —
  render, breadcrumb, descendant exclusion, delete ordering, filter recursion —
  behind `locations/utils/location-tree.ts`, which carries the same guards, and
  made the cycle tests hang the suite rather than fail if a guard is removed.
  That mattered more than it looked: `15-4` is the PR that makes a cycle
  *reachable*, because until *Move elsewhere* shipped nothing in the product
  could choose a parent. **The other eight findings are still unchecked**, which
  is what keeps this entry open.
- **Source**: performance review

---

## Documentation debt

All three need a hand allowed to edit the schema files and the read-only
history, which no implementing change may touch.

### T010 — `colour-schema.md` has two decisions numbered `D36`
**Type** docs · **Size** S · **Status** open · **Verified** 2026-09-16 · `R67`

`docs/design/colour-schema.md` §8 has **two** entries numbered `D36` ("The
fixture reproduces the generator's algorithm, to the byte" and "v6 is additive
over v2"). They are unrelated, and `D36` is cited from four places, so every
citation is ambiguous. Not renumbered, because that means editing a read-only
handoff.

### T011 — `colour-schema.json` carries stale phase counts
**Type** docs · **Size** S · **Status** open · **Verified** 2026-09-16 · `R68`

`docs/design/colour-schema.json` still carries
`inCodeAfter: {"12-1 + 12-2": 109}` and `pendingIn: {"12-2b": 26}`. Every PR in
Phase 12 is merged, so nothing is pending and the in-code count is 123. Left
alone because the intended semantics of those fields are the maintainer's, and
guessing is how a source of truth grows a second, wrong voice.

### T039 — Documents still tell an agent to write to the retired drift log
**Type** docs · **Size** M · **Status** open · **Verified** 2026-09-17

`docs/design/plan/03-drift-log.md` is closed and carries a note saying so
(PR 15.0). The documents that point at it were not all correctable by that PR,
because almost all of them are read-only to an implementing change.

- **Where**: `docs/design/colour-schema.md` has three live references — §8's
  "Carry these into `../plan/03-drift-log.md` as they are implemented", §9's
  "Write the gap down in `../plan/03-drift-log.md` as a question", and §9's
  read-only table, which still lists `plan/03-drift-log.md` as
  "**Yes — append only.** This is where findings go."
- **And**: 29 files under `docs/design/plan/` carry 54 further references —
  5 phase plans (`00-transition-plan.md`, `00-surface-routing.md`,
  `02-acceptance-criteria.md`, `04-rollout.md`, `06-colour-schema-rollout.md`)
  and 24 merged handoffs from Phases 6–14. Measured 2026-09-17.
- **Catch**: PR 15.0's own gate asks that every remaining hit under
  `docs/design/plan/` be a citation rather than an instruction. That gate
  cannot pass as written — a merged handoff is never edited by anyone, and the
  phase plans are on the read-only list too. The handoff was right about its
  three-file scope and wrong about the reach of its gate.
- **Touches**: the schema files and the read-only history. Needs the
  maintainer's hand, like `T010` and `T011`. The cheapest honest fix may be a
  single line in each tracker's header rather than 54 edits.
- **Source**: `docs/design/plan/15-entity-authoring/00-entity-authoring.md` §13

---

## Dormant — only live if `theme-contract` happens

`theme-contract` (a theme system to share across projects) is **deferred
indefinitely**; see `docs/design/plan/04-rollout.md` §3, Phase 13. These four were
all filed "decide before package extraction". None blocks this repository.

Do not answer them speculatively. Designing a package against a consumer that
does not exist is precisely the failure `D2` was written to avoid.

- **`Q1`** — entity palette as index-suffixed variables or one joined value?
  (Settled for the app by `D25`; the package question is what shape a manifest
  can assert over an ordered collection.)
- **`Q2`** — does the package validate enum token *values*, or only that the
  variables exist? The app already does the stronger thing (`D103`, for `scheme`),
  so this is whether the package inherits it.
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

## Closed

Kept so nobody re-opens them from an older note's wording.

### T027 — Active quests already sort to the top
**Type** feature · **Status** done · **Verified** 2026-09-16

Reported as "make active quests be on the top of the list?". Already true, and
deliberately so: `QuestDirectory.tsx:48-52` declares a fixed `STATUS_GROUPS`
order — Active, Completed, Failed — and the header comment at `:40-47` explains
why quests group by status rather than by location. Empty groups are dropped at
`:242`, so Active is always first when it has anything in it.

### T028 — Form/Context Responsibility Pattern Standardization
**Type** debt · **Status** dropped · **Verified** 2026-09-16

Dropped at the maintainer's direction. The note's only content was a pointer to
`docs/backlog/FormContextStandard`, and `docs/backlog/` no longer exists (see
`CLAUDE.md`), so nothing was left to act on. Re-file it with a symptom if the
underlying problem resurfaces.

### Closed earlier, during the drift-log harvest

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
