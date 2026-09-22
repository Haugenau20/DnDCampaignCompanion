# Entity Loader Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every entity collection is fetched once per page load, by the provider that owns it, and no user profile data reaches the production console.

**Architecture:** `useFirebaseData` gains an `autoFetch` opt-out so the five write-only instances stop fetching collections they never read. The two NPC pages and `SearchContext` stop building private loaders and read the providers they already sit inside. Thirty `console.log` calls are deleted.

**Tech Stack:** React 18.2 + TypeScript, Firebase/Firestore, Jest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-22-entity-loader-consolidation-design.md`

## Global Constraints

- **Import style:** bare `baseUrl` imports (`shared/hooks/useFirebaseData`, `core/types/common`) in anything that ships. `@/…` is permitted **only** in `__tests__/` and `test-utils/`, which are never bundled — webpack ignores tsconfig `paths` and a shipped `@/` import fails `npm run build` while passing `tsc` and jest.
- **Quotes:** double quotes (`"`) per ESLint config.
- **Theme:** never hardcode colors. Not expected to arise in this plan.
- **JSDoc:** required on all functions, components and complex variables.
- **Tests are specifications.** Never edit a test to make it pass. The three mock edits in this plan are permitted for one reason only: the subject's *collaborator* changes, so the mock must name the new collaborator. **No assertion changes in those files.**
- **Baseline:** measured at Task 0. Any red beyond that baseline is a regression.
- **Do not push to `main`.** Branch is `fix/entity-loader-consolidation`.
- **Verify with all three gates** before proposing merge: `npx tsc --noEmit`, `npm test`, `npm run build`. None implies the others.

---

### Task 0: Record the test baseline

**Files:**
- Modify: none (measurement only)

**Interfaces:**
- Consumes: nothing
- Produces: the failure/suite/test counts every later task compares against

- [ ] **Step 1: Run the full suite**

```bash
npx jest --silent 2>&1 | tail -15
```

- [ ] **Step 2: Confirm the baseline**

**Measured 2026-09-22 on this branch at 74b5e49:**

```
Test Suites: 258 passed, 258 total
Tests:       2 skipped, 5122 passed, 5124 total
```

**CLAUDE.md is stale here** — it records `4715 passed / 4717 total across 235
suites`, taken on a branch that has since merged. `main` has grown by 23 suites
and 407 tests since. Trust the measurement above; Task 7 updates the file.

The run also prints `A worker process has failed to exit gracefully`. That is
pre-existing on a clean tree, not something this work introduced — do not chase
it, and do not let it be mistaken for a failure. Exit code is 0.

If your run disagrees with the numbers above, reconcile the delta before
starting: re-run the differing suites alone to confirm, and do not begin work
against an unexplained red.

- [ ] **Step 3: Confirm the type gate is clean**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

---

### Task 1: `useFirebaseData` gains `autoFetch`

**Files:**
- Modify: `src/shared/hooks/useFirebaseData.ts`
- Test: `src/shared/hooks/__tests__/useFirebaseData.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `UseFirebaseDataOptions<T>` gains `autoFetch?: boolean` (default `true`). All five contexts in Task 2 pass `autoFetch: false`. Return shape is unchanged: `{ data, loading, error, getData, addData, updateData, deleteData, setDocument }`.

The existing suite already mocks `useFirestore` and dispatches
`AUTH_STATE_CHANGED_EVENT`; reuse its helpers (`defaultFirestoreMock`,
`dispatchAuthEvent`, `TestItem`) rather than writing new ones.

- [ ] **Step 1: Write the failing tests**

Append to `src/shared/hooks/__tests__/useFirebaseData.test.ts`, inside the
top-level `describe("useFirebaseData", …)`:

```ts
  // -------------------------------------------------------------------------
  // autoFetch: false — the write-only instance
  // -------------------------------------------------------------------------
  describe("autoFetch: false", () => {
    test("does not fetch the collection on mount", async () => {
      renderHook(() =>
        useFirebaseData<TestItem>({ collection: "items", autoFetch: false })
      );

      await waitFor(() => {
        expect(mockGetCollection).not.toHaveBeenCalled();
      });
    });

    test("does not fetch when the auth state changes", async () => {
      renderHook(() =>
        useFirebaseData<TestItem>({ collection: "items", autoFetch: false })
      );

      act(() => {
        dispatchAuthEvent(true);
      });
      act(() => {
        dispatchAuthEvent(false);
      });

      await waitFor(() => {
        expect(mockGetCollection).not.toHaveBeenCalled();
      });
    });

    test("reports loading as false, because nothing is in flight", () => {
      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: "items", autoFetch: false })
      );

      expect(result.current.loading).toBe(false);
    });

    test("still writes, and still surfaces a write error", async () => {
      mockCreateDocument.mockRejectedValueOnce(new Error("permission denied"));

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: "items", autoFetch: false })
      );

      await act(async () => {
        await expect(
          result.current.addData({ name: "Gundren" } as any, "gundren")
        ).rejects.toThrow("permission denied");
      });

      expect(mockCreateDocument).toHaveBeenCalled();
      expect(result.current.error).toBe("permission denied");
    });

    test("getData still fetches when called explicitly", async () => {
      mockGetCollection.mockResolvedValue([{ id: "a", name: "A" }]);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: "items", autoFetch: false })
      );

      await act(async () => {
        await result.current.getData();
      });

      expect(mockGetCollection).toHaveBeenCalledTimes(1);
    });

    test("omitting autoFetch leaves the fetching behaviour unchanged", async () => {
      renderHook(() => useFirebaseData<TestItem>({ collection: "items" }));

      await waitFor(() => {
        expect(mockGetCollection).toHaveBeenCalledWith("items");
      });
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="useFirebaseData"
```

Expected: the five `autoFetch: false` cases FAIL (the option is ignored, so the
hook fetches on mount and `loading` starts `true`). The sixth case
("omitting autoFetch…") PASSES already — it is the control that proves the
default path is untouched.

- [ ] **Step 3: Implement**

In `src/shared/hooks/useFirebaseData.ts`:

Fix the stale header comment on line 1 — the path has not existed since the
restructure:

```ts
// src/shared/hooks/useFirebaseData.ts
```

Extend the options interface with a documented flag:

```ts
interface UseFirebaseDataOptions<T> {
  collection: string;
  idField?: keyof T;
  /**
   * Whether this instance owns a copy of the collection.
   *
   * Defaults to `true`: the hook fetches on mount and refetches on every auth
   * state change. Pass `false` for a **write-only** instance — one mounted
   * purely for `addData`/`updateData`/`deleteData`, whose `data` array nothing
   * renders. Such an instance fetching the collection is pure waste: a second
   * set of transforms, promises, loading states and React updates against data
   * no one reads. See the note on `addData` below.
   *
   * This is per-call-site rather than a change of default because at least one
   * second instance is NOT write-only: `StoryContext`'s `story-progress`
   * instance genuinely reads `data`.
   */
  autoFetch?: boolean;
}
```

Destructure with the default and make `loading` honest:

```ts
export function useFirebaseData<T extends Record<string, any>>(
  options: UseFirebaseDataOptions<T>
) {
  const { autoFetch = true } = options;
  const [data, setData] = useState<T[]>([]);
  // A write-only instance has nothing in flight on mount, so it must not claim
  // to be loading -- that flag would otherwise stay `true` for this instance's
  // entire life and lie to any future consumer.
  const [loading, setLoading] = useState(autoFetch);
```

Guard the mount effect:

```ts
  // Fetch data on mount -- unless this instance is write-only.
  useEffect(() => {
    if (!autoFetch) {
      return;
    }
    getData();
  }, [getData, autoFetch]);
```

Guard the auth listener. Registering it at all on a write-only instance would
refetch on every sign-in and sign-out, which is the majority of the waste:

```ts
  // Refresh data on auth state changes -- unless this instance is write-only.
  useEffect(() => {
    if (!autoFetch) {
      return;
    }

    const handleAuthStateChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{authenticated: boolean}>;

      // Clear data immediately on sign out
      if (!customEvent.detail.authenticated) {
        setData([]);
      }

      // Refresh data on both sign in and sign out
      getData();
    };

    window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);

    return () => {
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
    };
  }, [getData, autoFetch]);
```

- [ ] **Step 4: Update the `addData` JSDoc**

This comment is the load-bearing explanation for the whole change and goes
stale the moment the flag exists. Replace its second paragraph (the one
beginning "The optimistic `setData` append below is genuinely incomplete")
with:

```
   * The optimistic `setData` append below is genuinely incomplete: it lacks the
   * server-stamped attribution (`createdBy`, `dateAdded`, etc.) until the next
   * fetch replaces it. That is safe because nothing renders off a write-only
   * instance's `data` array -- each of the five contexts (NPC/Quest/Rumor/
   * Location/Story) gets the list it actually renders from a *separate*
   * `useFirebaseData<T>` instance owned by its own read hook, and never
   * destructures `data` from the instance it calls `addData` on.
   *
   * That was once an accident worth documenting. It is now the contract:
   * those instances pass `autoFetch: false`, so their `data` array holds only
   * optimistic appends, never a fetched collection, and reading it would be a
   * mistake the option name warns against.
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="useFirebaseData"
```

Expected: PASS, all cases including the pre-existing ones.

- [ ] **Step 6: Commit**

```bash
git add src/shared/hooks/useFirebaseData.ts src/shared/hooks/__tests__/useFirebaseData.test.ts
git commit -m "feat(data): useFirebaseData can skip the fetch it never reads

A write-only instance -- one mounted for addData/updateData/deleteData whose
data array nothing renders -- now opts out of fetching with autoFetch: false.
Its loading flag starts false, because nothing is in flight.

Per-call-site rather than a new default: StoryContext's story-progress
instance is a second instance that genuinely reads its data.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01M6GZgk57MnmDCzpRZFXH9N"
```

---

### Task 2: The five write instances opt out

**Files:**
- Modify: `src/features/campaign-entities/npcs/context/NPCContext.tsx:25-27`
- Modify: `src/features/campaign-entities/quests/context/QuestContext.tsx:47-49`
- Modify: `src/features/campaign-entities/locations/context/LocationContext.tsx:27`
- Modify: `src/features/campaign-entities/rumors/context/RumorContext.tsx:20-22`
- Modify: `src/features/storytelling/chapters/context/StoryContext.tsx:89-92`
- Test: `src/shared/hooks/__tests__/provider-fetch-counts.test.tsx` (create)

**Interfaces:**
- Consumes: `autoFetch?: boolean` from Task 1
- Produces: nothing new. Provider public APIs are unchanged.

**The exception that must not be touched:** `StoryContext.tsx:94-99`, the
`story-progress` instance, destructures `data: progressData`. It keeps
fetching. Changing it breaks reading progress.

> **SCOPE EXPANDED DURING EXECUTION — read
> `.superpowers/sdd/2026-09-22-entity-loader-consolidation/task-2-addendum.md`
> before working this task.**
>
> The count below is wrong. Each collection is fetched **three** times per
> provider, not two: `useFirebaseData` fetches on mount internally *and* the
> `use*Data` read hook calls `getData()` from its own effect. This task now
> also opts the five read instances out, and — because `autoFetch: false` drops
> the `AUTH_STATE_CHANGED_EVENT` listener whose `setData([])` was the only
> thing clearing `data` on sign-out — inverts the context guard in all five
> read hooks so stale records cannot outrank "you are signed out". Five new
> tests pin that. The addendum has the full reasoning and the exact code.

- [ ] **Step 1: Write the failing test**

Create `src/shared/hooks/__tests__/provider-fetch-counts.test.tsx`.

This cannot live in the existing `*Context.behavioral.test.tsx` suites: those
mock `shared/hooks/useFirebaseData` wholesale, so no `getCollection` ever
happens in them and there is nothing to count. This suite uses the **real**
hook and the **real** read hooks, mocking only `useFirestore` and the auth /
group / campaign hooks that gate fetching.

```tsx
// src/shared/hooks/__tests__/provider-fetch-counts.test.tsx
import React from "react";
import { render, waitFor } from "@testing-library/react";

/**
 * One fetch per collection, per provider.
 *
 * Each entity context mounts two `useFirebaseData` instances: one for reads,
 * one for writes (the write instance's `error` is bound separately as
 * `writeError`, which is deliberate -- bug #1401 -- and must stay). For a long
 * time the write instance also fetched the whole collection, so every provider
 * issued two identical reads of data only one of them rendered.
 *
 * This suite is the regression pin for that. It deliberately does NOT mock
 * `useFirebaseData` -- the suites that do cannot see a fetch at all -- so it
 * counts what actually reaches Firestore.
 */

const mockGetCollection = jest.fn();
const mockCreateDocument = jest.fn();
const mockUpdateDocumentWithAttribution = jest.fn();
const mockDeleteDocument = jest.fn();
const mockGetDocument = jest.fn();

jest.mock("@/features/user-management", () => ({
  AUTH_STATE_CHANGED_EVENT: "auth-state-changed",
  useFirestore: () => ({
    getCollection: mockGetCollection,
    createDocument: mockCreateDocument,
    updateDocumentWithAttribution: mockUpdateDocumentWithAttribution,
    deleteDocument: mockDeleteDocument,
    getDocument: mockGetDocument,
  }),
  useAuth: () => ({ user: { uid: "user-1" } }),
  useUser: () => ({
    userProfile: { uid: "user-1" },
    activeGroupUserProfile: { username: "tester" },
  }),
  useGroups: () => ({ activeGroupId: "group-1" }),
  useCampaigns: () => ({ activeCampaignId: "campaign-1" }),
}));

jest.mock("@/shared/hooks/useCampaignContextStatus", () => ({
  useCampaignContextStatus: () => ({
    isResolving: false,
    hasRequiredContext: true,
    missingContext: null,
  }),
}));

import { NPCProvider } from "@/features/campaign-entities/npcs/context/NPCContext";
import { QuestProvider } from "@/features/campaign-entities/quests/context/QuestContext";
import { LocationProvider } from "@/features/campaign-entities/locations/context/LocationContext";
import { RumorProvider } from "@/features/campaign-entities/rumors/context/RumorContext";
import { StoryProvider } from "@/features/storytelling/chapters/context/StoryContext";

/** How many times the given collection was fetched. */
const fetchCountFor = (collection: string) =>
  mockGetCollection.mock.calls.filter(call => call[0] === collection).length;

describe("provider fetch counts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCollection.mockResolvedValue([]);
  });

  test.each([
    ["npcs", NPCProvider],
    ["quests", QuestProvider],
    ["locations", LocationProvider],
    ["rumors", RumorProvider],
  ])("%s is fetched once when its provider mounts", async (collection, Provider) => {
    render(
      <Provider>
        <div>child</div>
      </Provider>
    );

    await waitFor(() => {
      expect(fetchCountFor(collection)).toBeGreaterThan(0);
    });

    expect(fetchCountFor(collection)).toBe(1);
  });

  test("StoryProvider fetches chapters once, and story-progress once", async () => {
    render(
      <StoryProvider>
        <div>child</div>
      </StoryProvider>
    );

    await waitFor(() => {
      expect(fetchCountFor("chapters")).toBeGreaterThan(0);
    });

    expect(fetchCountFor("chapters")).toBe(1);
    // The story-progress instance is NOT write-only -- it reads its own `data`
    // as `progressData`. It must keep fetching. This assertion is the reason
    // the opt-out is per-call-site rather than a change of default.
    expect(fetchCountFor("story-progress")).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="provider-fetch-counts"
```

Expected: the four `test.each` cases FAIL with `expect(received).toBe(1)` /
`Received: 2`. The `StoryProvider` case FAILS on `chapters` being `2` while
`story-progress` is already `1`.

If a case instead fails with "must be used within a …Provider" or a missing
mock, fix the mock — not the assertion.

- [ ] **Step 3: Implement — NPCContext**

`src/features/campaign-entities/npcs/context/NPCContext.tsx`, replacing the
existing call at line 25:

```tsx
  // Additional Firebase hook for specific updates. Its `error` is renamed on
  // destructure (`writeError`) because the read instance above already binds
  // the name `error` -- this second instance is the one whose writes
  // (addData/updateData/deleteData) can actually fail, and its error was
  // previously dropped entirely (bug #1401).
  //
  // `autoFetch: false` because nothing renders off this instance's `data`:
  // the list comes from `useNPCData()` above. It used to fetch the whole
  // collection anyway, so every mount read `npcs` twice.
  const { updateData, deleteData, addData, error: writeError } = useFirebaseData<NPC>({
    collection: 'npcs',
    autoFetch: false
  });
```

- [ ] **Step 4: Implement — QuestContext**

`src/features/campaign-entities/quests/context/QuestContext.tsx`, at line 47:

```tsx
  // `autoFetch: false` because nothing renders off this instance's `data`:
  // the list comes from `useQuestData()` above. Its `error` is bound as
  // `writeError` so write failures are not conflated with read failures
  // (bug #1401).
  const { addData, updateData, deleteData, error: writeError } = useFirebaseData<Quest>({
    collection: 'quests',
    autoFetch: false
  });
```

- [ ] **Step 5: Implement — LocationContext**

`src/features/campaign-entities/locations/context/LocationContext.tsx`, at
line 27:

```tsx
  // `autoFetch: false` because nothing renders off this instance's `data`:
  // the list comes from `useLocationData()` above. Its `error` is bound as
  // `writeError` so write failures are not conflated with read failures
  // (bug #1401).
  const { updateData, deleteData, addData, error: writeError } = useFirebaseData<Location>({
    collection: 'locations',
    autoFetch: false
  });
```

- [ ] **Step 6: Implement — RumorContext**

`src/features/campaign-entities/rumors/context/RumorContext.tsx`, at line 20:

```tsx
  // This second `useFirebaseData` instance is the one whose writes (addData/updateData/
  // deleteData) can actually fail; its `error` is renamed on destructure (`writeError`)
  // because the read instance above already binds the name `error`. Previously this
  // instance's error was never read anywhere, so write failures were invisible (bug #1401).
  //
  // `autoFetch: false` because nothing renders off its `data`: the list comes
  // from `useRumorData()` above.
  const { addData, updateData, deleteData, error: writeError } = useFirebaseData<Rumor>({
    collection: 'rumors',
    autoFetch: false
  });
```

- [ ] **Step 7: Implement — StoryContext, the chapters instance only**

`src/features/storytelling/chapters/context/StoryContext.tsx`, at line 89:

```tsx
  // `autoFetch: false` because nothing renders off this instance's `data`:
  // chapters come from `useChapterData()` above.
  const {
    updateData,
    deleteData
  } = useFirebaseData<Chapter>({ collection: 'chapters', autoFetch: false });
```

**Leave the `story-progress` instance immediately below it exactly as it is.**
It reads `data: progressData` and must keep fetching.

- [ ] **Step 8: Run the test to verify it passes**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="provider-fetch-counts"
```

Expected: PASS, 5 tests.

- [ ] **Step 9: Run every suite that touches these contexts**

```bash
npx jest --maxWorkers=2 --testPathPattern="(NPCContext|QuestContext|LocationContext|RumorContext|StoryContext|useFirebaseData)"
```

Expected: no failures beyond the Task 0 baseline.

- [ ] **Step 10: Commit**

```bash
git add src/features src/shared/hooks/__tests__/provider-fetch-counts.test.tsx
git commit -m "perf(data): write instances stop fetching the collection they write to

Each entity context mounted two useFirebaseData instances against the same
collection -- one to read, one to write -- and both fetched. The write
instance's data array is rendered by nothing, so half of every provider's
startup work was thrown away.

StoryContext's story-progress instance keeps fetching: unlike the other five,
it reads its own data. Pinned by the new suite, which counts real getCollection
calls rather than mocking the hook that makes them.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01M6GZgk57MnmDCzpRZFXH9N"
```

---

### Task 3: `NPCContextValue` exposes refresh and context status

**Files:**
- Modify: `src/features/campaign-entities/npcs/types.ts:78-88`
- Modify: `src/features/campaign-entities/npcs/context/NPCContext.tsx:183-208`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `NPCContextValue` gains `refreshNPCs: () => Promise<NPC[]>` and `hasRequiredContext: boolean`. Task 4 consumes both.

`LocationContextValue` is the precedent — it declares `refreshLocations: () => Promise<Location[]>` and `hasRequiredContext: boolean`. `NPCProvider` already destructures both from `useNPCData()` and then discards them.

**Note on the return type:** `useNPCData().refreshNPCs` is `fetchNPCs`, which returns `Promise<NPC[]>` — it resolves to the sorted array, or `[]` on error or missing context. Declare it as `Promise<NPC[]>`, matching `refreshLocations`, not `Promise<void>`.

- [ ] **Step 1: Extend the interface**

In `src/features/campaign-entities/npcs/types.ts`, append to
`NPCContextValue`, before the closing brace:

```ts
  /**
   * Re-read the NPC collection.
   *
   * Exposed so a page can render this provider's copy and still drive a
   * refresh, rather than mounting a second loader of its own to get one.
   * Resolves to the refreshed list, or `[]` when there is no group or
   * campaign selected.
   */
  refreshNPCs: () => Promise<NPC[]>;
  /** Whether a group and a campaign are both selected. */
  hasRequiredContext: boolean;
```

- [ ] **Step 2: Expose them from the provider**

In `src/features/campaign-entities/npcs/context/NPCContext.tsx`, add to the
`value` object — both names are already in scope from the `useNPCData()`
destructure at line 16:

```tsx
    addNPC,
    updateNPC,
    deleteNPC,
    refreshNPCs,
    hasRequiredContext
  };
```

- [ ] **Step 3: Verify the type gate**

```bash
npx tsc --noEmit
```

Expected: exit 0. A failure here means a consumer builds an `NPCContextValue`
literal without the new members — find it and supply them rather than making
the members optional.

- [ ] **Step 4: Run the NPC context suites**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="NPCContext"
```

Expected: no failures beyond baseline.

- [ ] **Step 5: Commit**

```bash
git add src/features/campaign-entities/npcs
git commit -m "feat(npcs): NPCContextValue exposes refreshNPCs and hasRequiredContext

The provider already computed both and discarded them, so a page wanting a
refresh had to mount its own loader to get one. LocationContextValue is the
precedent for both members.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01M6GZgk57MnmDCzpRZFXH9N"
```

---

### Task 4: The NPC pages read the provider (T046)

**Files:**
- Modify: `src/pages/npcs/NPCsPage.tsx:21-33,50-55`
- Modify: `src/pages/npcs/NPCDetailPage.tsx:260`
- Test: `src/pages/npcs/__tests__/NPCsPage.test.tsx:55-73`
- Test: `src/pages/npcs/__tests__/NPCDetailPage.test.tsx:140`

**Interfaces:**
- Consumes: `refreshNPCs` and `hasRequiredContext` on `NPCContextValue` from Task 3
- Produces: nothing new

**This is the defect.** `NPCsPage` calls `useNPCData()` while `NPCProvider`
holds its own copy. A write through the context refreshes the provider's copy;
the page renders the other one, so the stance ladder wrote correctly and showed
the old word until a reload. The shipped fix was to call `onNPCUpdate` — a prop
that had been declared and never called — which fixed one write path out of
several.

**The mock edits below are collaborator swaps, not assertion changes.** The
subject now consumes `useNPCs` instead of `useNPCData`; the mock must say so.
Do not touch any `expect`.

- [ ] **Step 1: Write the failing test**

In `src/pages/npcs/__tests__/NPCsPage.test.tsx`, change the mock's hook name
and add the pin. Replace the `jest.mock("features/campaign-entities", …)`
block at line 67 with:

```tsx
jest.mock("features/campaign-entities", () => ({
  useNPCs: () => mockNPCData,
  NPCDirectory: (props: any) => (
    <div data-testid="npc-directory">
      <span data-testid="npc-directory-count">{props.npcs?.length}</span>
      <button data-testid="npc-directory-update" onClick={() => props.onNPCUpdate?.()}>
        update
      </button>
    </div>
  ),
}));
```

Update the mock's shape — the provider exposes `isLoading`, not `loading`:

```tsx
interface NPCDataMock {
  npcs: any[];
  isLoading: boolean;
  error: string | null;
  refreshNPCs: jest.Mock;
  hasRequiredContext: boolean;
}

let mockNPCData: NPCDataMock = {
  npcs: [],
  isLoading: false,
  error: null,
  refreshNPCs: jest.fn(),
  hasRequiredContext: true,
};
```

Then add this describe block at the end of the file, inside the top-level
`describe`:

```tsx
  describe("data ownership", () => {
    test("renders the provider's NPCs, not a second copy of its own", () => {
      mockNPCData = {
        ...mockNPCData,
        npcs: [{ id: "gundren", name: "Gundren" }, { id: "sildar", name: "Sildar" }],
      };

      render(<NPCsPage />);

      // If the page held its own loader, this would render that loader's
      // array -- which a write through the context never updates.
      expect(screen.getByTestId("npc-directory-count")).toHaveTextContent("2");
    });

    test("a directory write refreshes the provider's copy", () => {
      const refreshNPCs = jest.fn();
      mockNPCData = { ...mockNPCData, npcs: [], refreshNPCs };

      render(<NPCsPage />);
      screen.getByTestId("npc-directory-update").click();

      // The page must hand the directory the PROVIDER's refresh. Handing it a
      // private one is what made the stance ladder show a stale word.
      expect(refreshNPCs).toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="NPCsPage"
```

Expected: FAIL. The page still imports `useNPCData`, which the mock no longer
provides, so it is `undefined` and the render throws.

- [ ] **Step 3: Implement — `NPCsPage`**

Replace lines 19-33 of `src/pages/npcs/NPCsPage.tsx`:

```tsx
const NPCsPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  // Reads the provider this page writes through, rather than a second loader
  // of its own. Two independently fetched copies meant a write updated one and
  // the page rendered the other (T046).
  const { npcs, isLoading, error, refreshNPCs } = useNPCs();

  const gate = usePageGate("npcs", {
    loading: isLoading,
    error,
    onRetry: () => {
      void refreshNPCs();
    },
  });
```

Delete the now-redundant `handleNPCChanged` wrapper and pass the provider's
refresh directly:

```tsx
        <NPCDirectory
          npcs={npcs}
          onNPCUpdate={refreshNPCs}
          onNPCDelete={refreshNPCs}
        />
```

Change the import on line 4:

```tsx
import { NPCDirectory, useNPCs } from "features/campaign-entities";
```

Add a line to the component's JSDoc, after the existing paragraph:

```
 * It reads `useNPCs()` rather than `useNPCData()`: the page and the provider
 * used to hold two independently fetched copies of the same collection, so a
 * write through the context refreshed one while the page rendered the other.
```

- [ ] **Step 4: Implement — `NPCDetailPage`**

In `src/pages/npcs/NPCDetailPage.tsx`, change line 260:

```tsx
  const { npcs, isLoading, error, refreshNPCs } = useNPCs();
```

Then update the `usePageGate` call in that component to pass
`loading: isLoading`, and change the import on line 9 from `useNPCData` to
`useNPCs`. Its five existing `refreshNPCs()` calls now resolve to the
provider's refresh and need no change.

If `isLoading` collides with a name already bound in that component, alias it
(`isLoading: npcsLoading`) rather than renaming anything else.

- [ ] **Step 5: Update the `NPCDetailPage` mock**

In `src/pages/npcs/__tests__/NPCDetailPage.test.tsx` line 140, swap the
collaborator name and the loading key:

```tsx
  useNPCs: () => ({ ...mockNPCDataReturn, isLoading: mockNPCDataReturn.loading, refreshNPCs: mockRefreshNPCs }),
```

If `mockNPCDataReturn` has no `loading` key, set `isLoading` directly from
whatever that fixture uses. **Change no assertions.**

- [ ] **Step 6: Correct the comment that documents the bug**

`src/features/campaign-entities/npcs/components/NPCDirectory.tsx` carries a
long comment inside the `StateLadder`'s `onChange` (around lines 314-326)
explaining the defect **in the present tense**: *"`NPCsPage` mounts a loader
of its own and renders from that one, so the two disagree the moment either is
written to."* After Step 3 that is flatly false, and a confidently wrong
comment is worse than none.

Replace it with what is true afterwards, keeping the `onNPCUpdate?.(…)` call
itself:

```tsx
                              /*
                                And then tell the page. `updateNPCRelationship`
                                refreshes the provider's copy of the collection,
                                and `NPCsPage` now renders that copy, so this
                                call is belt-and-braces rather than the thing
                                carrying the fix -- which is what it used to be.
                                It was once a declared, destructured, never-called
                                prop, and the stance someone picked stayed on the
                                old word because of it (T046).
                              */
```

Then check the rest of the file for the same staleness:

```bash
grep -n "loader of its own\|NPCsPage" src/features/campaign-entities/npcs/components/NPCDirectory.tsx
```

Any other comment asserting the page holds a private loader is now wrong and
must be corrected too.

- [ ] **Step 7: Implement — SearchContext**

In `src/shared/context/SearchContext.tsx`, replace lines 134-138. The file
already reads quests from the provider (`useQuests()`); this makes the other
four symmetrical:

```tsx
  // Every collection comes from the provider that owns it. SearchProvider is
  // mounted inside all six (App.tsx), so building private loaders here only
  // produced a second fetch of each collection -- and an index that went stale
  // after a write, because the providers' copies were not the ones indexed.
  const { chapters } = useStory();
  const { npcs } = useNPCs();
  const { locations } = useLocations();
  const { quests } = useQuests();
  const { rumors } = useRumors();
  const { notes } = useNotes();
```

Update the imports at lines 5-13: `useChapterData` → `useStory` from
`features/storytelling`; `useNPCData` → `useNPCs`, `useLocationData` →
`useLocations`, `useRumorData` → `useRumors` from `features/campaign-entities`.

- [ ] **Step 8: Update the SearchContext mocks**

In `src/shared/context/__tests__/behavioral/SearchContext.behavioral.test.tsx`,
swap the mocked hook names at lines 31-45, keeping every mock function and
every assertion as they are:

```tsx
jest.mock("features/storytelling", () => ({
  useStory: () => mockUseChapterData(),
}));
```

and inside the `features/campaign-entities` mock:

```tsx
  useNPCs: () => mockUseNPCData(),
  useQuests: () => mockUseQuests(),
  useLocations: () => mockUseLocationData(),
  useRumors: () => mockUseRumorData(),
```

Update the strategy comment at line 16 to name the new collaborators.

The `mockUse*` variable names stay as they are — renaming them would churn
every call site for no gain. If the mocked return values key on `loading`
rather than `isLoading`, leave them: SearchContext reads only the arrays.

- [ ] **Step 9: Run the tests to verify they pass**

```bash
npx jest --maxWorkers=2 --testPathPattern="(NPCsPage|NPCDetailPage|SearchContext)"
```

Expected: PASS.

- [ ] **Step 10: Verify the type gate and the build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both clean. The build matters here specifically — this task changes
imports, and webpack resolves them differently from `tsc`.

- [ ] **Step 11: Commit**

```bash
git add src/pages/npcs src/shared/context
git commit -m "fix(npcs): the NPCs page reads the provider it writes through

NPCsPage and NPCDetailPage each held a second, independently fetched copy of
the NPC collection, so a write through the context refreshed the provider's
copy while the page went on rendering the other one. The stance ladder wrote
correctly and showed the old word until a reload.

The shipped patch called onNPCUpdate, a prop declared and never called, which
covered one write path. Reading the provider covers all of them.

SearchContext likewise stops building private chapter, NPC, location and
rumour loaders -- it already read quests from the provider. Its index now
rebuilds when a provider's copy changes, so search results no longer go stale
after an edit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01M6GZgk57MnmDCzpRZFXH9N"
```

---

### Task 5: One `QuestContextValue` (fold-in A)

**Files:**
- Modify: `src/features/campaign-entities/quests/types.ts:65-74`
- Modify: `src/features/campaign-entities/quests/context/QuestContext.tsx:13-36,375-377`
- Modify: `src/pages/quests/QuestsPage.tsx:21,23`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: a single exported `QuestContextValue` with no `loading` alias. `useQuests()` returns `isLoading` only.

**The find:** `QuestContextValue` is declared **twice**. The one the context
actually uses is local and unexported at `QuestContext.tsx:14`. The one the
public barrel exports (`quests/types.ts:65`, re-exported at
`campaign-entities/index.ts:41`) is a stale duplicate missing nine members:
`loading`, `getQuestsByNPC`, `addQuestObjective`, `editQuestObjective`,
`moveQuestObjective`, `markQuestCompleted`, `markQuestFailed`, `refreshQuests`,
`hasRequiredContext`.

Nothing imports it today, so this is a loaded trap rather than a live bug — but
per CLAUDE.md the barrel *is* a feature's contract, and this one lies. It is
also why T046's entry claimed "the other three contexts already expose their
refresh": read from the barrel, quests appears not to.

NPC, Rumor and Location have no such duplication — verified.

- [ ] **Step 1: Replace the stale interface with the real one**

In `src/features/campaign-entities/quests/types.ts`, replace the whole
`QuestContextValue` interface (lines 65-74) with the members the provider
actually supplies. `QuestContextState` already carries `quests`, `isLoading`
and `error`, so those are inherited, not repeated:

```ts
export interface QuestContextValue extends QuestContextState {
  getQuestById: (id: string) => Quest | undefined;
  getQuestsByStatus: (status: QuestStatus) => Quest[];
  getQuestsByLocation: (location: Location) => Quest[];
  getQuestsByNPC: (npcId: string) => Quest[];
  updateQuestStatus: (questId: string, status: QuestStatus) => Promise<void>;
  updateQuestObjective: (questId: string, objectiveId: string, completed: boolean) => Promise<void>;
  addQuestObjective: (questId: string, description: string) => Promise<void>;
  editQuestObjective: (questId: string, objectiveId: string, description: string) => Promise<void>;
  moveQuestObjective: (questId: string, objectiveId: string, direction: 'up' | 'down') => Promise<void>;
  addQuest: (quest: DomainData<Quest>) => Promise<string>;
  updateQuest: (quest: Quest) => Promise<void>;
  deleteQuest: (questId: string) => Promise<void>;
  markQuestCompleted: (questId: string, dateCompleted?: string) => Promise<void>;
  markQuestFailed: (questId: string) => Promise<void>;
  /**
   * Re-read the quest collection.
   *
   * CORRECTED DURING EXECUTION: this is `Promise<void>`, not `Promise<Quest[]>`.
   * `QuestContext.tsx:32-35` wraps `useQuestData().fetchQuests` in an explicit
   * `async (): Promise<void>` callback. The plan asserted `Promise<Quest[]>`
   * on the strength of the NPC case, which has no such wrapper — derive the
   * type from the live file, not from a sibling.
   */
  refreshQuests: () => Promise<void>;
  /** Whether a group and a campaign are both selected. */
  hasRequiredContext: boolean;
}
```

Check the imports at the top of `types.ts`: `Location` and `DomainData` must
both be imported there. Add whichever is missing —
`import { Location } from '../locations/types';` and
`import { DomainData } from 'core/types/common';` — matching how the sibling
entity type files do it.

- [ ] **Step 2: Delete the local duplicate and import the real one**

In `src/features/campaign-entities/quests/context/QuestContext.tsx`, delete
the entire local `interface QuestContextValue { … }` (lines 13-36, including
the `// Context interface` comment above it) and add `QuestContextValue` to
the existing type import on line 3:

```tsx
import { Quest, QuestStatus, QuestContextValue } from '../types';
```

Then annotate the value object at line 375 so the two can never drift again —
this is what would have caught the duplication:

```tsx
  const value: QuestContextValue = {
```

and delete the `loading` alias line from that object:

```tsx
    quests,
    isLoading: loading,
```

- [ ] **Step 3: Update the one consumer of the alias**

`QuestsPage.tsx:21` is the only caller that destructures `loading` from
`useQuests()`; every other caller already uses `isLoading`. Lines 21 and 23
become:

```tsx
  const { quests, isLoading, error } = useQuests();

  const gate = usePageGate("quests", { loading: isLoading, error });
```

- [ ] **Step 4: Verify the type gate**

```bash
npx tsc --noEmit
```

Expected: exit 0. Any error naming a missing member means the real interface
in Step 1 is missing something the provider supplies — add it there rather
than loosening the annotation.

- [ ] **Step 5: Run the quest suites**

```bash
npx jest --maxWorkers=2 --testPathPattern="(QuestContext|QuestsPage|QuestDetailPage|QuestDirectory)"
```

Expected: no failures beyond baseline.

- [ ] **Step 6: Commit**

```bash
git add src/features/campaign-entities/quests src/pages/quests
git commit -m "refactor(quests): one QuestContextValue, and it is the exported one

The interface was declared twice: a local, accurate one in QuestContext.tsx
and a stale exported duplicate in types.ts missing nine members, including
refreshQuests and hasRequiredContext. The barrel published the wrong one --
which is why the backlog recorded quests as already exposing a refresh.

The value object is now annotated with the exported type, so the two cannot
drift again. The 'loading' alias goes with it: QuestsPage was its only caller
and every other consumer already used isLoading.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01M6GZgk57MnmDCzpRZFXH9N"
```

---

### Task 6: Stop logging user profiles (T003)

**Files:**
- Modify: `src/features/user-management/auth/context/FirebaseContext.tsx` (17 calls)
- Modify: `src/features/user-management/groups/hooks/useGroups.ts` (4 calls)
- Modify: `src/features/user-management/groups/hooks/useCampaigns.ts` (2 calls)
- Modify: `src/features/collaboration/notes/context/NoteContext.tsx` (7 calls)
- Test: `src/features/user-management/__tests__/no-console-logging.test.ts` (create)

**Interfaces:**
- Consumes: nothing
- Produces: nothing

Thirty `console.log` calls print user ids, loaded profile objects, group
profiles and campaign counts on every auth state change, in production.
**Delete the lines. Do not gate them behind a dev check.** `console.error`
and `console.warn` stay everywhere — only `console.log` goes.

No existing test asserts on any of them; only `console.error` is ever spied on
in this suite. Verified.

- [ ] **Step 1: Write the failing test**

Create `src/features/user-management/__tests__/no-console-logging.test.ts`.
`css-class-manifest.test.ts` is the precedent for a tree-walking test here.

```ts
// src/features/user-management/__tests__/no-console-logging.test.ts
import * as fs from "fs";
import * as path from "path";

/**
 * Auth and note code must not print to the console in production.
 *
 * These files handled user ids, loaded profile objects, group profiles and
 * campaign counts, and logged them on every auth state change -- noise at
 * best, profile data in a stranger's browser console at worst (T003).
 *
 * The rule is stated once, here, so the calls cannot grow back one debugging
 * session at a time. `console.error` and `console.warn` are untouched: a
 * failure someone needs to see is not this.
 */

const SOURCE_ROOTS = [
  path.join(__dirname, "..", "..", "user-management"),
  path.join(__dirname, "..", "..", "collaboration", "notes", "context"),
];

/** Every .ts/.tsx file under `dir`, excluding test files and __tests__ dirs. */
const sourceFilesUnder = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceFilesUnder(full);
    }
    if (!/\.tsx?$/.test(entry.name)) return [];
    if (/\.test\.tsx?$/.test(entry.name)) return [];
    return [full];
  });
};

describe("no console.log in auth and note code", () => {
  const offenders: string[] = [];

  beforeAll(() => {
    for (const root of SOURCE_ROOTS) {
      for (const file of sourceFilesUnder(root)) {
        const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
        lines.forEach((line, index) => {
          // Skip commented-out lines; a comment ships nothing.
          if (/^\s*(\/\/|\*)/.test(line)) return;
          if (/\bconsole\s*\.\s*log\s*\(/.test(line)) {
            offenders.push(`${path.relative(process.cwd(), file)}:${index + 1}`);
          }
        });
      }
    }
  });

  test("ships no console.log calls", () => {
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="no-console-logging"
```

Expected: FAIL, listing 30 `file:line` entries — 17 in `FirebaseContext.tsx`,
4 in `useGroups.ts`, 2 in `useCampaigns.ts`, 7 in `NoteContext.tsx`.

If the count differs, the tree changed since this plan was written. Delete
what the test actually reports; do not delete by line number.

- [ ] **Step 3: Delete the calls**

Work from the list the failing test printed. For each entry, delete the whole
statement — including any continuation lines of a multi-line call.

Three judgement calls while deleting:

1. Where a `console.log` is the **only** statement in an `if` block, delete the
   `if` too. An empty branch is worse than no branch.
2. Where deleting leaves a comment describing only the logging, delete the
   comment with it.
3. Where a variable exists **only** to be logged, delete it as well — `tsc` will
   not complain (it is not `noUnusedLocals`) but ESLint may, and it is dead
   either way.

Do not reformat surrounding code, and do not touch `console.error`.

- [ ] **Step 4: Run it to verify it passes**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="no-console-logging"
```

Expected: PASS.

- [ ] **Step 5: Verify nothing depended on the deletions**

```bash
npx tsc --noEmit && npx jest --maxWorkers=2 --testPathPattern="(FirebaseContext|useGroups|useCampaigns|NoteContext)"
```

Expected: type gate clean, no failures beyond baseline.

- [ ] **Step 6: Commit**

```bash
git add src/features/user-management src/features/collaboration
git commit -m "chore(logging): stop printing user profiles to the console

Thirty console.log calls printed user ids, loaded profile objects, group
profiles and campaign counts on every auth state change, in production --
noise at best, profile data in a browser console at worst.

A tree-walking test now states the rule once, so they cannot grow back one
debugging session at a time. console.error and console.warn are untouched.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01M6GZgk57MnmDCzpRZFXH9N"
```

---

### Task 7: Full verification and a browser pass

**Files:**
- Modify: none

**Interfaces:**
- Consumes: every earlier task
- Produces: the evidence the PR description cites

Both defects in this PR were found in Chrome and neither is visible in jsdom —
the suites mock the data hooks, so a second loader is invisible to them. The
browser pass is not optional.

- [ ] **Step 1: Run all three gates**

```bash
npx tsc --noEmit
npx jest --silent 2>&1 | tail -15
npm run build
```

Expected, reconciling exactly against the Task 0 baseline of 258 suites /
5124 tests:

| | Suites | Tests |
|---|---|---|
| Baseline | 258 | 5124 |
| Task 1 — `autoFetch` cases (existing suite) | — | +6 |
| Task 2 — `provider-fetch-counts` (new suite) | +1 | +5 |
| Task 2 addendum — sign-out guard, one per read hook | — | +5 |
| Task 4 — NPCsPage data-ownership cases (existing suite) | — | +2 |
| Task 6 — `no-console-logging` (new suite) | +1 | +1 |
| **Expected** | **260** | **5143** |

The Task 2 addendum row is scope added during execution — see
`task-2-addendum.md` in the SDD workspace and the spec's "The loader this audit
missed". If an implementer added more than one case per hook, reconcile upward
rather than treating the surplus as a discrepancy.

with `0 failed, 2 skipped`, and `npm run build` succeeding.

If the totals do not reconcile, run the differing suites alone and account for
the delta before continuing. Do not average it away.

- [ ] **Step 2: Start the app**

```powershell
.\scripts\start-dev.ps1 -Action start
```

If it reports "Firebase emulators failed to start within 45 seconds", check
ports 4000/5001/8080/9099 before retrying — the readiness probe times out more
often than the emulators fail.

- [ ] **Step 3: Verify the original symptom is gone**

On `/npcs`, change an NPC's stance on the ladder. The word must update in
place, with no reload. Then exercise a **different** write path in the same
directory — this is the point of fixing the class rather than the symptom.

- [ ] **Step 4: Verify search still works**

Open the command palette and search a term matching a chapter, an NPC, a
location, a quest, a rumour and a note. All six types must still return
results.

Then edit an NPC's name and search for the new name. It must be found without
a reload — this is the index-rebuild improvement the SearchContext swap brings,
and it is the one behaviour change in this PR.

- [ ] **Step 5: Confirm the console is quiet**

With devtools open, sign out and sign back in. No user ids, profile objects or
campaign counts in the console.

- [ ] **Step 6: Update the backlog**

In `TODO.md`, mark T003, T023 and T046 done with today's date, and correct the
two stale facts recorded in the spec:

- T023 names `pages/npcs/NPCsEditPage.tsx` as an independent loader. That file
  does not exist; remove it from the entry.
- T046 says "the other three contexts already expose their refresh". Only
  `LocationContextValue` did. Record why the claim was wrong — the barrel
  exported a stale duplicate `QuestContextValue` that omitted `refreshQuests`
  — because that is the reusable lesson, not the correction.

Note in T023 that `SearchContext` is now included, and that T029's
`console.log` overlap was taken here while the rest of T029 remains open.

- [ ] **Step 7: Correct the CLAUDE.md baseline**

CLAUDE.md's "Current State" section records `4715 passed / 4717 total across
235 suites`. That was measured on a branch that has since merged and is stale
by 23 suites and 407 tests — exactly the drift its own "measure it, don't carry
one forward" rule exists to catch.

Replace it with the figure from Step 1, stating the date and this branch, and
keep the existing note about reconciling a disagreeing run.

Also correct the coverage line if `npm run test:coverage` has drifted; if you
do not run coverage, leave that line alone rather than guessing.

- [ ] **Step 8: Commit and open the PR**

```bash
git add TODO.md CLAUDE.md
git commit -m "docs: close T003, T023 and T046, and re-measure the test baseline

Corrects two stale facts along the way: NPCsEditPage.tsx no longer exists,
and only LocationContextValue exposed a refresh -- quests only appeared to
because the barrel published a stale duplicate of its context type.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01M6GZgk57MnmDCzpRZFXH9N"
git push -u origin fix/entity-loader-consolidation
```

Open the PR against `main`. The description must state the measured
before/after fetch counts, the SearchContext index-rebuild behaviour change,
and the three gates' results. End it with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01M6GZgk57MnmDCzpRZFXH9N
```

**Do not merge.** Merging to `main` deploys live.
