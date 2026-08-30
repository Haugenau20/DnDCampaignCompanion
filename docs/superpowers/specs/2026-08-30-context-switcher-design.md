# Group and campaign switching — design

**Date:** 2026-08-30
**Branch:** `redesign/context-switcher` (off `main` at `87638fa`)
**PR:** 3 of the redesign series. Design reference: screenshot `6a`.

This document does not restate the PR description, which is the spec. It records the
decisions the spec leaves open, and the two things the spec could not have known because
they are two layers below the files it lists.

---

## 1. What is actually wrong today

The PR description names §1 as the most serious bug. It is real, but it is a symptom.
Reading down from `ContextSwitcher` into `FirebaseContext` turns up something larger.

**Neither setter switches anything.**

- `useGroups().setActiveGroup` (`useGroups.ts:69`, aliased from `switchGroup`) writes
  `activeGroupId` onto the Firestore user profile and then calls `refreshGroups()`.
  `refreshGroups` (`FirebaseContext.tsx:158`) re-lists the user's groups and calls
  `setActiveGroupContext` **only** when the user has exactly one group and none is active.
  In every other case the React state `activeGroupId` is untouched.
- `useCampaigns().setActiveCampaign` (`useCampaigns.ts:84`) sets the campaign on the
  *service* singleton, writes the group user profile, and calls `refreshCampaigns()`.
  `refreshCampaigns` (`FirebaseContext.tsx:180`) sets `activeCampaignId` only
  `if (groupCampaigns.length > 0 && !activeCampaignId)` — that is, only when there is no
  active campaign at all.

So after both awaits resolve, the app's context still describes the **old** group and the
**old** campaign. The only thing that makes a switch visible is the
`window.location.reload()` on the next line, which discards the SPA and lets
`onAuthStateChanged` → `loadUserProfile` → `loadGroups` → `setActiveGroupContext` rebuild
the context from the profile that was just written.

This inverts the PR description's framing of §3. The reload is not a lazy way to refresh
data that would otherwise refresh itself; it is currently the entire switching mechanism.
Deleting it without replacing it would produce a switcher that writes to Firestore and
changes nothing on screen until the next page load. **§3 is therefore a prerequisite for
§2, not an independent cleanup**, and it is why this work is architectural rather than a
component rewrite: the fix has to happen in `FirebaseContext`, which every domain sits
under.

**§1, restated in that light.** `CampaignSelector` bails on `if (!activeGroupId)` and
takes its list from `useCampaigns().campaigns`, which `FirebaseContext` populates for the
**active** group. Selecting a different group in the list changes only `selectedGroupId`,
a local `useState`. So the campaign list keeps showing the active group's campaigns, and
`handleApplyChanges` writes `activeGroupId = councilId` followed by
`activeCampaignId = fellowshipCampaignId`. The pairing is invalid and survives the reload,
because both values were persisted.

**Two smaller defects, both named in the spec, both confirmed.**
`hasChanges` is computed at `ContextSwitcher.tsx:51` and passed to `ContextButton`, whose
props type declares it and whose destructure is `({ isOpen, setIsOpen })` — the value is
read nowhere. And `handleApplyChanges`' single `try/catch` only `console.error`s, so a
group write that succeeds followed by a campaign write that fails leaves exactly the
invalid pairing §1 describes, silently.

---

## 2. The switch mechanism

`setActiveGroupContext` (`FirebaseContext.tsx:86`) already performs the correct sequence:
set the service group → set `activeGroupId` → load the caller's group user profile → load
**that group's** campaigns → activate its stored `activeCampaignId`, falling back to the
first campaign when the stored id names a campaign that no longer exists. It is private to
the provider. The whole of §2 and §3 follows from making it reachable.

```
FirebaseContext
  + switchGroup(groupId: string): Promise<void>
        persist users/{uid}.activeGroupId, then setActiveGroupContext(groupId)
  + switchCampaign(campaignId: string): Promise<void>
        persist groups/{g}/users/{uid}.activeCampaignId,
        firebaseServices.auth.setActiveCampaign(id), then setActiveCampaignId(id)

useGroups().setActiveGroup       → delegates to switchGroup
useCampaigns().setActiveCampaign → delegates to switchCampaign
```

Both keep their current names and signatures, so no call site outside this PR changes.
The delegation is what makes them true rather than a shape that only worked because a page
reload followed.

**Rejected alternative — a custom DOM event.** `FirebaseContext.tsx:60` already dispatches
an `authStateChanged` event that `useFirebaseData` listens for, and a `contextChanged`
event would fit that precedent without widening the context type. Rejected: that event is
already the reason data refetches at moments no reader of a component can predict, and a
second one would make the switch path invisible in exactly the way this PR is trying to
undo. A context function that returns a promise is also what the undo path needs, since
undo must be able to observe its own failure.

### Consumers

Verified by reading the effect dependency lists, not inferred:

| Consumer | Reacts to a campaign change today? |
|---|---|
| `useNPCData`, `useLocationData`, `useQuestData`, `useRumorData` | Yes — `[fetch…, activeGroupId, activeCampaignId]` |
| `useChapterData` | Yes — `useChapterData.ts:50` |
| `StoryContext` story-progress | **No** — `StoryContext.tsx:143` depends on `hasRequiredContext` alone, which stays `true` across a switch |

`StoryContext`'s progress effect is the one consumer this PR must touch, and the only entry
for the PR description's "note any you had to touch". Adding `activeCampaignId` to its
deps is the whole fix; the existing comment above that effect already explains why the
effect exists at all, and should be extended rather than replaced.

---

## 3. Module boundaries

`ContextSwitcher.tsx` is 340 lines and holds five components. Every section of the spec
adds to it. It becomes a folder, following the `shared/components/contact/` precedent set
by PR 2.

```
src/shared/components/
└── context-switcher/
    ├── ContextSwitcher.tsx      # composes; owns popover, step and undo state
    ├── ContextTrigger.tsx       # the header chip
    ├── CampaignStep.tsx         # group header + Change · campaign rows · join row
    ├── GroupStep.tsx            # back header · group rows · footnote
    ├── UndoToast.tsx            # "Switched to X" + Undo, ~6s
    ├── useCampaignCounts.ts     # lazy chapter/NPC counts for non-active campaigns
    ├── useGroupSummaries.ts     # campaigns/members/role/joinedAt per group
    └── usePopoverKeys.ts        # focus trap, arrow navigation, Escape
```

`src/shared/components/ContextSwitcher.tsx` is deleted; nothing outside `Header` imports it.
The test file moves to `src/shared/components/context-switcher/__tests__/`.

| Unit | What it does | Depends on |
|---|---|---|
| `ContextTrigger` | Renders the active campaign name; carries `aria-expanded` and `aria-haspopup`; takes the selected treatment while open | `useCampaigns` (barrel) |
| `CampaignStep` | Group header row, one row per campaign, the join row | `useGroups`, `useCampaigns`, `useCampaignCounts` |
| `GroupStep` | Back header, one row per group, the footnote | `useGroups`, `useGroupSummaries` |
| `UndoToast` | Announces the switch, offers one action, self-dismisses | `Typography` only |
| `useCampaignCounts` | Chapter and NPC counts for campaigns other than the active one | `CampaignService` |
| `useGroupSummaries` | Campaign count, member count, own role, own `joinedAt` per group | `CampaignService`, `GroupService` |
| `usePopoverKeys` | Keyboard contract for an open popover | nothing |
| `ContextSwitcher` | Assembles them; owns which step is showing and what undo would restore | all of the above |

`shared/` importing `features/user-management`'s **barrel** is amended rule #3 in
CLAUDE.md — explicitly permitted, and `ContextSwitcher` is named in that amendment as one
of the four components it was written for. No import may reach a feature's internals.

---

## 4. Row metadata

Nothing the mock shows on a second line exists in the data model. `Campaign` has no counts,
no `lastOpened`, no `updatedAt`; `Group` has no member count. Every value has to be
fetched, and the decision is how much to spend.

**The active campaign costs nothing.** `StoryProvider` and `NPCProvider` are mounted above
`Layout` (`App.tsx:43-45`), and `Layout` contains `Header`, so `useStory()` and `useNPCs()`
are in scope inside the switcher. Its row reads `39 chapters · 16 NPCs · you're on chapter
9` from `chapters.length`, `npcs.length` and `storyProgress.currentChapter` — exact,
already loaded, no query.

**Other campaigns cost two aggregate reads each.**
`CampaignService.getCampaignCounts(groupId, campaignId)` runs `getCountFromServer` against
`groups/{g}/campaigns/{c}/chapters` and `…/npcs`. `getCountFromServer` is available in the
pinned `firebase@11.3.0` (`@firebase/firestore/dist/index.d.ts:1274`) and bills one read
per aggregation regardless of collection size. `firestore.rules.prod:284` grants
`allow read` on `/groups/{g}/campaigns/{c}/{collection}/{doc}` to any group member, which
covers `list` and therefore the aggregation; **no rules change is needed**. Their rows read
`12 chapters · 8 NPCs`. `useCampaignCounts` fires only when the popover opens, and only for
campaigns other than the active one.

**Group rows cost two ordinary reads each**, both through methods that already exist and
already permit any member: `CampaignService.getCampaigns(groupId)` and
`GroupService.getGroupUsers(groupId)` (`GroupService.ts:110` checks membership, not admin,
despite its "admin only" doc comment; `firestore.rules.prod:235` agrees). The user list
yields the member count, the caller's own `role`, and the caller's own `joinedAt` in one
pass — so `2 campaigns · 5 members · you're an admin` and
`1 campaign · 3 members · joined in April` cost nothing beyond it. `useGroupSummaries`
fires only when the group step opens.

**`last opened` is not implemented.** It is stored nowhere, and there is no `updatedAt` to
degrade to, so the spec's own fallback applies: omit the clause rather than invent a value.
No row anywhere says "last opened in March". Adding a `lastOpenedAt` per campaign was
offered and declined — it would show nothing until users had switched a few times, and it
is a schema change in a PR that already carries an interface change.

**Failure is silent by design.** A count that has not resolved yet, or that rejects, renders
the row with its name and no second line. The popover must never block on, or error over,
decoration.

---

## 5. Selection, undo, and errors

With staged state gone there is no "selected"; there is only "active". A row is either the
active one — tinted, with a single check on the right — or it is not. The mock's double
encoding (a tint *and* a check, while a different row is highlighted as the pending choice)
disappears along with the state it described.

**Switching a campaign** calls `setActiveCampaign(id)`. **Switching a group** calls
`setActiveGroup(id)`, which through `setActiveGroupContext` loads that group's campaigns and
activates the one the caller last had open there — the group step then returns to the
campaign step, which is now correct by construction. This is why §2 is the structural cure
for §1: once selection is application, a selected-but-inactive group cannot exist, and the
two lists cannot disagree.

**Undo** captures `{ groupId, campaignId }` immediately before a switch and restores that
pair. The toast always describes the most recent switch; a second switch inside the six
seconds replaces the toast and re-captures. Undo goes through the same `switchGroup` /
`switchCampaign` path and can fail the same way, so it reports its failure rather than
appearing to do nothing.

**Errors surface.** Every switch path — forward, undo, and post-join — reports a failure
inside the popover and leaves the previous context intact. In the §1 commit, which still
applies a group and then a campaign as two writes, "intact" means actively rolling the group
back when the campaign write fails; from the §2 commit onward it means a single write that
either lands or does not.

---

## 6. Colour

The mock's toast is a dark slab. It should not be built as one.

Commit `4f9d653` records the contact callout being changed from `--text-primary` /
`--bg-primary` inverted to `--bg-accent` with a `--color-primary` rule, because the
inversion gave light theme a heavy slab, dark theme a near-white block that read as an
alert, and medieval theme chocolate on parchment — *"a colour rule derived from tokens can
be provably legible in every theme and still belong in none of them."* The `.chip` comment
block at `components.css:940` records the same lesson reached from the other direction:
`.card` is not a neutral surface, because `theme-effects.css` gives medieval cards
decorative corner flourishes.

So: a new `.toast` class built on `--bg-accent` with a `--color-primary` `Undo` action, and
`.dropdown` (`components.css:338`) for the popover surface, which is what the current
switcher already uses and what every other floating panel in the app uses. Structure and
copy from the mock; colour from the tokens. Whether it *looks* right is a browser check
across all three themes, not a token argument — that is the part of the last PR's lesson
that generalises.

---

## 7. Ownership of the join dialog

`JoinGroupDialog` is mounted three times, not two: `Header.tsx:403` (from the hamburger's
Groups button, success → `refreshGroups`), `ContextSwitcher.tsx:153` (success → reload),
and `UserProfileButton.tsx:115` (success → `refreshGroups`). The third is unreachable —
`UserProfileButton` is not rendered anywhere in `src/`.

Both live entrances are inside `Header`, so `Header` is the common owner. It keeps the one
mount; `ContextSwitcher` takes an `onJoinGroup` callback prop and renders the row that calls
it. The single success behaviour is: refresh groups, switch to the newly joined group, show
the undo toast, no reload.

`joinGroupWithToken` returns `void` and no group id reaches the caller, so the new group is
identified by diffing the group list across `refreshGroups()` — the id that appears is the
one just joined. If no id appears (a re-join, or a race), the flow refreshes and shows no
toast rather than guessing.

`UserProfileButton` is left untouched. Deleting an unrendered component and its test suite
is a defensible call but a separate one, and this PR already carries a context-interface
change.

---

## 8. Header

The `Dialog` at `Header.tsx:426` and the `inDialog` prop are deleted; there is one mode.
`ContextSwitcher` renders its own trigger inline where the campaign chip is today
(`Header.tsx:170`), so the chip stops being a button that opens a modal and becomes the
popover's anchor.

The chip loses its `hidden md:flex` and appears at every width, with a tighter truncation
below `md`. The hamburger menu's whole **Campaign** section goes — the read-only Group and
Campaign rows and the `Change` button that opened the dialog. That section existed because
the context was otherwise invisible on mobile; the chip now shows it, and keeping both would
leave two places displaying the same fact and two doors onto the same popover.

Keyboard contract, per §4 of the PR description: `Escape` closes and returns focus to the
trigger, focus is trapped while open, `ArrowUp`/`ArrowDown` move through rows, `Home`/`End`
jump to the ends, click-outside closes (the existing `handleClickOutside` at
`ContextSwitcher.tsx:57` is the starting point), the panel is `role="menu"` with
`role="menuitem"` rows, and the trigger carries `aria-expanded` and `aria-haspopup="menu"`.

---

## 9. Commit order

§1 lands first and standalone, as the PR description asks, so it can be cherry-picked. Its
code is partly deleted by commit 3 — that is the accepted cost of making it independent, and
it should not be quietly optimised away by folding it into the rewrite.

1. `fix(context): stop applying a campaign from a different group` — campaign list derived
   from `selectedGroupId` via the existing `useCampaigns().getCampaigns(groupId)`; selection
   reset to the new group's first campaign; `hasChanges` and its prop deleted; a failed
   campaign write rolls the group back and surfaces the error. Regression test asserting the
   campaign list changes when a different group is selected.
2. `fix(context): make a switch take effect without reloading the page` — §2 above;
   `StoryContext`'s progress deps; `window.location.reload()` deleted.
3. `feat(context): switch on click, with an undo instead of an Apply button` — staged state,
   `Apply Changes` and `Close Without Applying` deleted; `UndoToast` added.
4. `feat(context): a popover under the campaign name, not a modal` — the move to
   `context-switcher/`, the trigger, the keyboard contract, `Header`'s dialog and menu
   section removed, the chip at every width.
5. `feat(context): campaigns lead, group is a header row` — the two steps, the counts,
   `useCampaignCounts`, `useGroupSummaries`, `CampaignService.getCampaignCounts`.
6. `fix(groups): mount the join dialog once` — §7 above.

---

## 10. Testing

`ContextSwitcher.test.tsx` is rewritten, not deleted. Its `Apply Changes is disabled when
no changes` family describes a state machine that will not exist; each such test is replaced
by the assertion that now carries its intent — that a click switches, and that the previous
pair is recoverable.

The suite must cover, at minimum:

- selecting a different group changes the campaign list (§1, and the test the PR description names)
- clicking a campaign calls `setActiveCampaign` and does not call `window.location.reload`
- `Undo` restores the previous group and campaign pair
- a failing switch surfaces an error and leaves the active context unchanged
- `Escape` closes the popover and returns focus to the trigger
- a campaign row with no resolved counts renders its name and no second line

`FirebaseContext`'s new `switchGroup` / `switchCampaign` get their own tests at the context
level, since that is where the defect in §1 actually lived and where a future regression
would land. Baseline is 0 failures across 185 suites; any red is a regression.

---

## Out of scope

Creating or renaming groups and campaigns, invitations, the admin panel, a general toast
system, per-campaign `lastOpenedAt`, and the unrendered `UserProfileButton`.
