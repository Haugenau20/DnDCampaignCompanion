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
| medium | T131 | Store each link once, shown both ways | M | open | The one data-model defect players see: a link added on one page is missing on the other |
| medium | T132 | Attribution and times stamped where the rules can check them | M | open | Any member can credit a record to someone else today; do with T133 so records are rewritten once |
| medium | T133 | Notes on records as their own documents | M | open | A record's notes grow until Firestore's 1 MiB refuses every write to it |
| medium | T138 | The site starts Google Analytics; the privacy page says it has none | S | open | A public privacy promise the code contradicts; whether events reach Google is unverified |
| medium | T139 | CI signs in to Google Cloud with long-lived keys | M | open | A leaked key deploys code that reads every group, and a PR's dependencies run beside the Hosting key |
| medium | T128 | Caps on members, campaigns and accounts | M | open | Bounds what one founder link can cost; the 20-account cap cannot hold 30 groups |
| medium | T127 | A founder's first run | M | open | A founder link opens nothing yet: there is no path from it to a first campaign |
| low | T123 | Lord of the Rings screenshots in the README? | M | open | A question for the maintainer; the public home page's *Sunless Citadel* example raises the same question |
| low | T137 | An operator page: founder links, extraction limits, metrics | L | open | The script and the console work meanwhile; design approved 2026-10-08 (`docs/architecture/operator/`), step 1 of 8 done |
| low | T122 | An "about" page | S | needs scoping | Waits on what it should say; may help T118's branding check |
| low | T075 | A logo for the header; header crowded | M | needs scoping | Waits on the maintainer: whether a logo carries the name, and which truncation was meant |
| low | T054 | Sign in with Discord | L | needs scoping | Kept for later, not now (2026-10-02); Firebase has no built-in provider |
| low | T057 | Sign in with a code from the email | M | blocked | On hold by the maintainer; its sending domain exists now (`muninn.quest`); the current phone-approval flow works |
| low | T055 | Opt-in second factor | M | needs scoping | Kept for later, not now (2026-10-02); prefer an authenticator app over SMS |
| low | T118 | Finish the move to `muninn.quest` | S | open | Everything runs on `muninn.quest`; left: Google's branding check, and two cosmetic leftovers |
| low | T134 | Chapter text and the saga out of their documents | M | open | Search downloads the whole story; the saga is one document that will hit 1 MiB |
| low | T135 | The index file matches production | S | blocked | Waits on the maintainer reading production's indexes; cheap once they have |
| low | T136 | One membership document | L | open | Correct today; only removes a way for two copies to disagree |
| low | T116 | `firebase-admin` 13 → 14 in the functions | M | blocked | 14 would not clear the last advisory (`uuid`, via Storage), and the functions' jest cannot load its ES-module dependencies |
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

### T138 — The site starts Google Analytics; the privacy page says it has none
**Type** bug · **Size** S · **Status** open · **Verified** 2026-10-08

The privacy page promises "No analytics" (`pages/PrivacyPolicyPage.tsx:102`)
and "no analytics ... no third-party scripts watching you read" (`:271`), but
every page load calls `getAnalytics(app)` (`core/services/firebase/core/BaseFirebaseService.ts:80`)
with a real measurement id (`core/services/firebase/config/firebaseConfig.ts:13`,
`G-TX89XGGZE0` as the fallback). Nothing else reads `this.analytics`.

- **Unverified**: whether page views reach Google Analytics from the live
  site. Not observed; the live site's network tab or the GA property shows it.
  No CSP in `firebase/firebase.json` would stop it.
- **Catch**: drop it, or keep it and say so (with consent, if it sets cookies),
  is the maintainer's call, and T137 asks for traffic metrics.
- **Source**: found while filing T137, 2026-10-08

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
  site's icon is a placeholder "M" until then (`public/favicon.svg`); the logo
  replaces that SVG, and `scripts/build-icons.js` renders the PNGs and
  `favicon.ico` from it.
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

### Letting a new group start on its own (T127 and T128)

A group cannot start today without the maintainer, who creates it, invites its
first player, promotes them and leaves. The plan,
[`docs/architecture/new-group-onboarding-plan.md`](docs/architecture/new-group-onboarding-plan.md),
says where things stand and what was decided (maintainer, 2026-10-08): founder
invitations, 10 members and 5 campaigns per group, 300 accounts, AI limits of
3 / 5 / 10 with the prepaid OpenAI balance as the ceiling, every member may
create a campaign, and up to 3 groups per founder. Founder invitations exist:
`firebase/functions/scripts/issue-founder-invitation.js` issues one, and sign-up
admits it, and `createGroup` spends one or allows up to 3 groups to whoever has
started one. T127 is the rest of the smallest change that lets a table start
alone; T128 makes it safe to hand out more than a few links. The callables on
the way in (`reserveSignUp`, `redeemInvitation`, `createGroup`) require App Check
outside the emulator. Every step that changes a flow lands with its e2e journey; the last one runs founder link →
group → campaign → invitation → a second player joins.

### T127 — A founder's first run
**Type** feature · **Size** M · **Status** blocked · **Verified** 2026-10-08

From founder link to first campaign as one guided flow, not three admin pages
(plan, D5).

- **Where**: the group-less home (`shared/components/gated/GatedPageState.tsx`)
  offers "I have a founder link" beside "I have an invite link"; the founder
  names the group and themselves; then creates the first campaign; then lands on
  `/admin/people` with the invite button in front.
- **Every member may create a campaign** (decided 2026-10-08), as the rules
  already allow (`firestore.rules.prod`, `match /campaigns/{campaignId}`); today
  only the admin UI offers it. The empty campaign state ("Your first campaign
  will appear here as soon as it's created") gets a button for every member.
- **The server side is done**: `createGroup` takes `{name, description,
  username, founderToken}` and spends the link (`GroupService.createGroup`
  passes them through); `reserveSignUp` takes `{founderToken, email}`.
- **Source**: the onboarding plan, step 3; decided 2026-10-08

### T128 — Caps on members, campaigns and accounts
**Type** feature · **Size** M · **Status** open · **Verified** 2026-10-08

Decided 2026-10-08 (plan, D2): at most **10 members** and **5 campaigns** per
group, and **300 accounts** in the project.

- **Members**: enforced in `groupManagement/redeemInvitation.ts`.
- **Campaigns**: created from the browser under the rules, which cannot count;
  a per-group counter the rules keep with `getAfter`, or creation through a
  callable. `deleteCampaign` must give the slot back.
- **Accounts**: `MAX_ACCOUNTS` (`signUp/signUpGate.ts:23`) is 20, checked by
  `getAuth().listUsers(20)` on every sign-up, which also counts accounts the gate
  never admitted. A counter document, kept by the gate and by
  `userManagement/deleteUser.ts`, replaces it. 300 is the plan's figure, not
  objected to; change it freely.
- **Source**: the onboarding plan, step 4; decided 2026-10-08

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

### T137 — An operator page: founder links, extraction limits, metrics
**Type** feature · **Size** L · **Status** open · **Verified** 2026-10-08

One web page for operator work, usable from a phone: issue and revoke founder
links, and set one person's extraction allowance (their own, since they pay for
OpenAI, or a player's who asks). Health and traffic figures are phase 2.

- **Design** (approved by the maintainer 2026-10-08, with every default
  decision kept):
  [`docs/architecture/operator/`](docs/architecture/operator/design.md): a
  design, a security architecture, and a plan in steps 0 to 8. Decided: its own
  Cloud Run service behind Google's Identity-Aware Proxy, outside the app and its
  sign-in; code in this repository; security over setup effort.
- **Done**: step 1. `users/{uid}.extractionAllowance` sets all three limits;
  the old `customLimit` (daily only) and `isUnlimited` still apply where no
  allowance does, until step 7 retires them.
- **Step 0**: the project is in no Google Cloud organization (maintainer,
  2026-10-08), so IAP needs a custom OAuth client, made in the console. Open:
  the operator account, and whether to create an organization first.
- **Next**: steps 2 and 3, stacked.
- **Source**: todo.txt, 2026-10-08 (two inbox items, combined)

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

### Restructuring Firestore before the site scales (T131 to T136)

Decided by the maintainer on 2026-10-08: **R2**, Firestore restructured; the
site stays on Firebase. Why, and the routes set aside, are in
[`docs/architecture/backend-structure-options.md`](docs/architecture/backend-structure-options.md);
the findings (F1 to F9), the seven changes and the answers to the review's
questions are in
[`docs/architecture/data-model-review.md`](docs/architecture/data-model-review.md).
Both must land before any user scaling (maintainer, 2026-10-07).

**How every data change ships.** Production holds real campaigns, so each data
change is a script in `firebase/functions/scripts/` in the shape of
`audit-location-ids.js`: read-only by default, `--apply` to write, `--revert`
from a saved manifest, run by the maintainer with their own gcloud login. A
field that moves or is renamed ships in steps: the frontend reads both shapes;
the script rewrites; a later frontend drops the old shape; only then, in its own
merge, a rule refuses it. The review's read-only production checks (campaign
sizes, how often a link's two halves disagree) go into each change's audit.

### T131 — Store each link once, and show it both ways
**Type** debt · **Size** M · **Status** open · **Verified** 2026-10-08

Several links are stored on both records, and each page edits only its own
half, so a link added on a quest's page is missing on the NPC's (F1):
`NPC.connections.relatedQuests` and `Quest.relatedNPCIds`; `NPC.locationId` and
`Location.connectedNPCs`; `Quest.locationId` / `keyLocations` and
`Location.relatedQuests`; `Rumor.locationId` and `Rumor.relatedLocations`. An
NPC → NPC link is stored on one side only, and the other NPC's page does not
show it. Deleting a record leaves its id in every list that named it.

- **Decided (maintainer, 2026-10-08)**: every link is stored once and shown,
  and editable, on both pages; adding it from either side has the same outcome.
  NPC → NPC links are two-way. **An NPC may be linked to several places**: the
  single `NPC.locationId` becomes part of a list (`Location.connectedNPCs`
  already is one, so merging into it is the smaller migration).
- **Linking before the other record exists** (the maintainer's reason for links
  by name) stays covered by the attach tray's "add one" hatch, which creates
  the record in quick add and links it without leaving the form
  (`shared/components/attach-tray/AttachTray.tsx`). Quest places added before
  #1421 still carry only a name (`resolveKeyPlace`); the script gives them ids
  where one place matches.
- **Pattern to copy**: rumor → NPC, stored on the rumor and derived on the NPC's
  page (`NPCDetailPage.tsx`). Deleting a record removes its id from the owner's
  lists.
- **Migration**: an audit counting the pairs whose halves disagree, then a
  script that merges each dropped half into the kept one. No rule changes.
- **Source**: `data-model-review.md` change 1 (F1); answered 2026-10-08

### T132 — Attribution and times stamped where the rules can check them
**Type** debt · **Size** M · **Status** open · **Verified** 2026-10-08

Who created or changed a record, and when, is built in the browser
(`core/attribution/attribution.ts`) and no rule checks it: any member can
credit a record to someone else, or rewrite who made it (F5). Times are stored
three ways, two of them from the client's clock (F6).

- **Rules**: on create, `createdBy` and `modifiedBy` equal `request.auth.uid`;
  on update, `createdBy` and the creation time are unchanged and `modifiedBy`
  is the caller. Times become server timestamps checked as `request.time`;
  `YYYY-MM-DD` stays only where a calendar day is meant. `dateAdded` becomes
  `createdAt` in the same rewrite
  (`docs/architecture/migration/database-field-alignment.md`).
- **Decided (maintainer, 2026-10-08): names are the author's current ones.**
  Shown names are looked up from `createdBy` and `createdByCharacterId` (already
  written), so renames carry through; the stored name stays only as the fallback
  for an author who has left the group. One read of the group's profiles serves
  every name on a page (at most 10 members, T128). `useCreatorName` and
  `AttributionInfo` change with it.
- **With T133**: both rewrite every record; one script, one pass.
- **Deploy order**: the frontend that writes server timestamps ships before the
  rule that requires them.
- **Source**: `data-model-review.md` change 3 (F5, F6); answered 2026-10-08

### T133 — Notes on records as their own documents
**Type** debt · **Size** M · **Status** open · **Verified** 2026-10-08

`NPC.notes`, `Location.notes` and `Rumor.notes` are arrays inside the record;
each note rewrites the whole record in a transaction and is sent again to every
listener. Firestore refuses a document over 1 MiB, and then every write to that
record fails, including edits that do not touch the notes (F3). Rules cannot
look inside an array, so a note's size is bounded only by the app (F4).

- **Change**: `npcs/{id}/notes/{noteId}` and the like, read when the record is
  opened, each note capped by the rules on its own. `deleteCampaign` must delete
  them.
- **With T132**: one script, one pass.
- **Not these**: a player's private notes (`groups/{g}/users/{u}/notes`) are a
  different feature (T111).
- **Source**: `data-model-review.md` change 5 (F3)

### T134 — Chapter text and the saga out of their documents
**Type** debt · **Size** M · **Status** open · **Verified** 2026-10-08

A chapter holds its full text, so search downloads the whole story; the saga is
a single document (`saga/sagaData`) that will reach 1 MiB (F2, F3).

- **Change**: `chapters/{id}` keeps title, order and summary, and the body moves
  to its own document, read when the chapter is opened; search then needs the
  summary, not the book. The saga becomes sections, as chapters already are.
- **Source**: `data-model-review.md` change 4

### T135 — The index file matches production
**Type** debt · **Size** S · **Status** blocked · **Verified** 2026-10-08

`firebase/firestore.indexes.json` declares 20 composite indexes for queries the
client never makes, and the deploy leaves it out (`--only
firestore:rules,storage`, `firebase-hosting-merge.yml`). What production has is
unknown; unused indexes cost storage and write time (F8).

- **Blocked on the maintainer**: `npx firebase firestore:indexes --project
  dnd-campaign-companion` from `firebase/`, output pasted. Then the file says
  exactly what is needed (probably nothing until paging brings `orderBy`), and
  whether the deploy includes it is decided.
- **Source**: `data-model-review.md` change 6 (F8)

### T136 — One membership document
**Type** debt · **Size** L · **Status** open · **Verified** 2026-10-08

Membership is stored twice: `users/{uid}.groups` (what every rule reads, so each
check reads the whole global profile) and `groups/{g}/users/{uid}` (the roster,
with the role). Only functions write either, so they agree while every function
is correct, and once they did not (F7).

- **Change**: `groups/{g}/members/{uid}` with the role, checked with
  `exists()`; copy first, then switch the rules, in separate merges.
- **Not urgent**: correct today.
- **Source**: `data-model-review.md` change 7 (F7)

### T139 — CI signs in to Google Cloud with long-lived keys
**Type** debt · **Size** M · **Status** open · **Verified** 2026-10-08

Every Google Cloud sign-in in CI is a service-account JSON key kept as a
GitHub secret. A key never expires on its own, and whoever reads one holds that
account's roles from anywhere. Keyless Workload Identity Federation, restricted
to this repository by id and to the workflow and branch, removes them.

- **Where**: `FIREBASE_FUNCTIONS_DEPLOY_SA` (functions and rules,
  `firebase-hosting-merge.yml:43` and `:95`); `FIREBASE_SERVICE_ACCOUNT_DND_CAMPAIGN_COMPANION`
  (Hosting, `:141`; PR previews, `firebase-hosting-pull-request.yml:58`;
  channel cleanup, `firebase-hosting-pull-request-cleanup.yml:45`).
- **Catch**: the preview job runs an unmerged branch's `npm ci` and build
  (`firebase-hosting-pull-request.yml:26-31`) on the runner that then holds the
  Hosting key, so a poisoned dependency in a PR can wait for that step and take it.
  `FirebaseExtended/action-hosting-deploy` takes only a JSON key (its README:
  `firebaseServiceAccount` "required", "a service account JSON key"), so those
  steps move to the CLI under `google-github-actions/auth`; unverified whether
  the action accepts anything else.
- **Then**: delete both keys in the console once nothing uses them.
- **Source**: found while designing T137's operator deploy, which uses
  Workload Identity Federation from the start, 2026-10-08

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
