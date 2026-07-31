# Bug #1412 — The NPC directory groups by raw location id, showing slugs as headings

## Title
`NPCDirectory` groups NPCs on `npc.location` verbatim and renders that string as the section
heading, so users see `mines-of-moria` where the Locations page shows "Mines of Moria".

## Status
🔍 DISCOVERED — 2026-07-29. Seen in the running app, confirmed in code.

## Category
UI

## Discovered In
Driving the running dev server in Chrome, 2026-07-29.

## Affected File
`src/features/campaign-entities/npcs/components/NPCDirectory.tsx:147`

> **Line reference updated 2026-07-31.** Was `:122-126` when filed. `NPCDirectory` was rewritten as
> a roster on branch `design-handoff/dashboard-1a`, which moved the grouping and changed the fallback
> string from `'Unknown Location'` to `'Location unknown'`. Two claims below are now partly stale and
> are corrected inline: the location **filter dropdown no longer exists** (grouping replaced it), so
> the raw value now feeds only the group heading and the `/locations?highlight=` link. **The defect
> itself is unchanged and still open** — the rewrite carried the verbatim `npc.location` grouping
> through without adding a lookup.

## Description

```tsx
// Group NPCs by location for display
const location = npc.location || 'Location unknown';
if (!acc[location]) { … }
```

`npc.location` holds a location **id** (a slug). It is used as the grouping key *and* rendered
directly as the section heading, with no lookup against the locations collection.

Observed side by side in the running app with the sample data:

| NPCs page heading | Locations page name |
|---|---|
| `rivendell` | Rivendell |
| `mines-of-moria` | Mines of Moria |
| `the-shire` | The Shire |
| `lothlorien` | *(no such location exists)* |

The `'Unknown Location'` fallback for NPCs with no location works correctly and reads well — which
makes the contrast sharper, since every other heading on the page is a raw slug.

The same raw value also feeds the location filter dropdown (`:93-95`) and the click-through to
`/locations?highlight=…` (`:67-69`), so the fix should resolve names in one place rather than at each
use site.

Note `lothlorien` appears as a heading although no such location document exists — sample-data
inconsistency rather than a code defect, but it shows the grouping key is never validated against
real locations.

## Reproduction

1. Sign in, select a group and campaign with NPCs that have locations set.
2. Open **NPCs**.
3. Section headings read `mines-of-moria`, `the-shire`, `rivendell`.
4. Open **Locations** — the same places render as "Mines of Moria", "The Shire", "Rivendell".

## Expected vs Actual

**Expected**: headings show the location's display name, as everywhere else in the app.
**Actual**: they show the slug id.

## Recommended Fix

Resolve `npc.location` against the locations collection (via `useLocations()`) and render the
matching location's `name`, falling back to the raw value when no location matches — which also makes
cases like `lothlorien` visible rather than silently looking like a real heading.

Do **not** "fix" this by prettifying the slug (title-casing and replacing hyphens). That would
produce "Lothlorien" for a location that does not exist and would silently diverge from the real
name whenever a location is renamed — the same broken `id === slugify(name)` assumption already
catalogued in [#303](./303-location-parent-id-rederived-from-editable-name.md) and
[#009](./009-location-id-generation-collision.md).
