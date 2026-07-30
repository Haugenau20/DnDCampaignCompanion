# Bug #1404 — The campaign Edit button does nothing

## Title
`CampaignManagementView` renders an Edit button per campaign with no `onClick` handler at all.

## Status
🔍 DISCOVERED — 2026-07-29.

## Category
UI

## Discovered In
Code reading during the 2026-07-29 session, while investigating
[#1403](./1403-campaign-delete-confirmed-but-never-performed.md) in the same file.

## Affected File
`src/features/user-management/admin/components/CampaignManagementView.tsx:225-231`

## Description

```tsx
<Button
  variant="ghost"
  size="sm"
  startIcon={<Edit size={16} />}
>
  Edit
</Button>
```

No `onClick`, no `type`, no disabled state, no tooltip. The button renders, is focusable, responds to
clicks with the normal ripple/hover affordances, and does nothing.

`CampaignService.updateCampaign` **already exists** and works
(`CampaignService.ts:141-166`), so the service layer is not the gap — only the wiring is. There is
also no edit dialog in this component to open; only the create dialog and the delete confirmation
exist.

This is the third instance of the same failure mode in this session's findings
([#1400](./1400-npc-forms-swallow-write-failures-silently.md),
[#1403](./1403-campaign-delete-confirmed-but-never-performed.md)): an affordance that looks live and
silently does nothing.

## Reproduction

1. Sign in as a group admin, open Admin → Campaigns.
2. Click **Edit** on any campaign.
3. Nothing happens — no dialog, no navigation, no error, no console output.

## Expected vs Actual

**Expected**: either an edit dialog opens (prefilled with name and description, saving through
`updateCampaign`), or the button is not rendered.

**Actual**: a live-looking button that is inert.

## Recommended Fix

Two defensible options; this is a **product** call rather than a technical one:

1. **Implement it.** Add an edit dialog mirroring the existing create dialog, wired to
   `CampaignService.updateCampaign` via `useCampaigns`. The service method already exists, so the work
   is a dialog plus state — comparable in size to the create form directly above it.
2. **Remove the button** until someone wants campaign renaming. Honest, and smaller.

Do **not** leave it as-is. Whichever is chosen, an inert button that looks operable is the worst of
the three states.

Not bundled into #1403's fix: that change is about a destructive operation with data-integrity
consequences, and mixing a UI feature into it would blur the review.
