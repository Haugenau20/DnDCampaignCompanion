# Group and Campaign Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the modal, staged, page-reloading group/campaign switcher with a header popover that switches on click, is undoable, and can never pair a group with another group's campaign.

**Architecture:** The switch itself moves into `FirebaseContext`, which gains `switchGroup` and `switchCampaign` built on the provider's existing private `setActiveGroupContext`. `useGroups().setActiveGroup` and `useCampaigns().setActiveCampaign` keep their names and become delegates. With switching finally reaching React state, `window.location.reload()` can go, staged selection collapses into immediate application, and the two-list disagreement that caused the §1 bug becomes unrepresentable. The component becomes a folder of small units under `src/shared/components/context-switcher/`.

**Tech Stack:** React 18.2 + TypeScript, Firebase 11.3 (Firestore, incl. `getCountFromServer`), TailwindCSS with a token-based theme system, Jest + React Testing Library, `lucide-react` icons, `clsx`.

**Spec:** `docs/superpowers/specs/2026-08-30-context-switcher-design.md` — read it before Task 1. The plan argues from it and does not restate it.

## Global Constraints

- **Never use hardcoded colours.** Every colour comes from a theme token (`--color-primary`, `--bg-accent`, `--text-primary`, …) or an existing utility class (`dropdown`, `dropdown-item`, `dropdown-item-active`, `card`, `chip`, `primary`, `bg-secondary`, `typography`). CLAUDE.md makes this non-negotiable.
- **No `@/…` imports in shipping code.** `react-scripts`' webpack ignores tsconfig `paths`, so `@/…` passes `tsc` and jest and then fails `npm run build`. Use bare `baseUrl` specifiers (`shared/components/…`, `core/components/…`, `features/user-management`). `@/…` is allowed **only** inside `__tests__/` and `test-utils/`.
- **Import features through their barrel.** `shared/` may import `features/user-management`'s `index.ts`, never its internals. This is amended rule #3 in CLAUDE.md, and `ContextSwitcher` is one of the four components that amendment was written for.
- **Inside a domain, import siblings directly** — never that domain's own barrel.
- **Double quotes** per ESLint. JSDoc on every exported component, hook and function.
- **The test suite is green and must stay green.** Baseline: `0 failed / 2 skipped / 4227 passed / 4229 total` across 185 suites on a branch ahead of `main`; on `main` expect ~182 suites / ~4043 tests. Any red is a regression.
- **Never edit a test to make it pass.** Where this plan *does* replace existing tests (Tasks 2 and 4), it is because the behaviour genuinely moved or the state machine they describe ceased to exist — each such replacement is called out with its reason, and the replacement asserts the same intent at the new location.
- **Three gates before proposing a merge:** `npx tsc --noEmit`, `npm test`, and `npm run build`. The third is not implied by the first two.

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/shared/components/context-switcher/ContextSwitcher.tsx` | Composes the trigger, the two steps and the toast; owns popover open state, which step is showing, and what `Undo` would restore |
| `src/shared/components/context-switcher/ContextTrigger.tsx` | The header chip: active campaign name, `aria-expanded`, `aria-haspopup`, selected treatment while open |
| `src/shared/components/context-switcher/CampaignStep.tsx` | Group header row with `Change ›`, one row per campaign, the join row |
| `src/shared/components/context-switcher/GroupStep.tsx` | `← Choose a group` header, one row per group, the footnote |
| `src/shared/components/context-switcher/UndoToast.tsx` | `Switched to X` + `Undo`, self-dismissing |
| `src/shared/components/context-switcher/useCampaignCounts.ts` | Chapter and NPC counts for campaigns other than the active one |
| `src/shared/components/context-switcher/useGroupSummaries.ts` | Campaign count, member count, own role and own `joinedAt` per group |
| `src/shared/components/context-switcher/usePopoverKeys.ts` | Focus trap, arrow/Home/End navigation, `Escape` |
| `src/shared/components/context-switcher/__tests__/*.test.tsx` | One suite per unit above |

**Modified**

| File | Change |
|---|---|
| `src/features/user-management/auth/context/FirebaseContext.tsx` | `+ switchGroup`, `+ switchCampaign` on the context value and its type |
| `src/features/user-management/groups/hooks/useGroups.ts` | `switchGroup` delegates to the context |
| `src/features/user-management/groups/hooks/useCampaigns.ts` | `setActiveCampaign` delegates to the context |
| `src/features/storytelling/chapters/context/StoryContext.tsx` | Reading-progress refetch keyed on `activeCampaignId` |
| `src/core/services/firebase/campaign/CampaignService.ts` | `+ getCampaignCounts` |
| `src/app/layout/Header.tsx` | Dialog removed, chip becomes the anchor at every width, menu Campaign section removed, sole `JoinGroupDialog` owner |
| `src/core/themes/css/components.css` | `+ .toast` |

**Deleted**

| File | Reason |
|---|---|
| `src/shared/components/ContextSwitcher.tsx` | Becomes the folder above |
| `src/shared/components/__tests__/ContextSwitcher.test.tsx` | Moves into the folder's `__tests__/`, rewritten |

---

## Task → Commit Map

The spec's §9 lists six commits. This plan splits three of them where a reviewer could sensibly accept one half and reject the other. Commit messages for the six anchors are preserved verbatim.

| Task | Commit subject | Spec §9 |
|---|---|---|
| 1 | `fix(context): stop applying a campaign from a different group` | 1 |
| 2 | `fix(context): make a group or campaign switch reach React state` | 2 |
| 3 | `fix(story): refetch reading progress when the campaign changes` | 2 |
| 4 | `feat(context): switch on click, with an undo instead of an Apply button` | 3 |
| 5 | `feat(context): a popover under the campaign name, not a modal` | 4 |
| 6 | `feat(header): anchor the switcher to the campaign chip` | 4 |
| 7 | `feat(campaigns): count a campaign's chapters and NPCs` | 5 |
| 8 | `feat(context): campaigns lead, group is a header row` | 5 |
| 9 | `fix(groups): mount the join dialog once` | 6 |
| 10 | `docs(context): record what the redesign changed` | — |

---

## Task 1: Stop applying a campaign from a different group

This is the cherry-pickable bugfix. It stays inside the *current* staged-selection design on purpose, so it can be lifted onto `main` on its own. **Task 4 deletes some of what you write here. Do not "improve" that by folding this task into Task 4** — standing alone is the deliverable.

**Files:**
- Modify: `src/shared/components/ContextSwitcher.tsx`
- Test: `src/shared/components/__tests__/ContextSwitcher.test.tsx`

**Interfaces:**
- Consumes: `useCampaigns().getCampaigns(groupId: string): Promise<Campaign[]>` — already exists at `useCampaigns.ts:126`, already permitted for any group member.
- Produces: nothing later tasks depend on. Tasks 2+ replace this code.

**A scope note on `hasChanges`.** The spec says to delete `hasChanges` and its prop. The *prop* is genuinely dead: `ContextButton` declares `hasChanges` in its props type and destructures only `{ isOpen, setIsOpen }`. The local `const hasChanges` is not dead — `Apply Changes` uses it for `disabled`. So this task deletes the dead prop and its type entry; the local const dies in Task 4 along with the button it serves. Deleting it here would regress the Apply button's disabled state inside a commit whose whole purpose is to be safely cherry-picked.

- [ ] **Step 1: Add `getCampaigns` to the test's campaigns mock**

In `src/shared/components/__tests__/ContextSwitcher.test.tsx`, add the mock function beside the two that exist:

```tsx
const mockSetActiveGroup = jest.fn();
const mockSetActiveCampaign = jest.fn();
const mockGetCampaigns = jest.fn();
```

and expose it from the hook mock:

```tsx
function makeCampaignsMock(overrides = {}) {
  return {
    campaigns: mockCampaigns,
    activeCampaignId: 'campaign-1',
    activeCampaign: mockCampaigns[0],
    setActiveCampaign: mockSetActiveCampaign,
    getCampaigns: mockGetCampaigns,
    ...overrides,
  };
}
```

Then in `beforeEach`, after the two existing `mockResolvedValue` lines, add:

```tsx
    mockGetCampaigns.mockResolvedValue([]);
```

- [ ] **Step 2: Write the failing tests**

Append this describe block inside the top-level `describe('ContextSwitcher', ...)`, after the existing `describe('applying changes', ...)` block:

```tsx
  // -------------------------------------------------------------------------
  // Bug: a group could be applied together with another group's campaign
  // -------------------------------------------------------------------------
  describe('campaigns follow the selected group', () => {
    const councilCampaigns = [{ id: 'campaign-3', name: 'Council Business' }];

    test('lists the selected group\'s campaigns, not the active group\'s', async () => {
      mockGetCampaigns.mockResolvedValue(councilCampaigns);
      renderContextSwitcher({ inDialog: true });

      await act(async () => {
        fireEvent.click(screen.getByText('Order of the Phoenix'));
      });

      expect(mockGetCampaigns).toHaveBeenCalledWith('group-2');
      expect(screen.getByText('Council Business')).toBeInTheDocument();
      expect(screen.queryByText('Middle Earth Adventures')).not.toBeInTheDocument();
    });

    test('never applies a campaign belonging to a different group', async () => {
      mockGetCampaigns.mockResolvedValue(councilCampaigns);
      renderContextSwitcher({ inDialog: true });

      await act(async () => {
        fireEvent.click(screen.getByText('Order of the Phoenix'));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /apply changes/i }));
      });

      expect(mockSetActiveGroup).toHaveBeenCalledWith('group-2');
      // campaign-1 belongs to group-1 and must not be carried across
      expect(mockSetActiveCampaign).not.toHaveBeenCalledWith('campaign-1');
      expect(mockSetActiveCampaign).toHaveBeenCalledWith('campaign-3');
    });

    test('returns to the active group\'s campaigns when it is reselected', async () => {
      mockGetCampaigns.mockResolvedValue(councilCampaigns);
      renderContextSwitcher({ inDialog: true });

      await act(async () => {
        fireEvent.click(screen.getByText('Order of the Phoenix'));
      });
      await act(async () => {
        fireEvent.click(screen.getByText('Fellowship of the Ring'));
      });

      expect(screen.getByText('Middle Earth Adventures')).toBeInTheDocument();
      expect(screen.queryByText('Council Business')).not.toBeInTheDocument();
    });

    test('restores the previous group when the campaign write fails', async () => {
      mockGetCampaigns.mockResolvedValue(councilCampaigns);
      mockSetActiveCampaign.mockRejectedValue(new Error('Campaign write failed'));
      renderContextSwitcher({ inDialog: true });

      await act(async () => {
        fireEvent.click(screen.getByText('Order of the Phoenix'));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /apply changes/i }));
      });

      // The group is put back, so the app is never left in a broken pairing
      expect(mockSetActiveGroup).toHaveBeenLastCalledWith('group-1');
      expect(mockReload).not.toHaveBeenCalled();
      expect(screen.getByText(/Campaign write failed/)).toBeInTheDocument();
    });
  });
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="ContextSwitcher"
```

Expected: the four new tests FAIL. The first three fail because `mockGetCampaigns` is never called and `Council Business` never renders; the fourth fails because the current `catch` only calls `console.error`, so no rollback happens and no message appears.

- [ ] **Step 4: Derive the campaign list from the selected group**

In `src/shared/components/ContextSwitcher.tsx`, add the `Campaign` type import at the top:

```tsx
import type { Campaign } from 'core/types/user';
```

Inside the `ContextSwitcher` component, pull `getCampaigns` and `campaigns` out of the hook and replace the two selection effects with the block below. Change:

```tsx
  const { activeGroupId, setActiveGroup } = useGroups();
  const { activeCampaignId, setActiveCampaign } = useCampaigns();
```

to:

```tsx
  const { activeGroupId, setActiveGroup } = useGroups();
  const {
    activeCampaignId,
    setActiveCampaign,
    campaigns: activeGroupCampaigns,
    getCampaigns,
  } = useCampaigns();
```

Add beside the existing local state:

```tsx
  const [applyError, setApplyError] = useState<string | null>(null);
  /**
   * Campaigns belonging to a group the user has selected but not yet applied.
   * `null` while the active group is the selected one, because the context
   * already holds that group's list.
   */
  const [otherGroupCampaigns, setOtherGroupCampaigns] = useState<Campaign[] | null>(null);
```

Replace the `useEffect` that syncs `selectedCampaignId` (currently `useEffect(() => { setSelectedCampaignId(activeCampaignId); }, [activeCampaignId]);`) with:

```tsx
  const isSelectedGroupActive = selectedGroupId === activeGroupId;

  /**
   * Keep the campaign list and the campaign selection tied to the SELECTED
   * group rather than the active one.
   *
   * `useCampaigns().campaigns` is populated by FirebaseContext for the ACTIVE
   * group, so selecting a different group used to leave the active group's
   * campaigns on screen -- and applying then wrote a group and a campaign that
   * did not belong together. Selecting another group now loads that group's
   * campaigns and moves the selection onto one of them, so a stale id can
   * never survive the change.
   */
  useEffect(() => {
    if (!selectedGroupId || isSelectedGroupActive) {
      setOtherGroupCampaigns(null);
      setSelectedCampaignId(activeCampaignId);
      return;
    }

    let cancelled = false;
    getCampaigns(selectedGroupId).then((list) => {
      if (cancelled) return;
      setOtherGroupCampaigns(list);
      setSelectedCampaignId(list[0]?.id ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedGroupId, isSelectedGroupActive, activeCampaignId, getCampaigns]);

  const visibleCampaigns = isSelectedGroupActive
    ? activeGroupCampaigns
    : otherGroupCampaigns ?? [];
```

- [ ] **Step 5: Pass the derived list down and drop the dead prop**

Replace the `<CampaignSelector … />` call site with:

```tsx
            <CampaignSelector
              selectedGroupId={selectedGroupId}
              activeCampaignId={activeCampaignId}
              selectedCampaignId={selectedCampaignId}
              campaigns={visibleCampaigns}
              onSelectCampaign={setSelectedCampaignId}
            />
```

Replace `CampaignSelector`'s props type and its first three lines with:

```tsx
const CampaignSelector: React.FC<{
  selectedGroupId: string | null;
  activeCampaignId: string | null;
  selectedCampaignId: string | null;
  campaigns: Campaign[];
  onSelectCampaign: (campaignId: string) => void;
}> = ({
  selectedGroupId,
  activeCampaignId,
  selectedCampaignId,
  campaigns,
  onSelectCampaign
}) => {
  // Only show once a group is selected -- the list belongs to the SELECTED
  // group, so gating on the ACTIVE one was part of the bug.
  if (!selectedGroupId) return null;
```

(delete the `const { campaigns } = useCampaigns();` line and the old `if (!activeGroupId) return null;`).

In `ContextButton`, remove the dead prop from the type:

```tsx
const ContextButton: React.FC<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}> = ({ isOpen, setIsOpen }) => {
```

and remove `hasChanges={hasChanges}` from its call site.

- [ ] **Step 6: Surface apply failures and roll the group back**

Replace `handleApplyChanges` entirely:

```tsx
  /**
   * Apply the staged selection.
   *
   * The group and the campaign are two separate writes, so a failure between
   * them would otherwise leave the app in exactly the broken pairing this
   * component now prevents: the new group active, the old group's campaign
   * still selected. If the campaign write fails, put the group back and say
   * so, rather than reloading into a state nobody asked for.
   */
  const handleApplyChanges = async () => {
    setApplyError(null);
    const previousGroupId = activeGroupId;
    let groupChanged = false;

    try {
      if (selectedGroupId && selectedGroupId !== activeGroupId) {
        await setActiveGroup(selectedGroupId);
        groupChanged = true;
      }

      if (selectedCampaignId && selectedCampaignId !== activeCampaignId) {
        await setActiveCampaign(selectedCampaignId);
      }

      // Reload page to refresh all data and UI
      window.location.reload();
    } catch (error) {
      if (groupChanged && previousGroupId) {
        try {
          await setActiveGroup(previousGroupId);
        } catch (rollbackError) {
          console.error("Could not restore the previous group:", rollbackError);
        }
      }

      setApplyError(
        error instanceof Error
          ? error.message
          : "Could not switch group or campaign."
      );
    }
  };
```

Render the message directly above the action buttons, inside the `{inDialog && (` block:

```tsx
            {inDialog && (
              <>
                {applyError && (
                  <div className="px-3 pt-3">
                    <Typography variant="body-sm" color="error">
                      {applyError}
                    </Typography>
                  </div>
                )}
                <div className="p-3 border-t flex justify-end gap-2">
                  <Button
                    onClick={handleApplyChanges}
                    disabled={!hasChanges}
                  >
                    Apply Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                  >
                    Close Without Applying
                  </Button>
                </div>
              </>
            )}
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="ContextSwitcher"
```

Expected: PASS, all tests including the pre-existing ones. If `should NOT show campaigns section when activeGroupId is null` fails, check that the guard is `if (!selectedGroupId)` — `selectedGroupId` is initialised from `activeGroupId`, so a null active group yields a null selection.

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/shared/components/ContextSwitcher.tsx src/shared/components/__tests__/ContextSwitcher.test.tsx
git commit -m "$(cat <<'EOF'
fix(context): stop applying a campaign from a different group

CampaignSelector took its list from useCampaigns(), which FirebaseContext
populates for the ACTIVE group. Selecting a different group changed only
local state, so the campaign list kept showing the old group's campaigns
and Apply wrote a group and a campaign that did not belong together --
a pairing that then survived the reload, because both were persisted.

The list now comes from the SELECTED group via the getCampaigns(groupId)
that CampaignService already exposed to any group member, and changing
group moves the selection onto that group's own first campaign so a stale
id cannot survive.

Also drops the dead hasChanges prop on ContextButton, whose props type
declared it while its destructure took only { isOpen, setIsOpen }, and
makes a failed campaign write roll the group back and say what happened
instead of console.error'ing into a reload.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

## Task 2: Make a group or campaign switch reach React state

**Files:**
- Modify: `src/features/user-management/auth/context/FirebaseContext.tsx`
- Modify: `src/features/user-management/groups/hooks/useGroups.ts:69-88`
- Modify: `src/features/user-management/groups/hooks/useCampaigns.ts:84-120`
- Test: `src/features/user-management/auth/context/__tests__/FirebaseContext.behavioral.test.tsx`
- Test: `src/features/user-management/groups/hooks/__tests__/useGroups.test.tsx`
- Test: `src/features/user-management/groups/hooks/__tests__/useCampaigns.test.tsx`

**Interfaces:**
- Consumes: the provider's private `setActiveGroupContext(groupId: string, currentUser?: User | null): Promise<void>` at `FirebaseContext.tsx:86`.
- Produces, on the context value and on `FirebaseContextType`:
  - `switchGroup: (groupId: string) => Promise<void>`
  - `switchCampaign: (campaignId: string) => Promise<void>`

  `useGroups().setActiveGroup` / `.switchGroup` and `useCampaigns().setActiveCampaign` keep their existing names, signatures and identity relationship (`setActiveGroup === switchGroup`). Every later task calls the hooks, never the context directly.

**Why existing tests change here.** `useGroups.test.tsx`'s `switchGroup / setActiveGroup Behavior` block and `useCampaigns.test.tsx`'s `setActiveCampaign Behavior` block assert that the *hooks* call `firebaseServices.user.updateUserProfile`, `firebaseServices.auth.setActiveCampaign` and `refreshGroups`/`refreshCampaigns`. Those calls genuinely move into the provider, where they are asserted by new tests in `FirebaseContext.behavioral.test.tsx`. The hook tests are rewritten to assert delegation — the same intent, at the layer that now carries it. This is a behaviour relocation, not a test bent to pass; the assertions do not disappear, they move with the code.

- [ ] **Step 1: Write the failing provider tests**

In `src/features/user-management/auth/context/__tests__/FirebaseContext.behavioral.test.tsx`, first extend the firebase mock — the new code calls three members the mock does not yet have. Add the three mock functions beside the existing ones:

```tsx
const mockUpdateUserProfile = jest.fn();
const mockUpdateGroupUserProfile = jest.fn();
const mockGetCurrentUserId = jest.fn();
```

and extend the `jest.mock("@/core/services/firebase", …)` factory's `auth` and `user` entries:

```tsx
    auth: {
      getAuth: (...args: any[]) => mockGetAuth(...args),
      setActiveGroup: (...args: any[]) => mockSetActiveGroup(...args),
      setActiveCampaign: (...args: any[]) => mockSetActiveCampaign(...args),
      getCurrentUserId: () => mockGetCurrentUserId(),
    },
    user: {
      getUserProfile: (...args: any[]) => mockGetUserProfile(...args),
      getGroupUserProfile: (...args: any[]) => mockGetGroupUserProfile(...args),
      updateUserProfile: (...args: any[]) => mockUpdateUserProfile(...args),
      updateGroupUserProfile: (...args: any[]) => mockUpdateGroupUserProfile(...args),
    },
```

In `beforeEach`, add defaults after the existing ones:

```tsx
    mockGetCurrentUserId.mockReturnValue("user-1");
    mockUpdateUserProfile.mockResolvedValue(undefined);
    mockUpdateGroupUserProfile.mockResolvedValue(undefined);
```

Then append this describe block to the suite:

```tsx
  // -------------------------------------------------------------------------
  // Switching context in place
  //
  // Before these existed, setActiveGroup persisted to Firestore and called
  // refreshGroups, which only re-lists groups -- activeGroupId in React state
  // never moved. window.location.reload() was the whole switching mechanism.
  // -------------------------------------------------------------------------
  describe("switchGroup / switchCampaign", () => {
    /** Sign a user in with two groups, group-1 active, and settle the provider. */
    async function signInWithTwoGroups() {
      mockGetUserProfile.mockResolvedValue(
        makeUserProfile({ groups: ["group-1", "group-2"], activeGroupId: "group-1" })
      );
      mockGetGroups.mockResolvedValue([makeGroup("group-1"), makeGroup("group-2")]);
      mockGetGroupUserProfile.mockResolvedValue(
        makeGroupUserProfile({ activeCampaignId: "campaign-1" })
      );
      mockGetCampaigns.mockResolvedValue([makeCampaign("campaign-1", "group-1")]);

      const rendered = renderHook(() => useFirebaseContext(), { wrapper });

      await act(async () => {
        await capturedAuthCallback!(makeUser());
      });
      await waitFor(() => expect(rendered.result.current.activeGroupId).toBe("group-1"));

      return rendered;
    }

    test("switchGroup moves activeGroupId in React state, not just in Firestore", async () => {
      const { result } = await signInWithTwoGroups();

      mockGetGroupUserProfile.mockResolvedValue(
        makeGroupUserProfile({ activeCampaignId: "campaign-9" })
      );
      mockGetCampaigns.mockResolvedValue([makeCampaign("campaign-9", "group-2")]);

      await act(async () => {
        await result.current.switchGroup("group-2");
      });

      expect(result.current.activeGroupId).toBe("group-2");
      expect(mockUpdateUserProfile).toHaveBeenCalledWith("user-1", {
        activeGroupId: "group-2",
      });
    });

    test("switchGroup loads the new group's campaigns and activates its own", async () => {
      const { result } = await signInWithTwoGroups();

      mockGetGroupUserProfile.mockResolvedValue(
        makeGroupUserProfile({ activeCampaignId: "campaign-9" })
      );
      mockGetCampaigns.mockResolvedValue([makeCampaign("campaign-9", "group-2")]);

      await act(async () => {
        await result.current.switchGroup("group-2");
      });

      expect(mockGetCampaigns).toHaveBeenLastCalledWith("group-2");
      expect(result.current.campaigns.map((c) => c.id)).toEqual(["campaign-9"]);
      expect(result.current.activeCampaignId).toBe("campaign-9");
    });

    test("switchGroup rejects and leaves the context alone when the write fails", async () => {
      const { result } = await signInWithTwoGroups();
      mockUpdateUserProfile.mockRejectedValue(new Error("Profile write failed"));

      await act(async () => {
        await expect(result.current.switchGroup("group-2")).rejects.toThrow(
          "Profile write failed"
        );
      });

      expect(result.current.activeGroupId).toBe("group-1");
    });

    test("switchCampaign moves activeCampaignId in React state", async () => {
      const { result } = await signInWithTwoGroups();

      await act(async () => {
        await result.current.switchCampaign("campaign-2");
      });

      expect(result.current.activeCampaignId).toBe("campaign-2");
      expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith("group-1", "user-1", {
        activeCampaignId: "campaign-2",
      });
      expect(mockSetActiveCampaign).toHaveBeenCalledWith("campaign-2");
    });

    test("switchCampaign rejects and leaves the context alone when the write fails", async () => {
      const { result } = await signInWithTwoGroups();
      mockUpdateGroupUserProfile.mockRejectedValue(new Error("Group profile write failed"));

      await act(async () => {
        await expect(result.current.switchCampaign("campaign-2")).rejects.toThrow(
          "Group profile write failed"
        );
      });

      expect(result.current.activeCampaignId).toBe("campaign-1");
    });

    test("switchCampaign refuses when there is no active group", async () => {
      const { result } = renderHook(() => useFirebaseContext(), { wrapper });

      await act(async () => {
        await expect(result.current.switchCampaign("campaign-2")).rejects.toThrow(
          "No active group selected"
        );
      });
    });
  });
```

- [ ] **Step 2: Run the provider tests to verify they fail**

```bash
npx jest --testTimeout=15000 --maxWorkers=1 --testPathPattern="FirebaseContext.behavioral"
```

Expected: the six new tests FAIL with `result.current.switchGroup is not a function`.

- [ ] **Step 3: Add `switchGroup` and `switchCampaign` to the provider**

In `src/features/user-management/auth/context/FirebaseContext.tsx`, add to `FirebaseContextType`, directly under `refreshUserProfile`:

```ts
  switchGroup: (groupId: string) => Promise<void>;
  switchCampaign: (campaignId: string) => Promise<void>;
```

Add the two functions immediately after `refreshCampaigns` (i.e. after the block ending at line 208):

```tsx
  /**
   * Switch the active group, in Firestore AND in React state.
   *
   * `refreshGroups` only re-lists the user's groups; it calls
   * `setActiveGroupContext` solely for the one-group-no-active-group case. So
   * persisting `activeGroupId` and calling it -- which is what
   * `useGroups().setActiveGroup` used to do -- left `activeGroupId` in this
   * provider pointing at the OLD group, and only a full page reload made the
   * switch visible. `setActiveGroupContext` already does the whole job
   * correctly, including loading the new group's campaigns and activating the
   * one the user last had open there; it was simply unreachable from outside.
   *
   * Firestore is written first so a rejected write leaves the context on the
   * group it was already showing.
   */
  const switchGroup = async (groupId: string): Promise<void> => {
    const userId = firebaseServices.auth.getCurrentUserId();
    if (!userId) {
      throw new Error('Not authenticated');
    }

    await firebaseServices.user.updateUserProfile(userId, { activeGroupId: groupId });
    await setActiveGroupContext(groupId);
  };

  /**
   * Switch the active campaign within the active group, in Firestore AND in
   * React state.
   *
   * `refreshCampaigns` only assigns `activeCampaignId` when there is none, so
   * the previous implementation in `useCampaigns` moved the SERVICE-level
   * campaign and the stored preference while this provider kept serving the
   * old id to every consumer.
   *
   * The service context and the React state are both set only after the write
   * resolves, so a failure cannot leave the three out of step.
   */
  const switchCampaign = async (campaignId: string): Promise<void> => {
    if (!activeGroupId) {
      throw new Error('No active group selected');
    }

    const userId = firebaseServices.auth.getCurrentUserId();
    if (userId) {
      await firebaseServices.user.updateGroupUserProfile(activeGroupId, userId, {
        activeCampaignId: campaignId
      });
    }

    firebaseServices.auth.setActiveCampaign(campaignId);
    setActiveCampaignId(campaignId);
  };
```

Add both to the context value, under `refreshUserProfile`:

```tsx
    refreshUserProfile,
    switchGroup,
    switchCampaign
```

- [ ] **Step 4: Run the provider tests to verify they pass**

```bash
npx jest --testTimeout=15000 --maxWorkers=1 --testPathPattern="FirebaseContext.behavioral"
```

Expected: PASS.

- [ ] **Step 5: Rewrite the `useGroups` switch tests for delegation**

In `src/features/user-management/groups/hooks/__tests__/useGroups.test.tsx`, add a mock for the new context member. Find `makeContext` and add to the object it returns:

```tsx
    switchGroup: mockSwitchGroup,
```

declaring it beside the other context mocks:

```tsx
const mockSwitchGroup = jest.fn();
```

and defaulting it in `beforeEach`:

```tsx
  mockSwitchGroup.mockResolvedValue(undefined);
```

Replace the whole `describe("switchGroup / setActiveGroup Behavior", …)` block with:

```tsx
  // -------------------------------------------------------------------------
  describe("switchGroup / setActiveGroup Behavior", () => {
    test("should delegate to the context's switchGroup", async () => {
      mockContextValue = makeContext({ user: { uid: "u1" } as any });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        await result.current.switchGroup("g2");
      });

      // The profile write and the context update both live in FirebaseContext
      // now, so that a switch actually reaches React state instead of relying
      // on a page reload. This hook's job is to forward and to report errors.
      expect(mockSwitchGroup).toHaveBeenCalledWith("g2");
    });

    test("should not write the user profile itself", async () => {
      mockContextValue = makeContext({ user: { uid: "u1" } as any });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        await result.current.switchGroup("g2");
      });

      expect(mockUpdateUserProfile).not.toHaveBeenCalled();
    });

    test("should call setError and re-throw on failure", async () => {
      mockSwitchGroup.mockRejectedValue(new Error("Switch failed"));

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.switchGroup("g2");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Switch failed");
    });
  });
```

Replace the fallback-string test at line 573 (`switchGroup: setError uses fallback string when a non-Error is thrown`) with:

```tsx
    test("switchGroup: setError uses fallback string when a non-Error is thrown", async () => {
      mockSwitchGroup.mockRejectedValue({ code: "UNAVAILABLE" });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.switchGroup("g1");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Failed to switch group");
    });
```

Delete the whole `describe("switchGroup — getCurrentUserId null fallback (line 75)", …)` block. The `getCurrentUserId() || ''` it covered no longer exists in this hook; the provider now throws `Not authenticated` instead of writing to a document at path `users/`, which is a strictly better behaviour and is covered by the provider suite.

- [ ] **Step 6: Rewrite the `useCampaigns` switch tests for delegation**

In `src/features/user-management/groups/hooks/__tests__/useCampaigns.test.tsx`, add:

```tsx
const mockSwitchCampaign = jest.fn();
```

add `switchCampaign: mockSwitchCampaign,` to what `makeContext` returns, and default it in `beforeEach`:

```tsx
  mockSwitchCampaign.mockResolvedValue(undefined);
```

Replace the whole `describe("setActiveCampaign Behavior", …)` block with:

```tsx
  // -------------------------------------------------------------------------
  describe("setActiveCampaign Behavior", () => {
    test("should delegate to the context's switchCampaign", async () => {
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        await result.current.setActiveCampaign("c1");
      });

      // Setting the service-level campaign and writing the group profile both
      // live in FirebaseContext now, because only the provider can also move
      // activeCampaignId in React state -- which is what makes a switch
      // visible without reloading the page.
      expect(mockSwitchCampaign).toHaveBeenCalledWith("c1");
    });

    test("should not set the service-level campaign itself", async () => {
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        await result.current.setActiveCampaign("c1");
      });

      expect(mockSetActiveCampaign).not.toHaveBeenCalled();
      expect(mockUpdateGroupUserProfile).not.toHaveBeenCalled();
    });

    test("should call setError and re-throw on failure", async () => {
      mockSwitchCampaign.mockRejectedValue(new Error("Set active failed"));
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        try {
          await result.current.setActiveCampaign("c1");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Set active failed");
    });

    test("should propagate the guard error when no group is active", async () => {
      mockSwitchCampaign.mockRejectedValue(new Error("No active group selected"));
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useCampaigns());

      await expect(
        act(async () => {
          await result.current.setActiveCampaign("c1");
        })
      ).rejects.toThrow("No active group selected");
    });
  });
```

- [ ] **Step 7: Run both hook suites to verify they fail**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="use(Groups|Campaigns)\.test"
```

Expected: the rewritten tests FAIL — the hooks still call the services directly.

- [ ] **Step 8: Delegate from `useGroups`**

In `src/features/user-management/groups/hooks/useGroups.ts`, add `switchGroup` to the destructured context, renaming it so it does not collide with the hook's own export:

```ts
  const {
    user,
    groups,
    activeGroupId,
    activeGroupUserProfile,
    setError,
    refreshGroups,
    switchGroup: switchGroupContext,
    loading: firebaseLoading
  } = useFirebaseContext();
```

Replace the `switchGroup` callback (lines 69-88) with:

```ts
  // Switch active group (alias for setActiveGroup for backward compatibility)
  //
  // The write and the context update both live in FirebaseContext, because
  // only the provider can move `activeGroupId` in React state. Writing the
  // profile here and calling `refreshGroups()` -- what this did before -- left
  // the context on the old group and needed a page reload to take effect.
  const switchGroup = useCallback(async (
    groupId: string
  ): Promise<void> => {
    try {
      setError(null);
      await switchGroupContext(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch group');
      throw err;
    }
  }, [setError, switchGroupContext]);
```

`const setActiveGroup = switchGroup;` stays exactly as it is — the identity test at line 126 must keep passing.

- [ ] **Step 9: Delegate from `useCampaigns`**

In `src/features/user-management/groups/hooks/useCampaigns.ts`, add to the destructured context:

```ts
  const {
    campaigns,
    activeGroupId,
    activeCampaignId,
    setError,
    refreshCampaigns,
    switchCampaign
  } = useFirebaseContext();
```

Replace the `setActiveCampaign` callback (lines 84-120) with:

```ts
  // Set active campaign
  //
  // Delegates to FirebaseContext, which writes the stored preference, sets the
  // service-level campaign AND moves `activeCampaignId` in React state. Doing
  // the first two here (as this used to) changed nothing any consumer could
  // see, because `refreshCampaigns` only assigns `activeCampaignId` when there
  // is none -- so the switch was invisible until the page reloaded.
  const setActiveCampaign = useCallback(async (
    campaignId: string
  ): Promise<void> => {
    try {
      setError(null);
      await switchCampaign(campaignId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set active campaign');
      throw err;
    }
  }, [setError, switchCampaign]);
```

- [ ] **Step 10: Run all three suites to verify they pass**

```bash
npx jest --testTimeout=15000 --maxWorkers=1 --testPathPattern="(FirebaseContext.behavioral|useGroups\.test|useCampaigns\.test)"
```

Expected: PASS.

- [ ] **Step 11: Type-check and run the full suite**

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors; 0 failures. `ContextSwitcher.test.tsx` still passes — it mocks the hooks, so the delegation is invisible to it.

- [ ] **Step 12: Commit**

```bash
git add src/features/user-management
git commit -m "$(cat <<'EOF'
fix(context): make a group or campaign switch reach React state

Neither setter switched anything. setActiveGroup wrote activeGroupId to
the user profile and called refreshGroups, which re-lists groups and only
calls setActiveGroupContext for the one-group-no-active-group case.
setActiveCampaign moved the service-level campaign and the stored
preference, then called refreshCampaigns, which assigns activeCampaignId
only when there is none. Both left the context describing the old pair,
which is why window.location.reload() was not a lazy refresh but the
entire switching mechanism.

FirebaseContext now exposes switchGroup and switchCampaign, built on the
setActiveGroupContext it already had and kept private. The hooks keep
their names and signatures and become delegates, so no call site changes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

## Task 3: Refetch reading progress when the campaign changes

**Files:**
- Modify: `src/features/storytelling/chapters/context/StoryContext.tsx:143-147`
- Test: `src/features/storytelling/chapters/context/__tests__/StoryContext.progress.test.tsx`

**Interfaces:**
- Consumes: `useCampaigns().activeCampaignId` — already imported in this file's dependency chain via `useChapterData`; import the hook directly from the `features/user-management` barrel.
- Produces: nothing.

This is the one consumer the audit found that does not react to a campaign change. Every entity hook (`useNPCData`, `useLocationData`, `useQuestData`, `useRumorData`, `useChapterData`) keys its effect on `[activeGroupId, activeCampaignId]`. The story-progress effect keys on `hasRequiredContext`, which is `true` before and after a switch — so without this, switching campaigns would leave the previous campaign's reading position on screen.

- [ ] **Step 1: Write the failing test**

Append to `src/features/storytelling/chapters/context/__tests__/StoryContext.progress.test.tsx`, inside its top-level describe. Match the file's existing mocking style — read the top of the file first and reuse its helpers rather than inventing new ones.

```tsx
  describe("campaign switching", () => {
    test("refetches reading progress when the active campaign changes", async () => {
      // Reading progress is per campaign. Its effect keyed only on
      // hasRequiredContext, which stays true across a switch, so the previous
      // campaign's position survived into the new one.
      const { rerender } = renderStoryProvider({ activeCampaignId: "campaign-1" });

      await waitFor(() => expect(mockRefreshProgress).toHaveBeenCalledTimes(1));

      mockRefreshProgress.mockClear();
      rerender({ activeCampaignId: "campaign-2" });

      await waitFor(() => expect(mockRefreshProgress).toHaveBeenCalledTimes(1));
    });
  });
```

If the existing suite has no `renderStoryProvider` helper that accepts an `activeCampaignId`, add one modelled on how the file already mocks `useCampaigns`, and drive the change by updating that mock's return value between renders. The assertion that matters is: **the progress fetch fires again after `activeCampaignId` changes.**

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="StoryContext.progress"
```

Expected: FAIL — `mockRefreshProgress` is called 0 times after the rerender.

- [ ] **Step 3: Key the effect on the campaign**

In `src/features/storytelling/chapters/context/StoryContext.tsx`, add the campaign id to the provider's scope if it is not already there:

```tsx
  const { activeCampaignId } = useCampaigns();
```

(importing `useCampaigns` from `features/user-management` alongside the existing `useAuth` / `useUser` imports).

Extend the comment above the effect at line 143 with a second paragraph, and add the dependency:

```tsx
   * to ask again itself.
   *
   * It must also ask again when the CAMPAIGN changes. Reading progress lives at
   * groups/{g}/campaigns/{c}/story-progress, so it is per campaign -- but
   * `hasRequiredContext` is true both before and after a switch, so keying on
   * that alone left the previous campaign's position on screen. Every entity
   * hook already keys on `activeCampaignId`; this one was the exception, and it
   * only stopped mattering because switching used to reload the page.
   */
  useEffect(() => {
    if (hasRequiredContext) {
      refreshProgress();
    }
  }, [hasRequiredContext, activeCampaignId, refreshProgress]);
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="StoryContext"
```

Expected: PASS, including the pre-existing `StoryContext.bugs` and `StoryContext.progress` suites.

- [ ] **Step 5: Type-check and commit**

```bash
npx tsc --noEmit
git add src/features/storytelling
git commit -m "$(cat <<'EOF'
fix(story): refetch reading progress when the campaign changes

story-progress lives under groups/{g}/campaigns/{c}, so it is per
campaign, but its effect depended only on hasRequiredContext -- true
both before and after a switch. Every entity hook already keys on
activeCampaignId; this was the exception, and it only stopped mattering
because switching campaigns used to reload the page.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

## Task 4: Switch on click, with an undo instead of an Apply button

**Files:**
- Create: `src/shared/components/context-switcher/UndoToast.tsx`
- Create: `src/shared/components/context-switcher/__tests__/UndoToast.test.tsx`
- Modify: `src/shared/components/ContextSwitcher.tsx`
- Modify: `src/core/themes/css/components.css` (append)
- Test: `src/shared/components/__tests__/ContextSwitcher.test.tsx` (rewritten)

**Interfaces:**
- Consumes: `useGroups().setActiveGroup`, `useCampaigns().setActiveCampaign` — now real switches, courtesy of Task 2.
- Produces:

```ts
// UndoToast.tsx
interface UndoToastProps {
  /** Name of the group or campaign that was just switched to. */
  label: string;
  /** Shown instead of the confirmation when the undo itself failed. */
  error?: string | null;
  /** Restore the previous group and campaign. */
  onUndo: () => void;
  /** Remove the toast without restoring anything. */
  onDismiss: () => void;
  /** Milliseconds before the toast dismisses itself. Defaults to 6000. */
  duration?: number;
}
export default function UndoToast(props: UndoToastProps): JSX.Element;
```

**Test rewrite note.** The `dialog mode (inDialog=true)`, `applying changes` and `JoinGroupDialog onSuccess` describe blocks all assert a staged-commit state machine (`Apply Changes` disabled until dirty, `Close Without Applying` resetting selection, a reload on success) that ceases to exist. They are replaced by tests carrying the same intents at their new home: that a click switches, that nothing reloads, and that a mis-click is recoverable. The remaining blocks are kept and adapted to header mode, which is the only mode after Task 5.

- [ ] **Step 1: Add the `.toast` class**

Append to `src/core/themes/css/components.css`:

```css
/* ====== TOAST ====== */
/*
  A transient confirmation carrying exactly one action.

  Deliberately NOT an inverted surface, although the mock draws one. The
  contact callout tried `--text-primary` on `--bg-primary` on the reasoning
  that every theme guarantees contrast between that pair, and it was legible
  everywhere and right nowhere: light gave a heavy slab, dark gave a near-white
  block that read as an alert rather than a confirmation, and medieval gave
  dark chocolate on parchment. `--bg-accent` is the token each theme already
  tunes for a subtly emphasised surface, and `--color-primary` carries the
  action -- the same resolution the callout landed on.
*/
.toast {
  background-color: var(--bg-accent);
  border: var(--border-width-sm) solid var(--card-border);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

- [ ] **Step 2: Write the failing `UndoToast` test**

Create `src/shared/components/context-switcher/__tests__/UndoToast.test.tsx`:

```tsx
// src/shared/components/context-switcher/__tests__/UndoToast.test.tsx

import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UndoToast from "../UndoToast";

describe("UndoToast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("names what was switched to", () => {
    render(
      <UndoToast label="The Hobbit" onUndo={jest.fn()} onDismiss={jest.fn()} />
    );

    expect(screen.getByText(/Switched to/)).toBeInTheDocument();
    expect(screen.getByText("The Hobbit")).toBeInTheDocument();
  });

  test("offers a single Undo action", async () => {
    const onUndo = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <UndoToast label="The Hobbit" onUndo={onUndo} onDismiss={jest.fn()} />
    );

    await user.click(screen.getByRole("button", { name: /undo/i }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  test("dismisses itself after the duration", () => {
    const onDismiss = jest.fn();

    render(
      <UndoToast
        label="The Hobbit"
        onUndo={jest.fn()}
        onDismiss={onDismiss}
        duration={6000}
      />
    );

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test("does not dismiss after unmounting", () => {
    const onDismiss = jest.fn();

    const { unmount } = render(
      <UndoToast
        label="The Hobbit"
        onUndo={jest.fn()}
        onDismiss={onDismiss}
        duration={6000}
      />
    );

    unmount();

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("reports a failed undo instead of the confirmation", () => {
    render(
      <UndoToast
        label="The Hobbit"
        error="Could not switch back."
        onUndo={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText("Could not switch back.")).toBeInTheDocument();
    expect(screen.queryByText(/Switched to/)).not.toBeInTheDocument();
  });

  test("announces itself politely to assistive technology", () => {
    render(
      <UndoToast label="The Hobbit" onUndo={jest.fn()} onDismiss={jest.fn()} />
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="UndoToast"
```

Expected: FAIL — `Cannot find module '../UndoToast'`.

- [ ] **Step 4: Write `UndoToast`**

Create `src/shared/components/context-switcher/UndoToast.tsx`:

```tsx
// src/shared/components/context-switcher/UndoToast.tsx
import React, { useEffect } from "react";
import Typography from "core/components/Typography";

/**
 * Props for {@link UndoToast}.
 */
interface UndoToastProps {
  /** Name of the group or campaign that was just switched to. */
  label: string;
  /** Shown instead of the confirmation when the undo itself failed. */
  error?: string | null;
  /** Restore the previous group and campaign. */
  onUndo: () => void;
  /** Remove the toast without restoring anything. */
  onDismiss: () => void;
  /** Milliseconds before the toast dismisses itself. */
  duration?: number;
}

/**
 * A transient confirmation of a context switch, with one action.
 *
 * This is what replaced the `Apply Changes` / `Close Without Applying` pair.
 * A pre-commit confirmation asks every user to think about every switch in
 * order to protect the rare mis-click; an undo charges nothing up front and
 * still makes the mis-click recoverable.
 */
const UndoToast: React.FC<UndoToastProps> = ({
  label,
  error = null,
  onUndo,
  onDismiss,
  duration = 6000
}) => {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [label, error, duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="toast flex items-center justify-between gap-4 px-4 py-3"
    >
      {error ? (
        <Typography variant="body-sm" color="error">
          {error}
        </Typography>
      ) : (
        <Typography variant="body-sm">
          Switched to <span className="font-semibold">{label}</span>
        </Typography>
      )}

      <button
        type="button"
        onClick={onUndo}
        className="font-semibold primary shrink-0"
      >
        Undo
      </button>
    </div>
  );
};

export default UndoToast;
```

- [ ] **Step 5: Run it to verify it passes**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="UndoToast"
```

Expected: PASS.

- [ ] **Step 6: Rewrite `ContextSwitcher.test.tsx`**

Replace `src/shared/components/__tests__/ContextSwitcher.test.tsx` **entirely**:

```tsx
// src/shared/components/__tests__/ContextSwitcher.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ContextSwitcher from '../ContextSwitcher';

// ---------------------------------------------------------------------------
// Mock firebase context hooks
// ---------------------------------------------------------------------------
const mockSetActiveGroup = jest.fn();
const mockSetActiveCampaign = jest.fn();
const mockGetCampaigns = jest.fn();

// ContextSwitcher consumes JoinGroupDialog through the domain barrel, so the
// barrel mock re-exports the component stub defined further down.
jest.mock('@/features/user-management', () => ({
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
  get JoinGroupDialog() {
    // the stub below returns the component directly, not a { default } module
    const mod = require('@/features/user-management/groups/components/JoinGroupDialog');
    return mod.default || mod;
  },
}));

const { useGroups, useCampaigns } = require('@/features/user-management');

// ---------------------------------------------------------------------------
// Mock JoinGroupDialog to avoid deep dependency chain
// ---------------------------------------------------------------------------
jest.mock('@/features/user-management/groups/components/JoinGroupDialog', () => {
  const MockJoinGroupDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }> = ({ open }) => {
    if (!open) return null;
    return <div data-testid="join-group-dialog">Join Group Dialog</div>;
  };
  return MockJoinGroupDialog;
});

// ---------------------------------------------------------------------------
// window.location.reload must never be called by this component again
// ---------------------------------------------------------------------------
const mockReload = jest.fn();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockGroups = [
  { id: 'group-1', name: 'Fellowship of the Ring' },
  { id: 'group-2', name: 'Order of the Phoenix' },
];

const mockCampaigns = [
  { id: 'campaign-1', name: 'Middle Earth Adventures' },
  { id: 'campaign-2', name: 'Hogwarts Campaign' },
];

function makeGroupsMock(overrides = {}) {
  return {
    groups: mockGroups,
    activeGroupId: 'group-1',
    activeGroup: mockGroups[0],
    loading: false,
    setActiveGroup: mockSetActiveGroup,
    ...overrides,
  };
}

function makeCampaignsMock(overrides = {}) {
  return {
    campaigns: mockCampaigns,
    activeCampaignId: 'campaign-1',
    activeCampaign: mockCampaigns[0],
    setActiveCampaign: mockSetActiveCampaign,
    getCampaigns: mockGetCampaigns,
    ...overrides,
  };
}

function renderContextSwitcher(props: { onClose?: jest.Mock } = {}) {
  return render(<ContextSwitcher {...props} />);
}

/** Open the popover from its trigger. */
function openSwitcher() {
  fireEvent.click(screen.getAllByRole('button')[0]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContextSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGroups as jest.Mock).mockReturnValue(makeGroupsMock());
    (useCampaigns as jest.Mock).mockReturnValue(makeCampaignsMock());
    mockSetActiveGroup.mockResolvedValue(undefined);
    mockSetActiveCampaign.mockResolvedValue(undefined);
    mockGetCampaigns.mockResolvedValue([]);
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });
  });

  // -------------------------------------------------------------------------
  describe('opening and closing', () => {
    test('starts closed', () => {
      renderContextSwitcher();
      expect(screen.queryByText('Select Group')).not.toBeInTheDocument();
    });

    test('opens from the trigger', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('Select Group')).toBeInTheDocument();
    });

    test('lists the groups once open', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('Fellowship of the Ring')).toBeInTheDocument();
      expect(screen.getByText('Order of the Phoenix')).toBeInTheDocument();
    });

    test('lists the campaigns once open', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('Middle Earth Adventures')).toBeInTheDocument();
      expect(screen.getByText('Hogwarts Campaign')).toBeInTheDocument();
    });

    test('closes when clicking outside', async () => {
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('Select Group')).toBeInTheDocument();

      await act(async () => {
        fireEvent.mouseDown(document.body);
      });

      await waitFor(() => {
        expect(screen.queryByText('Select Group')).not.toBeInTheDocument();
      });
    });

    test('disables the trigger while groups are loading', () => {
      (useGroups as jest.Mock).mockReturnValue(makeGroupsMock({ loading: true }));
      renderContextSwitcher();
      expect(screen.getAllByRole('button')[0]).toBeDisabled();
    });

    test('reports when there are no groups', () => {
      (useGroups as jest.Mock).mockReturnValue(
        makeGroupsMock({ groups: [], loading: false })
      );
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('No groups available')).toBeInTheDocument();
    });

    test('reports when there are no campaigns', () => {
      (useCampaigns as jest.Mock).mockReturnValue(
        makeCampaignsMock({ campaigns: [] })
      );
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('No campaigns in this group')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Selection IS application. There is no Apply button and no staged state.
  // -------------------------------------------------------------------------
  describe('switching', () => {
    test('clicking a campaign switches to it immediately', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      expect(mockSetActiveCampaign).toHaveBeenCalledWith('campaign-2');
    });

    test('clicking a group switches to it immediately', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Order of the Phoenix'));
      });

      expect(mockSetActiveGroup).toHaveBeenCalledWith('group-2');
    });

    test('offers no Apply button', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(
        screen.queryByRole('button', { name: /apply changes/i })
      ).not.toBeInTheDocument();
    });

    test('offers no Close Without Applying button', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(
        screen.queryByRole('button', { name: /close without applying/i })
      ).not.toBeInTheDocument();
    });

    test('never reloads the page', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      expect(mockReload).not.toHaveBeenCalled();
    });

    test('closes the popover after switching', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      await waitFor(() => {
        expect(screen.queryByText('Select Group')).not.toBeInTheDocument();
      });
    });

    test('does not switch when the active campaign is clicked', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Middle Earth Adventures'));
      });

      expect(mockSetActiveCampaign).not.toHaveBeenCalled();
    });

    test('reports a failed switch and leaves the context alone', async () => {
      mockSetActiveCampaign.mockRejectedValue(new Error('Campaign write failed'));
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      expect(screen.getByText(/Campaign write failed/)).toBeInTheDocument();
      expect(mockReload).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('undo', () => {
    test('offers an undo after switching campaign', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
      expect(screen.getByText(/Switched to/)).toBeInTheDocument();
    });

    test('undo restores the previous campaign', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });
      mockSetActiveCampaign.mockClear();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /undo/i }));
      });

      expect(mockSetActiveCampaign).toHaveBeenCalledWith('campaign-1');
    });

    test('undo restores the previous group and campaign pair', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Order of the Phoenix'));
      });

      // The switch moved the context; report it as the app now sees it.
      (useGroups as jest.Mock).mockReturnValue(
        makeGroupsMock({ activeGroupId: 'group-2', activeGroup: mockGroups[1] })
      );
      (useCampaigns as jest.Mock).mockReturnValue(
        makeCampaignsMock({ activeCampaignId: 'campaign-9', campaigns: [] })
      );
      mockSetActiveGroup.mockClear();
      mockSetActiveCampaign.mockClear();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /undo/i }));
      });

      expect(mockSetActiveGroup).toHaveBeenCalledWith('group-1');
      expect(mockSetActiveCampaign).toHaveBeenCalledWith('campaign-1');
    });

    test('reports a failed undo in the toast', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByText('Hogwarts Campaign'));
      });

      mockSetActiveCampaign.mockRejectedValue(new Error('Could not switch back'));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /undo/i }));
      });

      expect(screen.getByText(/Could not switch back/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  describe('joining a group', () => {
    test('offers a way to join a group', () => {
      renderContextSwitcher();
      openSwitcher();
      expect(screen.getByText('Join Group')).toBeInTheDocument();
    });

    test('opens the join dialog', () => {
      renderContextSwitcher();
      openSwitcher();
      fireEvent.click(screen.getByText('Join Group'));
      expect(screen.getByTestId('join-group-dialog')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  describe('trigger text', () => {
    test('names the active group and campaign', () => {
      renderContextSwitcher();
      expect(screen.getByText(/Fellowship of t/)).toBeInTheDocument();
    });

    test('says so when no group is active', () => {
      (useGroups as jest.Mock).mockReturnValue(
        makeGroupsMock({ activeGroupId: null, activeGroup: null })
      );
      renderContextSwitcher();
      expect(screen.getByText('Select Group')).toBeInTheDocument();
    });

    test('says so when no campaign is active', () => {
      (useCampaigns as jest.Mock).mockReturnValue(
        makeCampaignsMock({ activeCampaignId: null, activeCampaign: null })
      );
      renderContextSwitcher();
      expect(screen.getByText(/No Campaign/)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="ContextSwitcher"
```

Expected: the `switching`, `undo` and several `opening and closing` tests FAIL — the component still stages selections behind an Apply button.

- [ ] **Step 8: Rewrite `ContextSwitcher` for immediate application**

In `src/shared/components/ContextSwitcher.tsx`:

Replace the imports of `Button` and add `UndoToast`:

```tsx
import UndoToast from 'shared/components/context-switcher/UndoToast';
```

and delete `import Button from 'core/components/Button';` if nothing else uses it (the two removed buttons were its only consumers; `ContextButton` uses it too, so keep it until Task 5 replaces `ContextButton`).

Replace the whole state block, the two sync effects, the `hasChanges` const, `handleApplyChanges` and `handleReset` with:

```tsx
  // Still initialised from `inDialog`, which Task 5 removes. Until then the
  // Header dialog is the one caller that passes it, and it must keep opening
  // to the lists rather than to a trigger button inside a modal.
  const [isOpen, setIsOpen] = useState(inDialog);
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  /**
   * The group and campaign to go back to, plus what we switched to. Held only
   * while the toast is up.
   */
  const [undoTarget, setUndoTarget] = useState<{
    groupId: string | null;
    campaignId: string | null;
    label: string;
  } | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Apply a switch and offer to take it back.
   *
   * Selection used to be staged behind `Apply Changes`, with a
   * `Close Without Applying` beside it -- a Cancel with the state machine
   * written into its label, which existed because users could not otherwise
   * predict whether closing would commit. Applying on click removes the
   * question; the undo covers the mis-click that the confirmation was
   * protecting against, without charging every correct switch for it.
   */
  const applySwitch = async (
    label: string,
    change: () => Promise<void>
  ): Promise<void> => {
    const previous = { groupId: activeGroupId, campaignId: activeCampaignId };
    setSwitchError(null);
    setUndoError(null);

    try {
      await change();
      setIsOpen(false);
      setUndoTarget({ ...previous, label });
    } catch (error) {
      setSwitchError(
        error instanceof Error
          ? error.message
          : 'Could not switch group or campaign.'
      );
    }
  };

  const handleSelectGroup = (groupId: string) => {
    if (groupId === activeGroupId) {
      setIsOpen(false);
      return;
    }
    const name = groups.find((g) => g.id === groupId)?.name ?? 'that group';
    void applySwitch(name, () => setActiveGroup(groupId));
  };

  const handleSelectCampaign = (campaignId: string) => {
    if (campaignId === activeCampaignId) {
      setIsOpen(false);
      return;
    }
    const name = campaigns.find((c) => c.id === campaignId)?.name ?? 'that campaign';
    void applySwitch(name, () => setActiveCampaign(campaignId));
  };

  /** Restore the group and campaign that were active before the last switch. */
  const handleUndo = async () => {
    if (!undoTarget) return;
    const { groupId, campaignId } = undoTarget;
    setUndoError(null);

    try {
      if (groupId && groupId !== activeGroupId) {
        await setActiveGroup(groupId);
      }
      if (campaignId && campaignId !== activeCampaignId) {
        await setActiveCampaign(campaignId);
      }
      setUndoTarget(null);
    } catch (error) {
      setUndoError(
        error instanceof Error ? error.message : 'Could not switch back.'
      );
    }
  };
```

Pull `groups` and `campaigns` into the component so the label lookups work:

```tsx
  const { activeGroupId, setActiveGroup, groups } = useGroups();
  const { activeCampaignId, setActiveCampaign, campaigns } = useCampaigns();
```

Change `GroupSelector` and `CampaignSelector` to take the active id and the handler only — no `selected*` props:

```tsx
            <GroupSelector
              activeGroupId={activeGroupId}
              onSelectGroup={handleSelectGroup}
              showJoinGroupDialog={() => setShowJoinGroupDialog(true)}
            />

            <CampaignSelector
              activeGroupId={activeGroupId}
              activeCampaignId={activeCampaignId}
              campaigns={campaigns}
              onSelectCampaign={handleSelectCampaign}
            />
```

Inside both selectors, delete the `isSelected` const and make the row class depend on `isActive` alone — with staged selection gone, "active" and "selected" are one state, so the row carries the tint **and** the check, and nothing else is highlighted:

```tsx
                className={clsx(
                  "flex items-center justify-between px-3 py-2 w-full text-left rounded-md",
                  isActive ? `dropdown-item-active` : `dropdown-item`
                )}
```

Delete the `{inDialog && ( … Apply Changes … Close Without Applying … )}` block entirely. Render the error and the toast after the dropdown, still inside the `relative` wrapper:

```tsx
        {switchError && (
          <div className="absolute left-0 top-full mt-1 w-full z-20 px-3 py-2 dropdown">
            <Typography variant="body-sm" color="error">
              {switchError}
            </Typography>
          </div>
        )}

        {undoTarget && (
          <div className="absolute left-0 top-full mt-2 w-full z-20">
            <UndoToast
              label={undoTarget.label}
              error={undoError}
              onUndo={handleUndo}
              onDismiss={() => {
                setUndoTarget(null);
                setUndoError(null);
              }}
            />
          </div>
        )}
```

Finally, remove the reload from the join success handler:

```tsx
      <JoinGroupDialog
        open={showJoinGroupDialog}
        onClose={() => setShowJoinGroupDialog(false)}
        onSuccess={() => {
          setShowJoinGroupDialog(false);
        }}
      />
```

(Task 9 gives this its real behaviour and moves the mount into `Header`.)

`inDialog` and `onClose` both still exist as props; Task 5 deletes them. `onClose` becomes unused here, because `handleReset` — its only caller — went with the `Close Without Applying` button. Leave the prop declared and destructured but unused for this one commit: `noUnusedLocals` is off in `tsconfig.json`, so `tsc` is content, and removing it now would mean editing `Header`, which is Task 6's job. The rewritten tests never pass either prop, so they exercise header mode, which is the mode that survives.

- [ ] **Step 9: Run it to verify it passes**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(ContextSwitcher|UndoToast)"
```

Expected: PASS.

- [ ] **Step 10: Full suite, type-check, commit**

```bash
npx tsc --noEmit && npm test
```

Expected: 0 failures. `Header.test.tsx` still passes — it mocks `shared/components/ContextSwitcher` wholesale.

```bash
git add src/shared/components src/core/themes/css/components.css
git commit -m "$(cat <<'EOF'
feat(context): switch on click, with an undo instead of an Apply button

Removes staged selection, Apply Changes, and Close Without Applying -- a
Cancel with the state machine written into its label, whose existence was
the tell that users could not predict whether closing would apply. A
click now switches, and the mis-click that the confirmation protected
against is covered by an undo that costs the correct switches nothing.

Also drops window.location.reload() from this flow, which Task 2 made
unnecessary, and collapses the duplicate encoding on rows: with staged
selection gone, "selected" and "active" are one state, so a row carries
one highlight and one check rather than both meanings at once.

The toast is not the mock's dark slab. An inverted --text-primary /
--bg-primary surface was tried on the contact callout and reverted: it
is legible in all three themes and appropriate in none.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

## Task 5: A popover under the campaign name, not a modal

**Files:**
- Move: `src/shared/components/ContextSwitcher.tsx` → `src/shared/components/context-switcher/ContextSwitcher.tsx`
- Move: `src/shared/components/__tests__/ContextSwitcher.test.tsx` → `src/shared/components/context-switcher/__tests__/ContextSwitcher.test.tsx`
- Create: `src/shared/components/context-switcher/ContextTrigger.tsx`
- Create: `src/shared/components/context-switcher/usePopoverKeys.ts`
- Create: `src/shared/components/context-switcher/__tests__/usePopoverKeys.test.tsx`

**Interfaces:**
- Produces:

```ts
// ContextTrigger.tsx
interface ContextTriggerProps {
  /** Whether the popover it controls is open. */
  isOpen: boolean;
  /** Toggle the popover. */
  onToggle: () => void;
  /** Disabled while the group list is still loading. */
  disabled?: boolean;
}
declare const ContextTrigger: React.ForwardRefExoticComponent<
  ContextTriggerProps & React.RefAttributes<HTMLButtonElement>
>;

// usePopoverKeys.ts
interface UsePopoverKeysOptions {
  isOpen: boolean;
  /** The popover panel. Rows are located inside it by [role="menuitem"]. */
  panelRef: React.RefObject<HTMLElement>;
  /** The trigger, refocused when the popover closes on Escape. */
  triggerRef: React.RefObject<HTMLElement>;
  onClose: () => void;
}
export function usePopoverKeys(options: UsePopoverKeysOptions): void;
```

- Consumed by: Task 6 (`Header` renders `ContextSwitcher` with no props), Task 8 (the steps render `role="menuitem"` rows that `usePopoverKeys` drives).

**`ContextSwitcher` loses both its props.** `inDialog` and `onClose` are deleted; there is one mode. Task 6 removes the last caller that passed them.

- [ ] **Step 1: Move the files**

```bash
mkdir -p src/shared/components/context-switcher/__tests__
git mv src/shared/components/ContextSwitcher.tsx src/shared/components/context-switcher/ContextSwitcher.tsx
git mv src/shared/components/__tests__/ContextSwitcher.test.tsx src/shared/components/context-switcher/__tests__/ContextSwitcher.test.tsx
```

Update the moved test's import of the component — it stays `from '../ContextSwitcher'`, which is still correct after the move. Update the moved component's `UndoToast` import from the absolute `shared/components/context-switcher/UndoToast` to the sibling-relative `./UndoToast`, and its header comment to the new path. Update `Header.tsx`'s import to `shared/components/context-switcher/ContextSwitcher` and `Header.test.tsx`'s `jest.mock("shared/components/ContextSwitcher", …)` to the same new path, so the suite keeps passing until Task 6 rewrites it properly.

- [ ] **Step 2: Write the failing `usePopoverKeys` test**

Create `src/shared/components/context-switcher/__tests__/usePopoverKeys.test.tsx`:

```tsx
// src/shared/components/context-switcher/__tests__/usePopoverKeys.test.tsx

import React, { useRef, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { usePopoverKeys } from "../usePopoverKeys";

/** A minimal popover that uses the hook exactly as ContextSwitcher does. */
const Harness: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setIsOpen(false);
    onClose?.();
  };

  usePopoverKeys({ isOpen, panelRef, triggerRef, onClose: close });

  return (
    <div>
      <button ref={triggerRef}>Trigger</button>
      {isOpen && (
        <div ref={panelRef} role="menu">
          <button role="menuitem">First</button>
          <button role="menuitem">Second</button>
          <button role="menuitem">Third</button>
        </div>
      )}
    </div>
  );
};

describe("usePopoverKeys", () => {
  test("moves focus into the popover when it opens", () => {
    render(<Harness />);
    expect(screen.getByText("First")).toHaveFocus();
  });

  test("ArrowDown moves to the next row", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getByText("Second")).toHaveFocus();
  });

  test("ArrowDown wraps from the last row to the first", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "End" });
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getByText("First")).toHaveFocus();
  });

  test("ArrowUp moves to the previous row", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "ArrowUp" });
    expect(screen.getByText("First")).toHaveFocus();
  });

  test("ArrowUp wraps from the first row to the last", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "ArrowUp" });
    expect(screen.getByText("Third")).toHaveFocus();
  });

  test("Home and End jump to the ends", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "End" });
    expect(screen.getByText("Third")).toHaveFocus();
    fireEvent.keyDown(document, { key: "Home" });
    expect(screen.getByText("First")).toHaveFocus();
  });

  test("Tab stays inside the popover", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "End" });
    fireEvent.keyDown(document, { key: "Tab" });
    // The page behind is still visible; tabbing out of a popover that covers
    // it would strand the keyboard user outside a panel they cannot see.
    expect(screen.getByText("First")).toHaveFocus();
  });

  test("Escape closes and returns focus to the trigger", () => {
    const onClose = jest.fn();
    render(<Harness onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Trigger")).toHaveFocus();
  });

  test("does nothing while closed", () => {
    const onClose = jest.fn();
    render(<Harness onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    onClose.mockClear();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="usePopoverKeys"
```

Expected: FAIL — `Cannot find module '../usePopoverKeys'`.

- [ ] **Step 4: Write `usePopoverKeys`**

Create `src/shared/components/context-switcher/usePopoverKeys.ts`:

```ts
// src/shared/components/context-switcher/usePopoverKeys.ts
import { useEffect } from "react";

/**
 * Options for {@link usePopoverKeys}.
 */
interface UsePopoverKeysOptions {
  /** Whether the popover is currently open. */
  isOpen: boolean;
  /** The popover panel. Rows are located inside it by `[role="menuitem"]`. */
  panelRef: React.RefObject<HTMLElement>;
  /** The trigger, refocused when the popover closes on Escape. */
  triggerRef: React.RefObject<HTMLElement>;
  /** Close the popover. */
  onClose: () => void;
}

/**
 * The keyboard contract for an open popover menu.
 *
 * Arrow keys and Home/End walk the rows, Tab cycles within the panel rather
 * than leaving it for the page behind (which is still visible but not
 * interactive), and Escape closes and hands focus back to the trigger so the
 * keyboard user is not dropped at the top of the document.
 *
 * Rows are read from the DOM on every keystroke rather than captured once,
 * because the panel swaps between the campaign step and the group step while
 * it is open -- a captured list would drive the wrong rows after the swap.
 */
export function usePopoverKeys({
  isOpen,
  panelRef,
  triggerRef,
  onClose
}: UsePopoverKeysOptions): void {
  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    if (!panel) return;

    const rowsOf = () =>
      Array.from(panel.querySelectorAll<HTMLElement>('[role="menuitem"]'));

    // Move focus into the popover so the arrow keys have somewhere to start.
    rowsOf()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        triggerRef.current?.focus();
        return;
      }

      const rows = rowsOf();
      if (rows.length === 0) return;

      const from = rows.indexOf(document.activeElement as HTMLElement);
      const next = () => rows[from + 1 >= rows.length ? 0 : from + 1];
      const previous = () => rows[from <= 0 ? rows.length - 1 : from - 1];

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          next()?.focus();
          break;
        case "ArrowUp":
          event.preventDefault();
          previous()?.focus();
          break;
        case "Home":
          event.preventDefault();
          rows[0]?.focus();
          break;
        case "End":
          event.preventDefault();
          rows[rows.length - 1]?.focus();
          break;
        case "Tab":
          event.preventDefault();
          (event.shiftKey ? previous() : next())?.focus();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, panelRef, triggerRef, onClose]);
}
```

- [ ] **Step 5: Run it to verify it passes**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="usePopoverKeys"
```

Expected: PASS.

- [ ] **Step 6: Write `ContextTrigger`**

Create `src/shared/components/context-switcher/ContextTrigger.tsx`:

```tsx
// src/shared/components/context-switcher/ContextTrigger.tsx
import React, { forwardRef, useMemo } from "react";
import { useGroups, useCampaigns } from "features/user-management";
import Typography from "core/components/Typography";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

/**
 * Props for {@link ContextTrigger}.
 */
interface ContextTriggerProps {
  /** Whether the popover it controls is open. */
  isOpen: boolean;
  /** Toggle the popover. */
  onToggle: () => void;
  /** Disabled while the group list is still loading. */
  disabled?: boolean;
}

/**
 * The header chip that opens the context switcher.
 *
 * It names the active CAMPAIGN rather than "group / campaign", because the
 * campaign is what the rest of the page is about and the group changes rarely.
 * The chip is the popover's anchor as well as its trigger -- the switcher
 * appears under the words it is about to change, instead of over a dashboard
 * that is about to change underneath it.
 */
const ContextTrigger = forwardRef<HTMLButtonElement, ContextTriggerProps>(
  ({ isOpen, onToggle, disabled = false }, ref) => {
    const { activeGroup, loading } = useGroups();
    const { activeCampaign } = useCampaigns();

    const label = useMemo(() => {
      if (loading) return "Loading...";
      if (!activeGroup) return "Select Group";
      if (!activeCampaign) return "No Campaign";
      return activeCampaign.name;
    }, [activeGroup, activeCampaign, loading]);

    return (
      <button
        ref={ref}
        type="button"
        onClick={onToggle}
        disabled={disabled || loading}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Active campaign: ${label}. Change group or campaign`}
        className={clsx(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md max-w-[9rem] md:max-w-[14rem]",
          isOpen ? "dropdown-item-active" : "button-ghost"
        )}
      >
        <Typography variant="body-sm" className="truncate font-semibold">
          {label}
        </Typography>
        <ChevronDown size={14} className="flex-shrink-0" />
      </button>
    );
  }
);

ContextTrigger.displayName = "ContextTrigger";

export default ContextTrigger;
```

- [ ] **Step 7: Replace the trigger-text tests**

In `src/shared/components/context-switcher/__tests__/ContextSwitcher.test.tsx`, replace the whole `describe('trigger text', …)` block. The chip now names the campaign, not `group / campaign`:

```tsx
  // -------------------------------------------------------------------------
  describe('trigger', () => {
    test('names the active campaign', () => {
      renderContextSwitcher();
      expect(
        screen.getByRole('button', { name: /Active campaign: Middle Earth Adventures/ })
      ).toBeInTheDocument();
    });

    test('says so when no group is active', () => {
      (useGroups as jest.Mock).mockReturnValue(
        makeGroupsMock({ activeGroupId: null, activeGroup: null })
      );
      renderContextSwitcher();
      expect(screen.getByText('Select Group')).toBeInTheDocument();
    });

    test('says so when no campaign is active', () => {
      (useCampaigns as jest.Mock).mockReturnValue(
        makeCampaignsMock({ activeCampaignId: null, activeCampaign: null })
      );
      renderContextSwitcher();
      expect(screen.getByText('No Campaign')).toBeInTheDocument();
    });

    test('reports the popover state to assistive technology', () => {
      renderContextSwitcher();
      const trigger = screen.getAllByRole('button')[0];
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  // -------------------------------------------------------------------------
  describe('keyboard', () => {
    test('Escape closes the popover and returns focus to the trigger', async () => {
      renderContextSwitcher();
      const trigger = screen.getAllByRole('button')[0];
      fireEvent.click(trigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
      expect(trigger).toHaveFocus();
    });
  });
```

- [ ] **Step 8: Convert `ContextSwitcher` to a popover**

In `src/shared/components/context-switcher/ContextSwitcher.tsx`:

Delete the `ContextSwitcherProps` interface and both props; the signature becomes:

```tsx
/**
 * Lets the user see and change the active group and campaign.
 *
 * A popover anchored to the header chip, not a modal. The modal it replaced
 * covered the dashboard it was about to change and repeated its own two
 * section labels in its title.
 */
const ContextSwitcher: React.FC = () => {
```

Delete `ContextButton` entirely and import the new trigger and hook:

```tsx
import ContextTrigger from './ContextTrigger';
import { usePopoverKeys } from './usePopoverKeys';
```

Add the refs, wire the hook, and keep the existing click-outside effect but drop its `inDialog` guard:

```tsx
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closePopover = useCallback(() => setIsOpen(false), []);

  usePopoverKeys({ isOpen, panelRef, triggerRef, onClose: closePopover });

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
```

(`useCallback` must be added to the React import.)

Replace the render with:

```tsx
      <div className="relative" ref={dropdownRef}>
        <ContextTrigger
          ref={triggerRef}
          isOpen={isOpen}
          onToggle={() => setIsOpen(!isOpen)}
        />

        {isOpen && (
          <div
            ref={panelRef}
            role="menu"
            aria-label="Group and campaign"
            className="dropdown absolute left-0 top-full mt-1 w-[23.5rem] max-w-[calc(100vw-2rem)] rounded-md shadow-lg z-20"
          >
            <GroupSelector … />
            <CampaignSelector … />
          </div>
        )}
        …
      </div>
```

Give every selectable row `role="menuitem"` — the group rows, the campaign rows and the join row — so `usePopoverKeys` can find them.

- [ ] **Step 9: Run the suites**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(context-switcher|Header)"
```

Expected: PASS. `Header.test.tsx` still mocks the whole component, so it is unaffected beyond the import path updated in Step 1.

- [ ] **Step 10: Type-check, full suite, commit**

```bash
npx tsc --noEmit && npm test && npm run build
```

`npm run build` matters here: this task adds new import specifiers, and webpack ignores tsconfig `paths` where `tsc` and jest honour them.

```bash
git add -A src/shared/components src/app/layout
git commit -m "$(cat <<'EOF'
feat(context): a popover under the campaign name, not a modal

The switcher opened as a Dialog titled "Select Group and Campaign" --
which repeated the two section labels inside it -- covering the dashboard
it was about to change, with dead space below its buttons. It is now a
popover anchored to the header chip, which is where the user already
reads the current context.

Adds the keyboard contract a menu owes: Escape closes and returns focus
to the trigger, arrows and Home/End walk the rows, Tab cycles inside the
panel, and the trigger carries aria-expanded and aria-haspopup.

inDialog and onClose are gone; there is one mode now.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

## Task 6: Anchor the switcher to the campaign chip

**Files:**
- Modify: `src/app/layout/Header.tsx`
- Test: `src/app/layout/__tests__/Header.test.tsx`

**Interfaces:**
- Consumes: `ContextSwitcher` from Task 5, which now takes no props and renders its own trigger.
- Produces: nothing.

**One deliberate behaviour change.** The chip is currently gated on `user && activeCampaign`. With the hamburger's Campaign section removed, the chip becomes the *only* entrance to switching, so gating it on a campaign would strand a user whose newly joined group has no campaigns yet — they could not switch back. The gate becomes `user && activeGroup`, and the trigger says `No Campaign` in that state. The Header test asserting the chip's absence changes from "no active campaign" to "no active group", which is the condition that genuinely means there is nothing to switch.

- [ ] **Step 1: Update the Header tests**

In `src/app/layout/__tests__/Header.test.tsx`, change the `ContextSwitcher` mock's path if Step 1 of Task 5 has not already:

```tsx
jest.mock("shared/components/context-switcher/ContextSwitcher", () => ({
  __esModule: true,
  default: () => <div data-testid="context-switcher" />,
}));
```

Replace the four tests in `describe("campaign context", …)` that concern the chip and the menu:

```tsx
    test("should display active campaign name when available", async () => {
      setupMocks({
        user: { uid: "u1" },
        activeCampaignId: "camp-1",
        campaigns: [{ id: "camp-1", name: "The Dark Campaign" }],
      });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));

      // The menu's read-only Campaign section is gone: the switcher chip is
      // the one place the active campaign is shown, and the one door onto
      // changing it.
      expect(screen.queryByText("The Dark Campaign")).not.toBeInTheDocument();
    });

    test("hosts the context switcher in the bar", () => {
      setupMocks({
        user: { uid: "u1" },
        activeGroup: { id: "g1", name: "The Fellowship" },
        activeCampaignId: "camp-1",
        campaigns: [{ id: "camp-1", name: "The Dark Campaign" }],
      });
      render(<Header />);

      expect(screen.getByTestId("context-switcher")).toBeInTheDocument();
    });

    test("omits the switcher when there is no active group", () => {
      setupMocks({ user: { uid: "u1" }, activeGroup: null, campaigns: [] });
      render(<Header />);

      // Nothing to switch between, and nothing to name.
      expect(screen.queryByTestId("context-switcher")).not.toBeInTheDocument();
    });

    test("keeps the switcher when a group has no campaigns yet", () => {
      setupMocks({
        user: { uid: "u1" },
        activeGroup: { id: "g1", name: "The Fellowship" },
        activeCampaignId: null,
        campaigns: [],
      });
      render(<Header />);

      // The chip is now the only entrance to switching, so a group with no
      // campaigns must not strand the user without one.
      expect(screen.getByTestId("context-switcher")).toBeInTheDocument();
    });
```

Delete the old `shows the active campaign in the bar without opening the menu`, `omits the campaign chip when there is no active campaign` and `opens the context switcher from the campaign chip` tests — the chip is no longer Header's to render, and the switcher's own suite covers its trigger. Confirm `setupMocks` accepts an `activeGroup` override; if it does not, add one alongside the existing `activeCampaignId` / `campaigns` overrides.

- [ ] **Step 2: Run to verify they fail**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="Header"
```

Expected: FAIL — Header still renders its own chip and its own Campaign section.

- [ ] **Step 3: Replace the chip with the switcher**

In `src/app/layout/Header.tsx`, replace the whole `{user && activeCampaign && ( … )}` block with:

```tsx
            {/* Campaign context, and the door onto changing it. Previously a
                chip that opened a modal over the page it was about to
                change; now the popover's own anchor. */}
            {user && activeGroup && (
              <>
                <span
                  aria-hidden="true"
                  className="w-px h-6 self-center opacity-40 bg-secondary"
                ></span>
                <ContextSwitcher />
              </>
            )}
```

Update the import:

```tsx
import ContextSwitcher from 'shared/components/context-switcher/ContextSwitcher';
```

- [ ] **Step 4: Remove the dialog and the menu's Campaign section**

Delete the entire `{/* Context Switcher Dialog */}` `<Dialog>…</Dialog>` block, the `showContextSwitcher` state, and `handleContextSwitcherClick`.

Delete the entire `{/* Campaign Section - Only when logged in */}` block from the hamburger menu — the read-only Group and Campaign rows and the `Change` button.

Remove now-unused imports and locals: `Book`, `Users`, `ChevronDown` (check none is still used elsewhere in the file), and `const activeCampaign = campaigns.find(…)` together with `activeCampaignId, campaigns` from `useCampaigns()` if nothing else reads them. Keep `activeGroup` from `useGroups()` — the new gate uses it.

- [ ] **Step 5: Run to verify they pass**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="Header"
```

Expected: PASS.

- [ ] **Step 6: Type-check, full suite, build, commit**

```bash
npx tsc --noEmit && npm test && npm run build
```

Watch for `'X' is declared but its value is never read` from `tsc` after Step 4's deletions.

```bash
git add src/app/layout
git commit -m "$(cat <<'EOF'
feat(header): anchor the switcher to the campaign chip

The chip opened a Dialog; it now hosts the popover directly. With the
switcher visible from the bar at every width, the hamburger menu's
Campaign section -- a read-only copy of the same two facts plus a second
door onto the same switcher -- is removed.

The chip is gated on an active GROUP rather than an active campaign: it
is now the only entrance to switching, so a group whose campaigns have
not been created yet must not leave the user without one.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

## Task 7: Count a campaign's chapters and NPCs

**Files:**
- Modify: `src/core/services/firebase/campaign/CampaignService.ts`
- Test: `src/core/services/firebase/campaign/__tests__/CampaignService.test.ts`

**Interfaces:**
- Produces:

```ts
/** How much a campaign holds, for the switcher's second line. */
export interface CampaignCounts {
  chapters: number;
  npcs: number;
}

// on CampaignService
public async getCampaignCounts(
  groupId: string,
  campaignId: string
): Promise<CampaignCounts>;
```

- Consumed by: Task 8's `useCampaignCounts`.

**Why an aggregation.** `Campaign` carries no counts, so the switcher's second line has to be fetched. `getCountFromServer` is available in the pinned `firebase@11.3.0` and bills one read per aggregation regardless of how many documents it counts — reading the collections would bill one read per document. `firestore.rules.prod:284` already grants `allow read` on `/groups/{g}/campaigns/{c}/{collection}/{doc}` to any group member, which covers the aggregation; **no rules change is needed.**

- [ ] **Step 1: Write the failing test**

Add `getCountFromServer` to the `firebase/firestore` mock factory in `src/core/services/firebase/campaign/__tests__/CampaignService.test.ts`, declaring the mock beside the others:

```ts
const mockGetCountFromServer = jest.fn();
```

and inside the factory:

```ts
  getCountFromServer: function() { return (mockGetCountFromServer as Function).apply(null, arguments); },
```

Append this describe block to the suite:

```ts
  // ─── getCampaignCounts ──────────────────────────────────────────────────────

  describe('getCampaignCounts', () => {
    /** Shape getCountFromServer returns: snapshot.data().count */
    const countSnapshot = (count: number) => ({ data: () => ({ count }) });

    beforeEach(() => {
      mockGetGroupUserProfile.mockResolvedValue({ userId: 'campaign-user' });
    });

    test('counts chapters and NPCs for the named campaign', async () => {
      mockGetCountFromServer
        .mockResolvedValueOnce(countSnapshot(39))
        .mockResolvedValueOnce(countSnapshot(16));

      const counts = await svc.getCampaignCounts('g1', 'c1');

      expect(counts).toEqual({ chapters: 39, npcs: 16 });
    });

    test('counts under the named campaign, not the active one', async () => {
      mockGetCountFromServer.mockResolvedValue(countSnapshot(0));

      await svc.getCampaignCounts('g1', 'c1');

      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(), 'groups', 'g1', 'campaigns', 'c1', 'chapters'
      );
      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(), 'groups', 'g1', 'campaigns', 'c1', 'npcs'
      );
    });

    test('refuses when the caller is not a member of the group', async () => {
      mockGetGroupUserProfile.mockResolvedValue(null);

      await expect(svc.getCampaignCounts('g1', 'c1')).rejects.toThrow(
        'You are not a member of this group'
      );
      expect(mockGetCountFromServer).not.toHaveBeenCalled();
    });

    test('rejects when an aggregation fails', async () => {
      mockGetCountFromServer.mockRejectedValue(new Error('permission-denied'));

      // The caller decides what a missing count means. For the switcher it
      // means the row shows its name and no second line -- never an error.
      await expect(svc.getCampaignCounts('g1', 'c1')).rejects.toThrow(
        'permission-denied'
      );
    });
  });
```

Match the suite's existing way of obtaining `svc` — reuse whatever helper the file already uses to get the singleton rather than introducing a new one.

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="CampaignService"
```

Expected: FAIL — `svc.getCampaignCounts is not a function`.

- [ ] **Step 3: Implement `getCampaignCounts`**

In `src/core/services/firebase/campaign/CampaignService.ts`, extend the firestore import:

```ts
    getCountFromServer,
```

Export the result type above the class:

```ts
  /**
   * How much a campaign holds. Used to tell two campaigns apart in the
   * context switcher, where a name alone is not enough.
   */
  export interface CampaignCounts {
    chapters: number;
    npcs: number;
  }
```

Add the method after `getCampaigns`:

```ts
    /**
     * Count the chapters and NPCs in a campaign.
     *
     * Aggregation queries bill one read each regardless of collection size,
     * which is what makes it affordable to describe every campaign in the
     * switcher rather than only the active one. The two counts run in
     * parallel; either rejecting rejects the pair, and the caller decides what
     * a missing count means -- in the switcher, a row with no second line.
     *
     * @param groupId ID of the group the campaign belongs to
     * @param campaignId ID of the campaign to describe
     * @returns Chapter and NPC counts for that campaign
     */
    public async getCampaignCounts(
      groupId: string,
      campaignId: string
    ): Promise<CampaignCounts> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const userProfileDoc = await this.userService.getGroupUserProfile(groupId, userId);
      if (!userProfileDoc) {
        throw new Error('You are not a member of this group');
      }

      const countOf = async (collectionName: string): Promise<number> => {
        const snapshot = await getCountFromServer(
          collection(this.db, 'groups', groupId, 'campaigns', campaignId, collectionName)
        );
        return snapshot.data().count;
      };

      const [chapters, npcs] = await Promise.all([
        countOf('chapters'),
        countOf('npcs')
      ]);

      return { chapters, npcs };
    }
```

- [ ] **Step 4: Run to verify it passes, then commit**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="CampaignService"
npx tsc --noEmit
```

```bash
git add src/core/services/firebase/campaign
git commit -m "$(cat <<'EOF'
feat(campaigns): count a campaign's chapters and NPCs

Campaign carries no counts, so the switcher's second line has to be
fetched. getCountFromServer bills one read per aggregation regardless of
collection size, which is what makes it affordable to describe every
campaign in the list rather than only the active one. Existing rules
already permit it: any group member may read under a campaign.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

## Task 8: Campaigns lead, group is a header row

The largest task. Build the hooks first, then the two steps, then swap them into `ContextSwitcher`.

**Files:**
- Create: `src/shared/components/context-switcher/useCampaignCounts.ts` (+ test)
- Create: `src/shared/components/context-switcher/useGroupSummaries.ts` (+ test)
- Create: `src/shared/components/context-switcher/CampaignStep.tsx` (+ test)
- Create: `src/shared/components/context-switcher/GroupStep.tsx` (+ test)
- Modify: `src/shared/components/context-switcher/ContextSwitcher.tsx`
- Test: `src/shared/components/context-switcher/__tests__/ContextSwitcher.test.tsx`

**Interfaces:**
- Consumes: `CampaignService.getCampaignCounts` (Task 7), `CampaignService.getCampaigns`, `GroupService.getGroupUsers`, `useStory().chapters` / `.storyProgress`, `useNPCs().npcs`.
- Produces:

```ts
// useCampaignCounts.ts
export function useCampaignCounts(
  groupId: string | null,
  campaignIds: string[],
  enabled: boolean
): Record<string, CampaignCounts>;

// useGroupSummaries.ts
export interface GroupSummary {
  campaignCount: number;
  memberCount: number;
  isAdmin: boolean;
  joinedAt: Date | string | null;
}
export function useGroupSummaries(
  groupIds: string[],
  enabled: boolean
): Record<string, GroupSummary>;

// CampaignStep.tsx
interface CampaignStepProps {
  onSelectCampaign: (campaignId: string) => void;
  onChangeGroup: () => void;
  onJoinGroup: () => void;
}

// GroupStep.tsx
interface GroupStepProps {
  onSelectGroup: (groupId: string) => void;
  onBack: () => void;
}
```

**The active campaign costs nothing.** `StoryProvider` and `NPCProvider` are mounted above `Layout` in `App.tsx:43-45`, and `Layout` renders `Header`, so `useStory()` and `useNPCs()` are in scope. The active row reads `chapters.length`, `npcs.length` and `storyProgress.currentChapter` straight from context — exact, already loaded, no query. Only the *other* rows need `useCampaignCounts`.

**There is no "last opened".** It is stored nowhere and there is no `updatedAt` to degrade to, so no row says it. Do not invent one.

- [ ] **Step 1: Write the failing `useCampaignCounts` test**

Create `src/shared/components/context-switcher/__tests__/useCampaignCounts.test.tsx`:

```tsx
// src/shared/components/context-switcher/__tests__/useCampaignCounts.test.tsx

import { renderHook, waitFor } from "@testing-library/react";
import { useCampaignCounts } from "../useCampaignCounts";

const mockGetCampaignCounts = jest.fn();

jest.mock("@/core/services/firebase", () => ({
  __esModule: true,
  default: {
    campaign: {
      getCampaignCounts: (...args: any[]) => mockGetCampaignCounts(...args),
    },
  },
}));

describe("useCampaignCounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCampaignCounts.mockResolvedValue({ chapters: 12, npcs: 8 });
  });

  test("returns nothing until it is enabled", () => {
    const { result } = renderHook(() =>
      useCampaignCounts("g1", ["c1", "c2"], false)
    );

    expect(result.current).toEqual({});
    expect(mockGetCampaignCounts).not.toHaveBeenCalled();
  });

  test("counts each campaign once enabled", async () => {
    const { result } = renderHook(() =>
      useCampaignCounts("g1", ["c1", "c2"], true)
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        c1: { chapters: 12, npcs: 8 },
        c2: { chapters: 12, npcs: 8 },
      });
    });
    expect(mockGetCampaignCounts).toHaveBeenCalledWith("g1", "c1");
    expect(mockGetCampaignCounts).toHaveBeenCalledWith("g1", "c2");
  });

  test("omits a campaign whose count failed rather than failing the list", async () => {
    mockGetCampaignCounts
      .mockResolvedValueOnce({ chapters: 12, npcs: 8 })
      .mockRejectedValueOnce(new Error("permission-denied"));

    const { result } = renderHook(() =>
      useCampaignCounts("g1", ["c1", "c2"], true)
    );

    await waitFor(() => {
      expect(result.current.c1).toEqual({ chapters: 12, npcs: 8 });
    });
    // The row shows its name and no second line. Decoration must never break
    // the list it decorates.
    expect(result.current.c2).toBeUndefined();
  });

  test("does nothing without a group", () => {
    renderHook(() => useCampaignCounts(null, ["c1"], true));
    expect(mockGetCampaignCounts).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails, then write `useCampaignCounts`**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="useCampaignCounts"
```

Create `src/shared/components/context-switcher/useCampaignCounts.ts`:

```ts
// src/shared/components/context-switcher/useCampaignCounts.ts
import { useEffect, useState } from "react";
import firebaseServices from "core/services/firebase";
import type { CampaignCounts } from "core/services/firebase/campaign/CampaignService";

/**
 * Chapter and NPC counts for campaigns the user is not currently in.
 *
 * Two campaigns with only their names on screen are indistinguishable, and the
 * name is all the data model holds. These counts are what make a row mean
 * something -- but they are decoration, so a failure omits one row's second
 * line rather than breaking the list.
 *
 * Fires only when `enabled` (the popover is open), so a header that is never
 * opened costs nothing.
 *
 * @param groupId The group the campaigns belong to
 * @param campaignIds Campaigns to describe -- exclude the active one, whose
 *   numbers are already in context for free
 * @param enabled Whether to fetch at all
 * @returns Counts by campaign id; a missing key means "not known"
 */
export function useCampaignCounts(
  groupId: string | null,
  campaignIds: string[],
  enabled: boolean
): Record<string, CampaignCounts> {
  const [counts, setCounts] = useState<Record<string, CampaignCounts>>({});

  // Identity of the array changes on every render; its contents do not.
  const key = campaignIds.join(",");

  useEffect(() => {
    if (!enabled || !groupId || !key) return;

    let cancelled = false;

    key.split(",").forEach((campaignId) => {
      firebaseServices.campaign
        .getCampaignCounts(groupId, campaignId)
        .then((result) => {
          if (cancelled) return;
          setCounts((previous) => ({ ...previous, [campaignId]: result }));
        })
        .catch(() => {
          // Leave the key absent: the row renders without a second line.
        });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, groupId, key]);

  return counts;
}
```

Run again — expect PASS.

- [ ] **Step 3: Write the failing `useGroupSummaries` test**

Create `src/shared/components/context-switcher/__tests__/useGroupSummaries.test.tsx`:

```tsx
// src/shared/components/context-switcher/__tests__/useGroupSummaries.test.tsx

import { renderHook, waitFor } from "@testing-library/react";
import { useGroupSummaries } from "../useGroupSummaries";

const mockGetCampaigns = jest.fn();
const mockGetGroupUsers = jest.fn();
const mockGetCurrentUserId = jest.fn();

jest.mock("@/core/services/firebase", () => ({
  __esModule: true,
  default: {
    auth: { getCurrentUserId: () => mockGetCurrentUserId() },
    campaign: { getCampaigns: (...args: any[]) => mockGetCampaigns(...args) },
    group: { getGroupUsers: (...args: any[]) => mockGetGroupUsers(...args) },
  },
}));

describe("useGroupSummaries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockReturnValue("u1");
    mockGetCampaigns.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    mockGetGroupUsers.mockResolvedValue([
      { id: "u1", userId: "u1", role: "admin", joinedAt: "2026-04-02T00:00:00.000Z" },
      { id: "u2", userId: "u2", role: "member", joinedAt: "2026-04-03T00:00:00.000Z" },
      { id: "u3", userId: "u3", role: "member", joinedAt: "2026-04-04T00:00:00.000Z" },
    ]);
  });

  test("returns nothing until it is enabled", () => {
    const { result } = renderHook(() => useGroupSummaries(["g1"], false));

    expect(result.current).toEqual({});
    expect(mockGetCampaigns).not.toHaveBeenCalled();
  });

  test("describes a group by its campaigns, members and the caller's place in it", async () => {
    const { result } = renderHook(() => useGroupSummaries(["g1"], true));

    await waitFor(() => {
      expect(result.current.g1).toEqual({
        campaignCount: 2,
        memberCount: 3,
        isAdmin: true,
        joinedAt: "2026-04-02T00:00:00.000Z",
      });
    });
  });

  test("reports a non-admin caller as such", async () => {
    mockGetCurrentUserId.mockReturnValue("u2");

    const { result } = renderHook(() => useGroupSummaries(["g1"], true));

    await waitFor(() => {
      expect(result.current.g1?.isAdmin).toBe(false);
    });
  });

  test("omits a group whose lookup failed rather than failing the list", async () => {
    mockGetGroupUsers.mockRejectedValue(new Error("permission-denied"));

    const { result } = renderHook(() => useGroupSummaries(["g1"], true));

    await waitFor(() => {
      expect(mockGetGroupUsers).toHaveBeenCalled();
    });
    expect(result.current.g1).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run to verify it fails, then write `useGroupSummaries`**

Create `src/shared/components/context-switcher/useGroupSummaries.ts`:

```ts
// src/shared/components/context-switcher/useGroupSummaries.ts
import { useEffect, useState } from "react";
import firebaseServices from "core/services/firebase";

/**
 * What a group row says about itself, beyond its name.
 */
export interface GroupSummary {
  /** Campaigns in the group. */
  campaignCount: number;
  /** People in the group. */
  memberCount: number;
  /** Whether the current user is an admin of it. */
  isAdmin: boolean;
  /** When the current user joined it, or null if unknown. */
  joinedAt: Date | string | null;
}

/**
 * Describe each group the user belongs to.
 *
 * Both lookups already exist and both are permitted to any member of the group
 * -- `getGroupUsers` checks membership, not admin, despite its doc comment.
 * The user list carries the member count, the caller's role and the caller's
 * join date in one pass, so three of the four fields cost nothing beyond it.
 *
 * Fires only when `enabled` (the group step is showing), so the common case --
 * a user who never changes group -- pays nothing.
 *
 * @param groupIds Groups to describe
 * @param enabled Whether to fetch at all
 * @returns Summaries by group id; a missing key means "not known"
 */
export function useGroupSummaries(
  groupIds: string[],
  enabled: boolean
): Record<string, GroupSummary> {
  const [summaries, setSummaries] = useState<Record<string, GroupSummary>>({});

  const key = groupIds.join(",");

  useEffect(() => {
    if (!enabled || !key) return;

    let cancelled = false;
    const userId = firebaseServices.auth.getCurrentUserId();

    key.split(",").forEach((groupId) => {
      Promise.all([
        firebaseServices.campaign.getCampaigns(groupId),
        firebaseServices.group.getGroupUsers(groupId)
      ])
        .then(([campaigns, users]) => {
          if (cancelled) return;
          const me = users.find((u: any) => (u.userId ?? u.id) === userId);

          setSummaries((previous) => ({
            ...previous,
            [groupId]: {
              campaignCount: campaigns.length,
              memberCount: users.length,
              isAdmin: me?.role?.toLowerCase() === "admin",
              joinedAt: me?.joinedAt ?? null
            }
          }));
        })
        .catch(() => {
          // Leave the key absent: the row renders without a second line.
        });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, key]);

  return summaries;
}
```

Run — expect PASS.

- [ ] **Step 5: Write `CampaignStep` and its test**

Create `src/shared/components/context-switcher/CampaignStep.tsx`. It renders, top to bottom: the group header with `Change ›`, the `CAMPAIGNS IN THIS GROUP` list, a hairline rule, and the join row in a quieter weight.

```tsx
// src/shared/components/context-switcher/CampaignStep.tsx
import React from "react";
import { useGroups, useCampaigns } from "features/user-management";
import { useStory } from "features/storytelling";
import { useNPCs } from "features/campaign-entities";
import Typography from "core/components/Typography";
import { BookOpen, Check, ChevronRight, PlusCircle } from "lucide-react";
import clsx from "clsx";
import { useCampaignCounts } from "./useCampaignCounts";

/**
 * Props for {@link CampaignStep}.
 */
interface CampaignStepProps {
  /** Switch to a campaign. */
  onSelectCampaign: (campaignId: string) => void;
  /** Show the group step. */
  onChangeGroup: () => void;
  /** Open the join-a-group dialog. */
  onJoinGroup: () => void;
}

/**
 * The switcher's first and usual step.
 *
 * Campaigns lead and the group is a header row, because one group holds
 * several campaigns and the group rarely changes -- two equal-weight stacked
 * lists gave the rare choice the same prominence as the common one.
 */
const CampaignStep: React.FC<CampaignStepProps> = ({
  onSelectCampaign,
  onChangeGroup,
  onJoinGroup
}) => {
  const { activeGroup, activeGroupId } = useGroups();
  const { campaigns, activeCampaignId } = useCampaigns();
  const { chapters, storyProgress } = useStory();
  const { npcs } = useNPCs();

  // The active campaign's numbers are already loaded; only the others cost a
  // query, and only while this step is on screen.
  const otherIds = campaigns
    .filter((campaign) => campaign.id !== activeCampaignId)
    .map((campaign) => campaign.id);
  const counts = useCampaignCounts(activeGroupId, otherIds, true);

  /**
   * The second line of a campaign row.
   *
   * Returns null when nothing is known, and the row then shows its name alone
   * -- there is no per-campaign "last opened" anywhere in the data model, so
   * there is nothing to fall back to and nothing worth inventing.
   */
  const describe = (campaignId: string): string | null => {
    if (campaignId === activeCampaignId) {
      const current = chapters.find((c) => c.id === storyProgress.currentChapter);
      const parts = [
        `${chapters.length} chapters`,
        `${npcs.length} NPCs`
      ];
      if (current) parts.push(`you're on chapter ${current.order}`);
      return parts.join(" · ");
    }

    const known = counts[campaignId];
    if (!known) return null;
    return `${known.chapters} chapters · ${known.npcs} NPCs`;
  };

  return (
    <div>
      {/* Group header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary border-b">
        <div className="min-w-0">
          <Typography variant="caption" color="muted" className="uppercase tracking-wide">
            Group
          </Typography>
          <Typography className="truncate font-semibold">
            {activeGroup ? activeGroup.name : "No group"}
          </Typography>
        </div>
        <button
          type="button"
          role="menuitem"
          onClick={onChangeGroup}
          className="flex items-center gap-1 font-semibold primary shrink-0"
        >
          Change
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Campaigns */}
      <div className="p-2">
        <Typography
          variant="caption"
          color="muted"
          className="px-3 py-1 uppercase tracking-wide"
        >
          Campaigns in this group
        </Typography>

        <div className="mt-1 max-h-64 overflow-y-auto">
          {campaigns.length > 0 ? (
            campaigns.map((campaign) => {
              const isActive = campaign.id === activeCampaignId;
              const summary = describe(campaign.id);

              return (
                <button
                  key={campaign.id}
                  type="button"
                  role="menuitem"
                  onClick={() => onSelectCampaign(campaign.id)}
                  className={clsx(
                    "flex items-center justify-between gap-3 px-3 py-2 w-full text-left rounded-md",
                    isActive ? "dropdown-item-active" : "dropdown-item"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BookOpen className="w-4 h-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <Typography className="truncate font-semibold">
                        {campaign.name}
                      </Typography>
                      {summary && (
                        <Typography variant="body-sm" color="secondary" className="truncate">
                          {summary}
                        </Typography>
                      )}
                    </div>
                  </div>
                  {isActive && <Check className="w-4 h-4 flex-shrink-0" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2">
              <Typography color="secondary">No campaigns in this group</Typography>
            </div>
          )}
        </div>
      </div>

      {/* Joining a group is not one of the choices above it */}
      <div className="mx-4 border-t" />
      <button
        type="button"
        role="menuitem"
        onClick={onJoinGroup}
        className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-md dropdown-item"
      >
        <PlusCircle className="w-4 h-4 flex-shrink-0" />
        <Typography variant="body-sm">Join a group with an invite code</Typography>
      </button>
    </div>
  );
};

export default CampaignStep;
```

Write `__tests__/CampaignStep.test.tsx` covering, with `useGroups`, `useCampaigns`, `useStory`, `useNPCs` and `useCampaignCounts` mocked:

- the group name appears under a `Group` eyebrow, with a `Change` action
- the active row shows `N chapters · N NPCs · you're on chapter N` from context
- a non-active row shows `N chapters · N NPCs` from the counts hook
- a non-active row with no resolved counts shows its name and **no** second line
- exactly one check mark appears, on the active row
- the join row is present and calls `onJoinGroup`
- clicking a campaign row calls `onSelectCampaign` with its id
- no row anywhere says "last opened"

- [ ] **Step 6: Write `GroupStep` and its test**

Create `src/shared/components/context-switcher/GroupStep.tsx` — same shell, with a `← Choose a group` header, rows described by `useGroupSummaries`, and the footnote.

Row summary: `${campaignCount} campaign(s) · ${memberCount} member(s)` plus `you're an admin` when `isAdmin`, else `joined in <Month>` when `joinedAt` is known. Pluralise `campaign`/`member` on 1. Format the month with `new Date(joinedAt).toLocaleString(undefined, { month: "long" })`, guarding an invalid date by omitting the clause.

Footnote, verbatim:

```tsx
      <div className="px-4 py-3">
        <Typography variant="body-sm" color="secondary">
          Choosing a group loads that group's campaigns and picks the one you
          last opened there.
        </Typography>
      </div>
```

Header:

```tsx
      <button
        type="button"
        role="menuitem"
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-3 w-full text-left border-b dropdown-item"
      >
        <ArrowLeft className="w-4 h-4 flex-shrink-0" />
        <Typography className="font-semibold">Choose a group</Typography>
      </button>
```

Rows use the `Users` icon, `dropdown-item-active` + a `Check` for the active group, `dropdown-item` otherwise.

Test it for: the back action calls `onBack`; each row shows counts and the role/joined clause; a row with no summary shows its name alone; clicking a row calls `onSelectGroup`; the footnote is present.

- [ ] **Step 7: Swap the steps into `ContextSwitcher`**

Replace `GroupSelector` and `CampaignSelector` (delete both) with the two steps and a step state:

```tsx
  const [step, setStep] = useState<'campaigns' | 'groups'>('campaigns');
```

Reset to `'campaigns'` whenever the popover closes, so it never reopens mid-flow:

```tsx
  useEffect(() => {
    if (!isOpen) setStep('campaigns');
  }, [isOpen]);
```

Render:

```tsx
            {step === 'campaigns' ? (
              <CampaignStep
                onSelectCampaign={handleSelectCampaign}
                onChangeGroup={() => setStep('groups')}
                onJoinGroup={() => setShowJoinGroupDialog(true)}
              />
            ) : (
              <GroupStep
                onSelectGroup={handleSelectGroup}
                onBack={() => setStep('campaigns')}
              />
            )}
```

`handleSelectGroup` returns to the campaign step on success. Because `setActiveGroup` now loads that group's campaigns and activates the one the user last had open there (Task 2), the campaign step is correct by construction when it reappears — this is the structural cure for the Task 1 bug:

```tsx
  const handleSelectGroup = (groupId: string) => {
    if (groupId === activeGroupId) {
      setStep('campaigns');
      return;
    }
    const name = groups.find((g) => g.id === groupId)?.name ?? 'that group';
    void applySwitch(name, async () => {
      await setActiveGroup(groupId);
      setStep('campaigns');
    });
  };
```

Update the moved `ContextSwitcher.test.tsx`: mock `features/storytelling` and `features/campaign-entities` alongside the existing barrel mock, adjust the labels the `opening and closing` block looks for (`Select Group` → `Campaigns in this group`; `Join Group` → `Join a group with an invite code`), and add:

```tsx
    test('reaches the group list behind Change', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByRole('menuitem', { name: /change/i }));
      });

      expect(screen.getByText('Choose a group')).toBeInTheDocument();
      expect(screen.getByText('Fellowship of the Ring')).toBeInTheDocument();
    });

    test('returns to the campaigns after choosing a group', async () => {
      renderContextSwitcher();
      openSwitcher();

      await act(async () => {
        fireEvent.click(screen.getByRole('menuitem', { name: /change/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByText('Order of the Phoenix'));
      });

      expect(mockSetActiveGroup).toHaveBeenCalledWith('group-2');
    });
```

- [ ] **Step 8: Run everything, type-check, build, commit**

```bash
npx jest --testTimeout=15000 --maxWorkers=1 --testPathPattern="context-switcher"
npx tsc --noEmit && npm test && npm run build
```

```bash
git add src/shared/components/context-switcher
git commit -m "$(cat <<'EOF'
feat(context): campaigns lead, group is a header row

One group holds several campaigns and the group rarely changes, so two
equal-weight stacked lists gave the rare choice the prominence of the
common one. Campaigns now lead; the group is a header row with a Change
action, and choosing a group is a second step behind it.

Every row carries real data, because a name alone cannot tell two
campaigns apart: the active campaign's counts and reading position come
free from StoryContext and NPCContext, which are mounted above the
header, and the other campaigns cost two aggregate reads each, fired
only while the popover is open. Group rows reuse getCampaigns and
getGroupUsers, both already permitted to any member.

No row says "last opened": it is stored nowhere and there is no
updatedAt to fall back on, so the clause is omitted rather than invented.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

## Task 9: Mount the join dialog once

**Files:**
- Modify: `src/app/layout/Header.tsx`
- Modify: `src/shared/components/context-switcher/ContextSwitcher.tsx`
- Test: `src/app/layout/__tests__/Header.test.tsx`
- Test: `src/shared/components/context-switcher/__tests__/ContextSwitcher.test.tsx`

**Interfaces:**
- Produces: `ContextSwitcher` gains one prop.

```ts
interface ContextSwitcherProps {
  /** Open the join-a-group dialog, which its owner mounts. */
  onJoinGroup: () => void;
}
```

`JoinGroupDialog` is mounted three times, not two: `Header.tsx:403`, `ContextSwitcher.tsx:153`, and `UserProfileButton.tsx:115`. The third is unreachable — `UserProfileButton` is rendered nowhere in `src/` — and is **left untouched**; deleting an unrendered component and its test suite is a separate call. The two live entrances are both inside `Header`, which becomes the sole owner.

- [ ] **Step 1: Write the failing Header test**

```tsx
    test("switches to a group the user has just joined", async () => {
      const user = userEvent.setup();
      setupMocks({
        user: { uid: "u1" },
        activeGroup: { id: "g1", name: "The Fellowship" },
        groups: [{ id: "g1", name: "The Fellowship" }],
      });
      // refreshGroups resolves with the list as it is AFTER joining
      mockRefreshGroups.mockResolvedValue([
        { id: "g1", name: "The Fellowship" },
        { id: "g2", name: "The Council of Elrond" },
      ]);
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));
      await user.click(screen.getByRole("button", { name: /join group/i }));
      await user.click(screen.getByTestId("trigger-join-success"));

      // joinGroupWithToken returns void, so the new group is the one that
      // appears in the list. Landing the user in it is the whole point of
      // having just joined it.
      expect(mockSetActiveGroup).toHaveBeenCalledWith("g2");
      expect(mockReload).not.toHaveBeenCalled();
    });
```

This test needs three mocks the file may not have yet: `mockRefreshGroups` and `mockSetActiveGroup` returned from the `useGroups` mock (add them to `setupMocks`, with `mockRefreshGroups` defaulting to `mockResolvedValue([])`), and `mockReload` installed over `window.location` in `beforeEach` the way `ContextSwitcher.test.tsx` does. Also add a `groups` override to `setupMocks` if it has none.

Extend the file's `JoinGroupDialog` stub so `onSuccess` can be fired:

```tsx
jest.mock("@/features/user-management/groups/components/JoinGroupDialog", () => ({
  __esModule: true,
  default: ({ open, onSuccess }: { open: boolean; onSuccess: () => void }) =>
    open ? (
      <button data-testid="trigger-join-success" onClick={onSuccess}>
        Join
      </button>
    ) : null,
}));
```

and add a test asserting exactly one dialog is mounted:

```tsx
    test("mounts the join dialog exactly once", async () => {
      const user = userEvent.setup();
      setupMocks({
        user: { uid: "u1" },
        activeGroup: { id: "g1", name: "The Fellowship" },
      });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));
      await user.click(screen.getByRole("button", { name: /join group/i }));

      expect(screen.getAllByTestId("trigger-join-success")).toHaveLength(1);
    });
```

- [ ] **Step 2: Give `ContextSwitcher` the prop and remove its mount**

Delete the `<JoinGroupDialog … />` element, the `showJoinGroupDialog` state and the barrel's `JoinGroupDialog` import from `ContextSwitcher.tsx`. Add:

```tsx
/**
 * Props for {@link ContextSwitcher}.
 */
interface ContextSwitcherProps {
  /**
   * Open the join-a-group dialog.
   *
   * The dialog is mounted by the owner rather than here, because the header
   * menu offers the same action -- and mounting it in both places gave the
   * same action two different outcomes depending on which door the user came
   * through.
   */
  onJoinGroup: () => void;
}
```

and pass `onJoinGroup` straight through to `CampaignStep`. Update the switcher's own tests: replace the `joining a group` block's dialog assertion with `expect(onJoinGroup).toHaveBeenCalled()` after clicking the join row.

- [ ] **Step 3: Make `Header` the sole owner**

Add the shared handler and pass the opener down:

```tsx
  /**
   * One success behaviour for joining a group, from either entrance.
   *
   * Refreshing alone left the user in the group they were already in, staring
   * at a list they had just changed. joinGroupWithToken returns void and no id
   * reaches us, so the new group is the one that appears in the list; if none
   * does -- a re-join, or a race -- refresh and say nothing rather than guess.
   */
  const handleJoinedGroup = async () => {
    setShowJoinGroup(false);
    const before = new Set(groups.map((group) => group.id));
    const after = await refreshGroups();
    const joined = after?.find((group) => !before.has(group.id));
    if (joined) {
      await setActiveGroup(joined.id);
    }
  };
```

Wire it into the single `<JoinGroupDialog … onSuccess={handleJoinedGroup} />` and render `<ContextSwitcher onJoinGroup={() => setShowJoinGroup(true)} />`. Pull `groups` and `setActiveGroup` from `useGroups()`.

- [ ] **Step 4: Run, type-check, build, commit**

```bash
npx jest --testTimeout=15000 --maxWorkers=1 --testPathPattern="(Header|context-switcher)"
npx tsc --noEmit && npm test && npm run build
```

```bash
git add src/app/layout src/shared/components/context-switcher
git commit -m "$(cat <<'EOF'
fix(groups): mount the join dialog once

JoinGroupDialog was mounted three times, not two: in Header, in
ContextSwitcher (success reloaded the page) and in UserProfileButton
(success refreshed groups), so the same action had different outcomes
depending on which door the user came through. Header owns the single
mount now; the switcher takes an onJoinGroup callback.

One success behaviour: refresh the groups, switch to the one that
appeared -- joinGroupWithToken returns void, so the new group is
identified by diffing the list -- and offer the undo. No reload.

UserProfileButton is left alone: it is rendered nowhere in src/, and
deleting an unrendered component with its own suite is a separate call.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

## Task 10: Verify in the browser and record what changed

**Files:**
- Modify: `docs/superpowers/plans/2026-08-30-context-switcher.md` (this file — record corrections)
- Modify: `CLAUDE.md` only if something here changes standing guidance

- [ ] **Step 1: Run the three gates**

```bash
npx tsc --noEmit
npm test
npm run build
```

Expected: no type errors; 0 failures (`2` skipped is the standing baseline); a clean production build. `npm run build` is not implied by the other two — webpack ignores tsconfig `paths`, so an `@/…` import that slipped into shipping code fails only here.

- [ ] **Step 2: Look at it in all three themes**

```bash
.\scripts\start-dev.ps1 -Action start
```

Switch between light, dark and medieval via the header's Appearance section and check:

- the popover surface reads as a floating panel in all three, not as page background
- the `.toast` surface is an emphasised note, not an alert — this is the specific failure the contact callout hit, and only the browser catches it
- the active row's tint is visibly stronger than a hover, and the check is legible on it
- medieval's decorative card flourishes have not appeared on any row (they attach to `.card`, which nothing here uses)
- the chip truncates rather than pushing the navigation off the bar at ~360px wide

**If the toast looks wrong, change the CSS, not the plan's reasoning** — and record what you saw and what you changed here, the way `4f9d653` did for the callout. A colour rule that is provably legible in every theme can still belong in none of them.

- [ ] **Step 3: Exercise the flows the tests cannot**

With the emulators running and sample data generated (`.\scripts\manage-dev-data.ps1 -Action generate`):

1. Switch campaign. The page must not flash or reload; chapters, NPCs, quests, rumors and notes must all show the new campaign's data; the reading position must be the new campaign's.
2. `Undo`. The previous pair must come back, again with no reload.
3. `Change` → pick another group. Its campaigns must appear, with the one last opened there active, and the campaign list must never show the previous group's campaigns.
4. Keyboard alone: tab to the chip, `Enter`, arrow through the rows, `Enter` to switch, `Escape` from a reopened popover and confirm focus lands back on the chip.

- [ ] **Step 4: Record any consumer you had to touch**

The PR description asks for this explicitly. `StoryContext`'s reading-progress effect is the known one (Task 3). If Step 3 turns up another view that does not refresh on a campaign change, fix it the same way — add the campaign id to its effect deps or query key — and list it here and in the PR description.

- [ ] **Step 5: Commit the record**

```bash
git add docs CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(context): record what the redesign changed

Keeps the plan matching what shipped, including any consumer that needed
its effect keyed on the campaign id and anything the browser corrected
that the tokens could not predict.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

## Definition of Done

Mapped to the PR description's own checklist:

- [ ] Selecting a group can no longer apply a campaign belonging to a different group, and there is a test for it — Task 1, and structurally guaranteed from Task 4 onward
- [ ] No Apply button, no `Close Without Applying`, no `window.location.reload()` in this flow — Task 4, with `mockReload` asserted un-called
- [ ] Switching happens in a header popover, keyboard-navigable and `Escape`-dismissible; the blocking dialog is gone — Tasks 5 and 6
- [ ] Every campaign and group row carries real counts — Tasks 7 and 8
- [ ] A mis-click is recoverable via `Undo` — Task 4
- [ ] `Join a group` is visually separated and mounted exactly once — Tasks 8 and 9
- [ ] `npm test` passes; `ContextSwitcher.test.tsx` is rewritten for immediate application, replacing rather than silently deleting the obsolete `Apply Changes` tests — Task 4

Plus the three gates from Task 10, and the browser pass that no gate can perform.
