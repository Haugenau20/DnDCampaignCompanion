# Profile page and header menu — implementation plan

> **Execution model:** this plan is executed by **Sonnet subagents**, one task per subagent, with
> Opus as orchestrator and reviewer. Read "How this plan is executed" before dispatching anything.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the profile a real URL, split its 797-line component along scope boundaries, move
theme to the account, make the destructive actions say what they destroy — and fix the reason those
two actions cannot currently work at all.

**Architecture:** Three layers move. In `core/services`, the two callables the profile needs stop
being reached through a bare `getFunctions()` (wrong region) and start going through the services
that already hold a correctly-regioned `Functions`. In `features/user-management/profiles`, one
component becomes nine components and four hooks, each owning one scope. In `app/`, the hamburger
menu and both profile-dialog mounts are replaced by one named account menu in
`shared/components/user-menu/`, built on the popover contract PR 3 already wrote and tested.

**Tech Stack:** React 18.2 + TypeScript, Firebase 11.3 (Firestore incl. `getCountFromServer`,
Functions in `europe-west1`), TailwindCSS with a token-based theme system, Jest + React Testing
Library, `lucide-react`, `clsx`, `react-router-dom` v6.

**Spec:** `docs/superpowers/specs/2026-09-01-profile-page-design.md`. This plan argues from it and
does not restate it. Each task's brief carries the spec facts that task needs, so a subagent does
**not** have to read the whole spec to work — but it must read the sections its brief names.

---

## How this plan is executed

### Roles

| Role | Who | Does |
|---|---|---|
| **Orchestrator / reviewer** | Opus, the main session | Dispatches one brief per task, reviews every diff, runs the batch gate, writes every commit, owns Task 11 |
| **Implementer** | Sonnet subagent, one per task | Executes exactly one task's steps, runs that task's targeted tests, reports back. **Never commits, never pushes, never touches a file outside its allow-list** |

A subagent starts cold: it has no memory of the design conversation and no reason to know this
repo's conventions. Everything it needs is in its brief. If a brief turns out to be missing
something, that is an orchestrator bug — fix the brief in this file, then re-dispatch.

### Batches

Two subagents run at a time, at most. Batches are cut so that the two agents in a batch have
**disjoint file allow-lists** — that is what makes it safe for them to share one working tree, and
what lets the orchestrator stage each task's paths into its own commit afterwards.

| Batch | Tasks | Parallel? | Why they can share a tree |
|---|---|---|---|
| 1 | 1, 3 | Yes | Task 1 owns the services + `UserProfile.tsx` handlers; Task 3 owns `Header.tsx` + `UserProfileButton.tsx` |
| 2 | 2, 4 | Yes | Task 2 owns `UserProfile.tsx` validation; Task 4 creates `pages/profile/` and adds one route line |
| 3 | 5 | No | The split touches every profile file at once |
| 4 | 6, 7 | Yes | Task 6 owns `AccountCard` + `GroupMembershipCard` + the join hook; Task 7 owns `AppearanceCard` + `SessionManager` + `core/types/user.ts` |
| 5 | 8, 9 | Yes | Task 8 owns `CharacterRow` + `useCharacterRoster`; Task 9 owns the danger zone + `DocumentService` |
| 6 | 10 | No | Rewrites the header and deletes two files |
| — | 11 | Orchestrator | The record of what actually happened; not delegated |

**Task 2 and Task 1 both touch `UserProfile.tsx` and must not run together.** Task 2 is in batch 2
for exactly that reason.

### The commit protocol

Subagents leave their work in the working tree and report. They do **not** run `git commit`,
`git add`, `git push`, `git checkout` or `git stash` — a subagent that commits makes the batch
unreviewable and can strand its partner's uncommitted work.

After each batch the orchestrator:

1. Reads the full diff for each task's allow-list, separately.
2. Runs the batch gate (below).
3. Stages **one task's paths at a time** and writes that task's commit, in task order.

### The batch gate

Run by the orchestrator after every batch, never by a subagent:

```bash
npx tsc --noEmit
npm test
```

and, before proposing the merge, once at the end:

```bash
npm run build
```

`npm run build` is not implied by the other two: `react-scripts`' webpack honours tsconfig
`baseUrl` but ignores `paths`, so an `@/…` import passes `tsc` and jest and then fails the
production build.

**Baseline: 0 failed / 2 skipped / 4543 passed / 4545 total across 209 suites**, measured on `main`
at `b73232a` during batch 1. Any red is a regression.

**Running total after each batch** — compare against the row above yours, and reconcile the delta
against what the diffs actually added. A delta that does not reconcile is a finding.

| After batch | Suites | Passed | Total | Delta | Accounted for by |
|---|---|---|---|---|---|
| baseline | 209 | 4543 | 4545 | — | — |
| 1 (tasks 1, 3) | 209 | 4548 | 4550 | +5 | GroupService +1, UserService +3, Header +1 |
| 2 (tasks 2, 4) | 211 | 4565 | 4567 | +17 | UserProfile +5, ProfilePage +8, ProfileSectionRail +3, App +1 |

> CLAUDE.md records 4538/4540 for this commit and is **stale** — it was measured on
> `redesign/context-switcher` before that branch merged. Task 11 corrects it. Compare against the
> number above, and against the previous batch's number thereafter.

### Review checklist — what the orchestrator checks on every returned diff

Sonnet is good at these tasks and bad at noticing when a task quietly became a different task. Check:

- [ ] **No file outside the allow-list was touched.** `git status --short` against the brief.
- [ ] **No test was weakened.** Diff every `__tests__` change. An assertion that got looser, a
      `toBe` that became `toBeTruthy`, a removed case, a `skip` — all are regressions dressed as
      progress. The only legitimate test deletions in this plan are named in Tasks 5 and 10.
- [ ] **The tests actually ran and actually failed first.** The report must quote the failing run.
      A test that passed before the implementation was written is testing nothing.
- [ ] **No `@/…` import in shipping code.** Allowed only under `__tests__/` and `test-utils/`.
- [ ] **No hardcoded colour.** Hex, `rgb(`, or a Tailwind palette class like `text-red-500`.
- [ ] **No barrel self-import inside `features/user-management/`** — that is a circular import; the
      domain's own files import siblings directly.
- [ ] **JSDoc on every exported component, hook and function**, and double quotes per ESLint.
- [ ] **No file over ~400 lines**, per the DoD.

### The constraints block

Every brief opens with this block, verbatim. It is repeated per task on purpose: a cold subagent
that has to go looking for the rules will invent them instead.

> **Repo constraints — read before writing any code**
>
> 1. **Never edit a test to make it pass.** Tests define expected behaviour. If a test fails, the
>    code is wrong, or the test is describing something the plan changed on purpose — in which case
>    stop and report, do not edit.
> 2. **No hardcoded colours.** Use theme tokens or the existing utility classes: `card`,
>    `card-divider`, `dropdown`, `dropdown-item`, `dropdown-item-active`, `chip`, `chip-selected`,
>    `callout-emphasis`, `error-bg`, `delete-button`, `form-error`, `form-success`, `success-icon`,
>    `typography`, `typography-secondary`, `typography-muted`, `typography-error`, `button-primary`,
>    `button-outline`, `button-ghost`, `button-link`, `bg-secondary`, `selectable-item`, `divider`,
>    `tag`, `hint`, `toast`.
> 3. **No `@/…` imports in shipping code** — webpack ignores tsconfig `paths` and the production
>    build fails on them. Use bare specifiers rooted at `src/`: `core/components/Button`,
>    `shared/hooks/useNavigation`, `features/user-management`. `@/…` is allowed **only** inside
>    `__tests__/` and `test-utils/`.
> 4. **Inside `features/user-management/`, import siblings directly.** Importing that domain's own
>    `index.ts` from inside it is a circular import.
> 5. **Double quotes** (ESLint). **JSDoc** on every exported component, hook and function.
> 6. **Do not run any `git` command.** Leave your work in the working tree and report. To capture a
>    failing run you never need one: write the test, run it, *then* write the implementation. If you
>    have already written the implementation and want the failure, comment your change out, run, put
>    it back — never `git stash`, which in a shared tree can carry off another agent's work.
> 7. **Touch only the files in your allow-list.** If the task appears to need another file, stop and
>    report rather than widening.
> 8. **Run only your task's targeted tests**, with the command in your brief. The orchestrator runs
>    the full suite.

### Known test-infrastructure traps

Found the hard way during this plan's own execution. Each one produces a test that **passes while
proving nothing**, which is the failure mode this whole review structure exists to catch.

- **Mocking `core/services/firebase` needs `__esModule: true`.** A component doing
  `import firebaseServices from "core/services/firebase"` goes through TypeScript's
  `__importDefault` interop helper. Without `__esModule: true` on the mock factory's return, the
  helper double-wraps it and `firebaseServices.group` is `undefined` inside the component —
  swallowed by the handler's `try/catch` and surfaced as an unrelated error message rather than a
  crash. It looks fine from a `require(...).default` in a debug line, because that bypasses the
  helper. `shared/components/context-switcher/__tests__/ContextSwitcher.test.tsx` has the correct
  pattern. *(Found in Task 1.)*
- **`Header.test.tsx`'s `Dialog` mock renders `title` as `aria-label` only**, never as text. Assert
  on the accessible name (`getByRole("dialog", { name: … })`); a `queryByText` for the title passes
  against broken code too. *(Found reviewing Task 3 — the agent's own assertion had this bug.)*
- **`IntersectionObserver` does not exist in jsdom.** Anything using it needs a shim or a
  feature-detected fallback. `ProfileSectionRail` feature-detects. *(Task 4.)*
- **`ProfilePage.test.tsx` stubs `UserProfile`**, so any assertion about what is *inside* the
  profile — the `Close` button included — passes trivially there. The DoD guard for "no `Close`
  button below `Delete account`" therefore belongs to `DangerZoneCard`'s own suite in Task 9, where
  the real component renders. The page-level test is scoped and renamed to say it only guards the
  shell. *(Caught reviewing Task 4.)*
- **The App routing suite is `src/__tests__/App.test.tsx`**, not `src/app/__tests__/`. It asserts an
  **exact** `EXPECTED_ROUTES` list and mocks every page module, so adding a route requires adding
  both a `jest.mock` and a list entry, or the suite fails. *(Task 4.)*
- **A `checking`-style in-flight flag does not cover a debounce window.** Between a keystroke and
  the debounced call, nothing is in flight and the previous verdict is still in state. Reset the
  verdict when the input changes, not when the request starts. *(Task 2 — its own author flagged
  the gap; the fix and a test that fails without it landed in review.)*

---

## File Structure

**Created**

| File | Responsibility | Task |
|---|---|---|
| `src/pages/profile/ProfilePage.tsx` | Shell: back link, `h1`, subtitle, two-column grid, section ids, states | 4 |
| `src/pages/profile/ProfileSectionRail.tsx` | Sticky rail; tracks the visible section, anchors to it | 4 |
| `src/pages/profile/index.ts` | Barrel for the route import | 4 |
| `…/profiles/components/AccountCard.tsx` | Email, groups you're in, `Join another` | 5, 6 |
| `…/profiles/components/GroupMembershipCard.tsx` | Group name + role pill, name-in-group, posting-as row | 5, 6 |
| `…/profiles/components/UsernameEditor.tsx` | The inline edit and its four validation states | 5 |
| `…/profiles/components/CharactersCard.tsx` | List, add row, card-level copy | 5 |
| `…/profiles/components/CharacterRow.tsx` | One character: star, name, labelled actions, inline confirm, own error | 5, 8 |
| `…/profiles/components/AppearanceCard.tsx` | Three theme option cards | 5, 7 |
| `…/profiles/components/DangerZoneCard.tsx` | Two rows, their sentences, their buttons | 5, 9 |
| `…/profiles/components/LeaveGroupDialog.tsx` | Confirmation, from a page | 5, 9 |
| `…/profiles/components/DeleteAccountDialog.tsx` | Confirmation gated on typing the account email | 5, 9 |
| `…/profiles/hooks/useCharacterRoster.ts` | Character state, four mutations, per-row errors | 5, 8 |
| `…/profiles/hooks/useUsernameEditor.ts` | Debounced validation; `null` means "not yet checked" | 5 |
| `…/profiles/hooks/useAccountTheme.ts` | Read/write the account theme | 7 |
| `…/profiles/hooks/useGroupFootprint.ts` | The counts the leave sentence needs | 9 |
| `…/groups/hooks/useJoinGroupCompletion.ts` | The one landing behaviour for a successful join | 6 |
| `src/shared/components/user-menu/UserMenu.tsx` | Trigger + popover; owns open state | 10 |
| `src/shared/components/user-menu/UserMenuTrigger.tsx` | Avatar + posting-as name + chevron | 10 |
| `src/shared/components/user-menu/PostingAsList.tsx` | Character rows, check on the current | 10 |
| `src/shared/components/user-menu/ThemeSegmented.tsx` | `Light` / `Dark` / `Med.` | 10 |
| `src/shared/components/user-menu/UserMenuLinks.tsx` | Profile, members count, report, admin, sign out | 10 |
| `src/shared/hooks/usePopoverKeys.ts` | **Moved** from `shared/components/context-switcher/` | 10 |

**Modified**

| File | Change | Task |
|---|---|---|
| `src/core/services/firebase/group/GroupService.ts` | `removeUserFromGroup` uses `this.functions` | 1 |
| `src/core/services/firebase/user/UserService.ts` | `+ deleteAccount(userId)` | 1 |
| `src/core/services/firebase/data/DocumentService.ts` | `+ getCollectionCount(path)` | 9 |
| `src/core/types/user.ts` | `UserProfile.preferences?: { theme?: string }` | 7 |
| `…/auth/components/SessionManager.tsx` | Account theme, with one-time migration | 7 |
| `src/features/user-management/index.ts` | `- UserProfile`, `+` the cards and hooks the page needs | 5, 6, 9 |
| `src/app/App.tsx` | `+ <Route path="/profile" …>` | 4 |
| `src/app/layout/Header.tsx` | Title fix (3); then hamburger + mounts replaced by `UserMenu` (10) | 3, 10 |
| `…/context-switcher/ContextSwitcher.tsx` | `usePopoverKeys` import path | 10 |
| `CLAUDE.md` | What this PR changed | 11 |

**Deleted**

| File | Reason | Task |
|---|---|---|
| `…/profiles/components/UserProfile.tsx` | Becomes the nine components above (spec §9.2) | 5 |
| `…/profiles/components/__tests__/UserProfile.test.tsx` | Every test rehomed; see Task 5 Step 1 | 5 |
| `…/auth/components/UserProfileButton.tsx` | Dead code superseded by `UserMenu` (spec §9.1) | 10 |
| `…/auth/components/__tests__/UserProfileButton.test.tsx` | Its component is gone | 10 |
| `…/context-switcher/usePopoverKeys.ts` + its test | Moved to `shared/hooks/` | 10 |

---

## Task → Commit Map

| Task | Batch | Commit subject |
|---|---|---|
| 1 | 1 | `fix(profile): call the callables in the region they are deployed to` |
| 2 | 2 | `fix(profile): stop the username editor starting in a valid state` |
| 3 | 1 | `fix(profile): stop the dialog title reading undefined's profile` |
| 4 | 2 | `feat(profile): a page at /profile` |
| 5 | 3 | `refactor(profile): split the profile into per-section cards` |
| 6 | 4 | `feat(profile): scope the cards, and say which scope each one is` |
| 7 | 4 | `feat(profile): store the theme on the account, not the membership` |
| 8 | 5 | `feat(profile): label the character actions and confirm removal` |
| 9 | 5 | `feat(profile): say what leaving and deleting actually affect` |
| 10 | 6 | `feat(header): one named account menu` |
| 11 | — | `docs(profile): record what the redesign changed` |

Tasks 1–3 are standalone bug fixes: if the redesign is deferred, they still ship.

---

## Task 1 — Call the callables in the region they are deployed to

**Batch 1, parallel with Task 3.**

### Brief

> **Repo constraints** — the block in "How this plan is executed". Read it first.

**What you need to know (verified; do not re-derive):**

- `src/features/user-management/profiles/components/UserProfile.tsx` lines **138** and **173** call
  bare `getFunctions()`. With no arguments the Firebase JS SDK resolves the **default region,
  `us-central1`**.
- **Every** Cloud Function in this repo is deployed to `europe-west1` — all seven `onCall`
  declarations under `firebase/functions/src/`, including `deleteUser`
  (`firebase/functions/src/userManagement/deleteUser.ts:12`) and `removeUserFromGroup`
  (`…/removeUserFromGroup.ts:8`).
- `src/core/services/firebase/core/BaseFirebaseService.ts:49` builds
  `getFunctions(app, 'europe-west1')` and line **80** registers it as `"functions"`. That same
  instance is what gets `connectFunctionsEmulator` applied in development, so the bare call misses
  the emulator too.
- Every service extending `BaseFirebaseService` therefore already has `this.functions`, correctly
  regioned. `src/shared/components/ContactForm.tsx:166` shows the component-side equivalent
  (`ServiceRegistry.getInstance().get<Functions>("functions")`).
- `GroupService.removeUserFromGroup` (`src/core/services/firebase/group/GroupService.ts:150`) has
  the same defect inside the service itself.
- **This is not a style cleanup. Leave group and delete account cannot work today**, in production
  or in local dev.

**Files you may touch:**

```
src/core/services/firebase/group/GroupService.ts
src/core/services/firebase/user/UserService.ts
src/core/services/firebase/group/__tests__/GroupService.test.ts        (create if absent)
src/core/services/firebase/user/__tests__/UserService.test.ts          (create if absent)
src/features/user-management/profiles/components/UserProfile.tsx       (the two handlers only)
src/features/user-management/profiles/components/__tests__/UserProfile.test.tsx  (the two callable tests only)
```

**Files you must NOT touch:** anything else. In particular **do not** fix the same bug in
`GroupService.createGroup` (line 59) or `CampaignService.deleteCampaign` (line 243) — they are real,
they are out of scope, and Task 11 records them. Do not touch `Header.tsx` or
`UserProfileButton.tsx`; another agent owns them in this batch.

**Targeted test command:**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(GroupService|UserService|UserProfile)"
```

### Steps

- [ ] **Step 1: Write the failing tests**

`GroupService.test.ts`:

```
describe("removeUserFromGroup")
  test("uses the service's regioned Functions instance, not a fresh getFunctions()")
    → assert httpsCallable received the instance BaseFirebaseService registered,
      and that the module-level getFunctions was NOT called during the method
```

`UserService.test.ts`:

```
describe("deleteAccount")
  test("invokes the deleteUser callable with the user id")
  test("uses the service's regioned Functions instance")
  test("propagates the callable's error")
```

- [ ] **Step 2: Run them and watch them fail.** Quote the failure in your report. `removeUserFromGroup`'s
      test fails because the method calls `getFunctions()`; `deleteAccount`'s three fail because the
      method does not exist.

- [ ] **Step 3: Fix `GroupService.removeUserFromGroup`** — replace the local
      `const functions = getFunctions();` with `this.functions`.

- [ ] **Step 4: Add `UserService.deleteAccount`**

```ts
/**
 * Delete the caller's account and everything owned by it.
 *
 * Goes through the `deleteUser` Cloud Function because Firestore cannot
 * cascade-delete subcollections from a client, and through `this.functions`
 * because that is the instance bound to `europe-west1`, where every function
 * in this project is deployed. A bare `getFunctions()` resolves `us-central1`
 * and reaches nothing — and in development it also misses the emulator, which
 * `BaseFirebaseService` wires to the regioned instance only.
 *
 * @param userId UID to delete; the function permits self-deletion, and
 *   deletion of others only for a global admin
 */
public async deleteAccount(userId: string): Promise<void>
```

- [ ] **Step 5: Point the component at the services.** In `UserProfile.tsx`, delete the
      `firebase/functions` import. `handleGroupLeave` calls
      `firebaseServices.group.removeUserFromGroup(activeGroupId, user.uid)`; `handleAccountDelete`
      calls `firebaseServices.user.deleteAccount(user.uid)`. **Change nothing else in the file** —
      the `onCancel()` / `window.location.href` sequence is Task 9's, not yours.

      `UserProfile.test.tsx` mocks `firebase/functions` and asserts on `mockCallable`. Two tests —
      `should call the leave group callable when confirmed` and `should call httpsCallable deleteUser
      when Delete My Account is confirmed` — now watch the wrong seam. Re-point them at the mocked
      **service** methods. This is not weakening them: the assertion "the callable was invoked"
      survives verbatim one layer down, where it can also prove the region. Touch no other test.

- [ ] **Step 6: Run the targeted tests; all green.**

### Report back

Failing-run output from Step 2, the final test run, the list of files you changed, and anything in
the brief that turned out to be wrong.

---

## Task 2 — Stop the username editor starting in a valid state

**Batch 2, parallel with Task 4.**

### Brief

> **Repo constraints** — the block in "How this plan is executed". Read it first.

**What you need to know:**

- The debounce effect starts at `UserProfile.tsx:91`. Its guard is line **92**:
  `if (!isEditingUsername || !newUsername || !activeGroup || newUsername === activeGroupUserProfile?.username)`,
  and lines **93–94** set `setUsernameValid(true); setUsernameAvailable(true);`.
- So opening the editor starts in a *passing* state, and `Save` is briefly enabled against a name
  nothing has checked.
- `Save`'s `disabled` expression already reads `!usernameValid || !usernameAvailable`, so `null`
  disables it with no further change. That is the whole fix: `null` means "not yet checked".
- The unchanged-name case keeps its behaviour — `newUsername === activeGroupUserProfile.username`
  is already its own clause in `disabled`.

**Files you may touch:**

```
src/features/user-management/profiles/components/UserProfile.tsx                 (validation only)
src/features/user-management/profiles/components/__tests__/UserProfile.test.tsx  (add tests only)
```

**Files you must NOT touch:** anything else, and inside `UserProfile.tsx` do not touch the leave /
delete handlers — Task 1 has just changed them.

**Targeted test command:**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="UserProfile"
```

### Steps

- [ ] **Step 1: Write the failing tests**

```
describe("username validation")
  test("Save is disabled immediately after the editor opens")
  test("Save is disabled while a check is in flight")
  test("Save enables only once a check has come back valid and available")
  test("Save is disabled again when the name is edited after a passing check")
```

- [ ] **Step 2: Run them.** The first, second and fourth fail. Quote the failure.

- [ ] **Step 3: Initialise both flags to `null`** and set them to `null` — not `true` — in the
      early-return branch. Add `checking` to `Save`'s `disabled` expression, so a name edited inside
      the debounce window cannot leave a stale pass on screen.

- [ ] **Step 4: Run the targeted tests; all green**, including every pre-existing username test.

### Report back

As Task 1.

---

## Task 3 — Stop the dialog title reading undefined's profile

**Batch 1, parallel with Task 1.**

### Brief

> **Repo constraints** — the block in "How this plan is executed". Read it first.

**What you need to know:**

- Two files carry this line verbatim — `src/app/layout/Header.tsx:359` and
  `src/features/user-management/auth/components/UserProfileButton.tsx:93`:

```tsx
title={`${activeGroupUserProfile?.username}'s profile` || 'Your Profile'}
```

- A template literal is **always truthy**, so the `||` fallback is unreachable and the dialog header
  reads `undefined's profile` until the profile loads.
- Both mounts are deleted later (Tasks 4 and 10). Fix them anyway: the defect then goes even if the
  redesign is deferred, and no reviewer has to take "it disappears eventually" on faith.

**Files you may touch:**

```
src/app/layout/Header.tsx                                              (the title line only)
src/features/user-management/auth/components/UserProfileButton.tsx     (the title line only)
src/app/layout/__tests__/Header.test.tsx
```

**Files you must NOT touch:** anything else. Task 1 owns `UserProfile.tsx` and the services in this
batch — do not open them.

**Targeted test command:**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="Header"
```

### Steps

- [ ] **Step 1: Failing test** in `Header.test.tsx`:

```
test("the profile dialog is not titled undefined's profile before the profile loads")
  → render with activeGroupUserProfile: null, open the dialog, assert the title reads
    "Your profile" and that nothing matching /undefined/ is in the document
```

- [ ] **Step 2: Run it; it fails.** Quote the failure.

- [ ] **Step 3: Fix both call sites**

```tsx
const username = activeGroupUserProfile?.username;
title={username ? `${username}'s profile` : "Your profile"}
```

- [ ] **Step 4: Run the targeted tests; all green.**

### Report back

As Task 1.

---

## Task 4 — A page at /profile

**Batch 2, parallel with Task 2.**

### Brief

> **Repo constraints** — the block in "How this plan is executed". Read it first.

**What you need to know:**

- This task builds the **route and the shell only.** The right-hand column renders the *existing*
  `UserProfile` component for this one commit, so the route is provably reachable before the split
  starts. Task 5 replaces that single child with the cards. **Do not split anything here.**
- Page conventions to copy from `src/pages/ContactPage.tsx`: outer
  `max-w-7xl mx-auto px-4 py-8 space-y-6`; a back button using `button button-link flex items-center
  gap-2 text-sm` with an `ArrowLeft`; `useNavigation().navigateToPage` for navigation;
  `useCampaigns().activeCampaign` for the campaign name. `ContactPage` phrases the back link
  `Back to {activeCampaign.name}` falling back to `Back to the campaign` — **use that exact
  wording**, because two pages phrasing one link two ways is how the old header ended up with three
  names for one destination.
- `pages` is already in the jest `moduleNameMapper` allow-list in `jest.config.ts`, so no config
  change is needed.
- `useGroups()` exposes `loading`, which already separates "no groups" from "not loaded yet".
- **`IntersectionObserver` does not exist in jsdom.** Either feature-detect it and fall back to
  "first section is active", or define a no-op shim in the test file. Do not let the rail throw
  under test.

**Files you may touch:**

```
src/pages/profile/ProfilePage.tsx                     (new)
src/pages/profile/ProfileSectionRail.tsx              (new)
src/pages/profile/index.ts                            (new)
src/pages/profile/__tests__/ProfilePage.test.tsx      (new)
src/pages/profile/__tests__/ProfileSectionRail.test.tsx (new)
src/app/App.tsx                                       (one route line + one import)
src/app/__tests__/App.test.tsx                        (if a routing suite exists)
```

**Files you must NOT touch:** `UserProfile.tsx` and its test — Task 2 owns them in this batch.

**Targeted test command:**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(ProfilePage|ProfileSectionRail|App)"
```

### Steps

- [ ] **Step 1: Write the failing tests**

```
describe("ProfilePage")
  test("renders the heading and the save-as-you-go subtitle")
  test("the back link names the active campaign")
  test("the back link falls back to 'Back to the campaign' with no active campaign")
  test("renders the section rail with all six entries")
  test("tells a signed-out visitor to sign in, and does not redirect")
  test("renders the account sections but no group sections when there is no active group")
  test("renders a loading state while groups are still loading")

App routing
  test("/profile renders the profile page")
```

- [ ] **Step 2: Run; all fail** — no such module, no such route. Quote it.

- [ ] **Step 3: Build the shell**

```tsx
<div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
  {/* back link, ContactPage's treatment and wording */}
  <Typography variant="h1">Your profile</Typography>
  <Typography color="secondary">
    Changes save as you make them. Nothing here needs a save button.
  </Typography>

  <div className="grid grid-cols-1 md:grid-cols-[212px_1fr] gap-7">
    <ProfileSectionRail sections={sections} />
    <div className="space-y-4">{/* UserProfile for now; cards in Task 5 */}</div>
  </div>
</div>
```

Below `md` the rail renders **nothing**: it is a shortcut to six cards on a page you can already
scroll, and a horizontal scrolling tab strip above the content would cost more than it saves.

- [ ] **Step 4: Build `ProfileSectionRail`** — a `nav` of **anchors** (not buttons, so
      `/profile#characters` is linkable): `Account`, `{group name}`, `Characters`, `Appearance`, a
      rule, then `Leaving and deleting` in the error tone. `sticky top-4` at the desktop breakpoint.
      Active item is solid dark. Track the visible section with `IntersectionObserver`, defaulting to
      the first section until it first fires.

- [ ] **Step 5: States**

| State | Renders |
|---|---|
| Signed out | Shell + one card: "You need to be signed in to see your profile", with the sign-in trigger. **Not a redirect** — the URL staying linkable is the point of this PR |
| No active group | Account and Appearance only; group-scoped cards say they need a group; danger zone shows only `Delete your account` |
| Loading | Shell + skeleton cards, keyed off `useGroups().loading` |

- [ ] **Step 6: Register the route** in `App.tsx`, beside `/contact`:

```tsx
<Route path="/profile" element={<ProfilePage />} />
```

- [ ] **Step 7: Run the targeted tests; all green.**

### Report back

As Task 1, plus: which approach you took for `IntersectionObserver` under jsdom.

---

## Task 5 — Split the profile into per-section cards

**Batch 3, alone.** This is the largest task in the plan and the one most likely to need a second
pass. If it grows beyond what one agent can hold, stop and report — the natural seam is hooks in
one commit, components in the next.

### Brief

> **Repo constraints** — the block in "How this plan is executed". Read it first.

**What you need to know:**

- **This task is behaviour-preserving.** Every section moves to its own component with its *current*
  behaviour intact. The scope copy, role pill, posting-as row, per-row errors, theme cards and
  danger-zone sentences all arrive in Tasks 6–9. Splitting and redesigning at once makes the diff
  unreviewable and hides behaviour that changed by accident. **If you find yourself improving
  something, stop — that is a later task.**
- `UserProfile.tsx` is 797 lines and holds eight sections plus two nested dialogs.
- Extract **hooks first, then components**. Hooks carry behaviour; components carry markup. In that
  order every component becomes a rendering change over a tested hook.
- The existing test file mocks the domain barrel and then re-points the direct sibling imports at
  that mock:
  ```ts
  jest.mock("@/features/user-management", () => ({ useAuth: jest.fn(), useGroups: jest.fn(), useUser: jest.fn() }));
  jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));
  ```
  New suites for components inside the domain need the same shape, with paths adjusted.
- `src/features/user-management/index.ts` currently exports `UserProfile`. That export goes; the
  cards the page imports are added, because `pages/` must come through the barrel.

**Files you may touch:** everything under
`src/features/user-management/profiles/`, plus `src/features/user-management/index.ts` and
`src/pages/profile/ProfilePage.tsx`.

**Files you must NOT touch:** `Header.tsx`, `UserProfileButton.tsx`, anything under `core/services/`,
`SessionManager.tsx`.

**Targeted test command:**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(profiles|ProfilePage)"
```

### Steps

- [ ] **Step 1: Rehome the tests first.** `UserProfile.test.tsx` is deleted at the end of this task,
      so its assertions must land in their new homes *before* the component goes. One row per
      `describe` in the current file:

| Current describe | New home |
|---|---|
| `unauthenticated state` | `ProfilePage.test.tsx` (Task 4 covers it) |
| `profile display` — email, group, username, role | `AccountCard.test.tsx`, `GroupMembershipCard.test.tsx` |
| `profile display` — active character, empty list | `CharactersCard.test.tsx` |
| `username editing`, `username save` | `UsernameEditor.test.tsx`, `useUsernameEditor.test.ts` |
| `character management`, `character name async operations`, `character update` | `CharacterRow.test.tsx`, `useCharacterRoster.test.ts` |
| `theme dropdown` | `AppearanceCard.test.tsx` (Task 7 rewrites it — the dropdown becomes three cards) |
| `destructive actions`, `delete account` | `DangerZoneCard.test.tsx`, `LeaveGroupDialog.test.tsx`, `DeleteAccountDialog.test.tsx` |
| `close button` (4 tests) | **No successor.** The spec deletes the button. Add `test("renders no Close button under the danger zone")` to `ProfilePage.test.tsx` so the DoD line is asserted from the other direction |

- [ ] **Step 2: Extract the hooks**

  - `useUsernameEditor(currentUsername)` → `{ value, setValue, isEditing, open, cancel, submit, checking, valid, available, error }`, carrying Task 2's `null`-is-unchecked state machine unchanged.
  - `useCharacterRoster()` → `{ characters, activeCharacterId, add, rename, remove, setActive, rowErrors, addError, saving }`. **Errors keyed by character id** (`Record<string, string>`) even though nothing renders them per-row yet — that shape is what makes Task 8 a rendering change instead of a rewrite.

- [ ] **Step 3: Extract the components**, each with the markup it has today: `AccountCard`,
      `GroupMembershipCard` (+ `UsernameEditor`), `CharactersCard` (+ `CharacterRow`),
      `AppearanceCard`, `DangerZoneCard` (+ `LeaveGroupDialog`, `DeleteAccountDialog`).

- [ ] **Step 4: Compose them in `ProfilePage`.** Delete `UserProfile.tsx`, delete its test, remove
      the barrel's `UserProfile` export, add the cards to the barrel.

- [ ] **Step 5: Check the line budget**

```bash
wc -l src/features/user-management/profiles/components/*.tsx src/features/user-management/profiles/hooks/*.ts src/pages/profile/*.tsx | sort -n
```

Nothing over ~400 lines.

- [ ] **Step 6: Run the targeted tests; all green.**

### Report back

As Task 1, plus the `wc -l` table and the rehoming map as you actually implemented it — any test
that did **not** find a home is a finding the orchestrator needs.

---

## Task 6 — Scope the cards, and say which scope each one is

**Batch 4, parallel with Task 7.**

### Brief

> **Repo constraints** — the block in "How this plan is executed". Read it first.

**What you need to know:**

- Scope is the organising principle: the account card applies everywhere, the group card applies to
  one membership, and the page says so **in words** rather than by adjacency.
- The group card is titled with `activeGroup.name` and carries a role pill (`Administrator` /
  `Member`) beside it, so it is obvious the settings below are per-membership.
- The posting-as row is **display-only** — star, name, and the muted
  `— new chapters, quests and rumours are credited to this name`. Changing it happens in the
  Characters card or the header menu. Two controls for one value on one screen is what the current
  profile does.
- Delete the separate "Active Character" block: it duplicates what the Characters list says.
- `Header.handleJoinedGroup` (`src/app/layout/Header.tsx:129`) holds the one correct landing
  behaviour for a successful join — refresh, find the group that appeared, switch to it, log a
  landing failure rather than invent error UI. **Move it verbatim, comments included**, into
  `src/features/user-management/groups/hooks/useJoinGroupCompletion.ts`, and have both `Header` and
  `AccountCard` use it.
- PR 3 landed a commit called "mount the join dialog once". The invariant it protects is **one
  behaviour**, not one mount; a second surface now legitimately needs the action, and the hook is
  what preserves the invariant. Add a test asserting both entrances call the same completion path.

**Files you may touch:**

```
…/profiles/components/AccountCard.tsx                     + its test
…/profiles/components/GroupMembershipCard.tsx             + its test
…/profiles/components/CharactersCard.tsx                  + its test  (subtitle only)
…/groups/hooks/useJoinGroupCompletion.ts                  + its test  (new)
src/features/user-management/index.ts                     (export the hook)
src/app/layout/Header.tsx                                 (use the hook; nothing else)
src/app/layout/__tests__/Header.test.tsx
```

**Files you must NOT touch:** `AppearanceCard`, `SessionManager`, `core/types/user.ts` — Task 7 owns
them in this batch. Also not `CharacterRow` or the danger zone.

**Targeted test command:**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(AccountCard|GroupMembershipCard|CharactersCard|useJoinGroupCompletion|Header)"
```

### Steps

- [ ] **Step 1: Failing tests**

```
AccountCard
  test("is subtitled 'Applies everywhere, in every group.'")
  test("shows the email with a 'used to sign in' note")
  test("lists every group the user is in")
  test("'Join another' opens the join dialog")

GroupMembershipCard
  test("is titled with the group's own name")
  test("shows an Administrator pill for an admin and a Member pill for a member")
  test("is subtitled with the other-group caveat")
  test("shows the posting-as character with the attribution explanation")
  test("shows no posting-as name when no character is active")

CharactersCard
  test("is subtitled with what 'posting as' means")

useJoinGroupCompletion
  test("switches to the group that appeared after the refresh")
  test("refreshes and stays put when no new group appears")
  test("logs rather than throwing when the switch fails")
```

- [ ] **Step 2: Run; they fail. Quote it.**

- [ ] **Step 3: Implement the copy and the grids.** Account card is a
      `grid grid-cols-[170px_1fr_auto]`: `Email · dm@example.com · used to sign in`, then
      `Groups you're in · {names} · Join another`. Group card gets the name title, the role pill
      (`tag` utility) and the caveat subtitle; keep the existing inline username edit with its
      debounced `validateUsername`, availability tick and error message exactly as it is.

- [ ] **Step 4: Extract `useJoinGroupCompletion`** and use it from both `Header` and `AccountCard`.

- [ ] **Step 5: Run the targeted tests; all green.**

### Report back

As Task 1.

---

## Task 7 — Store the theme on the account, not the membership

**Batch 4, parallel with Task 6.**

### Brief

> **Repo constraints** — the block in "How this plan is executed". Read it first.

**What you need to know (the PR's framing of this bug is wrong; the spec §1.2 corrects it):**

- The PR says switching group can restyle the app. **It cannot.** `SessionManager.tsx:22-42` applies
  the stored theme once, behind `initialThemeApplied.current`, a ref set on first profile load and
  cleared only on sign-out. Every later `activeGroupUserProfile` is ignored.
- The **real** symptom: your theme is whichever group happened to be active when you last signed in.
  Pick Dark in one group, sign in one day with the other active, and you get the other group's
  theme, with nothing on screen connecting the two.
- **Two things the PR asks for are already done — do not re-implement them.**
  `ThemeContext.applyThemeToDOM` writes `localStorage` on every change, and the provider reads it
  before first paint (`src/core/themes/ThemeContext.tsx:24-37,45`).
- Writing `preferences` to `users/{uid}` is already permitted: `firebase/firestore.rules.prod:147`
  allows a self-write of any field except `isAdmin`. **No rules change.**
- Theme names are exactly `light | dark | medieval` (`src/core/themes/types.ts:7`), and
  `themes` in `src/core/themes/definitions/index.ts` maps each to a `Theme` whose `colors.primary`
  is the swatch colour. Reading that is a token lookup, not a hardcoded colour.
- `useUser()` exposes `updateUserProfile(uid, updates)` for the account doc and
  `updateGroupUserProfile(uid, updates)` for the membership. This task moves theme from the second
  to the first.

**Files you may touch:**

```
src/core/types/user.ts                                    (UserProfile.preferences)
…/auth/components/SessionManager.tsx                      + its test
…/profiles/hooks/useAccountTheme.ts                       + its test  (new)
…/profiles/components/AppearanceCard.tsx                  + its test
src/features/user-management/index.ts                     (export useAccountTheme)
```

**Files you must NOT touch:** `AccountCard`, `GroupMembershipCard`, `Header.tsx` — Task 6 owns them
in this batch.

**Targeted test command:**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(SessionManager|useAccountTheme|AppearanceCard)"
```

### Steps

- [ ] **Step 1: Failing tests**

```
SessionManager
  test("applies the account theme when one is stored")
  test("with no account theme, applies the active group's theme")
  test("with no account theme, writes the group's theme up to the account exactly once")
  test("with neither, leaves the theme on its localStorage value")
  test("does not re-apply a theme when the active group changes")

useAccountTheme
  test("writes users/{uid}.preferences.theme")
  test("applies the theme to context before the write resolves")
  test("surfaces a write failure without reverting the applied theme")

AppearanceCard
  test("renders one option per theme with a swatch")
  test("marks the current theme with a check")
  test("switching theme calls the account writer, not updateGroupUserProfile")
```

- [ ] **Step 2: Run; they fail. Quote it.**

- [ ] **Step 3: Extend the type** in `core/types/user.ts`, on `UserProfile`:

```ts
/** Account-scoped preferences. Theme lives here, not on a membership, so it
 *  cannot depend on which group was active at sign-in. */
preferences?: {
  theme?: string;
  [key: string]: unknown;
};
```

- [ ] **Step 4: `useAccountTheme`** — applies through `setTheme` immediately, then persists with
      `updateUserProfile`. A failed write surfaces its message and **leaves the applied theme
      alone**: the user asked for this theme, the local change is already right, and reverting the
      screen to punish a failed write is the behaviour Task 8 is fixing elsewhere.

- [ ] **Step 5: `SessionManager` and the migration**

```
account theme exists            → apply it
no account theme, group theme   → apply it, and write it to the account (one-time migration)
neither                         → leave ThemeContext on its localStorage value
```

The migration takes the theme of **the group active at the moment it runs** — the same value the
current code would have applied at that sign-in, so nothing changes under the user. Leave the
group-level `preferences.theme` values in place: they are stale after this, and clearing them buys a
second write per user and nothing else.

Delete the `initialThemeApplied` ref. With an account-scoped value there is no per-group change to
guard against, so the effect can depend on the profile honestly.

- [ ] **Step 6: The Appearance card** — three side-by-side option cards (`Light`, `Dark`,
      `Medieval`), each a swatch + name, the selected one carrying a border, a focus ring and a
      check. This deletes the custom dropdown and its click-outside handler.

- [ ] **Step 7: Run the targeted tests; all green.**

### Report back

As Task 1, plus: confirm you did **not** add `localStorage` mirroring (it already exists).

---

## Task 8 — Label the character actions and confirm removal

**Batch 5, parallel with Task 9.**

### Brief

> **Repo constraints** — the block in "How this plan is executed". Read it first.

**What you need to know:**

- Today each row carries three **unlabelled ghost icon buttons**, and the active row carries a full
  accent ring that makes a list item the loudest element on the screen.
- Every mutation already writes to Firestore immediately and rolls local state back on failure — but
  the message lands in a single `error` slot at the bottom of a scrolling surface, so **the row
  silently reverts with the explanation offscreen.**
- `useCharacterRoster` (Task 5) already keys errors by character id. Rendering them per row is
  therefore a rendering change, not a rewrite.
- Today `Rename` hijacks the add-row input at the top, which is why the add button mutates into two
  icon buttons mid-flow.
- Character deletion currently has **no** confirmation at all, while Leave Group gets a whole dialog.

**Files you may touch:**

```
…/profiles/components/CharacterRow.tsx        + its test
…/profiles/components/CharactersCard.tsx      + its test
…/profiles/hooks/useCharacterRoster.ts        + its test
```

**Files you must NOT touch:** the danger zone, `DocumentService` — Task 9 owns them in this batch.

**Targeted test command:**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(CharacterRow|CharactersCard|useCharacterRoster)"
```

### Steps

- [ ] **Step 1: Failing tests**

```
CharacterRow
  test("renders Post as this, Rename and Remove as labelled controls")
  test("omits 'Post as this' on the row that is already posting")
  test("Remove asks for confirmation before removing")
  test("Cancel on the confirmation leaves the character in place")
  test("renders its own failure message on the row that failed")
  test("a failure on one row does not clear the message on another")
  test("renames in the row, without touching the add field")
  test("carries no accent ring on the active row")

useCharacterRoster
  test("keys errors by character id")
  test("rolls local state back when a mutation fails")
  test("clears a row's error when that row's next mutation succeeds")
```

- [ ] **Step 2: Run; they fail. Quote it.**

- [ ] **Step 3: Per-row errors** — `CharacterRow` renders `rowErrors[character.id]` under its own
      name. This is the whole of "render the failure on the row that failed".

- [ ] **Step 4: Rename in the row** — the row swaps its name for an input with its own confirm and
      cancel. The add row is untouched and stays available throughout.

- [ ] **Step 5: Inline removal confirmation** — `Remove {name}? Remove / Cancel`, **on the row, not
      a dialog.** It is one destructive click on a list item; the two dialogs on this page are
      reserved for ending a membership or an account.

- [ ] **Step 6: Drop the accent ring** on the active row. The star and the `posting as` marker in a
      muted accent tone are enough.

- [ ] **Step 7: Add row** at the bottom: input `Add a character…` + outlined `Add`.

- [ ] **Step 8: Run the targeted tests; all green.**

### Report back

As Task 1.

---

## Task 9 — Say what leaving and deleting actually affect

**Batch 5, parallel with Task 8.**

### Brief

> **Repo constraints** — the block in "How this plan is executed". Read it first.

**What you need to know:**

- `handleGroupLeave` currently calls `onCancel()`, then `await refreshGroups()`, then
  `window.location.href = "/"` — closing the surface it is inside, then discarding the refresh it
  just waited for. On a page this is simply: await the service, await `refreshGroups()`,
  `navigate("/")`.
- Task 1 has already moved both actions onto services. **Do not reintroduce `httpsCallable` or
  `getFunctions` anywhere.**
- The counts, and what each costs:

| Clause | Source |
|---|---|
| `N campaigns` | `firebaseServices.campaign.getCampaigns(groupId)` — one query |
| `N chapters` | `firebaseServices.campaign.getCampaignCounts(groupId, campaignId)` per campaign, summed |
| `N of your own notes` | `getCollectionCount("groups/{groupId}/users/{uid}/notes")` — notes are a **flat per-user collection**, so "your own notes in this group" is exactly this path |

- `CampaignService.getCampaignCounts` (`src/core/services/firebase/campaign/CampaignService.ts:159`,
  with its `countOf` helper at `:173`) already proves the `getCountFromServer` pattern.
  `DocumentService.getCollectionCount(path)` is the general form.
- **Omit any clause whose count has not resolved.** A failed count is not an error state: the
  sentence reads correctly with two clauses and the button does not depend on it.
  `shared/components/context-switcher/useCampaignCounts.ts` set this precedent one PR ago — read it.
- The two actions are **not equivalent** and must not look it. Today they are two identical outline
  buttons stacked on each other.

**Files you may touch:**

```
src/core/services/firebase/data/DocumentService.ts        + its test
…/profiles/hooks/useGroupFootprint.ts                     + its test  (new)
…/profiles/components/DangerZoneCard.tsx                  + its test
…/profiles/components/LeaveGroupDialog.tsx                + its test
…/profiles/components/DeleteAccountDialog.tsx             + its test
src/features/user-management/index.ts                     (export if the page needs it)
```

**Files you must NOT touch:** `CharacterRow`, `CharactersCard`, `useCharacterRoster` — Task 8 owns
them in this batch.

**Targeted test command:**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(DocumentService|useGroupFootprint|DangerZone|LeaveGroupDialog|DeleteAccountDialog)"
```

### Steps

- [ ] **Step 1: Failing tests**

```
useGroupFootprint
  test("counts campaigns, chapters across campaigns, and the user's own notes")
  test("omits a clause whose count rejected, and reports no error")
  test("does not fetch without a group")

DangerZoneCard
  test("states what leaving costs, with real counts")
  test("drops the chapter clause when that count is unavailable")
  test("states that deleting removes you from every group, permanently")
  test("renders the delete action as a solid error button on a tinted ground")
  test("renders no Close button")

LeaveGroupDialog
  test("leaves through the group service and navigates home on success")
  test("does not navigate when leaving fails, and shows why")

DeleteAccountDialog
  test("keeps the confirm button disabled until the account email is typed")
  test("accepts the email case-insensitively, ignoring surrounding spaces")
  test("signs out and navigates home on success")
```

- [ ] **Step 2: Run; they fail. Quote it.**

- [ ] **Step 3: `DocumentService.getCollectionCount(path)`** — `getCountFromServer` over a
      collection path.

- [ ] **Step 4: `useGroupFootprint(groupId)`** — fetches all three counts when the danger-zone card
      mounts; omits any clause that has not resolved.

- [ ] **Step 5: The two rows.** Each states its scope in words *before* its button:

  - **`Leave {group}`** — `You lose access to N campaigns, N chapters and N of your own notes in
    this group. Your account and your other group stay as they are.` → outlined error button
    `Leave group`.
  - **`Delete your account`** — `Removes you from both groups and deletes every profile, character
    and note you own. Permanent. You'll be asked to type your email to confirm.` → **solid** error
    button `Delete account`, on a tinted ground.

- [ ] **Step 6: Fix the leave sequence** — await the service, await `refreshGroups()`, then
      `navigate("/")`. Account deletion: await the service, await `signOut()`, `navigate("/")`.

- [ ] **Step 7: Gate the delete confirm** on the typed account email, compared case-insensitively
      after trimming. The email is on screen in the account card above; this is a speed bump, not a
      memory test.

- [ ] **Step 8: Delete the trailing `Close` button** if any trace of it survived Task 5.

- [ ] **Step 9: Run the targeted tests; all green.**

### Report back

As Task 1.

---

## Task 10 — One named account menu

**Batch 6, alone.**

### Brief

> **Repo constraints** — the block in "How this plan is executed". Read it first.

**What you need to know (the PR names the wrong file; spec §1.3 corrects it):**

- The PR says `UserProfileButton` renders the three unlabelled ghost icons in the header. It does —
  but **nothing renders `UserProfileButton`.** Every `<UserProfileButton` in the repo is inside its
  own test file. PR 3 rebuilt the header around its own hamburger, and **that** is what actually
  carries Profile / Report / Groups / Admin today (`Header.tsx:243-320`).
- So this task replaces **the hamburger**, and deletes `UserProfileButton.tsx` and its test.
- Mobile navigation is a **separate bar** mounted in `Layout` (`Navigation variant="mobile"`), so
  removing the hamburger strands no navigation. Verify before you delete.
- `usePopoverKeys` (`src/shared/components/context-switcher/usePopoverKeys.ts`) already implements
  the whole keyboard contract — focus trap, arrows, Home/End, Escape-returns-focus — and is tested.
  **Move it to `src/shared/hooks/usePopoverKeys.ts`** with its test, update `ContextSwitcher`'s
  import, and reuse it. Do not write a second one.
- `ContextSwitcher.tsx` is the pattern to follow for popover shape, click-outside and error
  placement: a failed action keeps the popover open with the message **inside** it.
- `Header.handleReportProblem` (`Header.tsx:102`) carries
  `?from=${encodeURIComponent(location.pathname)}`. That parameter is the only thing that tells the
  report which page the problem was on — by the time the form renders, the path is always
  `/contact`. The `TODO(PR 4)` comment at `Header.tsx:97` says exactly this; **delete the TODO with
  the move.**
- `Group members` is a **count, not a control** (spec §9.3). Member management is out of scope and
  lives in the admin panel, so a row that navigates nowhere for non-admins would be a dead control
  for most of the people who see it. Render it as text with the count; admins reach the list through
  `Admin panel`.
- When signed out, the header keeps a `Sign In` button **at every width** — the hamburger carried
  the mobile one — plus the existing `ThemeSelector`, so theme stays reachable without an account.
  The user menu renders only for signed-in users.

**Files you may touch:**

```
src/shared/components/user-menu/*.tsx + __tests__/            (new)
src/shared/hooks/usePopoverKeys.ts + its test                 (moved)
src/shared/components/context-switcher/usePopoverKeys.ts      (delete, with its test)
src/shared/components/context-switcher/ContextSwitcher.tsx    (import path only)
src/app/layout/Header.tsx + its test
…/auth/components/UserProfileButton.tsx                       (delete)
…/auth/components/__tests__/UserProfileButton.test.tsx        (delete)
```

**Targeted test command:**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(user-menu|usePopoverKeys|ContextSwitcher|Header)"
```

### Steps

- [ ] **Step 1: Move `usePopoverKeys`** to `shared/hooks/`, with its test; update `ContextSwitcher`'s
      import. Run the context-switcher suites and confirm the move changed nothing.

- [ ] **Step 2: Failing tests**

```
UserMenuTrigger
  test("names the posting-as character")
  test("falls back to the username when no character is active")
  test("carries aria-haspopup and reflects aria-expanded")

PostingAsList
  test("checks the character currently posting")
  test("switching writes activeCharacterId and closes the popover")
  test("a failed switch keeps the popover open and shows why")

ThemeSegmented
  test("marks the current theme")
  test("switching goes through the account theme writer")

UserMenuLinks
  test("Profile and settings navigates to /profile")
  test("Report a problem carries the current route as ?from=")
  test("shows the member count as text, not as a control")
  test("shows Admin panel only for admins")
  test("Sign out signs out")

UserMenu
  test("closes on click outside")
  test("closes on Escape and returns focus to the trigger")
  test("arrow keys move between rows")

Header
  test("renders no hamburger button")
  test("mounts no profile dialog")
  test("shows a Sign In button at every width when signed out")
```

- [ ] **Step 3: Run; they fail. Quote it.**

- [ ] **Step 4: Build the menu** — one trigger chip (avatar, posting-as name, chevron) opening a
      ~284px popover:
      1. Header: username + `Admin in {group}`.
      2. `POSTING AS` — the character list, click to switch, check on the current one.
      3. Rule. `Theme` with the inline three-way segmented control.
      4. Rule. `Profile and settings ›` → `/profile`; the `Group members` count; `Report a problem`
         → `/contact?from=…`; `Admin panel` for admins only; `Sign out` in a quieter weight.

- [ ] **Step 5: Strip the header** — remove the hamburger, its click-outside and positioning
      effects, both dialog mounts and the desktop `Sign Out` button. **Keep** the `JoinGroupDialog`
      mount (driven by `useJoinGroupCompletion` from Task 6), the `AdminPanel` dialog and the
      `SignInForm` dialog: the menu opens the first two, and the third is for signed-out users.

- [ ] **Step 6: Delete `UserProfileButton.tsx` and its test.** Confirm nothing imports it first:

```bash
grep -rn "UserProfileButton" src --include=*.tsx --include=*.ts | grep -v "auth/components/UserProfileButton"
```

      Expect no output outside its own test file. (Deleting the file also removes the unused
      `useTheme()` destructure the PR's §6 asks about — note that in your report.)

- [ ] **Step 7: Run the targeted tests; all green.**

### Report back

As Task 1, plus the `grep` output from Step 6.

---

## Task 11 — Record what the redesign changed

**Orchestrator only. Not delegated** — this is the record of what actually happened, and only the
reviewer of all ten diffs can write it.

- [ ] **Step 1: Update `CLAUDE.md`** — the profile is a page, theme is account-scoped, and the
      resolver/region trap now has a worked example: a bare `getFunctions()` passes every gate and
      reaches a region with nothing in it.

- [ ] **Step 2: Record the two unfixed siblings** of the region bug — `GroupService.createGroup:59`
      and `CampaignService.deleteCampaign:243` — in `docs/testing/bug-tracking/README.md`, with the
      reasoning from spec §1.1. They are real, they are out of scope here, and they should not have
      to be rediscovered.

- [ ] **Step 3: Append an outcome section to the spec**, as PR 3 did: what this plan predicted, what
      it got wrong, and what the next person should know.

- [ ] **Step 4: Run the three gates**

```bash
npx tsc --noEmit
npm test
npm run build
```

- [ ] **Step 5: Commit** — `docs(profile): record what the redesign changed`

---

## Definition of Done, mapped to tasks

| DoD line | Task |
|---|---|
| `/profile` exists, is linkable, has a back button; the dialog is gone | 4, 10 |
| `UserProfile.tsx` split; no file over ~400 lines | 5 |
| Account- and group-scoped settings in separate labelled cards; group card titled with the group | 6 |
| Theme stored per account, existing per-group values migrated | 7 |
| Labelled character actions; removal confirmed; failures on the row | 8 |
| Danger zone states what each action affects; deletion requires the email | 9 |
| No `Close` button below `Delete account` | 5 (asserted), 9 (enforced) |
| One named header menu; posting-as and theme without leaving the page; `Report a problem` | 10 |
| `undefined's profile` cannot appear anywhere | 3, and structurally 4 + 10 |
| `npm test` passes with the profile suites updated | every task; gates in 11 |
