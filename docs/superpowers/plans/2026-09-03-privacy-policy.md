# Privacy Policy Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the privacy page's self-updating date, meaningless card grid and missing AI disclosure with a constant-driven, summary-first page whose every factual claim is traceable to the code — and fix the note-deletion defect that would otherwise make its deletion copy false.

**Architecture:** All page copy that is a *fact* moves into `src/core/constants/privacy.ts`, so the date, the controller, the summary table and the extraction facts each have exactly one definition and can be asserted against in tests. The page splits into a route component plus three focused presentational components under `src/pages/privacy/`. A separate, independent change adds subcollection cascade deletion to two Cloud Functions so private notes are really deleted.

**Tech Stack:** React 18 + TypeScript, TailwindCSS over the existing theme-token classes in `src/core/themes/css/components.css`, Jest + React Testing Library, Firebase Cloud Functions (Node 22, firebase-admin 12).

**Spec:** `docs/superpowers/specs/2026-09-03-privacy-policy-design.md` — read it first. It carries the verified facts every string in this plan depends on.

---

## Global Constraints

These apply to every task. Violating one is grounds to reject the task.

- **No hardcoded colours, ever.** Use the theme classes (`card`, `card-subtle`, `card-divider`, `typography-secondary`, `typography-muted`, `primary`) and Tailwind spacing/layout utilities only. `src/core/themes/css/components.css` is the palette. The design's yellow highlight row becomes `card-subtle`.
- **Hairlines:** `card-divider` sets *colour only*. Pair it with a directional Tailwind width (`border-t`), never with `card-border` (a four-side shorthand). See the comment at `src/core/themes/css/components.css:106-118`.
- **Imports must use bare `baseUrl` specifiers** (`core/constants/privacy`, `shared/hooks/useNavigation`) in anything that ships. **Never `@/…`** — webpack ignores tsconfig `paths` and the production build fails with `Module not found` even though `tsc` and jest pass. `@/` is allowed only inside `__tests__/`.
- **Double quotes** per ESLint config. JSDoc on every exported component, function and non-obvious constant.
- **Icons are decorative:** every `lucide-react` icon in the privacy page gets `aria-hidden="true"`.
- **Session durations come from `core/constants/time`** (`INACTIVITY_TIMEOUT_TEXT`, `REMEMBER_ME_TEXT`). Never restate "24 hours" or "30 days" as literals. Note that design screenshot `8c` shows "2 hours idle" and is **wrong**; the constant says 24 hours and the constant wins.
- **Never write a factual claim the spec's §2 does not support.** If a sentence needs a fact that is not there, stop and ask — do not guess.
- **Readable at 320px.** Nothing may overflow horizontally.
- Baseline before this branch: **230 suites / 4675 tests, 0 failed / 2 skipped.** Any red beyond that is a regression.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/core/constants/privacy.ts` | **New.** Every privacy fact with one definition: last-updated date, changelog, controller, hosting region, extraction facts, the summary-table rows, the section id/label list. |
| `src/pages/privacy/PrivacyLastUpdated.tsx` | **New.** The `<time>` element, `en-GB` formatting, and the `What changed` disclosure. |
| `src/pages/privacy/PrivacyDataTable.tsx` | **New.** The at-a-glance table: semantic `<table>` from `sm` up, stacked cards below. |
| `src/pages/privacy/PrivacySectionNav.tsx` | **New.** The sticky anchor list down the left of the prose. |
| `src/pages/PrivacyPolicyPage.tsx` | **Rewrite.** Composes the above, renders the three summary cards and all prose sections. Stays at this path — `src/app/App.tsx` imports it here. |
| `src/features/collaboration/notes/components/CampaignLinksPanel.tsx` | **Modify.** One-line disclosure under the "Scan note" button. |
| `firebase/functions/src/userManagement/deleteUser.ts` | **Modify.** Recursively delete the group-user doc so notes go with it. |
| `firebase/functions/src/userManagement/removeUserFromGroup.ts` | **Modify.** Same fix. |
| `.github/pull_request_template.md` | **New.** `PRIVACY_LAST_UPDATED` bump reminder. |
| Tests alongside each of the above | Per-component suites; the page suite rewritten. |

**Ordering note for the orchestrator.** Task 1 must land before Tasks 2–5. Task 6 (Cloud Functions) and Task 8 (PR template) are independent of everything and may run at any point. Tasks 2, 3 and 4 are independent of each other. Task 5 consumes 2, 3 and 4. Task 7 consumes only Task 1.

Suggested waves, two concurrent subagents maximum:

| Wave | Concurrent work |
|---|---|
| 0 | Task 1 (constants), Task 8 (PR template) — small, do inline |
| 1 | Task 2 (LastUpdated) ∥ Task 6 (Cloud Functions cascade) |
| 2 | Task 3 (DataTable) ∥ Task 4 (SectionNav) |
| 3 | Task 5 (page assembly) ∥ Task 7 (Scan note disclosure) |
| 4 | Task 9 (verification + whole-diff review) — inline |

---

## Task 1: The privacy constants

**Files:**
- Create: `src/core/constants/privacy.ts`
- Test: `src/core/constants/__tests__/privacy.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces — every later task imports from `core/constants/privacy`:
  - `PRIVACY_LAST_UPDATED: string` — ISO `"YYYY-MM-DD"`
  - `PRIVACY_CHANGELOG: readonly string[]`
  - `PRIVACY_CONTROLLER: { name: string; country: string; contactPath: string }`
  - `PRIVACY_HOSTING_REGION: string`
  - `OPENAI_DPA_ACCEPTED: boolean`
  - `EXTRACTION_FACTS: { provider: string; product: string; caps: string; retention: string; transfer: string }`
  - `interface PrivacyTableRow { id: string; what: string; why: string; where: string; howLong: string; highlighted?: boolean }`
  - `PRIVACY_TABLE_ROWS: readonly PrivacyTableRow[]`
  - `interface PrivacySection { id: string; label: string }`
  - `PRIVACY_SECTIONS: readonly PrivacySection[]`

- [ ] **Step 1: Write the failing test**

Create `src/core/constants/__tests__/privacy.test.ts`:

```ts
// src/core/constants/__tests__/privacy.test.ts
import {
  PRIVACY_LAST_UPDATED,
  PRIVACY_CHANGELOG,
  PRIVACY_CONTROLLER,
  PRIVACY_TABLE_ROWS,
  PRIVACY_SECTIONS,
  EXTRACTION_FACTS,
} from "../privacy";

describe("privacy constants", () => {
  it("is shaped like an ISO date", () => {
    expect(PRIVACY_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("does not move when the clock does", () => {
    // The bug this file exists to prevent was `new Date()` in the render path,
    // so the page re-dated itself daily. Asserting "the constant is not today"
    // would be a proxy that passes by luck and fails on the very day the policy
    // is genuinely updated. Re-evaluating the module under a faked clock tests
    // the real property: the value is a literal, not a computation.
    jest.useFakeTimers().setSystemTime(new Date("2031-01-15T12:00:00Z"));

    let reloaded: string | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      reloaded = require("../privacy").PRIVACY_LAST_UPDATED;
    });

    jest.useRealTimers();

    expect(reloaded).toBe(PRIVACY_LAST_UPDATED);
    expect(reloaded).not.toMatch(/^2031/);
  });

  it("parses as a real calendar date", () => {
    expect(Number.isNaN(Date.parse(PRIVACY_LAST_UPDATED))).toBe(false);
  });

  it("records what changed", () => {
    expect(PRIVACY_CHANGELOG.length).toBeGreaterThanOrEqual(2);
  });

  it("names a controller and routes contact through the contact page", () => {
    expect(PRIVACY_CONTROLLER.name).not.toHaveLength(0);
    expect(PRIVACY_CONTROLLER.contactPath).toBe("/contact");
  });

  it("puts no email address on the page", () => {
    const serialised = JSON.stringify({
      PRIVACY_CONTROLLER,
      PRIVACY_TABLE_ROWS,
      EXTRACTION_FACTS,
    });
    expect(serialised).not.toMatch(/@[\w.-]+\.\w+/);
  });

  it("covers all five disclosed data categories, with extraction highlighted", () => {
    expect(PRIVACY_TABLE_ROWS).toHaveLength(5);
    const highlighted = PRIVACY_TABLE_ROWS.filter((row) => row.highlighted);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].where).toContain("OpenAI");
  });

  it("gives every table row a unique id", () => {
    const ids = PRIVACY_TABLE_ROWS.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every prose section a unique id and a label", () => {
    const ids = PRIVACY_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    PRIVACY_SECTIONS.forEach((section) => {
      expect(section.label).not.toHaveLength(0);
    });
  });

  it("names the provider and its product so the claim is checkable", () => {
    expect(EXTRACTION_FACTS.provider).toBe("OpenAI");
    expect(EXTRACTION_FACTS.product).toContain("API");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="constants/__tests__/privacy"
```

Expected: FAIL — `Cannot find module '../privacy'`.

- [ ] **Step 3: Write the constants**

Create `src/core/constants/privacy.ts`:

```ts
// src/core/constants/privacy.ts

/**
 * Every fact the privacy page states, with exactly one definition each.
 *
 * This file exists because the page used to render
 * `new Date().toLocaleDateString(...)` for "Last updated", so it claimed a
 * revision every day it was viewed -- quietly defeating the page's own promise
 * to record when the text changed. A policy's date is the one fact it exists to
 * carry, so it is a constant, bumped by hand.
 *
 * The same reasoning applies to the rest: a claim about retention or about what
 * leaves the product should be stated once, be greppable, and be assertable in a
 * test. See docs/superpowers/specs/2026-09-03-privacy-policy-design.md for the
 * code references behind each value.
 */

/**
 * ISO date of the last substantive change to the policy text.
 *
 * BUMP THIS BY HAND whenever the wording changes, and add a PRIVACY_CHANGELOG
 * line saying what changed. Never derive it from Date.now().
 */
export const PRIVACY_LAST_UPDATED = "2026-09-03";

/** What changed in the revision named by PRIVACY_LAST_UPDATED, newest first. */
export const PRIVACY_CHANGELOG: readonly string[] = [
  "Added a section on entity extraction: what leaves the app when you scan a note, who receives it, and for how long they keep it.",
  "Replaced the request-by-email deletion text with the self-service Delete account button, and said what survives it.",
  "Named the data controller, the hosting region, the legal basis for each purpose, and your right to complain to Datatilsynet.",
];

/**
 * Who is responsible for the data, and how to reach them.
 *
 * Contact is the existing contact form rather than an address: the form routes
 * to a hidden mailbox in a Cloud Function, so it demonstrably reaches the
 * controller without publishing a personal email on a public page.
 */
export const PRIVACY_CONTROLLER = {
  name: "Søren Haug",
  country: "Denmark",
  contactPath: "/contact",
} as const;

/** Google Cloud region holding Firestore, Authentication and the Cloud Functions. */
export const PRIVACY_HOSTING_REGION = "europe-west1 (Belgium)";

/**
 * Whether OpenAI's data processing addendum has been accepted for this
 * organisation. Flip to true only once it actually has been -- it turns on a
 * sentence naming the DPA as the safeguard for the US transfer.
 */
export const OPENAI_DPA_ACCEPTED = false;

/**
 * The entity-extraction disclosure, in one place, because the same facts are
 * stated twice: here on the privacy page and beside the Scan note button.
 */
export const EXTRACTION_FACTS = {
  provider: "OpenAI",
  product: "the OpenAI platform API",
  caps: "10 scans a day, 30 a week and 100 a month",
  retention:
    "kept by OpenAI for up to 30 days for abuse monitoring and then deleted",
  transfer: "processed in the United States",
} as const;

/** One row of the at-a-glance table. */
export interface PrivacyTableRow {
  /** Stable key, also used as the test hook. */
  id: string;
  /** What we keep. */
  what: string;
  /** Why we keep it. */
  why: string;
  /** Where it goes. */
  where: string;
  /** How long it stays. */
  howLong: string;
  /**
   * Draws the reader's eye to the row that matters most -- the one where text
   * leaves the product. Rendered with the `card-subtle` token, never a colour.
   */
  highlighted?: boolean;
}

/**
 * The summary table. Every row is traceable to code; see the spec's section 2.
 * Retention strings that describe a session deliberately omit the durations --
 * the page interpolates INACTIVITY_TIMEOUT_TEXT and REMEMBER_ME_TEXT from
 * core/constants/time so there is only ever one definition of those numbers.
 */
export const PRIVACY_TABLE_ROWS: readonly PrivacyTableRow[] = [
  {
    id: "identifiers",
    what: "Email and username",
    why: "To sign you in and credit your work",
    where: "Firebase Authentication",
    howLong: "Until you delete the account",
  },
  {
    id: "session",
    what: "Session state",
    why: "To keep you signed in, and to time you out when idle",
    where: "Your browser and Firestore",
    howLong: "SESSION_DURATIONS",
  },
  {
    id: "campaign-content",
    what: "Campaign content",
    why: "Chapters, quests, NPCs, locations and rumors — the app itself",
    where: "Firestore, visible to your group",
    howLong: "Stays with the group if you leave",
  },
  {
    id: "extraction",
    what: "Note text you scan for entities",
    why: "To suggest NPCs, places and quests from what you wrote",
    where: "Sent to OpenAI when you press Scan note",
    howLong: "Up to 30 days for abuse monitoring, then deleted",
    highlighted: true,
  },
  {
    id: "messages",
    what: "Messages you send us",
    why: "To answer you",
    where: "Email, via a Cloud Function",
    howLong: "Until your question is resolved",
  },
];

/** A linkable section of the full policy text. */
export interface PrivacySection {
  /** The element id, so /privacy#<id> works. */
  id: string;
  /** The label shown in the sticky anchor list. */
  label: string;
}

/**
 * The full text's sections, in render order. The anchor list is generated from
 * this, so a section can never exist without a link to it, or the reverse.
 */
export const PRIVACY_SECTIONS: readonly PrivacySection[] = [
  { id: "your-rights", label: "Your rights" },
  { id: "what-we-collect", label: "What we collect" },
  { id: "groups-and-sharing", label: "Groups and sharing" },
  { id: "entity-extraction", label: "Entity extraction" },
  { id: "device-storage", label: "On your device" },
  { id: "security", label: "Security" },
  { id: "retention", label: "Retention and deletion" },
  { id: "legal-basis", label: "Legal basis" },
  { id: "changes", label: "Changes to this page" },
];
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="constants/__tests__/privacy"
```

Expected: PASS, 10 tests.

**Note on the `SESSION_DURATIONS` sentinel** in the `session` row's `howLong`: the page
replaces it at render time with the two time constants, so the durations keep exactly one
definition. Task 3 specifies how.

- [ ] **Step 5: Commit**

```bash
git add src/core/constants/privacy.ts src/core/constants/__tests__/privacy.test.ts
git commit -m "feat(privacy): pin every privacy fact to a constant, starting with the date"
```

---

## Task 2: `PrivacyLastUpdated`

**Files:**
- Create: `src/pages/privacy/PrivacyLastUpdated.tsx`
- Test: `src/pages/privacy/__tests__/PrivacyLastUpdated.test.tsx`

**Interfaces:**
- Consumes: `PRIVACY_LAST_UPDATED`, `PRIVACY_CHANGELOG` from `core/constants/privacy` (Task 1).
- Produces: `export default PrivacyLastUpdated: React.FC` — no props.

**Why a component:** the date needs a machine-readable `<time dateTime>` *and* a human
`en-GB` rendering *and* a disclosure, which is three concerns too many for a line of JSX
in the page.

- [ ] **Step 1: Write the failing test**

Create `src/pages/privacy/__tests__/PrivacyLastUpdated.test.tsx`:

```tsx
// src/pages/privacy/__tests__/PrivacyLastUpdated.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PrivacyLastUpdated from "../PrivacyLastUpdated";
import { PRIVACY_LAST_UPDATED, PRIVACY_CHANGELOG } from "core/constants/privacy";

describe("PrivacyLastUpdated", () => {
  it("renders a machine-readable time element carrying the ISO date", () => {
    const { container } = render(<PrivacyLastUpdated />);
    const time = container.querySelector("time");
    expect(time).not.toBeNull();
    expect(time).toHaveAttribute("dateTime", PRIVACY_LAST_UPDATED);
  });

  it("formats the date en-GB — day before month, month spelled out", () => {
    render(<PrivacyLastUpdated />);
    expect(screen.getByText(/3 September 2026/)).toBeInTheDocument();
  });

  it("does not render today's date when today is not the constant", () => {
    const today = new Date().toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const { container } = render(<PrivacyLastUpdated />);
    const rendered = container.querySelector("time")?.textContent ?? "";
    if (today !== rendered) {
      expect(rendered).not.toBe(today);
    }
    expect(container.querySelector("time")).toHaveAttribute(
      "dateTime",
      PRIVACY_LAST_UPDATED
    );
  });

  it("keeps the changelog collapsed until asked", () => {
    render(<PrivacyLastUpdated />);
    expect(screen.queryByText(PRIVACY_CHANGELOG[0])).not.toBeInTheDocument();
  });

  it("reveals every changelog line when the disclosure is opened", () => {
    render(<PrivacyLastUpdated />);
    fireEvent.click(screen.getByRole("button", { name: /what changed/i }));
    PRIVACY_CHANGELOG.forEach((line) => {
      expect(screen.getByText(line)).toBeInTheDocument();
    });
  });

  it("reports its expanded state to assistive technology", () => {
    render(<PrivacyLastUpdated />);
    const trigger = screen.getByRole("button", { name: /what changed/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="privacy/__tests__/PrivacyLastUpdated"
```

Expected: FAIL — `Cannot find module '../PrivacyLastUpdated'`.

- [ ] **Step 3: Write the component**

Create `src/pages/privacy/PrivacyLastUpdated.tsx`:

```tsx
// src/pages/privacy/PrivacyLastUpdated.tsx
import React, { useState } from "react";
import Typography from "core/components/Typography";
import { PRIVACY_LAST_UPDATED, PRIVACY_CHANGELOG } from "core/constants/privacy";

/**
 * Formats an ISO date the way a British-English reader expects: day first,
 * month spelled out. Explicitly en-GB, because the page previously passed
 * 'en-uk' -- not a locale tag, so it silently fell back to the browser's own
 * locale and rendered differently for every reader.
 *
 * @param isoDate Date in YYYY-MM-DD form
 */
const formatPolicyDate = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

/**
 * The policy's revision date, plus a disclosure holding the changelog.
 *
 * The date is machine-readable in a `<time dateTime>` and human-readable in the
 * element's text, and both come from PRIVACY_LAST_UPDATED -- never from the
 * clock. A policy that re-dates itself on every view records nothing.
 */
const PrivacyLastUpdated: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="sm:text-right">
      <Typography variant="body-sm" color="secondary">
        Last updated{" "}
        <time dateTime={PRIVACY_LAST_UPDATED} className="font-medium">
          {formatPolicyDate(PRIVACY_LAST_UPDATED)}
        </time>
      </Typography>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="privacy-changelog"
        className="button-link text-sm underline mt-1"
      >
        What changed
      </button>

      {isOpen && (
        <ul
          id="privacy-changelog"
          className="mt-2 space-y-1 sm:text-right list-none"
        >
          {PRIVACY_CHANGELOG.map((entry) => (
            <li key={entry}>
              <Typography variant="body-sm" color="muted">
                {entry}
              </Typography>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PrivacyLastUpdated;
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="privacy/__tests__/PrivacyLastUpdated"
```

Expected: PASS, 6 tests. If the `3 September 2026` assertion fails because
`PRIVACY_LAST_UPDATED` was bumped, update that one literal in the test to match the
constant — **do not** make the test derive the string from the same formatter it is
testing, which would assert nothing.

- [ ] **Step 5: Commit**

```bash
git add src/pages/privacy/PrivacyLastUpdated.tsx src/pages/privacy/__tests__/PrivacyLastUpdated.test.tsx
git commit -m "feat(privacy): render the revision date from a constant, in a time element"
```

---

## Task 3: `PrivacyDataTable`

**Files:**
- Create: `src/pages/privacy/PrivacyDataTable.tsx`
- Test: `src/pages/privacy/__tests__/PrivacyDataTable.test.tsx`

**Interfaces:**
- Consumes: `PRIVACY_TABLE_ROWS`, `PrivacyTableRow` from `core/constants/privacy` (Task 1); `INACTIVITY_TIMEOUT_TEXT`, `REMEMBER_ME_TEXT` from `core/constants/time`.
- Produces: `export default PrivacyDataTable: React.FC` — no props.

**The responsive approach, stated so it is not re-invented:** render the semantic
`<table>` **once**, always in the DOM, and let CSS restyle it. Below `sm`, each `<tr>`
becomes a block card and each `<td>` gets its column label from a `data-label`
attribute rendered as a `::before`-style inline span. Rendering two DOM trees and
hiding one would duplicate all five rows for screen readers, which is worse than the
layout problem it solves.

- [ ] **Step 1: Write the failing test**

Create `src/pages/privacy/__tests__/PrivacyDataTable.test.tsx`:

```tsx
// src/pages/privacy/__tests__/PrivacyDataTable.test.tsx
import React from "react";
import { render, screen, within } from "@testing-library/react";
import PrivacyDataTable from "../PrivacyDataTable";
import { PRIVACY_TABLE_ROWS } from "core/constants/privacy";
import { INACTIVITY_TIMEOUT_TEXT, REMEMBER_ME_TEXT } from "core/constants/time";

describe("PrivacyDataTable", () => {
  it("is a real table, so it is navigable as one", () => {
    render(<PrivacyDataTable />);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("has the four promised column headers", () => {
    render(<PrivacyDataTable />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual([
      "What we keep",
      "Why",
      "Where it goes",
      "How long",
    ]);
  });

  it("renders one row per disclosed category, plus the header row", () => {
    render(<PrivacyDataTable />);
    expect(screen.getAllByRole("row")).toHaveLength(PRIVACY_TABLE_ROWS.length + 1);
  });

  it("names the extraction destination in the row that matters most", () => {
    render(<PrivacyDataTable />);
    const row = screen.getByTestId("privacy-row-extraction");
    expect(within(row).getByText(/OpenAI/)).toBeInTheDocument();
  });

  it("marks the extraction row with a theme token, not a colour", () => {
    render(<PrivacyDataTable />);
    const row = screen.getByTestId("privacy-row-extraction");
    expect(row).toHaveClass("card-subtle");
    expect(row.getAttribute("style") ?? "").not.toMatch(/background|color/);
  });

  it("expands the session sentinel from the time constants, not from literals", () => {
    render(<PrivacyDataTable />);
    const row = screen.getByTestId("privacy-row-session");
    expect(within(row).getByText(new RegExp(REMEMBER_ME_TEXT))).toBeInTheDocument();
    expect(
      within(row).getByText(new RegExp(INACTIVITY_TIMEOUT_TEXT))
    ).toBeInTheDocument();
    expect(row.textContent).not.toContain("SESSION_DURATIONS");
  });

  it("labels every cell for the stacked layout, where headers are off-screen", () => {
    render(<PrivacyDataTable />);
    const row = screen.getByTestId("privacy-row-identifiers");
    const labels = within(row)
      .getAllByRole("cell")
      .map((cell) => cell.getAttribute("data-label"));
    expect(labels).toEqual(["What we keep", "Why", "Where it goes", "How long"]);
  });

  it("scrolls inside its own container rather than the page", () => {
    const { container } = render(<PrivacyDataTable />);
    expect(container.querySelector(".overflow-x-auto")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="privacy/__tests__/PrivacyDataTable"
```

Expected: FAIL — `Cannot find module '../PrivacyDataTable'`.

- [ ] **Step 3: Write the component**

Create `src/pages/privacy/PrivacyDataTable.tsx`:

```tsx
// src/pages/privacy/PrivacyDataTable.tsx
import React from "react";
import Typography from "core/components/Typography";
import { PRIVACY_TABLE_ROWS } from "core/constants/privacy";
import { INACTIVITY_TIMEOUT_TEXT, REMEMBER_ME_TEXT } from "core/constants/time";

/** The four columns, in order. Also the per-cell labels in the stacked layout. */
const COLUMNS = ["What we keep", "Why", "Where it goes", "How long"] as const;

/**
 * Expands the SESSION_DURATIONS sentinel that core/constants/privacy leaves in
 * the session row.
 *
 * The durations live in core/constants/time and are shown in several places, so
 * the privacy data must not restate them -- a policy quoting a stale timeout is
 * exactly the class of rot this redesign exists to remove.
 *
 * @param value The raw cell value from PRIVACY_TABLE_ROWS
 */
const expandSentinels = (value: string): string =>
  value.replace(
    "SESSION_DURATIONS",
    `${REMEMBER_ME_TEXT}, or ${INACTIVITY_TIMEOUT_TEXT} idle`
  );

/**
 * The at-a-glance table: what the Companion keeps, why, where it goes and for
 * how long.
 *
 * One semantic `<table>` serves both layouts. From `sm` up it is an ordinary
 * table; below `sm` each row becomes a stacked card and each cell carries its
 * column name in a `data-label` span, because the header row is visually gone
 * at that width. Rendering a second, hidden copy for small screens would
 * duplicate every row for screen-reader users.
 */
const PrivacyDataTable: React.FC = () => (
  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">
        What the Companion keeps about you, why, where it goes and how long it
        stays
      </caption>
      <thead>
        <tr className="hidden sm:table-row border-b card-divider">
          {COLUMNS.map((column) => (
            <th
              key={column}
              scope="col"
              className="py-2 pr-4 align-bottom typography-muted text-xs uppercase tracking-wide font-medium"
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {PRIVACY_TABLE_ROWS.map((row) => {
          const cells = [row.what, row.why, row.where, row.howLong];

          return (
            <tr
              key={row.id}
              data-testid={`privacy-row-${row.id}`}
              className={[
                "block sm:table-row border-b card-divider",
                "mb-3 sm:mb-0 rounded-lg sm:rounded-none p-3 sm:p-0",
                row.highlighted ? "card-subtle" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {cells.map((cell, index) => (
                <td
                  key={COLUMNS[index]}
                  data-label={COLUMNS[index]}
                  className="block sm:table-cell py-1 sm:py-3 pr-0 sm:pr-4 align-top"
                >
                  <span
                    aria-hidden="true"
                    className="sm:hidden block typography-muted text-xs uppercase tracking-wide"
                  >
                    {COLUMNS[index]}
                  </span>
                  <Typography
                    variant="body-sm"
                    color={index === 0 ? "default" : "secondary"}
                    className={index === 0 ? "font-medium" : undefined}
                  >
                    {expandSentinels(cell)}
                  </Typography>
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default PrivacyDataTable;
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="privacy/__tests__/PrivacyDataTable"
```

Expected: PASS, 9 tests.

If the column-header assertion fails because `Typography` is unmocked and wraps text in
a `div`, note that this suite deliberately does **not** mock `Typography` — it renders
the real one, so the table's semantics are tested as shipped. Fix the component, not the
test.

- [ ] **Step 5: Commit**

```bash
git add src/pages/privacy/PrivacyDataTable.tsx src/pages/privacy/__tests__/PrivacyDataTable.test.tsx
git commit -m "feat(privacy): add the at-a-glance table, stacking to cards under sm"
```

---

## Task 4: `PrivacySectionNav`

**Files:**
- Create: `src/pages/privacy/PrivacySectionNav.tsx`
- Test: `src/pages/privacy/__tests__/PrivacySectionNav.test.tsx`

**Interfaces:**
- Consumes: `PRIVACY_SECTIONS` from `core/constants/privacy` (Task 1).
- Produces: `export default PrivacySectionNav: React.FC<{ activeId?: string }>`.

`activeId` is optional; when given, that link is marked `aria-current="true"`. Task 5
passes nothing initially — scroll-spy is not in scope — but the prop exists so the page
can adopt it without a signature change.

- [ ] **Step 1: Write the failing test**

Create `src/pages/privacy/__tests__/PrivacySectionNav.test.tsx`:

```tsx
// src/pages/privacy/__tests__/PrivacySectionNav.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import PrivacySectionNav from "../PrivacySectionNav";
import { PRIVACY_SECTIONS } from "core/constants/privacy";

describe("PrivacySectionNav", () => {
  it("is a labelled landmark, so it can be skipped to and past", () => {
    render(<PrivacySectionNav />);
    expect(
      screen.getByRole("navigation", { name: /the full text/i })
    ).toBeInTheDocument();
  });

  it("links to every section, and to nothing else", () => {
    render(<PrivacySectionNav />);
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(PRIVACY_SECTIONS.map((s) => `#${s.id}`));
  });

  it("labels each link with the section's own heading text", () => {
    render(<PrivacySectionNav />);
    PRIVACY_SECTIONS.forEach((section) => {
      expect(
        screen.getByRole("link", { name: section.label })
      ).toBeInTheDocument();
    });
  });

  it("marks the active section for assistive technology", () => {
    render(<PrivacySectionNav activeId="entity-extraction" />);
    expect(
      screen.getByRole("link", { name: "Entity extraction" })
    ).toHaveAttribute("aria-current", "true");
  });

  it("marks nothing active when no section is given", () => {
    const { container } = render(<PrivacySectionNav />);
    expect(container.querySelector("[aria-current]")).toBeNull();
  });

  it("sticks on wide viewports without trapping narrow ones", () => {
    const { container } = render(<PrivacySectionNav />);
    const nav = container.querySelector("nav");
    expect(nav?.className).toContain("lg:sticky");
    expect(nav?.className).not.toMatch(/(^|\s)sticky(\s|$)/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="privacy/__tests__/PrivacySectionNav"
```

Expected: FAIL — `Cannot find module '../PrivacySectionNav'`.

- [ ] **Step 3: Write the component**

Create `src/pages/privacy/PrivacySectionNav.tsx`:

```tsx
// src/pages/privacy/PrivacySectionNav.tsx
import React from "react";
import Typography from "core/components/Typography";
import { PRIVACY_SECTIONS } from "core/constants/privacy";

interface PrivacySectionNavProps {
  /** Section id to mark as current, if the page tracks one. */
  activeId?: string;
}

/**
 * The anchor list beside the full policy text.
 *
 * Generated from PRIVACY_SECTIONS, so a section can never exist without a link
 * to it, nor a link without its section. It sticks only from `lg` up: below
 * that the list sits above the prose as an ordinary table of contents, because
 * a sticky column on a narrow screen eats the reading area it is meant to
 * serve.
 */
const PrivacySectionNav: React.FC<PrivacySectionNavProps> = ({ activeId }) => (
  <nav
    aria-label="The full text"
    className="lg:sticky lg:top-24 lg:self-start mb-6 lg:mb-0"
  >
    <Typography
      variant="body-sm"
      color="muted"
      className="uppercase tracking-wide text-xs mb-2"
    >
      The full text
    </Typography>
    <ul className="space-y-1 list-none">
      {PRIVACY_SECTIONS.map((section) => {
        const isActive = section.id === activeId;

        return (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={isActive ? "true" : undefined}
              className={[
                "block rounded px-3 py-1.5 text-sm navigation-item",
                isActive ? "navigation-item-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {section.label}
            </a>
          </li>
        );
      })}
    </ul>
  </nav>
);

export default PrivacySectionNav;
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="privacy/__tests__/PrivacySectionNav"
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/privacy/PrivacySectionNav.tsx src/pages/privacy/__tests__/PrivacySectionNav.test.tsx
git commit -m "feat(privacy): generate the sticky section list from the section constants"
```

---

## Task 5: Rewrite `PrivacyPolicyPage`

**Files:**
- Modify: `src/pages/PrivacyPolicyPage.tsx` (full rewrite, 334 lines → new content)
- Modify: `src/pages/__tests__/PrivacyPolicyPage.test.tsx` (full rewrite)

**Interfaces:**
- Consumes: `PrivacyLastUpdated` (Task 2), `PrivacyDataTable` (Task 3), `PrivacySectionNav` (Task 4), all of `core/constants/privacy` (Task 1), `INACTIVITY_TIMEOUT_TEXT` / `REMEMBER_ME_TEXT` from `core/constants/time`, `useNavigation` from `shared/hooks/useNavigation`.
- Produces: `export default PrivacyPolicyPage: React.FC` — the route component at `/privacy`, unchanged import path for `src/app/App.tsx`.

**Read the spec's §4 before starting.** Every sentence below is there because a fact in
§2 supports it. Do not add claims; do not soften the ones present.

- [ ] **Step 1: Write the failing test**

Replace `src/pages/__tests__/PrivacyPolicyPage.test.tsx` entirely:

```tsx
// src/pages/__tests__/PrivacyPolicyPage.test.tsx
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrivacyPolicyPage from "../PrivacyPolicyPage";
import {
  PRIVACY_LAST_UPDATED,
  PRIVACY_SECTIONS,
  PRIVACY_CONTROLLER,
  PRIVACY_HOSTING_REGION,
} from "core/constants/privacy";
import { INACTIVITY_TIMEOUT_TEXT, REMEMBER_ME_TEXT } from "core/constants/time";

const mockNavigateToPage = jest.fn();

jest.mock("shared/hooks/useNavigation", () => ({
  __esModule: true,
  default: () => ({ navigateToPage: mockNavigateToPage }),
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => ({ pathname: "/privacy", search: "", hash: "" }),
}));

jest.mock("shared/context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage, state: {} }),
}));

beforeEach(() => {
  mockNavigateToPage.mockClear();
});

describe("PrivacyPolicyPage — the date", () => {
  it("renders the constant, not today", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.querySelector("time")).toHaveAttribute(
      "dateTime",
      PRIVACY_LAST_UPDATED
    );
  });

  it("does not change when the clock does", () => {
    jest.useFakeTimers().setSystemTime(new Date("2031-01-15T12:00:00Z"));
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.querySelector("time")?.textContent).not.toMatch(/2031/);
    expect(container.querySelector("time")).toHaveAttribute(
      "dateTime",
      PRIVACY_LAST_UPDATED
    );
    jest.useRealTimers();
  });
});

describe("PrivacyPolicyPage — structure", () => {
  it("leads with one h1", () => {
    render(<PrivacyPolicyPage />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Privacy");
  });

  it("puts the summary table above the prose", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const table = container.querySelector("table");
    const firstSection = container.querySelector(
      `#${PRIVACY_SECTIONS[0].id}`
    );
    expect(table).not.toBeNull();
    expect(firstSection).not.toBeNull();
    expect(
      table!.compareDocumentPosition(firstSection!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("gives every section an id that its anchor link targets", () => {
    const { container } = render(<PrivacyPolicyPage />);
    PRIVACY_SECTIONS.forEach((section) => {
      expect(container.querySelector(`#${section.id}`)).not.toBeNull();
      expect(
        container.querySelector(`a[href="#${section.id}"]`)
      ).not.toBeNull();
    });
  });

  it("does not box the prose — cards are for things you can act on", () => {
    const { container } = render(<PrivacyPolicyPage />);
    PRIVACY_SECTIONS.forEach((section) => {
      const el = container.querySelector(`#${section.id}`);
      expect(el?.closest(".card")).toBeNull();
    });
  });

  it("renders exactly the three summary cards", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.querySelectorAll(".card")).toHaveLength(3);
  });

  it("hides decorative icons from assistive technology", () => {
    const { container } = render(<PrivacyPolicyPage />);
    container.querySelectorAll("svg").forEach((icon) => {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    });
  });
});

describe("PrivacyPolicyPage — content that must be there", () => {
  it("names the controller and their country", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByText(new RegExp(PRIVACY_CONTROLLER.name))
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(PRIVACY_CONTROLLER.country))
    ).toBeInTheDocument();
  });

  it("publishes no email address", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.textContent ?? "").not.toMatch(/@[\w.-]+\.\w{2,}/);
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it("discloses entity extraction, naming the provider", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#entity-extraction");
    expect(section).not.toBeNull();
    expect(section!.textContent).toContain("OpenAI");
    expect(section!.textContent).toMatch(/only the text of that note/i);
    expect(section!.textContent).toMatch(/30 days/);
    expect(section!.textContent).toMatch(/United States/);
  });

  it("states the three extraction caps, not just a monthly one", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#entity-extraction");
    expect(section!.textContent).toMatch(/10 scans a day/);
    expect(section!.textContent).toMatch(/100 a month/);
  });

  it("describes deletion as a button, and links to the profile page", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#retention");
    expect(section!.textContent).toMatch(/Delete account/);
    expect(section!.textContent).not.toMatch(/contact us to request/i);
  });

  it("routes the delete-it-yourself card to the profile page", async () => {
    render(<PrivacyPolicyPage />);
    await userEvent.click(
      screen.getByRole("button", { name: /go to your profile/i })
    );
    expect(mockNavigateToPage).toHaveBeenCalledWith("/profile");
  });

  it("routes the contact affordance to the contact page", async () => {
    render(<PrivacyPolicyPage />);
    await userEvent.click(screen.getByRole("button", { name: /ask a question/i }));
    expect(mockNavigateToPage).toHaveBeenCalledWith("/contact");
  });

  it("says concretely what survives leaving a group", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#groups-and-sharing");
    expect(section!.textContent).toMatch(/stay(s)? (behind )?with the group/i);
    expect(section!.textContent).not.toMatch(/where appropriate/i);
  });

  it("names the hosting region, in the summary card and in the legal basis", () => {
    render(<PrivacyPolicyPage />);
    // getAllByText, not getByText: the region is deliberately stated twice --
    // once where a skimmer will see it and once where the transfers claim needs
    // it -- and getByText throws on more than one match.
    expect(
      screen.getAllByText(new RegExp(PRIVACY_HOSTING_REGION.split(" ")[0]))
    ).toHaveLength(2);
  });

  it("names Datatilsynet and says you need not come to us first", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.textContent).toContain("Datatilsynet");
    expect(container.textContent).toMatch(/don't need to go through us first/i);
  });

  it("reuses the session constants rather than restating durations", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.textContent).toContain(INACTIVITY_TIMEOUT_TEXT);
    expect(container.textContent).toContain(REMEMBER_ME_TEXT);
  });

  it("claims no analytics and no advertising", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.textContent).toMatch(/no analytics/i);
    expect(container.textContent).toMatch(/no advertising/i);
  });

  it("has dropped the claims nobody can stand behind", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/regular security assessments/i);
    expect(text).not.toMatch(/where appropriate/i);
    expect(text).not.toMatch(/industry-standard/i);
  });

  it("keeps the specific security measures that are true", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#security");
    expect(section!.textContent).toMatch(/Firebase Authentication/);
    expect(section!.textContent).toMatch(/encrypted in transit/i);
  });

  it("states a legal basis", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#legal-basis");
    expect(section).not.toBeNull();
    expect(section!.textContent).toMatch(/legitimate interest|contract|consent/i);
  });

  it("discloses browser-side storage", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const section = container.querySelector("#device-storage");
    expect(section!.textContent).toMatch(/your own device|your browser/i);
  });

  it("no longer ends with a Contact Us card", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const cards = Array.from(container.querySelectorAll(".card"));
    const last = cards[cards.length - 1];
    expect(last?.textContent).not.toMatch(/^Contact Us/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="PrivacyPolicyPage"
```

Expected: FAIL — many assertions, since the old page has no `time` element, no section
ids and no extraction section.

- [ ] **Step 3: Write the page**

Replace `src/pages/PrivacyPolicyPage.tsx` entirely:

```tsx
// src/pages/PrivacyPolicyPage.tsx
import React from "react";
import { Database, EyeOff, Trash2 } from "lucide-react";
import Typography from "core/components/Typography";
import Card from "core/components/Card";
import Button from "core/components/Button";
import { useNavigation } from "shared/hooks/useNavigation";
import { INACTIVITY_TIMEOUT_TEXT, REMEMBER_ME_TEXT } from "core/constants/time";
import {
  PRIVACY_CONTROLLER,
  PRIVACY_HOSTING_REGION,
  EXTRACTION_FACTS,
  OPENAI_DPA_ACCEPTED,
} from "core/constants/privacy";
import PrivacyLastUpdated from "./privacy/PrivacyLastUpdated";
import PrivacyDataTable from "./privacy/PrivacyDataTable";
import PrivacySectionNav from "./privacy/PrivacySectionNav";

/**
 * One section of the full policy text.
 *
 * Sections are hairline-separated rather than boxed: the page reserves cards
 * for the three things a reader can act on, so that a box means "there is a
 * button in here" instead of meaning nothing.
 */
const Section: React.FC<{
  id: string;
  title: string;
  children: React.ReactNode;
}> = ({ id, title, children }) => (
  <section
    id={id}
    className="scroll-mt-24 py-6 border-t card-divider first:border-t-0 first:pt-0"
  >
    <Typography variant="h2" className="mb-3 text-xl">
      {title}
    </Typography>
    <div className="space-y-3">{children}</div>
  </section>
);

/**
 * The privacy policy.
 *
 * Ordered so the answers come before the prose: three summary cards, then the
 * at-a-glance table, then the full text beside a sticky anchor list. Every
 * factual claim below is traceable to code -- see
 * docs/superpowers/specs/2026-09-03-privacy-policy-design.md -- and anything
 * that could not be traced was cut rather than softened.
 */
const PrivacyPolicyPage: React.FC = () => {
  const { navigateToPage } = useNavigation();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ---- Heading and revision date ---- */}
      <div className="sm:flex sm:items-start sm:justify-between gap-6 mb-8">
        <div>
          <Typography variant="h1" className="mb-2">
            Privacy
          </Typography>
          <Typography color="secondary">
            What the Companion keeps about you, why, and how to get rid of it.
          </Typography>
        </div>
        <PrivacyLastUpdated />
      </div>

      {/* ---- Three summary cards ---- */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card>
          <Card.Content>
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 primary" aria-hidden="true" />
              <Typography variant="h3" className="text-base">
                Who holds your data
              </Typography>
            </div>
            <Typography variant="body-sm" color="secondary">
              {PRIVACY_CONTROLLER.name}, {PRIVACY_CONTROLLER.country}, is
              responsible for it. Stored in Google Firebase, in{" "}
              {PRIVACY_HOSTING_REGION}.
            </Typography>
            <Button
              variant="link"
              size="sm"
              className="mt-2 px-0"
              onClick={() => navigateToPage(PRIVACY_CONTROLLER.contactPath)}
            >
              Ask a question
            </Button>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content>
            <div className="flex items-center gap-2 mb-2">
              <EyeOff className="w-4 h-4 primary" aria-hidden="true" />
              <Typography variant="h3" className="text-base">
                No tracking, no ads
              </Typography>
            </div>
            <Typography variant="body-sm" color="secondary">
              No analytics, no advertising, nothing sold or shared with anyone
              for their own purposes. Signing in and "remember me" are kept on
              your own device.
            </Typography>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content>
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-4 h-4 primary" aria-hidden="true" />
              <Typography variant="h3" className="text-base">
                Delete it yourself
              </Typography>
            </div>
            <Typography variant="body-sm" color="secondary">
              Leaving a group and deleting your account are both buttons on your
              profile. You don't have to ask anyone.
            </Typography>
            <Button
              variant="link"
              size="sm"
              className="mt-2 px-0"
              onClick={() => navigateToPage("/profile")}
            >
              Go to your profile
            </Button>
          </Card.Content>
        </Card>
      </div>

      {/* ---- The at-a-glance table ---- */}
      <div className="mb-12">
        <PrivacyDataTable />
      </div>

      {/* ---- The full text ---- */}
      <div className="lg:grid lg:grid-cols-[14rem_1fr] lg:gap-10">
        <PrivacySectionNav />

        <div>
          <Section id="your-rights" title="Your rights">
            <Typography>
              You can see what we hold, correct it, take it with you, or delete
              it. Two of those are buttons rather than requests: your profile
              page lets you edit what you have written and delete your account
              outright. For the rest, ask and a person will answer.
            </Typography>
            <Typography>
              You can also object to how we use your data, or ask us to restrict
              it. If you think we have handled your data badly, you can complain
              to Datatilsynet, the Danish data protection authority — you don't
              need to go through us first.
            </Typography>
          </Section>

          <Section id="what-we-collect" title="What we collect">
            <Typography>
              An email address and a username, so you can sign in and so your
              work can be credited to you. Session state, so you stay signed in
              between visits: your session ends after{" "}
              {INACTIVITY_TIMEOUT_TEXT} of inactivity, or lasts{" "}
              {REMEMBER_ME_TEXT} if you asked to be remembered.
            </Typography>
            <Typography>
              Everything you write in a campaign — chapters, quests, NPCs,
              locations, rumors and your own notes — along with who wrote it and
              when. That is the app; there is no version of it that does not
              store what you type into it.
            </Typography>
            <Typography>
              We do not record which pages you visit or what you click. Session
              activity is detected only to decide whether you are still there.
            </Typography>
          </Section>

          <Section id="groups-and-sharing" title="Groups and sharing">
            <Typography>
              Everything you write in a campaign is visible to the other members
              of that group, credited to the character you were posting as. Your
              private notes are not — they are yours until you share them.
            </Typography>
            <Typography>
              If you leave a group, or delete your account, the chapters,
              quests, NPCs and locations you wrote stay with the group for the
              rest of the table; your name, your characters and your private
              notes are deleted.
            </Typography>
          </Section>

          <Section id="entity-extraction" title="Entity extraction">
            <Typography>
              When you press <strong>Scan note</strong>, the text of that note is
              sent to {EXTRACTION_FACTS.provider} to be read once and returned
              as suggested NPCs, places and quests. It happens only when you
              press that button — never in the background, and never to anything
              you have not asked about.
            </Typography>
            <Typography>
              Only the text of that note leaves the app: not its title, not your
              other notes, and none of your campaign content. The request goes
              through {EXTRACTION_FACTS.product}, whose terms are that your text
              is not used to train their models. It is{" "}
              {EXTRACTION_FACTS.retention}, and it is{" "}
              {EXTRACTION_FACTS.transfer}
              {OPENAI_DPA_ACCEPTED
                ? ", under their data processing addendum and standard contractual clauses."
                : "."}
            </Typography>
            <Typography>
              Scanning is capped at {EXTRACTION_FACTS.caps}. Don't paste
              anything into a note that you would not want processed this way.
            </Typography>
          </Section>

          <Section id="device-storage" title="On your device">
            <Typography>
              Your session preferences — whether you asked to be remembered, and
              which group you were last looking at — are kept in your own
              browser, not on our servers. There are no tracking cookies,
              because there is nothing tracking you: no analytics, no
              advertising, and no third-party scripts watching you read.
            </Typography>
          </Section>

          <Section id="security" title="Security">
            <Typography>
              Sign-in runs through Firebase Authentication, so we never see or
              store your password. Access to campaign data is decided by
              rules on the database itself rather than by the app asking
              politely, and everything is encrypted in transit and at rest by
              Google. Sessions time out on their own after{" "}
              {INACTIVITY_TIMEOUT_TEXT} of inactivity.
            </Typography>
            <Typography>
              No service on the internet can promise perfect security, and we
              won't. What we can say is which measures are actually in place —
              the four above — rather than describing an audit programme that
              does not exist.
            </Typography>
          </Section>

          <Section id="retention" title="Retention and deletion">
            <Typography>
              Your account and everything in it stays until you delete it. There
              is a <strong>Delete account</strong> button in the danger zone of
              your profile page; it removes your account, your profile in every
              group you belong to, your usernames and your private notes, and it
              cannot be undone. You do not need to email anyone to make that
              happen.
            </Typography>
            <Typography>
              The campaign content you wrote stays with the group, so you don't
              take the table's shared history with you when you go. Messages you
              send through the contact form are kept only until your question is
              resolved, and are never used to market anything at you.
            </Typography>
          </Section>

          <Section id="legal-basis" title="Legal basis">
            <Typography>
              We process your account details and campaign content to give you
              the service you signed up for — that is <em>performance of a
              contract</em>. Session handling and access control rest on our{" "}
              <em>legitimate interest</em> in keeping accounts secure. Sending a
              note for entity extraction happens on your <em>consent</em>,
              expressed by pressing the button, and you can simply not press it.
            </Typography>
            <Typography>
              Data is held in Google Firebase in {PRIVACY_HOSTING_REGION}. Two
              things reach outside the EU: entity extraction, described above,
              and Google's own operation of the platform, which can involve
              support access from other countries.
            </Typography>
          </Section>

          <Section id="changes" title="Changes to this page">
            <Typography>
              When this policy changes, the date at the top changes with it and
              the change is listed under "What changed". The date is written by
              hand for exactly that reason — a page that re-dates itself every
              time you open it records nothing at all.
            </Typography>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="PrivacyPolicyPage"
```

Expected: PASS. If the "no email address" assertion trips on the word "email" in prose,
check the regex is matching an actual address and not the word — it requires an `@`.

- [ ] **Step 5: Type-check, because the page is the largest single change**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PrivacyPolicyPage.tsx src/pages/__tests__/PrivacyPolicyPage.test.tsx
git commit -m "feat(privacy): lead with the answers, and disclose entity extraction"
```

---

## Task 6: Delete private notes when the account or membership goes

**Files:**
- Create: `firebase/functions/src/shared/deleteUserSubtree.ts`
- Modify: `firebase/functions/src/userManagement/deleteUser.ts`
- Modify: `firebase/functions/src/userManagement/removeUserFromGroup.ts`

**Interfaces:**
- Consumes: `firebase-admin` (already a dependency, v12).
- Produces: `export async function deleteGroupUserDocument(groupId: string, userId: string): Promise<void>`

**Why this is in a privacy PR.** Notes live at `groups/{groupId}/users/{userId}/notes`, a
**subcollection** of the group-user document. Firestore does not cascade-delete
subcollections, so today's `batch.delete(groupUserRef)` orphans every private note
instead of deleting it. Without this fix, Task 5's sentence "your private notes are
deleted" would be false — which is the one kind of error a privacy page must not make.

**There is no test harness in `firebase/functions`** — no jest, no test script, no test
files. Adding one is a larger change than this fix deserves, so verification here is
against the emulator, with the exact steps written out below. Do not skip them and do
not claim the fix works without running them.

- [ ] **Step 1: Write the shared helper**

Create `firebase/functions/src/shared/deleteUserSubtree.ts`:

```ts
// functions/src/shared/deleteUserSubtree.ts
import * as admin from "firebase-admin";

/**
 * Deletes a user's profile document inside a group, together with everything
 * beneath it.
 *
 * A plain `batch.delete()` on the group-user document leaves its subcollections
 * behind: Firestore has no cascade, and orphaned documents stay readable by
 * anything holding their path. The only per-user subcollection today is
 * `notes`, which holds private notes -- so the plain delete was silently
 * retaining the most personal data in the product after a user asked for it to
 * be gone.
 *
 * `recursiveDelete` walks the whole subtree, so it stays correct if another
 * per-user subcollection is added later. It cannot participate in a
 * WriteBatch, so callers must invoke it alongside their batch rather than
 * inside it.
 *
 * @param groupId Group holding the user profile
 * @param userId User whose profile and subtree should be removed
 */
export async function deleteGroupUserDocument(
  groupId: string,
  userId: string
): Promise<void> {
  const groupUserRef = admin
    .firestore()
    .collection("groups")
    .doc(groupId)
    .collection("users")
    .doc(userId);

  await admin.firestore().recursiveDelete(groupUserRef);
}
```

- [ ] **Step 2: Use it in `deleteUser.ts`**

In `firebase/functions/src/userManagement/deleteUser.ts`, add the import at the top of
the import block:

```ts
import {deleteGroupUserDocument} from "../shared/deleteUserSubtree";
```

Then, inside the `for (const groupId of groups)` loop, **remove** the line that batches
the group-user delete:

```ts
        // Delete group user profile
        batch.delete(groupUserRef);
```

The username-reservation delete stays in the batch. After the loop, and **before**
`await batch.commit()`, add:

```ts
      // The group-user profile is deleted separately from the batch: it owns a
      // `notes` subcollection, and a batched delete would orphan every note
      // rather than remove it. recursiveDelete cannot join a WriteBatch.
      await Promise.all(
        groups.map((groupId: string) =>
          deleteGroupUserDocument(groupId, userIdToDelete)
        )
      );
```

The `groupUserRef` and `groupUserDoc` reads above stay as they are — the username
lookup still needs them.

- [ ] **Step 3: Use it in `removeUserFromGroup.ts`**

Same change. Add the import:

```ts
import {deleteGroupUserDocument} from "../shared/deleteUserSubtree";
```

Remove `batch.delete(userProfileRef);` (line ~112), and after the batch commit add:

```ts
      // Leaving a group takes your private notes with you; they live in a
      // subcollection of this document, which a batched delete would orphan.
      await deleteGroupUserDocument(groupId, userId);
```

Match the surrounding code's variable names — read the file rather than assuming
`groupId` / `userId` are what they are called there.

- [ ] **Step 4: Compile the functions**

```bash
cd firebase/functions && npm run build
```

Expected: clean `tsc` output, `lib/shared/deleteUserSubtree.js` produced.

- [ ] **Step 5: Lint**

```bash
cd firebase/functions && npm run lint
```

Expected: no errors. The functions ESLint config is `eslint-config-google` and is
stricter than the app's — expect to be told about indentation and about
`import {x} from` spacing, which is why the snippets above have no space inside the
braces.

- [ ] **Step 6: Verify against the emulator — this is the test**

```powershell
.\scripts\start-dev.ps1 -Action start
.\scripts\manage-dev-data.ps1 -Action generate
```

Then, in the emulator UI at `http://127.0.0.1:4000`:

1. Sign in as a generated user, open Notes, and create a note so
   `groups/{groupId}/users/{userId}/notes` has at least one document. Confirm it in
   the Firestore emulator tab.
2. Go to `/profile` → danger zone → **Delete account**, and complete the dialog.
3. In the Firestore tab, navigate to `groups/{groupId}/users/{userId}`. **Before this
   fix** the document shows as missing but still lists a `notes` subcollection holding
   your note. **After it**, the subcollection is gone.
4. Repeat with a second user and **Leave group** instead of Delete account, to cover
   `removeUserFromGroup`.

```powershell
.\scripts\start-dev.ps1 -Action stop
```

Record what you observed in the commit message. If step 3 still shows notes, stop and
report — do not proceed to Task 5's copy claiming notes are deleted.

- [ ] **Step 7: Commit**

```bash
git add firebase/functions/src/shared/deleteUserSubtree.ts firebase/functions/src/userManagement/deleteUser.ts firebase/functions/src/userManagement/removeUserFromGroup.ts
git commit -m "fix(functions): delete private notes with the profile that owns them"
```

---

## Task 7: Disclose the destination at the Scan note button

**Files:**
- Modify: `src/features/collaboration/notes/components/CampaignLinksPanel.tsx`
- Modify: `src/features/collaboration/notes/components/__tests__/CampaignLinksPanel.test.tsx`

**Interfaces:**
- Consumes: `EXTRACTION_FACTS` from `core/constants/privacy` (Task 1).
- Produces: nothing new.

A privacy page nobody opens is not a disclosure. The line goes where the decision is
made — under the button that sends the text.

- [ ] **Step 1: Read the file first**

```bash
sed -n '355,395p' src/features/collaboration/notes/components/CampaignLinksPanel.tsx
```

You need the exact shape of the header row holding the **Scan note** button (around
line 361–382) before editing it.

- [ ] **Step 2: Write the failing test**

Append to `src/features/collaboration/notes/components/__tests__/CampaignLinksPanel.test.tsx`, inside the outermost `describe`:

```tsx
  it("says where the note text goes, next to the button that sends it", () => {
    renderPanel();
    expect(
      screen.getByText(/Sends this note's text to OpenAI/i)
    ).toBeInTheDocument();
  });

  it("links that disclosure to the privacy page", () => {
    renderPanel();
    const link = screen.getByRole("link", { name: /how this works/i });
    expect(link).toHaveAttribute("href", "/privacy#entity-extraction");
  });
```

Use whatever render helper the existing suite already defines rather than
`renderPanel()` if it is named differently — read the top of the file.

- [ ] **Step 3: Run it and watch it fail**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="CampaignLinksPanel"
```

Expected: the two new tests FAIL; every existing test still passes.

- [ ] **Step 4: Add the disclosure**

Add the import alongside the existing ones:

```tsx
import { EXTRACTION_FACTS } from "core/constants/privacy";
```

Then, immediately after the closing `</div>` of the header row that contains the
**Scan note** button, insert:

```tsx
      {/*
        The disclosure belongs where the decision is made, not only on the
        privacy page. One line: what leaves, and where it goes.
      */}
      <Typography variant="body-sm" color="muted" className="mt-2">
        Sends this note's text to {EXTRACTION_FACTS.provider} to look for names.{" "}
        <a href="/privacy#entity-extraction" className="underline">
          How this works
        </a>
      </Typography>
```

- [ ] **Step 5: Run the whole suite for this file and watch it pass**

```bash
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="CampaignLinksPanel"
```

Expected: PASS, with the pre-existing test count plus two.

- [ ] **Step 6: Commit**

```bash
git add src/features/collaboration/notes/components/CampaignLinksPanel.tsx src/features/collaboration/notes/components/__tests__/CampaignLinksPanel.test.tsx
git commit -m "feat(notes): say where the note text goes, beside the button that sends it"
```

---

## Task 8: PR template with the date-bump reminder

**Files:**
- Create: `.github/pull_request_template.md`

`.github/` currently holds only `workflows/`, so this is a new file and cannot collide.

- [ ] **Step 1: Write it**

```markdown
## What this changes

<!-- One or two sentences. -->

## Checks

- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes, with no new failures against the recorded baseline
- [ ] `npm run build` passes — it is not implied by the two above; webpack ignores
      tsconfig `paths`, so `@/…` imports fail here and only here
- [ ] If this PR changes what the app collects, stores, sends to a third party, or
      retains: **`PRIVACY_LAST_UPDATED` in `src/core/constants/privacy.ts` is bumped**
      and `PRIVACY_CHANGELOG` says what changed
```

- [ ] **Step 2: Commit**

```bash
git add .github/pull_request_template.md
git commit -m "chore: add a PR template that catches an unbumped privacy date"
```

---

## Task 9: Whole-branch verification and review

Run by the orchestrator, not delegated. No step here may be reported as passing without
its output in hand.

- [ ] **Step 1: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 2: Full suite**

```bash
npm test 2>&1 | tail -40
```

Expected: **0 failed, 2 skipped**, suite count ≥ 233 (the baseline 230 plus the three new
privacy suites). If anything is red, run that suite alone before concluding it is a
regression — a full run piped through `tail` discards earlier failures' names.

- [ ] **Step 3: Production build — the gate the other two do not imply**

```bash
npm run build
```

Expected: success. A `Module not found` here means an `@/…` import slipped into shipping
code; convert it to a bare `baseUrl` specifier.

- [ ] **Step 4: Look at the page at 320px**

```powershell
.\scripts\start-dev.ps1 -Action start
```

Open `/privacy` at a 320px viewport width and confirm: the table stacks to labelled
cards, no horizontal scrollbar appears on the page body, the anchor list sits above the
prose rather than sticking, and the summary cards are full width. Then check `/privacy`
at 1440px: the anchor list sticks, the table is a table, the three cards are a row.
Follow one anchor link and confirm the heading is not hidden behind the header — that is
what `scroll-mt-24` on `Section` is for.

- [ ] **Step 5: Read the rendered copy once, as a reader**

Check every factual claim against the spec's §2. Specifically: the extraction section
names OpenAI, the platform API, 30 days, the United States and the three caps; the
retention section describes a button and not an email; no email address appears
anywhere; the durations match `core/constants/time` and not screenshot `8c`.

- [ ] **Step 6: Review the whole diff**

```bash
git diff main...HEAD --stat
git diff main...HEAD
```

Check against the definition of done below.

---

## Definition of done

- [ ] `Last updated` comes from `PRIVACY_LAST_UPDATED`, renders inside `<time dateTime>`, and is formatted `en-GB`.
- [ ] A test asserts the rendered date is not derived from `Date.now()` — including under a faked system clock.
- [ ] Three summary cards and a semantic `<table>` appear above the prose; no prose section is inside a `.card`.
- [ ] Every section has an `id`, and every `id` has a link in the sticky anchor list.
- [ ] Entity extraction has its own section naming OpenAI, the platform API, the 30-day abuse-monitoring retention, the US transfer and all three usage caps.
- [ ] The **Scan note** button carries a one-line disclosure linking to `/privacy#entity-extraction`.
- [ ] Deletion copy describes the real self-service flow and points at the profile page — and private notes are now genuinely deleted, verified against the emulator.
- [ ] Controller identity, contact route, legal basis, hosting region, transfers, retention periods and the Datatilsynet line are all present; no email address is published.
- [ ] "Regular security assessments", "industry-standard" and "where appropriate" are gone.
- [ ] Readable at 320px: the table stacks, nothing overflows.
- [ ] `npx tsc --noEmit`, `npm test` and `npm run build` all pass.

## Follow-ups this PR deliberately does not do

1. **Accept OpenAI's data processing addendum** in the platform dashboard, then set `OPENAI_DPA_ACCEPTED = true` and bump `PRIVACY_LAST_UPDATED`. One-line change; it turns on the safeguard clause in the transfers sentence.
2. `PrivacyNotice.tsx`, the sign-in consent toast, still describes the old policy shape.
3. `gpt-3.5-turbo` remains the default extraction model; worth revisiting on its own merits.
