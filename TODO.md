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

The rows for T083–T101 were triaged 2026-10-04 from the code
review's severities (see [The 2026-10 code review](#the-2026-10-code-review)),
adjusted for the images focus above.

| Priority | ID | Item | Size | Status | Why this priority |
|---|---|---|---|---|---|
| medium | T075 | Rename the site; header crowded | M | needs scoping | The name carries WotC's trademark, and the decision (2026-10-03) is to drop it; the new name is the maintainer's to pick |
| medium | T026 | Reader's chapter drawer won't touch-scroll | S | needs investigation | Reported on a phone; desktop Chrome cannot reproduce it, so it needs the phone first |
| medium | T103 | Browser checks are not reproducible | L | needs scoping | Browser-found defects can return unnoticed; phase 15 showed jsdom misses them |
| low | T083 | Two people saving the same text field: last one wins | S | open | A decision, not a defect: no edit reverts another field or list any more |
| low | T054 | Sign in with Discord | L | needs scoping | Kept for later, not now (2026-10-02); Firebase has no built-in provider |
| low | T057 | Sign in with a code from the email | M | blocked | On hold: needs a sending domain; the current phone-approval flow works |
| low | T055 | Opt-in second factor | M | needs scoping | Kept for later, not now (2026-10-02); prefer an authenticator app over SMS |
| low | T063 | Entity pages look like three products | L | open | Decided 2026-10-02: locations and quests adopt the NPC page's light card; location picture stays wide |
| low | T065 | Global Firebase CLI past the repo's pin | S | open | The maintainer's CLI is 15.32.1, CI's 15.22.4; harmless without a proxy |
| low | T116 | `firebase-admin` 12 → 14 in the functions | M | open | Last server-side advisories (`node-forge`, `uuid`); neither path is one the functions use |
| low | T079 | Do old documents still lack `locationId`? | S | needs investigation | The legacy free-text fallback stays until production says no document needs it |
| low | T074 | Default pictures where none uploaded | M | needs scoping | Reverses deliberate empty-state design (D45); pairs with T063 |
| low | T104 | Update the Firebase email templates | S | needs scoping | Waits on the new name (T075) |
| low | T110 | A PR's preview site cannot be signed in to | S | needs investigation | Only PR review is affected, and previews touch production data, so whether to allow it comes first |
| low | T111 | Is it worth expanding the notes feature? | L | needs scoping | The maintainer flagged it as not important |
| nit | T113 | Clean up `docs/` and delete what is stale | M | needs scoping | Bookkeeping; needs a definition of stale first |

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

- Every confirmed finding not yet fixed is covered by an entry: T083–T101.
- **Not filed**: the reviews' unverified leads, and the optional refactors.
  They stay in the reports.
- **The auth review was stopped partway and will not be finished**
  (maintainer, 2026-10-04). Its open findings are closed; the rest of that
  scope stays unreviewed by decision.
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

### T110 — A PR's preview site cannot be signed in to
**Type** bug · **Size** S · **Status** needs investigation · **Verified** 2026-10-06

The maintainer reports that sign-in fails on the preview channels PRs deploy
to, and suspects App Check.

- **Where**: previews are built with the production config and reCAPTCHA key
  (`.github/workflows/firebase-hosting-pull-request.yml:35-47`) and get a
  `dnd-campaign-companion--pr…web.app` hostname. App Check
  (`core/services/firebase/config/appCheck.ts`) is enforced on Authentication,
  and a reCAPTCHA v3 key only works on the domains listed on it. Separately, the
  magic link's `continueUrl` is the page's own origin (`SignInForm.tsx:101-104`),
  which Firebase Auth refuses unless it is an authorised domain.
- **Unverified**: both lists live in consoles (reCAPTCHA, Auth → Settings), not
  the repo, and neither was read. First step: open a preview, try a sign-in,
  and read the error code (`auth/firebase-app-check-token-is-invalid` vs
  `auth/unauthorized-continue-uri` / `auth/unauthorized-domain`).
- **Catch**: preview channel hostnames change per PR, so allowing them one at a
  time does not scale, and allowing all of `web.app` admits every Firebase site.
  Previews also run unmerged code against **production** data. Deciding whether
  they should be signed in to at all comes before making it work.
- **Source**: todo.txt, 2026-10-06

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

### T111 — Is it worth expanding the notes feature?
**Type** feature · **Size** L · **Status** needs scoping · **Verified** 2026-10-06

The maintainer asks whether notes should grow: several areas per person, quicker
ways to add things, and maybe drawing for rough drafts. Flagged as **not
important**.

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

### T065 — The maintainer's global Firebase CLI is past the repo's pin
**Type** debt · **Size** S · **Status** open · **Verified** 2026-10-06

The repo pins `firebase-tools` **15.22.4** in `firebase/package.json`, and CI's
`functions` suite runs on it. `start-dev.ps1` runs the **global** CLI, which on
the maintainer's machine is **15.32.1** (2026-10-06): the local emulators no
longer run the version CI tests. firebase-tools 15 needs **Java 21**, 15.22.4
included; under Java 17 the emulators exit at once.

- `npm i -g firebase-tools@15.22.4` to match CI, or decide the global CLI may
  float. Then one `start-dev.ps1` stop/start round trip: `stop` must export
  (its output is shown now) before it ends this project's port listeners, and
  nothing else.
- **Why not latest**: from 15.23.0 the CLI's HTTP client sends every request
  through `HTTPS_PROXY`, `127.0.0.1` included, and ignores `NO_PROXY`. Behind a
  proxy the Storage emulator's `firestore.get()` then reaches the proxy instead
  of the Firestore emulator (403), and the Storage rules suite fails 11 tests.
  Still so on 15.31.0. Bisected 2026-09-28: 15.22.4 good, 15.23.0 bad. No proxy
  (a normal desktop, a GitHub runner) is unaffected, but cloud agent sessions
  set one. Re-run `npm --prefix firebase run test:functions` behind a proxy before bumping.
- **Source**: todo.txt, 2026-09-24; pinned 2026-09-28


### T116 — `firebase-admin` 12 → 14 in the functions
**Type** debt · **Size** M · **Status** open · **Verified** 2026-10-06

After `npm audit fix`, the functions' production dependencies keep two
advisories, both inside `firebase-admin@12.7.0`, and `npm audit` fixes them
only by moving to 14.

- **What**: `node-forge@1.4.0` (RSA PKCS#1 v1.5 signature verification accepts
  extra nested elements) and `uuid` 9/10 (missing bounds check when a buffer is
  passed to v3/v5/v6). The functions call neither directly; the Admin SDK uses
  them for its own credentials and request ids.
- **Where**: `firebase/functions/package.json`. 14 needs Node 22, which the
  functions already declare (`engines.node`), but the installed
  `firebase-functions` 6.3.2 accepts `firebase-admin` only up to 13, so 14 brings
  `firebase-functions` 7 with it. All three are majors: read the changelogs, then rebuild and
  run `npm --prefix firebase run test:functions` and a browser pass over the
  callables (CLAUDE.md: the emulator's wrapped `admin.firestore` hides what jest
  does not).
- **Source**: todo.txt (`npm ci` warnings), 2026-10-06

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

---

## Documentation

### T113 — Clean up `docs/` and delete what is stale
**Type** docs · **Size** M · **Status** needs scoping · **Verified** 2026-10-06

`docs/README.md` already sets the rule: "a document nothing cites any more is
deleted rather than archived". Nobody has applied it across the folder.

- **Measured**: 475 files, 11 MB. `docs/reviews/` is 288 of them and 6.1 MB,
  most of it evidence (246 files; pass 5's alone is 3.3 MB), which the review
  reports cite and TODO.md's code-review entries point into. Of the 218 Markdown files outside evidence folders, 38 are
  cited by **filename** nowhere: 36 design handoffs (`design/plan/handoff/06-*`
  to `14-*`, four under `15-entity-authoring/handoff/`) and two superpowers
  plans. But the handoffs are cited by **phase id** from code comments
  (`15-6` in 15 files, `12-3a` in 10), so a filename scan undercounts.
- **Answer first**: what counts as stale. Uncited by filename and by id?
  Superseded by the code (status banners, per `docs/README.md`)? And does
  review evidence stay once its findings are closed in TODO.md?
- **Source**: todo.txt, 2026-10-06

---

## Decisions

Open questions that block work until the maintainer answers them.

### T083 — Two people saving the same text field: last one wins
**Type** decision · **Size** S · **Status** open · **Verified** 2026-10-04

Edits write only their own fields, and every list (objectives, notes,
relations, tags) is worked out from the record the server holds, in a
transaction. One case is left, on purpose until decided: two people editing
the same text field (a description, a note's text) from the same version --
the second save replaces the first, with no warning.

- **To decide**: is last-write-wins acceptable for a party's shared journal,
  or should a save notice that the field changed since the editor opened
  (compare the value it started from, inside the same transaction, and ask)?
  `RecordChange` and `updateDataAfterReading` are the place it would go.
- **Findings**: DATA-003 (03), the remaining case.
- **Source**: code review, 2026-10-04

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
