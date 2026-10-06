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
| medium | T103 | Replay browser checks: Playwright in CI | L | open | Decided 2026-10-06: a few journeys first, and a defect found in the browser lands with a test |
| low | T075 | Rename the site; header crowded | M | blocked | The name is parked until the maintainer has one (2026-10-06) |
| low | T054 | Sign in with Discord | L | needs scoping | Kept for later, not now (2026-10-02); Firebase has no built-in provider |
| low | T057 | Sign in with a code from the email | M | blocked | On hold: needs a sending domain; the current phone-approval flow works |
| low | T055 | Opt-in second factor | M | needs scoping | Kept for later, not now (2026-10-02); prefer an authenticator app over SMS |
| low | T063 | Entity pages look like three products | L | open | Decided: the NPC page's light card for locations and quests, a location's picture full-width above it (2026-10-06) |
| low | T117 | Pin Node and Java with mise | S | open | Decided 2026-10-06: the maintainer runs Node 23.7 against CI's 22; one `mise.toml` sets every machine and CI |
| low | T116 | `firebase-admin` 13 → 14 in the functions | M | blocked | 14 would not clear the last advisory (`uuid`, via Storage), and the functions' jest cannot load its ES-module dependencies |
| low | T079 | Do old documents still lack `locationId`? | S | open | Decided 2026-10-06: a read-only audit script first, run by the maintainer against production |
| low | T074 | Default pictures for the banner and the crest | M | open | Decided 2026-10-06: those two only, shown when nothing is uploaded, never stored |
| low | T104 | Update the Firebase email templates | S | needs scoping | Waits on the new name (T075) |
| low | T111 | Is it worth expanding the notes feature? | L | needs scoping | Kept for later, not now (2026-10-06) |
| nit | T113 | Clean up `docs/` and delete what is stale | M | open | Decided 2026-10-06 what stale means: uncited by filename and by phase id, plus evidence for closed findings |

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

- Every confirmed finding has been fixed; none is open here.
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

None open here.

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
**Type** feature · **Size** L · **Status** open · **Verified** 2026-10-06

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
- **Decided (maintainer, 2026-10-06): the wide picture sits full-width above
  the card**, on the page above both columns, light and with no text on it; the
  identity card and the sidebar start below it. A location with no picture
  starts with the card.
- **Catch**: this reverses Phase 15's band header on two pages. Tests that pin
  the band (`entity-page.test.tsx`, the location and quest page suites) change
  because the requirement changed — say so in the PR, test by test. D125 ("the
  band carries no accent") stays true but stops mattering on these pages; a
  light card can carry accent controls. Verify in a browser, both themes, at
  phone width.
- **The table notes differ too.** Both pages render `NoteHistory`, but the
  location's (`LocationDetailPage.tsx`) sits in an `EntityPageSection` titled
  "Notes from the table", with no "oldest first", no saved confirmation
  (`onSaved` is a no-op) and the default row spacing. The NPC's
  (`NPCDetailPage.tsx`) is its own card titled "Notes", with a saved notice and
  padded rows. Quests have no table notes.
- **Source**: todo.txt, 2026-09-24; direction decided 2026-10-02; the notes
  difference measured 2026-10-04; the picture's place decided 2026-10-06

### T074 — Default pictures for the dashboard banner and the party crest
**Type** feature · **Size** M · **Status** open · **Verified** 2026-10-06

The maintainer would like default imagery where nothing has been uploaded.

**Decided (maintainer, 2026-10-06): only the dashboard banner and the party
crest get a default.** It is **shown when nothing is uploaded and never stored**
on the record, picked from a few bundled images by the campaign's or group's id,
so a campaign keeps the same picture on every visit and nothing needs a
backfill. NPCs and locations keep their sigils, which T063's cards are designed
around.

- **Where**: the banner `CampaignBanner.tsx` (no picture → plain band plus the
  campaign's sigil) and the crest `PartyCrest.tsx` (no crest → a hatched panel).
  Images today are uploads to Storage only; the repo ships no image assets.
- **Catch**: both empty states are **deliberate design**, written down where
  they live: "the empty state is the design rather than a placeholder"
  (`PartyCrest.tsx:21-24`, `CampaignBanner.tsx:28-31`), and `colour-schema.md`
  D45 ("a band with no picture is the plain band"). Rewrite those in the same
  PR, and say test by test which tests changed because the requirement did.
- **The art**: public-domain (CC0) images only, so no attribution is owed;
  record each one's source beside it. Load them with the component, not in the
  entry bundle (`check:bundle`), and keep each small (webp, tens of kB).
- **Source**: todo.txt, 2026-10-02 (two inbox lines, merged); decided 2026-10-06

### T075 — Rename the site, and uncrowd the header
**Type** feature · **Size** M · **Status** blocked · **Verified** 2026-10-06

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
- **Name to replace** (measured 2026-10-03): the title link in `Header.tsx` (its
  `aria-label` and three breakpoint labels, the shortest just "D&D"), `Footer.tsx:38`
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
- **Where**: `src/app/layout/Header.tsx` — one row carries the name, the
  context switcher, the inline nav (from `lg`), search and the account menu. The
  full name shows from the `title` breakpoint (1200px, `tailwind.config`) up, "D&D
  Companion" from `sm`, "D&D" below it. The campaign/group name in the context switcher
  truncates by design at `max-w-[9rem] md:max-w-[14rem]`
  (`ContextTrigger.tsx:51`). Which truncation the maintainer means was **not**
  confirmed — that needs the running app.
- **Decided (maintainer, 2026-10-06): the name is parked** until the maintainer
  has one; it then decides whether a logo carries it and how much room the
  header gets back, and the "which truncation" question is settled then.
- **Source**: todo.txt, 2026-10-02; the trademark question was looked into and
  decided 2026-10-03

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

---

## Tech debt and platform

### T117 — Pin Node and Java with mise
**Type** debt · **Size** S · **Status** open · **Verified** 2026-10-06

CI and the deployed functions run Node 22 (`node-version: 22` in every
workflow, `"node": "22"` in `firebase/functions/package.json`); the
maintainer's machine runs Node 23.7, which is end-of-life. Nothing in the repo
says which version to use locally: the root `package.json` has no `engines`,
and there is no version file. It already shows: the Functions emulator runs the
functions on 23 ("requested node 22 doesn't match your global version"), and
ESLint 10 warns that it wants `^22.13 || >=24`. Java 21, for the emulators, is
a second hand install.

**Decided (maintainer, 2026-10-06): mise.** One `mise.toml` in the repo pins
Node and Java; mise installs them per machine and switches by folder, so a
version change is a line in the repo rather than an install on each machine,
and the desktop, a laptop and CI all read the same file.

- **Not Docker, not a dev container**: they would pin the OS as well, but cost
  file speed on Windows (the repo would move into WSL2), a rewritten
  `start-dev.ps1`, and every gate run through the container. The project has no
  system services -- Firebase runs in its own emulators -- so that much
  reproducibility is not needed now (YAGNI). **Not Volta**: unmaintained; its
  README recommends mise.
- **Plan**: `mise.toml` with `node = "22"` and `java = "21"`. The maintainer
  installs mise (`winget install jdx.mise`, with its shims on PATH so
  PowerShell, Git Bash and VS Code all see the pinned versions) and runs
  `mise install`; then the dev server, the emulators and the gates are run on
  that machine. Only after that, CI: `jdx/mise-action` in place of
  `actions/setup-node`. CLAUDE.md's setup notes (Java 21) point at `mise install`.
- **Catch**: mise's Windows support is newer than on macOS and Linux, which is
  why the machine comes before CI. The Firebase CLI stays in
  `firebase/package.json`'s pin, not in mise. The gitignored `.env` files
  and `firebase/emulator-data/` still move to a new machine by hand.
- **Source**: maintainer, 2026-10-06

### T103 — Replay browser checks: Playwright in CI
**Type** debt · **Size** L · **Status** open · **Verified** 2026-10-06

Claude-in-Chrome checks catch what jsdom cannot (see "What phase 15 learned"),
but each one is a one-off: nothing replays it, so a defect it found can come
back unnoticed.

**Decided (maintainer, 2026-10-06): Playwright in CI**, driving the production
build against the emulators with seeded data, starting with a handful of
journeys: signing in, moving between pages, creating and editing an entity, the
location tree, and a quest's place that links to its location. From then on **a
defect found in the browser lands with a test** that replays it.
Claude-in-Chrome stays for exploring.

- **Measured**: the repo has no browser test runner (`package.json` has no
  Playwright, Cypress or Puppeteer). The code review's passes 4–5 did build
  one outside the repo: Playwright Core driving the production build against
  the emulators with seeded fixtures (`docs/reviews/2026-10-04/pass-4/evidence/probes/runtime/`,
  `run.cjs` and `helpers.cjs`), written for Linux paths.
- **Starting point**: CI's `functions` job already starts the emulators (Java
  included), which an end-to-end job would also need.
- **Catch**: size L, so its own plan first: seeding (`manage-dev-data.ps1`'s
  generators), signing in without an inbox (the Auth emulator's `oobCodes`
  endpoint, as CLAUDE.md describes), and a new job in `test.yml` -- which gates
  nothing until the maintainer adds it to the ruleset on `main`.
- **Source**: todo.txt, 2026-10-04; decided 2026-10-06

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

### T079 — Do old documents still lack `locationId`?
**Type** debt · **Size** S · **Status** open · **Verified** 2026-10-06

NPCs and quests refer to a location by `locationId`. Documents written
before that field existed carry only the free-text `location`, and still
resolve through a legacy fallback (`resolveLocationName` and
`referencesLocation` in `locations/utils/location-display.ts`). The field
shipped without a migration (`d6d9847`): such a document gains an id the next
time anyone edits it.

**Decided (maintainer, 2026-10-06): a read-only audit first.**

- **Plan**: a script modelled on `src/utils/__dev__/normalizeChapterDateModified.ts`
  (audit / migrate / revert), with relative imports (`ts-node` honours no
  paths; see CLAUDE.md). The maintainer runs its audit mode against
  **production** with their own credentials. It only counts and lists the NPCs
  and quests that have a `location` but no `locationId`, and which of those
  resolve to a record. The emulator cannot answer this: its imported data can
  be arbitrarily old.
- **Then**: none left, and the fallback can go; some left, and either migrate
  them (the script's migrate mode, which has a revert) or keep the fallback on
  purpose.
- **Source**: the post-test-coverage roadmap (2026-08-28), carried over when it
  was deleted; decided 2026-10-06

---

## Documentation

### T113 — Clean up `docs/` and delete what is stale
**Type** docs · **Size** M · **Status** open · **Verified** 2026-10-06

`docs/README.md` already sets the rule: "a document nothing cites any more is
deleted rather than archived". Nobody has applied it across the folder.

- **Measured**: 475 files, 11 MB. `docs/reviews/` is 288 of them and 6.1 MB,
  most of it evidence (246 files; pass 5's alone is 3.3 MB), which the review
  reports cite and TODO.md's code-review entries point into. Of the 218 Markdown files outside evidence folders, 38 are
  cited by **filename** nowhere: 36 design handoffs (`design/plan/handoff/06-*`
  to `14-*`, four under `15-entity-authoring/handoff/`) and two superpowers
  plans. But the handoffs are cited by **phase id** from code comments
  (`15-6` in 15 files, `12-3a` in 10), so a filename scan undercounts.
- **Decided (maintainer, 2026-10-06), what stale means**: a document goes when
  nothing cites it by filename **or** by its phase id (`15-6`, `12-3a`, as code
  comments do), and review evidence goes once every finding it backs is closed.
  Anything still cited stays. The PR lists every deletion and why.
- **Source**: todo.txt, 2026-10-06; stale defined 2026-10-06

---

## Decisions

Open questions that block work until the maintainer answers them.

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
