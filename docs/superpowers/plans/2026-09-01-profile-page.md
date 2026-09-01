# Profile page and header menu — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

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

**Spec:** `docs/superpowers/specs/2026-09-01-profile-page-design.md` — read it before Task 1. This
plan argues from it and does not restate it. The PR description is the requirement; the spec records
what reading the code changed about it.

## Global Constraints

- **Never use hardcoded colours.** Every colour comes from a theme token or an existing utility
  class (`card`, `card-divider`, `dropdown`, `dropdown-item`, `dropdown-item-active`, `chip`,
  `chip-selected`, `callout-emphasis`, `error-bg`, `delete-button`, `form-error`, `success-icon`,
  `typography*`, `button-*`, `bg-secondary`, `selectable-item`, `divider`, `tag`). CLAUDE.md makes
  this non-negotiable. The swatches in the Appearance card read `theme.colors.primary` from the
  theme definitions, which is a token lookup, not a literal.
- **No `@/…` imports in shipping code.** `react-scripts`' webpack ignores tsconfig `paths`, so
  `@/…` passes `tsc` and jest and then fails `npm run build`. Use bare `baseUrl` specifiers
  (`core/components/…`, `shared/hooks/…`, `features/user-management`). `@/…` is allowed **only**
  inside `__tests__/` and `test-utils/`.
- **Import features through their barrel** from `pages/` and `shared/`; **inside** a domain import
  siblings directly — importing `features/user-management/index.ts` from within user-management is
  a circular import, and the existing profile tests mock around exactly that.
- **Double quotes** per ESLint. JSDoc on every exported component, hook and function.
- **The suite is green and must stay green.** Baseline on `main` at `b73232a`: **0 failed / 2
  skipped / 4538 passed across 209 suites.** Any red is a regression.
- **Never edit a test to make it pass.** This plan *does* delete two suites (Tasks 5 and 10); each
  deletion is because the component under test ceases to exist, and each is paired with the suite
  that inherits its intent. No assertion is weakened to accommodate new code.
- **Three gates before proposing a merge:** `npx tsc --noEmit`, `npm test`, `npm run build`. The
  third is not implied by the first two.
- **No file over ~400 lines**, per the DoD. The largest thing this plan creates is
  `CharactersCard.tsx` + `CharacterRow.tsx`, deliberately split for that reason.

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/pages/profile/ProfilePage.tsx` | Shell: back link, `h1`, subtitle, two-column grid, section ids, signed-out/loading states |
| `src/pages/profile/ProfileSectionRail.tsx` | Sticky rail; tracks the visible section, anchors to it |
| `src/pages/profile/index.ts` | Barrel for the route import |
| `…/profiles/components/AccountCard.tsx` | Email, groups you're in, `Join another` |
| `…/profiles/components/GroupMembershipCard.tsx` | Group name + role pill, name-in-group, posting-as row |
| `…/profiles/components/UsernameEditor.tsx` | The inline edit and its four validation states |
| `…/profiles/components/CharactersCard.tsx` | List, add row, card-level copy |
| `…/profiles/components/CharacterRow.tsx` | One character: star, name, labelled actions, inline confirm, own error |
| `…/profiles/components/AppearanceCard.tsx` | Three theme option cards |
| `…/profiles/components/DangerZoneCard.tsx` | Two rows, their sentences, their buttons |
| `…/profiles/components/LeaveGroupDialog.tsx` | Confirmation, from a page |
| `…/profiles/components/DeleteAccountDialog.tsx` | Confirmation gated on typing the account email |
| `…/profiles/hooks/useCharacterRoster.ts` | Character state, four mutations, per-row errors |
| `…/profiles/hooks/useUsernameEditor.ts` | Debounced validation; `null` means "not yet checked" |
| `…/profiles/hooks/useAccountTheme.ts` | Read/write the account theme |
| `…/profiles/hooks/useGroupFootprint.ts` | The counts the leave sentence needs |
| `…/groups/hooks/useJoinGroupCompletion.ts` | The one landing behaviour for a successful join |
| `src/shared/components/user-menu/UserMenu.tsx` | Trigger + popover; owns open state |
| `src/shared/components/user-menu/UserMenuTrigger.tsx` | Avatar + posting-as name + chevron |
| `src/shared/components/user-menu/PostingAsList.tsx` | Character rows, check on the current |
| `src/shared/components/user-menu/ThemeSegmented.tsx` | `Light` / `Dark` / `Med.` |
| `src/shared/components/user-menu/UserMenuLinks.tsx` | Profile, members count, report, admin, sign out |
| `src/shared/hooks/usePopoverKeys.ts` | **Moved** from `shared/components/context-switcher/` |
| `__tests__/` beside each of the above | One suite per unit |

**Modified**

| File | Change |
|---|---|
| `src/core/services/firebase/group/GroupService.ts` | `removeUserFromGroup` uses `this.functions` |
| `src/core/services/firebase/user/UserService.ts` | `+ deleteAccount(userId)` |
| `src/core/services/firebase/data/DocumentService.ts` | `+ getCollectionCount(path)` |
| `src/core/types/user.ts` | `UserProfile.preferences?: { theme?: string }` |
| `src/features/user-management/auth/components/SessionManager.tsx` | Account theme, with one-time migration |
| `src/features/user-management/index.ts` | Barrel: `- UserProfile`, `+` the cards and hooks the page needs |
| `src/app/App.tsx` | `+ <Route path="/profile" …>` |
| `src/app/layout/Header.tsx` | Hamburger, both dialog mounts and desktop Sign Out replaced by `UserMenu` |
| `src/shared/components/context-switcher/ContextSwitcher.tsx` | `usePopoverKeys` import path |
| `CLAUDE.md` | What this PR changed (Task 11) |

**Deleted**

| File | Reason |
|---|---|
| `…/profiles/components/UserProfile.tsx` | Becomes the nine components above (spec §9.2) |
| `…/profiles/components/__tests__/UserProfile.test.tsx` | Every test rehomed; see Task 5 |
| `…/auth/components/UserProfileButton.tsx` | Dead code superseded by `UserMenu` (spec §9.1) |
| `…/auth/components/__tests__/UserProfileButton.test.tsx` | Its component is gone |
| `…/context-switcher/usePopoverKeys.ts` + its test | Moved to `shared/hooks/` |

---

## Task → Commit Map

Tasks 1–3 are bug fixes that stand alone: if the redesign is deferred, they still ship.

| Task | Commit subject |
|---|---|
| 1 | `fix(profile): call the callables in the region they are deployed to` |
| 2 | `fix(profile): stop the username editor starting in a valid state` |
| 3 | `fix(profile): stop the dialog title reading undefined's profile` |
| 4 | `feat(profile): a page at /profile` |
| 5 | `refactor(profile): split the profile into per-section cards` |
| 6 | `feat(profile): scope the cards, and say which scope each one is` |
| 7 | `feat(profile): store the theme on the account, not the membership` |
| 8 | `feat(profile): label the character actions and confirm removal` |
| 9 | `feat(profile): say what leaving and deleting actually affect` |
| 10 | `feat(header): one named account menu` |
| 11 | `docs(profile): record what the redesign changed` |

---

## Task 1: Call the callables in the region they are deployed to

**The most serious defect in this PR, and the smallest fix in it.** `UserProfile.tsx:138,173` call
bare `getFunctions()`, which resolves `us-central1`. Every function in this repo deploys to
`europe-west1`, and `BaseFirebaseService` registers a `Functions` bound to that region *and* wired
to the emulator when `useEmulators` is set. The component's instance is bound to neither, so leave
group and delete account fail in production and in local dev alike.

- [ ] **Step 1: Write the failing tests**

`src/core/services/firebase/group/__tests__/GroupService.test.ts` (extend if present, create if not):

```
describe("removeUserFromGroup")
  test("uses the service's regioned Functions instance, not a fresh getFunctions()")
    → assert httpsCallable received the instance BaseFirebaseService registered,
      and that the module-level getFunctions was NOT called during the method
```

`src/core/services/firebase/user/__tests__/UserService.test.ts`:

```
describe("deleteAccount")
  test("invokes the deleteUser callable with the user id")
  test("uses the service's regioned Functions instance")
  test("propagates the callable's error")
```

- [ ] **Step 2: Run them and watch them fail**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(GroupService|UserService)"
```

`removeUserFromGroup`'s test fails because the method calls `getFunctions()` at `GroupService.ts:150`;
`deleteAccount`'s three fail because the method does not exist.

- [ ] **Step 3: Fix `GroupService.removeUserFromGroup`**

Replace the local `const functions = getFunctions();` with `this.functions`. Leave `createGroup`
(`:59`) and `CampaignService.deleteCampaign` (`:243`) alone — they carry the same defect, they are
outside this PR's scope, and Task 11 records them so the next person does not have to rediscover it.

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

- [ ] **Step 5: Point the component at the services**

In `UserProfile.tsx`, delete the `firebase/functions` import. `handleGroupLeave` calls
`firebaseServices.group.removeUserFromGroup(activeGroupId, user.uid)`; `handleAccountDelete` calls
`firebaseServices.user.deleteAccount(user.uid)`. Nothing else changes — the
`onCancel()` / `window.location.href` sequence is Task 9's problem, not this commit's.

`UserProfile.test.tsx` mocks `firebase/functions` and asserts on `mockCallable`. Two tests
(`should call the leave group callable when confirmed`, `should call httpsCallable deleteUser when
Delete My Account is confirmed`) now watch the wrong seam: re-point them at the mocked **service**
methods. This is not weakening a test — the assertion "the callable was invoked" survives verbatim
one layer down, where it can also prove the region.

- [ ] **Step 6: Verify**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(GroupService|UserService|UserProfile)"
npx tsc --noEmit
```

- [ ] **Step 7: Commit** — `fix(profile): call the callables in the region they are deployed to`

---

## Task 2: Stop the username editor starting in a valid state

The debounce effect returns early on `!isEditingUsername || !newUsername || …` and sets both flags
`true` (`UserProfile.tsx:87-92`). Opening the editor therefore starts in a passing state, and `Save`
is enabled against a name nothing has checked.

- [ ] **Step 1: Write the failing tests** in the existing `UserProfile.test.tsx`:

```
describe("username validation")
  test("Save is disabled immediately after the editor opens")
  test("Save is disabled while a check is in flight")
  test("Save enables only once a check has come back valid and available")
  test("Save is disabled again when the name is edited after a passing check")
```

- [ ] **Step 2: Run them** — the first, second and fourth fail; the flags are `true` before any
      check runs.

- [ ] **Step 3: Change the initial and reset states**

`usernameValid` and `usernameAvailable` initialise to `null`, and the early-return branch sets them
to `null` rather than `true`. `Save`'s `disabled` already reads `!usernameValid || !usernameAvailable`,
so `null` disables it with no further change. Add `checking` to that disabled expression so a name
edited inside the debounce window cannot leave a stale pass on screen.

The unchanged-name case keeps its behaviour: `newUsername === activeGroupUserProfile.username`
already disables `Save` on a clause of its own, so `null` there costs nothing.

- [ ] **Step 4: Verify and commit** — `fix(profile): stop the username editor starting in a valid state`

---

## Task 3: Stop the dialog title reading undefined's profile

```tsx
title={`${activeGroupUserProfile?.username}'s profile` || 'Your Profile'}
```

A template literal is always truthy, so the fallback is unreachable and the header reads
`undefined's profile` until the profile loads. It exists in **two** places — `Header.tsx:359` and
`UserProfileButton.tsx:93` — because the dialog is mounted twice.

Both mounts are deleted later (Tasks 4 and 10). Fix them anyway, so the defect is gone even if the
redesign is deferred, and so no reviewer has to take "it disappears eventually" on faith.

- [ ] **Step 1: Failing test** in `Header.test.tsx`:

```
test("the profile dialog is not titled undefined's profile before the profile loads")
  → render with activeGroupUserProfile: null, open the dialog, assert the title reads
    "Your profile" and that nothing matching /undefined/ is in the document
```

- [ ] **Step 2: Fix both call sites**

```tsx
const username = activeGroupUserProfile?.username;
title={username ? `${username}'s profile` : "Your profile"}
```

- [ ] **Step 3: Verify and commit** — `fix(profile): stop the dialog title reading undefined's profile`

---

## Task 4: A page at /profile

The route and the shell only. The page renders the **existing** `UserProfile` component in its
right-hand column for this one commit, so the route is provably reachable before the split starts.
Task 5 replaces that single child with the cards.

- [ ] **Step 1: Write the failing tests** — `src/pages/profile/__tests__/ProfilePage.test.tsx`:

```
describe("ProfilePage")
  test("renders the heading and the save-as-you-go subtitle")
  test("the back link names the active campaign")
  test("the back link falls back to 'Back to the campaign' with no active campaign")
  test("renders the section rail with all six entries")
  test("tells a signed-out visitor to sign in, and does not redirect")
  test("renders the account sections but no group sections when there is no active group")
  test("renders a loading state while groups are still loading")
```

`src/app/__tests__/App.test.tsx` (or the routing suite that exists):

```
test("/profile renders the profile page")
```

- [ ] **Step 2: Run; all fail** — no such module, no such route.

- [ ] **Step 3: Build the shell**

`ProfilePage.tsx`, following `ContactPage`'s conventions exactly where they overlap:

```tsx
<div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
  {/* back link — same button/button-link treatment and the same wording as ContactPage,
      because two pages phrasing one link two ways is how the old header ended up with
      three names for the same destination */}
  <Typography variant="h1">Your profile</Typography>
  <Typography color="secondary">
    Changes save as you make them. Nothing here needs a save button.
  </Typography>

  <div className="grid grid-cols-1 md:grid-cols-[212px_1fr] gap-7">
    <ProfileSectionRail sections={sections} />
    <div className="space-y-4">{/* cards */}</div>
  </div>
</div>
```

Below `md` the rail renders nothing: it is a shortcut to six cards on a page you can already scroll,
and a horizontal scrolling tab strip above the content would cost more than it saves.

- [ ] **Step 4: Build `ProfileSectionRail`**

A `nav` of anchors — `Account`, `{group name}`, `Characters`, `Appearance`, a rule, then
`Leaving and deleting` in the error tone. Anchors, not buttons, so `/profile#characters` is
linkable. `sticky top-4` on the desktop breakpoint. Active tracking uses an `IntersectionObserver`
over the section elements, defaulting to the first section until the observer first fires; guard for
`IntersectionObserver` being absent under jsdom (define a no-op in the test setup, or feature-detect
and fall back to the first section, which is what the tests assert against).

- [ ] **Step 5: States**

| State | Renders |
|---|---|
| Signed out | Shell + one card: "You need to be signed in to see your profile", with the sign-in trigger. **Not a redirect** — the URL staying linkable is the point of the PR |
| No active group | Account and Appearance only; the group-scoped cards say they need a group; danger zone shows only `Delete your account` |
| Loading | Shell + skeleton cards, keyed off `useGroups().loading`, which already separates "no groups" from "not loaded yet" |

- [ ] **Step 6: Register the route** in `App.tsx`, beside `/contact`:

```tsx
<Route path="/profile" element={<ProfilePage />} />
```

`pages` is already in the jest `moduleNameMapper` allow-list, so no config change is needed.

- [ ] **Step 7: Verify and commit** — `feat(profile): a page at /profile`

---

## Task 5: Split the profile into per-section cards

**Behaviour-preserving.** Every section moves to its own component with its current behaviour
intact; the scope copy, the role pill and the posting-as row arrive in Task 6. Splitting and
redesigning in one commit would make the diff unreviewable and hide any behaviour that changed by
accident.

- [ ] **Step 1: Rehome the tests first**

`UserProfile.test.tsx` is deleted at the end of this task, so its assertions must land in their new
homes *before* the component goes. Map, one row per `describe` in the current file:

| Current describe | New home |
|---|---|
| `unauthenticated state` | `ProfilePage.test.tsx` (Task 4 already covers it) |
| `profile display` (email, group, username, role) | `AccountCard.test.tsx`, `GroupMembershipCard.test.tsx` |
| `profile display` (active character, empty character list) | `CharactersCard.test.tsx` |
| `username editing`, `username save` | `UsernameEditor.test.tsx`, `useUsernameEditor.test.ts` |
| `character management`, `character name async operations`, `character update` | `CharacterRow.test.tsx`, `useCharacterRoster.test.ts` |
| `theme dropdown` | `AppearanceCard.test.tsx` (rewritten in Task 7 — the dropdown becomes three cards) |
| `destructive actions`, `delete account` | `DangerZoneCard.test.tsx`, `LeaveGroupDialog.test.tsx`, `DeleteAccountDialog.test.tsx` |
| `close button` (4 tests) | **No successor.** The spec deletes the button. `ProfilePage.test.tsx` gains `test("renders no Close button under the danger zone")`, so the DoD line is asserted even though the assertions invert |

- [ ] **Step 2: Extract the hooks first, then the components**

Hooks carry the behaviour; components carry the markup. Extracting in that order means each
component is a rendering change with a tested hook underneath it.

- `useUsernameEditor(currentUsername)` → `{ value, setValue, isEditing, open, cancel, submit, checking, valid, available, error }`, holding Task 2's `null`-is-unchecked state machine.
- `useCharacterRoster()` → `{ characters, activeCharacterId, add, rename, remove, setActive, rowErrors, addError, saving }`. Errors keyed by character id (`Record<string, string>`); the shape is what makes Task 8's per-row errors a rendering detail rather than a rewrite.

- [ ] **Step 3: Extract the components**, each with the markup it has today:
      `AccountCard`, `GroupMembershipCard` (+ `UsernameEditor`), `CharactersCard` (+ `CharacterRow`),
      `AppearanceCard`, `DangerZoneCard` (+ the two dialogs).

- [ ] **Step 4: Compose them in `ProfilePage`** and delete `UserProfile.tsx`, its test, and the
      barrel's `UserProfile` export. Add the cards the page imports to the barrel — the page is in
      `pages/`, so it must come through it.

- [ ] **Step 5: Verify no file exceeds ~400 lines**

```bash
wc -l src/features/user-management/profiles/components/*.tsx src/pages/profile/*.tsx | sort -n
```

- [ ] **Step 6: Verify and commit** — `refactor(profile): split the profile into per-section cards`

---

## Task 6: Scope the cards, and say which scope each one is

Now the cards say what they govern. Per the spec, scope is the organising principle: the account
card applies everywhere, the group card applies to one membership, and the page says so in words
rather than by adjacency.

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
  test("marks the active character and offers 'Post as this' only on the others")
```

- [ ] **Step 2: Implement the copy and the grids**

Account card is a `grid grid-cols-[170px_1fr_auto]`. The group card is titled with
`activeGroup.name` and carries the role pill (`tag` utility) beside it. The posting-as row is
**display-only** — star, name, and the muted `— new chapters, quests and rumours are credited to
this name`. Changing it happens in the Characters card or the header menu; two controls for one
value on one screen is what the current profile does.

The separate "Active Character" block is deleted here: it duplicated what the Characters list
already says.

- [ ] **Step 3: Wire `Join another`**

Extract `Header.handleJoinedGroup` into `features/user-management/groups/hooks/useJoinGroupCompletion.ts`
verbatim, comments included — refresh, find the group that appeared, switch to it, log a landing
failure rather than invent error UI. Both `Header` and `AccountCard` mount `JoinGroupDialog` and
both call this hook.

PR 3 landed a "mount the join dialog once" commit; the invariant it protects is **one behaviour**,
not one mount, and the hook is what preserves it now that a second surface legitimately needs the
action. Add a test asserting both entrances call the same completion path, so the invariant has an
owner.

- [ ] **Step 4: Verify and commit** — `feat(profile): scope the cards, and say which scope each one is`

---

## Task 7: Store the theme on the account, not the membership

The spec (§1.2) corrects the PR's framing: switching group does not restyle anything, because
`SessionManager` applies the stored theme once behind a ref (`SessionManager.tsx:22-42`). The real
symptom is that your theme is whichever group happened to be active when you last signed in.

Two things the PR asks for are already true and must not be re-implemented: `ThemeContext`
writes `localStorage` on every change and reads it before first paint
(`ThemeContext.tsx:24-37,45`).

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

- [ ] **Step 2: Extend the type**

`core/types/user.ts`, on `UserProfile`:

```ts
/** Account-scoped preferences. Theme lives here, not on a membership, so it
 *  cannot depend on which group was active at sign-in. */
preferences?: {
  theme?: string;
  [key: string]: unknown;
};
```

The Firestore rule for `users/{userId}` permits a self-write of any field but `isAdmin`, so no rules
change is needed — verified against `firebase/firestore.rules.prod:147`.

- [ ] **Step 3: `useAccountTheme`**

Applies through `setTheme` immediately, then persists with `updateUserProfile`. A failed write
surfaces its message and leaves the applied theme alone: the user asked for this theme, the local
change is already correct, and reverting the screen to punish a failed write is the behaviour the
character rows are being fixed for in Task 8.

- [ ] **Step 4: `SessionManager` and the migration**

```
account theme exists            → apply it
no account theme, group theme   → apply it, and write it to the account (one-time migration)
neither                         → leave ThemeContext on its localStorage value
```

The migration takes the theme of **the group active at the moment it runs** — the same value the
current code would have applied at that sign-in, so nothing changes under the user. Group-level
`preferences.theme` values are left in place: they are stale after this, and clearing them buys a
second write per user and nothing else.

The `initialThemeApplied` ref goes. With an account-scoped value there is no per-group change to
guard against, so the effect can depend on the profile honestly.

- [ ] **Step 5: The Appearance card**

Three side-by-side option cards, each a swatch + name, the selected one carrying a border, a focus
ring and a check. This deletes the custom dropdown and its click-outside handler.

- [ ] **Step 6: Verify and commit** — `feat(profile): store the theme on the account, not the membership`

---

## Task 8: Label the character actions and confirm removal

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

- [ ] **Step 2: Per-row errors**

`rowErrors: Record<string, string>` in the hook; `CharacterRow` renders `rowErrors[character.id]`
under its own name. This is the whole of the PR's "render the failure on the row that failed", and
the reason the mutations moved into a hook in Task 5: eight `setError` calls against one slot is
what a single component naturally produces.

- [ ] **Step 3: Rename in the row**

Today `Rename` hijacks the add-row input at the top, which is why the add button mutates into two
icon buttons mid-flow. The row swaps its name for an input with its own confirm and cancel; the add
row is untouched and stays available throughout.

- [ ] **Step 4: Inline removal confirmation**

`Remove {name}? Remove / Cancel`, on the row — not a dialog. It is one destructive click on a list
item, and the two dialogs on this page are reserved for ending a membership or an account.

- [ ] **Step 5: Drop the accent ring** on the active row. The star and the `posting as` marker are
      enough; the ring makes a list item the loudest element on the page.

- [ ] **Step 6: Verify and commit** — `feat(profile): label the character actions and confirm removal`

---

## Task 9: Say what leaving and deleting actually affect

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

- [ ] **Step 2: `DocumentService.getCollectionCount(path)`**

A `getCountFromServer` over a collection path. `CampaignService.getCampaignCounts` already proves
the pattern (`CampaignService.ts:173-185`); this is the general form the notes clause needs.

- [ ] **Step 3: `useGroupFootprint(groupId)`**

| Clause | Source |
|---|---|
| `N campaigns` | `campaign.getCampaigns(groupId)` |
| `N chapters` | `campaign.getCampaignCounts(groupId, campaignId)` per campaign, summed |
| `N of your own notes` | `getCollectionCount("groups/{groupId}/users/{uid}/notes")` — notes are a flat per-user collection, so "your own notes in this group" is exactly this path |

Fetches when the danger-zone card mounts. **Omits any clause whose count has not resolved** — a
failed count is not an error state; the sentence reads correctly with two clauses and the button
does not depend on it. `useCampaignCounts` set this precedent one PR ago.

- [ ] **Step 4: The two rows**

Each states its scope in words *before* its button. `Leave {group}` gets an outlined error button;
`Delete your account` gets a **solid** error button on a tinted ground, because they are not
equivalent actions and today they are two identical outline buttons stacked on each other.

- [ ] **Step 5: Fix the leave sequence**

`handleGroupLeave` currently calls `onCancel()`, then `await refreshGroups()`, then
`window.location.href = "/"` — closing the surface it is inside, then discarding the refresh it just
waited for. On a page: `await` the service, `await refreshGroups()`, then `navigate("/")`. The
awaited refresh is now what makes the redirect correct rather than a value thrown away one line
before a hard navigation.

Account deletion: `await` the service, `await signOut()`, `navigate("/")`.

- [ ] **Step 6: Gate the delete confirm** on the typed account email, compared case-insensitively
      after trimming. The email is on screen in the account card above; this is a speed bump, not a
      memory test.

- [ ] **Step 7: Delete the trailing `Close` button.** Everything here saves as you go, so a button
      that looks like a form's primary action one row under `Delete account` is actively dangerous.

- [ ] **Step 8: Verify and commit** — `feat(profile): say what leaving and deleting actually affect`

---

## Task 10: One named account menu

What this replaces is the **hamburger**, not the file the PR names: `UserProfileButton` renders
three ghost icons but nothing renders `UserProfileButton` (spec §1.3). Mobile navigation is a
separate bar mounted in `Layout` (`Navigation variant="mobile"`), so removing the hamburger strands
nothing.

- [ ] **Step 1: Move `usePopoverKeys` to `shared/hooks/`**, with its test, and update
      `ContextSwitcher`'s import. It is a general keyboard contract with two callers now, and
      leaving it filed under the name of the first component that needed it is how shared behaviour
      gets copied instead of imported. Run the context-switcher suites and confirm they are
      untouched by the move.

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

- [ ] **Step 3: Build the menu** — one trigger chip (avatar, posting-as name, chevron) opening a
      ~284px popover: header (username + `Admin in {group}`), `POSTING AS` list, rule, theme
      segmented control, rule, `Profile and settings ›`, the `Group members` count, `Report a
      problem`, `Admin panel` (admins only), `Sign out` in a quieter weight.

      `Group members` is a **count, not a control** (spec §9.3): member management is out of scope
      and lives in the admin panel, so a row that navigates nowhere for non-admins would be a dead
      control for most of the people who see it.

      `Report a problem` carries `?from=${encodeURIComponent(location.pathname)}` exactly as
      `Header.handleReportProblem` does today. That parameter is the only thing that tells the
      report which page the problem was on — by the time the form renders, the path is always
      `/contact`. `Header.tsx:96` carries a `TODO(PR 4)` saying so; delete the TODO with the move.

- [ ] **Step 4: Strip the header**

Remove the hamburger, its click-outside and positioning effects, both dialog mounts, and the desktop
`Sign Out` button. Keep the `JoinGroupDialog` mount (now driven by `useJoinGroupCompletion`), the
`AdminPanel` dialog and the `SignInForm` dialog — the menu opens the first two, and the third is for
signed-out users.

When signed out, the header keeps a `Sign In` button **at every width** (the hamburger carried the
mobile one) plus the existing `ThemeSelector`, so theme stays reachable without an account. The
user menu renders only for signed-in users.

- [ ] **Step 5: Delete `UserProfileButton.tsx` and its test** (spec §9.1). Confirm nothing imports
      it first:

```bash
grep -rn "UserProfileButton" src --include=*.tsx --include=*.ts | grep -v "auth/components/UserProfileButton"
```

- [ ] **Step 6: Also delete `useTheme()`'s unused destructure** — it is in the file being deleted, so
      this resolves itself; note it in the commit body so the PR's §6 bullet is visibly answered.

- [ ] **Step 7: Verify and commit** — `feat(header): one named account menu`

---

## Task 11: Record what the redesign changed

- [ ] **Step 1: Update `CLAUDE.md`** — the profile is a page, theme is account-scoped, and the
      four-resolver / region trap now has a worked example: a bare `getFunctions()` passes every
      gate and reaches a region with nothing in it.

- [ ] **Step 2: Record the two unfixed siblings** of the region bug —
      `GroupService.createGroup:59` and `CampaignService.deleteCampaign:243` — in
      `docs/testing/bug-tracking/README.md`, with the reasoning from spec §1.1. They are real, they
      are out of scope here, and they should not have to be rediscovered.

- [ ] **Step 3: Append an outcome section to the spec**, as PR 3 did: what the plan predicted, what
      it got wrong, and what the next person should know.

- [ ] **Step 4: Run the three gates**

```bash
npx tsc --noEmit
npm test
npm run build
```

Compare against the baseline: **0 failed / 2 skipped / 4538 passed across 209 suites**, plus this
PR's new suites, minus the two deleted ones.

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
| No `Close` button below `Delete account` | 9 |
| One named header menu; posting-as and theme without leaving the page; `Report a problem` | 10 |
| `undefined's profile` cannot appear anywhere | 3, and structurally 4 + 10 |
| `npm test` passes with the profile suites updated | every task; gates in 11 |
