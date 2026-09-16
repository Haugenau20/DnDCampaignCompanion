# Gated Page States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all 21 campaign-gated page components one signed-out state, one "pick a campaign" state and one skeleton, driven by a single hook, so no page ever tells a signed-out visitor to use a control that is not on screen.

**Architecture:** One hook (`usePageGate`) collapses auth + campaign-context resolution into a five-value state. Two dumb components consume it: `PageShell` renders the always-visible title/subtitle/actions, `GatedContent` renders skeleton / panel / error / children. All gated wording lives in one module (`gated-page-copy.ts`); context files stop emitting sentences. Signed-out Home is the single exception, rendering its own two-column explainer with one frozen example fixture.

**Tech Stack:** React 18 + TypeScript, TailwindCSS with the project theme-class system, Jest + React Testing Library, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-09-03-gated-page-states-design.md` — read it before Task 1. The plan argues from the spec; both travel together.

## Global Constraints

Every task's requirements implicitly include this section.

- **Imports must be bare `baseUrl` specifiers** (`core/components/Button`, `shared/hooks/useCampaignContextStatus`). **Never `@/…`** in anything under `src/` that ships — webpack ignores tsconfig `paths` and the production build fails with `Module not found` even though `tsc` and jest pass. `@/` is tolerated only inside `__tests__/` and `test-utils/`.
- **No hardcoded colours.** Use the existing theme classes only: `card`, `card-content`, `typography`, `typography-secondary`, `typography-muted`, `typography-heading`, `divider`, `bg-secondary`, `primary`, `selectable-item`, `chip`, `status-*`. The full list is in `src/core/themes/css/components.css`.
- **Double quotes** in new files per the ESLint config; match the surrounding file's style when editing an existing one.
- **JSDoc on every exported function, component and non-obvious type.** This codebase documents *why*, not *what* — match the density of `src/shared/hooks/useCampaignContextStatus.ts`.
- **Never modify a test to make it pass.** If a test fails, either the code is wrong or the test encodes a layering mistake — and in the one case where it does (contexts emitting copy), Task 14 rewrites it deliberately and says so.
- **Test baseline: 235 suites / 4717 tests, 0 failed, 2 skipped**, measured on this branch at `f249c04`. Any red is a regression. Task counts only ever go up.
- **Mock convention** for page suites: module-level `jest.mock("features/user-management", …)` returning mutable `let` fixtures reset in `beforeEach`. Copy the shape from `src/pages/quests/__tests__/QuestsPage.test.tsx:15-51`.
- **Every commit ends with:**
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
  ```
- **Do not push, do not open a PR, do not merge to main.** The orchestrator handles integration.
- **Stage explicit file paths, never `git add <directory>/`.** Two implementers share one working
  tree and one git index in a batch; a directory glob lets whichever commits second sweep up the
  other's half-finished files. If `git commit` fails on `index.lock`, wait a moment and retry once.
- **Never edit a file outside your task's Files list.** If you believe one needs changing, say so in
  your report instead — the other implementer in your batch may be inside it right now.
- Run a single suite fast with:
  `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="<pattern>"`

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/shared/components/gated/gated-page-copy.ts` | The only module in `src/` holding gated-state wording. Seven page entries + the shared footnote. |
| `src/shared/components/gated/types.ts` | `CampaignOption`, shared by the panel, the fetch hook and the wrapper. |
| `src/shared/components/gated/usePageGate.ts` | The five-state ladder. Reads `useAuth` + `useCampaignContextStatus`, returns `PageGate`. |
| `src/shared/components/gated/GatedPageState.tsx` | The 560px panel, both variants. Presentational — no data hooks, no services. |
| `src/shared/components/gated/useSelectableCampaigns.ts` | Cross-group campaign list for the pick-campaign variant. |
| `src/shared/components/gated/GatedContent.tsx` | Renders skeleton / panel / error / children. Owns the two dialogs, the campaign fetch and the switch. |
| `src/shared/components/gated/index.ts` | Barrel for the four modules above. |
| `src/shared/components/page-shell/PageShell.tsx` | Title (always `h1`), subtitle, actions, page container. |
| `src/pages/home/signed-out-example.ts` | The frozen Home fixture. Its type carries no author field. |
| `src/pages/home/SignedOutHome.tsx` | The `9b` two-column signed-out Home. |

**Modified** — 21 page components, 2 feature forms, 2 context files, and the existing suite for each.

---

## Batch 0 — the contract (orchestrator, sequential)

### Task 1: Copy module

**Files:**
- Create: `src/shared/components/gated/gated-page-copy.ts`
- Create: `src/shared/components/gated/types.ts`
- Test: `src/shared/components/gated/__tests__/gated-page-copy.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `GatedPageKey`, `GatedContextRequirement`, `GatedPageCopy`, `GATED_COPY`, `GATED_FOOTNOTE`, `gatedHeading(copy, mode)`, and `CampaignOption` from `types.ts`.

`types.ts` holds the one type three later tasks share. It lives here, in the batch that precedes
all of them, so Tasks 4, 5 and 6 each import it rather than negotiating who defines it:

```ts
// src/shared/components/gated/types.ts

/**
 * One campaign the signed-in user could switch to, and the group it lives in.
 *
 * The group travels with the campaign rather than being a grouping header,
 * because two campaigns in different groups can share a name and the row has
 * to be unambiguous on its own.
 */
export interface CampaignOption {
  campaignId: string;
  campaignName: string;
  groupId: string;
  groupName: string;
}
```

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/components/gated/__tests__/gated-page-copy.test.ts
import {
  GATED_COPY,
  GATED_FOOTNOTE,
  gatedHeading,
  GatedPageKey,
} from "../gated-page-copy";

const ALL_KEYS: GatedPageKey[] = [
  "home",
  "story",
  "quests",
  "npcs",
  "locations",
  "rumors",
  "notes",
];

describe("GATED_COPY", () => {
  it("has an entry for every page key", () => {
    expect(Object.keys(GATED_COPY).sort()).toEqual([...ALL_KEYS].sort());
  });

  it.each(ALL_KEYS)("%s carries a heading, a blurb and a noun", (key) => {
    const copy = GATED_COPY[key];
    expect(copy.heading.length).toBeGreaterThan(0);
    expect(copy.blurb.length).toBeGreaterThan(0);
    expect(copy.noun.length).toBeGreaterThan(0);
  });

  // Notes fetches on activeGroupId and treats activeCampaignId as a filter
  // (NoteContext.tsx:51-73), so it is the one page that must not demand a
  // campaign before it shows anything.
  it("requires only a group for notes, and a campaign everywhere else", () => {
    expect(GATED_COPY.notes.requires).toBe("group");
    ALL_KEYS.filter((key) => key !== "notes").forEach((key) => {
      expect(GATED_COPY[key].requires).toBe("campaign");
    });
  });

  it("never repeats a heading between two pages", () => {
    const headings = ALL_KEYS.map((key) => GATED_COPY[key].heading);
    expect(new Set(headings).size).toBe(headings.length);
  });

  it("tells every reader that a campaign is private to its group", () => {
    // The one promise the panel must make on each entity page.
    ["quests", "npcs", "locations", "rumors", "story"].forEach((key) => {
      expect(GATED_COPY[key as GatedPageKey].blurb).toMatch(
        /visible only to the group/i
      );
    });
  });
});

describe("gatedHeading", () => {
  it("returns the read heading in read mode", () => {
    expect(gatedHeading(GATED_COPY.quests, "read")).toBe(
      GATED_COPY.quests.heading
    );
  });

  it("returns the write heading in write mode", () => {
    expect(gatedHeading(GATED_COPY.quests, "write")).toBe(
      GATED_COPY.quests.writeHeading
    );
  });

  it("falls back to the read heading when a page has no write heading", () => {
    expect(gatedHeading(GATED_COPY.home, "write")).toBe(GATED_COPY.home.heading);
  });
});

describe("GATED_FOOTNOTE", () => {
  it("explains that joining is by invite", () => {
    expect(GATED_FOOTNOTE).toMatch(/join link/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="gated-page-copy"`
Expected: FAIL — `Cannot find module '../gated-page-copy'`

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/components/gated/gated-page-copy.ts

/**
 * Which selection a page needs before it can show anything.
 *
 * Most pages read campaign-scoped collections and need both a group and a
 * campaign. `notes` is the exception: `NoteContext` fetches on `activeGroupId`
 * alone and applies `activeCampaignId` as a filter afterwards, so a member with
 * a group but no campaign chosen can still see notes.
 */
export type GatedContextRequirement = "group" | "campaign";

/**
 * Everything the gated panel says about one page.
 *
 * This interface exists so that adding a page is a data change, not a new
 * branch: the panel component reads these fields and never names a page.
 */
export interface GatedPageCopy {
  /** Heading shown to a signed-out visitor on a read route. */
  heading: string;
  /** Heading shown on a create/edit route. Falls back to `heading`. */
  writeHeading?: string;
  /** One paragraph on what this page is for, in the product's voice. */
  blurb: string;
  /** Plural noun for the error line: "Couldn't load quests." */
  noun: string;
  /** Which selection this page needs. */
  requires: GatedContextRequirement;
}

/** Every page that has a gated state. */
export type GatedPageKey =
  | "home"
  | "story"
  | "quests"
  | "npcs"
  | "locations"
  | "rumors"
  | "notes";

/**
 * The line for genuine newcomers, below the hairline on the signed-out panel.
 *
 * Shared rather than per-page: it answers "what is this site?", which is the
 * same question regardless of which URL a stranger happened to land on.
 */
export const GATED_FOOTNOTE =
  "New here? The Companion is a private campaign record for one group at a " +
  "time — a DM invites you with a join link.";

/**
 * The single source of gated wording in `src/`.
 *
 * Context files used to build these sentences themselves, which put five
 * phrasings of two ideas in five different layers. A context returns a *state*;
 * this module holds the words; the panel renders them.
 */
export const GATED_COPY: Record<GatedPageKey, GatedPageCopy> = {
  home: {
    heading: "Sign in to open your campaign",
    blurb:
      "The Companion keeps one campaign's chapters, quests, NPCs, locations, " +
      "rumors and private notes in one place. Each campaign is visible only " +
      "to the group that plays it.",
    noun: "your campaign",
    requires: "campaign",
  },
  story: {
    heading: "Sign in to read your campaign's story",
    writeHeading: "Sign in to write a chapter",
    blurb:
      "The chapter log is the campaign told in order — one entry a session, " +
      "written by whoever was at the table. Each campaign is visible only to " +
      "the group that plays it.",
    noun: "chapters",
    requires: "campaign",
  },
  quests: {
    heading: "Sign in to see your party's quests",
    writeHeading: "Sign in to add a quest",
    blurb:
      "Quests are the open threads of a campaign — who asked for what, which " +
      "objectives are done, and what the party still owes. Each campaign is " +
      "visible only to the group that plays it.",
    noun: "quests",
    requires: "campaign",
  },
  npcs: {
    heading: "Sign in to see who your party has met",
    writeHeading: "Sign in to add an NPC",
    blurb:
      "NPCs are everyone the party has dealt with: allies, patrons, rivals, " +
      "and the ones nobody trusts yet. Each campaign is visible only to the " +
      "group that plays it.",
    noun: "NPCs",
    requires: "campaign",
  },
  locations: {
    heading: "Sign in to see where your party has been",
    writeHeading: "Sign in to add a location",
    blurb:
      "Locations are the places the party has visited, heard of, or is still " +
      "trying to find, and what happened at each. Each campaign is visible " +
      "only to the group that plays it.",
    noun: "locations",
    requires: "campaign",
  },
  rumors: {
    heading: "Sign in to hear what the realm is saying",
    writeHeading: "Sign in to record a rumor",
    blurb:
      "Rumors are the leads a party picks up in taverns and on notice boards " +
      "— some true, some not, all worth writing down. Each campaign is " +
      "visible only to the group that plays it.",
    noun: "rumors",
    requires: "campaign",
  },
  notes: {
    heading: "Sign in to read your notes",
    writeHeading: "Sign in to write a note",
    blurb:
      "Notes are yours alone; nobody else in the group can read them, not " +
      "even the DM. NPCs you mention can be lifted out into the shared " +
      "record when you're ready.",
    noun: "notes",
    requires: "group",
  },
};

/**
 * Pick the heading for a page in the mode the route is in.
 *
 * A create route asking someone to "sign in to see your party's quests" names
 * the wrong thing; `writeHeading` names the action they were actually trying
 * to take. Pages with no write route omit it and fall back.
 *
 * @param copy The page's copy entry
 * @param mode Whether the route reads or writes
 * @returns The heading to render
 */
export function gatedHeading(
  copy: GatedPageCopy,
  mode: "read" | "write"
): string {
  return mode === "write" && copy.writeHeading ? copy.writeHeading : copy.heading;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="gated-page-copy"`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/gated/gated-page-copy.ts \
        src/shared/components/gated/types.ts \
        src/shared/components/gated/__tests__/gated-page-copy.test.ts
git commit -m "feat(gated): put every gated-state sentence in one module"
```

---

### Task 2: `usePageGate`

**Files:**
- Create: `src/shared/components/gated/usePageGate.ts`
- Test: `src/shared/components/gated/__tests__/usePageGate.test.ts`

**Interfaces:**
- Consumes: `GATED_COPY`, `GatedPageCopy`, `GatedPageKey`, `gatedHeading` (Task 1); `useAuth()` from `features/user-management`; `useCampaignContextStatus()` from `shared/hooks/useCampaignContextStatus`.
- Produces: `GateState`, `PageGate`, `PageGateOptions`, `usePageGate(page, options?)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/components/gated/__tests__/usePageGate.test.ts
import { renderHook } from "@testing-library/react";
import { usePageGate } from "../usePageGate";
import { GATED_COPY } from "../gated-page-copy";

let mockUser: { uid: string } | null = { uid: "user-1" };
let mockIsResolving = false;
let mockMissingContext: "group" | "campaign" | null = null;

jest.mock("features/user-management", () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock("shared/hooks/useCampaignContextStatus", () => ({
  useCampaignContextStatus: () => ({
    isResolving: mockIsResolving,
    hasRequiredContext: !mockIsResolving && mockMissingContext === null,
    missingContext: mockIsResolving ? null : mockMissingContext,
  }),
}));

beforeEach(() => {
  mockUser = { uid: "user-1" };
  mockIsResolving = false;
  mockMissingContext = null;
});

describe("usePageGate", () => {
  it("is ready when signed in with a campaign and no error", () => {
    const { result } = renderHook(() => usePageGate("quests"));
    expect(result.current.state).toBe("ready");
    expect(result.current.canAct).toBe(true);
  });

  it("reports resolving while auth is still restoring, even with no user yet", () => {
    // The whole point of state 1: on a fresh load there is no user object yet,
    // and claiming "signed out" here is the flash this PR removes.
    mockIsResolving = true;
    mockUser = null;
    const { result } = renderHook(() => usePageGate("quests"));
    expect(result.current.state).toBe("resolving");
  });

  it("reports resolving while the caller's own fetch is in flight", () => {
    const { result } = renderHook(() =>
      usePageGate("quests", { loading: true })
    );
    expect(result.current.state).toBe("resolving");
  });

  it("reports signed-out ahead of a missing campaign", () => {
    // Signed out is why the campaign is missing; naming the campaign would
    // send the visitor looking for a switcher the header does not render.
    mockUser = null;
    mockMissingContext = "group";
    const { result } = renderHook(() => usePageGate("quests"));
    expect(result.current.state).toBe("signed-out");
  });

  it("reports signed-out ahead of an error", () => {
    mockUser = null;
    const { result } = renderHook(() =>
      usePageGate("quests", { error: "Error Loading Quests" })
    );
    expect(result.current.state).toBe("signed-out");
  });

  it("reports pick-campaign when signed in with no group", () => {
    mockMissingContext = "group";
    const { result } = renderHook(() => usePageGate("quests"));
    expect(result.current.state).toBe("pick-campaign");
    expect(result.current.canAct).toBe(false);
  });

  it("reports pick-campaign when signed in with a group but no campaign", () => {
    mockMissingContext = "campaign";
    const { result } = renderHook(() => usePageGate("quests"));
    expect(result.current.state).toBe("pick-campaign");
  });

  it("is ready for notes when a group is chosen but no campaign is", () => {
    // Notes needs a group only -- see GATED_COPY.notes.requires.
    mockMissingContext = "campaign";
    const { result } = renderHook(() => usePageGate("notes"));
    expect(result.current.state).toBe("ready");
  });

  it("still gates notes when no group is chosen", () => {
    mockMissingContext = "group";
    const { result } = renderHook(() => usePageGate("notes"));
    expect(result.current.state).toBe("pick-campaign");
  });

  it("reports error last, once everything else has settled", () => {
    const { result } = renderHook(() =>
      usePageGate("quests", { error: "Network down" })
    );
    expect(result.current.state).toBe("error");
    expect(result.current.error).toBe("Network down");
    expect(result.current.canAct).toBe(false);
  });

  it("carries the page's copy and read heading", () => {
    const { result } = renderHook(() => usePageGate("rumors"));
    expect(result.current.copy).toBe(GATED_COPY.rumors);
    expect(result.current.heading).toBe(GATED_COPY.rumors.heading);
  });

  it("carries the write heading in write mode", () => {
    const { result } = renderHook(() =>
      usePageGate("rumors", { mode: "write" })
    );
    expect(result.current.heading).toBe(GATED_COPY.rumors.writeHeading);
    expect(result.current.mode).toBe("write");
  });

  it("passes the retry callback through untouched", () => {
    const onRetry = jest.fn();
    const { result } = renderHook(() =>
      usePageGate("quests", { error: "boom", onRetry })
    );
    expect(result.current.onRetry).toBe(onRetry);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="usePageGate"`
Expected: FAIL — `Cannot find module '../usePageGate'`

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/components/gated/usePageGate.ts
import { useMemo } from "react";
import { useAuth } from "features/user-management";
import { useCampaignContextStatus } from "shared/hooks/useCampaignContextStatus";
import {
  GATED_COPY,
  gatedHeading,
  GatedPageCopy,
  GatedPageKey,
} from "./gated-page-copy";

/**
 * Where a page is in the five-state ladder.
 *
 * `ready` is the sixth value and the only one that renders the page's own
 * content; the empty-campaign state is deliberately not here, because an empty
 * campaign is a *successful* load whose copy belongs to the directory that
 * knows what is missing ("Add the first quest").
 */
export type GateState =
  | "resolving"
  | "signed-out"
  | "pick-campaign"
  | "error"
  | "ready";

/** What a page needs to render every state consistently. */
export interface PageGate {
  state: GateState;
  /**
   * `state === "ready"`. Gates every control that acts on data — create
   * buttons, filters, sorts, progress bars, bulk-select.
   *
   * It lives on the gate rather than inside a wrapper component because those
   * controls sit in the page *header*, above the gated body, where a wrapper
   * that swallows children cannot reach them.
   */
  canAct: boolean;
  page: GatedPageKey;
  mode: "read" | "write";
  copy: GatedPageCopy;
  /** `copy.heading` or `copy.writeHeading`, already resolved for `mode`. */
  heading: string;
  error: string | null;
  onRetry?: () => void;
}

/** Everything a page can tell the gate about its own fetch. */
export interface PageGateOptions {
  /** The caller's own loading flag, folded into `resolving`. */
  loading?: boolean;
  /** The caller's own fetch error. */
  error?: string | null;
  /** Retry handler, rendered as a button in the error state. */
  onRetry?: () => void;
  /** `"write"` on create and edit routes. Defaults to `"read"`. */
  mode?: "read" | "write";
}

/**
 * The one place the gated-state ladder is written down.
 *
 * Order matters and is the spec's table, top to bottom, first match winning:
 *
 * 1. `resolving` — auth/group/campaign restoration, or the caller's own fetch.
 * 2. `signed-out` — no user. Ahead of the context check on purpose: being
 *    signed out is *why* there is no campaign, and naming the campaign sends
 *    the visitor looking for a switcher `Header` only renders for members.
 * 3. `pick-campaign` — signed in, but the selection this page needs is absent.
 * 4. `error` — a real failure, once everything above has settled.
 * 5. `ready`.
 *
 * @param page Which page's copy to use
 * @param options The caller's own loading/error state and route mode
 * @returns The page's gate
 */
export function usePageGate(
  page: GatedPageKey,
  options: PageGateOptions = {}
): PageGate {
  const { loading = false, error = null, onRetry, mode = "read" } = options;

  const { user } = useAuth();
  const { isResolving, missingContext } = useCampaignContextStatus();
  const copy = GATED_COPY[page];

  return useMemo(() => {
    // `missingContext` is already null while resolution is in flight (bug
    // #1413), so this can only be true once the selection has settled on
    // nothing. A group-only page ignores a missing campaign entirely.
    const contextMissing =
      copy.requires === "campaign"
        ? missingContext !== null
        : missingContext === "group";

    const state: GateState =
      isResolving || loading
        ? "resolving"
        : !user
        ? "signed-out"
        : contextMissing
        ? "pick-campaign"
        : error
        ? "error"
        : "ready";

    return {
      state,
      canAct: state === "ready",
      page,
      mode,
      copy,
      heading: gatedHeading(copy, mode),
      error,
      onRetry,
    };
  }, [copy, isResolving, loading, user, missingContext, error, onRetry, page, mode]);
}

export default usePageGate;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="usePageGate"`
Expected: PASS, 13 tests

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/gated/usePageGate.ts \
        src/shared/components/gated/__tests__/usePageGate.test.ts
git commit -m "feat(gated): collapse auth and campaign context into one page gate"
```

---

### Task 3: `PageShell`

**Files:**
- Create: `src/shared/components/page-shell/PageShell.tsx`
- Test: `src/shared/components/page-shell/__tests__/PageShell.test.tsx`

**Interfaces:**
- Consumes: `Typography` from `core/components/Typography`.
- Produces: `PageShellProps`, default export `PageShell`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/components/page-shell/__tests__/PageShell.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import PageShell from "../PageShell";

describe("PageShell", () => {
  it("renders the title as the page's h1", () => {
    render(
      <PageShell title="Quests">
        <div>body</div>
      </PageShell>
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Quests" })
    ).toBeInTheDocument();
  });

  it("renders the subtitle when given one", () => {
    render(
      <PageShell title="Quests" subtitle="Track and complete the party's quests">
        <div>body</div>
      </PageShell>
    );
    expect(
      screen.getByText("Track and complete the party's quests")
    ).toBeInTheDocument();
  });

  it("renders children below the header", () => {
    render(
      <PageShell title="Quests">
        <div data-testid="body">body</div>
      </PageShell>
    );
    expect(screen.getByTestId("body")).toBeInTheDocument();
  });

  it("renders actions when given them", () => {
    render(
      <PageShell title="Quests" actions={<button>Create Quest</button>}>
        <div>body</div>
      </PageShell>
    );
    expect(
      screen.getByRole("button", { name: "Create Quest" })
    ).toBeInTheDocument();
  });

  it("renders no action slot when actions is false", () => {
    // Pages pass `actions={gate.canAct && <Button/>}`, so `false` is the
    // ordinary signal for "this control cannot act right now" -- it must not
    // reach the DOM as the string "false" or as an empty flex row.
    const { container } = render(
      <PageShell title="Quests" actions={false}>
        <div>body</div>
      </PageShell>
    );
    expect(container.textContent).not.toContain("false");
    expect(container.querySelectorAll("header > div")).toHaveLength(1);
  });

  it("renders a breadcrumb above the title when given one", () => {
    render(
      <PageShell title="Quests" breadcrumb={<nav aria-label="Breadcrumb" />}>
        <div>body</div>
      </PageShell>
    );
    expect(screen.getByLabelText("Breadcrumb")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="PageShell"`
Expected: FAIL — `Cannot find module '../PageShell'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/shared/components/page-shell/PageShell.tsx
import React, { ReactNode } from "react";
import clsx from "clsx";
import Typography from "core/components/Typography";

/** Props for {@link PageShell}. */
export interface PageShellProps {
  /** The page's name. Always rendered as the document's `h1`. */
  title: string;
  /** One line under the title saying what the page is for. */
  subtitle?: ReactNode;
  /**
   * Controls that act on the page's data.
   *
   * Pages pass `gate.canAct && <Button/>`, so `false` is the ordinary value in
   * the signed-out and pick-campaign states and must render nothing at all.
   */
  actions?: ReactNode;
  /** Optional breadcrumb, rendered above the title. */
  breadcrumb?: ReactNode;
  /** Extra classes for the outer container. */
  className?: string;
  children: ReactNode;
}

/**
 * The header and container every gated page shares.
 *
 * Its whole reason for existing is the guarantee that the title and subtitle
 * render in *every* state — including the signed-out and pick-campaign ones,
 * where each page previously returned an early `<Card>` centred in an otherwise
 * empty viewport, so you could not tell which page you were looking at.
 *
 * It also ends the drift in heading level: the page title was `h1` on four
 * pages, `h2` on the rest.
 */
const PageShell: React.FC<PageShellProps> = ({
  title,
  subtitle,
  actions,
  breadcrumb,
  className,
  children,
}) => (
  <div className={clsx("max-w-7xl mx-auto px-4 py-8", className)}>
    {breadcrumb}
    <header className="mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
      <div>
        <Typography variant="h1" className="mb-2">
          {title}
        </Typography>
        {subtitle && <Typography color="secondary">{subtitle}</Typography>}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </header>
    {children}
  </div>
);

export default PageShell;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="PageShell"`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/page-shell/
git commit -m "feat(shell): render page title and subtitle in every state"
```

---

## Batch 1 — panel and data (2 subagents, parallel)

### Task 4: `GatedPageState` *(subagent A)*

**Files:**
- Create: `src/shared/components/gated/GatedPageState.tsx`
- Test: `src/shared/components/gated/__tests__/GatedPageState.test.tsx`

**Interfaces:**
- Consumes: `Button` from `core/components/Button`, `Typography` from `core/components/Typography`, `GATED_FOOTNOTE` from `./gated-page-copy`, **`CampaignOption` from `./types`** (Task 1 created it — import it, do not redefine it), `Link` from `react-router-dom`, `Lock` from `lucide-react`.
- Produces: `GatedPageStateProps`, default export `GatedPageState`. Re-export the type for convenience: `export type { CampaignOption } from "./types";`

**This component is presentational.** It calls no data hook and no Firebase service. Everything arrives as props. That is what lets its test render it with a plain object instead of standing up the auth/group/campaign mock chain.

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/components/gated/__tests__/GatedPageState.test.tsx
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GatedPageState, { CampaignOption } from "../GatedPageState";

const OPTIONS: CampaignOption[] = [
  {
    campaignId: "c-1",
    campaignName: "Phandelver",
    groupId: "g-1",
    groupName: "The Fellowship",
  },
  {
    campaignId: "c-2",
    campaignName: "Curse of Strahd",
    groupId: "g-2",
    groupName: "The Council",
  },
];

const renderPanel = (props: Partial<React.ComponentProps<typeof GatedPageState>> = {}) =>
  render(
    <MemoryRouter>
      <GatedPageState
        variant="signed-out"
        heading="Sign in to see your party's quests"
        blurb="Quests are the open threads of a campaign."
        onSignIn={jest.fn()}
        onJoinGroup={jest.fn()}
        {...props}
      />
    </MemoryRouter>
  );

describe("GatedPageState, signed out", () => {
  it("labels the page as a private campaign", () => {
    renderPanel();
    expect(screen.getByText(/private campaign/i)).toBeInTheDocument();
  });

  it("renders the page's heading and blurb", () => {
    renderPanel();
    expect(
      screen.getByRole("heading", { name: "Sign in to see your party's quests" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Quests are the open threads of a campaign.")
    ).toBeInTheDocument();
  });

  it("offers signing in and an invite link, and nothing else", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /invite link/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("calls onSignIn when the primary action is used", () => {
    const onSignIn = jest.fn();
    renderPanel({ onSignIn });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it("calls onJoinGroup when the invite action is used", () => {
    const onJoinGroup = jest.fn();
    renderPanel({ onJoinGroup });
    fireEvent.click(screen.getByRole("button", { name: /invite link/i }));
    expect(onJoinGroup).toHaveBeenCalledTimes(1);
  });

  it("explains the product to a newcomer and links to the explainer", () => {
    renderPanel();
    expect(screen.getByText(/join link/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /what it does/i })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("never lists campaigns", () => {
    renderPanel({ campaigns: OPTIONS });
    expect(screen.queryByText("Phandelver")).not.toBeInTheDocument();
  });
});

describe("GatedPageState, pick campaign", () => {
  const pickProps = {
    variant: "pick-campaign" as const,
    heading: "unused",
    blurb: "unused",
    hasGroups: true,
    campaigns: OPTIONS,
    onSelectCampaign: jest.fn(),
  };

  it("asks which campaign, not to go and select one elsewhere", () => {
    renderPanel(pickProps);
    expect(
      screen.getByRole("heading", { name: /which campaign/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/please select/i)).not.toBeInTheDocument();
  });

  it("lists every campaign with the group it belongs to", () => {
    renderPanel(pickProps);
    const phandelver = screen.getByRole("button", { name: /Phandelver/ });
    expect(within(phandelver).getByText(/The Fellowship/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Curse of Strahd/ })
    ).toBeInTheDocument();
  });

  it("makes the selection here, as buttons", () => {
    const onSelectCampaign = jest.fn();
    renderPanel({ ...pickProps, onSelectCampaign });
    fireEvent.click(screen.getByRole("button", { name: /Phandelver/ }));
    expect(onSelectCampaign).toHaveBeenCalledWith(OPTIONS[0]);
  });

  it("counts the campaigns in the singular when there is one", () => {
    renderPanel({ ...pickProps, campaigns: [OPTIONS[0]] });
    expect(screen.getByText(/you're in one campaign\b/i)).toBeInTheDocument();
  });

  it("says there are no campaigns yet rather than showing an empty list", () => {
    renderPanel({ ...pickProps, campaigns: [] });
    expect(
      screen.getByRole("heading", { name: /no campaigns yet/i })
    ).toBeInTheDocument();
  });

  it("offers joining a group when the user belongs to none", () => {
    renderPanel({ ...pickProps, hasGroups: false, campaigns: [] });
    expect(
      screen.getByRole("heading", { name: /join a group/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /invite link/i })
    ).toBeInTheDocument();
  });

  it("shows a switch failure without dropping the list", () => {
    renderPanel({ ...pickProps, selectError: "Could not open that campaign." });
    expect(
      screen.getByText("Could not open that campaign.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Phandelver/ })
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="GatedPageState"`
Expected: FAIL — `Cannot find module '../GatedPageState'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/shared/components/gated/GatedPageState.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import Button from "core/components/Button";
import Typography from "core/components/Typography";
import { GATED_FOOTNOTE } from "./gated-page-copy";
import type { CampaignOption } from "./types";

export type { CampaignOption } from "./types";

/** Props for {@link GatedPageState}. */
export interface GatedPageStateProps {
  variant: "signed-out" | "pick-campaign";
  /** Already resolved for read/write mode by `usePageGate`. */
  heading: string;
  blurb: string;
  onSignIn: () => void;
  onJoinGroup: () => void;
  /** Campaigns to offer. `pick-campaign` only. */
  campaigns?: CampaignOption[];
  /** Whether the user belongs to any group at all. `pick-campaign` only. */
  hasGroups?: boolean;
  /** Whether the campaign list is still being fetched. */
  campaignsLoading?: boolean;
  /** A failed switch, rendered above the list without clearing it. */
  selectError?: string | null;
  onSelectCampaign?: (option: CampaignOption) => void;
}

/** Small-caps eyebrow above the heading. */
const Eyebrow: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <div className="flex items-center gap-2 mb-4">
    {icon}
    <span className="text-xs font-semibold uppercase tracking-widest typography-muted">
      {children}
    </span>
  </div>
);

/**
 * The panel a page shows when it cannot show its content yet.
 *
 * One component, one layout, on all 21 gated routes — only the heading and one
 * sentence change. It replaces per-page cards that variously said "No Group
 * Selected", "Please select a group to view NPCs" and "No Active Group or
 * Campaign", three of which were shown to signed-out visitors who had no
 * switcher on screen to act on them.
 *
 * Presentational by design: no data hooks, no services. `GatedContent` owns the
 * fetching, the dialogs and the switch.
 */
const GatedPageState: React.FC<GatedPageStateProps> = ({
  variant,
  heading,
  blurb,
  onSignIn,
  onJoinGroup,
  campaigns = [],
  hasGroups = false,
  campaignsLoading = false,
  selectError = null,
  onSelectCampaign,
}) => {
  const isSignedOut = variant === "signed-out";

  // Which of the three pick-campaign situations we are in. Kept as one value
  // so the heading, the line and the actions cannot disagree with each other.
  const pickSituation = !hasGroups
    ? "no-groups"
    : campaigns.length === 0
    ? "no-campaigns"
    : "choose";

  const pickHeading =
    pickSituation === "no-groups"
      ? "Join a group"
      : pickSituation === "no-campaigns"
      ? "No campaigns yet"
      : "Which campaign?";

  const pickLine =
    pickSituation === "no-groups"
      ? "The Companion is invite-only. Ask your DM for a join link."
      : pickSituation === "no-campaigns"
      ? "A group admin creates the first campaign; once there is one, it appears here."
      : `You're in ${campaigns.length === 1 ? "one campaign" : `${campaigns.length} campaigns`}. ` +
        "Pick one and this page fills in — you can change it any time from the " +
        "campaign name in the header.";

  return (
    <div className="mx-auto w-full max-w-[560px] rounded-lg p-8 card">
      {isSignedOut ? (
        <Eyebrow icon={<Lock className="w-4 h-4 typography-muted" aria-hidden="true" />}>
          Private campaign
        </Eyebrow>
      ) : (
        <Eyebrow>Signed in · no campaign chosen</Eyebrow>
      )}

      <Typography variant="h2" className="mb-4 typography-heading">
        {isSignedOut ? heading : pickHeading}
      </Typography>

      <Typography color="secondary" className="mb-6">
        {isSignedOut ? blurb : pickLine}
      </Typography>

      {isSignedOut ? (
        <>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={onSignIn}>
              Sign in
            </Button>
            <Button variant="outline" onClick={onJoinGroup}>
              I have an invite link
            </Button>
          </div>

          <hr className="my-6 divider" />

          <Typography variant="body-sm" color="secondary">
            {GATED_FOOTNOTE}{" "}
            <Link to="/" className="font-semibold primary">
              What it does
            </Link>
          </Typography>
        </>
      ) : (
        <>
          {selectError && (
            <Typography color="error" className="mb-4">
              {selectError}
            </Typography>
          )}

          {pickSituation === "choose" && (
            <ul className="space-y-2">
              {campaigns.map((option) => (
                <li key={`${option.groupId}:${option.campaignId}`}>
                  <button
                    type="button"
                    onClick={() => onSelectCampaign?.(option)}
                    className="w-full flex items-baseline gap-2 rounded-md px-4 py-3 text-left selectable-item card-border"
                  >
                    <span className="font-semibold">{option.campaignName}</span>
                    <span className="text-sm typography-secondary">
                      · {option.groupName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {pickSituation === "choose" && campaignsLoading && (
            <Typography variant="body-sm" color="secondary" className="mt-3">
              Still looking for more campaigns…
            </Typography>
          )}

          {pickSituation === "no-groups" && (
            <Button variant="primary" onClick={onJoinGroup}>
              I have an invite link
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default GatedPageState;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="GatedPageState"`
Expected: PASS, 14 tests

If `Typography` rejects `variant="body-sm"`, check the union in `src/core/components/Typography.tsx:9-33` and use the nearest existing small-body variant rather than adding one.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/gated/GatedPageState.tsx \
        src/shared/components/gated/__tests__/GatedPageState.test.tsx
git commit -m "feat(gated): one panel for signed-out and no-campaign, on every page"
```

---

### Task 5: `useSelectableCampaigns` *(subagent B)*

**Files:**
- Create: `src/shared/components/gated/useSelectableCampaigns.ts`
- Test: `src/shared/components/gated/__tests__/useSelectableCampaigns.test.ts`

**Interfaces:**
- Consumes: `useGroups()` from `features/user-management`; `firebaseServices` (default export) from `core/services/firebase`; **`CampaignOption` from `./types`** — Task 1 created that file, so it exists before you start. Import it; do not redeclare it, and do not import it from `./GatedPageState`, which another implementer may be writing right now.
- Produces: `SelectableCampaigns`, `useSelectableCampaigns(enabled)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/components/gated/__tests__/useSelectableCampaigns.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useSelectableCampaigns } from "../useSelectableCampaigns";

let mockGroups: Array<{ id: string; name: string }> = [];

jest.mock("features/user-management", () => ({
  useGroups: () => ({ groups: mockGroups }),
}));

const mockGetCampaigns = jest.fn();

jest.mock("core/services/firebase", () => ({
  __esModule: true,
  default: {
    campaign: {
      getCampaigns: (groupId: string) => mockGetCampaigns(groupId),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGroups = [
    { id: "g-1", name: "The Fellowship" },
    { id: "g-2", name: "The Council" },
  ];
  mockGetCampaigns.mockImplementation((groupId: string) =>
    Promise.resolve(
      groupId === "g-1"
        ? [{ id: "c-1", name: "Phandelver" }]
        : [{ id: "c-2", name: "Curse of Strahd" }]
    )
  );
});

describe("useSelectableCampaigns", () => {
  it("fetches nothing until it is enabled", () => {
    renderHook(() => useSelectableCampaigns(false));
    expect(mockGetCampaigns).not.toHaveBeenCalled();
  });

  it("merges campaigns from every group the user belongs to", async () => {
    const { result } = renderHook(() => useSelectableCampaigns(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options).toEqual([
      {
        campaignId: "c-2",
        campaignName: "Curse of Strahd",
        groupId: "g-2",
        groupName: "The Council",
      },
      {
        campaignId: "c-1",
        campaignName: "Phandelver",
        groupId: "g-1",
        groupName: "The Fellowship",
      },
    ]);
  });

  it("asks each group exactly once", async () => {
    const { result } = renderHook(() => useSelectableCampaigns(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetCampaigns).toHaveBeenCalledTimes(2);
    expect(mockGetCampaigns).toHaveBeenCalledWith("g-1");
    expect(mockGetCampaigns).toHaveBeenCalledWith("g-2");
  });

  it("drops only the failing group's rows, not the whole list", async () => {
    // Same failure policy as useGroupSummaries: a row is decoration, and one
    // group's permissions problem must not blank a list the user can act on.
    mockGetCampaigns.mockImplementation((groupId: string) =>
      groupId === "g-1"
        ? Promise.reject(new Error("permission-denied"))
        : Promise.resolve([{ id: "c-2", name: "Curse of Strahd" }])
    );
    const { result } = renderHook(() => useSelectableCampaigns(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options).toHaveLength(1);
    expect(result.current.options[0].campaignId).toBe("c-2");
  });

  it("finishes loading with an empty list when the user has no groups", async () => {
    mockGroups = [];
    const { result } = renderHook(() => useSelectableCampaigns(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options).toEqual([]);
    expect(mockGetCampaigns).not.toHaveBeenCalled();
  });

  it("sorts by group, then by campaign", async () => {
    mockGroups = [{ id: "g-1", name: "The Fellowship" }];
    mockGetCampaigns.mockResolvedValue([
      { id: "c-b", name: "Zephyr" },
      { id: "c-a", name: "Avernus" },
    ]);
    const { result } = renderHook(() => useSelectableCampaigns(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options.map((o) => o.campaignName)).toEqual([
      "Avernus",
      "Zephyr",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="useSelectableCampaigns"`
Expected: FAIL — `Cannot find module '../useSelectableCampaigns'`

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/components/gated/useSelectableCampaigns.ts
import { useEffect, useMemo, useState } from "react";
import { useGroups } from "features/user-management";
import firebaseServices from "core/services/firebase";
import type { CampaignOption } from "./types";

/** What {@link useSelectableCampaigns} returns. */
export interface SelectableCampaigns {
  /** Every campaign the user could switch to, sorted by group then name. */
  options: CampaignOption[];
  /** True while any group's campaigns are still in flight. */
  loading: boolean;
}

/** The two fields a row needs, kept per group id while fetching. */
type FetchedCampaign = { id: string; name: string };

/**
 * Every campaign the signed-in user could switch to, across all their groups.
 *
 * `useCampaigns()` only holds the *active* group's campaigns, which is exactly
 * the wrong list here: the page is in this state because no campaign — and
 * possibly no group — is active. Offering only the active group's campaigns
 * would show an empty panel to someone who does have campaigns, just elsewhere.
 *
 * Follows `useGroupSummaries`' shape deliberately, including its failure
 * policy: a group whose fetch rejects contributes no rows rather than failing
 * the list, because one group's permissions problem must not blank a list the
 * user can still act on.
 *
 * @param enabled Whether to fetch at all — true only while the pick-campaign
 *   panel is actually showing, so the pages that never reach it pay nothing
 * @returns The merged options and whether they are still arriving
 */
export function useSelectableCampaigns(enabled: boolean): SelectableCampaigns {
  const { groups } = useGroups();
  const [byGroup, setByGroup] = useState<Record<string, FetchedCampaign[]>>({});
  const [loading, setLoading] = useState(false);

  // Identity of `groups` changes on every render; the ids do not.
  const key = groups.map((group) => group.id).join(",");

  useEffect(() => {
    if (!enabled) return;

    if (!key) {
      setByGroup({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(
      key.split(",").map((groupId) =>
        firebaseServices.campaign
          .getCampaigns(groupId)
          .then((campaigns: FetchedCampaign[]) => ({ groupId, campaigns }))
          .catch(() => ({ groupId, campaigns: [] as FetchedCampaign[] }))
      )
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, FetchedCampaign[]> = {};
      results.forEach(({ groupId, campaigns }) => {
        next[groupId] = campaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
        }));
      });
      setByGroup(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, key]);

  // Group names are read here rather than captured in the effect, so a rename
  // between fetch and render shows the current name.
  const options = useMemo(() => {
    const rows: CampaignOption[] = [];
    groups.forEach((group) => {
      (byGroup[group.id] ?? []).forEach((campaign) => {
        rows.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          groupId: group.id,
          groupName: group.name,
        });
      });
    });

    return rows.sort(
      (a, b) =>
        a.groupName.localeCompare(b.groupName) ||
        a.campaignName.localeCompare(b.campaignName)
    );
  }, [groups, byGroup]);

  return { options, loading };
}

export default useSelectableCampaigns;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="useSelectableCampaigns"`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/gated/useSelectableCampaigns.ts \n        src/shared/components/gated/__tests__/useSelectableCampaigns.test.ts
git commit -m "feat(gated): list campaigns across every group for the picker"
```

---

## Batch 2 — wiring and Home (2 subagents, parallel)

### Task 6: `GatedContent` and the barrel *(subagent A)*

**Files:**
- Create: `src/shared/components/gated/GatedContent.tsx`
- Create: `src/shared/components/gated/index.ts`
- Test: `src/shared/components/gated/__tests__/GatedContent.test.tsx`

**Interfaces:**
- Consumes: `PageGate` (Task 2), `GatedPageState` + `CampaignOption` (Task 4), `useSelectableCampaigns` (Task 5), `useGroups`/`useCampaigns`/`SignInForm`/`JoinGroupDialog` from `features/user-management`, `Dialog` from `core/components/Dialog`, `Button`, `Typography`.
- Produces: `GatedContentProps`, default export `GatedContent`; barrel re-exporting `usePageGate`, `GatedContent`, `GatedPageState`, `GATED_COPY`, and the types `PageGate`, `GateState`, `GatedPageKey`, `CampaignOption`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/components/gated/__tests__/GatedContent.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GatedContent from "../GatedContent";
import { GATED_COPY } from "../gated-page-copy";
import type { PageGate } from "../usePageGate";

const mockSetActiveGroup = jest.fn().mockResolvedValue(undefined);
const mockSetActiveCampaign = jest.fn().mockResolvedValue(undefined);
let mockActiveGroupId: string | null = "g-1";

jest.mock("features/user-management", () => ({
  useGroups: () => ({
    groups: [{ id: "g-1", name: "The Fellowship" }],
    activeGroupId: mockActiveGroupId,
    setActiveGroup: mockSetActiveGroup,
  }),
  useCampaigns: () => ({ setActiveCampaign: mockSetActiveCampaign }),
  SignInForm: () => <div data-testid="sign-in-form" />,
  JoinGroupDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-group-dialog" /> : null,
}));

let mockOptions = [
  {
    campaignId: "c-1",
    campaignName: "Phandelver",
    groupId: "g-1",
    groupName: "The Fellowship",
  },
];

jest.mock("../useSelectableCampaigns", () => ({
  useSelectableCampaigns: (enabled: boolean) => ({
    options: enabled ? mockOptions : [],
    loading: false,
  }),
}));

const gate = (overrides: Partial<PageGate> = {}): PageGate => ({
  state: "ready",
  canAct: true,
  page: "quests",
  mode: "read",
  copy: GATED_COPY.quests,
  heading: GATED_COPY.quests.heading,
  error: null,
  ...overrides,
});

const renderGate = (value: PageGate) =>
  render(
    <MemoryRouter>
      <GatedContent gate={value}>
        <div data-testid="page-body">the quests</div>
      </GatedContent>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockActiveGroupId = "g-1";
  mockOptions = [
    {
      campaignId: "c-1",
      campaignName: "Phandelver",
      groupId: "g-1",
      groupName: "The Fellowship",
    },
  ];
});

describe("GatedContent", () => {
  it("renders the page body when ready", () => {
    renderGate(gate());
    expect(screen.getByTestId("page-body")).toBeInTheDocument();
  });

  it("renders a skeleton and no message while resolving", () => {
    renderGate(gate({ state: "resolving", canAct: false }));
    expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("page-body")).not.toBeInTheDocument();
    // The flash this PR removes: no "please select" copy during restore.
    expect(screen.queryByText(/sign in to/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/which campaign/i)).not.toBeInTheDocument();
  });

  it("renders the signed-out panel instead of the body", () => {
    renderGate(gate({ state: "signed-out", canAct: false }));
    expect(
      screen.getByRole("heading", { name: GATED_COPY.quests.heading })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("page-body")).not.toBeInTheDocument();
  });

  it("opens the sign-in dialog from the panel", () => {
    renderGate(gate({ state: "signed-out", canAct: false }));
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(screen.getByTestId("sign-in-form")).toBeInTheDocument();
  });

  it("opens the join-group dialog from the panel", () => {
    renderGate(gate({ state: "signed-out", canAct: false }));
    fireEvent.click(screen.getByRole("button", { name: /invite link/i }));
    expect(screen.getByTestId("join-group-dialog")).toBeInTheDocument();
  });

  it("renders the campaign picker instead of the body", () => {
    renderGate(gate({ state: "pick-campaign", canAct: false }));
    expect(
      screen.getByRole("heading", { name: /which campaign/i })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("page-body")).not.toBeInTheDocument();
  });

  it("switches campaign without touching the group when it is the active one", async () => {
    renderGate(gate({ state: "pick-campaign", canAct: false }));
    fireEvent.click(screen.getByRole("button", { name: /Phandelver/ }));
    await waitFor(() =>
      expect(mockSetActiveCampaign).toHaveBeenCalledWith("c-1")
    );
    expect(mockSetActiveGroup).not.toHaveBeenCalled();
  });

  it("switches group first when the campaign is in another group", async () => {
    mockActiveGroupId = "g-2";
    renderGate(gate({ state: "pick-campaign", canAct: false }));
    fireEvent.click(screen.getByRole("button", { name: /Phandelver/ }));
    await waitFor(() => expect(mockSetActiveGroup).toHaveBeenCalledWith("g-1"));
    await waitFor(() =>
      expect(mockSetActiveCampaign).toHaveBeenCalledWith("c-1")
    );
  });

  it("shows a failed switch in the panel", async () => {
    mockSetActiveCampaign.mockRejectedValueOnce(new Error("offline"));
    renderGate(gate({ state: "pick-campaign", canAct: false }));
    fireEvent.click(screen.getByRole("button", { name: /Phandelver/ }));
    expect(await screen.findByText("offline")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Phandelver/ })
    ).toBeInTheDocument();
  });

  it("names what failed to load in the error state", () => {
    renderGate(gate({ state: "error", canAct: false, error: "Network down" }));
    expect(screen.getByText(/couldn't load quests/i)).toBeInTheDocument();
    expect(screen.getByText("Network down")).toBeInTheDocument();
  });

  it("offers a retry only when the page gave it one", () => {
    const onRetry = jest.fn();
    const { rerender } = renderGate(
      gate({ state: "error", canAct: false, error: "Network down", onRetry })
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <GatedContent gate={gate({ state: "error", canAct: false, error: "x" })}>
          <div data-testid="page-body">the quests</div>
        </GatedContent>
      </MemoryRouter>
    );
    expect(
      screen.queryByRole("button", { name: /try again/i })
    ).not.toBeInTheDocument();
  });

  it("uses the write heading on a create route", () => {
    renderGate(
      gate({
        state: "signed-out",
        canAct: false,
        mode: "write",
        heading: GATED_COPY.quests.writeHeading as string,
      })
    );
    expect(
      screen.getByRole("heading", {
        name: GATED_COPY.quests.writeHeading as string,
      })
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="GatedContent"`
Expected: FAIL — `Cannot find module '../GatedContent'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/shared/components/gated/GatedContent.tsx
import React, { useState } from "react";
import {
  useGroups,
  useCampaigns,
  SignInForm,
  JoinGroupDialog,
} from "features/user-management";
import Dialog from "core/components/Dialog";
import Button from "core/components/Button";
import Typography from "core/components/Typography";
import GatedPageState from "./GatedPageState";
import type { CampaignOption } from "./types";
import { useSelectableCampaigns } from "./useSelectableCampaigns";
import type { PageGate } from "./usePageGate";

/** Props for {@link GatedContent}. */
export interface GatedContentProps {
  /** The page's gate, from `usePageGate`. */
  gate: PageGate;
  /** What to render once the gate is `ready`. */
  children: React.ReactNode;
}

/**
 * A skeleton, not a message.
 *
 * State 1 exists precisely so that nothing is *claimed* while the answer is
 * unknown — every "please select a group" flash on a fresh page load came from
 * a page rendering its state-3 copy during restore. The blocks are hidden from
 * assistive technology and the status role carries the meaning instead.
 */
const Skeleton: React.FC = () => (
  <div role="status" aria-busy="true" data-testid="gated-skeleton">
    <span className="sr-only">Loading</span>
    <div className="space-y-4" aria-hidden="true">
      <div className="h-10 w-1/3 rounded animate-pulse bg-secondary" />
      <div className="h-24 rounded animate-pulse bg-secondary" />
      <div className="h-24 rounded animate-pulse bg-secondary" />
    </div>
  </div>
);

/**
 * Renders whichever of the gated states the page is in, or its content.
 *
 * Owns the two dialogs, the cross-group campaign fetch and the switch, so a
 * page adopting the gate writes two lines and wires no dialog state of its own.
 */
const GatedContent: React.FC<GatedContentProps> = ({ gate, children }) => {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);

  const { groups, activeGroupId, setActiveGroup } = useGroups();
  const { setActiveCampaign } = useCampaigns();

  const isPicking = gate.state === "pick-campaign";
  const { options, loading: campaignsLoading } = useSelectableCampaigns(isPicking);

  /**
   * Switch to the chosen campaign, moving group first when it lives elsewhere.
   *
   * The order matters: `setActiveGroup` loads that group's campaigns and
   * activates one, so calling it second would overwrite the campaign we just
   * chose. Same-group picks skip it entirely.
   */
  const handleSelectCampaign = async (option: CampaignOption) => {
    setSelectError(null);
    try {
      if (option.groupId !== activeGroupId) {
        await setActiveGroup(option.groupId);
      }
      await setActiveCampaign(option.campaignId);
    } catch (error) {
      setSelectError(
        error instanceof Error ? error.message : "Could not open that campaign."
      );
    }
  };

  const panel =
    gate.state === "signed-out" || isPicking ? (
      <GatedPageState
        variant={gate.state === "signed-out" ? "signed-out" : "pick-campaign"}
        heading={gate.heading}
        blurb={gate.copy.blurb}
        onSignIn={() => setShowSignIn(true)}
        onJoinGroup={() => setShowJoinGroup(true)}
        campaigns={options}
        hasGroups={groups.length > 0}
        campaignsLoading={campaignsLoading}
        selectError={selectError}
        onSelectCampaign={handleSelectCampaign}
      />
    ) : null;

  return (
    <>
      {gate.state === "resolving" && <Skeleton />}

      {panel}

      {gate.state === "error" && (
        <div className="mx-auto w-full max-w-[560px] rounded-lg p-8 card">
          <Typography variant="h3" className="mb-2">
            Couldn't load {gate.copy.noun}.
          </Typography>
          <Typography color="error" className="mb-6">
            {gate.error}
          </Typography>
          {gate.onRetry && (
            <Button variant="primary" onClick={gate.onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}

      {gate.state === "ready" && children}

      <Dialog
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        title="Sign In"
        maxWidth="max-w-md"
      >
        <SignInForm onSuccess={() => setShowSignIn(false)} />
      </Dialog>

      <JoinGroupDialog
        open={showJoinGroup}
        onClose={() => setShowJoinGroup(false)}
        onSuccess={() => setShowJoinGroup(false)}
      />
    </>
  );
};

export default GatedContent;
```

```ts
// src/shared/components/gated/index.ts

/**
 * Public surface of the gated-page-state module.
 *
 * A page needs exactly two of these — `usePageGate` and `GatedContent`. The
 * rest are exported for tests and for the one page (Home) that branches on the
 * state itself.
 */
export { default as GatedContent } from "./GatedContent";
export { default as GatedPageState } from "./GatedPageState";
export { usePageGate } from "./usePageGate";
export { useSelectableCampaigns } from "./useSelectableCampaigns";
export {
  GATED_COPY,
  GATED_FOOTNOTE,
  gatedHeading,
} from "./gated-page-copy";
export type { GatedContentProps } from "./GatedContent";
export type { GatedPageStateProps } from "./GatedPageState";
export type { CampaignOption } from "./types";
export type { GateState, PageGate, PageGateOptions } from "./usePageGate";
export type {
  GatedContextRequirement,
  GatedPageCopy,
  GatedPageKey,
} from "./gated-page-copy";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="gated"`
Expected: PASS — all four gated suites, 41 tests total

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/gated/GatedContent.tsx \n        src/shared/components/gated/index.ts \n        src/shared/components/gated/__tests__/GatedContent.test.tsx
git commit -m "feat(gated): render the whole gated ladder from one wrapper"
```

---

### Task 7: Signed-out Home *(subagent B)*

**Files:**
- Create: `src/pages/home/signed-out-example.ts`
- Create: `src/pages/home/SignedOutHome.tsx`
- Test: `src/pages/home/__tests__/signed-out-example.test.ts`
- Test: `src/pages/home/__tests__/SignedOutHome.test.tsx`

**Interfaces:**
- Consumes: `Button`, `Typography`, and — for the dialogs — `SignInForm`, `JoinGroupDialog` from `features/user-management`, `Dialog` from `core/components/Dialog`. (`SignedOutHome` hosts its own dialogs; it does not use `GatedContent`, whose panel is the wrong layout here.)
- Produces: `SIGNED_OUT_EXAMPLE`, types `ExampleStat`, `ExampleUpdate`, `SignedOutExample`; default export `SignedOutHome`.

**Do not add an author, username, character, `createdBy` or `modifiedBy` field to any of these types.** The fixture must make invented attribution *unrepresentable*, not merely absent — a later contributor adding "written by Gauthak" to make it look livelier is the exact failure this shape prevents.

- [ ] **Step 1: Write the failing tests**

```ts
// src/pages/home/__tests__/signed-out-example.test.ts
import { SIGNED_OUT_EXAMPLE } from "../signed-out-example";

describe("SIGNED_OUT_EXAMPLE", () => {
  it("names the campaign and its progress", () => {
    expect(SIGNED_OUT_EXAMPLE.campaignTitle).toBe("The Sunless Citadel");
    expect(SIGNED_OUT_EXAMPLE.subtitle.length).toBeGreaterThan(0);
  });

  it("has a four-cell stat strip", () => {
    expect(SIGNED_OUT_EXAMPLE.stats).toHaveLength(4);
    SIGNED_OUT_EXAMPLE.stats.forEach((stat) => {
      expect(stat.label.length).toBeGreaterThan(0);
      expect(Number.isInteger(stat.value)).toBe(true);
    });
  });

  it("has three recent rows, each typed as real content", () => {
    expect(SIGNED_OUT_EXAMPLE.updates).toHaveLength(3);
    SIGNED_OUT_EXAMPLE.updates.forEach((update) => {
      expect(["chapter", "quest", "npc"]).toContain(update.kind);
      expect(update.title.length).toBeGreaterThan(0);
      expect(update.date.length).toBeGreaterThan(0);
    });
  });

  // The constraint that matters. Attribution is what the product's
  // credibility rests on, so the example must not model fake people writing
  // things -- and the check is structural rather than a string match, so it
  // still fails if someone adds a differently-worded author field later.
  it("carries no authorship anywhere in the fixture", () => {
    const forbidden =
      /author|createdby|modifiedby|username|character|player|writtenby|by$/i;

    const walk = (value: unknown, path: string): void => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, `${path}[${index}]`));
        return;
      }
      if (value && typeof value === "object") {
        Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
          expect(key).not.toMatch(forbidden);
          walk(child, `${path}.${key}`);
        });
      }
    };

    walk(SIGNED_OUT_EXAMPLE, "SIGNED_OUT_EXAMPLE");
  });

  it("is frozen, so nothing can mutate it into live data", () => {
    expect(Object.isFrozen(SIGNED_OUT_EXAMPLE)).toBe(true);
  });
});
```

```tsx
// src/pages/home/__tests__/SignedOutHome.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SignedOutHome from "../SignedOutHome";
import { SIGNED_OUT_EXAMPLE } from "../signed-out-example";

jest.mock("features/user-management", () => ({
  SignInForm: () => <div data-testid="sign-in-form" />,
  JoinGroupDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-group-dialog" /> : null,
}));

const renderHome = () =>
  render(
    <MemoryRouter>
      <SignedOutHome />
    </MemoryRouter>
  );

describe("SignedOutHome", () => {
  it("leads with what the product is, as the page's h1", () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /everything your table agreed happened/i
    );
  });

  it("says a campaign is private to its group and joining is by invite", () => {
    renderHome();
    // Scoped to the prose element: "invite" also appears on the secondary
    // button, and an unscoped getByText would match both and throw.
    expect(screen.getByTestId("home-blurb")).toHaveTextContent(/invite-only/i);
    expect(screen.getByTestId("home-blurb")).toHaveTextContent(/nothing is public/i);
  });

  it("offers signing in and an invite link", () => {
    renderHome();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /invite link/i })
    ).toBeInTheDocument();
  });

  it("opens the sign-in dialog", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(screen.getByTestId("sign-in-form")).toBeInTheDocument();
  });

  it("opens the join-group dialog", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: /invite link/i }));
    expect(screen.getByTestId("join-group-dialog")).toBeInTheDocument();
  });

  it("labels the example as an example, in real text", () => {
    renderHome();
    // Outside the aria-hidden subtree, so a screen reader hears it.
    const chip = screen.getByText(/example campaign/i);
    expect(chip).toBeInTheDocument();
    expect(chip.closest("[aria-hidden='true']")).toBeNull();
  });

  it("says the panel is a picture rather than a demo", () => {
    renderHome();
    expect(screen.getByText(/nothing here is clickable/i)).toBeInTheDocument();
  });

  it("hides the example panel from assistive technology", () => {
    renderHome();
    const panel = screen.getByTestId("example-panel");
    expect(panel).toHaveAttribute("aria-hidden", "true");
  });

  it("puts nothing clickable or focusable inside the example panel", () => {
    renderHome();
    const panel = screen.getByTestId("example-panel");
    expect(
      panel.querySelectorAll("a, button, input, select, textarea, [tabindex]")
    ).toHaveLength(0);
  });

  it("renders the fixture's own numbers, not a dashboard of zeros", () => {
    renderHome();
    const panel = screen.getByTestId("example-panel");
    expect(panel).toHaveTextContent(SIGNED_OUT_EXAMPLE.campaignTitle);
    SIGNED_OUT_EXAMPLE.stats.forEach((stat) => {
      expect(panel).toHaveTextContent(String(stat.value));
    });
    SIGNED_OUT_EXAMPLE.updates.forEach((update) => {
      expect(panel).toHaveTextContent(update.title);
    });
  });

  it("lists the three things the product does, in words", () => {
    renderHome();
    // Scoped to the list: "rumors" and "private" also appear in the blurb
    // above, so unscoped queries would match several elements and throw.
    const lines = screen.getByTestId("product-lines");
    expect(lines).toHaveTextContent(/chapter log/i);
    expect(lines).toHaveTextContent(/rumors/i);
    expect(lines).toHaveTextContent(/private session notes/i);
    expect(lines.querySelectorAll("li")).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="pages/home"`
Expected: FAIL — `Cannot find module '../signed-out-example'`

- [ ] **Step 3: Write the fixture**

```ts
// src/pages/home/signed-out-example.ts

/**
 * One cell of the example campaign's stat strip.
 *
 * Deliberately just a label and a number: the example shows the *shape* of the
 * product, and anything richer starts inviting a maintainer to make it richer
 * still until it is a second implementation of the dashboard.
 */
export interface ExampleStat {
  label: string;
  value: number;
}

/**
 * One "since you last played" row.
 *
 * Note what this type does *not* have: no author, no username, no character.
 * The product's credibility rests on attribution being real ("Gauthak wrote
 * this"), so an example that models fake people writing things undermines
 * exactly the thing it is advertising. Making the field absent from the *type*
 * means a future contributor cannot add one without deleting this comment.
 */
export interface ExampleUpdate {
  date: string;
  title: string;
  kind: "chapter" | "quest" | "npc";
}

/** The whole example panel, in one value. */
export interface SignedOutExample {
  campaignTitle: string;
  subtitle: string;
  stats: readonly ExampleStat[];
  updates: readonly ExampleUpdate[];
}

/**
 * The static example shown on signed-out Home, and nowhere else.
 *
 * Built from published module content (*The Sunless Citadel*) rather than
 * invented campaign fiction, so nothing here pretends to be a real group's
 * play. It is never derived from live data and never fetched — if it drifts
 * from what the app actually renders, that is a bug in this file, not a reason
 * to wire it to a context.
 */
export const SIGNED_OUT_EXAMPLE: SignedOutExample = Object.freeze({
  campaignTitle: "The Sunless Citadel",
  subtitle: "Started 12/03/2025 · Chapter 14",
  stats: Object.freeze([
    { label: "Chapters", value: 14 },
    { label: "NPCs", value: 23 },
    { label: "Locations", value: 9 },
    { label: "Open quests", value: 4 },
  ]),
  updates: Object.freeze([
    {
      date: "12/03/2025",
      title: "The Twig Blights of Oakhurst",
      kind: "chapter" as const,
    },
    {
      date: "10/03/2025",
      title: "Find the missing Hucrele heirs",
      kind: "quest" as const,
    },
    { date: "09/03/2025", title: "Kerowyn Hucrele", kind: "npc" as const },
  ]),
}) as SignedOutExample;

export default SIGNED_OUT_EXAMPLE;
```

- [ ] **Step 4: Write the component**

```tsx
// src/pages/home/SignedOutHome.tsx
import React, { useState } from "react";
import { SignInForm, JoinGroupDialog } from "features/user-management";
import Dialog from "core/components/Dialog";
import Button from "core/components/Button";
import Typography from "core/components/Typography";
import { SIGNED_OUT_EXAMPLE } from "./signed-out-example";

/** The three things the product does, said plainly. */
const PRODUCT_LINES = [
  "A chapter log the whole group can add to, in play order",
  "Quests with objectives, and rumors you can mark true or false",
  "Private session notes, and NPCs pulled out of them for you",
];

/**
 * What a stranger sees at `/`.
 *
 * Home is the one page that answers "what is this?", so it is the one page
 * allowed an example — everywhere else the feel comes from a single honest
 * sentence, because inventing quests with invented authors would undermine the
 * attribution the product's credibility rests on.
 *
 * Rendered instead of `PageShell` + `GatedContent`, not inside them: the `h1`
 * here is the product's headline, not a page title, and the two-column layout
 * is not the 560px panel the other twenty routes share.
 */
const SignedOutHome: React.FC = () => {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        {/* Left: what it is, in words. This column is the accessible copy of
            everything the example panel shows, which is why the panel itself
            can be hidden from assistive technology. */}
        <div>
          <Typography variant="h1" className="mb-6">
            Everything your table agreed happened, in one place
          </Typography>

          <Typography
            color="secondary"
            className="mb-8"
            data-testid="home-blurb"
          >
            Chapters, quests, NPCs, locations, rumors and private notes for one
            campaign — written by whoever is at the table, credited to the
            character they play. Invite-only: a DM sends a join link, and
            nothing is public.
          </Typography>

          <div className="flex flex-wrap gap-3 mb-10">
            <Button variant="primary" onClick={() => setShowSignIn(true)}>
              Sign in
            </Button>
            <Button variant="outline" onClick={() => setShowJoinGroup(true)}>
              I have an invite link
            </Button>
          </div>

          <ul className="space-y-2" data-testid="product-lines">
            {PRODUCT_LINES.map((line) => (
              <li key={line}>
                <Typography color="secondary">· {line}</Typography>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: the example. */}
        <div>
          <div className="flex flex-wrap items-baseline gap-3 mb-3">
            <span className="px-2 py-1 rounded text-xs font-semibold uppercase tracking-widest chip">
              Example campaign
            </span>
            <Typography variant="body-sm" color="secondary">
              a picture, not a demo — nothing here is clickable
            </Typography>
          </div>

          {/* aria-hidden because every fact inside is already stated in the
              left column, and a screen-reader user should not have to walk a
              table of numbers that are not theirs. Nothing inside is
              focusable, so nothing can be reached by keyboard either. */}
          <div
            data-testid="example-panel"
            aria-hidden="true"
            className="rounded-lg p-6 card"
          >
            <Typography variant="h3" className="mb-1 typography-heading">
              {SIGNED_OUT_EXAMPLE.campaignTitle}
            </Typography>
            <Typography variant="body-sm" color="secondary" className="mb-6">
              {SIGNED_OUT_EXAMPLE.subtitle}
            </Typography>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-6 rounded overflow-hidden bg-secondary">
              {SIGNED_OUT_EXAMPLE.stats.map((stat) => (
                <div key={stat.label} className="p-3 card">
                  <div className="text-2xl font-bold typography">
                    {stat.value}
                  </div>
                  <div className="text-xs uppercase tracking-wide typography-muted">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs uppercase tracking-widest typography-muted mb-2">
              Since you last played
            </div>
            <ul>
              {SIGNED_OUT_EXAMPLE.updates.map((update) => (
                <li
                  key={update.title}
                  className="flex items-baseline gap-3 py-2 border-b card-divider last:border-b-0"
                >
                  <span className="text-sm typography-muted shrink-0">
                    {update.date}
                  </span>
                  <span className="font-semibold typography flex-1">
                    {update.title}
                  </span>
                  <span className="text-xs typography-muted shrink-0">
                    {update.kind}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Dialog
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        title="Sign In"
        maxWidth="max-w-md"
      >
        <SignInForm onSuccess={() => setShowSignIn(false)} />
      </Dialog>

      <JoinGroupDialog
        open={showJoinGroup}
        onClose={() => setShowJoinGroup(false)}
        onSuccess={() => setShowJoinGroup(false)}
      />
    </div>
  );
};

export default SignedOutHome;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="pages/home"`
Expected: PASS, 16 tests

- [ ] **Step 6: Commit**

```bash
git add src/pages/home/
git commit -m "feat(home): explain the product instead of a dashboard of zeros"
```

---

## Batch 3 — entity index pages (2 subagents, parallel)

Both tasks follow the identical recipe. Read it once:

1. Replace the page's early-return `loading` / `missingContext` / `error` branches with `usePageGate`.
2. Wrap the body in `PageShell` + `GatedContent`.
3. Gate every control that acts on data with `gate.canAct` — not `user`.
4. **Keep the page's existing title and subtitle strings verbatim.** This PR changes states, not page names.
5. Update the suite: keep every existing behaviour test that still applies, and add the four new ones listed in each task.

### The page-suite mock — required by Tasks 8 through 13

Every page now renders `GatedContent`, which calls members the existing page suites do not mock.
Without this block a suite dies at render and the failure looks like a code defect. Apply it to
**every** page suite you touch, adapting only the fixture values.

```tsx
import { MemoryRouter } from "react-router-dom";

let mockUser: { uid: string } | null = { uid: "user-1" };
let mockIsResolving = false;
let mockActiveGroupId: string | null = "group-1";
let mockActiveCampaignId: string | null = "campaign-1";
let mockGroups: Array<{ id: string; name: string }> = [
  { id: "group-1", name: "The Fellowship" },
];

const mockSetActiveGroup = jest.fn().mockResolvedValue(undefined);
const mockSetActiveCampaign = jest.fn().mockResolvedValue(undefined);

jest.mock("features/user-management", () => ({
  // `loading` is the flag useCampaignContextStatus reads for `isResolving`.
  // Mocked here rather than mocking the status hook itself, so the real
  // "still restoring vs. resolved to nothing" logic stays under test -- that
  // distinction is bug #1413 and the reason state 1 exists.
  useAuth: () => ({ user: mockUser, loading: mockIsResolving }),
  useGroups: () => ({
    activeGroupId: mockActiveGroupId,
    groups: mockGroups,
    setActiveGroup: mockSetActiveGroup,
  }),
  useCampaigns: () => ({
    activeCampaignId: mockActiveCampaignId,
    activeCampaign: mockActiveCampaignId ? { id: mockActiveCampaignId, name: "Phandelver" } : null,
    setActiveCampaign: mockSetActiveCampaign,
  }),
  SignInForm: () => <div data-testid="sign-in-form" />,
  JoinGroupDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-group-dialog" /> : null,
}));

// useSelectableCampaigns fetches through this in the pick-campaign state.
jest.mock("core/services/firebase", () => ({
  __esModule: true,
  default: {
    campaign: { getCampaigns: jest.fn().mockResolvedValue([]) },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { uid: "user-1" };
  mockIsResolving = false;
  mockActiveGroupId = "group-1";
  mockActiveCampaignId = "campaign-1";
  mockGroups = [{ id: "group-1", name: "The Fellowship" }];
});
```

Two consequences:

- **Wrap every `render(...)` in the suite in `<MemoryRouter>`**, including the tests that already
  exist. The signed-out panel renders a `Link`, which throws outside a router.
- **There is no `mockMissingContext`.** The gate derives the state from the real hook, so drive it
  with the fixtures: `mockActiveCampaignId = null` puts the page in `pick-campaign` for a page that
  needs a campaign; `mockActiveGroupId = null` does it for any page; `mockUser = null` gives
  `signed-out`; `mockIsResolving = true` gives `resolving`. Where a test snippet below says
  `mockMissingContext = "campaign"`, set `mockActiveCampaignId = null` instead.

### Task 8: Quests, Rumors, NPCs, Locations *(subagent A)*

**Files:**
- Modify: `src/pages/quests/QuestsPage.tsx`, `src/pages/rumors/RumorsPage.tsx`, `src/pages/npcs/NPCsPage.tsx`, `src/pages/locations/LocationsPage.tsx`
- Test: the four existing suites in the matching `__tests__/` directories

**Interfaces:**
- Consumes: `usePageGate`, `GatedContent` from `shared/components/gated`; `PageShell` from `shared/components/page-shell/PageShell`.
- Produces: nothing new.

- [ ] **Step 1: Add the failing tests to `QuestsPage.test.tsx`**

Add these to the existing describe block. Keep the file's existing mocks and add `jest.mock("shared/components/gated", …)`-free real rendering — the gated components are exercised for real here, so extend the existing `features/user-management` mock with `groups`, `setActiveGroup`, `setActiveCampaign`, `SignInForm` and `JoinGroupDialog` as in `GatedContent.test.tsx`.

```tsx
  it("renders the page title and subtitle while signed out", () => {
    mockUser = null;
    render(<MemoryRouter><QuestsPage /></MemoryRouter>);
    expect(
      screen.getByRole("heading", { level: 1, name: "Campaign Quests" })
    ).toBeInTheDocument();
  });

  it("asks a signed-out visitor to sign in, and never to select a group", () => {
    mockUser = null;
    render(<MemoryRouter><QuestsPage /></MemoryRouter>);
    expect(
      screen.getByRole("heading", { name: /sign in to see your party's quests/i })
    ).toBeInTheDocument();
    // The bug: Header only renders ContextSwitcher for members, so this page
    // used to name a control the visitor could not see.
    expect(screen.queryByText(/select a group/i)).not.toBeInTheDocument();
  });

  it("hides the create action while signed out", () => {
    mockUser = null;
    render(<MemoryRouter><QuestsPage /></MemoryRouter>);
    expect(
      screen.queryByRole("button", { name: /create quest/i })
    ).not.toBeInTheDocument();
  });

  it("shows a skeleton and no message while context is still resolving", () => {
    mockIsResolving = true;
    render(<MemoryRouter><QuestsPage /></MemoryRouter>);
    expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });
```

Add the same four to `NPCsPage.test.tsx` and `LocationsPage.test.tsx`, changing the title, the heading regex and the create-button name to that page's. For `RumorsPage.test.tsx` add those four **plus** the toolbar test, which is the DoD line this PR was written for:

```tsx
  it("shows no control that cannot act while signed out", () => {
    mockUser = null;
    render(<MemoryRouter><RumorsPage /></MemoryRouter>);
    expect(screen.queryByTestId("rumor-directory")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /select rumors/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add rumor/i })
    ).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the four suites to verify the new tests fail**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(QuestsPage|RumorsPage|NPCsPage|LocationsPage)"`
Expected: FAIL on the new tests only; every pre-existing test still passes.

- [ ] **Step 3: Rewrite `QuestsPage.tsx`**

```tsx
// src/pages/quests/QuestsPage.tsx
import React from "react";
import Button from "core/components/Button";
import { QuestDirectory, useQuests } from "features/campaign-entities";
import { usePageGate, GatedContent } from "shared/components/gated";
import PageShell from "shared/components/page-shell/PageShell";
import { useNavigation } from "shared/hooks/useNavigation";
import { Plus } from "lucide-react";

/**
 * Quests index.
 *
 * The five gated states live in `usePageGate`, so this page describes only
 * itself: its name, its one-line subtitle, its create action and its list.
 */
const QuestsPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { quests, loading, error } = useQuests();

  const gate = usePageGate("quests", { loading, error });

  return (
    <PageShell
      title="Campaign Quests"
      subtitle="Track your party's epic adventures and missions"
      actions={
        gate.canAct && (
          <Button
            onClick={() => navigateToPage("/quests/create")}
            startIcon={<Plus className="w-5 h-5" />}
          >
            Create Quest
          </Button>
        )
      }
    >
      <GatedContent gate={gate}>
        <QuestDirectory quests={quests} isLoading={false} />
      </GatedContent>
    </PageShell>
  );
};

export default QuestsPage;
```

- [ ] **Step 4: Rewrite `RumorsPage.tsx`**

```tsx
// src/pages/rumors/RumorsPage.tsx
import React from "react";
import Button from "core/components/Button";
import { RumorDirectory, useRumors } from "features/campaign-entities";
import { usePageGate, GatedContent } from "shared/components/gated";
import PageShell from "shared/components/page-shell/PageShell";
import { useNavigation } from "shared/hooks/useNavigation";
import { Plus } from "lucide-react";

/**
 * Rumors index.
 *
 * `RumorDirectory` carries the progress bar, the category chips, the search
 * field and bulk-select. Rendering it over an empty array — which is what the
 * signed-out page used to do — put five controls on screen that could not act,
 * which reads as broken rather than as gated. `GatedContent` renders it only
 * in the `ready` state.
 */
const RumorsPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { rumors, isLoading, error } = useRumors();

  const gate = usePageGate("rumors", { loading: isLoading, error });

  return (
    <PageShell
      title="Rumors"
      subtitle="Track and investigate rumors from across the realm"
      actions={
        gate.canAct && (
          <Button
            onClick={() => navigateToPage("/rumors/create")}
            startIcon={<Plus className="w-5 h-5" />}
          >
            Add Rumor
          </Button>
        )
      }
    >
      <GatedContent gate={gate}>
        <RumorDirectory rumors={rumors} isLoading={false} />
      </GatedContent>
    </PageShell>
  );
};

export default RumorsPage;
```

- [ ] **Step 5: Rewrite `NPCsPage.tsx`**

```tsx
// src/pages/npcs/NPCsPage.tsx
import React from "react";
import Button from "core/components/Button";
import { NPCDirectory, useNPCData } from "features/campaign-entities";
import { usePageGate, GatedContent } from "shared/components/gated";
import PageShell from "shared/components/page-shell/PageShell";
import { useNavigation } from "shared/context/NavigationContext";
import { Plus } from "lucide-react";

/**
 * NPCs index.
 *
 * The `contextError` memo that used to live here — and, identically, in
 * `NPCContext` — is gone: the page renders whatever `usePageGate` says the
 * state is, and the words come from `gated-page-copy`.
 */
const NPCsPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { npcs, loading, error, refreshNPCs } = useNPCData();

  const gate = usePageGate("npcs", {
    loading,
    error,
    onRetry: () => {
      void refreshNPCs();
    },
  });

  const handleNPCChanged = async () => {
    await refreshNPCs();
  };

  return (
    <PageShell
      title="NPCs"
      subtitle="Keep track of all the characters you've met in your adventures"
      actions={
        gate.canAct && (
          <Button
            onClick={() => navigateToPage("/npcs/create")}
            startIcon={<Plus className="w-5 h-5" />}
          >
            Add NPC
          </Button>
        )
      }
    >
      <GatedContent gate={gate}>
        <NPCDirectory
          npcs={npcs}
          onNPCUpdate={handleNPCChanged}
          onNPCDelete={handleNPCChanged}
        />
      </GatedContent>
    </PageShell>
  );
};

export default NPCsPage;
```

- [ ] **Step 6: Rewrite `LocationsPage.tsx`**

Read `src/pages/locations/LocationsPage.tsx:60-111` first for the exact subtitle and directory props, then apply the same shape. `useLocations()` returns `{ locations, isLoading, error, hasRequiredContext }` — drop `hasRequiredContext`; `usePageGate` supersedes it.

```tsx
// src/pages/locations/LocationsPage.tsx
import React from "react";
import Button from "core/components/Button";
import { useLocations, LocationDirectory } from "features/campaign-entities";
import { usePageGate, GatedContent } from "shared/components/gated";
import PageShell from "shared/components/page-shell/PageShell";
import { useNavigation } from "shared/context/NavigationContext";
import { Plus } from "lucide-react";

/**
 * Locations index.
 *
 * `hasRequiredContext` from `useLocations()` is deliberately unused: it cannot
 * tell "no selection" from "still restoring", and it cannot tell either from
 * "signed out". `usePageGate` distinguishes all three.
 */
const LocationsPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { locations, isLoading, error } = useLocations();

  const gate = usePageGate("locations", { loading: isLoading, error });

  return (
    <PageShell
      title="Locations"
      subtitle="Explore and track the places you've discovered in your adventures"
      actions={
        gate.canAct && (
          <Button
            onClick={() => navigateToPage("/locations/create")}
            startIcon={<Plus className="w-5 h-5" />}
          >
            Add Location
          </Button>
        )
      }
    >
      <GatedContent gate={gate}>
        <LocationDirectory locations={locations} isLoading={false} />
      </GatedContent>
    </PageShell>
  );
};

export default LocationsPage;
```

The subtitle and `LocationDirectory`'s props (`{ locations, isLoading? }`,
`LocationDirectory.tsx:25-28`) are verified as written. For the other three pages in this task,
**read the file you are replacing** for its exact subtitle and directory props before committing —
the blocks above are the shape, not a licence to guess prop names.

- [ ] **Step 7: Run the four suites**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(QuestsPage|RumorsPage|NPCsPage|LocationsPage)"`
Expected: PASS, all suites green including the new tests.

- [ ] **Step 8: Commit**

```bash
git add src/pages/quests src/pages/rumors src/pages/npcs src/pages/locations
git commit -m "feat(pages): one gated state for the four entity indexes"
```

---

### Task 9: Chapters, Notes, Note detail *(subagent B)*

**Files:**
- Modify: `src/pages/story/ChaptersPage.tsx`, `src/pages/notes/NotesPage.tsx`, `src/pages/notes/NotePage.tsx`
- Test: `src/pages/story/__tests__/ChaptersPage.test.tsx`, `src/pages/notes/__tests__/NotesPage.test.tsx`, `src/pages/notes/__tests__/NotePage.test.tsx`

**Interfaces:**
- Consumes: `usePageGate`, `GatedContent` from `shared/components/gated`; `PageShell` from `shared/components/page-shell/PageShell`.
- Produces: nothing new.

`ChaptersPage` keeps its `Breadcrumb`, its `StoryViewTabs` and its `ResumeBar`; pass the breadcrumb via `PageShell`'s `breadcrumb` prop and put `StoryViewTabs` in `actions` alongside the create button, since it acts on data. Its title moves from `h2` "Session Chronicles" to `PageShell`'s `h1` with the same words.

`NotesPage` uses page key `notes`, which requires only a group — a signed-in member with a group but no campaign reaches `ready` and sees the list, exactly as today. Its inline "No campaign selected" warning (`NotesPage.tsx:39-46`) is deleted: the create button is already gated on `activeCampaignId`, and the sentence was the last user-facing remnant of the old ladder.

- [ ] **Step 1: Add the failing tests**

For each of the three suites, add the four standard tests from Task 8 Step 1 (title renders, signed-out heading with no "select a group", create action hidden, skeleton while resolving), using each page's own title and heading:

- `ChaptersPage` — title `Session Chronicles`, heading `/sign in to read your campaign's story/i`, action `/new chapter/i`
- `NotesPage` — title `Notes`, heading `/sign in to read your notes/i`, action `/new note/i`
- `NotePage` — title from the note, heading `/sign in to read your notes/i`, no action

Plus, for `NotesPage`:

```tsx
  it("shows notes for a member with a group but no campaign chosen", () => {
    // Notes are group-scoped; demanding a campaign here would gate a page
    // that can render perfectly well without one.
    mockMissingContext = "campaign";
    render(<MemoryRouter><NotesPage /></MemoryRouter>);
    expect(screen.getByTestId("notes-list")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /which campaign/i })
    ).not.toBeInTheDocument();
  });

  it("no longer warns about a missing campaign in the header", () => {
    mockMissingContext = "campaign";
    render(<MemoryRouter><NotesPage /></MemoryRouter>);
    expect(screen.queryByText(/no campaign selected/i)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the three suites to verify the new tests fail**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(ChaptersPage|NotesPage|NotePage)"`
Expected: FAIL on the new tests only.

- [ ] **Step 3: Rewrite `NotesPage.tsx`**

```tsx
// src/pages/notes/NotesPage.tsx
import React from "react";
import Button from "core/components/Button";
import { NotesList, useNotes, useCreateNote } from "features/collaboration";
import { useCampaigns } from "features/user-management";
import { usePageGate, GatedContent } from "shared/components/gated";
import PageShell from "shared/components/page-shell/PageShell";
import { Plus } from "lucide-react";

/**
 * Notes index.
 *
 * Uses the `notes` page key, whose `requires` is `"group"` — `NoteContext`
 * fetches on `activeGroupId` and applies `activeCampaignId` as a filter, so a
 * member with a group but no campaign chosen has notes to read and must not be
 * sent to the campaign picker.
 *
 * Creating one still needs a campaign, which is why the action is additionally
 * gated on `activeCampaignId`.
 */
const NotesPage: React.FC = () => {
  const { isLoading } = useNotes();
  const { activeCampaignId, activeCampaign } = useCampaigns();
  const { createAndOpen } = useCreateNote();

  const gate = usePageGate("notes", { loading: isLoading });

  return (
    <PageShell
      className="notes-page"
      title="Notes"
      subtitle={
        activeCampaign
          ? `Your private notes for ${activeCampaign.name}. Only you can read them.`
          : "Your private notes. Only you can read them."
      }
      actions={
        gate.canAct &&
        activeCampaignId && (
          <Button
            onClick={createAndOpen}
            variant="primary"
            className="create-note-button"
            startIcon={<Plus className="w-5 h-5" />}
          >
            New note
          </Button>
        )
      }
    >
      <GatedContent gate={gate}>
        <NotesList />
      </GatedContent>
    </PageShell>
  );
};

export default NotesPage;
```

- [ ] **Step 4: Rewrite `ChaptersPage.tsx`**

Keep everything from `ChaptersPage.tsx:129-256` that renders chapters; replace only the outer container, the header block and the `isLoading` early return.

```tsx
  const gate = usePageGate("story", { loading: isLoading });

  return (
    <PageShell
      title="Session Chronicles"
      breadcrumb={<Breadcrumb items={breadcrumbItems} className="mb-4" />}
      actions={
        gate.canAct && (
          <>
            <StoryViewTabs />
            <Button
              variant="primary"
              startIcon={<Plus />}
              onClick={handleCreateChapter}
            >
              New Chapter
            </Button>
          </>
        )
      }
    >
      <GatedContent gate={gate}>
        <ResumeBar summary={summary} onResume={handleResume} />
        {/* the existing chapters.length === 0 / list rendering, unchanged */}
      </GatedContent>
    </PageShell>
  );
```

- [ ] **Step 5: Rewrite `NotePage.tsx`**

Read the file first. Apply the same shape with page key `notes`; the note's own title is `PageShell`'s `title`, and there is no `actions` slot unless the file already has one.

- [ ] **Step 6: Run the three suites**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(ChaptersPage|NotesPage|NotePage)"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/pages/story src/pages/notes
git commit -m "feat(pages): gate chapters and notes the same way as the rest"
```

---

## Batch 4 — Home and story routes (2 subagents, parallel)

**Apply the page-suite mock block from Batch 3 to every suite in this batch.**

### Task 10: `HomePage` *(subagent A)*

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Test: `src/pages/__tests__/HomePage.test.tsx`

**Interfaces:**
- Consumes: `usePageGate`, `GatedContent`; `PageShell`; `SignedOutHome` from `pages/home/SignedOutHome` (Task 7).
- Produces: nothing new.

Home branches once, before anything else: `gate.state === "signed-out"` returns `<SignedOutHome />` on its own. Every other state goes through `PageShell` + `GatedContent`, so a signed-in member with no campaign gets the picker rather than a dashboard of zeros.

**Keep all the existing activity-building code** (`HomePage.tsx:47-200`) unchanged. Only the return block changes.

- [ ] **Step 1: Add the failing tests to `HomePage.test.tsx`**

```tsx
  it("explains the product instead of a dashboard of zeros while signed out", () => {
    mockUser = null;
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /everything your table agreed happened/i
    );
    expect(screen.queryByTestId("dashboard-layout")).not.toBeInTheDocument();
    expect(screen.queryByTestId("journal-layout")).not.toBeInTheDocument();
  });

  it("asks a signed-in member with no campaign to pick one", () => {
    mockMissingContext = "campaign";
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(
      screen.getByRole("heading", { name: /which campaign/i })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-layout")).not.toBeInTheDocument();
  });

  it("hides the dashboard/journal toggle when nothing can act on data", () => {
    mockMissingContext = "campaign";
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.queryByRole("group", { name: /choose a view/i })).not.toBeInTheDocument();
  });

  it("shows a skeleton and no panel while context is resolving", () => {
    mockIsResolving = true;
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/which campaign/i)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the suite to verify the new tests fail**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="HomePage"`
Expected: FAIL on the four new tests; the existing dashboard/journal tests still pass.

- [ ] **Step 3: Change only the return block**

```tsx
  const gate = usePageGate("home", { loading: layoutData.loading });

  // Home is the one page allowed an example, and it is a different layout
  // rather than the shared 560px panel -- the `h1` there is the product's
  // headline, not a page title. See the spec, §5.
  if (gate.state === "signed-out") {
    return <SignedOutHome />;
  }

  return (
    <PageShell title="Campaign Home" actions={gate.canAct && viewToggle}>
      <GatedContent gate={gate}>
        {layoutType === "dashboard" ? (
          <DashboardLayout
            npcs={npcs}
            locations={locations}
            quests={quests}
            chapters={chapters}
            rumors={rumors}
            activities={activities}
            loading={false}
          />
        ) : (
          <JournalLayout
            npcs={npcs}
            locations={locations}
            quests={quests}
            chapters={chapters}
            rumors={rumors}
            activities={activities}
            loading={false}
          />
        )}
      </GatedContent>
    </PageShell>
  );
```

`viewToggle` moves out of the layouts' `viewToggle` prop and into `PageShell`'s `actions`. Check whether `DashboardLayout` and `JournalLayout` still require `viewToggle` — if the prop is non-optional, make it optional in both and drop the header block that renders it.

- [ ] **Step 4: Run the suite**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(HomePage|DashboardLayout|JournalLayout)"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/layouts
git commit -m "feat(home): show the product to strangers and the picker to members"
```

---

### Task 11: Story detail, saga and chapter routes *(subagent B)*

**Files:**
- Modify: `src/pages/story/StoryPage.tsx`, `src/pages/story/SagaPage.tsx`, `src/pages/story/SagaEditPage.tsx`, `src/pages/story/ChapterCreatePage.tsx`, `src/pages/story/ChapterEditPage.tsx`
- Test: the five existing suites in `src/pages/story/__tests__/`

**Interfaces:**
- Consumes: `usePageGate`, `GatedContent`, `PageShell`.
- Produces: nothing new.

All five use page key `story`. The three write routes pass `mode: "write"`, so a signed-out visitor at `/story/chapters/create` is asked to *sign in to write a chapter* rather than to read one.

**`StoryPage` is the ordering hazard named in the spec:** it renders `useStory().error` directly (`StoryPage.tsx:161-166`), and Task 14 removes the sentence that error currently carries in the no-context case. Adopting `usePageGate` here is what keeps it from going blank. Do not skip it.

- [ ] **Step 1: Add the failing tests**

For each of the five suites, add the four standard tests from Task 8 Step 1. For the three write routes, the expected heading is `/sign in to write a chapter/i`; for `StoryPage` and `SagaPage` it is `/sign in to read your campaign's story/i`.

Add to `StoryPage.test.tsx` specifically:

```tsx
  it("shows the campaign picker rather than an empty page when no campaign is chosen", () => {
    // Regression guard: this page renders useStory().error, and that error no
    // longer carries a "please select a group and campaign" sentence.
    mockMissingContext = "campaign";
    render(<MemoryRouter><StoryPage /></MemoryRouter>);
    expect(
      screen.getByRole("heading", { name: /which campaign/i })
    ).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the five suites to verify the new tests fail**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="src/pages/story"`
Expected: FAIL on the new tests only.

- [ ] **Step 3: Apply the shape to all five**

Read each file first. The pattern, using `SagaEditPage` as the worked example:

```tsx
  const gate = usePageGate("story", { loading, error, mode: "write" });

  return (
    <PageShell title="Edit Campaign Saga" actions={gate.canAct && saveButton}>
      <GatedContent gate={gate}>
        {/* the existing form, unchanged */}
      </GatedContent>
    </PageShell>
  );
```

Delete each file's `hasRequiredContext` early return and its "Please select a group and campaign…" card — those are `SagaPage.tsx:95-105` and `SagaEditPage.tsx:139-149`. Keep each page's own title verbatim.

- [ ] **Step 4: Run the five suites**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="src/pages/story"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/story
git commit -m "feat(story): gate the chapter, saga and detail routes consistently"
```

---

## Batch 5 — create and edit routes (2 subagents, parallel)

**Apply the page-suite mock block from Batch 3 to every suite in this batch.**

### Task 12: Quest, NPC and rumor create/edit *(subagent A)*

**Files:**
- Modify: `src/pages/quests/QuestCreatePage.tsx`, `src/pages/quests/QuestEditPage.tsx`, `src/pages/npcs/NPCsCreatePage.tsx`, `src/pages/npcs/NPCsEditPage.tsx`, `src/pages/rumors/RumorCreatePage.tsx`, `src/pages/rumors/RumorEditPage.tsx`
- Test: the six existing suites

**Interfaces:**
- Consumes: `usePageGate`, `GatedContent`, `PageShell`.
- Produces: nothing new.

Page keys: `quests`, `npcs`, `rumors`. All six pass `mode: "write"`.

`QuestEditPage.tsx:70-85` carries the same four-string `missingContext` card as `QuestsPage` did; delete it.

- [ ] **Step 1: Add the failing tests**

For each of the six suites, add the four standard tests from Task 8 Step 1, with the write heading for that domain (`/sign in to add a quest/i`, `/sign in to add an npc/i`, `/sign in to record a rumor/i`).

- [ ] **Step 2: Run the six suites to verify the new tests fail**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(QuestCreatePage|QuestEditPage|NPCsCreatePage|NPCsEditPage|RumorCreatePage|RumorEditPage)"`
Expected: FAIL on the new tests only.

- [ ] **Step 3: Apply the shape to all six**

```tsx
  const gate = usePageGate("quests", { loading, error, mode: "write" });

  return (
    <PageShell title="Create New Quest">
      <GatedContent gate={gate}>
        {/* the existing form, unchanged */}
      </GatedContent>
    </PageShell>
  );
```

Each page's title moves to `PageShell` with the same words; the `h2` becomes an `h1`, which is correct — it is the page's own name.

- [ ] **Step 4: Run the six suites**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(QuestCreatePage|QuestEditPage|NPCsCreatePage|NPCsEditPage|RumorCreatePage|RumorEditPage)"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/quests src/pages/npcs src/pages/rumors
git commit -m "feat(pages): gate the quest, NPC and rumor write routes"
```

---

### Task 13: Location create/edit, and the two forms *(subagent B)*

**Files:**
- Modify: `src/pages/locations/LocationCreatePage.tsx`, `src/pages/locations/LocationEditPage.tsx`
- Modify: `src/features/campaign-entities/locations/components/LocationCreateForm.tsx:194-206`, `src/features/campaign-entities/locations/components/LocationEditForm.tsx:111-122`
- Test: `src/pages/locations/__tests__/LocationCreatePage.test.tsx`, `src/pages/locations/__tests__/LocationEditPage.test.tsx`, `src/features/campaign-entities/locations/components/__tests__/LocationCreateForm.test.tsx`, `src/features/campaign-entities/locations/components/__tests__/LocationEditForm.test.tsx`

**Interfaces:**
- Consumes: `usePageGate`, `GatedContent`, `PageShell`.
- Produces: nothing new.

The two **forms** are the only feature components carrying gated copy. They currently render their own "No Active Group or Campaign / Please select a group and campaign to create a location" card. **Delete that card from both forms.** The pages above them now own the gated state, so the form renders only when the gate says `ready` — a form that reaches its own render has, by construction, the context it needs.

The forms' existing suites assert those strings. Those assertions are the layering mistake this PR removes: replace each with an assertion that the form renders its fields when it is rendered at all, and move the gated-state assertion up to the page's suite where it now belongs. Say so in the commit message.

- [ ] **Step 1: Add the failing tests to the two page suites**

Add the four standard tests from Task 8 Step 1 to both page suites, heading `/sign in to add a location/i`.

- [ ] **Step 2: Rewrite the two form suites' context assertions**

In `LocationCreateForm.test.tsx` and `LocationEditForm.test.tsx`, find every test asserting `"No Active Group or Campaign"` or `"Please select a group and campaign to…"` and replace each with:

```tsx
  it("renders its fields whenever it is rendered at all", () => {
    // The gated state moved up to the page (LocationCreatePage), which is the
    // only layer that knows whether the visitor is signed out, still
    // resolving, or simply between campaigns. A form that reaches its own
    // render has the context it needs by construction.
    renderForm();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });
```

Adjust `renderForm()` and the field name to match each suite's existing helpers.

- [ ] **Step 3: Run all four suites to verify the new tests fail**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(LocationCreatePage|LocationEditPage|LocationCreateForm|LocationEditForm)"`
Expected: FAIL

- [ ] **Step 4: Delete the gated card from both forms**

In `LocationCreateForm.tsx`, remove the early return that renders `No Active Group or Campaign` and its `hasRequiredContext` guard. Same in `LocationEditForm.tsx`.

- [ ] **Step 5: Apply the page shape to both pages**

```tsx
  const gate = usePageGate("locations", { loading, error, mode: "write" });

  return (
    <PageShell title="Create New Location">
      <GatedContent gate={gate}>
        <LocationCreateForm {/* existing props */} />
      </GatedContent>
    </PageShell>
  );
```

- [ ] **Step 6: Run all four suites**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(LocationCreatePage|LocationEditPage|LocationCreateForm|LocationEditForm)"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/pages/locations src/features/campaign-entities/locations
git commit -m "feat(locations): move the gated state out of the forms and onto the pages

The two location forms rendered their own 'No Active Group or Campaign'
card, which is the one layer that cannot know whether the visitor is
signed out, still resolving, or between campaigns. Their suites asserted
those exact strings; those assertions encoded the layering mistake and
are replaced by page-level ones."
```

---

## Batch 6 — contexts and verification (orchestrator)

### Task 14: Stop contexts producing sentences

**Files:**
- Modify: `src/features/campaign-entities/npcs/context/NPCContext.tsx:187-204`
- Modify: `src/features/storytelling/chapters/context/StoryContext.tsx:743-751`
- Test: `src/features/campaign-entities/npcs/context/__tests__/NPCContext.behavioral.test.tsx`, `src/features/storytelling/chapters/context/__tests__/StoryContext.behavioral.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `NPCContextValue.error` and `StoryContextValue.error` now carry *only* real fetch/write failures.

**Prerequisite: Tasks 8–13 must all be merged first.** `StoryPage`, `NPCsPage` and the create/edit routes read these `error` values; removing the sentence before they adopt `usePageGate` leaves those routes blank.

- [ ] **Step 1: Rewrite the failing assertions in both behavioural suites**

Find every assertion matching `"Please select a group to view NPCs"`, `"Please select a campaign to view NPCs"` or `"Please select a group and campaign"`. Replace each with an assertion on the *state* the context actually owns:

```tsx
  it("reports missing context as state, not as a sentence", () => {
    // The words moved to shared/components/gated/gated-page-copy.ts. A context
    // returns what is true; the page decides how to say it. These tests used
    // to assert the sentence, which is what let five phrasings of two ideas
    // accumulate across five layers.
    renderWithNoCampaign();
    expect(result.current.hasRequiredContext).toBe(false);
    expect(result.current.error).toBeNull();
  });
```

- [ ] **Step 2: Run both suites to verify they fail**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(NPCContext|StoryContext).behavioral"`
Expected: FAIL — `error` is still the old sentence.

- [ ] **Step 3: Delete the copy from `NPCContext.tsx`**

Remove the `contextError` `useMemo` at `NPCContext.tsx:192-197` and its `missingContext` dependency, then change the context value to:

```tsx
    // Missing group/campaign is a *state*, not an error, and the words for it
    // live in shared/components/gated/gated-page-copy.ts. `hasRequiredContext`
    // below is what a consumer should read.
    error: error || writeError || null,
```

Drop the now-unused `useMemo` import and `missingContext` destructuring if nothing else uses them.

- [ ] **Step 4: Delete the copy from `StoryContext.tsx`**

```tsx
  // Missing group/campaign is a state, not an error -- `hasRequiredContext` is
  // in this same value, and the words live in gated-page-copy.ts. This carries
  // only real fetch failures now.
  const contextError = chaptersError;
```

- [ ] **Step 5: Run both suites**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="(NPCContext|StoryContext).behavioral"`
Expected: PASS

- [ ] **Step 6: Verify no gated wording survives anywhere in a context**

```bash
grep -rn "Please select a group\|Please select a campaign\|No Group Selected\|No Campaign Selected\|No Active Group" src --include=*.tsx --include=*.ts | grep -v "__tests__"
```

Expected: only `LocationCombobox.tsx:125` ("Please select a valid location" — a form validation message, unrelated), `CombineRumorsDialog.tsx`, `ConvertToQuestDialog.tsx` (both "please select at least N rumors" — selection validation, unrelated) and `NoteContext.tsx:145` (a thrown programming guard, kept deliberately). **Anything else is a miss — fix it before committing.**

- [ ] **Step 7: Commit**

```bash
git add src/features
git commit -m "refactor(contexts): return state, let the page say the words

NPCContext and StoryContext built user-facing sentences, which is how five
phrasings of two ideas ended up in five layers. Their behavioural suites
asserted those exact strings; those assertions encoded the layering
mistake and now assert hasRequiredContext instead."
```

---

### Task 15: Full verification

**Files:** none — this task only runs gates and records what it finds.

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: no output. `react-scripts build` type-checks all of `src/`, so an error here blocks the deploy.

- [ ] **Step 2: Full suite**

Run: `npx jest --silent 2>&1 | tail -12`
Expected: **0 failed**, suite count ≥ 235 + 8 new, test count ≥ 4717 + the new tests. 2 skipped (#901's, unchanged). Compare against the baseline in Global Constraints; if the count *dropped*, a suite was lost — find it before continuing.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: `Compiled successfully`. This gate is not implied by the two above — webpack ignores tsconfig `paths`, so an accidental `@/…` import passes `tsc` and jest and fails only here.

- [ ] **Step 4: Confirm the two already-landed constraints still hold**

```bash
grep -n "user && (" src/app/layout/Header.tsx
grep -n "hasRequiredContext) return null" src/shared/components/GlobalActionButton.tsx
```

Expected: the header's `SearchTrigger` is still gated on `user`, and `GlobalActionButton` still returns `null` without required context. Neither should have changed; this is a regression check, not work.

- [ ] **Step 5: Look at it**

Start the app with `.\scripts\start-dev.ps1 -Action start`, then check signed-out `/`, `/quests`, `/rumors`, `/npcs`, `/locations`, `/story`, `/notes`, plus `/quests/create` and `/story/saga`.

Confirm on each: the `h1` and subtitle are present; the panel is centred and left-aligned; no filter, chip, progress bar, search field or create button is visible; the header shows no search trigger and no `+`.

If the dev server reports an error that `tsc` and `npm run build` did not, clear the stale cache — `rm -rf node_modules/.cache` — and restart before believing the overlay.

Render at 320px inside a 320px-wide iframe rather than resizing a maximized Chrome window, which silently ignores widths below its minimum. **The header itself overflows below ~380px on every route; that is pre-existing and not this PR's** — check whether the offending element is inside `header`/`footer` before attributing it here.

- [ ] **Step 6: Record the new baseline in CLAUDE.md**

Update the `**Baseline:**` bullet under *Testing Strategy → Current State* with the measured suite and test counts and the date, replacing the previous line rather than appending to it. Note what this branch added relative to `main`.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record the measured baseline after the gated-state pass"
```

---

## Self-review notes

Checked against the spec, section by section:

- §1 state machine → Task 2 (all five states, precedence tested)
- §2 seam → Tasks 2, 3, 4, 5, 6
- §3 copy + contexts → Tasks 1 and 14
- §4 no sample data outside Home → enforced by omission; no task adds a fixture to an entity page
- §5 signed-out Home → Tasks 7 and 10
- §6 controls that cannot work → Task 15 Step 4 verifies the two already-landed pieces; `gate.canAct` in Tasks 8–13 covers the rest
- §7 testing → every task is test-first; Task 15 runs all three gates
- §8 DoD → each box maps to a task; the "21 routes" box is Tasks 8–13 in aggregate

Type consistency: `CampaignOption` is defined once (Task 4) and imported by Tasks 5 and 6. `PageGate` is defined once (Task 2) and consumed by Tasks 6 and 8–13. `GatedPageKey` values match `GATED_COPY`'s keys and every `usePageGate` call site in Tasks 8–13 (`home`, `story`, `quests`, `npcs`, `locations`, `rumors`, `notes`).

Known risk, flagged rather than hidden: Tasks 8–13 give page-level code blocks as the *shape*, and each step tells the implementer to read the real file first for exact subtitles, directory props and helper names. That is deliberate — inventing prop names for twenty-one components in a plan document would be worse than a plan that says where to look.
