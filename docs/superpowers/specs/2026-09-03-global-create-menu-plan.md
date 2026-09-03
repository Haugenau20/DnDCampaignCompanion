# PR 7 — Global create menu: implementation plan

Branch: `redesign/global-create-menu` (off `main` @ eda8b9e)

## Context that changes the brief

PR 6 landed on `main` and shipped `src/shared/hooks/useCreateActions.ts` — the single create
list, already consumed by `CommandPalette`. The brief's `src/shared/components/create-actions.ts`
is therefore **not created**; we extend the existing hook instead. This is the brief's own
"if PR 6 lands first, import its `create-actions.ts`" branch.

`usePopoverKeys` supplies Escape, ArrowUp/Down, Home/End, a Tab trap, focus-into-first-row on
open and focus-return-to-trigger on Escape. It does **not** supply click-outside; that is an
inline `mousedown` effect in `ContextSwitcher` and must be repeated here.

`core/components/Button` is a plain `React.FC` with no `forwardRef`, so it cannot carry the
`triggerRef` that `usePopoverKeys` needs. The trigger is a bare `<button>` with the
`button-primary` theme class, exactly as `ContextTrigger` and `UserMenuTrigger` already are.

## The contract, fixed up front

Both batch-2 tasks build against this. Do not renegotiate it inside a task.

### `CreateAction` (extended)

```ts
export interface CreateAction {
  id: string;
  entityLabel: string;
  icon: LucideIcon;
  /** The section this entity lives in, e.g. "/quests". Picks the contextual row. */
  sectionPath: string;
  /** Single-letter shortcut, active only while the create menu is open. */
  shortcut: string;
  run: () => void | Promise<void>;
}
```

### The list, in display order (no `flex-col-reverse` anywhere)

| id | entityLabel | icon | sectionPath | shortcut | run |
|---|---|---|---|---|---|
| `note` | Note | `FileText` | `/notes` | `N` | `createAndOpen()` |
| `chapter` | Chapter | `BookOpen` | `/story` | `C` | `navigateToPage("/story/chapters/create")` |
| `npc` | NPC | `User` | `/npcs` | `P` | `navigateToPage("/npcs/create")` |
| `location` | Location | `MapPin` | `/locations` | `L` | `navigateToPage("/locations/create")` |
| `rumor` | Rumor | `MessageSquare` | `/rumors` | `R` | `navigateToPage("/rumors/create")` |
| `quest` | Quest | `Scroll` | `/quests` | `Q` | `navigateToPage("/quests/create")` |

### `CreateMenuCard` props

```ts
interface CreateMenuCardProps {
  actions: CreateAction[];        // full list, display order
  promotedId: string;             // the one action rendered as the accent row
  isOnPromotedSection: boolean;   // true => render the "you're here" marker
  campaignName: string;           // header row: ADD TO {CAMPAIGN}
  creditedName: string;           // footer: Credited to {creditedName} · esc to close
  onSelect: (action: CreateAction) => void;
}
// forwardRef<HTMLDivElement, CreateMenuCardProps>
```

## Task 1 — `useCreateActions` (batch 1, agent A)

Files: `src/shared/hooks/useCreateActions.ts`, `src/shared/hooks/__tests__/useCreateActions.test.tsx`

- Add `sectionPath` and `shortcut` to `CreateAction` and to all six entries.
- Reorder the array to the display order in the table above.
- Rewrite the JSDoc: the order is now literal display order for both surfaces. Delete the
  "the button lays them out with `flex-col-reverse`" sentence — it becomes false in task 4.
- Update the two order assertions in the test; add one asserting `shortcut` letters are unique
  and one asserting every entry has a `sectionPath`.
- `CommandPalette` needs no change: it maps the array as-is and its tests mock the hook.

## Task 2 — Footer overlap (batch 1, agent B)

Files: `src/app/layout/Footer.tsx`, `src/app/layout/__tests__/Footer.test.tsx`

The button is `fixed bottom-6` and 48px tall, so at scroll-end it occupies the 24–72px band
above the viewport floor — which is where the footer's centred link row sits. Reserve that
band in the footer rather than moving the button: `className="p-4 pb-20 footer"`, with a
comment saying what the reserve is for and that it must stay >= 72px if the trigger's size or
offset changes. Add a test asserting the reserve is present.

Chosen over an `IntersectionObserver` lift because jsdom has no `IntersectionObserver`
polyfill in this repo, and over a right-hand gutter because the footer row is centred and
wraps at narrow widths. Cost: ~64px of dead space at the end of every page, including for
signed-out users who get no button.

## Task 3 — `CreateMenuCard` (batch 2, agent D)

Files: `src/shared/components/create-menu/CreateMenuCard.tsx` (new),
`src/shared/components/create-menu/__tests__/CreateMenuCard.test.tsx` (new)

Presentational only — no popover state, no keyboard handling, no data hooks. `forwardRef` so
the owner can hand its ref to `usePopoverKeys`.

Structure, top to bottom:

1. Root: `role="menu"`, `aria-label="Create"`, `className="dropdown w-72 rounded-md shadow-lg overflow-hidden"`.
   `w-72` is the 288px from the mock.
2. Header row: `ADD TO {campaignName}` as a `Typography variant="caption" color="muted"`
   with `uppercase tracking-wide`, and a right-aligned `⌘K` hint pointing at the palette.
3. Promoted row: `role="menuitem"` `<button>`, `button-primary`, icon + `New {entityLabel}`,
   and — only when `isOnPromotedSection` — a right-aligned `you're here` marker.
4. `<hr aria-hidden="true" className="card-divider" />`.
5. The remaining five rows: `role="menuitem"` `<button>`, `dropdown-item`, icon + the bare
   noun (`Note`, not `New Note`), with the `shortcut` letter right-aligned in muted text.
6. `<hr>` then the footer line: `Credited to {creditedName} · esc to close`, muted.

Copy note: the mock reads `New quest`; we render `New {entityLabel}` (so `New Quest`,
`New NPC`) because lowercasing would turn the NPC acronym into `New npc`.

Colour comes from theme classes only — `button-primary`, `dropdown`, `dropdown-item`,
`card-divider`, `Typography color="muted"`. No hardcoded colours, no `bg-blue-*`.

## Task 4 — `GlobalActionButton` (batch 2, agent C)

Files: `src/shared/components/GlobalActionButton.tsx`,
`src/shared/components/__tests__/GlobalActionButton.test.tsx` (rewrite)

`Layout.tsx` is **not** touched — the component gates itself, so `Layout` stays dumb and its
existing test (which mocks this component) stays valid.

- Gate: `const { hasRequiredContext } = useCampaignContextStatus();` — return `null` unless
  true. It already means "resolved, and both a group and a campaign are selected", and it
  does not flash during auth restore.
- Contextual promotion: `useLocation().pathname` matched against each action's `sectionPath`
  with `isParentPath` from `shared/utils/navigation`; fall back to the `note` action when
  nothing matches. `isOnPromotedSection` is whether a match was actually found.
- Identity: `campaignName` from `useCampaigns().activeCampaign?.name`; `creditedName` from
  `useGroups().activeGroupUserProfile` as `activeCharacter?.name ?? username ?? "you"` — the
  same derivation `UserMenuTrigger` uses.
- Popover: `isOpen` state, `panelRef` + `triggerRef`, `usePopoverKeys({...})`, plus a
  `mousedown` click-outside effect on the wrapper ref (copy `ContextSwitcher`'s).
- Letter shortcuts: a `keydown` effect active **only while open**, ignoring events with
  `metaKey`/`ctrlKey`/`altKey` and events originating in an input, matching `action.shortcut`
  case-insensitively, then running and closing.
- Trigger: bare `<button ref={triggerRef}>`, `w-12 h-12 rounded-full button-primary shadow-lg
  flex items-center justify-center`, `aria-haspopup="menu"`, `aria-expanded={isOpen}`,
  `aria-label={isOpen ? "Close create menu" : "Create content"}`. One `<Plus>` icon,
  `transition-transform duration-200`, `rotate-45` when open. **No icon swap** — the old
  `rotate-90` + Plus/X swap animated nothing visible and read as a flicker.
- Card mount: `absolute right-0 bottom-full mb-3`, rendered only when `isOpen`.
- Selection: keep the existing fire-and-forget `action.run(); setIsOpen(false);` and keep the
  long comment explaining why it is not awaited. Awaiting defers the close for every action.

Tests to cover: signed-out / no-campaign renders nothing; gated render shows the trigger;
opening shows exactly one `button-primary` row and it matches the current route; rows are
nouns with shortcut letters; the campaign and credited names appear; Escape closes and
returns focus; click-outside closes; arrow keys move; a letter shortcut runs its action;
the trigger is 48px and rotates 45°.

## Verification (orchestrator, after batch 2)

`npx tsc --noEmit`, `npm test`, `npm run build`. Baseline to beat: 230 suites / 4675 tests,
0 failed / 2 skipped. Any red is a regression.
