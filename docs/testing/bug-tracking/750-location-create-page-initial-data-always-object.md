# Bug #750 — LocationCreatePage always passes an object to LocationCreateForm.initialData

## Title
LocationCreatePage always passes an object (never `undefined`) to `LocationCreateForm.initialData`, while NPC, Quest, and Rumor create pages conditionally pass `undefined`

## Status
🔍 DISCOVERED

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
