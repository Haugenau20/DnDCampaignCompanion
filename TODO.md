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
| medium | T076 | May the site use "D&D"? | M | needs investigation | Public site, no trademark notice anywhere; T075's rename waits on it |
| medium | T032 | Performance remediation programme | L | in progress | 2.5–7.6 s to ready is the biggest felt slowness; plan drafted 2026-10-02, phases 1–2 landed, the rest waits on its review |
| medium | T026 | Mobile layout on story pages | M | needs investigation | List, reader and form; overlapping text, drawer won't touch-scroll |
| medium | T061 | `test` check not required; test files unlinted | M | open | Every suite is gated in CI now, but branch protection must list the check; test-file lint to be ratcheted (decided 2026-10-02) |
| medium | T070 | CI functions deploy needs setting up | S | blocked | The job exists; merging it without its service account and cleanup policy holds back Hosting deploys too |
| medium | T037 | A group cannot be deleted | L | open | Decided 2026-10-02 to build it, plan first: members' data cannot be removed until it exists |
| low | T017 | Batch actions for other entities | L | open | Convenience; must follow T032's write-amplification fix |
| low | T054 | Sign in with Discord | L | needs scoping | Kept for later, not now (2026-10-02); Firebase has no built-in provider |
| low | T057 | Sign in with a code from the email | M | blocked | On hold: needs a sending domain; the current phone-approval flow works |
| low | T055 | Opt-in second factor | M | needs scoping | Kept for later, not now (2026-10-02); prefer an authenticator app over SMS |
| low | T059 | CRA peer deps no longer resolve | L | open | Builds only with --legacy-peer-deps; decided 2026-10-02 to move to Vite, plan first |
| low | T063 | Entity pages look like three products | L | open | Decided 2026-10-02: locations and quests adopt the NPC page's light card; location picture stays wide |
| low | T065 | Global Firebase CLI still 13.x | S | open | Repo pins 15.22.4; the maintainer's machine and `start-dev.ps1` still run 13 |
| low | T067 | Repo carries files nobody reads | M | open | Scoped 2026-10-02: delete uncited docs and dead code; TODO.md becomes "start here" |
| low | T075 | Header crowded, text truncates | M | needs scoping | Name, logo and the <380px overflow; waits on T076 |
| low | T074 | Default pictures where none uploaded | M | needs scoping | Reverses deliberate empty-state design (D45); pairs with T063 |
| nit | T008 | Hatch the rumour bar's false segment | S | open | Decided 2026-10-02; only the stacked bar is ambiguous |

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

Bugs the behavioural suites find live in `docs/testing/bug-tracking/README.md`.

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
- **Source**: todo.txt, 2026-09-24; direction decided 2026-10-02

### T008 — Hatch the "false" segment of the rumour summary bar
**Type** feature · **Size** S · **Status** open · **Verified** 2026-10-02 · `Q20`

Confirmed and disproved rumours share `valence-0`, because both are fully known;
in a row the strike cue (`cue-negated`) tells them apart. In the **stacked
summary bar** above the directory, two adjacent same-hue segments merge into
one band, and the legend swatch for "false" is identical to "confirmed".

**Decided (maintainer, 2026-10-02): hatch the "false" segment and its legend
swatch** — same hue, a diagonal stripe pattern on top. The bar's equivalent of
the rows' strike: hue keeps meaning "fully known", the pattern carries "disproved".

- **Where**: `RUMOR_STATUS_FILL` in
  `features/campaign-entities/rumors/utils/rumor-presentation.ts` gives both
  statuses `bg-valence-0`; the hatch is an addition for `false`, not a new hue.
- **Catch**: no hardcoded colours — build the stripes from the valence token
  (e.g. a `repeating-linear-gradient` over `currentColor`/a theme variable) and
  check both themes. A test should assert the false segment and swatch carry
  the hatch and confirmed's do not. Verify in a browser; jsdom has no CSS.
- **Source**: drift log `Q20`; decided 2026-10-02

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

### T075 — The header is crowded, and text in it truncates
**Type** feature · **Size** M · **Status** needs scoping · **Verified** 2026-10-02

The maintainer finds the header busy, with some text cut off, and suggests
starting with the site name: replace "D&D Campaign Companion" with a logo or
shorter wording.

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
- **Catch**: renaming waits on T076 — if "D&D" has to go, the name changes
  anyway, and that also decides whether a logo carries it.
- **Source**: todo.txt, 2026-10-02

---

## Decisions needed

### T076 — May the site use "D&D" in its name and on its pages?
**Type** decision · **Size** M · **Status** needs investigation · **Verified** 2026-10-02

"D&D" and "Dungeons & Dragons" are Wizards of the Coast trademarks. Whether a
free, invite-only fan tool may carry them in its name, and on what terms (e.g.
WotC's Fan Content Policy and its required notice), has not been looked into.
**Nothing here is legal advice, and no policy text was read for this entry.**

- **Where the name is used** (measured): `Header.tsx:98-99`, `Footer.tsx:38`,
  `SignInPage.tsx:82`, `JoinPage.tsx:98`, `CampaignBanner.tsx:98`,
  `public/index.html:9,12`, `public/manifest.json:2-3`. The repo carries **no**
  trademark notice or disclaimer anywhere.
- **Catch**: the Firebase project id and live URL are
  `dnd-campaign-companion(.web.app)`. A project id cannot be renamed; a new
  Hosting site name (another `*.web.app`) or a custom domain can be added.
  Docs, scripts and `CLAUDE.md` name the project id throughout.
- **Answer first**: read the current policy, then decide — keep the name with
  the required notice, or rename. T075 waits on it.
- **Source**: todo.txt, 2026-10-02

---

## Tech debt and platform

### T026 — Mobile layout on the story pages
**Type** debt · **Size** M · **Status** needs investigation · **Verified** 2026-09-16

Reported as "mobile layout issues on certain pages, story all around".
**Narrowed by the maintainer (2026-10-02): most of it** — the chapter list, the
reader and the chapter form all. Symptoms named: text overlapping text, text
not fitting, and the chapter drawer in the reader **cannot be scrolled with a
finger** when picking a chapter. Fix these on their own, not as part of a
reader redesign (maintainer, 2026-10-02).

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
  visually.
- **The drawer**: below `lg` the rail is a drawer, opened from the "Chapters"
  button in `src/pages/story/StoryPage.tsx:182` and rendered by
  `features/storytelling/stories/components/ChapterRail.tsx`. Touch scrolling
  failing there smells of a scroll lock on the body or an `overflow` missing
  on the drawer's list — check it on a real phone or touch emulation, not a
  resized desktop window.
- **Catch**: three pages, several symptoms. Render each at 320 and 375px and
  list what breaks before sizing; the answer decides whether this stays M.
- **Source**: todo.txt, 2026-09-16

---

### T037 — A group cannot be deleted
**Type** debt · **Size** L · **Status** open · **Verified** 2026-09-16

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

- **Precedent worth copying**: `deleteCampaign` — an Admin SDK
  `recursiveDelete` in a callable. Its doc comment at
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
  (`npm install --legacy-peer-deps`, not `npm ci`, so the lockfile is not enforced).
- **Decided (maintainer, 2026-10-02): move to Vite**, planned before any code.
  It touches the build, env-var names (`REACT_APP_*` → `VITE_*`), jest config
  (stay on jest, or move to Vitest — the plan decides) and the four-resolvers
  table in `CLAUDE.md`, which Vite can collapse by honouring `@/` paths. `scripts/check-bundle-size.js` expects CRA's
  `build/static/js/main.*.js`; a new bundler must keep it measuring the entry.
- **Source**: todo.txt, 2026-09-24

### T061 — The `test` check does not yet block a merge, and test files are unlinted
**Type** debt · **Size** M · **Status** open · **Verified** 2026-09-28

`.github/workflows/test.yml` runs the type-check, `npm run lint` (app code,
zero warnings), `npm run test:ci` (jest, 80% coverage floor) and, since
2026-09-28, `firebase/functions`' build and emulator-backed suite (the
`functions` job, through `npm --prefix firebase run test:functions`) and, since
the same day, the production build and its entry-bundle ceiling (the `bundle`
job) on every PR and before the merge-to-main deploy, which waits on all of
it. Two things remain.

- **Not in the repo**: the `test` check blocks a merge only once branch
  protection on `main` lists it as required. That is a GitHub setting.
- **Lint scope — decided (maintainer, 2026-10-02): ratchet it.** Test files
  are excluded today and carry ~1,000 `react-app/jest` problems (mostly
  `testing-library/*`) that nothing has ever enforced. Lint them in CI against
  a committed baseline count that may only go down; files get fixed as they
  are touched. A count that rises fails the job, and a count that falls should
  lower the baseline in the same PR.
  `firebase/functions`' own lint (~2,000 problems, mostly CRLF) is not a gate either.
- **Source**: todo.txt, 2026-09-24; the jest, type-check and lint gates
  landed 2026-09-26, the functions suite 2026-09-28

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

### T070 — CI deploys the functions, but only once the maintainer sets it up
**Type** debt · **Size** S · **Status** blocked · **Verified** 2026-09-28

`firebase-hosting-merge.yml` now deploys the functions on every merge to
`main`: a `deploy_functions` job after the tests and **before** Hosting
(`needs:`), so a new page never reaches users before the function it calls.
It runs the repo's pinned CLI with `--only functions --non-interactive`, under
its own service account, read from the GitHub secret
`FIREBASE_FUNCTIONS_DEPLOY_SA`. Until that secret exists the job fails and
**holds back every Hosting deploy too**, so do the steps below before merging it.

- **Blocked on the maintainer**, all doable in a browser:
  1. **Cleanup policy, once.** A non-interactive deploy fails, after
     deploying, when `europe-west1` has no Artifact Registry cleanup policy
     (the 2026-09-24 hand deploy warned there was none). In Cloud Shell:
     `npx firebase-tools@15.22.4 login --no-localhost`, then
     `npx firebase-tools@15.22.4 functions:artifacts:setpolicy --project dnd-campaign-companion --location europe-west1`.
  2. **A deploy service account**, in IAM & Admin → Service Accounts, with:
     Cloud Functions Admin, Cloud Run Admin (the callables' public invoker),
     Service Account User, Cloud Scheduler Admin (`sweepOrphanedImagesDaily`),
     Secret Manager Viewer (`OPENAI_API_KEY`, `CONTACT_*`), Firebase
     Authentication Admin (the `gateAccountCreation` blocking trigger),
     Firebase Viewer, Service Usage Consumer and Artifact Registry Reader.
     Put together from the CLI's calls and third-party guides, **not measured**:
     the first run's error names any missing permission. The Hosting account
     (`FIREBASE_SERVICE_ACCOUNT_DND_CAMPAIGN_COMPANION`) is not widened;
     its documented roles cover Hosting only.
  3. **A JSON key** for it, pasted into GitHub → Settings → Secrets and
     variables → Actions as `FIREBASE_FUNCTIONS_DEPLOY_SA`.
  4. **Merge while able to watch the first run.** It deploys whatever `main`
     holds that was never deployed by hand.
- **Contact secrets: already done.** This entry said `contact.ts` read
  `CONTACT_EMAIL`/`CONTACT_PASSWORD` from the gitignored `.env` alone. It has
  declared both as Secret Manager secrets since 2026-09-10, and they are set
  (maintainer, 2026-09-28). No function reads anything else from `.env`, so a
  CI checkout deploys the same configuration a hand deploy does.
- **When it fails**: production has a function the source no longer exports
  (the non-interactive deploy refuses to delete it; delete it by hand), or the
  cleanup policy is gone. Changed trigger types are skipped with a warning.
- **Out of scope**: rules stay manual; `firebase.json` has no rules keys on
  purpose. PR previews share production's functions and deploy none.
- **Source**: maintainer, 2026-09-25; the deploy job 2026-09-28

---

## Performance

A full audit exists and is the source of truth for evidence, measurements and
remediation order: **`docs/performance/performance-review-2026-08-30.md`**, with
runtime traces in `runtime-evidence-2026-08-30.md`. Fifteen findings, `PERF-01`
to `PERF-15`, each with severity, affected line links, a recommended direction
and a suggested budget. The entries below **track** what is still open; they do
not restate it. Read the review before acting on any of them.

**It audits commit `b73232a` (2026-08-30) and `main` has moved since.** The
review says so itself. Every finding has now been re-checked against the tree,
located by symbol: six on 2026-09-16 at `ebc0a28`, `PERF-02` on 2026-09-25,
`PERF-11` during Phase 15, and the last seven on 2026-09-28 at `ed477e6`.

| Finding | Severity | Re-checked 2026-09-16 |
|---|---|---|
| `PERF-01` search never terminates on whitespace | Critical | **Fixed.** All three split sites are now `split(/\s+/).filter(Boolean)`, and `findWordMatches` (`SearchService.ts:294`) guards `if (!word) return []`. `SearchBar.tsx` is gone, replaced by `shared/components/command-palette/`. The regression test that did not ship with the fix landed as T031 (2026-09-23), pinning each guard separately. |
| `PERF-07` context switch refreshes then reloads | High | **Fixed.** The only `window.location.reload()` left in `src/` is `ErrorBoundary.tsx:62`. |
| `PERF-10` all routes + full Lodash in one bundle | Medium | **Fixed** 2026-09-28 (T030). Zero `lodash` imports remain in `src/`, routes load on first visit (`main.js` 341 → 264 kB gzip), and `npm run check:bundle` holds `main.js` under a ceiling in CI. |
| `PERF-04` notes loaded twice, unbounded | High | **Fixed** 2026-09-24 — `NoteContext` reads once, constrained to the active campaign, and reads nothing before one is selected. New note ids are random, so nothing needs the other campaigns' notes. |
| `PERF-08` duplicate collection owners | Medium | **Fixed** 2026-09-22 — one owner per collection; since 2026-10-02 one listener and no fetch, pinned by `shared/hooks/__tests__/provider-fetch-counts.test.tsx`. |
| `PERF-15` duplicate `NavigationProvider` | Low | **Fixed** 2026-09-24 — `index.tsx` mounts no provider of its own; `App`'s is the only one. |
| `PERF-02` auth restore waterfall | High | **Confirmed, mostly fixed** 2026-09-25 — see T032. The restore is 3 round trips deep instead of 5 + one per group, and since 2026-10-02 two identical group-profile reads in flight share one request. |
| `PERF-11` location walk loops on a cycle | Medium | **Fixed** in Phase 15. `15-3` put the walk behind a visited set and a depth cap (`shared/hooks/useHighlightTarget`); `15-4` routed every other walk over the tree through `locations/utils/location-tree.ts`, with the same guards, and made the cycle tests hang the suite if a guard is removed. |
| `PERF-03` every provider above the router | High | **Confirmed** 2026-09-28 — see T032. `App.tsx` still wraps `<Routes>` in the NPC, Location, Story, Rumor, Quest, Note, Usage and Search providers. `UsageProvider` calls `getUsageStatus` once per signed-in uid on every route, though only `NotePage`'s `UsageMeter` and `CampaignLinksPanel` read it. `SearchProvider` no longer fetches (it indexes the providers' copies since `PERF-08`), but it keeps all six collections subscribed. T030's lazy routes split the code, not the data. |
| `PERF-05` chapter order costs O(N) serial round trips | High | **Confirmed** 2026-09-28 — see T032. In `StoryContext`, `createChapter`, `deleteChapter`, `reorderChapters` and `updateChapter`'s order-change path still shift each chapter with `setDocument` → verifying `getDocument` → delete inside an awaited `for` loop. `updateChapter` still awaits `refreshChapters()` before the write. `DocumentService.batchOperations` has one caller, `useFirestore`, and none of these paths. |
| `PERF-06` writes re-read attribution and reload collections | High | **Mostly fixed** 2026-10-02 — see T032. The five entity collections are listeners, so the refresh each context makes after a write reads nothing (`pages/__tests__/redundant-refreshes.test.tsx`), and attribution reuses a group profile read in the last five minutes. **Left**: `RumorBatchActions` still awaits one update or delete per selected id, and the rumour combine/convert flows loop the same way — each wants one batch. |
| `PERF-09` Home refetches attribution profiles | Medium | **Confirmed** 2026-09-28 — see T032. `HomePage` (still `/`) re-runs its effect whenever quests, rumours, NPCs, locations or chapters change. It collects every `createdBy`/`modifiedBy` uid and `fetchAttributionUsernames` reads each group profile afresh: there is no cache across runs, and uids whose items already carry the `*Username`/`*CharacterName` fields that `determineAttributionActor` prefers are fetched anyway. |
| `PERF-12` progress rewrites a growing document | Medium | **Fixed** 2026-09-30. Progress is one document per reader per campaign (2026-09-28), and each write is now a merging `setDocument` of only what changed: one chapter's entry, or the current chapter. A read that resolves after the reader has already made progress keeps it. |
| `PERF-13` profile/admin mutations reload held data | Medium | **Confirmed** 2026-09-28 — see T032. Each `useUser` update awaits `refreshUserProfile`, which re-reads the global profile and re-runs `setActiveGroupContext` (group profile and campaign list, in parallel since `PERF-02`). The cited `CampaignManagementView` is no longer mounted, and the live `/admin/campaigns` (`AdminCampaignsPage`) no longer loads `getCampaigns` itself or reloads after a write: it renders the context's list, which `useCampaigns` refreshes after each create, update and delete, and shows the skeleton while the context is loading (`useCampaigns().loading`). What is left is the `useUser` half above |
| `PERF-14` note autosaves can overlap | Low | **Fixed** 2026-09-30. `NoteEditor` holds one save in flight; a save due during it waits, and every request made while it waits joins one follow-up that writes the newest text. Overlap was worse than duplicate writes: the older text could land last after the newer save marked the note clean, and a new note's second create was refused as "already exists". `NoteContext` now records a create the moment it resolves, so a save from a context captured before then updates instead. |

Nine of fifteen are fixed; the other six hold. The review's own prioritized
list opens with a finding that is already fixed, so do not work straight down
it. Re-check a finding by symbol before acting on its line links: they are
`b73232a` line numbers, and several files have moved or been deleted.

### T032 — Performance remediation programme
**Type** debt · **Size** L · **Status** in progress · **Verified** 2026-10-02 ·
`PERF-02` `PERF-03` `PERF-05` `PERF-06`

The plan is [`docs/performance/t032-plan.md`](docs/performance/t032-plan.md),
drafted 2026-10-02 and **not yet reviewed by the maintainer**. Its phases 1–2
landed with it: the five entity collections are Firestore listeners (no
collection read after a write, and another player's edits appear without a
reload), and attribution reuses a cached group profile. What is left, by the
plan's phases:

- **Phase 3** — notes move to the same listener.
- **Phase 4, needs a decision** — the `refresh*()` calls after writes are now
  free but still read like round trips. About 20 assertions pin "a refresh
  follows a write"; removing the calls means rewriting those to the listener
  requirement, which is the maintainer's call.
- **Phase 5, `PERF-03`** — every provider still sits above the router and
  listens on every signed-in route. Subscriptions should open only while
  something reads the list; `SearchContext` only once the search opens;
  `UsageProvider`'s callable only where the meter renders.
- **Phase 6, `PERF-05`** — chapter order is still the document id, and
  inserting at the front of 32 chapters is still ~**102** serial operations.
  First one `writeBatch` per structural change; then, if the maintainer
  accepts a data migration, stable ids plus an `order` field.
- **Phase 7, `PERF-02`** — no test measures restore's request count yet; write
  it, then decide whether a restore orchestrator is still worth building.
- **Also left**: the rumour batch and combine/convert loops (`PERF-06`, see the
  table); `PERF-09`, Home's `fetchAttributionUsernames`, still reads each
  profile through `getGroupUserProfile`, which always reads — it should use the
  cache, but `attribution-utils.test.ts` pins that exact call; and `PERF-13`,
  each `useUser` update still awaits `refreshUserProfile`.
- **Source**: performance review

---

## Documentation debt

### T067 — The repository carries files nobody reads
**Type** docs · **Size** M · **Status** open · **Verified** 2026-09-24

**Decided (maintainer, 2026-10-02)**:
1. **Delete what nothing cites; keep what is cited, where it is.** A doc that
   no code comment or live doc references is deleted (git history keeps it). A
   cited handoff stays at its current path, so no reference breaks. Nothing is
   moved to `docs/archive/`.
2. **Dead scripts go too**: `scripts/copyFeatureFiles.ps1`, which lists
   pre-restructure paths. (The dead admin views and `FloatingUsageIndicator`
   were already deleted, 2026-10-01.)
3. **`TODO.md` is the one "start here" file.** Point `CLAUDE.md` at it, fold
   anything still live in `post-test-coverage-roadmap.md` into it, and delete
   the roadmap (after checking what cites it).

The maintainer wants the repo cleaned up, doc files especially.

- **Measured**: 208 Markdown files under `docs/`: `testing/` 109, `design/` 59,
  `superpowers/` 21, and a few each in `architecture/`, `project/` and `performance/`.
  `CLAUDE.md` still names `docs/testing/post-test-coverage-roadmap.md` as
  "start here", and it was last updated 2026-08-28 (it still warns about deploy
  steps TODO.md shows were done since).
- **Scripts**: `scripts/copyFeatureFiles.ps1` lists pre-restructure paths;
  `scripts/manage-environment.ps1` is Docker-based and unused.
- **Catch**: `docker/` is *not* dead. `CLAUDE.md` calls it unused, but CI builds
  the frontend with `docker/Dockerfile.frontend.prod`. And many docs are phase
  handoffs that code comments cite by name, so deleting one breaks references.
- **Source**: todo.txt, 2026-09-24; scoped 2026-10-02

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
