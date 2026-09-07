# One signed-out state for every page

**Date:** 2026-09-03 · **Branch:** `redesign/gated-page-states` · **PR 9**
**Design reference:** mocks `9a` (unified panel, "which campaign?" variant, state table) and `9b`
(signed-out Home).

## The problem

Three distinct situations — *still resolving*, *signed out*, *no campaign chosen* — collapse into
whichever error-or-empty branch each page happens to own. Every page therefore shows something
different, and several show the wrong thing:

- `QuestsPage.tsx:50` tells a signed-out visitor to "select a group", but `Header.tsx:117` only
  renders `ContextSwitcher` when `user && activeGroup`. The control it names is not on screen.
- `RumorsPage.tsx` renders the full toolbar over an empty array: progress bar with three zero bands,
  search field, category chips and bulk-select. Controls that cannot act read as broken.
- `NPCsPage.tsx:23`, `NPCContext.tsx:193`, `StoryContext.tsx:751`, `LocationCreateForm.tsx:201` —
  five phrasings of two ideas, three of them written inside context files.
- `HomePage.tsx` has no signed-out branch at all: `DashboardLayout` renders five empty arrays, so a
  stranger's first impression is a stat strip of zeros.

## Scope correction

The PR description names 7 pages, and the design conversation estimated 13 routes. **An audit of
`App.tsx:56-85` found 21 campaign-gated page components** (22 route entries; `/story` and
`/story/chapters` share `ChaptersPage`), none of them auth-guarded — there is no `ProtectedRoute` in
this application, so every create and edit route is reachable while signed out and today shows
*state-3* copy ("No Active Group or Campaign") to someone in *state 2*.

The 21, by domain:

| Domain | Read | Write |
|---|---|---|
| home | `HomePage` | — |
| story | `ChaptersPage`, `StoryPage`, `SagaPage` | `ChapterCreatePage`, `ChapterEditPage`, `SagaEditPage` |
| quests | `QuestsPage` | `QuestCreatePage`, `QuestEditPage` |
| npcs | `NPCsPage` | `NPCsCreatePage`, `NPCsEditPage` |
| locations | `LocationsPage` | `LocationCreatePage`, `LocationEditPage` |
| rumors | `RumorsPage` | `RumorCreatePage`, `RumorEditPage` |
| notes | `NotesPage`, `NotePage` | — |

Two feature components carry the same copy and are corrected with their pages:
`LocationCreateForm.tsx:198-201` and `LocationEditForm.tsx:115-118`.

All 21 are in scope. The marginal cost per route is two lines once the seam exists; leaving eight of
them behind would reintroduce exactly the inconsistency this PR removes.

Not in scope: `/privacy`, `/contact`, `/profile` (not campaign-gated), and auth, registration and
the join-group flow themselves.

## 1. The state machine

Five states, one hook, the same order on every route.

| # | State | Condition | UI |
|---|---|---|---|
| 1 | `resolving` | `isResolving \|\| loading` | Skeleton. **Never** a message. |
| 2 | `signed-out` | `!user` | `GatedPageState variant="signed-out"` |
| 3 | `pick-campaign` | required context missing | `GatedPageState variant="pick-campaign"` |
| 4 | *(empty)* | data loaded, `length === 0` | today's `EmptyState`, unchanged — owned by the directory components, not by this machine |
| 5 | `error` | fetch failed | error line + Retry |
| — | `ready` | otherwise | the page's own children |

`useCampaignContextStatus()` already separates 1 from 3 (bug #1413). This PR adds the `!user` fork
ahead of it so state 2 stops borrowing state 3's copy.

State 4 deliberately stays outside the machine: an empty campaign is a *successful* load, its copy is
per-directory ("Add the first quest"), and `EmptyState.tsx` already does it well.

## 2. The seam

The PR describes a component. What the repo needs is a contract, because the thing that must be
hidden in states 2 and 3 — the create button — lives in the page *header*, above the gated body. A
wrapper that swallows children cannot reach it. So: one hook returns the state, two components
consume it.

```tsx
const gate = usePageGate('quests', { loading, error, onRetry: refreshQuests });

return (
  <PageShell
    title="Campaign Quests"
    subtitle="Track your party's epic adventures and missions"
    actions={gate.canAct && <Button onClick={/* … */}>Create Quest</Button>}
  >
    <GatedContent gate={gate}>
      <QuestDirectory quests={quests} />
    </GatedContent>
  </PageShell>
);
```

Adding a new gated page is those two lines plus one entry in the copy module. That is the whole
point of the shape.

### New files

| File | Responsibility |
|---|---|
| `shared/components/gated/gated-page-copy.ts` | one entry per page key; the only place gated wording exists |
| `shared/components/gated/usePageGate.ts` | the ladder: `useAuth` + `useCampaignContextStatus` + the copy entry |
| `shared/components/gated/GatedPageState.tsx` | the panel, both variants, presentational only |
| `shared/components/gated/useSelectableCampaigns.ts` | cross-group campaign list for variant 2 |
| `shared/components/gated/GatedContent.tsx` | renders skeleton / panel / error / children; hosts both dialogs |
| `shared/components/gated/index.ts` | barrel |
| `shared/components/page-shell/PageShell.tsx` | title, subtitle, actions, page container |
| `pages/home/signed-out-example.ts` | the frozen Home fixture |
| `pages/home/SignedOutHome.tsx` | the `9b` two-column layout |

### `usePageGate(page, options)`

```ts
type GateState = 'resolving' | 'signed-out' | 'pick-campaign' | 'error' | 'ready';

interface PageGate {
  state: GateState;
  /** `state === 'ready'`. Gates every control that acts on data. */
  canAct: boolean;
  page: GatedPageKey;
  mode: 'read' | 'write';
  copy: GatedPageCopy;
  error: string | null;
  onRetry?: () => void;
}

function usePageGate(
  page: GatedPageKey,
  options?: { loading?: boolean; error?: string | null; onRetry?: () => void;
              mode?: 'read' | 'write' }
): PageGate;
```

Evaluation order is the table above, top to bottom, with the first match winning. `resolving` folds
in the caller's `loading` so a page never has to sequence its own spinner against the gate.

Required context comes from the copy entry's `requires` field, not from a branch in the component:

- `requires: 'campaign'` — needs group **and** campaign. Six of the seven page keys.
- `requires: 'group'` — needs a group only. `notes`, because `NoteContext.tsx:51-73` fetches on
  `activeGroupId` and treats `activeCampaignId` as a filter.

### `GatedContent`

Takes `{ gate, children }`. Renders, by `gate.state`:

- `resolving` → skeleton (three pulsing blocks; no text, no spinner-with-caption)
- `signed-out` / `pick-campaign` → `GatedPageState`
- `error` → `gate.error` + a Retry button when `onRetry` was supplied
- `ready` → `children`

It mounts `SignInForm` (in a `Dialog`, matching `Header.tsx:210-219`) and `JoinGroupDialog` itself
and owns their open state. It also calls `useSelectableCampaigns(gate.state === 'pick-campaign')` and
performs the group/campaign switch, passing results and callbacks down to `GatedPageState` as props.
This is what keeps page adoption to two lines and the panel free of data dependencies.

### `GatedPageState`

One card, `max-w-[560px]`, centred in the content area, **left-aligned** text. Existing theme
classes only (`card`, `typography`, `typography-secondary`, `typography-muted`, `divider`); no
hardcoded colours.

**Purely presentational** — it calls no data hook and no Firebase service. The campaign options and
every callback (`onSignIn`, `onJoinGroup`, `onSelectCampaign`) arrive as props from `GatedContent`,
which owns the fetching, the dialogs and the switch. That is what makes the panel testable by
rendering it with a plain object instead of standing up the whole auth/group/campaign mock chain.

**`variant="signed-out"`**

1. Lock icon (`lucide-react` `Lock`, `w-4 h-4`) + `PRIVATE CAMPAIGN` — small caps, tracked, muted.
2. `h2` — `copy.heading`, or `copy.writeHeading` when `mode === 'write'`.
3. One paragraph — `copy.blurb`.
4. Primary `Sign in` (opens the `SignInForm` dialog) + secondary `I have an invite link` (opens
   `JoinGroupDialog`).
5. A hairline, then one muted line: *"New here? The Companion is a private campaign record for one
   group at a time — a DM invites you with a join link."* followed by a `What it does` link to `/`,
   which signed-out is the `9b` explainer.

**`variant="pick-campaign"`**

Same frame. Eyebrow `SIGNED IN · NO CAMPAIGN CHOSEN`. Then, by what the user actually has:

| Situation | Heading | Body |
|---|---|---|
| ≥1 campaign across their groups | `Which campaign?` | one line, then a button per campaign: name, then `· <group>` muted. Buttons, not links — selection happens *here*. |
| Groups but no campaign in any | `No campaigns yet` | one line saying a group admin creates the first one. No buttons. |
| No groups at all | `Join a group` | one line; the action is `I have an invite link` |

The list line reads *"You're in {n} campaigns. Pick one and this page fills in — you can change it
any time from the campaign name in the header."*, singular-aware.

Selection calls, in order: `await setActiveGroup(groupId)` when the campaign is in another group,
then `await setActiveCampaign(campaignId)`. `setActiveGroup` already loads that group's campaigns and
activates one (`ContextSwitcher.tsx:121-128`), so the second call lands on a settled list. Same-group
picks skip the first call. A rejection renders inline in the panel and leaves the list up.

### `useSelectableCampaigns(enabled)`

Returns `{ options, loading, error }` where an option is
`{ campaignId, campaignName, groupId, groupName }`, sorted by group name then campaign name.

Fetches `firebaseServices.campaign.getCampaigns(groupId)` once per group in `useGroups().groups`,
following the pattern in `useGroupSummaries.ts` — including its failure policy: a group whose fetch
rejects contributes no rows rather than failing the list. Fires only when `enabled`, so the six
pages that never reach state 3 pay nothing.

### `PageShell`

`{ title, subtitle?, actions?, breadcrumb?, className?, children }`. Renders the
`max-w-7xl mx-auto px-4 py-8` container and the header block that all 21 routes hand-roll today in
four different shapes.

The title is always `h1`. `ChaptersPage.tsx:135`, `NotesPage.tsx:31` and the create pages currently
use `h2` for the page title; that drift ends here. This is what makes the "page title and subtitle
render in every state" guarantee structural instead of per-page discipline.

## 3. Copy

`gated-page-copy.ts` is the only module in `src/` allowed to contain a gated-state sentence.

```ts
export interface GatedPageCopy {
  /** Heading for a read route. */
  heading: string;
  /** Heading for a create/edit route. Falls back to `heading`. */
  writeHeading?: string;
  /** One paragraph on what this page is for, in the product's voice. */
  blurb: string;
  /** Plural noun for the error line: "Couldn't load quests." */
  noun: string;
  requires: 'group' | 'campaign';
}

export type GatedPageKey =
  'home' | 'story' | 'quests' | 'npcs' | 'locations' | 'rumors' | 'notes';
```

Seven entries. Draft wording (final text is the implementer's to polish within this voice — plain,
concrete, no marketing register):

- **quests** — *Sign in to see your party's quests* / *Sign in to add a quest* — "Quests are the open
  threads of a campaign — who asked for what, which objectives are done, and what the party still
  owes. Each campaign is visible only to the group that plays it."
- **rumors** — *Sign in to hear what the realm is saying* / *Sign in to record a rumor* — "Rumors are
  the leads a party picks up in taverns and on notice boards — some true, some not, all worth writing
  down. Each campaign is visible only to the group that plays it."
- **npcs** — *Sign in to see who your party has met* / *Sign in to add an NPC* — "NPCs are everyone
  the party has dealt with: allies, patrons, rivals, and the ones nobody trusts yet. Each campaign is
  visible only to the group that plays it."
- **locations** — *Sign in to see where your party has been* / *Sign in to add a location* —
  "Locations are the places the party has visited, heard of, or is still trying to find, and what
  happened at each. Each campaign is visible only to the group that plays it."
- **story** — *Sign in to read your campaign's story* / *Sign in to write a chapter* — "The chapter
  log is the campaign told in order — one entry a session, written by whoever was at the table. Each
  campaign is visible only to the group that plays it."
- **notes** — *Sign in to read your notes* / *Sign in to write a note* — "Notes are yours alone;
  nobody else in the group can read them, not even the DM. NPCs you mention can be lifted out into
  the shared record when you're ready." — `requires: 'group'`
- **home** — *Sign in to open your campaign* — used for `pick-campaign` only; state 2 on Home renders
  `SignedOutHome` instead.

### Contexts stop producing sentences

Two files, and only two — `QuestContext`, `RumorContext` and `LocationContext` already expose
`hasRequiredContext` with no prose:

- `NPCContext.tsx:192-197` — delete the `contextError` memo; `error` becomes
  `error || writeError || null`.
- `StoryContext.tsx:751` — `contextError` becomes plain `chaptersError`.

A context returns a *state*; the page renders the words. The behavioural suites that assert those
exact strings are asserting a layering mistake and are updated to assert `hasRequiredContext` /
`missingContext` instead.

`NoteContext.tsx:145` throws `"No active campaign selected…"`. That is a programming guard behind a
control that is disabled in that state, not render copy. It stays.

**Ordering constraint:** pages must adopt `usePageGate` *before* the contexts stop emitting.
`StoryPage.tsx:161` renders `useStory().error` directly and would go blank otherwise.

## 4. No sample data outside Home

No fake rows on the entity pages. The product's credibility rests on attribution, and inventing
quests with invented authors undermines exactly that; fake rows in a live list also invite clicks
that do nothing and cost a fixture per entity type forever. On those pages the "feel" comes from one
honest sentence each.

## 5. Signed-out Home — `9b`

`HomePage` branches once: `gate.state === 'signed-out'` renders `<SignedOutHome />` standalone —
*not* inside `PageShell`, because `9b`'s `h1` is the product's headline, not a page title. Every
other state goes through `PageShell` + `GatedContent`, including `pick-campaign`.

**Left column** — `h1` *Everything your table agreed happened, in one place*; one paragraph (what it
is, who writes it, that a campaign is visible only to its group and joining is by invite);
`Sign in` + `I have an invite link`; then three plain product lines (chapter log · quests and rumors ·
private notes with NPC extraction). No feature grid, no icons in circles.

**Right column** — one static example panel: an `Example campaign` chip plus the line *a picture, not
a demo — nothing here is clickable*, then a campaign title, a four-cell stat strip, and three
"Since you last played" rows.

Constraints on the fixture, because this is the thing that rots:

- One hard-coded fixture in `pages/home/signed-out-example.ts`, Home only, `as const`. Never derived
  from real data, never fetched.
- Built from published module content (*The Sunless Citadel*), not invented campaign fiction.
- **No usernames and no character attribution.** The fixture's TypeScript type carries no author
  field at all, so invented attribution is unrepresentable rather than merely absent.
- Nothing clickable inside the panel; the panel is `aria-hidden="true"`. The chip and its label are
  real text *outside* the hidden subtree. A screen-reader user gets the left column, which says the
  same things in words.
- The chip is always visible, never a hover-reveal.
- If it drifts from what the app renders, that is a bug in this fixture, not a reason to wire it to
  live data. A comment in the file says so.

## 6. Controls that cannot work

Already done on `main`, verified, no work required:

- Header search — `Header.tsx:139-145` gates `SearchTrigger` on `user`, and the `Meta+K` shortcut
  with it (`Header.tsx:51-73`). PR 6 landed.
- Global create button — `GlobalActionButton.tsx:115` returns `null` when `!hasRequiredContext`,
  which covers signed-out. PR 7 landed.

Remaining in this PR: every per-page control that acts on data — create buttons, filters, sorts,
progress bars, bulk-select, view toggles — is gated on `gate.canAct`. Navigation stays visible; it is
how someone arrives at these pages, and each page now explains itself.

## 7. Testing

Baseline on this branch before any change: **235 suites / 4717 tests, 0 failed, 2 skipped.** Any red
is a regression.

New suites, one per new module: `gated-page-copy` (every key has every required field; `notes` is the
only `group`), `usePageGate` (each of the five states, and precedence between them),
`GatedPageState` (both variants, the three `pick-campaign` situations, the `write` heading),
`useSelectableCampaigns` (cross-group merge, per-group failure isolation, `enabled` gating),
`GatedContent` (renders the right branch; dialogs open), `PageShell` (title is `h1`; actions hidden
when falsy), `signed-out-example` (no author-shaped keys anywhere in the fixture — a structural
assertion, not a string match), `SignedOutHome` (panel is `aria-hidden`, chip is not, nothing
focusable inside the panel).

Per route, the existing suite gains: signed-out renders the panel and not the toolbar; `isResolving`
renders no message; title and subtitle render in all five states.

Rumors specifically asserts the absence of the progress bar, chips, search field and bulk-select
while signed out — the DoD line that motivated the PR.

## 8. Definition of done

- [ ] All 21 gated routes render the same signed-out panel, differing only in heading and one sentence.
- [ ] No route tells a user to "select a group" when no switcher is visible to them.
- [ ] Signed-out Rumors shows no progress bar, chips, search or bulk-select.
- [ ] Signed-out Home renders the `9b` layout, not a dashboard of zeros.
- [ ] The Home example is one static fixture, labelled, unclickable, with no invented authorship.
- [ ] The "no campaign" state lists the user's actual campaigns, across groups, as choices.
- [ ] Page `h1` + subtitle render in every state; nothing acts on data in states 2 and 3.
- [ ] No user-facing gated wording remains in a context file.
- [ ] `isResolving` shows a skeleton — no message flashes during restore.
- [ ] Header search and the create button are absent while signed out (verify; already true).
- [ ] `npx tsc --noEmit`, `npm test` (≥ baseline, 0 failed) and `npm run build` all pass.
