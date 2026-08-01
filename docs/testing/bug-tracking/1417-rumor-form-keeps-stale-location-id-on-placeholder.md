# Bug #1417 — `RumorForm` keeps a stale `locationId` when the location is cleared

## Status
✅ FIXED — 2026-08-01, commit `d6d9847`.

## Category
Data integrity

## Discovered In
Verifying `RumorForm` while implementing the `locationId` contract. The brief said the form was
"already correct in shape — change it only if it is actually wrong". It was wrong.

## Affected File
`src/features/campaign-entities/rumors/components/RumorForm.tsx:135-143`

## Description

`RumorForm` is the one entity form that always modelled location correctly: an id-keyed `<select>`
writing both `locationId` and `location` on selection. But `handleLocationSelect` was:

```tsx
const handleLocationSelect = (locationId: string) => {
  const selectedLocation = locations.find(loc => loc.id === locationId);
  if (selectedLocation) {
    setFormData(prev => ({ ...prev, locationId, location: selectedLocation.name }));
  }
};
```

The `<select>`'s placeholder option ("Select a location") carries `value=''`. Choosing it calls this
with `''`, the lookup finds nothing, the `if` fails, and the function **returns without touching
state**. Whatever was previously selected stays in `formData` and is submitted.

So a user who picks Rivendell, changes their mind, and selects the blank placeholder gets a rumor
saved with `locationId: 'rivendell'` and `location: 'Rivendell'` — while the control they are looking
at reads blank. The form shows one thing and saves another.

This is exactly the stale-reference failure the `location`/`locationId` contract exists to prevent,
and it predates that contract.

## Reproduction

1. Open **Rumors → Add Rumor**.
2. Select any location from the location dropdown.
3. Select the blank "Select a location" placeholder.
4. Save. The rumor is filed under the location chosen in step 2.

## Expected vs Actual

**Expected**: clearing the selection clears the stored location.
**Actual**: the previous selection is silently retained.

## Fix

Short-circuit on an empty id and clear **both** fields:

```tsx
if (!locationId) {
  setFormData(prev => ({ ...prev, locationId: '', location: '' }));
  return;
}
```

Three tests added under `describe('location selection')` in `RumorForm.test.tsx`, including the
switch-back-to-placeholder regression and an un-migrated rumor (`location` set, no `locationId`)
loading and submitting without inventing an id.

## Notes

Worth remembering as a review lesson: the instruction was "verify, and leave it alone if it is
already right". Shape-level correctness — the right two fields, written together, from an id-keyed
control — hid a control-flow bug one branch down.
