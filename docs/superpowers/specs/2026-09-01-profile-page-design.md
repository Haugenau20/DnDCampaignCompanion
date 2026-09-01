# Profile page and header menu — design

**Date:** 2026-09-01
**Branch:** `redesign/profile-page` (off `main` at `b73232a`)
**PR:** 4 of the redesign series. Design reference: screenshots `7a` (page) and `7b` (menu).

This document does not restate the PR description, which is the spec. It records the
decisions the spec leaves open, and the four things the spec could not have known because
they are one or two layers below the files it lists.

---

## 1. What is actually wrong today

Everything the spec asserts about `UserProfile.tsx` checks out: 797 lines, eight sections,
two `Dialog`s nested inside a dialog, `maxWidth="max-w-md"`, one `error` slot at the
bottom, a `Close` button one row under `Delete Account`. Reading down from it into the
services turns up four things the spec does not mention, one of which is more serious than
anything in the spec.

### 1.1 The two destructive actions are calling a region where the functions do not exist

`handleGroupLeave` and `handleAccountDelete` call bare `getFunctions()`
(`UserProfile.tsx:138`, `:173`). With no arguments the Firebase JS SDK resolves the
**default region, `us-central1`**.

Every Cloud Function in this repo is deployed to `europe-west1` — all seven `onCall`
declarations, `deleteUser` (`deleteUser.ts:12`) and `removeUserFromGroup`
(`removeUserFromGroup.ts:8`) among them. `BaseFirebaseService` knows this: it builds
`getFunctions(app, 'europe-west1')` and registers it as `"functions"`
(`BaseFirebaseService.ts:49,80`), which is the instance `ContactForm` fetches from the
registry and the only one that reaches the deployed functions.

So the spec's §3 bullet — "bypassing the `ServiceRegistry` that `ContactForm` uses" — is
not a style point. **Leave group and delete account are calling `us-central1` and cannot
be working in production.** The registry is what carries the region.

`GroupService.removeUserFromGroup` (`GroupService.ts:150`) has the same defect, as does
`GroupService.createGroup` (`:59`) and `CampaignService.deleteCampaign` (`:243`) — all
three use bare `getFunctions()` inside a service that already holds a correctly-regioned
`this.functions` from its base class. This PR fixes the one it routes through
(`removeUserFromGroup`) and records the other two rather than widening.

### 1.2 The theme bug is not the one the spec describes

The spec says storing theme per-membership means "switching group can silently restyle the
app". Switching group does not restyle anything: `SessionManager` applies the stored theme
behind `initialThemeApplied.current`, a ref set on the first profile load and cleared only
on sign-out (`SessionManager.tsx:22-42`). After that first application it ignores every
subsequent `activeGroupUserProfile`.

The actual symptom is worse for being quieter: **your theme is whichever group happened to
be active when you last signed in.** Pick Dark in The Fellowship, sign in some day with
The Council of Elrond active, and you get the Council's theme — with no way to tell why,
because nothing on screen connects the two. The fix the spec asks for (account scope) is
right; the reason to write it down is that the migration has to read a value that may be
stored under either of two groups, and neither is more authoritative than the other. §4.3
picks one and says why.

Two things the spec asks for are already true and should not be re-implemented:
`ThemeContext.applyThemeToDOM` writes `localStorage` on every theme change and the
provider reads it before first paint (`ThemeContext.tsx:24-37,45`). The "mirror to
`localStorage` so first paint is right" half of §3 is done.

### 1.3 The header menu the spec describes is not the one on `main`

§6 says `UserProfileButton` renders the three unlabelled ghost icons in the header. It
does render them — but **nothing renders `UserProfileButton`.** Grep finds no JSX usage
and no barrel export; it is dead. PR 3 rebuilt the header around its own hamburger menu,
and that menu is what actually carries Profile / Report / Groups / Admin today
(`Header.tsx:243-320`), alongside its own second copy of the profile dialog.

So there are two copies of the profile dialog mount, both carrying the §4 title bug
(`Header.tsx:359`, `UserProfileButton.tsx:93`), and §6's "replace them with one trigger"
applies to the **hamburger**, not to the file it names. This changes what the PR touches;
see §6 and the open question in §9.1.

### 1.4 The rest, confirmed

- **§5 validation**: the debounce effect returns early on `!isEditingUsername` and sets
  `usernameValid = usernameAvailable = true` (`UserProfile.tsx:87-92`). Opening the editor
  starts in a passing state. `null` initialisation is the whole fix — `Save`'s
  `disabled` already requires both flags truthy, so `null` disables it for free.
- **§3 row errors**: every character mutation rolls local state back on failure and writes
  the message to the single bottom `error` slot. Confirmed for add, rename, set-active and
  delete.
- **§7 dead props**: `UserProfileProps.onSaved` is declared, passed by both dialog mounts,
  and destructured by neither. `UserProfileButton` destructures `setTheme` from
  `useTheme()` and never reads it.
- **`handleGroupLeave`** does `onCancel()` → `await refreshGroups()` → `window.location.href`,
  which closes the dialog it is inside, then discards the refresh it just waited for.

---

## 2. Where the code goes

### 2.1 The page is a page; the sections belong to the domain

`ProfilePage` owns the shell — back link, `h1`, subtitle, the two-column grid, the rail —
and nothing else. Every card is a component in `features/user-management/profiles/`,
exported through the domain barrel. This is the `pages/` → feature-barrel edge the
dependency rules already allow, and it keeps 27KB of profile behaviour out of `pages/`
exactly as the spec asks.

```
src/pages/profile/
├── ProfilePage.tsx              # shell: back link, heading, grid, rail, section ids
├── ProfileSectionRail.tsx       # sticky rail + which section is showing
└── index.ts

src/features/user-management/profiles/
├── components/
│   ├── AccountCard.tsx          # email, groups you're in, Join another
│   ├── GroupMembershipCard.tsx  # group name + role pill, name-in-group, posting as
│   ├── UsernameEditor.tsx       # the inline edit, its validation and its states
│   ├── CharactersCard.tsx       # list + add row; owns nothing but layout
│   ├── CharacterRow.tsx         # one character: star, name, three labelled actions, its own error
│   ├── AppearanceCard.tsx       # three theme option cards
│   ├── DangerZoneCard.tsx       # the two rows and their sentences
│   ├── LeaveGroupDialog.tsx
│   └── DeleteAccountDialog.tsx
└── hooks/
    ├── useCharacterRoster.ts    # character state + the four mutations + per-row errors
    ├── useUsernameEditor.ts     # debounced validation, the null-is-unchecked state machine
    ├── useAccountTheme.ts       # read/write account theme, one-time migration
    └── useGroupFootprint.ts     # the counts the leave sentence needs
```

`UserProfile.tsx` is **deleted**, not reduced. Its two consumers are the two dialog mounts,
both of which go away; the barrel export is the only other reference. Keeping a thin
composition component behind that name would preserve exactly the shape that let a second
copy of the dialog live undetected for a release cycle (§1.3). The barrel loses
`UserProfile` and gains the cards the page composes. See §9.2.

### 2.2 The menu is a header popover, like the last one

PR 3 put the context switcher in `shared/components/context-switcher/` because it is a
header element that needs several domains at once. The user menu is the same shape — auth,
groups, theme, routing — so it goes beside it:

```
src/shared/components/user-menu/
├── UserMenu.tsx                 # trigger + popover; owns open state
├── UserMenuTrigger.tsx          # avatar + posting-as name + chevron chip
├── PostingAsList.tsx            # character rows, check on the current one
├── ThemeSegmented.tsx           # Light / Dark / Med.
└── UserMenuLinks.tsx            # profile, members, report, admin, sign out
```

`usePopoverKeys` — focus trap, arrows, Home/End, Escape-to-trigger — is written and tested
and now has a second caller. It moves to `shared/hooks/usePopoverKeys.ts`, with its test.
The alternative, importing it across sibling folders inside `shared/components/`, works and
is legal, but it would leave a general keyboard contract filed under the name of the first
component that happened to need it.

### 2.3 Services

| Change | Why |
|---|---|
| `GroupService.removeUserFromGroup` uses `this.functions` | §1.1 — the method already exists and already wraps the callable; it is calling the wrong region |
| `UserService.deleteAccount(userId)` — new, uses `this.functions` | Gives the page a service to call instead of `httpsCallable` in a component; matches `BaseFirebaseService` convention |
| `DocumentService.getCollectionCount(path)` — new | `getCountFromServer` on a path; the notes clause in §5.2 needs it and `CampaignService` already proves the pattern |

No component in this PR imports `firebase/functions`.

---

## 3. The page

**Layout.** `max-w-7xl mx-auto px-4 py-8` per the other pages, then a
`grid grid-cols-[212px_1fr] gap-7` that collapses to one column below `md`. On one column
the rail becomes nothing at all rather than a horizontal strip: it is a shortcut to six
cards on a page you can already scroll, and a scrolling tab strip above the content would
cost more than it saves.

**The rail** tracks the visible section with an `IntersectionObserver` over the card
elements, falls back to "first section" when the observer has not fired, and moves focus to
the card heading on click so keyboard and pointer end up in the same place. Each card gets
an `id` and `aria-labelledby`; the rail is a `nav` of anchors, not buttons, so the sections
are linkable (`/profile#characters`).

**States.**

| State | Page renders |
|---|---|
| Signed out | The shell, and one card: "You need to be signed in to see your profile", with the sign-in trigger. Not a redirect — the URL must stay linkable, which is the point of the PR |
| Signed in, no active group | Account card and Appearance card only. The three group-scoped cards state that they need a group, and the danger zone shows only `Delete your account` |
| Loading | The shell plus skeleton cards; `useGroups().loading` already distinguishes "no groups" from "not loaded yet" |

**Back link** reuses `ContactPage`'s wording exactly: `Back to {activeCampaign.name}`,
falling back to `Back to the campaign`. Two pages phrasing the same link two ways is how
the old header ended up with three names for the same destination.

---

## 4. Scope is the organising principle

### 4.1 What the group card can and cannot show

The card is titled with the active group and carries that membership's settings. The other
group's name and characters are **not** editable from here — the account card names the
groups, and the subtitle says the other one keeps its own. Making both memberships editable
on one page would need a group picker inside a page that already has a group in its
context, which is the ambiguity the switcher redesign just removed. Editing a second
membership means switching to it.

### 4.2 `Posting as` replaces the Active Character block

The group card's `Posting as` row is display-only — star, name, and the explanation that
new chapters, quests and rumours are credited to it. Changing it happens in the Characters
card below, or in the header menu. Two controls for one value on one screen is what the
current profile does.

### 4.3 The theme migration

Account theme lives at `users/{uid}.preferences.theme`. `UserProfile` (the type) gains
`preferences?: { theme?: string; [key: string]: unknown }`; the Firestore rule for
`users/{userId}` permits a self-write of any field but `isAdmin`, so no rules change.

`SessionManager` becomes:

```
account theme exists            → apply it
no account theme, group theme   → apply it, and write it to the account (one-time migration)
neither                         → leave ThemeContext on its localStorage value
```

**Which group's theme wins.** A user with two memberships can have two stored themes and
nothing distinguishes them. The migration takes the theme of **the group that is active at
the moment it runs** — the same value the current code would have applied at that sign-in,
so the migration is a no-op on screen and the user's theme does not change under them.
Group-level `preferences.theme` values are left in place; they are stale after this, and
deleting them buys nothing but a second write per user.

`handleChangeTheme`'s `updateGroupUserProfile` becomes `updateUserProfile`, and the ref
gymnastics in `SessionManager` go: with an account-scoped value there is no per-group
change to guard against, so the effect can depend on the profile honestly.

### 4.4 Character rows

Each row owns its own error slot. `useCharacterRoster` keys failures by character id
(`Record<string, string>`), so a failed rename renders under the row it reverted, and a
failure on one row does not clear the message on another. The add row keeps a single error
of its own. This is the whole of the spec's "render the failure on the row that failed",
and it is the reason the mutations move into a hook: eight `setError(...)` calls against
one slot is what a single component naturally produces.

Rename edits **in the row**, not in the add-row input at the top. Today `Rename` hijacks
the add field, which is why the add button changes into two icon buttons mid-flow.
`Remove` gets a confirmation — an inline "Remove {name}? Remove / Cancel" on the row, not
a dialog. It is one destructive click on a list item, and the two dialogs on this page are
reserved for the things that end a membership or an account.

---

## 5. Leaving and deleting

### 5.1 What the buttons do

Both open dialogs from a page, and both go through services (§2.3). After a successful
leave: `await refreshGroups()`, then `navigate('/')` — the awaited refresh is now the thing
that makes the redirect correct rather than a value thrown away one line before a hard
navigation. After a successful delete: `await signOut()`, then `navigate('/')`.

Account deletion enables its confirm button only when the typed text matches the account
email, compared case-insensitively after trimming. The email is on screen in the account
card directly above; this is a speed bump, not a memory test.

### 5.2 The counts

The leave sentence wants three numbers. What each costs:

| Clause | Source | Cost |
|---|---|---|
| `N campaigns` | `campaign.getCampaigns(groupId)` | one query, already used by `useGroupSummaries` |
| `N chapters` | `campaign.getCampaignCounts(groupId, campaignId)` per campaign | one server-side count per campaign; `getCountFromServer`, no documents read |
| `N of your own notes` | `getCollectionCount('groups/{g}/users/{uid}/notes')` | one count. Notes are a flat per-user collection, so "your own notes in this group" is exactly this path |

`useGroupFootprint` fetches all three when the danger-zone card mounts, and **omits any
clause whose count has not resolved**, per the spec's instruction to drop rather than
guess. A failed count is not an error state: the sentence reads correctly with two clauses,
and the button does not depend on it. `useCampaignCounts` set this precedent one PR ago.

The chapter count is a fan-out over campaigns. Groups here have two or three; if that ever
stops being true the clause is the first thing to drop, not a reason to build a
denormalised counter.

---

## 6. The header menu

**What it replaces.** The hamburger (§1.3), the desktop `Sign Out` button beside it, and
both profile dialog mounts. Mobile navigation is a separate bar mounted in `Layout`
(`Navigation variant="mobile"`), so removing the hamburger strands nothing.

**Signed out**, the header keeps a `Sign In` button — at every width now, since the
hamburger that carried the mobile one is gone — plus the existing `ThemeSelector`, so
theme stays reachable without an account. The user menu renders only for signed-in users.

**Contents**, per `7b`: username and `Admin in {group}`; the posting-as list; a rule; the
theme segmented control; a rule; `Profile and settings ›`, `Group members`,
`Report a problem`, `Sign out`, and `Admin panel` for admins only. `Report a problem`
carries `?from=` exactly as `Header.handleReportProblem` does today — that parameter is
the only thing that tells the report which page the problem was on, and its `TODO(PR 4)`
comment is this PR.

`Group members` is a **count, not a link**, for everyone: a static line beside the heading
rows. Member management lives in the admin panel and the spec puts it out of scope, so a
row that navigates nowhere for non-admins would be a dead control. Admins reach the list
through `Admin panel`. See §9.3.

**Switching posting-as from the menu** writes `activeCharacterId` through the same
`updateGroupUserProfile` path the page uses, and closes the popover on success. A failure
keeps the popover open with the message inside it — the pattern `ContextSwitcher` landed on
after its error overlay outlived the surface it belonged to.

`JoinGroupDialog` is now wanted from two surfaces: the header (switcher chip, as today) and
the account card's `Join another`. PR 3's rule was that the same action must not have two
different outcomes — the fix it chose was a single mount, but the invariant is one
*behaviour*. `Header.handleJoinedGroup` (refresh, find the new group, switch to it, log a
landing failure rather than invent error UI) moves into
`features/user-management` as `useJoinGroupCompletion`, and both mounts use it.

---

## 7. Testing

Baseline on this branch: **0 failed / 2 skipped / 4538 passed across 209 suites.** Any red
is a regression, and no test is edited to pass.

`UserProfile.test.tsx` is replaced, not amended: the component it tests is deleted and its
behaviour lands in eight files. Every test in it maps to a new home — display assertions to
the card suites, the username tests to `UsernameEditor`, character tests to
`CharacterRow`/`useCharacterRoster`, destructive-action tests to the two dialog suites. The
four `close button` tests describe a button the spec deletes, and are the only ones with no
successor; the DoD line "No `Close` button below `Delete account`" is asserted in
`ProfilePage.test.tsx` instead, so the intent survives even though the assertions invert.

`UserProfileButton.test.tsx` goes with its component (§9.1).

New suites: `ProfilePage`, each card, `useCharacterRoster`, `useUsernameEditor`,
`useAccountTheme`, `useGroupFootprint`, `UserMenu`, `ThemeSegmented`, plus a
`SessionManager` case for each of the three migration branches in §4.3. The menu inherits
`usePopoverKeys`' existing suite; `UserMenu`'s own tests assert the contract PR 3 set —
click-outside, Escape, focus return, `aria-expanded` — because the hook being tested does
not prove the component wired it up.

Three gates before proposing a merge: `npx tsc --noEmit`, `npm test`, `npm run build`. The
third is not implied by the first two.

---

## 8. Commit sequence

Ordered so each commit is independently reviewable and the tree is green at every step. The
first three are bug fixes that stand on their own if the redesign is deferred.

| # | Commit | Contents |
|---|---|---|
| 1 | `fix(profile): call the callables in the region they are deployed to` | §1.1 — `GroupService`, new `UserService.deleteAccount`, `UserProfile` calls the services |
| 2 | `fix(profile): stop the username editor starting in a valid state` | §5 of the spec / §1.4 here |
| 3 | `fix(profile): stop the dialog title reading undefined's profile` | §4 of the spec, both mounts |
| 4 | `feat(profile): a page at /profile` | Route, `ProfilePage`, rail, back link, states |
| 5 | `refactor(profile): split the profile into per-section cards` | §2.1; behaviour unchanged, tests move |
| 6 | `feat(profile): scope the cards, and say which scope each one is` | Account/group/characters/appearance copy, role pill, posting-as row |
| 7 | `feat(profile): store the theme on the account, not the membership` | §4.3 incl. migration |
| 8 | `feat(profile): label the character actions and confirm removal` | §4.4 incl. per-row errors |
| 9 | `feat(profile): say what leaving and deleting actually affect` | §5, counts, typed-email confirm, no `Close` button |
| 10 | `feat(header): one named account menu` | §6; hamburger and both dialog mounts removed |
| 11 | `docs(profile): record what the redesign changed` | CLAUDE.md + this spec's outcome |

---

## 9. Open questions

These change what gets written and I would rather ask than assume.

**9.1 `UserProfileButton` — delete it?** It is dead code (§1.3) whose entire content is
superseded by the new menu, and it carries its own copy of the title bug. My
recommendation is to delete it and its 249-line test in commit 10. The DoD says
"`UserProfileButton.test.tsx` updated", which was written on the assumption that the
component is live. Deleting removes a test file rather than updating one.

**9.2 `UserProfile.tsx` — delete it?** Same question one level up. The spec says "keep the
`UserProfile` component exported if anything else imports it"; nothing does, once the
dialog mounts go. My recommendation is to delete it and export the cards.

**9.3 `Group members` — a count or a control?** `7b` shows `Group members  5`. I have it as
a static count (§6) because member management is out of scope and non-admins have nowhere
to go. The alternative is admins-only, opening the admin panel's member view — which makes
it a second admin entry point in a menu that already has one.

**9.4 The chapter count.** One `getCountFromServer` per campaign in the group, on page
load, for a sentence in a card most users will never act on. The alternative is fetching it
when the leave dialog opens, which makes the card's sentence shorter than the mock until
you click. I have it eager, matching `7a`; say if the read cost is not worth it.
