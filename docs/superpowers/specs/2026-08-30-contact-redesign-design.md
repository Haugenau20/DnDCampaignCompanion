# Contact page redesign — design

**Date:** 2026-08-30
**Branch:** `redesign/contact` (off `main` at `a2e0624`)
**PR:** 2 of the redesign series. Design reference: screenshot `5a`.

This document does not restate the PR description, which is the spec. It records the
decisions the spec leaves open, so that six independently-dispatched implementation
agents converge on one contract instead of six plausible ones.

---

## 1. What is actually wrong today

Three facts drive every decision below.

**The page is a column of instructions the reader has already scrolled past.** `ContactPage`
is a `max-w-5xl` three-column grid with a `max-w-md mx-auto` form floating in the left
two-thirds and four prose blocks in the right third. Three of the four blocks tell the user
what to type into the message field; by the time the cursor is in the textarea they are off
to the side and above. The fourth holds the only fact on the page — the 1–2 week response
time — in position two, styled identically to the other three.

**The subject is a category wearing a string's clothes.** `EntityExtractionService.ts:132`
deep-links `prefilledSubject: "Smart Detection Limit Increase Request"`, and `ContactForm`
recognises it three separate times with `prefilledSubject.includes('Limit Increase')`
(lines 79, 240, 335). A fixed set of intents is being round-tripped through free text and
recovered by substring match.

**The form can hang permanently.** `ContactForm`'s init effect checks
`registry.has('functions')`, retries exactly once after 1 s, and otherwise sets a terminal
error while the submit button reads `Initializing…` forever. There is no third chance.

---

## 2. Module boundaries

`ContactForm.tsx` is 380 lines before any of this work. Every section of the spec adds to
it. It becomes a folder; `ContactForm.tsx` keeps its current path so `ContactPage`, the
deep links and the existing test module path do not move.

```
src/shared/components/
├── ContactForm.tsx              # composes; owns validation, payload, submit
└── contact/
    ├── contact-categories.ts    # the category model + legacy-subject mapping
    ├── CategoryChips.tsx        # single-select pill radiogroup
    ├── SenderIdentity.tsx       # prefilled identity, or plain inputs
    ├── ContactSuccess.tsx       # the confirmation card
    └── useFunctionsReady.ts     # bounded polling for the functions service
```

Each unit answers the three questions cleanly:

| Unit | What it does | Depends on |
|---|---|---|
| `contact-categories.ts` | Declares the five categories and maps a legacy `?subject=` string onto one | nothing — pure data |
| `CategoryChips` | Renders the chips, reports the selected id | the category list, `Typography` |
| `SenderIdentity` | Decides whether to show the prefilled row or the inputs, and reports name + email | `useAuth`, `useGroups` (barrel) |
| `ContactSuccess` | Renders the reference and the two actions | `useNavigation`, `useCampaigns` (barrel) |
| `useFunctionsReady` | Answers "is the callable available yet" without hanging | `ServiceRegistry` |
| `ContactForm` | Assembles them, validates, builds the payload, calls the function | all of the above |

`shared/` importing `features/user-management`'s **barrel** is the amended rule #3 in
CLAUDE.md — explicitly permitted, and `ContactForm` is exactly the kind of cross-cutting
component that amendment was written for. No import may reach into a feature's internals.

---

## 3. The category model

Declared once here. Mirrored in two places, deliberately — see §4.

| id | Chip label | Subject label | Extra field | Guidance card |
|---|---|---|---|---|
| `broken` | Something is broken | Bug report | — | "For a bug, three things help most: what you clicked, what happened, and what you expected instead." |
| `feature` | Feature idea | Feature request | — | "Describe the feature and how it would improve your experience — what you're trying to do matters more than how you'd build it." |
| `smart-detection` | More smart detection | Smart detection limit increase | **"Why do you need more?"** | "Tell us roughly how much you scan and what for. That's what we weigh when raising a limit." |
| `account` | Account or group | Account or group | — | none |
| `other` | Something else | General enquiry | — | none |

**`account` and `other` deliberately have no guidance card.** The spec's principle is that
guidance appears "next to the field it governs, only when it applies". Inventing filler
copy for two categories that need none would rebuild the permanent column of prose in a
new location.

**The extra field replaces the asterisk fences.** The canned message with the
`*************` block that the user is expected to type between is deleted outright. For
`smart-detection`, a labelled second input — "Why do you need more?" — carries the same
information as a real field.

The extra field is **optional**. The only required inputs are a category and a message of at
least 10 characters (plus name and email when signed out). Making `reason` required would
reintroduce, as a validation error, the same "fill in this block" obligation the asterisk
fences imposed. It is sent as `reason` when non-empty and omitted when blank.

### Legacy deep links

`categoryFromLegacySubject(subject: string): ContactCategoryId | null` returns
`'smart-detection'` when the string contains `Limit Increase`, else `null`. `?subject=`
keeps working; nothing at the two call sites
(`EntityExtractionService.ts`, `CampaignLinksPanel.tsx`) changes in this PR.

When `?subject=` carries a string that maps to no category, the value is passed through as
the free-text `subject` and no chip is preselected — an unknown deep link degrades to the
old behaviour rather than silently mislabelling itself.

---

## 4. The payload contract

```ts
interface ContactSubmission {
  category: ContactCategoryId;   // new; the real field
  subject?: string;              // kept, and still sent — see back-compat below
  message: string;
  reason?: string;               // smart-detection only
  name: string;
  email: string;
  context?: {
    groupId: string | null;
    campaignId: string | null;
    route: string | null;        // where the user came FROM, not "/contact"
    appVersion: string;
  };
}
```

Response: `{ success: boolean; message: string; reference?: string }`.

### Two back-compat guards, because the two halves deploy separately

The frontend deploys on merge to `main`; the Firebase Function deploys on its own schedule.
Either half can be live against the other's previous version, so neither may assume the
other has been updated.

1. **The client still sends `subject`**, set to the selected category's subject label. An
   old function that ignores `category` therefore still produces
   `D&D Campaign Contact: Bug report` rather than the generic fallback.
2. **The client treats `reference` as optional.** If it is absent, the success card renders
   without the reference line — never `CC-undefined`.

Symmetrically, the function keeps `subject` accepted and optional, and falls back
`category` → `subject` → generic when composing the email subject.

### Why the category list is duplicated

`firebase/functions/` is a separate npm package with its own `tsconfig`; it cannot import
from `src/`. The five ids and their subject labels are therefore written out in both
`src/shared/components/contact/contact-categories.ts` and
`firebase/functions/src/contact.ts`. This is a stated duplication with a single source of
truth in §3 above, not an oversight. The function validates the incoming `category` against
its own copy and falls back rather than trusting it.

### The reference

`CC-` followed by four digits, generated per submission in the function, placed in the
email subject and body, and returned to the client. Nothing is persisted: the reference
exists so a human can find the thread in an inbox. Persisting it would be the ticketing the
spec puts out of scope.

---

## 5. Initialisation, replacing the single retry

`useFunctionsReady()` polls `ServiceRegistry.getInstance().has('functions')` every 250 ms
for up to 5 s and returns `{ ready, failed }`.

- The submit button stays **enabled** throughout. It no longer reads `Initializing…`.
- `failed` surfaces an error only after the full window elapses — a real failure, not a
  slow start.
- Submitting before `ready` is not an error state to pre-empt: the callable is fetched at
  submit time, so a submission that arrives during the window simply resolves.
- **`failed` does not block submit either.** The user may still press Send; the registry may
  have recovered since the window closed, and if it genuinely has not, the submit path's own
  error handling reports it. `failed` informs the user, it does not lock the form.

Polling with an interval rather than one `setTimeout` is what makes this testable with fake
timers; the current code's single 1 s retry cannot be exercised deterministically.

---

## 6. Identity, and the route problem

Signed in, `SenderIdentity` renders the avatar, `Sending as {username} · {email}`, the
sub-line about attached context, and a **Use a different email** action that reveals the
plain name/email inputs. `username` comes from `useGroups().activeGroupUserProfile`, email
from `useAuth().user`. Signed out, it renders the inputs exactly as today.

**`route` cannot be read from `useLocation()`.** By the time the form renders, the current
route *is* `/contact`, which tells the reader nothing. The originating path is passed by the
entry point as `?from=<encoded path>` and read from the query string. When absent — the user
reached `/contact` from the footer, or typed it — `route` is `null` rather than a misleading
`/contact`.

`appVersion` needs a source that does not exist in the repo today. `src/core/constants/app.ts`
exports `APP_VERSION = process.env.REACT_APP_VERSION || "0.1.0-dev"`.

---

## 7. Validation and the success state

**The 10-character minimum is enforced on blur and on submit, never on keystroke.** The
counter (`124 characters`) is live from the first character; the *error* waits until the
user has stopped typing or tried to send. A minimum announced only in a placeholder — which
disappears the moment the user types — is the failure being fixed.

**Success no longer replaces the page.** `submitSuccess` stops being an early `return`.
The confirmation card renders above the form, and the form keeps its content: the user can
still read and copy what they sent. `Back to {campaign}` navigates away.

`Write another` clears the message, the extra `reason` field and the reference, and
dismisses the card. It **keeps the selected category** and the identity: someone writing a
second time is usually writing about the same area, and re-picking a chip they just picked
is friction with nothing behind it.

`handleSendAnother`'s non-limit-increase branch is unreachable today — `handleSubmit`
already blanked every field before it could run. It is deleted rather than ported.

---

## 8. Entry point

Header's Account row currently holds Profile / Groups / Admin ghost buttons. A fourth,
**Report a problem**, navigates to `/contact?from=<current path>`, carrying a
`// TODO(PR 4)` noting that this moves into the new profile menu when that lands.

---

## 9. Out of scope, and why

**Attachments are not in this PR.** A screenshot is the single biggest quality win for a bug
report, so this is a real loss, taken deliberately: wiring it means Firebase Storage rules,
size and type limits, orphan cleanup, and a new failure mode on submit — none of which this
PR otherwise touches. Per the spec's own rule, no disabled control is shipped in its place.
The idea and this reasoning are recorded in `todo.txt` so the trade-off is not re-derived
from scratch.

Also out of scope: email templating beyond subject/category composition, ticketing or
persistence of submissions, and any change to the Functions deployment setup.

---

## 10. Testing

New suites: `contact-categories.test.ts` (pure), `useFunctionsReady.test.ts` (fake timers),
`CategoryChips.test.tsx`, `SenderIdentity.test.tsx`, `ContactSuccess.test.tsx`.
Rewritten: `ContactForm.test.tsx` (428 lines today), `ContactPage.test.tsx` (168).
Extended: `Header.test.tsx`.

The suite baseline is fully green — 0 failed across 185 suites. Any red is a regression to
fix, never a marker to accept.

Verification is all three gates, because they disagree: `npx tsc --noEmit`, `npm test`, and
`npm run build`. Only the third catches a `@/` alias import, which webpack ignores `paths`
for. Nothing here runs under `ts-node`, so that fourth resolver does not apply.
