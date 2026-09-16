# Header Command Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the header's collapsing search field with a fixed-width trigger that opens a 720px command palette, and declare an explicit shrink order for everything else in the header.

**Architecture:** Two pure foundation modules (a create-action list, a set of search-presentation helpers) are built first so the two surfaces above them can be built in parallel without sharing state. The palette renders through `createPortal` with virtual focus — focus stays in the input, `aria-activedescendant` names a `role="option"` row. The header's shrink order is encoded with two named Tailwind breakpoints. `SearchBar.tsx` is deleted, not adapted.

**Tech Stack:** React 18.2 + TypeScript, TailwindCSS with a CSS-variable theme layer, Jest + React Testing Library, `lucide-react` icons, `clsx`.

**Spec:** `docs/superpowers/specs/2026-09-02-header-command-palette-design.md` — read it before Task 1. This plan argues from it and does not restate its reasoning.

## Global Constraints

- **Never use hardcoded colours.** Use theme classes (`.search-results`, `.search-result`, `.search-result-selected`, `.dropdown`, `.button-ghost`) or Tailwind tokens backed by CSS variables. The single exception is the palette scrim, `rgba(15,23,42,.34)`, authorised by the spec.
- **Import style:** bare `baseUrl` specifiers (`core/types/search`, `shared/hooks/useSearch`) in anything that ships. `@/…` alias imports pass `tsc` and jest and then **fail `npm run build`**. Relative imports within a directory are fine and match local practice.
- **Double quotes** in new files, per ESLint. Existing files keep whatever they use.
- **JSDoc** on every exported function, component, hook and interface.
- **Never edit a test to make it pass.** If a test fails, the code is wrong. The one place this plan predicts a test edit is `useSearch.test.ts`'s context stub (Task 2, Step 1) — that is adding a new field to a hand-written mock, not weakening an assertion.
- **Two different `useNavigation` hooks exist.** `shared/context/NavigationContext` (used by `GlobalActionButton`) and `shared/hooks/useNavigation` (used by `Navigation.tsx`). They are not interchangeable. Task 1 must use the **context** one.
- **Copy strings are exact.** `Search`, `Keep typing…` (real ellipsis character), `No results in {campaign}`, `{n} results in {campaign}`, `1 result in {campaign}`, `Searching {campaign} only`, `+{n} more mentions`, `New {entityLabel} named "{query}"`, `More`, and the footer hints `↑↓ move`, `↵ open`, `tab filter by type`.
- **Verification gates, in order:** `npx tsc --noEmit`, then `npm test`, then `npm run build`. The third is required and is **not** implied by the first two — webpack ignores tsconfig `paths`.

---

## Execution Waves

Packets are cut so that no two concurrently running agents touch the same file. **Maximum two agents run at once.**

| Wave | Concurrent packets | Files locked by each |
|---|---|---|
| 1 | **Task 1** (Agent A) ∥ **Task 2** (Agent B) | A: `useCreateActions.ts`, `GlobalActionButton.tsx` · B: `searchPresentation.ts`, `SearchContext.tsx`, `useSearch.ts` |
| 2 | **Tasks 3 → 4** (Agent C, sequential) ∥ **Task 5** (Agent D) | C: `command-palette/**` · D: `Navigation.tsx`, `UserMenuTrigger.tsx`, `tailwind.config.js` |
| 3 | **Task 6**, then **Task 7** (orchestrator, sequential) | `Header.tsx`, `Header.test.tsx`, deletions |

Wave 2 must not start until **both** Wave 1 packets are reviewed and merged, because Task 3 consumes both of their interfaces. No agent in Wave 1 or 2 may touch `src/app/layout/Header.tsx`.

**Baseline first.** Before Task 1, run `npm test` on this branch and record the suite/test counts in the Task 7 checklist. Do not carry forward the figures in `CLAUDE.md`.

---

## Task 1: The create-action list (Agent A)

**Files:**
- Create: `src/shared/hooks/useCreateActions.ts`
- Create: `src/shared/hooks/__tests__/useCreateActions.test.tsx`
- Modify: `src/shared/components/GlobalActionButton.tsx:37-66` (remove the inline `actions` array and the `handleCreateNote` helper) and its icon imports

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  ```ts
  export interface CreateAction {
    id: string;
    entityLabel: string;
    icon: LucideIcon;
    run: () => void | Promise<void>;
  }
  export function useCreateActions(): CreateAction[];
  ```
  Task 3 renders these as `New {entityLabel} named "{query}"` and calls `run()`.

**Do not touch** `GlobalActionButton`'s JSX, styling, animation, or `__tests__/GlobalActionButton.test.tsx`. That test staying green **unedited** is the proof this extraction changed no behaviour.

**Why the existing test keeps working:** it calls `jest.mock("../../context/NavigationContext")` and `jest.mock("features/collaboration")`. Jest mocks by resolved module, so the new hook importing those same two modules receives the same mocks. No test change is needed or permitted.

- [ ] **Step 1: Write the failing test**

Create `src/shared/hooks/__tests__/useCreateActions.test.tsx`:

```tsx
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { useCreateActions } from "../useCreateActions";

const mockNavigateToPage = jest.fn();
const mockCreateAndOpen = jest.fn();

jest.mock("../../context/NavigationContext", () => ({
  useNavigation: jest.fn(),
}));
jest.mock("features/collaboration", () => ({
  useCreateNote: jest.fn(),
}));

const { useNavigation } = require("../../context/NavigationContext");
const { useCreateNote } = require("features/collaboration");

beforeEach(() => {
  jest.clearAllMocks();
  useNavigation.mockReturnValue({ navigateToPage: mockNavigateToPage, createPath: jest.fn() });
  useCreateNote.mockReturnValue({ createAndOpen: mockCreateAndOpen });
});

describe("useCreateActions", () => {
  it("returns the six create actions in the order the action button renders them", () => {
    const { result } = renderHook(() => useCreateActions());
    expect(result.current.map((a) => a.entityLabel)).toEqual([
      "Note", "Location", "NPC", "Rumor", "Quest", "Chapter",
    ]);
  });

  it("gives every action a stable id and an icon component", () => {
    const { result } = renderHook(() => useCreateActions());
    expect(result.current.map((a) => a.id)).toEqual([
      "note", "location", "npc", "rumor", "quest", "chapter",
    ]);
    result.current.forEach((action) => {
      expect(typeof action.icon).toBe("function");
    });
  });

  it("navigates to the create route for the five navigating actions", () => {
    const { result } = renderHook(() => useCreateActions());
    const routes: Record<string, string> = {
      location: "/locations/create",
      npc: "/npcs/create",
      rumor: "/rumors/create",
      quest: "/quests/create",
      chapter: "/story/chapters/create",
    };
    Object.entries(routes).forEach(([id, path]) => {
      act(() => {
        result.current.find((a) => a.id === id)!.run();
      });
      expect(mockNavigateToPage).toHaveBeenCalledWith(path);
    });
    expect(mockCreateAndOpen).not.toHaveBeenCalled();
  });

  it("creates and opens a note rather than navigating, for the note action", async () => {
    const { result } = renderHook(() => useCreateActions());
    await act(async () => {
      await result.current.find((a) => a.id === "note")!.run();
    });
    expect(mockCreateAndOpen).toHaveBeenCalledTimes(1);
    expect(mockNavigateToPage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="useCreateActions"
```

Expected: FAIL — `Cannot find module '../useCreateActions'`.

- [ ] **Step 3: Write the hook**

Create `src/shared/hooks/useCreateActions.ts`:

```ts
// src/shared/hooks/useCreateActions.ts
import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, FileText, MapPin, MessageSquare, Scroll, User } from "lucide-react";
import { useNavigation } from "../context/NavigationContext";
import { useCreateNote } from "features/collaboration";

/**
 * One entry in the single list of "create a new X" commands.
 *
 * Shared by the floating action button and the command palette so the two
 * cannot drift. Both the label and the icon size are left to the caller:
 * `icon` is the component, not an element, and `entityLabel` is the bare noun
 * from which each surface builds its own copy.
 */
export interface CreateAction {
  /** Stable key, e.g. "npc". */
  id: string;
  /** The entity's display noun, e.g. "NPC". */
  entityLabel: string;
  /** The icon component. Callers size it themselves. */
  icon: LucideIcon;
  /** Perform the action. Async for the note, which is written before it opens. */
  run: () => void | Promise<void>;
}

/**
 * The six create commands, in the order the floating action button renders
 * them. That order is load-bearing: the button lays them out with
 * `flex-col-reverse`, so reordering this array silently reorders its menu.
 */
export function useCreateActions(): CreateAction[] {
  const { navigateToPage } = useNavigation();
  const { createAndOpen } = useCreateNote();

  return useMemo(
    () => [
      { id: "note", entityLabel: "Note", icon: FileText, run: () => createAndOpen() },
      { id: "location", entityLabel: "Location", icon: MapPin, run: () => navigateToPage("/locations/create") },
      { id: "npc", entityLabel: "NPC", icon: User, run: () => navigateToPage("/npcs/create") },
      { id: "rumor", entityLabel: "Rumor", icon: MessageSquare, run: () => navigateToPage("/rumors/create") },
      { id: "quest", entityLabel: "Quest", icon: Scroll, run: () => navigateToPage("/quests/create") },
      { id: "chapter", entityLabel: "Chapter", icon: BookOpen, run: () => navigateToPage("/story/chapters/create") },
    ],
    [navigateToPage, createAndOpen]
  );
}

export default useCreateActions;
```

- [ ] **Step 4: Run the test and verify it passes**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="useCreateActions"
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Refactor GlobalActionButton to consume the hook**

In `src/shared/components/GlobalActionButton.tsx`: delete the `actions` array and the `handleCreateNote` helper, drop the now-unused icon imports (`BookOpen`, `User`, `Scroll`, `MessageSquare`, `MapPin`, `FileText`) and the `useCreateNote` import, and add `import { useCreateActions } from "shared/hooks/useCreateActions";`.

Replace the menu body with:

```tsx
const actions = useCreateActions();

const handleActionClick = async (action: CreateAction) => {
  await action.run();
  setIsOpen(false);
};
```

and in the JSX, render each action as:

```tsx
{actions.map((action) => {
  const Icon = action.icon;
  return (
    <Button
      variant="primary"
      startIcon={<Icon className="w-5 h-5" />}
      key={action.id}
      onClick={() => handleActionClick(action)}
      className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all duration-200 animate-fadeIn"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <span>{`New ${action.entityLabel}`}</span>
    </Button>
  );
})}
```

Keep the `index * 50` animation delay by using `actions.map((action, index) => …)`. Import `CreateAction` as a type. `navigateToPage` may now be unused in this file — remove the `useNavigation` call if so, and let `tsc` tell you.

- [ ] **Step 6: Verify the untouched test still passes**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="GlobalActionButton"
npx tsc --noEmit
```

Expected: PASS with **zero edits** to `GlobalActionButton.test.tsx`, and a clean `tsc`. If that test now fails, the extraction changed behaviour — fix the code, not the test.

- [ ] **Step 7: Commit**

```bash
git add src/shared/hooks/useCreateActions.ts src/shared/hooks/__tests__/useCreateActions.test.tsx src/shared/components/GlobalActionButton.tsx
git commit -m "refactor(create): make the six create actions one shared list"
```

---

## Task 2: Search presentation helpers and index readiness (Agent B)

**Files:**
- Create: `src/shared/utils/searchPresentation.ts`
- Create: `src/shared/utils/__tests__/searchPresentation.test.ts`
- Modify: `src/shared/context/SearchContext.tsx` (add `isIndexReady`)
- Modify: `src/shared/hooks/useSearch.ts` (pass `isIndexReady` through)
- Modify: `src/shared/hooks/__tests__/useSearch.test.ts` (add the new field to the context stub only)

**Interfaces:**
- Consumes: `SearchResult`, `SearchResultType` from `core/types/search`.
- Produces:
  ```ts
  export interface SearchGroup { type: SearchResultType; label: string; results: SearchResult[] }
  export function groupResultsByType(results: SearchResult[]): SearchGroup[];
  export function flattenGroups(groups: SearchGroup[]): SearchResult[];
  export function splitOnMatch(text: string, query: string): Array<{ text: string; isMatch: boolean }>;
  ```
  plus `useSearch()` gaining `isIndexReady: boolean`. Task 3 consumes all four.

**Do not touch** any component. This packet is data and pure functions only.

- [ ] **Step 1: Write the failing tests for the pure helpers**

Create `src/shared/utils/__tests__/searchPresentation.test.ts`:

```ts
import { groupResultsByType, flattenGroups, splitOnMatch } from "../searchPresentation";
import type { SearchResult } from "core/types/search";

const result = (
  type: SearchResult["type"],
  id: string,
  title = id
): SearchResult => ({ id, type, title, content: "", matches: [], matchCount: 1 });

describe("groupResultsByType", () => {
  it("orders groups by the position of their best result, not by a fixed type order", () => {
    // Story leads because SearchService already sorted globally by relevance.
    const groups = groupResultsByType([
      result("story", "s1"),
      result("npc", "n1"),
      result("story", "s2"),
    ]);
    expect(groups.map((g) => g.type)).toEqual(["story", "npc"]);
  });

  it("preserves the incoming order of results within a group", () => {
    const groups = groupResultsByType([
      result("story", "s1"),
      result("npc", "n1"),
      result("story", "s2"),
    ]);
    expect(groups[0].results.map((r) => r.id)).toEqual(["s1", "s2"]);
  });

  it("drops types with no results rather than rendering an empty heading", () => {
    const groups = groupResultsByType([result("npc", "n1")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("npc");
  });

  it("labels groups with the uppercase plural heading from the mock", () => {
    const labels = groupResultsByType([
      result("npc", "n"), result("story", "s"), result("note", "o"),
      result("quest", "q"), result("location", "l"), result("rumors", "r"),
    ]).map((g) => g.label);
    expect(labels).toEqual(["NPCS", "STORY", "NOTES", "QUESTS", "LOCATIONS", "RUMORS"]);
  });

  it("returns an empty array for no results", () => {
    expect(groupResultsByType([])).toEqual([]);
  });
});

describe("flattenGroups", () => {
  it("returns results in the order they are rendered, so the keyboard index matches the eye", () => {
    const groups = groupResultsByType([
      result("story", "s1"),
      result("npc", "n1"),
      result("story", "s2"),
    ]);
    expect(flattenGroups(groups).map((r) => r.id)).toEqual(["s1", "s2", "n1"]);
  });
});

describe("splitOnMatch", () => {
  it("splits around a literal match", () => {
    expect(splitOnMatch("meet Droop here", "Droop")).toEqual([
      { text: "meet ", isMatch: false },
      { text: "Droop", isMatch: true },
      { text: " here", isMatch: false },
    ]);
  });

  it("matches case-insensitively but preserves the original casing", () => {
    expect(splitOnMatch("Droop", "droop")).toEqual([{ text: "Droop", isMatch: true }]);
  });

  it("marks every occurrence", () => {
    expect(splitOnMatch("droop and droop", "droop").filter((s) => s.isMatch)).toHaveLength(2);
  });

  it("returns one unmarked segment when there is no literal match", () => {
    // Fuzzy subsequence hits still rank and still render -- just unhighlighted.
    expect(splitOnMatch("Cragmaw Hideout", "drp")).toEqual([
      { text: "Cragmaw Hideout", isMatch: false },
    ]);
  });

  it("returns one unmarked segment for an empty query", () => {
    expect(splitOnMatch("anything", "")).toEqual([{ text: "anything", isMatch: false }]);
    expect(splitOnMatch("anything", "   ")).toEqual([{ text: "anything", isMatch: false }]);
  });

  it("does not throw on regex-special characters in the query", () => {
    expect(() => splitOnMatch("a (b) c", "(b)")).not.toThrow();
    expect(splitOnMatch("a (b) c", "(b)")).toEqual([
      { text: "a ", isMatch: false },
      { text: "(b)", isMatch: true },
      { text: " c", isMatch: false },
    ]);
  });

  it("returns an empty array for empty text", () => {
    expect(splitOnMatch("", "droop")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="searchPresentation"
```

Expected: FAIL — `Cannot find module '../searchPresentation'`.

- [ ] **Step 3: Write the helpers**

Create `src/shared/utils/searchPresentation.ts`:

```ts
// src/shared/utils/searchPresentation.ts
import type { SearchResult, SearchResultType } from "core/types/search";

/** A run of results of one type, with the heading the palette renders above them. */
export interface SearchGroup {
  type: SearchResultType;
  /** Uppercase plural heading, e.g. "NPCS". */
  label: string;
  results: SearchResult[];
}

/** Uppercase plural headings, matching design reference 8a. */
const GROUP_LABELS: Record<SearchResultType, string> = {
  npc: "NPCS",
  story: "STORY",
  note: "NOTES",
  quest: "QUESTS",
  location: "LOCATIONS",
  rumors: "RUMORS",
};

/**
 * Group results by type for display.
 *
 * Groups are ordered by where their best result sits in `results`, and results
 * keep their incoming order within a group. `SearchService.processResults`
 * has already sorted globally by relevance, so a fixed type order here would
 * discard that ranking -- burying an exact title match under a weak fuzzy hit
 * of a type that happened to be listed first. Types with no results are
 * dropped, so no empty heading is ever rendered.
 */
export function groupResultsByType(results: SearchResult[]): SearchGroup[] {
  const groups = new Map<SearchResultType, SearchResult[]>();

  for (const result of results) {
    const existing = groups.get(result.type);
    if (existing) {
      existing.push(result);
    } else {
      groups.set(result.type, [result]);
    }
  }

  // Map preserves insertion order, which is first-appearance order.
  return Array.from(groups.entries()).map(([type, groupResults]) => ({
    type,
    label: GROUP_LABELS[type],
    results: groupResults,
  }));
}

/**
 * The grouped results as one flat list, in render order.
 *
 * The palette's arrow keys index into this, so that moving down goes where the
 * eye goes. Indexing the ungrouped array instead would make the highlight jump
 * around the panel.
 */
export function flattenGroups(groups: SearchGroup[]): SearchResult[] {
  return groups.flatMap((group) => group.results);
}

/** Escape a user-typed string for literal use inside a RegExp. */
const escapeForRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Split `text` into alternating matched and unmatched segments so the caller
 * can wrap the matched ones in `<mark>`.
 *
 * Matching is case-insensitive and **literal**. Fuzzy subsequence hits still
 * rank and still appear in results, but are returned as a single unmatched
 * segment: highlighting `d…r…o…p` scattered across a sentence reads as
 * corruption rather than as a match.
 */
export function splitOnMatch(
  text: string,
  query: string
): Array<{ text: string; isMatch: boolean }> {
  if (!text) return [];

  const trimmed = query.trim();
  if (!trimmed) return [{ text, isMatch: false }];

  const pattern = new RegExp(escapeForRegExp(trimmed), "gi");
  const segments: Array<{ text: string; isMatch: boolean }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start), isMatch: false });
    }
    segments.push({ text: match[0], isMatch: true });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isMatch: false });
  }

  return segments.length > 0 ? segments : [{ text, isMatch: false }];
}
```

- [ ] **Step 4: Run the tests and verify they pass**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="searchPresentation"
```

Expected: PASS, 13 tests.

- [ ] **Step 5: Commit the helpers**

```bash
git add src/shared/utils/searchPresentation.ts src/shared/utils/__tests__/searchPresentation.test.ts
git commit -m "feat(search): group results for display and split them for highlighting"
```

- [ ] **Step 6: Add `isIndexReady` to SearchContext**

In `src/shared/context/SearchContext.tsx`:

Add `isIndexReady: boolean;` to `SearchContextData`. Add state beside the others:

```tsx
// Whether the index has been built at least once. Before it has, an empty
// `results` array is indistinguishable from a genuine miss -- which is the
// state the palette must render as a skeleton rather than as "no results".
const [isIndexReady, setIsIndexReady] = useState(false);
```

Inside the existing initialization effect, set it after `searchService.initializeIndex(searchDocuments)` succeeds:

```tsx
searchService.initializeIndex(searchDocuments);
setIsIndexReady(true);
```

Leave the `totalDocs === 0` early return exactly as it is — that guard is what keeps the flag false while collections are still arriving. Add `isIndexReady` to the `useMemo` value object **and its dependency array**.

- [ ] **Step 7: Pass it through `useSearch`**

In `src/shared/hooks/useSearch.ts`, destructure `isIndexReady` from `useSearchContext()` and add it to the returned object next to `isSearching`. Document it in the JSDoc block.

- [ ] **Step 8: Extend the `useSearch` test's context stub**

In `src/shared/hooks/__tests__/useSearch.test.ts`, add `isIndexReady: true,` to `defaultContextValue()`, and add one test:

```ts
it("passes the index-ready flag through from the context", () => {
  useSearchContext.mockReturnValue({ ...defaultContextValue(), isIndexReady: false });
  const { result } = renderHook(() => useSearch());
  expect(result.current.isIndexReady).toBe(false);
});
```

This is the only permitted test edit in this task, and it adds a field to a hand-written stub — it weakens no assertion.

- [ ] **Step 9: Verify**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="useSearch|SearchContext"
npx tsc --noEmit
```

Expected: PASS, including the pre-existing `SearchContext.behavioral.test.tsx`.

- [ ] **Step 10: Commit**

```bash
git add src/shared/context/SearchContext.tsx src/shared/hooks/useSearch.ts src/shared/hooks/__tests__/useSearch.test.ts
git commit -m "feat(search): report whether the index has been built"
```

---

## Task 3: The trigger and the palette surface (Agent C)

**Files:**
- Create: `src/shared/components/command-palette/SearchTrigger.tsx`
- Create: `src/shared/components/command-palette/HighlightedText.tsx`
- Create: `src/shared/components/command-palette/CommandPalette.tsx`
- Create: `src/shared/components/command-palette/__tests__/SearchTrigger.test.tsx`
- Create: `src/shared/components/command-palette/__tests__/CommandPalette.test.tsx`

**Interfaces:**
- Consumes: `useCreateActions()` and `CreateAction` (Task 1); `groupResultsByType`, `flattenGroups`, `splitOnMatch`, `SearchGroup` (Task 2); `useSearch()` with its new `isIndexReady` (Task 2); `useCampaigns()` from `features/user-management`; `useNavigation` from `shared/context/NavigationContext`.
- Produces:
  ```tsx
  interface CommandPaletteProps { isOpen: boolean; onClose: () => void; triggerRef: React.RefObject<HTMLButtonElement> }
  const CommandPalette: React.FC<CommandPaletteProps>;

  interface SearchTriggerProps { onOpen: () => void }
  const SearchTrigger = React.forwardRef<HTMLButtonElement, SearchTriggerProps>;
  ```
  Task 6 mounts both from `Header.tsx`.

**Do not touch** `Header.tsx`, `Navigation.tsx`, or `SearchBar.tsx`. This packet builds the components; Task 6 wires them in. Nothing renders them yet, and that is expected.

Keyboard handling is **Task 4**. Build the surface first with `selectedIndex` as plain state and mouse interaction only.

- [ ] **Step 1: Write the failing trigger test**

Create `src/shared/components/command-palette/__tests__/SearchTrigger.test.tsx`:

```tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchTrigger from "../SearchTrigger";

describe("SearchTrigger", () => {
  it("announces the keyboard shortcut that opens the palette", () => {
    render(<SearchTrigger onOpen={jest.fn()} />);
    const button = screen.getByRole("button", { name: /search/i });
    expect(button).toHaveAttribute("aria-keyshortcuts", "Meta+K Control+K");
  });

  it("opens the palette when clicked", async () => {
    const onOpen = jest.fn();
    render(<SearchTrigger onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("never shrinks", () => {
    render(<SearchTrigger onOpen={jest.fn()} />);
    expect(screen.getByRole("button", { name: /search/i }).className).toContain("shrink-0");
  });
});
```

- [ ] **Step 2: Run it and verify it fails**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="SearchTrigger"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the trigger**

Create `src/shared/components/command-palette/SearchTrigger.tsx`:

```tsx
// src/shared/components/command-palette/SearchTrigger.tsx
import React, { forwardRef } from "react";
import { Search } from "lucide-react";
import { clsx } from "clsx";
import Typography from "core/components/Typography";

/** Props for {@link SearchTrigger}. */
interface SearchTriggerProps {
  /** Open the command palette. */
  onOpen: () => void;
}

/** True on Apple platforms, where the shortcut hint reads ⌘K rather than Ctrl K. */
const isApplePlatform = (): boolean =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? "");

/**
 * The header's search affordance: a fixed-width button, never a field.
 *
 * A field has to be wide to be usable and narrow to fit, and it lost that
 * argument to seven nav items and two chips. A trigger is ~120px always, which
 * frees the surface that actually shows results to be 720px.
 *
 * Below `md` it collapses to an icon-only button so a phone header still has a
 * way into the palette.
 */
const SearchTrigger = forwardRef<HTMLButtonElement, SearchTriggerProps>(
  ({ onOpen }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label="Search"
      aria-keyshortcuts="Meta+K Control+K"
      className={clsx(
        "shrink-0 flex items-center gap-2 rounded-md button-ghost",
        "px-2 py-1.5 md:px-2.5 md:w-[7.5rem]"
      )}
    >
      <Search size={16} className="flex-shrink-0" />
      <Typography variant="body-sm" className="hidden md:inline">
        Search
      </Typography>
      <span
        aria-hidden="true"
        className="hidden md:inline ml-auto px-1.5 py-0.5 rounded text-xs search"
      >
        {isApplePlatform() ? "⌘K" : "Ctrl K"}
      </span>
    </button>
  )
);

SearchTrigger.displayName = "SearchTrigger";

export default SearchTrigger;
```

- [ ] **Step 4: Run it and verify it passes**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="SearchTrigger"
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Write the highlighter**

Create `src/shared/components/command-palette/HighlightedText.tsx`:

```tsx
// src/shared/components/command-palette/HighlightedText.tsx
import React from "react";
import { splitOnMatch } from "shared/utils/searchPresentation";

/** Props for {@link HighlightedText}. */
interface HighlightedTextProps {
  /** The text to render. */
  text: string;
  /** The query whose literal occurrences are marked. */
  query: string;
}

/**
 * Render `text` with every literal occurrence of `query` wrapped in `<mark>`.
 *
 * Fuzzy subsequence hits render unhighlighted -- see {@link splitOnMatch}.
 */
const HighlightedText: React.FC<HighlightedTextProps> = ({ text, query }) => (
  <>
    {splitOnMatch(text, query).map((segment, index) =>
      segment.isMatch ? (
        <mark key={index} className="bg-accent rounded-sm px-0.5">
          {segment.text}
        </mark>
      ) : (
        <React.Fragment key={index}>{segment.text}</React.Fragment>
      )
    )}
  </>
);

export default HighlightedText;
```

- [ ] **Step 6: Write the failing palette tests**

Create `src/shared/components/command-palette/__tests__/CommandPalette.test.tsx`. Mock `useSearch`, `useCampaigns`, `useCreateActions` and `useNavigation`, following the aggressive-mocking style of `Header.test.tsx`:

```tsx
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommandPalette from "../CommandPalette";
import type { SearchResult } from "core/types/search";

const mockNavigateToPage = jest.fn();
const mockOnSearch = jest.fn();
const mockRun = jest.fn();

jest.mock("shared/hooks/useSearch", () => ({ useSearch: jest.fn() }));
jest.mock("shared/context/NavigationContext", () => ({ useNavigation: jest.fn() }));
jest.mock("features/user-management", () => ({ useCampaigns: jest.fn() }));
jest.mock("shared/hooks/useCreateActions", () => ({ useCreateActions: jest.fn() }));

const { useSearch } = require("shared/hooks/useSearch");
const { useNavigation } = require("shared/context/NavigationContext");
const { useCampaigns } = require("features/user-management");
const { useCreateActions } = require("shared/hooks/useCreateActions");

const npc: SearchResult = {
  id: "droop", type: "npc", title: "Droop", content: "",
  matches: ["a cowardly goblin the party spared"], matchCount: 1,
};
const chapter: SearchResult = {
  id: "ch12", type: "story", title: "Chapter 12 — Cragmaw Hideout", content: "",
  matches: ["bound and shaking, Droop agreed to lead them"], matchCount: 3,
};

const searchState = (overrides = {}) => ({
  query: "droop", results: [npc, chapter], isSearching: false,
  isQueryTooShort: false, isIndexReady: true,
  onSearch: mockOnSearch, onClearSearch: jest.fn(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  useSearch.mockReturnValue(searchState());
  useNavigation.mockReturnValue({ navigateToPage: mockNavigateToPage, createPath: (p: string) => p });
  useCampaigns.mockReturnValue({ activeCampaign: { id: "p", name: "Phandelver" } });
  useCreateActions.mockReturnValue([
    { id: "npc", entityLabel: "NPC", icon: () => null, run: mockRun },
  ]);
});

const open = () =>
  render(<CommandPalette isOpen onClose={jest.fn()} triggerRef={React.createRef()} />);

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    render(<CommandPalette isOpen={false} onClose={jest.fn()} triggerRef={React.createRef()} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("puts the combobox role on the input itself", () => {
    open();
    const input = screen.getByRole("combobox");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("groups results under uppercase type headings", () => {
    open();
    expect(screen.getByText("NPCS")).toBeInTheDocument();
    expect(screen.getByText("STORY")).toBeInTheDocument();
  });

  it("marks the matched term in the title", () => {
    open();
    const marks = screen.getAllByText("Droop", { selector: "mark" });
    expect(marks.length).toBeGreaterThan(0);
  });

  it("counts the extra mentions when a result matched more than once", () => {
    open();
    expect(screen.getByText("+2 more mentions")).toBeInTheDocument();
  });

  it("does not count mentions for a single match", () => {
    open();
    expect(screen.queryByText("+0 more mentions")).not.toBeInTheDocument();
  });

  it("reports the result count against the active campaign", () => {
    open();
    expect(screen.getByText("2 results in Phandelver")).toBeInTheDocument();
    expect(screen.getByText("Searching Phandelver only")).toBeInTheDocument();
  });

  it("uses the singular for one result", () => {
    useSearch.mockReturnValue(searchState({ results: [npc] }));
    open();
    expect(screen.getByText("1 result in Phandelver")).toBeInTheDocument();
  });

  it("drops the campaign qualifier when no campaign is active", () => {
    useCampaigns.mockReturnValue({ activeCampaign: null });
    open();
    expect(screen.getByText("2 results")).toBeInTheDocument();
    expect(screen.queryByText(/Searching/)).not.toBeInTheDocument();
  });

  it("shows a skeleton, not an empty state, while the index is still building", () => {
    useSearch.mockReturnValue(searchState({ results: [], isIndexReady: false }));
    open();
    expect(screen.getByTestId("palette-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/No results/)).not.toBeInTheDocument();
  });

  it("asks for more characters below the minimum query length", () => {
    useSearch.mockReturnValue(searchState({ query: "d", results: [], isQueryTooShort: true }));
    open();
    expect(screen.getByText("Keep typing…")).toBeInTheDocument();
  });

  it("names the campaign in the empty state", () => {
    useSearch.mockReturnValue(searchState({ results: [] }));
    open();
    expect(screen.getByText("No results in Phandelver")).toBeInTheDocument();
  });

  it("offers a create command carrying the typed query", () => {
    open();
    expect(screen.getByText('New NPC named "droop"')).toBeInTheDocument();
  });

  it("runs the create command when clicked", async () => {
    open();
    await userEvent.click(screen.getByText('New NPC named "droop"'));
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it("navigates on a result click without waiting out a blur timer", async () => {
    open();
    await userEvent.click(screen.getByText("Chapter 12 — Cragmaw Hideout"));
    expect(mockNavigateToPage).toHaveBeenCalled();
  });

  it("closes when the scrim is pressed", async () => {
    const onClose = jest.fn();
    render(<CommandPalette isOpen onClose={onClose} triggerRef={React.createRef()} />);
    await userEvent.click(screen.getByTestId("palette-scrim"));
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the clear button a clear button, never a spinner", async () => {
    const onClearSearch = jest.fn();
    useSearch.mockReturnValue(searchState({ isSearching: true, onClearSearch }));
    open();
    const clear = screen.getByRole("button", { name: "Clear search" });
    expect(within(clear).queryByRole("status")).not.toBeInTheDocument();
    expect(clear.className).not.toContain("animate-spin");
    await userEvent.click(clear);
    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it("offers no clear button when there is nothing to clear", () => {
    useSearch.mockReturnValue(searchState({ query: "", results: [] }));
    open();
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("gives every option a real id and points aria-activedescendant at one of them", () => {
    open();
    const input = screen.getByRole("combobox");
    const active = input.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).toBeInTheDocument();
    expect(document.getElementById(active!)).toHaveAttribute("role", "option");
  });
});
```

- [ ] **Step 7: Run them and verify they fail**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="CommandPalette"
```

Expected: FAIL — module not found.

- [ ] **Step 8: Write the palette**

Create `src/shared/components/command-palette/CommandPalette.tsx`. Structure it exactly as follows.

Imports and setup:

```tsx
// src/shared/components/command-palette/CommandPalette.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { Book, MapPin, MessageSquare, Plus, Scroll, Search, StickyNote, Users, X } from "lucide-react";
import type { SearchResult, SearchResultType } from "core/types/search";
import Typography from "core/components/Typography";
import { useSearch } from "shared/hooks/useSearch";
import { useCreateActions } from "shared/hooks/useCreateActions";
import { useNavigation } from "shared/context/NavigationContext";
import { useCampaigns } from "features/user-management";
import { flattenGroups, groupResultsByType } from "shared/utils/searchPresentation";
import HighlightedText from "./HighlightedText";
```

Reuse the icon map from the old `SearchBar.tsx:22-30` verbatim (`story: Book`, `quest: Scroll`, `npc: Users`, `location: MapPin`, `rumors: MessageSquare`, `note: StickyNote`) — the note/nav icon agreement documented there still matters.

Route mapping is lifted verbatim from `SearchBar.tsx:60-88` into a `useCallback` named **`navigateToResult(result: SearchResult): void`** — Task 4 calls it by that name — **including its comment about notes**: `createPath` never substitutes params, so a note must call `navigateToPage("/notes/" + id)` directly while the other five use `createPath(path, {}, { highlight: id })`.

The panel shell and one result row, concretely:

```tsx
return createPortal(
  <div
    data-testid="palette-scrim"
    className="fixed inset-0 z-40"
    style={{ backgroundColor: "rgba(15,23,42,.34)" }}
    onMouseDown={onClose}
  >
    <div
      data-testid="command-palette"
      onMouseDown={(event) => event.stopPropagation()}
      className={clsx(
        "search-results fixed z-50 overflow-y-auto",
        "left-1/2 -translate-x-1/2 top-[calc(3.5rem+34px)]",
        "w-[720px] max-w-[calc(100vw-2rem)] max-h-[70vh]",
        "max-md:inset-0 max-md:left-0 max-md:w-full max-md:max-w-none",
        "max-md:max-h-none max-md:translate-x-0 max-md:rounded-none"
      )}
    >
      {/* query row, body, footer */}
    </div>
  </div>,
  document.body
);
```

```tsx
const Row: React.FC<{ result: SearchResult; index: number }> = ({ result, index }) => {
  const Icon = resultTypeIcons[result.type];
  const isSelected = index === selectedIndex;
  return (
    <div
      id={optionId(result)}
      role="option"
      aria-selected={isSelected}
      onMouseEnter={() => setSelectedIndex(index)}
      onClick={() => { navigateToResult(result); onClose(); }}
      className={clsx(
        "flex items-start gap-3 px-4 py-2.5 cursor-pointer border-l-[3px]",
        isSelected ? "search-result-selected border-accent" : "search-result border-transparent"
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 primary" />
      <div className="min-w-0 flex-1">
        <Typography className="font-medium">
          <HighlightedText text={result.title} query={query} />
        </Typography>
        {result.matches[0] && (
          <Typography variant="body-sm" color="secondary">
            …<HighlightedText text={result.matches[0]} query={query} />…
          </Typography>
        )}
      </div>
      {result.matchCount > 1 && (
        <Typography variant="body-sm" color="secondary" className="flex-shrink-0">
          {`+${result.matchCount - 1} more mentions`}
        </Typography>
      )}
      {isSelected && (
        <Typography variant="body-sm" color="secondary" className="flex-shrink-0">
          ↵ open
        </Typography>
      )}
    </div>
  );
};
```

Requirements the tests pin:

1. Return `null` when `!isOpen`.
2. Render through `createPortal(…, document.body)`.
3. Scrim: `data-testid="palette-scrim"`, `style={{ backgroundColor: "rgba(15,23,42,.34)" }}`, `onMouseDown={onClose}`, `fixed inset-0 z-40`.
4. Panel: `w-[720px] max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto search-results`, positioned `fixed left-1/2 -translate-x-1/2 top-[calc(3.5rem+34px)] z-50`, with `onMouseDown={(e) => e.stopPropagation()}` so a press inside does not close it. Below `md`, full-screen: `max-md:inset-0 max-md:w-full max-md:max-w-none max-md:max-h-none max-md:translate-x-0 max-md:left-0 max-md:rounded-none`.
5. Query row: a magnifier, the `<input role="combobox">` (`autoFocus`, `aria-expanded`, `aria-controls="palette-results"`, `aria-activedescendant`), the count, and an `esc` pill.
6. The count reads `{n} result{s} in {campaign}` — or without ` in {campaign}` when `activeCampaign` is null.
7. Results list: `id="palette-results"` `role="listbox"`. Each group renders its `label` in a small uppercase heading and its results as `role="option"` rows with `id={optionId(result)}` where `const optionId = (r: SearchResult) => \`cmdk-option-${r.type}-${r.id}\``.
8. Each row: icon, `<HighlightedText text={result.title} query={query} />`, one snippet line `…{result.matches[0]}…` also highlighted, and `+{result.matchCount - 1} more mentions` on the right **only when `matchCount > 1`**.
9. Selected row: `search-result-selected` plus `border-l-[3px] border-accent`, and an `↵ open` affordance. Unselected: `search-result`. `onMouseEnter` sets the index.
10. Create commands below an `<hr className="card-divider" />`, each a `role="option"` row with `id={\`cmdk-create-${action.id}\`}`, reading `New {action.entityLabel} named "{query}"`, calling `action.run()` then `onClose()` on click.
11. State priority, checked in this order — this ordering is the point of `isIndexReady`:

```tsx
const body = !isIndexReady || isSearching
  ? <Skeleton />                                   // data-testid="palette-skeleton"
  : isQueryTooShort
    ? <Message>Keep typing…</Message>
    : results.length === 0
      ? <Message>{campaignName ? `No results in ${campaignName}` : "No results"}</Message>
      : <Groups />;
```

12. `selectedIndex` state, default `0`, reset to `0` whenever `results` changes. `aria-activedescendant` is the id of the item at `selectedIndex` in `navigableItems`:

```tsx
const groups = useMemo(() => groupResultsByType(results), [results]);
const flatResults = useMemo(() => flattenGroups(groups), [groups]);
const navigableItems = useMemo(
  () => [
    ...flatResults.map((r) => ({ kind: "result" as const, id: optionId(r), result: r })),
    ...createActions.map((a) => ({ kind: "create" as const, id: `cmdk-create-${a.id}`, action: a })),
  ],
  [flatResults, createActions]
);
```

13. Footer: `↑↓ move` · `↵ open` · `tab filter by type` on the left, `Searching {campaign} only` on the right (omitted when no campaign).
14. `typeFilter` state exists (`SearchResultType | null`, default `null`) and filters `groups` when set. Task 4 wires `Tab` to it; for now it is only read.
15. **The clear button is a clear button and nothing else.** It renders only when `query` is non-empty, carries `aria-label="Clear search"`, shows an `<X />`, and calls `onClearSearch()`. The loading indicator is the skeleton in the body — never this control. Today one button is both (`SearchBar.tsx:225-239`), so a spinner sits under a label promising to clear the search:

```tsx
{query && (
  <button type="button" onClick={onClearSearch} aria-label="Clear search" className="button-ghost p-1 rounded">
    <X className="w-4 h-4" />
  </button>
)}
```

- [ ] **Step 9: Run the palette tests and verify they pass**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="CommandPalette"
npx tsc --noEmit
```

Expected: PASS, 19 tests, clean `tsc`.

- [ ] **Step 10: Commit**

```bash
git add src/shared/components/command-palette/
git commit -m "feat(search): a 720px command palette, grouped and highlighted"
```

---

## Task 4: Palette keyboard and a11y (Agent C, after Task 3)

**Files:**
- Create: `src/shared/components/command-palette/useCommandPaletteKeys.ts`
- Modify: `src/shared/components/command-palette/CommandPalette.tsx` (consume the hook)
- Modify: `src/shared/components/command-palette/__tests__/CommandPalette.test.tsx` (append a `describe` block)

**Interfaces:**
- Consumes: Task 3's `navigableItems` shape and `selectedIndex` state.
- Produces:
  ```ts
  interface UseCommandPaletteKeysOptions {
    isOpen: boolean;
    itemCount: number;
    selectedIndex: number;
    onMove: (nextIndex: number) => void;
    onCommit: () => void;
    onFilterCycle: () => void;
    onClose: () => void;
  }
  export function useCommandPaletteKeys(options: UseCommandPaletteKeysOptions): void;
  ```

**Do not reuse `usePopoverKeys`, and do not modify it.** See §2 of the spec: it moves real DOM focus between `[role="menuitem"]` rows, which would take focus out of the input on the first `↓` and stop typing working. Its two consumers (`ContextSwitcher.tsx:64`, `UserMenu.tsx:41`) are correct as they are.

- [ ] **Step 1: Write the failing keyboard tests**

Append to `CommandPalette.test.tsx`:

```tsx
describe("CommandPalette keyboard", () => {
  it("keeps focus in the input while the arrow keys move the selection", async () => {
    open();
    const input = screen.getByRole("combobox");
    const first = input.getAttribute("aria-activedescendant");
    await userEvent.keyboard("{ArrowDown}");
    expect(input).toHaveFocus();
    expect(input.getAttribute("aria-activedescendant")).not.toBe(first);
  });

  it("resolves aria-activedescendant to a real option after moving", async () => {
    open();
    await userEvent.keyboard("{ArrowDown}");
    const active = screen.getByRole("combobox").getAttribute("aria-activedescendant");
    expect(document.getElementById(active!)).toHaveAttribute("role", "option");
  });

  it("clamps at the top rather than wrapping", async () => {
    open();
    const input = screen.getByRole("combobox");
    const first = input.getAttribute("aria-activedescendant");
    await userEvent.keyboard("{ArrowUp}");
    expect(input.getAttribute("aria-activedescendant")).toBe(first);
  });

  it("falls from the last result into the create commands", async () => {
    open();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    const active = screen.getByRole("combobox").getAttribute("aria-activedescendant");
    expect(active).toBe("cmdk-create-npc");
  });

  it("opens the selected result on Enter", async () => {
    open();
    await userEvent.keyboard("{Enter}");
    expect(mockNavigateToPage).toHaveBeenCalled();
  });

  it("closes on Escape and hands focus back to the trigger", async () => {
    const onClose = jest.fn();
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    const triggerRef = { current: trigger } as React.RefObject<HTMLButtonElement>;
    render(<CommandPalette isOpen onClose={onClose} triggerRef={triggerRef} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("cycles Tab only through the types present in the results", async () => {
    open();
    await userEvent.keyboard("{Tab}");
    expect(screen.getByText("NPCS")).toBeInTheDocument();
    expect(screen.queryByText("STORY")).not.toBeInTheDocument();
    await userEvent.keyboard("{Tab}");
    expect(screen.getByText("STORY")).toBeInTheDocument();
    await userEvent.keyboard("{Tab}");
    // Back to unfiltered.
    expect(screen.getByText("NPCS")).toBeInTheDocument();
    expect(screen.getByText("STORY")).toBeInTheDocument();
  });

  it("has no blur timer", () => {
    const source = require("fs").readFileSync(
      require("path").join(__dirname, "../CommandPalette.tsx"), "utf8"
    );
    expect(source).not.toContain("setTimeout");
  });
});
```

- [ ] **Step 2: Run and verify they fail**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="CommandPalette"
```

Expected: the eight new tests FAIL; the 19 from Task 3 still pass.

- [ ] **Step 3: Write the hook**

Create `src/shared/components/command-palette/useCommandPaletteKeys.ts`:

```ts
// src/shared/components/command-palette/useCommandPaletteKeys.ts
import { useEffect } from "react";
import type { SearchResultType } from "core/types/search";

/** Options for {@link useCommandPaletteKeys}. */
interface UseCommandPaletteKeysOptions {
  isOpen: boolean;
  /** How many rows are navigable: results plus create commands. */
  itemCount: number;
  /** The currently highlighted row. */
  selectedIndex: number;
  /** Move the highlight. Callers clamp nothing; this hook has already clamped. */
  onMove: (nextIndex: number) => void;
  /** Open the highlighted row. */
  onCommit: () => void;
  /** Advance the type filter one step. */
  onFilterCycle: () => void;
  /** Close the palette. */
  onClose: () => void;
}

/**
 * The palette's keyboard contract: **virtual** focus.
 *
 * Focus stays in the input the whole time and the highlighted row is announced
 * through `aria-activedescendant`. This is why `usePopoverKeys` is not reused
 * here -- that hook moves real DOM focus onto `[role="menuitem"]` rows, which
 * would take focus out of the input on the first ArrowDown and stop typing
 * working.
 *
 * Movement clamps rather than wraps: in a list this long, wrapping loses people.
 */
export function useCommandPaletteKeys({
  isOpen,
  itemCount,
  selectedIndex,
  onMove,
  onCommit,
  onFilterCycle,
  onClose,
}: UseCommandPaletteKeysOptions): void {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          onClose();
          break;
        case "ArrowDown":
          event.preventDefault();
          onMove(Math.min(selectedIndex + 1, itemCount - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          onMove(Math.max(selectedIndex - 1, 0));
          break;
        case "Enter":
          if (itemCount > 0) {
            event.preventDefault();
            onCommit();
          }
          break;
        case "Tab":
          event.preventDefault();
          onFilterCycle();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, itemCount, selectedIndex, onMove, onCommit, onFilterCycle, onClose]);
}

export default useCommandPaletteKeys;
```

- [ ] **Step 4: Wire it into the palette**

In `CommandPalette.tsx`:

```tsx
const availableTypes = useMemo(() => groupResultsByType(results).map((g) => g.type), [results]);

const cycleFilter = useCallback(() => {
  setTypeFilter((current) => {
    if (availableTypes.length === 0) return null;
    if (current === null) return availableTypes[0];
    const next = availableTypes.indexOf(current) + 1;
    return next >= availableTypes.length ? null : availableTypes[next];
  });
}, [availableTypes]);

const commit = useCallback(() => {
  const item = navigableItems[selectedIndex];
  if (!item) return;
  if (item.kind === "result") {
    navigateToResult(item.result);
  } else {
    void item.action.run();
  }
  onClose();
}, [navigableItems, selectedIndex, navigateToResult, onClose]);

useCommandPaletteKeys({
  isOpen,
  itemCount: navigableItems.length,
  selectedIndex,
  onMove: setSelectedIndex,
  onCommit: commit,
  onFilterCycle: cycleFilter,
  onClose: () => { onClose(); triggerRef.current?.focus(); },
});
```

Note `availableTypes` derives from the **unfiltered** results, so cycling still knows every type once a filter is on.

- [ ] **Step 5: Run and verify everything passes**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="CommandPalette"
npx tsc --noEmit
```

Expected: PASS, 27 tests.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/command-palette/
git commit -m "feat(search): virtual focus and a keyboard contract that resolves"
```

---

## Task 5: Nav overflow and the shrink order (Agent D)

**Files:**
- Modify: `tailwind.config.js` (add two named screens)
- Modify: `src/app/layout/Navigation.tsx`
- Modify: `src/shared/components/user-menu/UserMenuTrigger.tsx:55`
- Modify: `src/app/layout/__tests__/Navigation.test.tsx` (append tests)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the `nav:` (1080px) and `title:` (1200px) screens, which Task 6 uses on the header title.

**Do not touch** `Header.tsx` or anything under `command-palette/`.

- [ ] **Step 1: Add the named breakpoints**

In `tailwind.config.js`, inside `theme.extend`:

```js
      // Named for what yields at them, because the header's shrink order is the
      // point: the title shortens at `title`, the last two nav items fold at
      // `nav`. Tailwind's defaults cannot express this -- the definition of done
      // requires 1024px to be a *folded* width, which `lg` (>=1024) cannot be.
      // Both control `display` on elements no `xl:` rule touches, so the
      // append-after-defaults cascade order does not bite.
      screens: {
        nav: "1080px",
        title: "1200px",
      },
```

- [ ] **Step 2: Write the failing navigation tests**

Append to `src/app/layout/__tests__/Navigation.test.tsx`:

```tsx
describe("Navigation overflow", () => {
  it("keeps the last two destinations out of the inline row below the nav breakpoint", () => {
    render(<Navigation variant="inline" />);
    const locations = screen.getByRole("button", { name: "Locations" });
    expect(locations.className).toContain("hidden");
    expect(locations.className).toContain("nav:block");
  });

  it("offers a More menu holding exactly the two folded destinations", async () => {
    render(<Navigation variant="inline" />);
    await userEvent.click(screen.getByRole("button", { name: /more/i }));
    const menu = screen.getByRole("menu", { name: "More destinations" });
    const items = within(menu).getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["Locations", "Notes"]);
  });

  it("navigates from a More menu item", async () => {
    render(<Navigation variant="inline" />);
    await userEvent.click(screen.getByRole("button", { name: /more/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Notes" }));
    expect(mockNavigateToPage).toHaveBeenCalledWith("/notes");
  });

  it("hides the More button at and above the nav breakpoint", () => {
    render(<Navigation variant="inline" />);
    expect(screen.getByRole("button", { name: /more/i }).className).toContain("nav:hidden");
  });

  it("leaves the mobile strip carrying all seven destinations", () => {
    render(<Navigation variant="mobile" />);
    expect(screen.getAllByRole("button")).toHaveLength(7);
  });
});
```

Match the file's existing mocking of `shared/hooks/useNavigation`; add `within` and `userEvent` imports if absent.

- [ ] **Step 3: Run and verify they fail**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="Navigation"
```

Expected: the five new tests FAIL; the existing ones pass.

- [ ] **Step 4: Implement the overflow**

In `Navigation.tsx`, in the `inline` branch only:

```tsx
const inlineItems = navItems.slice(0, -2);
const overflowItems = navItems.slice(-2);
```

`navItems` stays the single source — the overflow is a slice of it, never a second list.

Render `inlineItems` as today. Render `overflowItems` with `"hidden nav:block"` added to each button's `clsx`. Then a `More` popover, built on the same shape as `UserMenu`: a `triggerRef`, a `panelRef`, a `containerRef` with a `mousedown`-outside listener, and

```tsx
usePopoverKeys({ isOpen, panelRef, triggerRef, onClose: close });
```

This is the reuse the PR description asked for — a real popover of `[role="menuitem"]` rows, which is what that hook is for.

The trigger carries `className="nav:hidden …"`, `aria-haspopup="menu"`, `aria-expanded={isOpen}`, and the text `More` plus a `<ChevronDown size={14} />`. The panel is `role="menu"` with `aria-label="More destinations"`, styled `dropdown absolute right-0 top-full mt-1 rounded-md shadow-lg z-20`, holding one `role="menuitem"` button per overflow item that calls `navigateToPage(item.path)` and closes.

- [ ] **Step 5: Hide the account name below the nav breakpoint**

In `src/shared/components/user-menu/UserMenuTrigger.tsx:55`, add `hidden nav:inline` to the `Typography`'s `className`. The avatar span and chevron already carry `flex-shrink-0` and stay at every width.

- [ ] **Step 6: Run and verify**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="Navigation|UserMenu"
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add tailwind.config.js src/app/layout/Navigation.tsx src/app/layout/__tests__/Navigation.test.tsx src/shared/components/user-menu/UserMenuTrigger.tsx
git commit -m "feat(header): declare the shrink order, and fold the last two nav items"
```

---

## Task 6: Header integration (orchestrator)

**Files:**
- Modify: `src/app/layout/Header.tsx:72-73` (title breakpoint) and `:93` (the search wrapper)
- Modify: `src/app/layout/__tests__/Header.test.tsx`
- Delete: `src/shared/components/SearchBar.tsx`
- Delete: `src/shared/components/__tests__/SearchBar.test.tsx`

**Interfaces:**
- Consumes: `SearchTrigger` and `CommandPalette` (Tasks 3–4), the `title:` screen (Task 5).

- [ ] **Step 1: Write the failing header tests**

In `Header.test.tsx`, replace the `SearchBar` mock with mocks for the two new components. The mocks must carry the roles and test id the assertions look for, or every test below passes vacuously:

```tsx
jest.mock("shared/components/command-palette/SearchTrigger", () => ({
  __esModule: true,
  default: React.forwardRef<HTMLButtonElement, { onOpen: () => void }>(({ onOpen }, ref) => (
    <button ref={ref} type="button" aria-label="Search" onClick={onOpen} />
  )),
}));

jest.mock("shared/components/command-palette/CommandPalette", () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="command-palette" /> : null,
}));
```

Then add:

```tsx
describe("search affordance", () => {
  it("offers the trigger to a signed-in user", () => {
    renderHeader({ user: mockUser });
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("hides the trigger entirely when signed out", () => {
    renderHeader({ user: null });
    expect(screen.queryByRole("button", { name: /search/i })).not.toBeInTheDocument();
  });

  it("opens the palette on the meta shortcut", async () => {
    renderHeader({ user: mockUser });
    await userEvent.keyboard("{Meta>}k{/Meta}");
    expect(screen.getByTestId("command-palette")).toBeInTheDocument();
  });

  it("opens the palette on the control shortcut", async () => {
    renderHeader({ user: mockUser });
    await userEvent.keyboard("{Control>}k{/Control}");
    expect(screen.getByTestId("command-palette")).toBeInTheDocument();
  });

  it("leaves the shortcut inert when signed out", async () => {
    renderHeader({ user: null });
    await userEvent.keyboard("{Control>}k{/Control}");
    expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
  });
});
```

Adapt `renderHeader` to the file's existing helper for configuring `useAuth`.

- [ ] **Step 2: Run and verify they fail**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="layout/__tests__/Header"
```

- [ ] **Step 3: Wire the header**

Replace `Header.tsx:93`'s wrapper:

```tsx
{user && <SearchTrigger ref={searchTriggerRef} onOpen={() => setPaletteOpen(true)} />}
```

Add to the component body:

```tsx
const [paletteOpen, setPaletteOpen] = useState(false);
const searchTriggerRef = useRef<HTMLButtonElement>(null);

// Gated on `user` for the same reason the trigger is: searching an index that
// was never built is what put results in the signed-out screenshots. A hidden
// trigger with a live shortcut would open a palette over an empty index with
// no visible way to have got there.
useEffect(() => {
  if (!user) return;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      setPaletteOpen((open) => !open);
    }
  };
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}, [user]);
```

Mount the palette beside the other dialogs:

```tsx
{user && (
  <CommandPalette
    isOpen={paletteOpen}
    onClose={() => setPaletteOpen(false)}
    triggerRef={searchTriggerRef}
  />
)}
```

Change `Header.tsx:72-73` from `lg:inline hidden` / `lg:hidden` to `title:inline hidden` / `title:hidden`, so the title yields at 1200px — wider than the nav's 1080px fold, which is what makes the shrink order monotone rather than inverted.

Add `data-testid="command-palette"` to the palette's panel element in `CommandPalette.tsx`.

- [ ] **Step 4: Delete the old search bar**

```bash
git rm src/shared/components/SearchBar.tsx src/shared/components/__tests__/SearchBar.test.tsx
```

Then confirm nothing still imports it:

```
grep -rn "SearchBar" src/
```

Expected: no matches.

- [ ] **Step 5: Verify**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="layout/__tests__/Header"
npx tsc --noEmit
grep -rn "setTimeout" src/shared/components/command-palette/
```

Expected: header tests PASS, clean `tsc`, and no `setTimeout` anywhere in the palette.

- [ ] **Step 6: Commit**

```bash
git add -A src/app/layout src/shared/components
git commit -m "feat(header): a fixed trigger where the collapsing search field was"
```

---

## Task 7: Full verification (orchestrator)

- [ ] **Step 1: Run the three gates in order**

```
npx tsc --noEmit
npm test
npm run build
```

`npm run build` is required and not implied by the other two. Compare the test counts against the baseline recorded before Task 1. Expect: one suite fewer (`SearchBar.test.tsx` deleted), five suites more (`useCreateActions`, `searchPresentation`, `SearchTrigger`, `CommandPalette`, plus the extended `Navigation` and `Header`). Any red is a regression — reconcile it before proceeding.

- [ ] **Step 2: Manual browser check**

Start the app with `.\scripts\start-dev.ps1 -Action start` and verify at **1024px, 1280px and 1440px**, signed in:

| Width | Title | Nav | Account name | Trigger |
|---|---|---|---|---|
| 1440 | full | 7 items | shown | ~120px |
| 1280 | full | 7 items | shown | ~120px |
| 1024 | `D&D Companion` | 5 + `More ▾` | hidden | ~120px |

Then confirm: `⌘K`/`Ctrl+K` opens the palette; typing `dro` groups results with headings; `↑↓` moves the highlight while the caret stays in the input; `Tab` filters by type; `Escape` closes with focus back on the trigger; clicking the scrim closes it; a create command appears carrying the query. Sign out and confirm the trigger is gone and the shortcut does nothing.

If the dev server reports errors `tsc` and `npm run build` do not, clear the stale webpack cache — `rm -rf node_modules/.cache` — and restart before investigating further.

- [ ] **Step 3: Record the outcome**

Update the baseline line in `CLAUDE.md`'s Testing Strategy section with the measured suite/test counts from Step 1, noting the branch and date. Do not carry forward the old figures.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(search): record the palette's verification and the new baseline"
```

---

## Definition of done

Mapped to the PR description's checklist:

| Requirement | Task |
|---|---|
| Fixed-width trigger, never shrinks, hidden when signed out | 3 (Step 3), 6 (Step 3) |
| `⌘K`/`Ctrl+K` opens 720px palette; Escape and scrim close; focus returns | 4 (Steps 3–4), 6 (Step 3) |
| Results grouped, term highlighted, one snippet, `+N mentions` | 2 (Step 3), 3 (Step 8) |
| Create commands from the same source as the create menu | 1 |
| `role="combobox"` on the input; `aria-activedescendant` resolves | 3 (Step 8 req. 5/7), 4 (Step 1) |
| No `setTimeout` blur hack remains | 4 (Step 1, source assertion), 6 (Step 5, grep) |
| Clear button is not also the spinner, and keeps its label | 3 (Step 8 req. 15) |
| Nav folds into `More ▾` before anything else yields; 1024/1280/1440 | 5, 7 (Step 2) |
| `npm test` passes with header and search tests updated | 7 (Step 1) |
