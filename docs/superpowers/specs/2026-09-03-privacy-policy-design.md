# Privacy policy redesign — design brief and verified facts

**PR 8** · branch `redesign/privacy-policy` · design reference: screenshot `8c`.

This document is the spec the implementation plan
(`docs/superpowers/plans/2026-09-03-privacy-policy.md`) argues from. It carries the
designer's brief, the facts established by reading the code on 2026-09-03, and the
decisions taken with the maintainer where the brief guessed.

---

## 1. The problem

`src/pages/PrivacyPolicyPage.tsx` has three classes of defect.

**A wrong date.** The page renders
`new Date().toLocaleDateString('en-uk', …)`, so it claims a revision every day it is
viewed — defeating its own promise to "notify you of any changes by … updating the
'Last updated' date". `'en-uk'` is also not a locale tag (`en-GB` is), so it silently
falls back to the browser locale.

**Structure that carries no meaning.** Thirteen `Card`s, one per section, so the boxes
signal nothing. `h2`s float outside the cards while `h3`s sit inside them. Three cards —
"How We Use Your Information", "Data Retention", "Your Rights" — have no heading of
their own at all. No section has an `id`, so no part of the policy can be linked to.

**Content that is wrong, vague, or missing.**

- **Entity extraction is not mentioned anywhere.** This is the most consequential
  omission: note text leaves the product and goes to a third party in a third country.
- "If you wish to delete your account, you can contact us to request account deletion"
  contradicts the working self-service Delete Account flow on `/profile`.
- "preserving campaign data for other users' reference where appropriate" is the
  sentence that decides what outlives you, and the vaguest on the page.
- "Regular security assessments" is unverifiable and nobody performs them.
- No controller identity, no legal basis, no hosting region, no transfers statement,
  no right to complain, no device-storage disclosure.

---

## 2. Facts established by reading the code (2026-09-03)

Every claim the new page makes is traceable to one of these. Verified by opening the
files, not inferred.

### 2.1 Entity extraction

| Fact | Source |
|---|---|
| Trigger is the **"Scan note"** button | `src/features/collaboration/notes/components/CampaignLinksPanel.tsx:367-381` |
| Only the note **body** is sent — `contentToExtract`, never the title, never other notes, never campaign content | `CampaignLinksPanel.tsx:230-253` |
| Path: `useEntityExtractor` → `EntityExtractionService.extractEntities` → callable `extractEntities` | `src/features/collaboration/entity-extraction/hooks/useEntityExtractor.ts:51` |
| Cloud Function region **`europe-west1`** | `firebase/functions/src/entityExtraction.ts:327,359` |
| Provider is the **OpenAI platform API** — `openai` npm SDK with `process.env.OPENAI_API_KEY` | `firebase/functions/src/entityExtraction.ts:5,396-404` |
| Default model `gpt-3.5-turbo` | `firebase/functions/src/entityExtraction.ts:370` |
| Caps are **10/day, 30/week, 100/month** — three caps, not one | `firebase/functions/src/entityExtraction.ts:41-45` |
| Client-side content cap: 10,000 characters | `useEntityExtractor.ts:45` |

**The brief said "capped per month".** It is capped three ways. The page says so.

### 2.2 Sessions

`src/core/constants/time.ts` exports `INACTIVITY_TIMEOUT_TEXT = "24 hours"` and
`REMEMBER_ME_TEXT = "30 days"`.

**Screenshot `8c` shows "30 days, or 2 hours idle". That is wrong** — the real
inactivity timeout is 24 hours. The page reuses the constants, as the brief instructs,
so the screenshot's number is overridden by the code's.

### 2.3 Account deletion and leaving a group

- Self-service deletion is real: `/profile` → `DangerZoneCard` → `DeleteAccountDialog`
  → the `deleteUser` callable.
- `firebase/functions/src/userManagement/deleteUser.ts:65-103` batch-deletes the
  username reservation, the group-user profile, the global user doc, and the Firebase
  Auth record.
- Campaign content (chapters, quests, NPCs, locations, rumors) is **not** touched, so
  it does stay with the group. The brief's claim here is correct.

**Defect found while verifying:** notes live at
`groups/{groupId}/users/{userId}/notes` — a **subcollection** of the group-user doc
(`NoteContext.tsx:59`). Firestore does not cascade-delete subcollections, so
`batch.delete(groupUserRef)` **orphans every private note** rather than deleting it.
`removeUserFromGroup.ts:112` has the same defect.

`notes` is the only per-user subcollection, so the fix is bounded to one collection in
two functions. **Decision: fix it in this PR** (§3), so the page's deletion copy is
true when it ships.

### 2.4 Contact and hosting

- The contact form posts to a callable that mails a hidden `CONTACT_EMAIL` via
  nodemailer (`firebase/functions/src/contact.ts:54,247-248`). The channel works and
  the maintainer's address is not exposed.
- No custom domain: `dnd-campaign-companion.firebaseapp.com`
  (`src/core/services/firebase/config/firebaseConfig.ts:8-9`). A `privacy@` alias is
  therefore not available without buying one.
- All Cloud Functions are `europe-west1`; the maintainer confirms the Firestore and
  hosting resources are in the same region.

---

## 3. Decisions taken with the maintainer

| Question | Decision |
|---|---|
| Controller identity and contact | **Name + contact form, no email on the page.** "Søren Haug, Denmark" as controller; `/contact` as the channel, with one line stating it reaches the controller directly and is the route for data requests. GDPR Art. 13(1)(a) leaves no substitute for identity, but the contact *details* may be a form that demonstrably reaches the controller — and this one does. |
| Orphaned notes | **Fix the cascade in this PR.** See §2.3. |
| Hosting region | **`europe-west1`**, named explicitly. |
| OpenAI retention wording | Write what is true of a standard platform API account: **not used to train models; retained by OpenAI for up to 30 days for abuse monitoring, then deleted.** The maintainer confirmed in the OpenAI dashboard that data sharing is disabled for the org, which corroborates the no-training half. |
| OpenAI DPA | **Not yet accepted.** The transfers sentence is therefore written *without* naming a safeguard, and the DPA sentence sits behind a single constant (`OPENAI_DPA_ACCEPTED`) so it can be switched on in a one-line change once accepted. Accepting it is logged as a follow-up, not a blocker. |

### Not legal advice

The wording below is drafted to match what the code does. It has not been reviewed by a
lawyer. Every factual claim is traceable to §2; anything not traceable there was cut
rather than guessed.

---

## 4. The new page

### 4.1 Order

1. `h1` **Privacy** + one line: *What the Companion keeps about you, why, and how to get rid of it.*
2. Right-aligned `Last updated {date}` + a `What changed` disclosure.
3. **Three summary cards** — *Who holds your data* · *No tracking, no ads* · *Delete it yourself*.
4. **The at-a-glance table** — the centrepiece. Columns `What we keep` · `Why` ·
   `Where it goes` · `How long`. Five rows. Semantic `<table>`; stacks to cards under `sm`.
5. **The full text** in two columns: a sticky anchor list left, hairline-separated
   sections right. **No cards in this half** — a card is for something you can act on.

### 4.2 Rules

- Every section carries an `id`, so `/privacy#retention` works, and every `id` appears
  in the anchor list.
- Icons are decorative: `aria-hidden="true"`.
- **No hardcoded colours.** The highlighted extraction row uses the existing
  `card-subtle` class (`--bg-secondary`); there is no yellow token in
  `src/core/themes/`, and the design's yellow is a mock, not an instruction.
- Hairlines use `card-divider` + a directional Tailwind width (`border-t`), per the
  comment at `src/core/themes/css/components.css:106-118`.
- Readable at 320px: the table stacks, nothing overflows.

### 4.3 Content that must be present

- Entity extraction, its own section: that it happens only on the button; that only the
  note body is sent; OpenAI named, and the platform API named; the three caps; the
  retention position; the US transfer.
- The same disclosure at the point of use — one line under the **Scan note** button.
- Deletion: that it is a button on `/profile`, and what survives.
- Groups and sharing: content you wrote stays with the group; your name, characters and
  private notes go.
- Legal basis per purpose; hosting region; transfers; retention in real time units,
  reusing `INACTIVITY_TIMEOUT_TEXT` and `REMEMBER_ME_TEXT`.
- Datatilsynet, and that the user need not come to the controller first.
- Device storage: session preferences and "remember me" live in the browser; no
  analytics, no advertising, nothing sold.
- Security: only the specifics that are true — Firebase Auth, rules-based access
  control, session timeouts, transport encryption. **"Regular security assessments" is cut.**

---

## 5. Out of scope

`PrivacyNotice.tsx` (the sign-in consent toast), the contact form itself, and any change
to what the app collects — **except** the notes-cascade fix in §2.3, which is in scope
by decision because the page's deletion copy would otherwise be false.

## 6. Follow-ups logged, not done here

1. Accept the OpenAI DPA in the platform dashboard, then flip `OPENAI_DPA_ACCEPTED`.
2. Consider whether `gpt-3.5-turbo` is still the right default model.
