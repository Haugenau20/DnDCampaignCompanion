# Contact Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the contact page from a three-column form surrounded by instructions into one centred column where the category is a real field, the response expectation is stated up front, and guidance sits beside the field it governs.

**Architecture:** `ContactForm.tsx` (380 lines today) is decomposed into a `contact/` folder of single-responsibility units — a pure category model, a polling init hook, and three presentational components — with `ContactForm.tsx` remaining at its current path as the composer that owns validation, payload assembly and submit. The Firebase callable gains a `category` field and composes the email subject server-side, returning a `CC-####` reference. Both halves keep back-compat guards because they deploy separately.

**Tech Stack:** React 18.2 + TypeScript, TailwindCSS with the project's CSS-variable theme system, Firebase callable functions (`firebase-functions/v2/https`), nodemailer, Jest + React Testing Library, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-08-30-contact-redesign-design.md` — read it before starting any task. It records the payload contract, the category model and the back-compat reasoning that every task below depends on.

## Global Constraints

- **Never hardcode colours.** Use the theme's CSS classes (`.card`, `.card-subtle`, `.card-border`, `.card-divider`, `.typography`, `.primary`, `.button-*`, `.input`, `.form-label`) and CSS variables in `src/core/themes/css/`. The mock's hex values are for structure and hierarchy only. Three themes ship (light, dark, medieval) and all three must work.
- **Import style:** bare `baseUrl` imports (`core/components/Button`, `features/user-management`) in anything that ships. `@/…` alias imports pass `tsc` and jest and then **fail `npm run build`** — webpack honours `baseUrl` but ignores `paths`. `@/` is permitted only inside `__tests__/`.
- **Never reach into a feature's internals.** `shared/` may import `features/user-management`'s **barrel** (`features/user-management`) only. This is the amended rule #3 in CLAUDE.md.
- **Double quotes** per ESLint config. **JSDoc** on every exported function, component and non-obvious variable. Components PascalCase, utilities camelCase.
- **The test suite baseline is fully green** — 0 failed across 185 suites. Any red you see is a regression you caused. Never edit a test to make it pass.
- **Coverage floor is a uniform 80%** (branches / functions / lines / statements) in `jest.config.ts`.
- **Category ids, verbatim, in both halves:** `broken`, `feature`, `smart-detection`, `account`, `other`.
- **Subject labels, verbatim:** `broken` → `Bug report`; `feature` → `Feature request`; `smart-detection` → `Smart detection limit increase`; `account` → `Account or group`; `other` → `General enquiry`.
- **Copy is specified exactly.** Where this plan gives a string, use that string character for character, including the em dashes (—) and the middle dot (·). The copy is the design.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/shared/components/contact/contact-categories.ts` | **Create.** The five categories as data; legacy `?subject=` mapping. No React. | 1 |
| `src/core/constants/app.ts` | **Create.** `APP_VERSION`, which the repo has no source for today. | 1 |
| `src/shared/components/contact/useFunctionsReady.ts` | **Create.** Bounded polling for the `functions` service; replaces the single 1 s retry. | 2 |
| `firebase/functions/src/contact.ts` | **Modify.** Accept `category`/`reason`/`context`, compose the subject, generate and return `CC-####`. | 3 |
| `src/shared/components/contact/CategoryChips.tsx` | **Create.** Single-select pill radiogroup. Presentational. | 4 |
| `src/shared/components/contact/SenderIdentity.tsx` | **Create.** Prefilled identity row, or the plain inputs. Presentational. | 5 |
| `src/shared/components/contact/ContactSuccess.tsx` | **Create.** The confirmation card. Presentational. | 6 |
| `src/shared/components/ContactForm.tsx` | **Rewrite.** Composes the above; owns validation, payload, submit. Path unchanged. | 7 |
| `src/core/themes/css/components.css` | **Modify.** One new documented class for the inverted callout. | 8 |
| `src/pages/ContactPage.tsx` | **Rewrite.** One centred column; back link, title, intro, callout. | 8 |
| `src/app/layout/Header.tsx` | **Modify.** "Report a problem" entry point carrying `?from=`. | 9 |

Presentational components take everything they render as props and call no context hooks. `ContactForm` owns the hooks. This is what makes tasks 4–6 testable without a provider tree, and what lets them be written before `ContactForm` exists.

---

## Task 1: The category model and APP_VERSION

**Files:**
- Create: `src/shared/components/contact/contact-categories.ts`
- Create: `src/core/constants/app.ts`
- Test: `src/shared/components/contact/__tests__/contact-categories.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ContactCategoryId = "broken" | "feature" | "smart-detection" | "account" | "other"`
  - `interface ContactCategory { id: ContactCategoryId; chipLabel: string; subjectLabel: string; guidance: string | null; extraFieldLabel: string | null; }`
  - `const CONTACT_CATEGORIES: readonly ContactCategory[]`
  - `function getContactCategory(id: ContactCategoryId): ContactCategory`
  - `function categoryFromLegacySubject(subject: string): ContactCategoryId | null`
  - `const APP_VERSION: string` from `core/constants/app`

- [ ] **Step 1: Write the failing test**

Create `src/shared/components/contact/__tests__/contact-categories.test.ts`:

```ts
// src/shared/components/contact/__tests__/contact-categories.test.ts
import {
  CONTACT_CATEGORIES,
  getContactCategory,
  categoryFromLegacySubject,
  ContactCategoryId,
} from "../contact-categories";

describe("contact-categories", () => {
  describe("CONTACT_CATEGORIES", () => {
    it("declares exactly the five categories, in chip order", () => {
      expect(CONTACT_CATEGORIES.map((c) => c.id)).toEqual([
        "broken",
        "feature",
        "smart-detection",
        "account",
        "other",
      ]);
    });

    it("gives every category a chip label and a subject label", () => {
      CONTACT_CATEGORIES.forEach((category) => {
        expect(category.chipLabel.length).toBeGreaterThan(0);
        expect(category.subjectLabel.length).toBeGreaterThan(0);
      });
    });

    it("uses the subject labels the cloud function mirrors", () => {
      const subjects = Object.fromEntries(
        CONTACT_CATEGORIES.map((c) => [c.id, c.subjectLabel])
      );
      expect(subjects).toEqual({
        "broken": "Bug report",
        "feature": "Feature request",
        "smart-detection": "Smart detection limit increase",
        "account": "Account or group",
        "other": "General enquiry",
      });
    });

    it("gives guidance only to the categories that need it", () => {
      // account and other deliberately have none -- inventing filler copy
      // would rebuild the permanent column of prose in a new location.
      const withGuidance = CONTACT_CATEGORIES.filter((c) => c.guidance !== null);
      expect(withGuidance.map((c) => c.id)).toEqual([
        "broken",
        "feature",
        "smart-detection",
      ]);
    });

    it("asks for a second field only for smart-detection", () => {
      const withExtra = CONTACT_CATEGORIES.filter(
        (c) => c.extraFieldLabel !== null
      );
      expect(withExtra.map((c) => c.id)).toEqual(["smart-detection"]);
      expect(withExtra[0].extraFieldLabel).toBe("Why do you need more?");
    });

    it("tells a bug reporter the three things that help most", () => {
      const broken = getContactCategory("broken");
      expect(broken.guidance).toBe(
        "For a bug, three things help most: what you clicked, what happened, and what you expected instead."
      );
    });
  });

  describe("getContactCategory", () => {
    it("returns the category for a known id", () => {
      expect(getContactCategory("feature").chipLabel).toBe("Feature idea");
    });

    it("throws for an unknown id rather than returning undefined", () => {
      expect(() =>
        getContactCategory("nonsense" as ContactCategoryId)
      ).toThrow(/nonsense/);
    });
  });

  describe("categoryFromLegacySubject", () => {
    it("maps the deep link EntityExtractionService actually sends", () => {
      expect(
        categoryFromLegacySubject("Smart Detection Limit Increase Request")
      ).toBe("smart-detection");
    });

    it("matches on the Limit Increase substring alone", () => {
      expect(categoryFromLegacySubject("Usage Limit Increase")).toBe(
        "smart-detection"
      );
    });

    it("returns null for a subject that maps to no category", () => {
      expect(categoryFromLegacySubject("Hello there")).toBeNull();
    });

    it("returns null for an empty subject", () => {
      expect(categoryFromLegacySubject("")).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="contact-categories"
```

Expected: FAIL — `Cannot find module "../contact-categories"`.

- [ ] **Step 3: Write the implementation**

Create `src/shared/components/contact/contact-categories.ts`:

```ts
// src/shared/components/contact/contact-categories.ts

/**
 * The fixed set of things a person can contact us about.
 *
 * This used to be a free-text subject line that the app deep-linked a magic
 * string into and then recovered with `subject.includes("Limit Increase")`.
 * It was always a category; it is now typed as one.
 *
 * The ids and subject labels here are mirrored in
 * `firebase/functions/src/contact.ts`, which cannot import from `src/`
 * because it is a separate npm package. See the design doc, section 4.
 */
export type ContactCategoryId =
  | "broken"
  | "feature"
  | "smart-detection"
  | "account"
  | "other";

/**
 * One contact category.
 */
export interface ContactCategory {
  /** Stable id, sent to the cloud function as the `category` field */
  id: ContactCategoryId;
  /** Text on the selectable pill */
  chipLabel: string;
  /** What the composed email subject calls this category */
  subjectLabel: string;
  /** Helper copy shown under the message field, or null if none applies */
  guidance: string | null;
  /** Label for the optional second field, or null if this category has none */
  extraFieldLabel: string | null;
}

/**
 * The categories, in the order their chips are rendered.
 */
export const CONTACT_CATEGORIES: readonly ContactCategory[] = [
  {
    id: "broken",
    chipLabel: "Something is broken",
    subjectLabel: "Bug report",
    guidance:
      "For a bug, three things help most: what you clicked, what happened, and what you expected instead.",
    extraFieldLabel: null,
  },
  {
    id: "feature",
    chipLabel: "Feature idea",
    subjectLabel: "Feature request",
    guidance:
      "Describe the feature and how it would improve your experience — what you're trying to do matters more than how you'd build it.",
    extraFieldLabel: null,
  },
  {
    id: "smart-detection",
    chipLabel: "More smart detection",
    subjectLabel: "Smart detection limit increase",
    guidance:
      "Tell us roughly how much you scan and what for. That's what we weigh when raising a limit.",
    extraFieldLabel: "Why do you need more?",
  },
  {
    id: "account",
    chipLabel: "Account or group",
    subjectLabel: "Account or group",
    guidance: null,
    extraFieldLabel: null,
  },
  {
    id: "other",
    chipLabel: "Something else",
    subjectLabel: "General enquiry",
    guidance: null,
    extraFieldLabel: null,
  },
];

/**
 * Look up a category by id.
 *
 * Throws rather than returning undefined: every caller in the app holds an
 * id that came out of this module, so a miss is a programming error and
 * should be loud, not a silently unrendered chip.
 *
 * @param id - The category id to look up
 * @returns The matching category
 */
export const getContactCategory = (id: ContactCategoryId): ContactCategory => {
  const found = CONTACT_CATEGORIES.find((category) => category.id === id);
  if (!found) {
    throw new Error(`Unknown contact category: ${id}`);
  }
  return found;
};

/**
 * Map a legacy `?subject=` deep link onto a category.
 *
 * `EntityExtractionService` links to
 * `/contact?subject=Smart Detection Limit Increase Request`, and older links
 * in the wild may carry variants. Those keep working; anything unrecognised
 * returns null, and the caller passes the string through as free text rather
 * than mislabelling it as a category it is not.
 *
 * @param subject - The raw `subject` query parameter
 * @returns The category id, or null when the subject maps to none
 */
export const categoryFromLegacySubject = (
  subject: string
): ContactCategoryId | null => {
  if (subject.includes("Limit Increase")) {
    return "smart-detection";
  }
  return null;
};
```

Create `src/core/constants/app.ts`:

```ts
// src/core/constants/app.ts

/**
 * The running app version, attached to contact submissions so a bug report
 * says which build it came from without the reporter having to know.
 *
 * Create React App only exposes environment variables prefixed
 * `REACT_APP_`, and nothing sets one today, so the fallback is what a local
 * dev build reports. Set `REACT_APP_VERSION` in the deploy environment to
 * make this meaningful in production.
 */
export const APP_VERSION = process.env.REACT_APP_VERSION || "0.1.0-dev";
```

- [ ] **Step 4: Run the test to verify it passes**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="contact-categories"
```

Expected: PASS, 12 tests.

- [ ] **Step 5: Typecheck**

```
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/contact/contact-categories.ts src/core/constants/app.ts src/shared/components/contact/__tests__/contact-categories.test.ts
git commit -m "feat(contact): make the contact subject a typed category"
```

---

## Task 2: Bounded polling for the functions service

**Files:**
- Create: `src/shared/components/contact/useFunctionsReady.ts`
- Test: `src/shared/components/contact/__tests__/useFunctionsReady.test.ts`

**Interfaces:**
- Consumes: `ServiceRegistry` from `core/services/firebase/core/ServiceRegistry` — a singleton with `getInstance()`, `has(name: string): boolean` and `get<T>(name: string): T`.
- Produces:
  - `interface FunctionsReadyState { ready: boolean; failed: boolean; }`
  - `function useFunctionsReady(): FunctionsReadyState`
  - `const FUNCTIONS_POLL_INTERVAL_MS = 250`
  - `const FUNCTIONS_POLL_TIMEOUT_MS = 5000`

**Why this exists:** `ContactForm` currently checks the registry once, retries once after 1 s, and then gives up permanently — the submit button reads `Initializing…` forever. One `setTimeout` also cannot be exercised deterministically in a test. An interval can.

- [ ] **Step 1: Write the failing test**

Create `src/shared/components/contact/__tests__/useFunctionsReady.test.ts`:

```ts
// src/shared/components/contact/__tests__/useFunctionsReady.test.ts
import { renderHook, act } from "@testing-library/react";
import {
  useFunctionsReady,
  FUNCTIONS_POLL_INTERVAL_MS,
  FUNCTIONS_POLL_TIMEOUT_MS,
} from "../useFunctionsReady";

const mockHas = jest.fn();

jest.mock("core/services/firebase/core/ServiceRegistry", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({ has: mockHas })),
  },
}));

describe("useFunctionsReady", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockHas.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("reports ready immediately when the service is already registered", () => {
    mockHas.mockReturnValue(true);

    const { result } = renderHook(() => useFunctionsReady());

    expect(result.current.ready).toBe(true);
    expect(result.current.failed).toBe(false);
  });

  it("is neither ready nor failed while it is still polling", () => {
    mockHas.mockReturnValue(false);

    const { result } = renderHook(() => useFunctionsReady());
    act(() => {
      jest.advanceTimersByTime(FUNCTIONS_POLL_INTERVAL_MS * 2);
    });

    expect(result.current.ready).toBe(false);
    expect(result.current.failed).toBe(false);
  });

  it("becomes ready when the service appears part-way through the window", () => {
    mockHas.mockReturnValue(false);

    const { result } = renderHook(() => useFunctionsReady());

    mockHas.mockReturnValue(true);
    act(() => {
      jest.advanceTimersByTime(FUNCTIONS_POLL_INTERVAL_MS);
    });

    expect(result.current.ready).toBe(true);
    expect(result.current.failed).toBe(false);
  });

  it("fails only after the whole window has elapsed", () => {
    mockHas.mockReturnValue(false);

    const { result } = renderHook(() => useFunctionsReady());

    act(() => {
      jest.advanceTimersByTime(FUNCTIONS_POLL_TIMEOUT_MS - FUNCTIONS_POLL_INTERVAL_MS);
    });
    expect(result.current.failed).toBe(false);

    act(() => {
      jest.advanceTimersByTime(FUNCTIONS_POLL_INTERVAL_MS);
    });
    expect(result.current.failed).toBe(true);
    expect(result.current.ready).toBe(false);
  });

  it("stops polling once it is ready", () => {
    mockHas.mockReturnValue(true);

    renderHook(() => useFunctionsReady());
    const callsAfterMount = mockHas.mock.calls.length;

    act(() => {
      jest.advanceTimersByTime(FUNCTIONS_POLL_INTERVAL_MS * 10);
    });

    expect(mockHas.mock.calls.length).toBe(callsAfterMount);
  });

  it("treats a throwing registry as a failure rather than crashing", () => {
    mockHas.mockImplementation(() => {
      throw new Error("registry exploded");
    });

    const { result } = renderHook(() => useFunctionsReady());

    expect(result.current.failed).toBe(true);
    expect(result.current.ready).toBe(false);
  });

  it("clears its interval on unmount", () => {
    mockHas.mockReturnValue(false);

    const { unmount } = renderHook(() => useFunctionsReady());
    unmount();
    const callsAfterUnmount = mockHas.mock.calls.length;

    act(() => {
      jest.advanceTimersByTime(FUNCTIONS_POLL_INTERVAL_MS * 4);
    });

    expect(mockHas.mock.calls.length).toBe(callsAfterUnmount);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="useFunctionsReady"
```

Expected: FAIL — `Cannot find module "../useFunctionsReady"`.

- [ ] **Step 3: Write the implementation**

Create `src/shared/components/contact/useFunctionsReady.ts`:

```ts
// src/shared/components/contact/useFunctionsReady.ts
import { useEffect, useRef, useState } from "react";
import ServiceRegistry from "core/services/firebase/core/ServiceRegistry";

/** How often to re-check whether the functions service has registered */
export const FUNCTIONS_POLL_INTERVAL_MS = 250;

/** How long to keep checking before calling it a real failure */
export const FUNCTIONS_POLL_TIMEOUT_MS = 5000;

/**
 * Whether the Firebase Functions service is available yet.
 */
export interface FunctionsReadyState {
  /** True once the service is registered */
  ready: boolean;
  /** True once the polling window has closed without the service appearing */
  failed: boolean;
}

/**
 * Wait for the Firebase Functions service to register, without hanging.
 *
 * The previous implementation checked once, retried once after a second,
 * and then set a terminal error while the submit button read
 * "Initializing..." forever. This polls for a bounded window instead.
 *
 * `failed` is informational: callers should surface it but must NOT disable
 * submit on it. The registry may have recovered since the window closed, and
 * the submit path fetches the callable itself and reports its own errors.
 *
 * @returns The current readiness state
 */
export const useFunctionsReady = (): FunctionsReadyState => {
  const [state, setState] = useState<FunctionsReadyState>(() => {
    try {
      return {
        ready: ServiceRegistry.getInstance().has("functions"),
        failed: false,
      };
    } catch (error) {
      console.error("Failed to access the service registry:", error);
      return { ready: false, failed: true };
    }
  });

  // Held in a ref so the effect below never needs `state` as a dependency,
  // which would tear down and rebuild the interval on every tick.
  const settled = useRef(state.ready || state.failed);

  useEffect(() => {
    if (settled.current) {
      return;
    }

    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += FUNCTIONS_POLL_INTERVAL_MS;

      try {
        if (ServiceRegistry.getInstance().has("functions")) {
          settled.current = true;
          clearInterval(interval);
          setState({ ready: true, failed: false });
          return;
        }
      } catch (error) {
        console.error("Failed to access the service registry:", error);
        settled.current = true;
        clearInterval(interval);
        setState({ ready: false, failed: true });
        return;
      }

      if (elapsed >= FUNCTIONS_POLL_TIMEOUT_MS) {
        settled.current = true;
        clearInterval(interval);
        setState({ ready: false, failed: true });
      }
    }, FUNCTIONS_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return state;
};
```

- [ ] **Step 4: Run the test to verify it passes**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="useFunctionsReady"
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/shared/components/contact/useFunctionsReady.ts src/shared/components/contact/__tests__/useFunctionsReady.test.ts
git commit -m "feat(contact): stop the form hanging on Initializing forever"
```

---

## Task 3: Server-side subject composition and the reference

**Files:**
- Modify: `firebase/functions/src/contact.ts`

**Interfaces:**
- Consumes: nothing from other tasks. **This task must not import from `src/`** — `firebase/functions/` is a separate npm package with its own `tsconfig` and cannot resolve it. The category ids and subject labels are duplicated here deliberately; see the design doc, section 4.
- Produces: a callable that accepts `{ name, email, message, category?, subject?, reason?, context? }` and returns `{ success: true, message: string, reference: string }`.

**There are no tests in `firebase/functions/`** — the package has no test setup and adding one is out of scope. Verify with `npx tsc --noEmit` inside the functions package and by reading the composed output carefully.

- [ ] **Step 1: Extend the request interface**

In `firebase/functions/src/contact.ts`, replace the `ContactFormData` interface with:

```ts
/**
 * The set of things a person can contact us about.
 *
 * Mirrors `src/shared/components/contact/contact-categories.ts`. This package
 * cannot import from `src/` -- it is a separate npm package with its own
 * tsconfig -- so the ids and subject labels are duplicated on purpose. The
 * design doc (section 4) is the single source of truth for both copies.
 */
const CATEGORY_SUBJECTS: Record<string, string> = {
  "broken": "Bug report",
  "feature": "Feature request",
  "smart-detection": "Smart detection limit increase",
  "account": "Account or group",
  "other": "General enquiry",
};

/**
 * Context the app attaches automatically so the sender does not have to
 * describe their setup.
 */
interface ContactContext {
  groupId?: string | null;
  campaignId?: string | null;
  route?: string | null;
  appVersion?: string | null;
}

/**
 * Interface for contact form submission data
 */
interface ContactFormData {
  name: string;
  email: string;
  /** The selected category id. Optional: an older client may not send one. */
  category?: string;
  /**
   * Free-text subject. Kept for compatibility with older clients, and still
   * sent by the current one as a fallback for older deployments of this
   * function. `category` wins when both are present.
   */
  subject?: string;
  message: string;
  /** The optional second field, currently only for smart-detection */
  reason?: string;
  context?: ContactContext;
}
```

- [ ] **Step 2: Add the reference generator and the subject composer**

Add these next to `sanitizeText`, above `sendContactEmail`:

```ts
/**
 * Generate a short reference for one submission.
 *
 * Nothing is persisted: the reference exists so that a human can find the
 * thread again in an inbox, and so a follow-up message can point at the
 * first one. Four digits is enough for that and is short enough to quote.
 *
 * @returns A reference of the form CC-4192
 */
const generateReference = (): string => {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `CC-${digits}`;
};

/**
 * Work out what to call this submission in the email subject.
 *
 * Prefers the typed category, falls back to a free-text subject from an
 * older client, and finally to a generic label. The frontend deploys
 * separately from this function, so neither half may assume the other has
 * been updated.
 *
 * @param category - The category id, if the client sent one
 * @param subject - The free-text subject, if the client sent one
 * @returns A human-readable label for the subject line
 */
const composeSubjectLabel = (
  category: string | undefined,
  subject: string
): string => {
  if (category && CATEGORY_SUBJECTS[category]) {
    return CATEGORY_SUBJECTS[category];
  }
  if (subject) {
    return subject;
  }
  return "General enquiry";
};

/**
 * Render the automatically attached context as plain-text lines.
 *
 * @param context - The context the client attached, if any
 * @returns Zero or more `Label: value` lines
 */
const formatContextLines = (context: ContactContext | undefined): string[] => {
  if (!context) {
    return [];
  }
  const lines: string[] = [];
  if (context.groupId) lines.push(`Group: ${context.groupId}`);
  if (context.campaignId) lines.push(`Campaign: ${context.campaignId}`);
  if (context.route) lines.push(`Came from: ${context.route}`);
  if (context.appVersion) lines.push(`App version: ${context.appVersion}`);
  return lines;
};
```

- [ ] **Step 3: Use them in the handler**

Inside `sendContactEmail`, replace the destructure and the `emailSubject` block.

Destructure (was `const {name, email, subject, message} = request.data;`):

```ts
      const {name, email, category, subject, message, reason, context} =
        request.data;
```

Sanitisation — add after the existing `sanitizedMessage` line:

```ts
      const sanitizedReason = reason ? sanitizeText(reason) : "";
```

Subject composition — replace the whole `const emailSubject = ...` statement:

```ts
      // Compose the subject from the typed category, so that the sender no
      // longer has to write one and so every email of a kind reads alike.
      const reference = generateReference();
      const subjectLabel = composeSubjectLabel(category, sanitizedSubject);
      const emailSubject =
        `[${reference}] D&D Campaign Companion: ${subjectLabel}`;
      const contextLines = formatContextLines(context);
```

- [ ] **Step 4: Put the new fields in the email body**

Replace the `text` property of `mailOptions` with:

```ts
        text: `
Contact Form Submission

Reference: ${reference}
Category: ${subjectLabel}
Name: ${sanitizedName}
Email: ${sanitizedEmail}

Message:
${sanitizedMessage}
${sanitizedReason ? `\nWhy they need more:\n${sanitizedReason}\n` : ""}
${contextLines.length ? `\nAttached context:\n${contextLines.join("\n")}\n` : ""}
---
Sent via D&D Campaign Companion Contact Form
User ID: ${userId}
Timestamp: ${new Date().toISOString()}
        `,
```

Replace the two `${sanitizedSubject ? ...}` fragments in the `html` property with a category line, and add the reason and context blocks. The `html` `<div style="background: #f8f9fa; ...">` block becomes:

```ts
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Reference:</strong> ${reference}</p>
    <p><strong>Category:</strong> ${subjectLabel}</p>
    <p><strong>From:</strong> ${sanitizedName}</p>
    <p><strong>Email:</strong> <a href="mailto:${sanitizedEmail}">${sanitizedEmail}</a></p>
  </div>
```

and immediately after the existing message `<div>`, add:

```ts
  ${sanitizedReason ? `
  <div style="margin: 20px 0;">
    <h3 style="color: #333;">Why they need more:</h3>
    <div style="background: white; padding: 15px; border-left: 4px solid #4f46e5; margin: 10px 0;">
      ${sanitizedReason.replace(/\n/g, "<br>")}
    </div>
  </div>` : ""}
  ${contextLines.length ? `
  <div style="margin: 20px 0;">
    <h3 style="color: #333;">Attached context:</h3>
    <p style="color: #6b7280; font-size: 13px;">${contextLines.join("<br>")}</p>
  </div>` : ""}
```

- [ ] **Step 5: Return the reference**

Replace the success return:

```ts
      // Return success response
      return {
        success: true,
        message: "Email sent successfully! We'll get back to you soon.",
        reference,
      };
```

Also update the log line so the reference is greppable in Cloud Logging:

```ts
      console.log(
        `Contact form email sent (${reference}) from ${sanitizedEmail} (${userId})`
      );
```

- [ ] **Step 6: Typecheck the functions package**

```
cd firebase/functions && npx tsc --noEmit
```

Expected: no output. (Return to the repo root afterwards.)

- [ ] **Step 7: Lint the functions package**

```
cd firebase/functions && npm run lint
```

Expected: clean, or the same warnings the file had before your change — never new errors. If `npm run lint` does not exist in that package, skip this step.

- [ ] **Step 8: Commit**

```bash
git add firebase/functions/src/contact.ts
git commit -m "feat(contact): compose the subject server-side and return a reference"
```

---

## Task 4: The category chips

**Files:**
- Create: `src/shared/components/contact/CategoryChips.tsx`
- Test: `src/shared/components/contact/__tests__/CategoryChips.test.tsx`

**Interfaces:**
- Consumes: `CONTACT_CATEGORIES`, `ContactCategoryId` from `../contact-categories` (Task 1).
- Produces:
  ```ts
  interface CategoryChipsProps {
    value: ContactCategoryId | null;
    onChange: (id: ContactCategoryId) => void;
    disabled?: boolean;
  }
  ```
  Default export `CategoryChips`.

This is presentational: it calls no context hooks and holds no state.

- [ ] **Step 1: Write the failing test**

Create `src/shared/components/contact/__tests__/CategoryChips.test.tsx`:

```tsx
// src/shared/components/contact/__tests__/CategoryChips.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoryChips from "../CategoryChips";

describe("CategoryChips", () => {
  it("renders one chip per category", () => {
    render(<CategoryChips value={null} onChange={jest.fn()} />);

    expect(screen.getByRole("radio", { name: "Something is broken" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Feature idea" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "More smart detection" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Account or group" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Something else" })).toBeInTheDocument();
  });

  it("labels the group so a screen reader hears the question", () => {
    render(<CategoryChips value={null} onChange={jest.fn()} />);

    expect(
      screen.getByRole("radiogroup", { name: "What's this about?" })
    ).toBeInTheDocument();
  });

  it("marks only the selected chip as checked", () => {
    render(<CategoryChips value="feature" onChange={jest.fn()} />);

    expect(screen.getByRole("radio", { name: "Feature idea" })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Something is broken" })
    ).not.toBeChecked();
  });

  it("checks nothing when no category is selected", () => {
    render(<CategoryChips value={null} onChange={jest.fn()} />);

    screen.getAllByRole("radio").forEach((chip) => {
      expect(chip).not.toBeChecked();
    });
  });

  it("reports the id of a clicked chip", async () => {
    const onChange = jest.fn();
    render(<CategoryChips value={null} onChange={onChange} />);

    await userEvent.click(screen.getByRole("radio", { name: "More smart detection" }));

    expect(onChange).toHaveBeenCalledWith("smart-detection");
  });

  it("does not report clicks while disabled", async () => {
    const onChange = jest.fn();
    render(<CategoryChips value={null} onChange={onChange} disabled />);

    await userEvent.click(screen.getByRole("radio", { name: "Feature idea" }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps only the selected chip in the tab order", () => {
    render(<CategoryChips value="account" onChange={jest.fn()} />);

    expect(screen.getByRole("radio", { name: "Account or group" })).toHaveAttribute(
      "tabindex",
      "0"
    );
    expect(screen.getByRole("radio", { name: "Feature idea" })).toHaveAttribute(
      "tabindex",
      "-1"
    );
  });

  it("puts the first chip in the tab order when nothing is selected", () => {
    render(<CategoryChips value={null} onChange={jest.fn()} />);

    expect(
      screen.getByRole("radio", { name: "Something is broken" })
    ).toHaveAttribute("tabindex", "0");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="CategoryChips"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/shared/components/contact/CategoryChips.tsx`:

```tsx
// src/shared/components/contact/CategoryChips.tsx
import React from "react";
import { clsx } from "clsx";
import { CONTACT_CATEGORIES, ContactCategoryId } from "./contact-categories";

/**
 * Props for the CategoryChips component
 */
interface CategoryChipsProps {
  /** The currently selected category, or null if none is chosen yet */
  value: ContactCategoryId | null;
  /** Called with the id of a newly selected category */
  onChange: (id: ContactCategoryId) => void;
  /** Disables selection, e.g. while a submission is in flight */
  disabled?: boolean;
}

/**
 * The single-select pill row that replaces the free-text subject field.
 *
 * Built as a real radiogroup rather than a row of toggle buttons: only the
 * selected chip sits in the tab order, so a keyboard user tabs into the group
 * once instead of through five controls, which is what a radio group is for.
 */
const CategoryChips: React.FC<CategoryChipsProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div
      role="radiogroup"
      aria-label="What's this about?"
      className="flex flex-wrap gap-2"
    >
      {CONTACT_CATEGORIES.map((category, index) => {
        const isSelected = value === category.id;
        // With nothing selected, the first chip is the group's tab stop.
        const isTabStop = isSelected || (value === null && index === 0);

        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isTabStop ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(category.id)}
            className={clsx(
              "button rounded-full px-4 py-2 text-sm border",
              isSelected
                ? "button-primary"
                : "card card-border typography"
            )}
          >
            {category.chipLabel}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryChips;
```

- [ ] **Step 4: Run the test to verify it passes**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="CategoryChips"
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/contact/CategoryChips.tsx src/shared/components/contact/__tests__/CategoryChips.test.tsx
git commit -m "feat(contact): replace the subject field with category chips"
```

---

## Task 5: The sender identity row

**Files:**
- Create: `src/shared/components/contact/SenderIdentity.tsx`
- Test: `src/shared/components/contact/__tests__/SenderIdentity.test.tsx`

**Interfaces:**
- Consumes: `core/components/Input`, `core/components/Typography`.
- Produces:
  ```ts
  interface SenderIdentityProps {
    signedInName: string | null;
    signedInEmail: string | null;
    showInputs: boolean;
    name: string;
    email: string;
    onNameChange: (value: string) => void;
    onEmailChange: (value: string) => void;
    onUseDifferentEmail: () => void;
    disabled?: boolean;
  }
  ```
  Default export `SenderIdentity`.

Presentational — the parent decides `showInputs` (`!user || userChoseDifferentEmail`) and supplies the signed-in values. `Input`'s API: `label`, `value`, `onChange`, `type`, `required`, `disabled`, `placeholder`, `isTextArea`, `rows`, `error`, `helperText`.

- [ ] **Step 1: Write the failing test**

Create `src/shared/components/contact/__tests__/SenderIdentity.test.tsx`:

```tsx
// src/shared/components/contact/__tests__/SenderIdentity.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SenderIdentity from "../SenderIdentity";

const baseProps = {
  signedInName: "DungeonMaster",
  signedInEmail: "dm@example.com",
  showInputs: false,
  name: "",
  email: "",
  onNameChange: jest.fn(),
  onEmailChange: jest.fn(),
  onUseDifferentEmail: jest.fn(),
};

describe("SenderIdentity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signed in", () => {
    it("says who the message is being sent as", () => {
      render(<SenderIdentity {...baseProps} />);

      expect(
        screen.getByText("Sending as DungeonMaster · dm@example.com")
      ).toBeInTheDocument();
    });

    it("says what context is attached automatically", () => {
      render(<SenderIdentity {...baseProps} />);

      expect(
        screen.getByText(
          "We'll attach your group, campaign and app version so you don't have to describe them."
        )
      ).toBeInTheDocument();
    });

    it("does not ask for a name or an email", () => {
      render(<SenderIdentity {...baseProps} />);

      expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    });

    it("offers a way to use a different email", async () => {
      render(<SenderIdentity {...baseProps} />);

      await userEvent.click(
        screen.getByRole("button", { name: "Use a different email" })
      );

      expect(baseProps.onUseDifferentEmail).toHaveBeenCalledTimes(1);
    });

    it("shows the initial of the signed-in name as an avatar", () => {
      render(<SenderIdentity {...baseProps} />);

      expect(screen.getByTestId("sender-avatar")).toHaveTextContent("D");
    });
  });

  describe("showing the inputs", () => {
    it("asks for a name and an email", () => {
      render(<SenderIdentity {...baseProps} showInputs />);

      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    it("no longer offers the different-email action", () => {
      render(<SenderIdentity {...baseProps} showInputs />);

      expect(
        screen.queryByRole("button", { name: "Use a different email" })
      ).not.toBeInTheDocument();
    });

    it("reports what is typed into the name field", async () => {
      render(<SenderIdentity {...baseProps} showInputs />);

      await userEvent.type(screen.getByLabelText("Name"), "A");

      expect(baseProps.onNameChange).toHaveBeenCalledWith("A");
    });

    it("reports what is typed into the email field", async () => {
      render(<SenderIdentity {...baseProps} showInputs />);

      await userEvent.type(screen.getByLabelText("Email"), "a");

      expect(baseProps.onEmailChange).toHaveBeenCalledWith("a");
    });
  });

  describe("signed out", () => {
    it("shows the inputs and no identity row", () => {
      render(
        <SenderIdentity
          {...baseProps}
          signedInName={null}
          signedInEmail={null}
          showInputs
        />
      );

      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.queryByText(/Sending as/)).not.toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="SenderIdentity"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/shared/components/contact/SenderIdentity.tsx`:

```tsx
// src/shared/components/contact/SenderIdentity.tsx
import React from "react";
import Typography from "core/components/Typography";
import Input from "core/components/Input";

/**
 * Props for the SenderIdentity component
 */
interface SenderIdentityProps {
  /** The signed-in user's group username, or null when signed out */
  signedInName: string | null;
  /** The signed-in user's email, or null when signed out */
  signedInEmail: string | null;
  /** Whether to ask for a name and email instead of showing the identity row */
  showInputs: boolean;
  /** Current value of the name input */
  name: string;
  /** Current value of the email input */
  email: string;
  /** Called with the new name */
  onNameChange: (value: string) => void;
  /** Called with the new email */
  onEmailChange: (value: string) => void;
  /** Called when the sender wants to type a different address */
  onUseDifferentEmail: () => void;
  /** Disables the inputs, e.g. while a submission is in flight */
  disabled?: boolean;
}

/**
 * Who the message is coming from.
 *
 * A signed-in sender should not retype a name and an email the app already
 * holds, so by default this states them and says what else is attached. The
 * plain inputs are still one click away, and are all a signed-out sender
 * sees.
 */
const SenderIdentity: React.FC<SenderIdentityProps> = ({
  signedInName,
  signedInEmail,
  showInputs,
  name,
  email,
  onNameChange,
  onEmailChange,
  onUseDifferentEmail,
  disabled = false,
}) => {
  if (showInputs) {
    return (
      <div className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
          disabled={disabled}
          placeholder="Your name"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          disabled={disabled}
          placeholder="your.email@example.com"
        />
      </div>
    );
  }

  return (
    <div className="card card-border rounded-lg p-4 flex items-start gap-3">
      <div
        data-testid="sender-avatar"
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-secondary typography"
      >
        {(signedInName || "?").charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <Typography variant="body">
          {`Sending as ${signedInName} · ${signedInEmail}`}
        </Typography>
        <Typography variant="body-sm" color="secondary">
          We'll attach your group, campaign and app version so you don't have to describe them.
        </Typography>
      </div>

      <button
        type="button"
        onClick={onUseDifferentEmail}
        disabled={disabled}
        className="button button-link shrink-0 text-sm"
      >
        Use a different email
      </button>
    </div>
  );
};

export default SenderIdentity;
```

- [ ] **Step 4: Run the test to verify it passes**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="SenderIdentity"
```

Expected: PASS, 10 tests. If `getByLabelText("Name")` fails, check how `core/components/Input` associates its label with its control and adjust the query — do **not** change the component to satisfy the test without understanding why.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/contact/SenderIdentity.tsx src/shared/components/contact/__tests__/SenderIdentity.test.tsx
git commit -m "feat(contact): stop signed-in users retyping their own name and email"
```

---

## Task 6: The success card

**Files:**
- Create: `src/shared/components/contact/ContactSuccess.tsx`
- Test: `src/shared/components/contact/__tests__/ContactSuccess.test.tsx`

**Interfaces:**
- Consumes: `core/components/Typography`, `core/components/Button`, `lucide-react`'s `Check`.
- Produces:
  ```ts
  interface ContactSuccessProps {
    reference: string | null;
    campaignName: string | null;
    onBackToCampaign: () => void;
    onWriteAnother: () => void;
  }
  ```
  Default export `ContactSuccess`.

`reference` is nullable on purpose: an older deployment of the cloud function does not return one, and the card must not render `CC-undefined`.

- [ ] **Step 1: Write the failing test**

Create `src/shared/components/contact/__tests__/ContactSuccess.test.tsx`:

```tsx
// src/shared/components/contact/__tests__/ContactSuccess.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactSuccess from "../ContactSuccess";

const baseProps = {
  reference: "CC-4192",
  campaignName: "Phandelver",
  onBackToCampaign: jest.fn(),
  onWriteAnother: jest.fn(),
};

describe("ContactSuccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the reference in the heading", () => {
    render(<ContactSuccess {...baseProps} />);

    expect(screen.getByText("Sent — reference CC-4192")).toBeInTheDocument();
  });

  it("explains what the reference is for and that the message stays put", () => {
    render(<ContactSuccess {...baseProps} />);

    expect(
      screen.getByText(
        "Quote that reference if you write again about the same thing. Your message stays on this page until you leave, so you can copy it if you want it."
      )
    ).toBeInTheDocument();
  });

  it("falls back to a plain heading when the function returned no reference", () => {
    render(<ContactSuccess {...baseProps} reference={null} />);

    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.queryByText(/CC-/)).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });

  it("does not promise a reference that is not there", () => {
    render(<ContactSuccess {...baseProps} reference={null} />);

    expect(screen.queryByText(/Quote that reference/)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Your message stays on this page until you leave, so you can copy it if you want it."
      )
    ).toBeInTheDocument();
  });

  it("names the campaign in the primary action", () => {
    render(<ContactSuccess {...baseProps} />);

    expect(
      screen.getByRole("button", { name: "Back to Phandelver" })
    ).toBeInTheDocument();
  });

  it("falls back to a generic label when there is no active campaign", () => {
    render(<ContactSuccess {...baseProps} campaignName={null} />);

    expect(
      screen.getByRole("button", { name: "Back to the campaign" })
    ).toBeInTheDocument();
  });

  it("reports the primary action", async () => {
    render(<ContactSuccess {...baseProps} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Back to Phandelver" })
    );

    expect(baseProps.onBackToCampaign).toHaveBeenCalledTimes(1);
  });

  it("reports the write-another action", async () => {
    render(<ContactSuccess {...baseProps} />);

    await userEvent.click(screen.getByRole("button", { name: "Write another" }));

    expect(baseProps.onWriteAnother).toHaveBeenCalledTimes(1);
  });

  it("announces itself to assistive technology", () => {
    render(<ContactSuccess {...baseProps} />);

    expect(screen.getByRole("status")).toHaveTextContent("Sent — reference CC-4192");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="ContactSuccess"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/shared/components/contact/ContactSuccess.tsx`:

```tsx
// src/shared/components/contact/ContactSuccess.tsx
import React from "react";
import Typography from "core/components/Typography";
import Button from "core/components/Button";
import { Check } from "lucide-react";

/**
 * Props for the ContactSuccess component
 */
interface ContactSuccessProps {
  /**
   * The reference returned by the cloud function, or null when it returned
   * none. An older deployment of the function does not send one, and the
   * card must never render "CC-undefined".
   */
  reference: string | null;
  /** The active campaign's name, or null when there is none */
  campaignName: string | null;
  /** Called when the sender wants to leave for the campaign */
  onBackToCampaign: () => void;
  /** Called when the sender wants to write a second message */
  onWriteAnother: () => void;
}

/**
 * Confirmation that a message was sent.
 *
 * Deliberately a card rendered above the form rather than a page that
 * replaces it: the sender can still read and copy what they wrote, which is
 * the only copy of it they have.
 */
const ContactSuccess: React.FC<ContactSuccessProps> = ({
  reference,
  campaignName,
  onBackToCampaign,
  onWriteAnother,
}) => {
  const heading = reference ? `Sent — reference ${reference}` : "Sent";
  const body = reference
    ? "Quote that reference if you write again about the same thing. Your message stays on this page until you leave, so you can copy it if you want it."
    : "Your message stays on this page until you leave, so you can copy it if you want it.";

  return (
    <div
      role="status"
      className="card card-border rounded-lg p-5 flex items-start gap-4"
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 success-icon-bg">
        <Check size={18} className="success-icon" />
      </div>

      <div className="flex-1 min-w-0">
        <Typography variant="h4" className="mb-1">
          {heading}
        </Typography>
        <Typography variant="body-sm" color="secondary">
          {body}
        </Typography>
      </div>

      <div className="flex flex-col gap-2 shrink-0">
        <Button variant="primary" onClick={onBackToCampaign}>
          {campaignName ? `Back to ${campaignName}` : "Back to the campaign"}
        </Button>
        <Button variant="outline" onClick={onWriteAnother}>
          Write another
        </Button>
      </div>
    </div>
  );
};

export default ContactSuccess;
```

- [ ] **Step 4: Run the test to verify it passes**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="ContactSuccess"
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/shared/components/contact/ContactSuccess.tsx src/shared/components/contact/__tests__/ContactSuccess.test.tsx
git commit -m "feat(contact): confirm a sent message without discarding it"
```

---

## Task 7: Rewrite ContactForm

**Files:**
- Rewrite: `src/shared/components/ContactForm.tsx`
- Rewrite: `src/shared/components/__tests__/ContactForm.test.tsx`

**Interfaces:**
- Consumes:
  - `getContactCategory`, `categoryFromLegacySubject`, `ContactCategoryId` from `./contact/contact-categories`
  - `useFunctionsReady` from `./contact/useFunctionsReady`
  - `CategoryChips`, `SenderIdentity`, `ContactSuccess` from `./contact/…` — prop shapes exactly as in Tasks 4–6
  - `APP_VERSION` from `core/constants/app`
  - `useAuth`, `useGroups`, `useCampaigns` from `features/user-management` (**the barrel**)
  - `useNavigation` from `shared/hooks/useNavigation` — provides `navigateToPage(path: string)`
- Produces: default export `ContactForm` at its unchanged import path (`shared/components/ContactForm`).

**The props change, and that is safe.** `ContactFormProps` goes from `{ initialData?: Partial<ContactFormData> }` to `{ initialMessage?: string }`. `ContactPage.tsx:21` is the only consumer in the codebase and passes no props at all (verified by grep), so nothing breaks. The old shape existed to seed a name/email/subject that the form now either knows already or has replaced with a category.

Relevant hook surfaces, verified in the codebase:
- `useAuth()` → `{ user: User | null }`, where `user.email` is `string | null`
- `useGroups()` → `{ activeGroupId: string | null, activeGroupUserProfile: { username?: string } | null }`
- `useCampaigns()` → `{ activeCampaignId: string | null, activeCampaign: { name: string } | null }`

- [ ] **Step 1: Write the failing test**

Replace `src/shared/components/__tests__/ContactForm.test.tsx` entirely:

```tsx
// src/shared/components/__tests__/ContactForm.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "../ContactForm";

const mockSendContactEmail = jest.fn();
const mockRegistryHas = jest.fn();
const mockRegistryGet = jest.fn();
const mockNavigateToPage = jest.fn();

let mockUser: { email: string | null } | null = null;
let mockGroups = {
  activeGroupId: "group-1" as string | null,
  activeGroupUserProfile: { username: "DungeonMaster" } as { username?: string } | null,
};
let mockCampaigns = {
  activeCampaignId: "campaign-1" as string | null,
  activeCampaign: { name: "Phandelver" } as { name: string } | null,
};
let mockSearch = "";

jest.mock("core/services/firebase/core/ServiceRegistry", () => ({
  __esModule: true,
  default: { getInstance: jest.fn(() => ({ has: mockRegistryHas, get: mockRegistryGet })) },
}));

jest.mock("firebase/functions", () => ({
  httpsCallable: jest.fn(() => mockSendContactEmail),
}));

jest.mock("react-router-dom", () => ({
  useLocation: () => ({ search: mockSearch, pathname: "/contact" }),
}));

jest.mock("shared/hooks/useNavigation", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

jest.mock("features/user-management", () => ({
  useAuth: () => ({ user: mockUser }),
  useGroups: () => mockGroups,
  useCampaigns: () => mockCampaigns,
}));

const VALID_MESSAGE = "The delete button removed my note without asking first.";

/** Fill the form to the point where it can legitimately be submitted. */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: "Something is broken" }));
  await user.type(screen.getByLabelText("What happened?"), VALID_MESSAGE);
}

describe("ContactForm", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup();
    mockRegistryHas.mockReturnValue(true);
    mockRegistryGet.mockReturnValue({});
    mockSendContactEmail.mockResolvedValue({
      data: { success: true, message: "Sent", reference: "CC-4192" },
    });
    mockUser = { email: "dm@example.com" };
    mockGroups = {
      activeGroupId: "group-1",
      activeGroupUserProfile: { username: "DungeonMaster" },
    };
    mockCampaigns = {
      activeCampaignId: "campaign-1",
      activeCampaign: { name: "Phandelver" },
    };
    mockSearch = "";
  });

  // -------------------------------------------------------------------------
  // Structure
  // -------------------------------------------------------------------------
  describe("structure", () => {
    it("asks what the message is about before asking what happened", () => {
      render(<ContactForm />);

      expect(
        screen.getByRole("radiogroup", { name: "What's this about?" })
      ).toBeInTheDocument();
      expect(screen.getByLabelText("What happened?")).toBeInTheDocument();
    });

    it("no longer offers a free-text subject field", () => {
      render(<ContactForm />);

      expect(screen.queryByLabelText(/^Subject/i)).not.toBeInTheDocument();
    });

    it("says a copy goes to the sender", () => {
      render(<ContactForm />);

      expect(
        screen.getByText("A copy goes to your email address.")
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // The character counter and the ten-character minimum
  // -------------------------------------------------------------------------
  describe("the character counter", () => {
    it("starts at zero", () => {
      render(<ContactForm />);

      expect(screen.getByText("0 characters")).toBeInTheDocument();
    });

    it("counts what has been typed", async () => {
      render(<ContactForm />);

      await user.type(screen.getByLabelText("What happened?"), "abcde");

      expect(screen.getByText("5 characters")).toBeInTheDocument();
    });

    it("does not complain about length on the first keystroke", async () => {
      render(<ContactForm />);

      await user.type(screen.getByLabelText("What happened?"), "abc");

      expect(screen.queryByText(/at least 10 characters/i)).not.toBeInTheDocument();
    });

    it("complains on blur once there is something to complain about", async () => {
      render(<ContactForm />);

      await user.type(screen.getByLabelText("What happened?"), "abc");
      await user.tab();

      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });

    it("does not complain on blur when the field is still empty", async () => {
      render(<ContactForm />);

      await user.click(screen.getByLabelText("What happened?"));
      await user.tab();

      expect(screen.queryByText(/at least 10 characters/i)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Category-driven guidance
  // -------------------------------------------------------------------------
  describe("guidance", () => {
    it("shows nothing before a category is picked", () => {
      render(<ContactForm />);

      expect(screen.queryByTestId("category-guidance")).not.toBeInTheDocument();
    });

    it("tells a bug reporter the three things that help most", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "Something is broken" }));

      expect(screen.getByTestId("category-guidance")).toHaveTextContent(
        "For a bug, three things help most: what you clicked, what happened, and what you expected instead."
      );
    });

    it("changes when the category changes", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "Something is broken" }));
      await user.click(screen.getByRole("radio", { name: "Feature idea" }));

      expect(screen.getByTestId("category-guidance")).toHaveTextContent(
        /what you're trying to do matters more/
      );
    });

    it("shows none for a category that has none", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "Account or group" }));

      expect(screen.queryByTestId("category-guidance")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // The smart-detection second field
  // -------------------------------------------------------------------------
  describe("the smart-detection second field", () => {
    it("appears only for that category", async () => {
      render(<ContactForm />);

      expect(screen.queryByLabelText("Why do you need more?")).not.toBeInTheDocument();

      await user.click(screen.getByRole("radio", { name: "More smart detection" }));

      expect(screen.getByLabelText("Why do you need more?")).toBeInTheDocument();
    });

    it("does not prefill a message full of asterisks", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "More smart detection" }));

      expect(screen.getByLabelText("What happened?")).toHaveValue("");
    });

    it("is optional -- the form submits without it", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "More smart detection" }));
      await user.type(screen.getByLabelText("What happened?"), VALID_MESSAGE);
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
    });
  });

  // -------------------------------------------------------------------------
  // Legacy deep links
  // -------------------------------------------------------------------------
  describe("legacy deep links", () => {
    it("selects the smart-detection category from the old subject parameter", () => {
      mockSearch = "?subject=Smart%20Detection%20Limit%20Increase%20Request";

      render(<ContactForm />);

      expect(
        screen.getByRole("radio", { name: "More smart detection" })
      ).toBeChecked();
    });

    it("selects nothing for a subject that maps to no category", () => {
      mockSearch = "?subject=Something%20unrelated";

      render(<ContactForm />);

      screen.getAllByRole("radio").forEach((chip) => {
        expect(chip).not.toBeChecked();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Identity
  // -------------------------------------------------------------------------
  describe("identity", () => {
    it("does not ask a signed-in user to retype their name and email", () => {
      render(<ContactForm />);

      expect(
        screen.getByText("Sending as DungeonMaster · dm@example.com")
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    });

    it("reveals the inputs on request", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("button", { name: "Use a different email" }));

      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    it("asks a signed-out user for a name and email", () => {
      mockUser = null;

      render(<ContactForm />);

      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.queryByText(/Sending as/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // The payload
  // -------------------------------------------------------------------------
  describe("the payload", () => {
    it("sends the category as its own field", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0]).toMatchObject({
        category: "broken",
        message: VALID_MESSAGE,
      });
    });

    it("still sends a subject, so an older deployed function keeps working", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0].subject).toBe("Bug report");
    });

    it("attaches the group, campaign and app version automatically", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0].context).toMatchObject({
        groupId: "group-1",
        campaignId: "campaign-1",
      });
      expect(
        mockSendContactEmail.mock.calls[0][0].context.appVersion
      ).toEqual(expect.any(String));
    });

    it("attaches the originating route from the from parameter", async () => {
      mockSearch = "?from=%2Fnotes%2Fabc";

      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0].context.route).toBe("/notes/abc");
    });

    it("sends a null route rather than the useless /contact", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0].context.route).toBeNull();
    });

    it("sends the signed-in identity", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0]).toMatchObject({
        name: "DungeonMaster",
        email: "dm@example.com",
      });
    });

    it("sends the reason when the smart-detection field is filled", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "More smart detection" }));
      await user.type(screen.getByLabelText("What happened?"), VALID_MESSAGE);
      await user.type(screen.getByLabelText("Why do you need more?"), "Big campaign");
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0].reason).toBe("Big campaign");
    });
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  describe("validation", () => {
    it("refuses to send without a category", async () => {
      render(<ContactForm />);

      await user.type(screen.getByLabelText("What happened?"), VALID_MESSAGE);
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      expect(mockSendContactEmail).not.toHaveBeenCalled();
      expect(screen.getByText(/pick a category/i)).toBeInTheDocument();
    });

    it("refuses to send a message shorter than ten characters", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "Something is broken" }));
      await user.type(screen.getByLabelText("What happened?"), "short");
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      expect(mockSendContactEmail).not.toHaveBeenCalled();
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });

    it("rejects a malformed email from a signed-out sender", async () => {
      mockUser = null;

      render(<ContactForm />);
      await user.click(screen.getByRole("radio", { name: "Something is broken" }));
      await user.type(screen.getByLabelText("Name"), "Rowan");
      await user.type(screen.getByLabelText("Email"), "not-an-email");
      await user.type(screen.getByLabelText("What happened?"), VALID_MESSAGE);
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      expect(mockSendContactEmail).not.toHaveBeenCalled();
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Success
  // -------------------------------------------------------------------------
  describe("success", () => {
    it("shows the reference the function returned", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      expect(
        await screen.findByText("Sent — reference CC-4192")
      ).toBeInTheDocument();
    });

    it("keeps the message on the page", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await screen.findByText("Sent — reference CC-4192");
      expect(screen.getByLabelText("What happened?")).toHaveValue(VALID_MESSAGE);
    });

    it("survives a function that returns no reference", async () => {
      mockSendContactEmail.mockResolvedValue({
        data: { success: true, message: "Sent" },
      });

      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      expect(await screen.findByText("Sent")).toBeInTheDocument();
      expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
    });

    it("clears the message but keeps the category on Write another", async () => {
      render(<ContactForm />);
      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: /Send message/ }));
      await screen.findByText("Sent — reference CC-4192");

      await user.click(screen.getByRole("button", { name: "Write another" }));

      expect(screen.getByLabelText("What happened?")).toHaveValue("");
      expect(
        screen.getByRole("radio", { name: "Something is broken" })
      ).toBeChecked();
      expect(screen.queryByText(/Sent —/)).not.toBeInTheDocument();
    });

    it("navigates away on Back to the campaign", async () => {
      render(<ContactForm />);
      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: /Send message/ }));
      await screen.findByText("Sent — reference CC-4192");

      await user.click(screen.getByRole("button", { name: "Back to Phandelver" }));

      expect(mockNavigateToPage).toHaveBeenCalledWith("/");
    });
  });

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------
  describe("initialisation", () => {
    it("keeps the submit button enabled and correctly labelled from the start", () => {
      mockRegistryHas.mockReturnValue(false);

      render(<ContactForm />);

      const button = screen.getByRole("button", { name: /Send message/ });
      expect(button).toBeEnabled();
      expect(button).not.toHaveTextContent(/Initializing/);
    });
  });

  // -------------------------------------------------------------------------
  // Errors
  // -------------------------------------------------------------------------
  describe("errors", () => {
    it("reports a rate limit in words the sender can act on", async () => {
      mockSendContactEmail.mockRejectedValue({
        code: "functions/resource-exhausted",
      });

      render(<ContactForm />);
      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      expect(
        await screen.findByText(/Too many requests/i)
      ).toBeInTheDocument();
    });

    it("does not claim success when the function reports failure", async () => {
      mockSendContactEmail.mockResolvedValue({
        data: { success: false, message: "Nope" },
      });

      render(<ContactForm />);
      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() =>
        expect(screen.queryByText(/^Sent/)).not.toBeInTheDocument()
      );
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="ContactForm"
```

Expected: FAIL — the old component has no `radiogroup`, no `What happened?` label, and no `SenderIdentity`.

- [ ] **Step 3: Rewrite the component**

Replace `src/shared/components/ContactForm.tsx` entirely:

```tsx
// src/shared/components/ContactForm.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { httpsCallable, Functions } from "firebase/functions";
import ServiceRegistry from "core/services/firebase/core/ServiceRegistry";
import Typography from "core/components/Typography";
import Input from "core/components/Input";
import Button from "core/components/Button";
import { APP_VERSION } from "core/constants/app";
import { useAuth, useGroups, useCampaigns } from "features/user-management";
import { useNavigation } from "shared/hooks/useNavigation";
import { Send, AlertCircle, Info } from "lucide-react";
import CategoryChips from "./contact/CategoryChips";
import SenderIdentity from "./contact/SenderIdentity";
import ContactSuccess from "./contact/ContactSuccess";
import {
  ContactCategoryId,
  getContactCategory,
  categoryFromLegacySubject,
} from "./contact/contact-categories";
import { useFunctionsReady } from "./contact/useFunctionsReady";

/** The shortest message we will accept */
const MIN_MESSAGE_LENGTH = 10;

/**
 * Props for the ContactForm component
 */
interface ContactFormProps {
  /** Optional initial message text */
  initialMessage?: string;
}

/**
 * The contact form.
 *
 * Owns validation, payload assembly and submit; every piece of the UI it
 * renders is a presentational component in `./contact/`. The category is a
 * real field rather than a subject string the app deep-links a magic value
 * into, and the email subject is composed server-side from it.
 */
const ContactForm: React.FC<ContactFormProps> = ({ initialMessage = "" }) => {
  const location = useLocation();
  const { navigateToPage } = useNavigation();
  const { user } = useAuth();
  const { activeGroupId, activeGroupUserProfile } = useGroups();
  const { activeCampaignId, activeCampaign } = useCampaigns();
  const { failed: initFailed } = useFunctionsReady();

  const [category, setCategory] = useState<ContactCategoryId | null>(null);
  const [message, setMessage] = useState(initialMessage);
  const [reason, setReason] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [useDifferentEmail, setUseDifferentEmail] = useState(false);
  const [messageTouched, setMessageTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [legacySubject, setLegacySubject] = useState<string | null>(null);

  const signedInName = activeGroupUserProfile?.username ?? null;
  const signedInEmail = user?.email ?? null;
  const showIdentityInputs = !user || useDifferentEmail;

  const selectedCategory = category ? getContactCategory(category) : null;

  /**
   * The route the sender came from.
   *
   * `location.pathname` is always "/contact" by the time this renders, which
   * tells a bug report nothing. Entry points pass the originating path as
   * `?from=`; when that is absent the route is genuinely unknown and we send
   * null rather than something misleading.
   */
  const originatingRoute = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("from");
  }, [location.search]);

  // Select the category a legacy `?subject=` deep link refers to. Links such
  // as `/contact?subject=Smart Detection Limit Increase Request` keep working.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefilledSubject = params.get("subject");
    if (!prefilledSubject) {
      return;
    }

    const mapped = categoryFromLegacySubject(prefilledSubject);
    if (mapped) {
      setCategory(mapped);
    } else {
      // Unrecognised: pass it through as free text rather than mislabelling
      // it as a category it is not.
      setLegacySubject(prefilledSubject);
    }
  }, [location.search]);

  const messageTooShort =
    message.trim().length > 0 && message.trim().length < MIN_MESSAGE_LENGTH;

  /**
   * Validate the form.
   *
   * @returns An error message, or null when the form is ready to send
   */
  const validate = (): string | null => {
    if (!category) {
      return "Please pick a category so we know what we're looking at.";
    }
    if (showIdentityInputs) {
      if (!name.trim()) {
        return "Name is required";
      }
      if (!email.trim()) {
        return "Email is required";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return "Please enter a valid email address";
      }
    }
    if (!message.trim()) {
      return "A message is required";
    }
    if (message.trim().length < MIN_MESSAGE_LENGTH) {
      return `Your message needs at least ${MIN_MESSAGE_LENGTH} characters.`;
    }
    return null;
  };

  /**
   * Send the message via the Firebase callable function.
   *
   * @param e - Form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessageTouched(true);

    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const functions = ServiceRegistry.getInstance().get<Functions>("functions");
      if (!functions) {
        throw new Error("Firebase Functions not available");
      }

      const sendContactEmail = httpsCallable(functions, "sendContactEmail");
      const trimmedReason = reason.trim();

      const result = await sendContactEmail({
        category,
        // Still sent so that an older deployment of the function, which
        // ignores `category`, still produces a meaningful subject line.
        subject: selectedCategory?.subjectLabel ?? legacySubject ?? undefined,
        message: message.trim(),
        reason: trimmedReason || undefined,
        name: showIdentityInputs ? name.trim() : signedInName ?? "",
        email: showIdentityInputs ? email.trim() : signedInEmail ?? "",
        context: {
          groupId: activeGroupId,
          campaignId: activeCampaignId,
          route: originatingRoute,
          appVersion: APP_VERSION,
        },
      });

      const response = result.data as {
        success: boolean;
        message: string;
        reference?: string;
      };

      if (!response?.success) {
        throw new Error(response?.message || "Unexpected response from server");
      }

      // The reference is optional: an older deployment does not return one,
      // and the success card must never render "CC-undefined".
      setReference(response.reference ?? null);
      setShowSuccess(true);
    } catch (error: any) {
      setSubmitError(describeSubmitError(error));
      console.error("Contact form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Clear the message for a second submission, keeping the category.
   *
   * Someone writing again is usually writing about the same area; making
   * them re-pick a chip they just picked is friction with nothing behind it.
   */
  const handleWriteAnother = () => {
    setShowSuccess(false);
    setReference(null);
    setMessage("");
    setReason("");
    setMessageTouched(false);
    setSubmitError(null);
  };

  return (
    <div className="space-y-6">
      {showSuccess && (
        <ContactSuccess
          reference={reference}
          campaignName={activeCampaign?.name ?? null}
          onBackToCampaign={() => navigateToPage("/")}
          onWriteAnother={handleWriteAnother}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Category */}
        <div className="space-y-2">
          <Typography variant="body-sm" className="form-label">
            What's this about?
          </Typography>
          <CategoryChips
            value={category}
            onChange={setCategory}
            disabled={isSubmitting}
          />
        </div>

        {/* Message, with a live counter */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="contact-message" className="form-label text-sm">
              What happened?
            </label>
            <Typography variant="body-sm" color="secondary">
              {`${message.length} characters`}
            </Typography>
          </div>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            onBlur={() => setMessageTouched(true)}
            disabled={isSubmitting}
            rows={6}
            className="input w-full rounded-lg p-3 min-h-[150px] text-[15px] leading-[1.6]"
            placeholder="What you clicked, what happened, and what you expected instead."
          />
          {messageTouched && messageTooShort && (
            <Typography variant="body-sm" color="error">
              {`Your message needs at least ${MIN_MESSAGE_LENGTH} characters.`}
            </Typography>
          )}
        </div>

        {/* Guidance that follows the category, beside the field it governs */}
        {selectedCategory?.guidance && (
          <div
            data-testid="category-guidance"
            className="card card-subtle rounded-lg p-3 flex items-start gap-2"
          >
            <Info className="w-4 h-4 mt-1 shrink-0 primary" />
            <Typography variant="body-sm" color="secondary">
              {selectedCategory.guidance}
            </Typography>
          </div>
        )}

        {/* The optional second field, currently smart-detection only */}
        {selectedCategory?.extraFieldLabel && (
          <Input
            label={selectedCategory.extraFieldLabel}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            placeholder="Roughly how much you scan, and what for."
          />
        )}

        <hr className="card-divider border-t" />

        <SenderIdentity
          signedInName={signedInName}
          signedInEmail={signedInEmail}
          showInputs={showIdentityInputs}
          name={name}
          email={email}
          onNameChange={setName}
          onEmailChange={setEmail}
          onUseDifferentEmail={() => setUseDifferentEmail(true)}
          disabled={isSubmitting}
        />

        {/* The init failure is surfaced, but never disables submit: the
            registry may have recovered, and submit reports its own errors. */}
        {initFailed && (
          <Typography variant="body-sm" color="secondary">
            The contact system was slow to start. Sending should still work — if it doesn't, refresh the page.
          </Typography>
        )}

        {submitError && (
          <div className="flex items-center gap-2 p-3 rounded error-bg">
            <AlertCircle className="w-4 h-4 status-failed" />
            <Typography variant="body-sm" color="error">
              {submitError}
            </Typography>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <Typography variant="body-sm" color="secondary">
            A copy goes to your email address.
          </Typography>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? undefined : <Send className="w-4 h-4" />}
            isLoading={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send message"}
          </Button>
        </div>
      </form>
    </div>
  );
};

/**
 * Turn a Firebase callable error into something the sender can act on.
 *
 * @param error - The thrown error
 * @returns A human-readable message
 */
const describeSubmitError = (error: any): string => {
  switch (error?.code) {
    case "functions/invalid-argument":
      return error.message || "Please check your input and try again.";
    case "functions/resource-exhausted":
      return "Too many requests. Please wait before trying again.";
    case "functions/unauthenticated":
      return "Authentication required. Please refresh the page.";
    case "functions/internal":
      return "Server error. Please try again later.";
    case "functions/unavailable":
      return "Service temporarily unavailable. Please try again later.";
    default:
      return error?.message || "Failed to send message. Please try again.";
  }
};

export default ContactForm;
```

Note the deletions this makes: the canned asterisk-fenced message, the three `includes("Limit Increase")` checks, the `isInitialized` gating of every field, the `Initializing…` button label, the early-return success screen, and `handleSendAnother`'s unreachable non-limit-increase branch.

- [ ] **Step 4: Run the test to verify it passes**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="ContactForm"
```

Expected: PASS. If a query fails because `core/components/Input` renders its label differently than assumed, fix the **query**, not the assertion's intent.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/shared/components/ContactForm.tsx src/shared/components/__tests__/ContactForm.test.tsx
git commit -m "feat(contact): rebuild the form around a real category field"
```

---

## Task 8: The page — one centred column

**Files:**
- Rewrite: `src/pages/ContactPage.tsx`
- Rewrite: `src/pages/__tests__/ContactPage.test.tsx`
- Modify: `src/core/themes/css/components.css`

**Interfaces:**
- Consumes: `ContactForm` from `shared/components/ContactForm`, `useNavigation` from `shared/hooks/useNavigation`, `useCampaigns` from `features/user-management`.
- Produces: default export `ContactPage`.

- [ ] **Step 1: Add the callout class to the theme**

Append to `src/core/themes/css/components.css`:

```css
/* ====== CONTACT CALLOUT ====== */
/*
  An inverted surface: the theme's text colour becomes the ground and the
  ground becomes the text. Reserved for the one statement on a page that must
  not be skimmed past -- on the contact page, the response time, which used to
  sit in a right-hand column styled identically to three blocks of advice.

  Inverting the two tokens the theme already guarantees contrast between means
  it stays legible in light, dark and medieval without a second palette. The
  descendant rule is needed because Typography sets its own colour.
*/
.callout-inverted {
  background-color: var(--text-primary);
  color: var(--bg-primary);
}

.callout-inverted .typography {
  color: var(--bg-primary);
}
```

- [ ] **Step 2: Write the failing test**

Replace `src/pages/__tests__/ContactPage.test.tsx` entirely:

```tsx
// src/pages/__tests__/ContactPage.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactPage from "../ContactPage";

const mockNavigateToPage = jest.fn();
let mockCampaigns = {
  activeCampaign: { name: "Phandelver" } as { name: string } | null,
};

jest.mock("shared/components/ContactForm", () => ({
  __esModule: true,
  default: () => <div data-testid="contact-form" />,
}));

jest.mock("shared/hooks/useNavigation", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

jest.mock("features/user-management", () => ({
  useCampaigns: () => mockCampaigns,
}));

describe("ContactPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCampaigns = { activeCampaign: { name: "Phandelver" } };
  });

  it("titles the page Get in touch", () => {
    render(<ContactPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Get in touch" })
    ).toBeInTheDocument();
  });

  it("explains that everything lands in one inbox", () => {
    render(<ContactPage />);

    expect(
      screen.getByText(
        "Bugs, ideas and account questions all land in the same inbox — it's a two-person project, so pick a category and we'll know what we're looking at."
      )
    ).toBeInTheDocument();
  });

  it("states the response time before the form", () => {
    render(<ContactPage />);

    expect(screen.getByText("We answer within 1–2 weeks.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Nothing is monitored around the clock — if the app is broken, say so in the message and we'll look sooner."
      )
    ).toBeInTheDocument();
  });

  it("renders the form", () => {
    render(<ContactPage />);

    expect(screen.getByTestId("contact-form")).toBeInTheDocument();
  });

  it("offers a way back to the campaign", async () => {
    render(<ContactPage />);

    await userEvent.click(
      screen.getByRole("button", { name: "Back to Phandelver" })
    );

    expect(mockNavigateToPage).toHaveBeenCalledWith("/");
  });

  it("falls back to a generic back label when there is no active campaign", () => {
    mockCampaigns = { activeCampaign: null };

    render(<ContactPage />);

    expect(
      screen.getByRole("button", { name: "Back to the campaign" })
    ).toBeInTheDocument();
  });

  // The four right-hand prose blocks are the thing this redesign removes.
  // Three of them were instructions for a field the reader had already
  // scrolled past; their content now lives under the message field.
  it("no longer renders the right-hand column of advice", () => {
    render(<ContactPage />);

    expect(screen.queryByText("Feature Request")).not.toBeInTheDocument();
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
    expect(screen.queryByText("Response Time")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Our secure contact form ensures your privacy/)
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="ContactPage"
```

Expected: FAIL — the heading still reads "Contact Us".

- [ ] **Step 4: Rewrite the page**

Replace `src/pages/ContactPage.tsx` entirely:

```tsx
// src/pages/ContactPage.tsx
import React from "react";
import Typography from "core/components/Typography";
import ContactForm from "shared/components/ContactForm";
import { useNavigation } from "shared/hooks/useNavigation";
import { useCampaigns } from "features/user-management";
import { ArrowLeft, Clock } from "lucide-react";

/**
 * The contact page.
 *
 * One centred column. The four prose blocks that used to sit in a right-hand
 * third are gone: three were instructions for the message field, which now
 * carries its own guidance, and the fourth held the response time, which is
 * now the callout below the intro.
 */
const ContactPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { activeCampaign } = useCampaigns();

  const backLabel = activeCampaign?.name
    ? `Back to ${activeCampaign.name}`
    : "Back to the campaign";

  return (
    <div className="max-w-[660px] mx-auto px-4 py-8 space-y-6">
      <button
        type="button"
        onClick={() => navigateToPage("/")}
        className="button button-link flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </button>

      <div className="space-y-3">
        <Typography variant="h1">Get in touch</Typography>
        <Typography color="secondary">
          Bugs, ideas and account questions all land in the same inbox — it's a two-person project, so pick a category and we'll know what we're looking at.
        </Typography>
      </div>

      {/* The response expectation, stated where it cannot be missed */}
      <div className="callout-inverted rounded-lg p-4 flex items-start gap-3">
        <Clock className="w-5 h-5 mt-1 shrink-0" />
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <Typography variant="body" className="font-semibold shrink-0">
            We answer within 1–2 weeks.
          </Typography>
          <Typography variant="body">
            Nothing is monitored around the clock — if the app is broken, say so in the message and we'll look sooner.
          </Typography>
        </div>
      </div>

      <ContactForm />
    </div>
  );
};

export default ContactPage;
```

- [ ] **Step 5: Run the test to verify it passes**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="ContactPage"
```

Expected: PASS, 7 tests.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/pages/ContactPage.tsx src/pages/__tests__/ContactPage.test.tsx src/core/themes/css/components.css
git commit -m "feat(contact): one centred column, with the response time up front"
```

---

## Task 9: The entry point in the header

**Files:**
- Modify: `src/app/layout/Header.tsx`
- Modify: `src/app/layout/__tests__/Header.test.tsx`

**Interfaces:**
- Consumes: the existing `Header` internals — `useNavigation()` for `navigateToPage`, `useLocation()` for the current path, and the Account icon-button row (around lines 232–265) holding the Profile / Groups / Admin ghost buttons.
- Produces: nothing other tasks consume.

**Read `Header.tsx` before editing.** It is 465 lines with a mobile and a desktop path; add the button to the same Account row the Profile button lives in, matching its exact `Button` props and class names.

- [ ] **Step 1: Write the failing test**

Add to `src/app/layout/__tests__/Header.test.tsx`, inside the existing describe for the signed-in menu. Match the file's existing mock setup and helpers rather than inventing new ones:

```tsx
  it("offers a way to report a problem", async () => {
    // Open the menu using whatever helper the surrounding tests use.
    renderSignedInHeaderWithMenuOpen();

    expect(
      screen.getByRole("button", { name: /Report a problem/i })
    ).toBeInTheDocument();
  });

  it("carries the current route to the contact page as context", async () => {
    renderSignedInHeaderWithMenuOpen();

    await userEvent.click(
      screen.getByRole("button", { name: /Report a problem/i })
    );

    // The originating route is what makes a bug report actionable; by the
    // time the form renders, the current path is only ever "/contact".
    expect(mockNavigateToPage).toHaveBeenCalledWith(
      expect.stringContaining("/contact?from=")
    );
  });
```

- [ ] **Step 2: Run the test to verify it fails**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="Header"
```

Expected: FAIL — no such button.

- [ ] **Step 3: Add the handler**

In `Header.tsx`, alongside `handleProfileClick`:

```tsx
  /**
   * Open the contact page as a problem report, carrying where the user was.
   *
   * TODO(PR 4): this moves into the profile menu when that lands. The
   * `?from=` parameter must survive the move -- it is the only way the
   * report knows which page the problem was on, since by the time the form
   * renders the current path is always "/contact".
   */
  const handleReportProblem = () => {
    setIsMenuOpen(false);
    navigateToPage(`/contact?from=${encodeURIComponent(location.pathname)}`);
  };
```

Adjust `setIsMenuOpen` to whatever the file actually calls its menu-closing setter, and make sure `location` is in scope — add `const location = useLocation();` from `react-router-dom` if it is not already there.

- [ ] **Step 4: Add the button**

In the Account icon row, after the Profile button, matching its props exactly:

```tsx
                        {/* Report a problem — contact is where bug reports
                            come from, and the footer was its only entrance */}
                        <Button
                          variant="ghost"
                          startIcon={<Bug size={24} className="primary" />}
                          iconPosition="top"
                          onClick={handleReportProblem}
                          className="flex flex-col items-center gap-1 button-ghost typography"
                          aria-label="Report a problem"
                        >
                          <span className="text-xs font-medium typography">Report</span>
                        </Button>
```

Add `Bug` to the existing `lucide-react` import.

- [ ] **Step 5: Run the test to verify it passes**

```
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="Header"
```

Expected: PASS, with every pre-existing Header test still green.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/app/layout/Header.tsx src/app/layout/__tests__/Header.test.tsx
git commit -m "feat(contact): reach the contact page from the header, with context"
```

---

## Task 10: Integration verification

**Files:** none created; fixes only, wherever the gates point.

This task is not optional and cannot be skipped because the individual tasks were green. **Four resolvers disagree in this repo** and no single gate catches all of them.

- [ ] **Step 1: Typecheck the whole app**

```
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 2: Run the full suite**

```
npm test
```

Expected: **0 failed, 2 skipped.** The 2 skips are #901's, closed as testability-only. Any other red is a regression introduced by this branch — fix the code, never the test.

Pay particular attention to suites that render `ContactForm` or `Header` indirectly: `Footer.test.tsx`, `Layout.test.tsx`, and anything mounting the router.

- [ ] **Step 3: Run the production build**

```
npm run build
```

Expected: a successful build. **This gate is not implied by the two above** — `react-scripts`' webpack honours tsconfig `baseUrl` but ignores `paths`, so a stray `@/…` import passes `tsc` and jest and fails only here with `Module not found`.

- [ ] **Step 4: Typecheck the functions package**

```
cd firebase/functions && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Look at the page**

```
.\scripts\start-dev.ps1 -Action start
```

Then open `/contact` and check, in **all three themes** (light, dark, medieval):

- the inverted callout is legible and does not lose its text colour;
- the selected chip is unmistakably distinct from the unselected ones;
- the guidance card appears and changes with the category, and is absent for Account or group and Something else;
- the "Why do you need more?" field appears only for More smart detection;
- the identity row reads correctly, and "Use a different email" reveals working inputs;
- the layout holds at a narrow viewport — the chips wrap, the submit row stacks rather than overflowing.

If the dev server reports an error that `tsc` and `npm run build` do not, it is almost certainly a stale cache: `rm -rf node_modules/.cache`, then restart.

- [ ] **Step 6: Verify the deep link still works**

Open `/contact?subject=Smart%20Detection%20Limit%20Increase%20Request` — the **More smart detection** chip must be selected and no asterisk-fenced message may appear. This is the link `EntityExtractionService.ts:132` and `CampaignLinksPanel.tsx:410` send users to, and neither file changes in this PR.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix(contact): resolve integration issues found across all gates"
```

---

## Notes for the reviewer

**What is deliberately not here:** the attachment drop zone from the mock. It is deferred rather than shipped disabled, and the reasoning is recorded in `todo.txt` and in section 9 of the design doc. This must be stated in the PR description.

**The one duplication in this plan** is the category id/subject-label table, which exists in both `contact-categories.ts` and `firebase/functions/src/contact.ts`. `firebase/functions/` is a separate npm package and cannot import from `src/`. Both copies point at section 3 of the design doc as their source of truth.
