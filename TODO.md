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

The rows for T083–T101 and T037's rise were triaged 2026-10-04 from the code
review's severities (see [The 2026-10 code review](#the-2026-10-code-review)),
adjusted for the images focus above.

| Priority | ID | Item | Size | Status | Why this priority |
|---|---|---|---|---|---|
| high | T083 | Edits send the whole record and overwrite newer changes | L | open | Ordinary collaboration reverts other people's edits; restores deleted images |
| high | T084 | The sweep can delete an upload whose document write is pending | M | open | Images focus; the sweep can delete a valid upload |
| high | T085 | Editors carry the wrong record's draft, or lose it on a failed save | L | open | Authored prose lost or saved into another record |
| high | T037 | Deletions cannot recover from a failure; a group cannot be deleted | L | open | Failed deletions strand data and refuse retry; the last-admin guard races. Group deletion decided 2026-10-02, plan first |
| medium | T075 | Rename the site; header crowded | M | needs scoping | The name carries WotC's trademark, and the decision (2026-10-03) is to drop it; the new name is the maintainer's to pick |
| medium | T026 | Reader's chapter drawer won't touch-scroll | S | needs investigation | Reported on a phone; desktop Chrome cannot reproduce it, so it needs the phone first |
| medium | T088 | Concurrent structural edits corrupt locations, chapter order, attachments | L | open | Cycles, duplicate orders, extra quests per retry |
| medium | T100 | `start-dev.ps1` stop can lose data and kills unrelated Java | M | open | Local edits lost on a failed export |
| medium | T105 | Deploy the rules from the repo | M | open | Repo and production can drift unseen |
| medium | T103 | Browser checks are not reproducible | L | needs scoping | Browser-found defects can return unnoticed; phase 15 showed jsdom misses them |
| medium | T106 | Should the production rules be public? | S | open | Public repo; public rules make any hole in them easy to find |
| low | T017 | Batch delete for locations; batch actions for chapters | M | needs scoping | Every roster has batch status now; deleting several places needs a decision about what is inside them |
| low | T054 | Sign in with Discord | L | needs scoping | Kept for later, not now (2026-10-02); Firebase has no built-in provider |
| low | T057 | Sign in with a code from the email | M | blocked | On hold: needs a sending domain; the current phone-approval flow works |
| low | T055 | Opt-in second factor | M | needs scoping | Kept for later, not now (2026-10-02); prefer an authenticator app over SMS |
| low | T059 | CRA peer deps no longer resolve | L | open | Builds only with --legacy-peer-deps; decided 2026-10-02 to move to Vite, plan first |
| low | T063 | Entity pages look like three products | L | open | Decided 2026-10-02: locations and quests adopt the NPC page's light card; location picture stays wide |
| low | T065 | Global Firebase CLI still 13.x | S | open | Repo pins 15.22.4; the maintainer's machine and `start-dev.ps1` still run 13 |
| low | T079 | Do old documents still lack `locationId`? | S | needs investigation | The legacy free-text fallback stays until production says no document needs it |
| low | T074 | Default pictures where none uploaded | M | needs scoping | Reverses deliberate empty-state design (D45); pairs with T063 |
| low | T099 | Contact form's rate limit is easy to evade | S | open | Mail abuse possible, nothing exposed |
| low | T101 | Large campaigns: quest and rumour rosters unpaged | S | open | Measured at 1,000s of records; not felt at current sizes |
| low | T107 | CI builds the site in Docker only to copy it out | S | open | Shipped build ignores the lockfile CI tested |
| low | T104 | Update the Firebase email templates | S | needs scoping | Waits on the new name (T075) |

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

### The 2026-10 code review

Five review passes by OpenAI agents (2026-10-03/04) are recorded in
`docs/reviews/`. They are filed here **by piece of work, not by finding**: one
entry carries every finding ID (`SEC-001`, `DATA-003`, …) that one change
closes, and the ID is the anchor into its report for the reproduction,
evidence and fix direction. Read the report at pickup rather than copying it
here. Test gaps (`TEST-…`) ride with the entry whose fix they must protect.

- Every confirmed finding not yet fixed is covered by an entry: T083–T101, plus T037.
- **Not filed**: the reviews' unverified leads, and the optional refactors.
  They stay in the reports.
- **The auth review was stopped partway and will not be finished**
  (maintainer, 2026-10-04). Its open findings are filed under T037; the rest
  of that scope stays unreviewed by decision.
- App source was byte-identical to the reviewed commit `64fe195` when these were
  filed, and each entry's primary location was opened on 2026-10-04.

Entries cite reports by number:

| # | Report | # | Report |
|---|---|---|---|
| 01–04 | `docs/reviews/2026-10-03/` | 14–16 | `docs/reviews/2026-10-04/pass-4/` |
| 05–08 | `docs/reviews/2026-10-03/pass-2/` | 17–21 | `docs/reviews/2026-10-04/pass-5/` |
| 09–13 | `docs/reviews/2026-10-03/pass-3/` | | |

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

**The tracker can describe an intention as if it were the code.** The entry for
the rumour bar's hatch said confirmed and disproved rumours "sit on the same ramp stop — correct", and the
code had them two stops apart, with the disproved rumour in the red a failed
quest wears. The comment above the map said the right thing too. Three
documents agreed with each other and none of them agreed with the product.

---

## Bugs

Bugs the behavioural suites find live in `docs/testing/bug-tracking/README.md`.

### T083 — Edits send the whole record and overwrite newer changes
**Type** bug · **Size** L · **Status** open · **Verified** 2026-10-04

Ticking an objective, changing a status or adding a note writes back the full
in-memory record, so whatever anyone changed since it loaded is reverted. A
second tick can undo the first; an unrelated write can restore an image whose
file was already replaced and deleted. Pass 4 reproduced it in two ordinary
tabs.

- **Where**: `src/features/campaign-entities/quests/context/QuestContext.tsx:147`
  writes `{ ...quest, objectives }` under a doc comment saying it leaves every
  other field alone. The NPC, location, rumour and note contexts do the same
  (the report lists each).
- **Findings**: DATA-003 (03), IMG-002 (04), TEST-002 (08). The duplicated
  batch-limit helper (09, consolidation item 2) belongs with this change.
- **Catch**: three problems under one symptom. Scalar fields need true patches,
  arrays (objectives, notes) need stable element ids or transactions, and
  overlapping prose edits need a decision on conflict behaviour. And
  `QuestContext.objectives.test.tsx` asserts the stale fields: a field-only
  patch fails four tests. They pin the defect, like #1414/#1415. **Approved
  (maintainer, 2026-10-04): rewrite them against the requirement**, so that an
  objective write carries only `objectives`. Say so in the PR, test by test.
  Plan first.
- **Source**: code review, 2026-10-04

### T084 — The sweep can delete an upload whose document write is still pending
**Type** bug · **Size** M · **Status** open · **Verified** 2026-10-04

A picture attached offline whose document write is still pending after 24 h
is deleted by the daily sweep, which knows only object age and current
references (`firebase/functions/src/imageMaintenance/sweepOrphanedImages.ts`,
`referencedPaths` and the age guard). Reconnecting then writes a reference to
a missing file. Needs a protocol for pending writes, not a longer grace
period.

- **Findings**: IMG-003 (04).
- **Related**: the sweep still reads every NPC, location, campaign and group
  document daily to learn what is referenced (PERF2-004's remaining half,
  07). Its listing and deletes are bounded now; the reads grow with all
  content. A ledger of uploads awaiting their document would answer both:
  the sweep would check candidates instead of everything, and could tell a
  pending upload from an orphan.
- **Source**: code review, 2026-10-04

### T085 — Editors carry the wrong record's draft, or lose the draft when a save fails
**Type** bug · **Size** L · **Status** open · **Verified** 2026-10-04

Authored text is lost or misfiled in several ways. Separate causes, grouped
because the fix is one idea: a draft belongs to one record and outlives a
failed write.

- **Failed save loses the draft**: `ChapterForm.tsx:145-149` navigates away in
  `finally`, success or not (FUNC-005). A rejected entity write sets the
  provider error (`useFirebaseData.ts:285`) that the page gate reads, which
  unmounts the editor, and Retry doesn't recover it (REACT-002, TEST-007).
- **Wrong record**: going from NPC A to B keeps A's draft and saves it to B
  (REACT-001); an offline-queued note save runs against the next note after
  Search navigation (RECOVERY-001); a cross-campaign note's fallback survives
  route and campaign changes (RECOVERY-002).
- **Draft dropped on leaving**: leaving a note before the autosave debounce
  cancels the only pending save; a reload loses an unacknowledged one
  (REACT-003).
- **Cross-campaign note is blank**: `NotePage.tsx:229-236` passes only `noteId`
  to the read-only editor, never the fetched note (FUNC-001, TEST-003).
- **Findings**: 05, 06, 08, 15. **Catch**: the reviewers say these need separate
  regression sequences; consider splitting at pickup. Plan first.
- **Source**: code review, 2026-10-04

### T088 — Concurrent structural edits corrupt locations, chapter order, attachments and conversions
**Type** bug · **Size** L · **Status** open · **Verified** 2026-10-04

Each of these decides from a stale local copy, then writes:

- **Conversion** (DATA-005, 03): rumour → quest and combine create the target
  first (`RumorContext.tsx:306-311`) and mark the sources after; a failed mark
  leaves an extra quest on every retry (pass 5 reproduced it, 17).
- **Location tree** (DATA-006): `LocationContext.tsx:178` checks for a cycle
  against the local list, so two opposite moves make one; a child added during
  a delete is orphaned.
- **Chapter order** (DATA-007): `StoryContext.tsx:472-488` shifts orders from
  the local list; concurrent inserts gave 1, 2, 3, 3.
- **Attachment kind** (DATA-008): `attachCandidates.ts:86` keys "attached" by
  bare id, so a location and a quest sharing a slug are confused. Small and
  independent; can go first.
- **Combine preview** (DUP-002, 09): `CombineRumorsDialog.tsx:40-46` predicts
  an id the allocator then changes.
- **Source**: code review, 2026-10-04

### T099 — The contact form's rate limit is easy to evade
**Type** bug · **Size** S · **Status** open · **Verified** 2026-10-04

`firebase/functions/src/contact.ts:78-106` throttles in process memory, keyed
for anonymous callers by the address they supply. A new address, or a new
function instance, resets it.

- **Findings**: SEC-006 (01). **Catch**: identifying an anonymous caller (App
  Check, IP) is the design question.
- **Source**: code review, 2026-10-04

---

## Features and enhancements

### T017 — Batch delete for locations, and batch actions for chapters
**Type** feature · **Size** M · **Status** needs scoping · **Verified** 2026-10-03

Rumours, NPCs and quests can be selected and then deleted or given a status in
one go; locations can be given a status but not deleted; the chapter list has
neither.

- **Locations -- decide first**: deleting one place asks what becomes of what
  is inside it (`LocationChildStrategy`: delete the subtree, or move the
  children up to the grandparent). A selection can mix parents, children and
  unrelated places, so it needs one answer for all of them, and the
  confirmation has to say how many places that removes in total. One batch is
  atomic, so the descendants-first ordering `deleteLocation` keeps for its
  sequential writes stops mattering. Delete pictures after the documents.
- **The pattern to copy**: `shared/hooks/useSelection` (mode and ticked ids),
  `campaign-entities/shared/EntityBatchActions.tsx` (the bar: statuses, an
  optional Delete and its confirmation), and a batched pair on the context that
  writes through `campaign-entities/shared/commitEntityWrites.ts`, as
  `QuestContext`'s `updateQuestsStatus` and `deleteQuests` do. Stamp
  modification attribution yourself: a batch writes its data as given.
  `QuestDirectory.batch.test.tsx` is the test pattern.
- **Chapters are different**: the list is `ChapterList.tsx`, not a roster, and
  chapters have no status. Deleting several also has to keep the remaining
  chapters' `order` contiguous, which `StoryContext.deleteChapter` does for one.
- **Source**: todo.txt, 2026-09-16

### T054 — Sign in with Discord
**Type** feature · **Size** L · **Status** needs scoping · **Verified** 2026-09-23

Discord is where tabletop groups already talk, and the tools they use (D&D
Beyond, Roll20, Foundry) sign in with it.

**Kept for later, not now** (maintainer, 2026-10-02). Do not scope it until asked.

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

**Kept for later, not now** (maintainer, 2026-10-02). Do not scope it until asked.

- **Where**: Identity Platform (already enabled) supports TOTP authenticator
  apps and SMS. Enrolment would sit on the profile's `AccountCard`.
- **Catch**: **prefer TOTP.** SMS is billed per message sent, and a public SMS
  step invites SMS-pumping fraud unless the allowed regions are restricted.
  Check first that Firebase MFA applies to email-link sign-in at all -- it was
  not confirmed during T022.
- **Source**: maintainer, 2026-09-23

### T057 — Sign in with a code from the email, instead of approving from the phone
**Type** feature · **Size** M · **Status** blocked · **Verified** 2026-09-24

**On hold by the maintainer (2026-09-24): it needs a sending domain, which is
not wanted yet.** Reverse today's cross-device flow: the email carries a
6-digit code, and the reader types it on the device that wants to be signed
in. The phone then only reads the email and never signs in or runs site code.
The same email can keep the magic link for signing in on the device that opens it.

- **Where**: since 2026-09-29 the flow already runs in this direction, without
  a sending domain: opening the link on the phone shows a 6-digit code
  (`EmailLinkPage.tsx`, which approves through a throwaway sign-in in
  `core/services/firebase/auth/deviceApproval.ts`), and the laptop takes it in
  six boxes (`SignInForm.tsx`, `CodeInput.tsx`) and trades it for a custom token
  (`claimDeviceSignIn`). What is left for this item is putting the code in the
  email itself, so the phone never opens the site: a callable that sends the
  mail, and `claimDeviceSignIn` checking a code made at start instead of at
  approval (keep only a hash, since it would then exist before anyone proved
  the inbox).
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
**Type** feature · **Size** L · **Status** open · **Verified** 2026-10-02

**Decided (maintainer, 2026-10-02): the location and quest pages move toward
the NPC page** — its light card, its general layout and its way of editing.
What matters most is **one design language across the three**: the content
(person, place, quest) differs, the look and feel is recognisably built on
the same foundation.

- **Hard constraint**: a location's picture **stays wide**, as it is today.
  People are tall and places are wide; the NPC's tall portrait beside the name
  stays too. One foundation, two image shapes. Quests have no picture today.
- **Measured**: locations and quests share `EntityPageShell` (a dark,
  full-bleed band header over a two-column body), which draws the location
  picture across the band. The NPC page does not use the shell: it opens with
  its own light identity `card` (sigil or 3:4 portrait beside the name, then a
  fact grid) beside a 20rem sidebar (`pages/npcs/NPCDetailPage.tsx:667`). All
  three already edit in place with `InlineEditor`, so "way of editing" is about
  how the NPC page arranges and reveals its editors, not a new mechanism —
  compare them before assuming a gap.
- **Approach**: one shared shell built from the NPC page's card, not three
  pages each copying it — grow `EntityPageShell` into that (or replace it),
  with the image shape as an option. The NPC page should end up on the same
  shell as the other two, which is what Phase 15 meant it to be.
- **Open for the plan**: where the wide location picture sits once there is no
  band (across the top of the identity card is the obvious reading). Show the
  maintainer that before building.
- **Catch**: this reverses Phase 15's band header on two pages. Tests that pin
  the band (`entity-page.test.tsx`, the location and quest page suites) change
  because the requirement changed — say so in the PR, test by test. D125 ("the
  band carries no accent") stays true but stops mattering on these pages; a
  light card can carry accent controls. Verify in a browser, both themes, at
  phone width.
- **Reported 2026-10-04: "entries" on the location page differ from the other
  pages.** Read as the table notes, the one list both pages share. Both render
  `NoteHistory`, but the location's (`LocationDetailPage.tsx:752-786`) sits in
  an `EntityPageSection` titled "Notes from the table", with no "oldest first",
  no saved confirmation (`onSaved` is a no-op) and the default row spacing. The
  NPC's (`NPCDetailPage.tsx:1129-1176`) is its own card titled "Notes", with a
  saved notice and padded rows. Quests have no table notes. If "entries" meant
  something else, ask the maintainer.
- **Source**: todo.txt, 2026-09-24; direction decided 2026-10-02; location
  notes added from todo.txt, 2026-10-04

### T074 — Default pictures where none has been uploaded
**Type** feature · **Size** M · **Status** needs scoping · **Verified** 2026-10-02

The maintainer would like default imagery for the dashboard banner and the
party crest — maybe several, one picked at random when the campaign or group
is created — and asks the same of NPCs and locations.

- **Where**: the banner `CampaignBanner.tsx` (no picture → plain band plus the
  campaign's sigil), the crest `PartyCrest.tsx` (no crest → a hatched panel),
  NPCs (`NPCDetailPage.tsx`, sigil instead of a portrait) and locations
  (`EntityPageShell`, plain band). Images today are uploads to Storage only;
  the repo ships no image assets (`public/` holds `index.html` and
  `manifest.json`).
- **Catch**: every one of those empty states is **deliberate design**, written
  down where it lives: "the empty state is the design rather than a
  placeholder" (`PartyCrest.tsx:21-24`, `CampaignBanner.tsx:28-31`), and
  `colour-schema.md` D45 ("a band with no picture is the plain band"). This
  reverses those, so it is a design decision first. Then: where the pictures
  come from and under what licence, and the bundle (`check:bundle`) if they
  ship in the app. "Chosen at creation" leaves every existing campaign, group,
  NPC and location without one unless they are backfilled.
- **Related**: T063 — its goal is that the three entity pages look alike *with
  no photo*. Decide this one first, or decide them together.
- **Questions before sizing**: which surfaces get defaults; whether a default
  is stored on the record or shown only when nothing is uploaded; where the
  art comes from.
- **Source**: todo.txt, 2026-10-02 (two inbox lines, merged)

### T075 — Rename the site, and uncrowd the header
**Type** feature · **Size** M · **Status** needs scoping · **Verified** 2026-10-03

**Decided (maintainer, 2026-10-03): the name drops "D&D", and the site
mentions D&D nowhere**, not even in a tagline or a disclaimer. The maintainer
picks the new name; this item ships it, together with a logo or shorter wording
for the crowded header the maintainer reported (busy, some text cut off).

- **Why** (WotC's own terms, read 2026-10-03; not legal advice): "Dungeons &
  Dragons" and "D&D" are Wizards of the Coast trademarks. The Fan Content Policy
  (updated 2017-11-15) grants none: "You may not incorporate any Wizards of the
  Coast logos and trademarks in your Fan Content without our prior, written
  consent." Its required notice covers WotC *content*, not the name. Nor could
  the site qualify: it "can't require … email registration to access", and this
  one is invite-only behind sign-in. SRD 5.2 (CC-BY-4.0) permits only "compatible
  with fifth edition" / "5E compatible" and licenses no trademark. The product
  uses no WotC content otherwise (the shipped code has no setting names or rules
  terms; Faerûn, Waterdeep and Neverwinter appear only in test fixtures), so once
  the name goes, no notice is needed.
- **Name to replace** (measured 2026-10-03): `Header.tsx:98-99`, `Footer.tsx:38`
  (as "© {year} D&D Campaign Companion"), `SignInPage.tsx:82`, `JoinPage.tsx:98`,
  `CampaignBanner.tsx:98`, `public/index.html:9,12`, `public/manifest.json:2-3`,
  the contact mail's subject and body (`firebase/functions/src/contact.ts:364,392,437`,
  seen only by the maintainer) and the tests that pin those strings
  (`Header`, `Footer`, `CampaignBanner`; the requirement changed, so say so in
  the PR). `README.md` (the name, and "for Dungeons & Dragons players"),
  `AGENTS.md` and `CLAUDE.md`'s opening line say D&D too: the repo is public.
- **Can stay**: `entityExtraction.ts:454,499` say D&D only in the prompt sent
  to OpenAI, which nobody sees. The "Dungeons" location filter
  (`LocationDirectory.tsx:54`) is the plain word, not the mark.
- **Outside the repo**: the public GitHub repo is `DnDCampaignCompanion`, described as
  "Dungeons and Dragons Campain Companion for the Players." Changing the
  description is free; renaming the repo changes its URL (GitHub redirects the old one). The
  Firebase console's public-facing app name (in sign-in emails and on Google's
  consent screen) was **not** read.
- **Stays for now**: the project id and live URL `dnd-campaign-companion(.web.app)`.
  A project id cannot be renamed. A new Hosting site or a custom domain can be added
  later, but that means the auth authorised domains, the magic link's `continueUrl`
  and existing bookmarks, and `CLAUDE.md`, docs and scripts, which name the
  project id throughout. That would be its own item.
- **Where**: `src/app/layout/Header.tsx:89-100` — one row carries the name, the
  context switcher, the inline nav, search and the account menu. The full name
  shows from the `title` breakpoint (1200px, `tailwind.config`) up, "D&D
  Companion" below it. The campaign/group name in the context switcher
  truncates by design at `max-w-[9rem] md:max-w-[14rem]`
  (`ContextTrigger.tsx:51`). Which truncation the maintainer means was **not**
  confirmed — that needs the running app.
- **Folded in**: the header overflows horizontally below ~380px on every route
  (logo and account block both at `min-width: auto`). `CLAUDE.md` called that
  "tracked in `TODO.md`", but no entry held it until this one.
- **Answer first**: the new name, from the maintainer. It decides whether a
  logo carries it and how much room the header gets back.
- **Source**: todo.txt, 2026-10-02; the trademark question was looked into and
  decided 2026-10-03

---

## Tech debt and platform

### T026 — The reader's chapter drawer cannot be scrolled with a finger
**Type** debt · **Size** S · **Status** needs investigation · **Verified** 2026-10-03

Reported by the maintainer on a phone (2026-10-02). **Not reproduced**
(2026-10-03).

- **Where**: below `lg` the rail is a drawer, opened from the "Chapters" button
  in `src/pages/story/StoryPage.tsx` and rendered by
  `features/storytelling/stories/components/ChapterRail.tsx`.
- **Measured in desktop Chrome, 320px iframe**: the drawer is viewport-high,
  its list is a real scroll container (600px tall over 1,204px of rows), and
  `elementFromPoint` finds the list's own rows across it: nothing covers it.
  No code in `src/` registers touch handlers or sets `touch-action`. Its list
  now has `overscroll-contain`, so reaching its end no longer scrolls the page
  behind, which is the nearest thing to the report that could be checked.
- **Next step**: on the phone it was seen on, note the browser, then open the
  drawer on a chapter late in a long campaign and drag the list. A desktop
  window cannot answer this: the browser agent has no touch input.
- **Source**: todo.txt, 2026-09-16; narrowed 2026-10-02

---

### T037 — Deletions cannot recover from a failure, and a group cannot be deleted
**Type** debt · **Size** L · **Status** open · **Verified** 2026-10-04

**The deletions that exist leave data behind when they fail** (code review,
2026-10-04). Group deletion would be built on them, so the plan covers these
first:

- `deleteCampaign` (`firebase/functions/src/campaignManagement/deleteCampaign.ts:107-150`)
  deletes member notes through a BulkWriter whose individual failures
  `close()` does not reject, deletes images before documents, and
  `recursiveDelete` can remove the root after a failed child, after which a
  retry is refused. The campaign stays writable during cleanup. DATA-004,
  DATA-010 (03), IMG-005 (04), TEST-005 (08).
- The last-admin guard (`firebase/functions/src/shared/groupAdmins.ts:29-42`)
  reads the roster outside a transaction: two admins leaving at once both pass
  and leave the group with none. AUTH-001 (02).
- `deleteUser` (`deleteUser.ts:110-129`) deletes the profile before the Auth
  account, so an Auth failure becomes unretryable (AUTH-002). A retried group
  removal has lost the username it should release (DATA-009, 03).

**Decided (maintainer, 2026-10-02): group deletion will be built** — it is a
plan to write, not something to start without one. The maintainer's reason is
data retention: as long as a group cannot be deleted, the app keeps its
members' data with no way to remove it. The plan should say what is deleted
and what is kept (e.g. a member's own profile when they belong to another
group), and check what account deletion (`deleteUser`) already leaves behind,
since the two answer the same question.

No service method, no Cloud Function. Not a small one either: deleting a group
means cascading through its campaigns (each with its own subcollections), its
`users`, its `usernames` reservations and its `registrationTokens`, plus every
member's notes for every campaign in it.

- **Precedent**: `deleteCampaign`, an Admin SDK `recursiveDelete` in a
  callable, but with the failure modes above. Its doc comment at
  `src/core/services/firebase/campaign/CampaignService.ts:225` explains why a
  client cannot do this itself.
- **Meanwhile**: `/admin/group`'s danger zone offers **Leave group** only,
  which is implemented (`removeUserFromGroup`).
- **Source**: Phase 14.3, while building `/admin/group`

### T059 — Create React App's peer dependencies no longer resolve
**Type** debt · **Size** L · **Status** open · **Verified** 2026-09-24

A plain `npm install` fails with `ERESOLVE`. It only works with
`--legacy-peer-deps`, which is what CI uses.

- **Measured**: `react-scripts@5.0.1` declares TypeScript `^3.2.1 || ^4` against
  the project's `^5.7.3`; its `jest-watch-typeahead@1.1.0` wants Jest 27/28
  against `^29.7.0`. CRA itself is no longer maintained, so no upgrade of it fixes this.
- **Where**: `package.json:21`; CI installs in `docker/Dockerfile.frontend.prod:8`
  (`npm install --legacy-peer-deps`, not `npm ci`, so the lockfile is not
  enforced; T107 would drop that Docker build).
- **Decided (maintainer, 2026-10-02): move to Vite**, planned before any code.
  It touches the build, env-var names (`REACT_APP_*` → `VITE_*`), jest config
  (stay on jest, or move to Vitest — the plan decides) and the four-resolvers
  table in `CLAUDE.md`, which Vite can collapse by honouring `@/` paths. `scripts/check-bundle-size.js` expects CRA's
  `build/static/js/main.*.js`; a new bundler must keep it measuring the entry.
- **Source**: todo.txt, 2026-09-24

### T065 — The maintainer's global Firebase CLI is still 13.x
**Type** debt · **Size** S · **Status** open · **Verified** 2026-09-28

The repo now pins `firebase-tools` **15.22.4** in `firebase/package.json`, and
`firebase/functions`' suite passes on it: 11/11 suites, 194/194 tests, the same
as on 13.32.0 (2026-09-28). An emulator export written by 13.32.0 imports under
15.22.4 with its Firestore documents and Auth users intact. What is left
happens on the maintainer's machine, which `start-dev.ps1` runs against
the **global** CLI:

- `npm i -g firebase-tools@15.22.4`, then one `start-dev.ps1` start/stop round
  trip. The PowerShell script itself was not run; only the import/export it
  performs was.
- **Why not latest**: from 15.23.0 the CLI's HTTP client sends every request
  through `HTTPS_PROXY`, `127.0.0.1` included, and ignores `NO_PROXY`. Behind a
  proxy the Storage emulator's `firestore.get()` then reaches the proxy instead
  of the Firestore emulator (403), and the Storage rules suite fails 11 tests.
  Still so on 15.31.0. Bisected 2026-09-28: 15.22.4 good, 15.23.0 bad. No proxy
  (a normal desktop, a GitHub runner) is unaffected, but cloud agent sessions
  set one. Re-run `npm --prefix firebase run test:functions` behind a proxy before bumping.
- **Source**: todo.txt, 2026-09-24; pinned 2026-09-28

### T079 — Do old documents still lack `locationId`?
**Type** debt · **Size** S · **Status** needs investigation · **Verified** 2026-10-03

NPCs and quests refer to a location by `locationId`. Documents written
before that field existed carry only the free-text `location`, and still
resolve through a legacy fallback (`resolveLocationName` and
`referencesLocation` in `locations/utils/location-display.ts`). The field
shipped without a migration (`d6d9847`): such a document gains an id the next
time anyone edits it.

- **Answer first**: how many documents **in production** still have no
  `locationId`. Not the emulator: its imported data can be arbitrarily old.
  `src/utils/__dev__/normalizeChapterDateModified.ts` is a working template
  for an audit / migrate / revert pass.
- **Then**: none left, and the fallback can go; some left, and either backfill
  them or keep the fallback on purpose.
- **Source**: the post-test-coverage roadmap (2026-08-28), carried over when it
  was deleted

### T100 — `start-dev.ps1` stop can lose data and kills unrelated Java; start skips compiling Functions
**Type** debt · **Size** M · **Status** open · **Verified** 2026-10-04

- OPS-001: `scripts/start-dev.ps1:128-129` runs the export and prints "Data
  exported successfully" regardless: `firebase` is a native command, so a
  failed export never reaches the `catch`. Then it shuts the emulators down.
- OPS-002: `:148-152` force-stops every `java` process on the machine.
- OPS-004: start never builds `firebase/functions`, so the emulators can run
  missing or stale compiled code while the UI looks ready.
- OPS-003: the sample-data generator logs a failure, then announces completion
  and exits 0, which `manage-dev-data.ps1` trusts.
- **Findings**: 13. OPS-001/002 are source-only; the reviewers could not run
  PowerShell. **Catch**: do it with T065's start/stop round trip.
- **Source**: code review, 2026-10-04

### T101 — Large campaigns: the rest of the roster work
**Type** debt · **Size** S · **Status** open · **Verified** 2026-10-04

The NPC roster now mounts 100 rows at a time behind *Show more*
(`shared/utils/roster-paging.ts`). Two things pass 5 (18) pointed at are left:

- The quest and rumour rosters still mount every row. Their groups are by
  status and can be collapsed, and a collapsed group still mounts its rows
  (`hidden`), so paging them has to decide what a folded group counts as.
- `NPCDirectory` resolves each NPC's location with `resolveLocationName`,
  which searches the location array linearly per row (`location-display.ts`).
  An id/name index would serve every row; pass 5 could not say how much of the
  1,200-row redraw this is.
- **Source**: code review, 2026-10-04

### T105 — Deploy the Firestore and Storage rules from the repo, not by pasting into the console
**Type** debt · **Size** M · **Status** open · **Verified** 2026-10-04

Production rules are pasted into the Firebase console by hand from
`firestore.rules.prod` / `storage.rules.prod`, so the repo and production can
drift with nothing to notice it.

- **Where**: `firebase/firebase.json` deliberately has no rules keys (`:9`,
  `:12` explain why: the keys used to point at the permissive emulator
  rulesets). The Storage key lives only in `firebase.emulators.json:13`. Both
  `.prod` headers say "paste into the console". `CLAUDE.md:154,166` say rules
  are console-only and never deployed by CI.
- **Catch**: the live Firestore rules were read back on 2026-10-04 and matched
  `firestore.rules.prod`; the Storage rules have not been compared. The first
  deploy overwrites whatever is live, so read the console back and diff it
  first. Deciding by hand (`firebase deploy --only firestore:rules,storage`)
  or from CI decides whether the deploy service account needs rules permissions.
- **Also stale**: `firestore.rules.prod:9-11` still says `firebase.json` points
  its `firestore.rules` key at `firestore.rules`; it has no such key.
- **Source**: todo.txt, 2026-10-04

### T107 — CI builds the site inside a Docker image only to copy the files out
**Type** debt · **Size** S · **Status** open · **Verified** 2026-10-04

Docker is not needed for development (none exists), but it is not unused:
both Hosting workflows build the shipped site with it
(`firebase-hosting-merge.yml:81`, `firebase-hosting-pull-request.yml:38`).
They then `docker cp` the files out, so the Dockerfile's nginx stage and
`docker/config/nginx.conf` serve nothing. `test.yml` already builds without
Docker, and the build could be produced the same way.

- **Catch**: the shipped build is not the one CI checked. `Dockerfile.frontend.prod:8`
  runs `npm install --legacy-peer-deps`, which ignores the lockfile, while
  `test.yml` builds from `npm ci`. A direct build must keep `CI: false` (see
  `test.yml`'s Build step) and the `.env` the workflow writes from secrets.
- **Touches**: both Hosting workflows, `docker/`, `.dockerignore`, `CLAUDE.md:27-29`,
  T059's `Where` line. Local leftovers `docker/emulators/{data,logs}` are
  untracked and can simply be deleted.
- **More Docker instead?** The note also asked this. Development already moved
  off Docker on purpose (`CLAUDE.md`: "No Docker"); the remaining use adds a
  layer and buys nothing that `actions/setup-node` doesn't.
- **Source**: todo.txt, 2026-10-04

---

## Decisions

Open questions that block work until the maintainer answers them.

### T103 — Browser checks are not reproducible
**Type** decision · **Size** L · **Status** needs scoping · **Verified** 2026-10-04

Claude-in-Chrome checks catch what jsdom cannot (see "What phase 15 learned"),
but each one is a one-off: nothing replays it, so a defect it found can come
back unnoticed.

- **Measured**: the repo has no browser test runner (`package.json` has no
  Playwright, Cypress or Puppeteer). The code review's passes 4–5 did build
  one outside the repo: Playwright Core driving the production build against
  the emulators with seeded fixtures (`docs/reviews/2026-10-04/pass-4/evidence/probes/runtime/`,
  `run.cjs` and `helpers.cjs`), written for Linux paths.
- **Starting point**: CI's `functions` job already starts the emulators (Java
  included), which an end-to-end job would also need.
- **To decide**: which journeys become replayable tests, whether every defect
  found in the browser must land with one, and what stays exploratory in
  Claude-in-Chrome. Size depends on the answer.
- **Source**: todo.txt, 2026-10-04

### T104 — Update the Firebase email templates
**Type** feature · **Size** S · **Status** needs scoping · **Verified** 2026-10-04

The only mail Firebase sends for the app is the sign-in link
(`sendSignInLinkToEmail`, `src/core/services/firebase/auth/AuthService.ts:230`).
Its template lives in the Firebase console (Authentication → Templates), not
in the repo, so this is console work plus whatever copy is decided.

- **To decide**: what should change (wording, sender name, branding). The site
  is being renamed (T075), so do this after the name is chosen. A custom
  sending domain is T057's blocker, not this item's.
- **Unverified**: how much of the email-link template the console lets you
  edit.
- **Source**: todo.txt, 2026-10-04

### T106 — Should the production rules be public on GitHub?
**Type** decision · **Size** S · **Status** open · **Verified** 2026-10-04

- **Measured**: the repository is **public** (`gh repo view`).
  `firestore.rules.prod` and `storage.rules.prod` hold no identities or secrets:
  global admin is a profile flag (`firestore.rules.prod:155-158`), not a
  hard-coded uid or email.
- **What it changes**: the Firebase web config is public by design, and the
  rules are what protect the data. Hiding them protects nothing that correct
  rules don't. But public rules make any open hole easy to find.
- **To decide**: keep them public, or make the repo private (moving them
  elsewhere would break T105's deploy-from-repo). Either way, the exposure
  is a hole in the rules, not their visibility.
- **Source**: todo.txt, 2026-10-04

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
