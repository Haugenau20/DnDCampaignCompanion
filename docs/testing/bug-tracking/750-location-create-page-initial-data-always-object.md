# Bug #750 — LocationCreatePage always passes an object to LocationCreateForm.initialData

## Title
LocationCreatePage always passes an object (never `undefined`) to `LocationCreateForm.initialData`, while NPC, Quest, and Rumor create pages conditionally pass `undefined`

## Status
✅ FIXED (2026-07-28) — landed under explicit authorization to correct the characterization test, see
Resolution below.

## Category
DATA / UI

## Discovered In
`src/pages/locations/__tests__/LocationCreatePage.test.tsx`

## Affected File
`src/pages/locations/LocationCreatePage.tsx`

## Description
`LocationCreatePage` spreads the `initialData` object unconditionally and always passes an object to `LocationCreateForm`:

```tsx
// LocationCreatePage.tsx — line 57–59
<LocationCreateForm
  initialData={{ ...initialData, noteId, entityId }}  // always an object
  ...
```

When `location.state` is empty (a plain new-creation flow), `initialData` is `undefined` and the spread `{ ...undefined, noteId: undefined, entityId: undefined }` produces `{}` — an empty object.

In contrast, `NPCsCreatePage`, `QuestCreatePage`, and `RumorCreatePage` all use the conditional pattern:

```tsx
const formInitialData = initialData ? { ...initialData, noteId, entityId } : undefined;
```

This means `LocationCreateForm` always receives an object (even an empty one), whereas all other create form components receive `undefined` on a clean create flow.

Depending on how `LocationCreateForm` handles its `initialData` prop, this could cause:
- Pre-populated form fields with empty/undefined values
- Unnecessary object merging on form initialization
- Different behavior when `initialData` has properties vs when it is absent

## Reproduction
1. Navigate to `/locations/create` without any navigation state
2. `LocationCreatePage` renders `LocationCreateForm` with `initialData={{ noteId: undefined, entityId: undefined }}`
3. Compare: navigating to `/npcs/create` without state passes `initialData={undefined}` to `NPCForm`

## Expected vs Actual
**Expected**: `LocationCreatePage` should follow the same conditional pattern as `NPCsCreatePage`, `QuestCreatePage`, and `RumorCreatePage`, passing `undefined` when no `initialData` is in the navigation state.

**Actual**: `LocationCreatePage` always passes an object to `LocationCreateForm`, which may cause subtle differences in form initialization behavior.

## Recommended Fix
Apply the same conditional pattern used by the other create pages:

```tsx
// LocationCreatePage.tsx
const formInitialData = initialData
  ? { ...initialData, noteId, entityId }
  : { noteId, entityId };  // or undefined if LocationCreateForm handles undefined

<LocationCreateForm
  initialData={formInitialData}
  onSuccess={handleSuccess}
  onCancel={handleCancel}
/>
```

Review `LocationCreateForm`'s prop type for `initialData` to determine the correct fix.

## Resolution Attempt (2026-07-28) — BLOCKED by a characterization test

Applied exactly the recommended fix (matching `NPCsCreatePage.tsx`, `RumorCreatePage.tsx`,
`QuestCreatePage.tsx`'s `const formInitialData = initialData ? {...} : undefined;` pattern) and ran
`src/pages/locations/__tests__/LocationCreatePage.test.tsx` to prove it. One test in that file —
`initialData derivation > "always passes an object (possibly with undefined fields) when no state"`
(around line 150) — is a **characterization test**: it asserts the current buggy behavior directly,
right down to a comment reading "The component spreads `{ ...initialData, noteId, entityId }`
unconditionally so the form always receives an object (not undefined)". With the fix applied, that
test throws `SyntaxError: Unexpected end of JSON input` — `formInitialData` becomes `undefined`, the
test's mock renders `{JSON.stringify(props.initialData)}` (which is the JS value `undefined`, not a
string, so React renders nothing), and the test's own `JSON.parse(raw)` on the resulting empty
string blows up. This is exactly the "test that asserts the buggy behaviour" case this project's
process explicitly forbids editing without explicit user authorization (see the sibling test in the
same file, "spreads initialData and attaches noteId and entityId", which is the one that correctly
covers the non-buggy path and continues to pass either way).

Per project process, the production fix was **reverted** (`git checkout --
src/pages/locations/LocationCreatePage.tsx`) and this bug is left **unfixed**. The fix itself is
correct and matches the sibling create pages exactly — landing it only requires updating or removing
the one characterization test, which needs explicit sign-off from a human maintainer, not an agent
acting alone.

**Verification of the block**: `npx jest --testTimeout=5000 --maxWorkers=1
--testPathPattern="LocationCreatePage"` — with the fix applied: 1 failed / 10 passed / 11 total
(the characterization test above). With the fix reverted: 11/11 passed (original baseline for this
file).

## Resolution (2026-07-28) — authorized, landed

Explicit authorization was granted on 2026-07-28, on the same terms as bugs #005 and #006, to correct
the one named characterization test (`initialData derivation > "always passes an object (possibly
with undefined fields) when no state"`) in the same change as the production fix. Before touching
anything, re-ran the file to confirm the test genuinely exercises the fixed code path rather than
dying on an environment error (this project has a history of that — see the `crypto.randomUUID`
note for #013/#014/#300): with the fix applied it produced

```
SyntaxError: Unexpected end of JSON input
    at JSON.parse (<anonymous>)
```

at the `JSON.parse(raw)` line — a real assertion-path failure, not an environment crash: the mock
renders `{JSON.stringify(props.initialData)}`, and `JSON.stringify(undefined)` is the JS value
`undefined` (not a string), so React renders no text; the test's own `JSON.parse('')` on that empty
string is what throws. This confirmed the test does execute the real component behavior and only
fails because it was written to assert the bug.

**Production fix applied** (`src/pages/locations/LocationCreatePage.tsx`), matching
`NPCsCreatePage.tsx` / `QuestCreatePage.tsx` / `RumorCreatePage.tsx` exactly:

```tsx
// Prepare initial data for LocationCreateForm
const formInitialData = initialData ? {
  ...initialData,
  noteId,
  entityId
} : undefined;
...
<LocationCreateForm
  initialData={formInitialData}
  onSuccess={handleSuccess}
  onCancel={handleCancel}
/>
```

**Characterization test corrected** (`src/pages/locations/__tests__/LocationCreatePage.test.tsx`),
diff of the one authorized test:

```diff
-  // -------------------------------------------------------------------------
-  // initialData derivation
-  // Bug note: LocationCreatePage always passes an object (never undefined) —
-  // even with empty state it passes `{ noteId: undefined, entityId: undefined }`
-  // This differs from NPC/Quest/Rumor CreatePages which conditionally pass initialData.
-  // See bug #750 for details.
-  // -------------------------------------------------------------------------
+  // -------------------------------------------------------------------------
+  // initialData derivation
+  // Bug #750 was fixed and this characterization test corrected under
+  // explicit authorization on 2026-07-28 (same terms as #005/#006): it used
+  // to assert the buggy behavior (always passing an object, never undefined)
+  // by name. LocationCreatePage now matches NPCsCreatePage / QuestCreatePage
+  // / RumorCreatePage's `initialData ? {...} : undefined` pattern.
+  // -------------------------------------------------------------------------
   describe("initialData derivation", () => {
-    it("always passes an object (possibly with undefined fields) when no state", () => {
+    it("passes undefined initialData when no state is present (matches NPC/Quest/Rumor CreatePages)", () => {
       mockLocationState = {};
       renderPage();
-      const raw = screen.getByTestId("location-form-initial-data").textContent!;
-      // The component spreads `{ ...initialData, noteId, entityId }` unconditionally
-      // so the form always receives an object (not undefined)
-      const parsed = JSON.parse(raw);
-      expect(typeof parsed).toBe("object");
+      const raw = screen.getByTestId("location-form-initial-data").textContent;
+      // Fixed behavior: with no location.state, formInitialData is undefined,
+      // so LocationCreateForm receives undefined rather than `{}`. The mock
+      // renders `{JSON.stringify(props.initialData)}`, and JSON.stringify(undefined)
+      // is the value `undefined` (not a string), so React renders no text at all —
+      // hence asserting emptiness here rather than JSON.parse-ing it.
+      expect(raw).toBe("");
     });
```

The sibling test (`"spreads initialData and attaches noteId and entityId"`) was left untouched — it
already covered the non-buggy path and passes either way. No other test in the file was modified.

**Proof by revert**: reverted only the production file (`git checkout --
src/pages/locations/LocationCreatePage.tsx`) with the corrected test in place, re-ran
`npx jest --testTimeout=10000 --maxWorkers=1 --testPathPattern="LocationCreatePage"`. The corrected
test failed:

```
expect(received).toBe(expected) // Object.is equality
Expected: ""
Received: "{}"
```

10 passed / 1 failed / 11 total with the bug present. Restored the fix; re-ran the same command:
11 passed / 11 total.
