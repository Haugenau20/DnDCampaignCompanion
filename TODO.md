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
| medium | T026 | Reader's chapter drawer won't touch-scroll | S | needs investigation | Reported on a phone; desktop Chrome cannot reproduce it, so it needs the phone first |
| medium | T061 | `test` check not required | S | blocked | Every suite is gated in CI now, but a merge waits on none of it until branch protection lists the check |
| medium | T070 | CI functions deploy needs setting up | S | blocked | The job exists; merging it without its service account and cleanup policy holds back Hosting deploys too |
| medium | T037 | A group cannot be deleted | L | open | Decided 2026-10-02 to build it, plan first: members' data cannot be removed until it exists |
| low | T017 | Batch actions for quests, locations and chapters | M | open | Convenience; rumours and NPCs have them, and the shared pieces exist now |
| low | T054 | Sign in with Discord | L | needs scoping | Kept for later, not now (2026-10-02); Firebase has no built-in provider |
| low | T057 | Sign in with a code from the email | M | blocked | On hold: needs a sending domain; the current phone-approval flow works |
| low | T055 | Opt-in second factor | M | needs scoping | Kept for later, not now (2026-10-02); prefer an authenticator app over SMS |
| low | T059 | CRA peer deps no longer resolve | L | open | Builds only with --legacy-peer-deps; decided 2026-10-02 to move to Vite, plan first |
| low | T063 | Entity pages look like three products | L | open | Decided 2026-10-02: locations and quests adopt the NPC page's light card; location picture stays wide |
| low | T065 | Global Firebase CLI still 13.x | S | open | Repo pins 15.22.4; the maintainer's machine and `start-dev.ps1` still run 13 |
| low | T067 | Repo carries files nobody reads | M | open | Scoped 2026-10-02: delete uncited docs and dead code; TODO.md becomes "start here" |
| low | T075 | Header crowded, text truncates | M | needs scoping | Name, logo and the <380px overflow; waits on T076 |
| low | T074 | Default pictures where none uploaded | M | needs scoping | Reverses deliberate empty-state design (D45); pairs with T063 |

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

**The tracker can describe an intention as if it were the code.** The entry for
the rumour bar's hatch said confirmed and disproved rumours "sit on the same ramp stop — correct", and the
code had them two stops apart, with the disproved rumour in the red a failed
quest wears. The comment above the map said the right thing too. Three
documents agreed with each other and none of them agreed with the product.

---

## Bugs

Bugs the behavioural suites find live in `docs/testing/bug-tracking/README.md`.

---

## Features and enhancements

### T017 — Batch actions for quests, locations and chapters
**Type** feature · **Size** M · **Status** open · **Verified** 2026-10-03

Select several rows, then delete or change status in one go. Rumours and NPCs
have it; quests, locations and the chapter list do not.

- **The pattern, now shared**: `shared/hooks/useSelection` holds the mode toggle
  and the set of ticked ids; `RosterBatchBar` (`core/components/Roster.tsx`) is
  the bar's shell; `RosterRow` already takes `leadingControl` (the checkbox)
  and `selected`. The actions stay per entity: `NPCBatchActions.tsx` is the
  plain example to copy, `RumorBatchActions.tsx` the one with entity-only
  actions (combine, convert to quest). `NPCDirectory.batch.test.tsx` is the
  test pattern.
- **Each action is one write.** Give each context a batched pair, as
  `NPCContext`'s `updateNPCsStatus` and `deleteNPCs` do, through
  `campaign-entities/shared/commitEntityWrites.ts`: one round trip, and all or
  nothing. Stamp modification attribution yourself, since a batch writes its
  data as given. Delete images after the documents, as `deleteNPCs` does.
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
- **Source**: todo.txt, 2026-09-24; direction decided 2026-10-02

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

### T061 — The `test` check does not yet block a merge
**Type** debt · **Size** S · **Status** blocked · **Verified** 2026-10-03

`.github/workflows/test.yml` runs the type-check, `npm run lint` (app code,
zero warnings), `npm run lint:tests` (the test files, against a per-file
baseline that may only go down), `npm run test:ci` (jest, 80% coverage floor),
`firebase/functions`' build and emulator-backed suite (the `functions` job),
and the production build with its entry-bundle ceiling (the `bundle` job), on
every PR and before the merge-to-main deploy, which waits on all of it.

- **Blocked on the maintainer**: a PR can still be merged with any of those
  red. The checks block a merge only once branch protection on `main` lists
  them as required. That is a GitHub setting, not something the repo can hold.
- `firebase/functions`' own lint (~2,000 problems, mostly CRLF) is not a gate.
- **Source**: todo.txt, 2026-09-24; the jest, type-check and lint gates
  landed 2026-09-26, the functions suite 2026-09-28, test-file lint 2026-10-03

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
