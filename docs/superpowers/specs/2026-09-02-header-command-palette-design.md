# Header command palette — design

**Date:** 2026-09-02
**Branch:** `redesign/header-command-palette` (off `main` at `cebc1dc`)
**PR:** 6 of the redesign series. Design reference: screenshot `8a`.
**Depends on:** PR 5 (`fix/search-index-and-relevance`), merged at `cebc1dc`.

This document does not restate the PR description, which is the spec. It records the four
decisions the spec leaves open, the two places where the spec asks for something the code
cannot currently supply, and the one instruction in the spec that must be disobeyed.

---

## 1. What is actually wrong today

Everything the spec asserts checks out. The header wrapper is
`flex-1 min-w-0 max-w-xs ml-auto px-1` (`Header.tsx:93`) — capped at 320px with no floor,
and the only yielding element in a bar that also carries a logo, a campaign chip, seven
nav items and an account chip. The two dead `max-w-2xl` classes are real
(`SearchBar.tsx:195,202`): a 672px intent, overridden by a 320px parent.

The panel is `absolute z-50 w-full` (`SearchBar.tsx:245`), so the surface needing the most
width inherits the width of the element with the least, and a 50-character-either-side
snippet is `line-clamp-1`'d into it (`SearchBar.tsx:185`).

The three a11y defects are as described: `aria-activedescendant` points at `result-${i}`
(`SearchBar.tsx:216`) and **no element in the file carries that id** — the rows are keyed
`${result.type}-${result.id}` and given no `id` at all; `role="combobox"` sits on a wrapper
`div` (`SearchBar.tsx:198`) two levels above the input it should be on; and closing depends
on `onBlur={() => setTimeout(() => setIsFocused(false), 200)}` (`SearchBar.tsx:214`) racing
the result click.

### 1.1 What PR 5 already supplies

`SearchResult` carries `matches: string[]` and `matchCount: number`
(`core/types/search.ts`), and `createSearchResult` populates both —
`matches` holds **at most one** snippet, `matchCount` the total occurrence count
(`SearchService.ts:188-197`). So the `+N more mentions` affordance needs no service work:
it is `matchCount - 1` where `matchCount > 1`.

`SearchContext` configures `maxResultsPerType: 5` across six types, so the palette renders
at most 30 results and never needs its own cap.

### 1.2 The one thing the spec asks for that the code cannot answer

> "and if the index is still building, a skeleton, never 'no results'."

Nothing exposes that. `SearchContext` builds the index in an effect gated on
`totalDocs === 0`, and holds no state recording whether that has happened. Before the
first collection arrives, an empty `results` array is indistinguishable from a genuine
miss — which is exactly the state the spec wants to stop rendering as "No results".

This is a real gap, not a styling detail, so §5 adds `isIndexReady` to `SearchContext`.
That puts `shared/context/SearchContext.tsx` in scope, beyond the spec's file list.

### 1.3 Group order is a decision the spec does not make

`processResults` sorts **globally by relevance**, tie-broken by title, and only then caps
per type (`SearchService.ts:322-350`). Results therefore arrive interleaved, not grouped.
Grouping them is a presentation step, and the order of the groups is ours to choose. §4.2
chooses.

---

## 2. The instruction that must be disobeyed

> "Reuse `usePopoverKeys`."

`usePopoverKeys` moves **real DOM focus** between `[role="menuitem"]` elements: it calls
`rowsOf()[0]?.focus()` on open, and every arrow key ends in `.focus()`
(`usePopoverKeys.ts:52-88`). Its Tab handler is a focus trap that cycles rows.

The palette's contract is the opposite of all three:

| | `usePopoverKeys` | Palette |
|---|---|---|
| Focus during navigation | moves to the row | **stays in the input** |
| Row role | `menuitem` | `option` |
| How the active row is announced | it holds focus | `aria-activedescendant` |
| Tab | traps focus among rows | **cycles the type filter** |

Reusing it would take focus out of the input on the first `↓`, so typing would stop
working, and would make `aria-activedescendant` meaningless — the line the definition of
done explicitly calls for. The hook also has two live consumers, `ContextSwitcher.tsx:64`
and `UserMenu.tsx:41`, whose behaviour is correct as-is.

**Decision: leave `usePopoverKeys` untouched and write `useCommandPaletteKeys` for virtual
focus.** The reuse the spec was reaching for lands elsewhere and genuinely fits: the
`More ▾` overflow menu in §6 *is* a popover of `[role="menuitem"]` rows, and calls
`usePopoverKeys` unchanged.

---

## 3. Where the code goes

```
src/shared/hooks/useCreateActions.ts              (new)  §4.1
src/shared/utils/searchPresentation.ts            (new)  §4.2
src/shared/components/command-palette/
    CommandPalette.tsx                            (new)  §5
    SearchTrigger.tsx                             (new)  §5.1
    useCommandPaletteKeys.ts                      (new)  §5.4
src/shared/context/SearchContext.tsx              (edit) §1.2
src/shared/hooks/useSearch.ts                     (edit) §1.2
src/shared/components/GlobalActionButton.tsx      (edit) §4.1
src/app/layout/Navigation.tsx                     (edit) §6
src/app/layout/Header.tsx                         (edit) §7
tailwind.config.js                                (edit) §6.1
src/shared/components/SearchBar.tsx               (delete)
src/shared/components/__tests__/SearchBar.test.tsx (delete)
```

The palette is a **directory**, not the flat `shared/components/CommandPalette.tsx` the
spec names. Three files ship together and only ever serve each other, which is the shape
`context-switcher/` and `user-menu/` already use in this same folder. A deliberate
deviation.

`SearchBar.tsx` is deleted rather than reduced. Its input, dropdown, blur timer and broken
combobox wiring are all replaced; nothing survives to rename. Its 535-line test asserts
that surface throughout, so it is replaced by the palette's own tests rather than edited —
which is also what makes "no `setTimeout` blur hack remains" trivially checkable by grep.

---

## 4. Foundations

### 4.1 One create list

The six create actions are an inline array inside `GlobalActionButton.tsx:37-66`. The
palette needs the same six. Extract to `shared/hooks/useCreateActions.ts`:

```ts
export interface CreateAction {
  /** Stable key, e.g. "npc". */
  id: string;
  /** The entity's display noun, e.g. "NPC". Both call sites build their own copy from it. */
  entityLabel: string;
  /** The icon *component*, not an element — call sites size it themselves. */
  icon: LucideIcon;
  /** Perform the action. May be async (creating a note writes before navigating). */
  run: () => void | Promise<void>;
}

export function useCreateActions(): CreateAction[];
```

`icon` is a component reference rather than the `<FileText className="w-5 h-5" />` element
the current array holds, because the two consumers want different sizes: the FAB renders
`w-5 h-5`, the palette `w-4 h-4` to match its result rows. Storing an element would freeze
one size into the shared source.

`entityLabel` rather than `label` for the same reason: the FAB derives `New ${entityLabel}`
and the palette derives `New ${entityLabel} named "${query}"`. One stored string, two
renderings — the alternative is storing both and letting them drift.

A hook, not a constant, because two of the six need React context: `New Note` calls
`useCreateNote().createAndOpen`, and the other five call `useNavigation().navigateToPage`.

**Array order is preserved exactly** (Note, Location, NPC, Rumor, Quest, Chapter). The FAB
renders it through `flex-col-reverse`, so reordering the source would silently reorder the
button's menu — a visual change to a component whose surface PR 7 owns.

`GlobalActionButton`'s markup, styling and animation are untouched; only the array leaves.

### 4.2 Presentation helpers

`shared/utils/searchPresentation.ts`, pure and React-free:

```ts
export interface SearchGroup {
  type: SearchResultType;
  /** Uppercase plural heading, e.g. "NPCS". */
  label: string;
  results: SearchResult[];
}

export function groupResultsByType(results: SearchResult[]): SearchGroup[];
export function flattenGroups(groups: SearchGroup[]): SearchResult[];
export function splitOnMatch(text: string, query: string): Array<{ text: string; isMatch: boolean }>;
```

**Group order follows relevance, not a fixed list.** Groups are ordered by the position of
their best result in the incoming array, and results within a group keep their incoming
order. PR 5 spent its effort making the global ranking good (`SearchService.ts:322-350`);
a hardcoded `NPCs, Story, Notes, …` order would discard exactly that work, burying an exact
Story title match under a weak fuzzy NPC hit. Screenshot `8a` is consistent with this —
`Droop` leads because it is an exact title match, not because NPCs are pinned first.

Empty groups are dropped, so a type with no hits renders no heading.

`flattenGroups` exists so the `↑↓` index runs in the same order the eye does. Without it,
keyboard order would follow the ungrouped relevance array and the highlight would jump
around the panel.

`splitOnMatch` is a **case-insensitive literal substring** split. Fuzzy subsequence hits
still rank and still appear, but are rendered unhighlighted rather than with scattered
single characters marked — highlighting `d…r…o…p` across a sentence reads as corruption.
When there is no literal match the function returns a single `isMatch: false` segment, so
callers need no special case. It must also handle the empty query (returns the whole text
unmarked) and regex-special characters in the query without throwing.

---

## 5. The palette

State is four values: `query` (from `useSearch`), `typeFilter: SearchResultType | null`,
`selectedIndex: number`, and `isOpen`, owned by `Header` (§7).

Rendered through `createPortal` onto `document.body`, following `Dialog.tsx:192`, over a
scrim of `rgba(15,23,42,.34)`. Panel: 720px, `max-h-[70vh]`, own scroll, top-anchored 34px
below the header. Below `md` it is a full-screen sheet (§7 records why the trigger stays
visible there).

Colour comes from the existing `.search-results`, `.search-result` and
`.search-result-selected` classes (`themes/css/components.css:318-335`) plus `.dropdown`
for the scrim-adjacent chrome. The selected row adds the 3px accent left border from
`--color-accent`. No hardcoded colours; the scrim is the one literal rgba, and it is a
scrim, not a theme surface.

### 5.1 The trigger

`SearchTrigger.tsx` — a `shrink-0` button, ~120px, carrying a magnifier, the word `Search`,
and a key-hint pill reading `⌘K` on Apple platforms and `Ctrl K` elsewhere, chosen from
`navigator.platform`. Below `md` it collapses to a ~36px icon-only button: no label, no
pill, `aria-label="Search"`.

`aria-keyshortcuts="Meta+K Control+K"`. It never grows and never shrinks, and it is not
rendered at all when `!user`.

### 5.2 Rows

Each row: type icon, title with matched term in `<mark>`, one snippet line, and
`+{matchCount - 1} more mentions` on the right when `matchCount > 1`. The snippet is
`result.matches[0]`, also `<mark>`-highlighted, rendered on its own line rather than
`line-clamp-1`'d — at 720px it fits.

Row ids are `cmdk-option-${type}-${id}`, carried on the element with `role="option"`, and
that is the string `aria-activedescendant` holds. Type and id together because ids are only
unique within a collection.

Create commands sit below a rule, rendered from `useCreateActions()` as
`New {entityLabel} named "{query}"`. They are part of the same flattened navigation list,
so `↓` past the last result lands on the first create command.

### 5.3 The four states

| Condition | Renders |
|---|---|
| `!isIndexReady` | skeleton rows |
| `isQueryTooShort` | `Keep typing…` |
| `isSearching` | skeleton rows |
| results empty, query long enough, index ready | `No results in {campaign}` |

Checked in that order — the index test comes first, which is the whole point of §1.2.
`{campaign}` is `useCampaigns().activeCampaign?.name`. The query row's count reads
`{n} results in {campaign}`, singular `1 result in {campaign}`; the footer reads
`Searching {campaign} only`. When there is no active campaign the qualifier is dropped
rather than rendering `in undefined`: `No results`, `4 results`, and the footer's right
half is omitted.

### 5.4 Keyboard

`useCommandPaletteKeys` — virtual focus, per §2:

- `role="combobox"` **on the input**, with `aria-expanded`, `aria-controls` pointing at the
  results list, and `aria-activedescendant` resolving to a live `role="option"` id.
- `↑↓` move `selectedIndex` over `flattenGroups(...)` plus the create commands. Clamped at
  both ends, not wrapping — wrapping in a list this long loses people.
- `↵` opens the selected row; `Escape` closes and returns focus to the trigger.
- `Tab` cycles the type filter over **only the types present in the current results**, then
  back to unfiltered. Cycling through types with no hits would present empty states as if
  they were destinations.
- Closing is state. The scrim closes on `onMouseDown`; rows commit on `onClick`. No timer.

`⌘K` / `Ctrl+K` toggles, registered in `Header` and gated on `user` (§7).

The clear button no longer doubles as the spinner. `aria-label="Clear search"` belongs to a
control that clears search; the spinner is a separate, non-interactive element. Today one
button is both (`SearchBar.tsx:225-239`).

---

## 6. The shrink order

The header's real defect is that nothing declares who yields. Encoded, widest threshold
first:

| # | Element | Behaviour | Mechanism |
|---|---|---|---|
| 1 | Title | `D&D Campaign Companion` → `D&D Companion` | `title:` screen, 1200px |
| 2 | Nav | last two items → `More ▾` | `nav:` screen, 1080px |
| 3 | Campaign chip | truncates, already `max-w-[9rem] md:max-w-[14rem]` | unchanged |
| 4 | Account chip | name hidden; avatar and chevron stay | `hidden nav:inline` on the name |
| 5 | Search trigger | **never yields** | `shrink-0` |

Item 1 exists today but at `lg` (1024px, `Header.tsx:72-73`) — which is *narrower* than the
nav's fold point, inverting the declared order. Moving it to `title:` is what makes the
order monotone.

Item 4 targets the `Typography` at `UserMenuTrigger.tsx:55`; the avatar span and chevron
are already `flex-shrink-0`.

Items 2 and 4 share the `nav:` threshold, and item 3 has no threshold at all — the campaign
chip truncates continuously via `max-w`, so it is already yielding at every width. The
ladder is therefore three steps, not five. What the order buys is the guarantee that the
search trigger is never one of them.

### 6.1 Why two named breakpoints

`~1080px` and `~1200px` are not Tailwind defaults, and the definition of done names
**1024px as a folded width** — which rules out expressing the fold with `lg` (≥1024 would
leave it unfolded at exactly the width being verified). Added under `theme.extend`:

```js
screens: { nav: '1080px', title: '1200px' }
```

Extended screens are appended after the defaults, so a `nav:` rule can out-cascade an `xl:`
rule on the same property. Both new screens control `display` on elements no `xl:` rule
touches, so the hazard does not arise — but any future `xl:` on the nav items or the title
spans must be checked against it.

Resulting ladder: ≥1200 full title, seven items · 1080–1200 short title, seven items ·
768–1080 short title, five items + `More ▾`, account name hidden · <768 mobile strip.

### 6.2 `More ▾`

`Locations` and `Notes` get `hidden nav:flex`; a `More ▾` button gets `nav:hidden` and
opens a popover of the two hidden destinations as `[role="menuitem"]` rows — so it uses
`usePopoverKeys` unchanged, which is where the spec's reuse instruction actually belongs.
`navItems` stays the single source; the overflow slice is `navItems.slice(-2)`, not a
second list.

The mobile `variant="mobile"` strip is untouched.

### 6.3 What no test can check

jsdom applies no CSS, so no test observes a fold at any width. Tests assert the **classes**;
the three widths in the definition of done are a manual browser check against a running dev
server, recorded in the plan's final step.

---

## 7. Header

The wrapper at `Header.tsx:93` is replaced by `<SearchTrigger>`, rendered only when `user`.
`Header` owns `paletteOpen` and a `triggerRef`, mounts `<CommandPalette>`, and registers
the `⌘K` / `Ctrl+K` listener in an effect gated on `user` — searching an index that was
never built is what put "Droop" in the signed-out screenshots.

Gating the hotkey on `user` matters independently of the trigger: a hidden trigger with a
live shortcut would open a palette over an empty index with no visible way to have gotten
there.

---

## 8. Testing

Behaviour, not markup. New or rewritten:

- `searchPresentation.test.ts` — group order follows best-result position; within-group
  order preserved; empty groups dropped; `flattenGroups` order matches render order;
  `splitOnMatch` on case difference, absent match, empty query, and regex-special
  characters.
- `useCreateActions.test.tsx` — six actions in the documented order; `run` navigates for
  five and calls `createAndOpen` for the note.
- `GlobalActionButton.test.tsx` — existing file, must stay green unedited. It is the proof
  the extraction changed no behaviour. If it needs editing, the extraction was wrong.
- `CommandPalette.test.tsx` — opens on `⌘K` and `Ctrl+K`; `Escape` closes and focus lands
  back on the trigger; scrim `mouseDown` closes; `↑↓` move `aria-activedescendant` and the
  id it names resolves to a rendered element; `↵` navigates; `Tab` cycles only present
  types; the four states of §5.3 in priority order; `matchCount > 1` renders
  `+N more mentions`; create commands carry the query; no result row commits on blur.
- `SearchTrigger.test.tsx` — absent when `!user`; `aria-keyshortcuts` present.
- `Navigation.test.tsx` — existing; `More ▾` holds exactly the last two `navItems`;
  responsive classes present on the right elements.
- `Header.test.tsx` — existing, rewritten for the new surface: trigger present/absent by
  auth state, palette mounts on hotkey, hotkey inert when signed out.

Gates, in order: `npx tsc --noEmit`, `npm test`, then `npm run build` — the third is
required and not implied by the first two, since webpack ignores tsconfig `paths`.

Baseline is measured on this branch before any change lands, not carried forward from
CLAUDE.md. Expect a net reduction of one suite (`SearchBar.test.tsx` deleted) against
several added.

---

## 9. Decisions

1. **`usePopoverKeys` is not reused in the palette**, against the spec's instruction. It
   drives real DOM focus over `menuitem` rows; the palette needs virtual focus over
   `option` rows. Reuse lands in `More ▾` instead. (§2)
2. **The trigger stays visible below `md`**, as a 36px icon. §4 of the spec leaves the phone
   header with logo, campaign chip and account only, which would leave nothing to open the
   palette — a functional regression, since search works on phones today.
3. **The create list is extracted now**, touching `GlobalActionButton.tsx` even though it is
   outside the spec's file list. Only the array moves; the surface PR 7 owns is untouched.
   The alternative ships the two-lists problem the definition of done exists to prevent.
4. **`SearchBar.tsx` and its test are deleted**, not reduced.
5. **`isIndexReady` is added to `SearchContext`**, widening the PR, because the spec's
   skeleton state is otherwise unimplementable. (§1.2)
6. **Group order follows relevance**, not a fixed type order, to preserve PR 5's ranking.
   (§4.2)
7. **Two named breakpoints** rather than default `lg`/`xl`, because the definition of done
   requires 1024px to be a folded width. (§6.1)

## Out of scope

Search ranking and indexing (PR 5, merged). The global create button's own surface (PR 7) —
this PR changes where its list comes from, not how it looks or behaves. The mobile
navigation strip's contents.
