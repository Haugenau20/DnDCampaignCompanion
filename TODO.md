# TODO

The project backlog. Everything outstanding lives here, in one shape, verified
against the tree rather than remembered.

## Priority overview

Triaged 2026-09-23 from each entry's summary alone. Nothing was re-checked
against the tree for this, so a priority is a judgement, not a measurement.
**Update this table whenever an entry is filed, closed or re-sized.**

**Priority** · `critical` a security or data-loss hole, do next · `high`
users are locked out of something or losing function · `medium` real user
friction, or a prerequisite for something that is · `low` worth doing, no one
is hurt while it waits · `nit` bookkeeping or polish

**Maintainer's focus** (2026-09-24): everything touching Firebase Storage and images
on the site is `high`, ahead of anything that would otherwise rank there.

| Priority | ID | Item | Size | Status | Why this priority |
|---|---|---|---|---|---|
| medium | T006 | Can a note be edited or deleted? | M | open | NPC/location notes can't fix a typo; inconsistent by accident |
| medium | T033 | Revalidate nine perf findings | M | needs investigation | Gate for T032; the review is known to be partly stale |
| medium | T032 | Performance remediation programme | L | needs scoping | 2.5–7.6 s to ready is the biggest felt slowness; wait for T033 |
| medium | T025 | Admin panel re-check | L | needs investigation | Group creation and campaign deletion were likely broken by a region bug, fixed 2026-09-23; confirm live |
| medium | T056 | Sign-in errors carry a reportable ref | S | blocked | On hold for an app-wide error-numbering system, which the maintainer wants first |
| medium | T026 | Mobile layout on story pages | M | needs investigation | User-reported, unscoped; scope before sizing |
| medium | T061 | PRs are checked by the build alone | M | open | Tests never run in CI, and merging deploys live |
| medium | T070 | Functions are deployed by hand | M | needs investigation | Frontend and functions can drift in prod; contact secrets must move first. Service account roles unchecked |
| medium | T071 | Band eyebrow is 2.3:1 in light | S | open | Fails contrast on every band page in the default theme; needs a schema call, like T040 |
| low | T041 | Required-field pairs disagree across forms | S | open | NPC form and type disagree on `description`; no user harm yet |
| low | T005 | Real edit history? | M | open | Nothing promises a timeline; answer before anything does |
| low | T030 | One eager bundle | M | open | Load-time win, but cycles need untangling first |
| low | T043 | Orphaned `importantNPCs` names | S | open | Nothing was destroyed; a judgement call about one campaign |
| low | T042 | Theme class as data has no gate | S | open | Latent pattern; bitten once, now partly gated |
| low | T037 | A group cannot be deleted | L | open | Leave exists; deletion is rare and large |
| low | T017 | Batch actions for other entities | L | open | Convenience; must follow T032's write-amplification fix |
| low | T018 | Sub-chapters | L | open | New feature; #017 ordering question comes first |
| low | T054 | Sign in with Discord | L | needs scoping | Where tabletop players already are; Firebase has no built-in provider |
| low | T057 | Sign in with a code from the email | M | blocked | On hold: needs a sending domain; the current phone-approval flow works |
| low | T055 | Opt-in second factor | M | needs scoping | Nobody asked yet; prefer an authenticator app over SMS, which bills per text |
| low | T040 | No accent pair for the band | S | open | Interim `.band-chip` works; schema-owner decision |
| low | T039 | Docs point at the retired drift log | M | open | Misleads agents; maybe one header line per tracker |
| low | T059 | CRA peer deps no longer resolve | L | open | Builds only with --legacy-peer-deps; the fix is leaving CRA, which needs a plan |
| low | T060 | 35 build lint warnings | M | open | Each wants a look, not an autofix; blocks a lint gate in T061 |
| low | T063 | Entity pages look like three products | L | needs scoping | NPC page doesn't use the shell; pick the look first |
| low | T065 | Firebase CLI 13 → 15 | S | open | Brings the artifact cleanup policy; re-run the emulator suites after |
| low | T067 | Repo carries files nobody reads | M | needs scoping | 208 docs; archive or delete? |
| nit | T008 | Legend can't tell confirmed from false | S | open | Only the stacked bar is ambiguous |
| nit | T066 | Two stale remote branches | S | open | One is merged; the other holds 5 unmerged 2025 commits |
| nit | T038 | Rumour dialogs' nested scroll | S | open | Right call recorded; symptom only |
| nit | T009 | Hero band fallback never recorded | S | open | Answered by practice; write it down |
| nit | T010 | Two `D36`s in `colour-schema.md` | S | open | Ambiguous citations |
| nit | T011 | Stale phase counts in `colour-schema.json` | S | open | Needs the maintainer's semantics |

The dormant `theme-contract` questions at the bottom are unranked on purpose.

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
thing is yet · `blocked` · `in progress`

**Finished work is deleted, not marked done.** This file tracks what is left;
the PR that closed something is the record that it happened. When only part of
an entry lands, rewrite the entry to describe the remainder — do not leave the
closed half in place with a note attached.

**Size** · `S` a sitting · `M` a session or two · `L` needs its own plan first.

Drift-log references (`R16`, `Q15`, …) point back to
`docs/design/plan/03-drift-log.md`, where the original reasoning usually explains
why something was deferred rather than forgotten.

**Two other trackers are live and unaffected by this file**:
`docs/testing/bug-tracking/README.md` (bugs found by the behavioural suites) and
`CLAUDE.md`'s known-issues notes. Items that belong there are cross-referenced,
not copied.

## What phase 15 learned

Recorded here because `15-0` retired the drift log and `15-8` asks for it. Three
things, all of which cost something.

**A green suite says nothing about the browser, and this phase proved it five
times.** Raw ids in `15-2`, a disclosure that never hid in `15-3`, an accessible
name polluted by a pending indicator, and then the two `15-7` found in ten
minutes of the running app: every write flashed the page to a skeleton and
unmounted what was on it, and the row's controls measured 32px
against a 44px rule. All five were invisible to jsdom by construction — no CSS,
no real auth lifecycle, no pointer. The pages built without a browser pass
(`15-4`, `15-5`, `15-6`) shipped the skeleton defect three times because nobody
could see it.

**And a browser pass that only visits its own PR is not enough either.** The
two defects the user reported the day `15-8` opened were both of this kind:
the skeleton unmount was patched at the four call sites `15-7` happened to
touch and left live on the three index pages, and `15-4`'s location tree
became unopenable only once `15-4` itself gave every row something to open
into. Each PR verified what it changed; neither verified what its change now
implied elsewhere. A third defect — the NPC list showing the old stance after
a write — was sitting in the same three pages and had never been reported at
all. It turned out to be a second loader, and closing it took a rewrite one
directory over rather than the small patch it was filed as.

**A comment claiming a gate exists is worse than no gate.**
`location-presentation.ts` said `ladder-classes.test.ts` caught theme classes
passed as data. That file did not exist; `15-6` wrote it, and its first run
found a live instance the comment had been covering for. Claims about coverage
are checkable — check them.

**The tracker can describe an intention as if it were the code.** T008 said
confirmed and disproved rumours "sit on the same ramp stop — correct", and the
code had them two stops apart, with the disproved rumour in the red a failed
quest wears. The comment above the map said the right thing too. Three
documents agreed with each other and none of them agreed with the product.

---

## Bugs

### T071 — The band's eyebrow fails contrast in the light theme
**Type** bug · **Size** S · **Status** open · **Verified** 2026-09-25

The small uppercase label above a band's heading ("PRIVATE CAMPAIGN" on
`/signin`) measures **2.32:1** in light, on the plain band with no picture:
light `--color-emphasis` `#605953` on band `#26211C`. Dark is 7.34:1. Light is
the default theme, so most readers see the failing one.

- **Where**: `.hero-eyebrow` in `core/themes/css/components.css` takes
  `var(--color-emphasis)`, which `core/themes/derive/role-map.ts:36` derives
  from `surface.page.onMuted` -- a page ink, solved against the page, not the band.
- **Touches**: every `hero-eyebrow` -- `SignInPage.tsx`, `JoinPage.tsx`,
  `AdminLayout.tsx`, `CampaignBanner.tsx`.
- **Catch**: the rule's own comment says the eyebrow deliberately does not
  borrow the band's muted ink, and the schema is read-only to an implementing
  PR, so the fix is a schema-owner call. Same family as T040.
- **Source**: measured per pixel in Chromium on a production build while
  adding the sign-in picture, 2026-09-25.

---

## Features and enhancements

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
  the actions per-entity, rather than generalising the whole component. `RosterGroup`
  already grew an opt-in `collapsible` / `defaultCollapsed` pair for the quest
  directory — **grow that primitive again, do not fork it**.
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

### T054 — Sign in with Discord
**Type** feature · **Size** L · **Status** needs scoping · **Verified** 2026-09-23

Discord is where tabletop groups already talk, and the tools they use (D&D
Beyond, Roll20, Foundry) sign in with it.

- **Where**: next to Google in `core/services/firebase/auth/AuthService.ts`.
- **Catch**: Firebase has no Discord provider, and Discord's OAuth2 is not
  OpenID Connect, so Identity Platform's generic OIDC provider does not fit
  either. It needs a Cloud Function that runs the OAuth code exchange and mints
  a Firebase custom token. And it must pass the invite gate: a custom-token
  sign-in that creates an account goes through `gateAccountCreation`, which
  admits by **email**, so the function has to request Discord's `email` scope
  and set it on the account before the gate can match a reservation.
- **Source**: T022 planning, 2026-09-23

### T055 — Opt-in second factor
**Type** feature · **Size** M · **Status** needs scoping · **Verified** 2026-09-23

Let a user who wants it add a second step to sign-in.

- **Where**: Identity Platform (already enabled) supports TOTP authenticator
  apps and SMS. Enrolment would sit on the profile's `AccountCard`.
- **Catch**: **prefer TOTP.** SMS is billed per message sent, and a public SMS
  step invites SMS-pumping fraud unless the allowed regions are restricted.
  Check first that Firebase MFA applies to email-link sign-in at all -- it was
  not confirmed during T022.
- **Source**: maintainer, 2026-09-23

### T056 — Sign-in errors carry a reference code a user can report
**Type** feature · **Size** S · **Status** blocked · **Verified** 2026-09-24

**On hold — the maintainer wants a general error-numbering system for the whole
application, not one for sign-in alone** (2026-09-24). Design that first; this
entry then becomes its first consumer rather than a sign-in-only ref table.

An unrecognised sign-in failure shows only "Something went wrong signing you
in. Please try again.", so a user report cannot be traced. Append a short
reference, e.g. "(Ref: S14)", mapped from the Firebase error code, so the
maintainer can look it up. No raw Firebase text or debug output facing users.
PR #117's App Check failure (`auth/firebase-app-check-token-is-invalid`) hid
behind the generic line and could not be read on iOS Safari.

- **Where**: `core/services/firebase/auth/signInErrors.ts:94`, the fallback in
  `describeSignInError`. The ref table belongs there too. Callers: `SignInForm`,
  `EmailLinkPage`, `JoinAsNewUser`, `AccountCard`, all of which just show the string.
- **Catch**: the same function also **passes raw messages through**
  (`signInErrors.ts:91-93`): any `functions/*` error and any Error without a code
  returns `error.message`. An uncaught server fault therefore shows the bare
  word "internal". Decide whether those also get a ref instead.
- **Source**: maintainer, 2026-09-24 (PR #117 follow-up)

### T057 — Sign in with a code from the email, instead of approving from the phone
**Type** feature · **Size** M · **Status** blocked · **Verified** 2026-09-24

**On hold by the maintainer (2026-09-24): it needs a sending domain, which is
not wanted yet.** Reverse today's cross-device flow: the email carries a
6-digit code, and the reader types it on the device that wants to be signed
in. The phone then only reads the email and never signs in or runs site code.
The same email can keep the magic link for signing in on the device that opens it.

- **Where**: today the laptop shows a 4-digit code (`SignInForm.tsx:159`) and
  the phone approves it (`EmailLinkPage.tsx`, `core/services/firebase/auth/deviceApproval.ts`,
  the `*DeviceSignIn` callables in `firebase/functions/src/deviceSignIn/`,
  polled by `auth/hooks/useDeviceSignInWait.ts`). Most of that would go. Two
  callables replace it: one to send a code (store only a hash, expiry, attempt
  count; limit requests per address) and one to check it and return a custom token.
- **Blocker**: Firebase's own sign-in email cannot carry a custom code, so the
  function must send the mail itself. The plan is **Resend** (free tier 3,000/month,
  100/day), which needs a domain you own. `dnd-campaign-companion.web.app`
  cannot be verified. Setup: a sending subdomain with SPF/DKIM/DMARC, region
  `eu-west-1`, **open and click tracking off** (click tracking rewrites the magic
  link), a sending-only API key in Secret Manager as `RESEND_API_KEY`. The email
  can carry the link too, built with the Admin SDK's `generateSignInWithEmailLink`.
  `contact.ts:60` already sends through Gmail via nodemailer, but Gmail's
  daily limits make it a poor fit for sign-in mail.
- **Catch**: issue tokens only for accounts that already exist. The repo
  disagrees about whether a custom-token sign-in that *creates* an account
  passes `gateAccountCreation`: `claimDeviceSignIn.ts:35` says it goes around
  it, T054 says it goes through. **Unverified.** Either way, never minting for
  a missing uid is safe. Also: give the same answer whether or not the address
  has an account, and require App Check on the send callable (it can mail any address).
- **Cost**: estimated (not measured) at about 4 emails per active user per
  month. Resend is free at today's size and about $20/month into the
  thousands; Amazon SES is the cheapest at tens of thousands of users. Keep
  the provider behind one send function so switching changes only that. Firebase
  Auth costs the same in either design (free up to 50k monthly active users).
- **Rollback**: the current approve-from-the-phone flow keeps working without
  any of this, so it stays the fallback.
- **Source**: maintainer, 2026-09-24

### T063 — The NPC, location and quest pages look like three products
**Type** feature · **Size** L · **Status** needs scoping · **Verified** 2026-09-24

The maintainer wants the three entity pages streamlined in how they look.

- **Measured**: the location and quest pages share `EntityPageShell` (a dark
  band header, a two-column body); the NPC page does not use it at all. It has
  its own identity card, with a tall portrait beside the name rather than a
  band across the top (`pages/npcs/NPCDetailPage.tsx:665`). Places are wide
  and people are tall, so the two need not share one image shape.
  The shell's own doc comment says `15-6` consumed it unchanged. That is not
  what the tree shows.
- **Question before sizing**: which look wins, the band or the card? And is the
  goal one shell for all three, or a shared visual language only?
- **Source**: todo.txt, 2026-09-24

---

## Decisions needed

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

### T008 — A legend swatch cannot distinguish "confirmed" from "false"
**Type** decision · **Size** S · **Status** open · **Verified** 2026-09-16 · `Q20`

Confirmed and disproved rumours sit on the same ramp stop — correct, because both
are fully known, and what separates them is the strike cue rather than the hue.
That reads fine in a row. In the **stacked summary bar** above the directory, two
adjacent segments of the same hue merge into one band, and a reader filtering by
"false" sees a legend swatch identical to "confirmed".

The open question is whether a bar segment is a different kind of surface from a
label — one where adjacency itself carries meaning — and therefore owes a rule
the rows do not. (T004 asked the neighbouring question of `NPCLegend`, and was
answered by retiring it, so this bar is now the only legend-like surface left.)

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


### T066 — Two stale branches on the remote
**Type** decision · **Size** S · **Status** open · **Verified** 2026-09-24

Two old branches remain on GitHub, and neither ever had a PR.

- **`feature/third-party-integrations`**: fully merged into `main`. Deleting it
  loses nothing.
- **`feature/form-context-separation`**: **5 commits not on `main`**, last one
  2025-06-07 ("complete form/context separation refactoring with standardized
  entity architecture"). The 2026 feature-first restructure almost certainly
  superseded it. But deleting it discards those commits, which is the maintainer's call.
- **Source**: todo.txt, 2026-09-24

---

## Tech debt and platform

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

### T025 — Admin panel needs a do-over, and its bug list needs re-checking
**Type** debt · **Size** L · **Status** needs investigation · **Verified** 2026-09-16

Filed as six claims. Three are stale, two hold, one is untested — check each
before planning the rebuild.

| Claim | Finding, 2026-09-16 |
|---|---|
| Groups cannot be created — Firestore transactions require all reads before all writes | **Likely fixed 2026-09-23, for a different reason than filed.** The transaction moved to a `createGroup` Cloud Function long ago, but the client called it through a bare `getFunctions()`, i.e. `us-central1`, where nothing is deployed. Now on the service's `europe-west1` instance, pinned by a test. Still wants one live run in production. |
| Campaigns cannot be deleted | **Likely fixed 2026-09-23.** The confirm dialog was wired, but `CampaignService.deleteCampaign` had the same bare-`getFunctions()` region defect as group creation. Fixed the same way; wants one live run in production. |
| Neither campaigns nor groups can be edited | **Fixed.** `CampaignManagementView.tsx:33,64-74` has an edit dialog; groups gained `GroupService.updateGroup` and an Edit control on `/admin/group` (T036, 2026-09-23). |
| Groups view shows only the current group | **Holds.** `GroupManagementView.tsx:33` does `groups.find(g => g.id === activeGroupId)` and renders that one, though `useGroups()` supplies the full list. |
| Groups cannot be edited or deleted | **Half fixed.** Editing landed as T036 (2026-09-23). Deletion still has no service method or Cloud Function — T037. |
| Creation of groups and campaigns works? | **Untested.** Needs the emulator and a real run; nothing in the tree settles it. |

- **Touches**: `src/features/user-management/admin/components/` (`AdminPanel`,
  `GroupManagementView`, `CampaignManagementView`, `UserManagementView`,
  `TokenManagementView`) and `GroupService`.
- **Catch**: **the panel is already a route** — `/admin/{people,campaigns,group}`,
  decided in `docs/design/plan/00-surface-routing.md` and built in Phase 14,
  with `10-1`'s 3-second loading timeout carried across verbatim. Re-measure this item's six
  claims against that work before planning anything: the components named above
  under *Touches* (`AdminPanel`, `UserManagementView`, `TokenManagementView`) do
  not survive the phase. Of the "groups cannot be edited or deleted" claims,
  editing is done (T036) and deletion is tracked as T037.
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
  element is inside `header`/`footer` before blaming the story pages.
  `AccountCard` was a confirmed instance of the same class of defect: fixed
  2026-09-23 by stacking its rows below `sm`.
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

### T059 — Create React App's peer dependencies no longer resolve
**Type** debt · **Size** L · **Status** open · **Verified** 2026-09-24

A plain `npm install` fails with `ERESOLVE`. It only works with
`--legacy-peer-deps`, which is what CI uses.

- **Measured**: `react-scripts@5.0.1` declares TypeScript `^3.2.1 || ^4` against
  the project's `^5.7.3`; its `jest-watch-typeahead@1.1.0` wants Jest 27/28
  against `^29.7.0`. CRA itself is no longer maintained, so no upgrade of it fixes this.
- **Where**: `package.json:21`; CI installs in `docker/Dockerfile.frontend.prod:8`
  (`npm install --legacy-peer-deps`, not `npm ci`, so the lockfile is not enforced).
- **Catch**: the real fix is leaving CRA (e.g. Vite), which touches the build,
  env-var names (`REACT_APP_*`), jest config and the four-resolvers table in
  `CLAUDE.md`. Needs its own plan. It may also answer T030's bundle question.
- **Source**: todo.txt, 2026-09-24

### T060 — The build prints 35 lint warnings
**Type** debt · **Size** M · **Status** open · **Verified** 2026-09-25

`npm run build` compiles "with warnings": 35 in 20 files, all pre-existing.

- **Measured** (2026-09-25): 19 `react-hooks/exhaustive-deps` and 16
  `@typescript-eslint/no-unused-vars`. The one accessibility warning, the theme
  menu's `aria-pressed` on a `menuitem`, is fixed; an unused variable merged
  since the first count keeps the total at 35.
- **Catch**: an `exhaustive-deps` "fix" can change when an effect runs. Each one
  wants a look, not a blanket autofix. And CRA turns warnings into errors when
  `CI=true`, which matters for T061.
- **Source**: todo.txt, 2026-09-24

### T061 — Pull requests are checked by the build alone
**Type** debt · **Size** M · **Status** open · **Verified** 2026-09-24

The PR workflow builds the app in Docker and deploys a preview. That is the
only gate. Tests, lint and the functions suite never run in CI.

- **Where**: `.github/workflows/firebase-hosting-pull-request.yml`: one job,
  `build_and_preview` (the build does type-check, via CRA).
- **What is missing**: `npm test` (the ~5,500-test suite a merge is supposed to
  keep green), lint, and `firebase/functions`' suite. The functions suite
  needs the emulators, which `firebase emulators:exec` can run in CI.
- **Catch**: a lint gate is red on day one until T060 is done. And a failing
  test does not block the merge-to-main deploy today, so this is what turns
  "must be green" into something enforced.
- **Source**: todo.txt, 2026-09-24

### T065 — The Firebase CLI is two major versions behind
**Type** debt · **Size** S · **Status** open · **Verified** 2026-09-24

Installed globally: `firebase-tools` 13.32.0; the CLI offers 15.x.

- **Why now**: the 2026-09-24 functions deploy ended with "Unhandled error
  cleaning up build images. This could result in a small monthly bill". The
  newer CLI's `firebase functions:artifacts:setpolicy` sets a cleanup policy
  for that.
- **Catch**: two majors can change emulator behaviour this repo leans on. Re-run
  `firebase/functions`' suite (including the Storage rules suite and its
  project-id quirk) and a `start-dev.ps1` round trip after upgrading.
- **Source**: todo.txt, 2026-09-24

### T070 — Cloud Functions are deployed by hand, not by CI
**Type** debt · **Size** M · **Status** needs investigation · **Verified** 2026-09-25

Merging to `main` deploys Hosting only. Functions are deployed from the
maintainer's machine, so a frontend change that needs a new function (as the
bug-report screenshot did, 2026-09-25) is not live until someone remembers to
deploy it.

- **Where**: `.github/workflows/firebase-hosting-merge.yml` runs
  `action-hosting-deploy` and nothing else; `firebase/functions/package.json`
  pins Node 22 and already has `build` (`tsc`), which `firebase.json`'s
  `predeploy` runs.
- **Catch 1 (confirmed)**: `firebase/functions/src/contact.ts:54` reads
  `CONTACT_EMAIL`/`CONTACT_PASSWORD` from `process.env`, which only the
  gitignored `firebase/functions/.env` supplies. A CI checkout lacks it, so the
  first CI deploy would ship a contact form with blank Gmail credentials. Move
  both to Secret Manager the way `entityExtraction.ts:395` declares
  `secrets: ["OPENAI_API_KEY"]`, and deploy that once by hand first.
- **Catch 2 (unverified)**: `FIREBASE_SERVICE_ACCOUNT_DND_CAMPAIGN_COMPANION`
  is probably the Hosting-only account `hosting:github` creates. Check its IAM
  roles in the console; a separate deploy account is safer than widening it.
  `gateAccountCreation` is a blocking function, which needs Auth admin rights too.
- **Order**: functions must deploy before Hosting in the same run (`needs:`),
  or a new payload reaches users before the function that reads it.
- **Out of scope**: rules stay manual; `firebase.json` has no rules keys on
  purpose. Running the emulator-backed functions suite belongs to T061.
- **Source**: maintainer, 2026-09-25

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
| `PERF-01` search never terminates on whitespace | Critical | **Fixed.** All three split sites are now `split(/\s+/).filter(Boolean)`, and `findWordMatches` (`SearchService.ts:294`) guards `if (!word) return []`. `SearchBar.tsx` is gone, replaced by `shared/components/command-palette/`. The regression test that did not ship with the fix landed as T031 (2026-09-23), pinning each guard separately. |
| `PERF-07` context switch refreshes then reloads | High | **Fixed.** The only `window.location.reload()` left in `src/` is `ErrorBoundary.tsx:62`. |
| `PERF-10` all routes + full Lodash in one bundle | Medium | **Half fixed.** Zero `lodash` imports remain in `src/`. Route splitting is still open — see T030. |
| `PERF-04` notes loaded twice, unbounded | High | **Fixed** 2026-09-24 — `NoteContext` reads once, constrained to the active campaign, and reads nothing before one is selected. New note ids are random, so nothing needs the other campaigns' notes. |
| `PERF-08` duplicate collection owners | Medium | **Fixed** 2026-09-22 — one fetch per collection, pinned by `shared/hooks/__tests__/provider-fetch-counts.test.tsx`. |
| `PERF-15` duplicate `NavigationProvider` | Low | **Fixed** 2026-09-24 — `index.tsx` mounts no provider of its own; `App`'s is the only one. |

The **other nine are unverified against current `main`** — `PERF-02`, `03`,
`05`, `06`, `09`, `11`, `12`, `13`, `14`. That is T033. The review's own
prioritized list opens with a finding that is already fixed, so do not work
straight down it.

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

### T067 — The repository carries files nobody reads
**Type** docs · **Size** M · **Status** needs scoping · **Verified** 2026-09-24

The maintainer wants the repo cleaned up, doc files especially.

- **Measured**: 208 Markdown files under `docs/`: `testing/` 109, `design/` 59,
  `superpowers/` 21, and a few each in `architecture/`, `project/` and `performance/`.
  `CLAUDE.md` still names `docs/testing/post-test-coverage-roadmap.md` as
  "start here", and it was last updated 2026-08-28 (it still warns about deploy
  steps TODO.md shows were done since). T039 is one symptom of the same drift.
- **Scripts**: `scripts/copyFeatureFiles.ps1` lists pre-restructure paths;
  `scripts/manage-environment.ps1` is Docker-based and unused.
- **Catch**: `docker/` is *not* dead. `CLAUDE.md` calls it unused, but CI builds
  the frontend with `docker/Dockerfile.frontend.prod`. And many docs are phase
  handoffs that code comments cite by name, so deleting one breaks references.
- **Question before sizing**: archive (move under `docs/archive/`) or delete?
  And is `TODO.md` the one "start here" file from now on?
- **Source**: todo.txt, 2026-09-24

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
