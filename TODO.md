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
| medium | T119 | Review the Firestore data model before scaling | L | blocked | Must come before any user scaling (maintainer, 2026-10-07); two documents are written (`docs/architecture/backend-structure-options.md`, `data-model-review.md`); recommends a Convex spike; waits on the maintainer's go-ahead |
| medium | T120 | Plan how a new group starts on its own | L | blocked | A group can't start without the maintainer; the plan is written (`docs/architecture/new-group-onboarding-plan.md`) and waits on five decisions; building is later entries |
| medium | T124 | NPC list says "Recorded by: Unknown" | S | open | Players see the wrong credit for their own writing; the NPC page and the list disagree |
| low | T123 | Lord of the Rings screenshots in the README? | M | open | A question for the maintainer; the public home page's *Sunless Citadel* example raises the same question |
| low | T121 | The site has no favicon | S | open | Polish; a placeholder can ship before the logo (T075) |
| low | T122 | An "about" page | S | needs scoping | Waits on what it should say; may help T118's branding check |
| low | T075 | A logo for the header; header crowded | M | needs scoping | Waits on the maintainer: whether a logo carries the name, and which truncation was meant |
| low | T054 | Sign in with Discord | L | needs scoping | Kept for later, not now (2026-10-02); Firebase has no built-in provider |
| low | T057 | Sign in with a code from the email | M | blocked | On hold by the maintainer; its sending domain exists now (`muninn.quest`); the current phone-approval flow works |
| low | T055 | Opt-in second factor | M | needs scoping | Kept for later, not now (2026-10-02); prefer an authenticator app over SMS |
| low | T118 | Finish the move to `muninn.quest` | S | open | Everything runs on `muninn.quest`; left: Google's branding check, and two cosmetic leftovers |
| low | T116 | `firebase-admin` 13 → 14 in the functions | M | blocked | 14 would not clear the last advisory (`uuid`, via Storage), and the functions' jest cannot load its ES-module dependencies |
| low | T079 | Drop the legacy `location` fallback's matching | S | open | Production's 13 old documents were migrated (2026-10-08) and none is left; the fallback's matching of `location` against places can go |
| low | T111 | Is it worth expanding the notes feature? | L | needs scoping | Kept for later, not now (2026-10-06) |

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

**The tracker can describe an intention as if it were the code.** The entry for
the rumour bar's hatch said confirmed and disproved rumours "sit on the same ramp stop — correct", and the
code had them two stops apart, with the disproved rumour in the red a failed
quest wears. The comment above the map said the right thing too. Three
documents agreed with each other and none of them agreed with the product.

---

## Bugs

Bugs the behavioural suites find live in `docs/testing/bug-tracking/README.md`.

### T124 — The NPC list says "Recorded by: Unknown" for NPCs whose page names the author
**Type** bug · **Size** S · **Status** open · **Verified** 2026-10-08

The NPC list's expanded row and the NPC's own page credit the author two
different ways, so the same record can be "Unknown" in one and named in the other.

- **Where**: the row reads `npc.createdByUsername` alone
  (`npcs/components/NPCDirectory.tsx:432`) and shows "Unknown" without it. The
  page's `AttributionInfo` (`shared/components/AttributionInfo.tsx:74`) goes
  through `determineAttributionActor`: character name, then username, then a
  lookup of the `createdBy` uid. So even with the field present, the row shows the
  username where the page shows the character.
- **Unverified**: why so many NPCs lack `createdByUsername`. Every write today
  stamps it (`DocumentService.ts:153` via `core/attribution/attribution.ts:39`;
  no function writes NPCs) and every seeded NPC carries it, so it points at old
  documents, or a profile with no `username` (`getUserName` returns `''`). The dev
  emulator was empty on 2026-10-08; only production data can say which.
- **Touches**: `RumorRowEditor.tsx:502` has the same username-only shape (it
  hides the line instead of saying Unknown).
- **Related**: T119's data-model review, F5: attribution names are copied at
  write time and never refreshed; resolving from the uid on read is its open question.
- **Source**: todo.txt, 2026-10-08

---

## Features and enhancements

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

**On hold by the maintainer (2026-09-24).** Its blocker was a sending domain;
`muninn.quest` is one since 2026-10-07 (T118). Reverse today's cross-device
flow: the email carries a 6-digit code, and the reader types it on the device
that wants to be signed in. The phone then only reads the email and never signs in or runs site code.
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
  100/day), which needs a domain you own. `muninn.quest` already carries
  Firebase's mail records (SPF `v=spf1 include:_spf.firebasemail.com ~all` and
  two DKIM CNAMEs) and a DMARC record may follow; a domain has only one SPF
  record, so either Resend's include joins that one or Resend sends from its
  own subdomain. Firebase's sign-in mail cannot be reworded: the console's
  Templates list has no sign-in template (2026-10-07), so its own text comes
  with this item. Setup: a sending subdomain with SPF/DKIM/DMARC, region
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

### T075 — A logo for the header, and uncrowd it
**Type** feature · **Size** M · **Status** needs scoping · **Verified** 2026-10-07

The site is called **Muninn** (maintainer, 2026-10-07) and mentions D&D nowhere
(decided 2026-10-03: "Dungeons & Dragons" and "D&D" are Wizards of the Coast
trademarks, and the Fan Content Policy grants none). What is left is the
crowded header the maintainer reported (busy, some text cut off), and whether
a logo carries the name.

- **Where**: `src/app/layout/Header.tsx` — one row carries the name, the
  context switcher, the inline nav (from `lg`), search and the account menu.
  The name is one word at every width. The campaign/group name in the context
  switcher truncates by design at `max-w-[9rem] md:max-w-[14rem]`
  (`ContextTrigger.tsx:51`). Which truncation the maintainer meant was **not**
  confirmed — that needs the running app.
- **To decide** (maintainer): whether a logo carries the name, and how much
  room the header gets back.
- **The name was checked** (maintainer, TMview, 2026-10-07): Muninn ApS, a
  Danish company, holds MUNINN in Denmark (`VA 2017 00834`, classes 9, 37, 42,
  45; `VA 2022 01645`, 9, 37, 42) and the EU (`018770043`, 9, 37, 42) for
  security, video and similar software. Judged no overlap with a tabletop tool.
  Their marks do name software (class 9), so look again before the site charges
  money: EU trademark rights apply to use in the course of trade. A US
  application for MUNIN (serial `99778474`, filed 2026-04-21, software and
  cloud services) was **not** read.
- **Says D&D on purpose**: `entityExtraction.ts:454,499`, only in the prompt
  sent to OpenAI, which nobody sees. The "Dungeons" location filter
  (`LocationDirectory.tsx:54`) is the plain word, not the mark.
- **Raised again** (todo.txt, 2026-10-08: "Create Logo for Muninn"). The
  favicon (T121) needs the same mark, so the logo decision unblocks both.
- **Source**: todo.txt, 2026-10-02; the trademark question was looked into and
  decided 2026-10-03; the name chosen 2026-10-07

### T111 — Is it worth expanding the notes feature?
**Type** feature · **Size** L · **Status** needs scoping · **Verified** 2026-10-06

The maintainer asks whether notes should grow: several areas per person, quicker
ways to add things, and maybe drawing for rough drafts. Flagged as **not
important**.

**Kept for later, not now** (maintainer, 2026-10-06). Do not scope it until asked.

- **Measured**: a note today is a title, one plain-text body
  (`NoteEditor.tsx:629`, a growing textarea), tags and an active/archived
  status. It is private to its author (`groups/{g}/users/{u}/notes`), and its
  links to campaign records come from AI extraction (`CampaignLinksPanel`). Quick
  add (`shared/components/quick-add/quickAddEntity.ts:24`) creates NPCs,
  quests and locations, not notes. There is no drawing anywhere in the app.
- **Questions before sizing**: what "areas" means (notebooks, sections in one
  note, per-session pages?); whether quick add should create a note or add a line
  to an existing one; whether a drawing is stored as an image (Storage, which
  has its own quota and orphan sweep) or as vector data in Firestore.
- **Related**: `docs/architecture/migration/deep-dive-feature-enhancements.md`
  sketches session templates and collaborative editing for notes (ideas only,
  nothing built).
- **Source**: todo.txt, 2026-10-06

### T120 — Plan how a new group starts on its own
**Type** feature · **Size** L · **Status** blocked · **Verified** 2026-10-07

Suppose the site were sent tomorrow to 30 groups that have never used it: can
they sign up, create a group and get going without the maintainer? **No.** The
plan is written:
[`docs/architecture/new-group-onboarding-plan.md`](docs/architecture/new-group-onboarding-plan.md).
It covers where things stand (in the code, and in the dev app as a player in no
group), six decisions with a recommendation each, and a build order of seven
steps. Nothing is built. Invitations into a group that already exists are out of
scope; they work.

- **Blocked on the maintainer**: answer the plan's five open questions. Who may
  start a group (founder invitations recommended), the member and project caps,
  the monthly AI ceiling, who may create a campaign, and how many groups a
  founder may start. D6 is answered: the global admin is the maintainer alone.
- **Then**: file the build order's steps as their own entries. Steps 1 to 3
  (founder invitations, a guarded `createGroup`, the first run) are the smallest
  change that lets a table start alone.
- **Related**: T119 (the data model review; its F2 is a step here).
- **Source**: `/todo`, 2026-10-07; the plan written 2026-10-07

### T121 — The site has no favicon
**Type** feature · **Size** S · **Status** open · **Verified** 2026-10-08

Browser tabs, bookmarks and a phone's home screen show a generic icon for Muninn.

- **Measured**: `index.html` links no icon, and `public/` holds only
  `manifest.json`, which lists no `icons`. `https://muninn.quest/favicon.ico`
  answers `200 text/html`: the `**` → `/index.html` rewrite in
  `firebase/firebase.json` serves the app's page as the icon.
- **Touches**: `index.html` (an SVG icon, an `apple-touch-icon`), the
  manifest's `icons` (192 and 512 px), and maybe `theme-color` (`#000000` in both).
- **Catch**: it needs a mark, and the logo is undecided (T075). A plain "M" in
  the theme's colours could ship first and be swapped later.
- **Source**: todo.txt, 2026-10-08

### T122 — An "about" page
**Type** feature · **Size** S · **Status** needs scoping · **Verified** 2026-10-08

The maintainer asks whether the site should have an "about us" page.

- **Measured**: no `/about` route (`app/App.tsx:220` has `/privacy` and
  `/contact`; the footer, `app/layout/Footer.tsx`, links only those two). The
  purpose is stated only on the signed-out home (`pages/home/SignedOutHome.tsx:44`).
- **Questions before sizing**: who "us" is (one maintainer, a free site with no
  income); what goes on it (why it exists, who runs it, how AI extraction uses
  notes, the fan-content and trademark position from T075); whether it must be
  readable without JavaScript.
- **Related**: T118's Google branding check flagged "does not explain the
  purpose" and "insufficient content", from a checker that runs no JavaScript.
- **Source**: todo.txt, 2026-10-08

---

## Tech debt and platform

### T116 — `firebase-admin` 13 → 14 in the functions
**Type** debt · **Size** M · **Status** blocked · **Verified** 2026-10-06

The functions run `firebase-functions` 7 on `firebase-admin` 13, through the
modular API only, so the code itself is ready for 14. Two things hold the bump.

- **It clears nothing yet.** The one advisory left, `uuid` below 11.1.1
  (bounds check in v3/v5/v6 with a buffer; nothing here calls those), stays on
  14: it arrives through `@google-cloud/storage` 8.2.0 → `gaxios` 6.7.1, which
  pins `uuid` ^9, and 8.2.0 was the latest on 2026-10-06. Wait for a Storage
  release on `gaxios` 7.
- **The functions' jest cannot load 14's dependencies** (tried 2026-10-06; Node
  22 itself loads them fine). `jwks-rsa` 4 `require()`s `jose` 6, which is ES
  modules only: every suite that imports Auth fails to run, and transpiling
  `jose` through ts-jest fixes that. But `teeny-request` (under Storage) loads
  `node-fetch` 3 with a dynamic `import()`, which jest allows only under
  `--experimental-vm-modules` -- and with that flag jest treats `jose` as ESM
  again, so the 91 tests that touch Storage fail one way or the other. The way
  through is a jest that loads real ES modules, or transpiling that whole chain.
- **Source**: todo.txt (`npm ci` warnings), 2026-10-06; `firebase-functions` 7,
  `firebase-admin` 13 and the modular API landed first

### T079 — Drop the legacy `location` fallback's matching
**Type** debt · **Size** S · **Status** open · **Verified** 2026-10-08

NPCs and quests (and rumors) refer to a location by `locationId`. Documents
written before that field existed carried only the free-text `location`, and
`resolveLocation` and `referencesLocation`
(`locations/utils/location-display.ts`) still match that text against the
campaign's places, by id and then by name, when `locationId` is missing or
dangling.

- **Production needs it no more** (2026-10-08): the audit found 13 documents
  (10 NPCs, 3 quests, in two campaigns) resolving only that way, all by name;
  `firebase/functions/scripts/audit-location-ids.js --migrate` gave each the
  `locationId` it already showed, and the audit afterwards found none left
  and none dangling.
- **To do**: drop that matching from both functions. Keep showing a
  free-text `location` as written: 11 production documents (10 NPCs, 1 quest)
  name a place that has no record, and hiding it would hide what players
  wrote. Every current save path (the detail pages, quick-add) writes
  `locationId` alongside `location`; recheck that first, and run the audit
  once more just before merging.
- **The revert closes when this merges**: the migration's revert file is the
  maintainer's (outside the repo); reverting after the matching is gone would
  leave those 13 showing their text with no link.
- **Dev data**: the sample-data generators have written `locationId` since
  `d6d9847`, and data generated before that holds the legacy shape (one such
  dataset, audited 2026-10-07, had 37 NPCs and 20 quests with only a
  `location` slug), which would show as raw slugs once the matching goes:
  regenerate it. Two NPCs keep the edge cases on purpose: Galadriel's
  `locationId` names no record (#1412), and Bard has only the free-text
  `location` "Lake-town".
- **See also**: T119, the full review of the data model, should take in
  whatever this audit finds.
- **Source**: the post-test-coverage roadmap (2026-08-28), carried over when it
  was deleted; decided 2026-10-06; the audit written 2026-10-07; the
  migration written and run 2026-10-08

### T118 — Finish the move to `muninn.quest`
**Type** debt · **Size** S · **Status** open · **Verified** 2026-10-07

The site lives on `muninn.quest` (Hosting site `muninn-quest`). The project's
default site, `dnd-campaign-companion` (`web.app`, `firebaseapp.com`), answers
every address with a 301 to the same path there; `firebase/firebase.json`
records how that was checked. Sign-in runs on `muninn.quest`
(`REACT_APP_AUTH_DOMAIN`), Firebase's mail comes from `noreply@muninn.quest`
as "Muninn", and the GitHub repo is `Haugenau20/Muninn`. The local checkout's
folder keeps its old name on purpose: Claude's memory for the project is filed
under the folder's path. **Decided (maintainer, 2026-10-06): keep the Firebase project**;
its id stays in `CLAUDE.md`, the scripts and the workflows. A new project would
have meant moving Firestore, Storage and Auth and setting up again everything
outside the repo, to hide the id only in developer tools; reconsider only if
something fixed at creation, such as the Firestore location, is wanted changed
anyway. What is left:

- **Google's branding check** (maintainer): Google's sign-in window shows the
  name "Muninn" only once Google verifies the consent screen's branding. Search
  Console verified `muninn.quest` on 2026-10-07; retry no earlier than 24 hours
  later. A first check, run while `muninn.quest` served nothing, listed nine
  issues. Besides the unreachable pages, several fit a checker that does not run
  JavaScript, since every path serves the same `index.html`: the privacy page
  "the same as the home page", "insufficient content", "home page behind a
  login", "does not explain the purpose". If they recur with the site live,
  serve real HTML for `/` and `/privacy`. The consent screen's support address,
  `dndcampaigncompanion@gmail.com`, is shown to users once verified.
- **Cosmetic**: the email templates' action URL is still
  `https://dnd-campaign-companion.firebaseapp.com/__/auth/action`
  (Authentication → Templates). It keeps working, because the reserved
  `/__/auth/` paths are not redirected. Moving it to
  `https://muninn.quest/__/auth/action` is untested: try it on a preview channel
  first. Google Cloud also holds two OAuth web clients, one left over from
  switching the Google provider off and on; the one Firebase does not name
  (Authentication → Sign-in method → Google) can go, with a Google sign-in
  tried straight after.
- **Source**: todo.txt, 2026-10-06; the site, sign-in, mail, redirect and repo
  moved 2026-10-07

### T119 — Review the Firestore data model before the site scales
**Type** debt · **Size** L · **Status** blocked · **Verified** 2026-10-07

Two documents, both written 2026-10-07. Nothing has been changed.

- [`docs/architecture/backend-structure-options.md`](docs/architecture/backend-structure-options.md)
  is the structural question: was the backend any good, and would another
  structure be better, whatever the effort? It gives a verdict on today's
  structure, seven routes (three on Firestore, SQL Connect, Supabase, Convex,
  Cloudflare), a decision matrix with fixed and usage cost scored separately,
  and a recommendation: **spike Convex first** (no fixed fee, live updates and
  transactions built in), Cloudflare D1 second ($5/month, real SQL integrity),
  and restructure Firestore as the fallback. Supabase is the best end state,
  but at $25/month it does not fit a site with no income.
- [`docs/architecture/data-model-review.md`](docs/architecture/data-model-review.md)
  is how the code uses the data today: nine findings and their fixes within
  Firestore. A move to Postgres makes most of them moot.

- **Blocked on the maintainer**: agree the spike order, then answer the
  review's three remaining questions. The production checks in the review (indexes, campaign sizes, how
  often links disagree) inform the migration but do not block the choice.
- **Then**: the spike, as its own entry; then the migration or the Firestore
  restructure, as entries of their own.
- **Overlaps**: T079 (the legacy free-text `location`) is the review's F9; a
  move to Postgres would settle it in the copy script. The `dateAdded` →
  `createdAt` renames in `docs/architecture/migration/database-field-alignment.md`
  are subsumed by either a migration or the review's F6.
- **Source**: `/todo`, 2026-10-07; both documents written 2026-10-07

---

## Decisions

Open questions that block work until the maintainer answers them.

### T123 — Are Lord of the Rings screenshots in the README a problem?
**Type** decision · **Size** M · **Status** open · **Verified** 2026-10-08

The README's pictures show a Tolkien campaign. Is that a rights or trademark
risk for a public repo and site? A question for the maintainer, not settled here.

- **Measured**: all four images in `README.md` (`:12`, `:30`, files in
  `docs/images/`) show the sample campaign "The Lord of the Rings" with its names
  (Gandalf, Aragorn, Mordor, "destroy the One Ring"). They come from the dev
  sample data, which is Tolkien throughout (`utils/__dev__/generators/`). The home
  screenshot's banner painting and crest were uploaded images; where they came
  from was **not** traced.
- **Same question, on the live site**: the public signed-out home shows Wizards
  of the Coast's published adventure *The Sunless Citadel*, with its NPC and places
  (`pages/home/signed-out-example.ts:46`). T075's 2026-10-03 decision covered
  only the words "D&D".
- **If the answer is yes**: invented sample data, new screenshots, and a new
  example on the home page. That is the M.
- **Source**: todo.txt, 2026-10-08

---

## Dormant — only live if `theme-contract` happens

`theme-contract` (a theme system to share across projects) is **deferred
indefinitely** (the rollout plan's Phase 13, and the drift log's `D`/`Q` entries cited
below, are in git history at `9810644` under `docs/design/plan/`). These four were
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
