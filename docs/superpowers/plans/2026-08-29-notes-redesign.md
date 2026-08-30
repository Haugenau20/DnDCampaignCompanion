# Notes Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Notes index as a searchable, filterable list of rows with derived titles, and the note editor as a writing surface with one honest save line and a single merged "Campaign links" rail.

**Architecture:** Four pure/near-pure foundation modules land first (`note-title`, `entity-matching`, `save-status`, `useCreateNote`), because every UI track imports them. Then two independent UI tracks run in parallel — the index (`NotesPage`/`NotesList`/`NoteCard`) and the rail (`NoteReferences`/`EntityExtractor`/`CampaignLinksPanel`/`UsageMeter`) — which share no files at all. The editor track runs last and alone, because it is the only track that touches `NotePage.tsx` and it consumes the rail's published component interface. `NoteContext.tsx` is read-only throughout: every capability needed (`archiveNote`, `status: "archived"`, `dateAdded`, `updatedAt`) already exists.

**Tech Stack:** React 18 + TypeScript, TailwindCSS over a CSS-variable theme system, Jest + React Testing Library, lodash `debounce`, `lucide-react` icons, Firebase/Firestore behind `NoteContext`.

**Spec:** `docs/superpowers/specs/2026-08-29-notes-redesign-design.md`

---

## Global Constraints

These apply to **every** task. Do not restate them per-task; they are always in force.

- **Branch:** `redesign/notes`, already created off `main` at `78e2792`. Never commit to `main`. Never push without being asked.
- **Baseline:** `192 suites, 4367 passed, 2 skipped, 0 failed`. The suite is expected fully green. **Any red is a regression** — do not dismiss one as an "expected marker".
- **Never modify a test to make it pass.** Rewrite assertions to match the new *structure*, but never delete an assertion to get green. If a test fails because the code is wrong, fix the code.
- **No hard-coded colours.** No hex values from the mock. Use theme utility classes only.
- **These three classes do not exist** and are silent no-ops, despite appearing in current code: `status-archived`, `status-warning`, `status-success`. The classes that **do** exist are `status-general`, `status-active`, `status-completed`, `status-failed`, `status-unknown`. **Warning tone = `status-unknown`. Error tone = `status-failed` (or `typography-error` for text).** Do not introduce new uses of the three phantom classes.
- **Available theme classes:** `card`, `card-border`, `card-subtle`, `input`, `dropdown-item`, `primary`, `secondary`, `accent`, `bg-primary`, `bg-secondary`, `bg-accent`, `typography-heading`, `typography-secondary`, `typography-muted`, `typography-error`, `typography-label`, `progress-container`, `progress-bar`, `content`, `line-clamp-2`.
- **Nothing may be styled so that it only works in one theme.** Three themes ship: light, dark, medieval.
- **Imports in shipped code use bare `baseUrl` specifiers** (`core/components/Button`, `features/user-management`, `shared/hooks/useNavigation`) or relative paths. **Never `@/…` in `src/` outside `__tests__/` and `test-utils/`** — webpack ignores tsconfig `paths` and the production build will fail with `Module not found` even though `tsc` and jest are green. `@/…` inside test files is fine and already used.
- **Do not change `src/features/collaboration/notes/types.ts`.** No new `Note` fields, no Firestore schema change.
- **`NoteContext.tsx` is read-only.** If you believe you need to change it, stop and report instead.
- **The string `"New Note"` must not exist anywhere in `src/` when this plan is complete.**
- **Per-task gate:** `npx tsc --noEmit` plus the task's own jest files must both be clean before the commit step.
- Commit messages end with:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
  ```

---

## File Structure

**Created**

| File | Responsibility |
| --- | --- |
| `src/features/collaboration/notes/utils/note-title.ts` | Derive a note's display title from its first content line. Pure. |
| `src/features/collaboration/notes/utils/entity-matching.ts` | Whole-word occurrence test for an entity name inside note text. Pure. |
| `src/features/collaboration/notes/utils/save-status.ts` | Format "last saved" as relative time with a day unit and an absolute fallback. Pure. |
| `src/features/collaboration/notes/hooks/useCreateNote.ts` | The single place an empty note is created and opened. |
| `src/features/collaboration/notes/components/CampaignLinksPanel.tsx` | The merged rail: matched entities + AI detections + scan button. |
| `src/features/collaboration/entity-extraction/components/UsageMeter.tsx` | Labelled monthly scan-usage row with a thin meter. |

**Modified**

| File | Change |
| --- | --- |
| `src/pages/notes/NotesPage.tsx` | Header only: h1, subtitle, `New note`. Keeps the `isLoading` campaign guard. |
| `src/pages/notes/NotePage.tsx` | `1fr 320px` grid, delete confirmation, stops rendering `FloatingUsageIndicator`. |
| `src/features/collaboration/notes/components/NotesList.tsx` | Control row (search / pills / sort) + row list + `Show all`. |
| `src/features/collaboration/notes/components/NoteCard.tsx` | Becomes the row renderer: chips, timestamp, unsaved treatment. |
| `src/features/collaboration/notes/components/NoteEditor.tsx` | Writing surface; save correctness; derived title; `onExtractEntities` deleted. |
| `src/features/collaboration/notes/components/NoteReferences.tsx` | Reads entities from context; uses `matchesInText`; exports a hook. |
| `src/features/collaboration/entity-extraction/components/EntityExtractor.tsx` | Loses its card shell; `filterNewEntities` reads context. |
| `src/features/collaboration/index.ts` | Barrel additions for all new modules. |

**Untouched but relevant:** `FloatingUsageIndicator.tsx` stays exported and tested; only `NotePage` stops rendering it.

---

# PHASE 1 — Foundation (orchestrator, sequential)

Every later track imports from these. Phase 2 cannot start until Task 4 is committed.

---

### Task 1: Note title derivation

**Files:**
- Create: `src/features/collaboration/notes/utils/note-title.ts`
- Test: `src/features/collaboration/notes/utils/__tests__/note-title.test.ts`

**Interfaces:**
- Consumes: `Note` from `../types` (type-only).
- Produces:
  - `deriveTitle(content: string): string`
  - `displayTitle(note: Pick<Note, "title" | "content">): string | null`
  - `MAX_DERIVED_TITLE_LENGTH: 80`

- [ ] **Step 1: Write the failing test**

Create `src/features/collaboration/notes/utils/__tests__/note-title.test.ts`:

```ts
// src/features/collaboration/notes/utils/__tests__/note-title.test.ts

import { deriveTitle, displayTitle, MAX_DERIVED_TITLE_LENGTH } from '../note-title';

describe('deriveTitle', () => {
  test('should return the first line of content', () => {
    expect(deriveTitle('Wave Echo Cave\n\nThe party met Gundren.')).toBe('Wave Echo Cave');
  });

  test('should skip leading blank and whitespace-only lines', () => {
    expect(deriveTitle('\n   \n\nSession 32\nmore text')).toBe('Session 32');
  });

  test('should trim surrounding whitespace from the derived line', () => {
    expect(deriveTitle('   Redbrand hideout   \nrest')).toBe('Redbrand hideout');
  });

  test('should return empty string for empty content', () => {
    expect(deriveTitle('')).toBe('');
  });

  test('should return empty string for whitespace-only content', () => {
    expect(deriveTitle('   \n\t\n  ')).toBe('');
  });

  test('should keep a line that is exactly the maximum length', () => {
    const line = 'a'.repeat(MAX_DERIVED_TITLE_LENGTH);
    expect(deriveTitle(line)).toBe(line);
    expect(deriveTitle(line)).toHaveLength(80);
  });

  test('should cut a long line on a word boundary without an ellipsis', () => {
    // 17 words of 4 chars + spaces runs past 80 chars mid-word.
    const line = 'word '.repeat(20).trim();
    const result = deriveTitle(line);
    expect(result.length).toBeLessThanOrEqual(MAX_DERIVED_TITLE_LENGTH);
    expect(result).not.toContain('...');
    expect(result).not.toContain('…');
    expect(result.endsWith('word')).toBe(true);
    // Cutting on a boundary means no partial trailing token.
    expect(result.split(' ').every(token => token === 'word')).toBe(true);
  });

  test('should hard-cut a single word longer than the maximum', () => {
    const result = deriveTitle('b'.repeat(120));
    expect(result).toBe('b'.repeat(MAX_DERIVED_TITLE_LENGTH));
  });

  test('should not leave trailing whitespace after a boundary cut', () => {
    const line = `${'x'.repeat(78)} tail`;
    const result = deriveTitle(line);
    expect(result).toBe('x'.repeat(78));
  });
});

describe('displayTitle', () => {
  test('should prefer an explicit title', () => {
    expect(displayTitle({ title: 'My title', content: 'First line' })).toBe('My title');
  });

  test('should fall back to the derived title when the title is empty', () => {
    expect(displayTitle({ title: '', content: 'First line\nsecond' })).toBe('First line');
  });

  test('should treat a whitespace-only title as absent', () => {
    expect(displayTitle({ title: '   ', content: 'Derived line' })).toBe('Derived line');
  });

  test('should return null when there is no title and no content', () => {
    expect(displayTitle({ title: '', content: '' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testPathPattern="note-title" --maxWorkers=1
```

Expected: FAIL — `Cannot find module '../note-title'`.

- [ ] **Step 3: Write the implementation**

Create `src/features/collaboration/notes/utils/note-title.ts`:

```ts
// src/features/collaboration/notes/utils/note-title.ts

import { Note } from "../types";

/**
 * Maximum length of a title derived from a note's content.
 *
 * Long enough for a real session heading, short enough that the index row's
 * title never wraps past one line at the width the list container gives it.
 */
export const MAX_DERIVED_TITLE_LENGTH = 80;

/**
 * The title a note takes from its own content: its first non-empty line,
 * trimmed and capped at {@link MAX_DERIVED_TITLE_LENGTH} characters.
 *
 * The cap lands on a word boundary and adds **no ellipsis** — this value is
 * stored on the note, and a stored ellipsis would be indistinguishable from
 * one the user typed. Visual truncation is the index's job (`line-clamp-2`).
 *
 * @param content Raw note body
 * @returns The derived title, or "" when the content has no non-empty line
 */
export function deriveTitle(content: string): string {
  const firstLine = (content ?? "")
    .split("\n")
    .map(line => line.trim())
    .find(line => line.length > 0);

  if (!firstLine) return "";
  if (firstLine.length <= MAX_DERIVED_TITLE_LENGTH) return firstLine;

  // One character past the cap, so a space sitting exactly on the boundary
  // still counts as a boundary rather than forcing a cut one word earlier.
  const window = firstLine.slice(0, MAX_DERIVED_TITLE_LENGTH + 1);
  const lastSpace = window.lastIndexOf(" ");

  // A single token longer than the cap has no boundary to cut on.
  if (lastSpace <= 0) return firstLine.slice(0, MAX_DERIVED_TITLE_LENGTH);

  return window.slice(0, lastSpace).trimEnd();
}

/**
 * The title to display for a note.
 *
 * An explicit title always wins. Otherwise the title is derived from the
 * content. `null` means the note has neither — the caller renders
 * "Untitled note" in muted colour, and that is the *only* note that should
 * ever read "Untitled".
 */
export function displayTitle(note: Pick<Note, "title" | "content">): string | null {
  const explicit = (note.title ?? "").trim();
  if (explicit) return explicit;

  const derived = deriveTitle(note.content ?? "");
  return derived || null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest --testPathPattern="note-title" --maxWorkers=1 && npx tsc --noEmit
```

Expected: PASS, 13 tests. `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/collaboration/notes/utils/note-title.ts src/features/collaboration/notes/utils/__tests__/note-title.test.ts
git commit -m "$(cat <<'EOF'
feat(notes): derive a note title from its first content line

Notes are all called "New Note" because createNote is the only thing
that ever sets a title. deriveTitle takes the first non-empty line,
capped at 80 chars on a word boundary with no stored ellipsis;
displayTitle returns null only for a note with neither title nor
content, which is the one note that should read "Untitled".

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

### Task 2: Word-boundary entity matching

**Files:**
- Create: `src/features/collaboration/notes/utils/entity-matching.ts`
- Test: `src/features/collaboration/notes/utils/__tests__/entity-matching.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `matchesInText(noteText: string, candidate: string): boolean`

**Why this exists rather than a fix to `normalizeTextForComparison`:** that function is exported from the collaboration barrel and `EntityExtractor` uses it for entity-vs-entity *equality* (dedup, reference matching), where dash-joining a single name is harmless. The defect — `"…in the cave. Wave Echo starts…"` collapsing to `cave-wave-echo` and matching an entity named "Cave Wave Echo" — exists only in the note-**scanning** path. **Do not modify `normalizeTextForComparison`.**

- [ ] **Step 1: Write the failing test**

Create `src/features/collaboration/notes/utils/__tests__/entity-matching.test.ts`:

```ts
// src/features/collaboration/notes/utils/__tests__/entity-matching.test.ts

import { matchesInText } from '../entity-matching';

describe('matchesInText', () => {
  test('should match a plain occurrence', () => {
    expect(matchesInText('The party met Gundren Rockseeker today.', 'Gundren Rockseeker')).toBe(true);
  });

  test('should match case-insensitively', () => {
    expect(matchesInText('we went to phandalin', 'Phandalin')).toBe(true);
  });

  test('should NOT match across a sentence boundary', () => {
    // The bug this function exists for: normalizeTextForComparison turns this
    // note into "...cave-wave-echo-starts..." and false-matches the entity.
    const note = 'We camped in the cave. Wave Echo starts tomorrow.';
    expect(matchesInText(note, 'Cave Wave Echo')).toBe(false);
  });

  test('should NOT match a substring inside a longer word', () => {
    expect(matchesInText('The caverns were flooded.', 'cave')).toBe(false);
    expect(matchesInText('Phandalinesque architecture', 'Phandalin')).toBe(false);
  });

  test('should match a name adjacent to punctuation', () => {
    expect(matchesInText('We reached Phandalin, at last.', 'Phandalin')).toBe(true);
    expect(matchesInText('Who is Gundren?', 'Gundren')).toBe(true);
    expect(matchesInText('"Phandalin"', 'Phandalin')).toBe(true);
  });

  test('should match at the very start and very end of the text', () => {
    expect(matchesInText('Phandalin is quiet', 'Phandalin')).toBe(true);
    expect(matchesInText('we rode to Phandalin', 'Phandalin')).toBe(true);
  });

  test('should ignore a leading article on the candidate', () => {
    expect(matchesInText('They entered Stonehill Inn.', 'The Stonehill Inn')).toBe(true);
  });

  test('should tolerate any whitespace run between candidate words', () => {
    expect(matchesInText('the  Stonehill\n  Inn was full', 'Stonehill Inn')).toBe(true);
  });

  test('should treat regex metacharacters in the candidate literally', () => {
    expect(matchesInText('We visited the Inn (Old).', 'Inn (Old)')).toBe(true);
    expect(matchesInText('We visited the Inn XOld.', 'Inn (Old)')).toBe(false);
  });

  test('should return false for empty inputs', () => {
    expect(matchesInText('', 'Phandalin')).toBe(false);
    expect(matchesInText('Phandalin', '')).toBe(false);
    expect(matchesInText('Phandalin', '   ')).toBe(false);
    expect(matchesInText('Phandalin', 'the')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testPathPattern="entity-matching" --maxWorkers=1
```

Expected: FAIL — `Cannot find module '../entity-matching'`.

- [ ] **Step 3: Write the implementation**

Create `src/features/collaboration/notes/utils/entity-matching.ts`:

```ts
// src/features/collaboration/notes/utils/entity-matching.ts

/** Leading articles are dropped from a candidate before matching, so an
 *  entity stored as "The Stonehill Inn" still matches "Stonehill Inn". */
const LEADING_ARTICLE = /^(the|a|an)\s+/i;

/** Characters that must be taken literally inside a generated RegExp. */
const REGEXP_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

function escapeForRegExp(value: string): string {
  return value.replace(REGEXP_METACHARACTERS, "\\$&");
}

/**
 * Whether `candidate` occurs in `noteText` as a whole-word run.
 *
 * This replaces the `normalizedNote.includes(normalizedName)` test that used
 * to drive reference finding. That test ran both sides through
 * `normalizeTextForComparison`, which replaces every run of `[.,!?;:\s]+`
 * with a single dash — so `"We camped in the cave. Wave Echo starts"` became
 * `cave-wave-echo-starts` and matched an entity named "Cave Wave Echo" across
 * a sentence boundary. Matching against the raw text with word-boundary
 * guards makes that impossible, because the full stop is still there.
 *
 * `normalizeTextForComparison` is deliberately left alone: it is still
 * correct for the entity-vs-entity equality checks in EntityExtractor.
 *
 * Word boundaries are expressed as "not a letter or digit" on either side
 * rather than `\b`, so that candidates beginning or ending with punctuation
 * (e.g. `"Inn (Old)"`) still behave. Lookbehind is avoided for browser reach.
 *
 * @param noteText The raw note body
 * @param candidate The entity name or title to look for
 */
export function matchesInText(noteText: string, candidate: string): boolean {
  if (!noteText || !candidate) return false;

  const stripped = candidate.replace(LEADING_ARTICLE, "").trim();
  if (!stripped) return false;

  // Escape first, then relax internal whitespace so a name spanning a line
  // break or a double space still matches.
  const pattern = escapeForRegExp(stripped).replace(/\s+/g, "\\s+");
  const boundary = "[^\\p{L}\\p{N}]";
  const expression = new RegExp(`(^|${boundary})${pattern}($|${boundary})`, "iu");

  return expression.test(noteText);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest --testPathPattern="entity-matching" --maxWorkers=1 && npx tsc --noEmit
```

Expected: PASS, 10 tests. `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/collaboration/notes/utils/entity-matching.ts src/features/collaboration/notes/utils/__tests__/entity-matching.test.ts
git commit -m "$(cat <<'EOF'
fix(notes): match entity names on word boundaries, not dash-joined text

normalizeTextForComparison replaces every run of punctuation and space
with a dash, so "We camped in the cave. Wave Echo starts" collapsed to
cave-wave-echo-starts and false-matched an entity named "Cave Wave
Echo" across a sentence boundary.

matchesInText tests the raw note text with word-boundary guards, so
the full stop still separates the two. normalizeTextForComparison is
left alone -- it is still correct for the entity-vs-entity equality
checks in EntityExtractor, which is the only other thing using it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

### Task 3: Save-status formatting

**Files:**
- Create: `src/features/collaboration/notes/utils/save-status.ts`
- Test: `src/features/collaboration/notes/utils/__tests__/save-status.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `formatLastSaved(lastSaved: Date, now?: Date): string`

**The bug being fixed:** `NoteEditor.getLastSavedText` has no day unit. Its `else` branch divides by 3600 forever, which is why the user's screenshot reads `Saved 10870h ago`.

- [ ] **Step 1: Write the failing test**

Create `src/features/collaboration/notes/utils/__tests__/save-status.test.ts`:

```ts
// src/features/collaboration/notes/utils/__tests__/save-status.test.ts

import { formatLastSaved } from '../save-status';

/** Fixed reference point so every case is deterministic. */
const NOW = new Date('2026-06-10T12:00:00.000Z');

function agoMs(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatLastSaved', () => {
  test('should read "just now" under a minute', () => {
    expect(formatLastSaved(agoMs(5_000), NOW)).toBe('Saved just now');
  });

  test('should report whole minutes under an hour', () => {
    expect(formatLastSaved(agoMs(2 * MINUTE), NOW)).toBe('Saved 2 minutes ago');
    expect(formatLastSaved(agoMs(59 * MINUTE), NOW)).toBe('Saved 59 minutes ago');
  });

  test('should report hours under a day', () => {
    expect(formatLastSaved(agoMs(3 * HOUR), NOW)).toBe('Saved 3 hours ago');
  });

  test('should report days rather than accumulating hours', () => {
    // The bug: the old implementation rendered this as "Saved 72h ago".
    expect(formatLastSaved(agoMs(3 * DAY), NOW)).toBe('Saved 3 days ago');
  });

  test('should not render an hour count above 24 for any input', () => {
    // Regression guard for "Saved 10870h ago".
    const veryOld = formatLastSaved(agoMs(453 * DAY), NOW);
    expect(veryOld).not.toMatch(/\d{3,}\s*(h|hours)/);
  });

  test('should fall back to an absolute date past seven days', () => {
    const result = formatLastSaved(new Date('2026-06-02T09:00:00.000Z'), NOW);
    expect(result).toMatch(/^Saved on /);
    expect(result).toContain('2');
  });

  test('should use the absolute form for a note saved a year ago', () => {
    const result = formatLastSaved(new Date('2025-06-02T09:00:00.000Z'), NOW);
    expect(result).toMatch(/^Saved on /);
  });

  test('should still report days at exactly seven days', () => {
    expect(formatLastSaved(agoMs(7 * DAY), NOW)).toBe('Saved 7 days ago');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testPathPattern="save-status" --maxWorkers=1
```

Expected: FAIL — `Cannot find module '../save-status'`.

- [ ] **Step 3: Write the implementation**

Create `src/features/collaboration/notes/utils/save-status.ts`:

```ts
// src/features/collaboration/notes/utils/save-status.ts

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Past this age a relative phrase stops being useful and a date is clearer. */
const ABSOLUTE_THRESHOLD_DAYS = 7;

/**
 * Human phrasing for when a note was last saved.
 *
 * Replaces `NoteEditor.getLastSavedText`, which had no day unit: its final
 * branch divided the elapsed seconds by 3600 forever, so a note last saved
 * over a year earlier read "Saved 10870h ago".
 *
 * @param lastSaved When the note was last written
 * @param now Injected for deterministic tests; defaults to the current time
 */
export function formatLastSaved(lastSaved: Date, now: Date = new Date()): string {
  const elapsed = now.getTime() - lastSaved.getTime();

  if (elapsed < MINUTE_MS) return "Saved just now";

  // `numeric: "always"` keeps the phrasing uniform ("2 minutes ago") instead
  // of switching to "last minute" / "yesterday" partway up the scale.
  const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "always" });

  if (elapsed < HOUR_MS) {
    return `Saved ${relative.format(-Math.floor(elapsed / MINUTE_MS), "minute")}`;
  }

  if (elapsed < DAY_MS) {
    return `Saved ${relative.format(-Math.floor(elapsed / HOUR_MS), "hour")}`;
  }

  const days = Math.floor(elapsed / DAY_MS);
  if (days <= ABSOLUTE_THRESHOLD_DAYS) {
    return `Saved ${relative.format(-days, "day")}`;
  }

  return `Saved on ${lastSaved.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  })}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest --testPathPattern="save-status" --maxWorkers=1 && npx tsc --noEmit
```

Expected: PASS, 8 tests. `tsc` clean.

If a locale difference makes `Intl.RelativeTimeFormat` produce something other than `"2 minutes ago"` under jest, **do not weaken the assertion** — pin the locale by passing `"en"` as the first argument to `Intl.RelativeTimeFormat` and note why in a comment.

- [ ] **Step 5: Commit**

```bash
git add src/features/collaboration/notes/utils/save-status.ts src/features/collaboration/notes/utils/__tests__/save-status.test.ts
git commit -m "$(cat <<'EOF'
fix(notes): give the save-status line a day unit

getLastSavedText had no branch past hours, so it divided elapsed
seconds by 3600 indefinitely and rendered "Saved 10870h ago" for a
note last written over a year earlier.

formatLastSaved runs minutes -> hours -> days through
Intl.RelativeTimeFormat and falls back to an absolute date past a
week, where a relative phrase stops carrying information.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

### Task 4: `useCreateNote` hook and barrel exports

**Files:**
- Create: `src/features/collaboration/notes/hooks/useCreateNote.ts`
- Test: `src/features/collaboration/notes/hooks/__tests__/useCreateNote.test.ts`
- Modify: `src/features/collaboration/index.ts`

**Interfaces:**
- Consumes: `useNotes` (`../context/NoteContext`), `useCampaigns` (`features/user-management`), `useNavigation` (`shared/hooks/useNavigation`).
- Produces: `useCreateNote(): { createAndOpen: () => Promise<void> }`, plus barrel re-exports of `deriveTitle`, `displayTitle`, `MAX_DERIVED_TITLE_LENGTH`, `matchesInText`, `formatLastSaved`, `useCreateNote`.

`createNote("New Note", "")` is currently duplicated in `NotesPage` **and** `NotesList` with identical try/catch and navigate. This hook is the single replacement, and it is where the `"New Note"` string dies.

- [ ] **Step 1: Write the failing test**

Create `src/features/collaboration/notes/hooks/__tests__/useCreateNote.test.ts`:

```ts
// src/features/collaboration/notes/hooks/__tests__/useCreateNote.test.ts

import { renderHook, act } from '@testing-library/react';
import { useCreateNote } from '../useCreateNote';

const mockCreateNote = jest.fn();
const mockNavigateToPage = jest.fn();

jest.mock('../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));

jest.mock('@/features/user-management', () => ({
  useCampaigns: jest.fn(),
}));

jest.mock('shared/hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

const { useNotes } = require('../../context/NoteContext');
const { useCampaigns } = require('@/features/user-management');
const { useNavigation } = require('shared/hooks/useNavigation');

function setupMocks({ activeCampaignId = 'campaign-1' as string | null } = {}) {
  (useNotes as jest.Mock).mockReturnValue({ createNote: mockCreateNote });
  (useCampaigns as jest.Mock).mockReturnValue({ activeCampaignId });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    currentPath: '/notes',
  });
}

describe('useCreateNote', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('should create the note with an EMPTY title', async () => {
    setupMocks();
    mockCreateNote.mockResolvedValue('note-7');

    const { result } = renderHook(() => useCreateNote());
    await act(async () => {
      await result.current.createAndOpen();
    });

    expect(mockCreateNote).toHaveBeenCalledWith('', '');
    // The regression this whole redesign starts from.
    expect(mockCreateNote).not.toHaveBeenCalledWith('New Note', '');
  });

  test('should navigate to the created note', async () => {
    setupMocks();
    mockCreateNote.mockResolvedValue('note-7');

    const { result } = renderHook(() => useCreateNote());
    await act(async () => {
      await result.current.createAndOpen();
    });

    expect(mockNavigateToPage).toHaveBeenCalledWith('/notes/note-7');
  });

  test('should not create or navigate without an active campaign', async () => {
    setupMocks({ activeCampaignId: null });

    const { result } = renderHook(() => useCreateNote());
    await act(async () => {
      await result.current.createAndOpen();
    });

    expect(mockCreateNote).not.toHaveBeenCalled();
    expect(mockNavigateToPage).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test('should not navigate when creation rejects', async () => {
    setupMocks();
    mockCreateNote.mockRejectedValue(new Error('firestore down'));

    const { result } = renderHook(() => useCreateNote());
    await act(async () => {
      await result.current.createAndOpen();
    });

    expect(mockNavigateToPage).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testPathPattern="useCreateNote" --maxWorkers=1
```

Expected: FAIL — `Cannot find module '../useCreateNote'`.

- [ ] **Step 3: Write the implementation**

Create `src/features/collaboration/notes/hooks/useCreateNote.ts`:

```ts
// src/features/collaboration/notes/hooks/useCreateNote.ts

import { useCallback } from "react";
import { useNotes } from "../context/NoteContext";
import { useCampaigns } from "features/user-management";
import { useNavigation } from "shared/hooks/useNavigation";

/**
 * Creates an empty note in the active campaign and opens it.
 *
 * This is the single creation path. `NotesPage` and `NotesList` each carried
 * their own copy of it, both passing the literal title "New Note" — which is
 * why every note in the index was called "New Note", since nothing ever
 * renamed one afterwards. The title is now empty on creation and the editor
 * derives a display title from the first line the user writes.
 *
 * Failure is logged, not thrown: both call sites are click handlers with no
 * error surface of their own, and navigating to a note that was never created
 * would be worse than doing nothing.
 */
export function useCreateNote(): { createAndOpen: () => Promise<void> } {
  const { createNote } = useNotes();
  const { activeCampaignId } = useCampaigns();
  const { navigateToPage } = useNavigation();

  const createAndOpen = useCallback(async () => {
    if (!activeCampaignId) {
      console.error("Cannot create note: No active campaign selected");
      return;
    }

    try {
      const noteId = await createNote("", "");
      navigateToPage(`/notes/${noteId}`);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  }, [activeCampaignId, createNote, navigateToPage]);

  return { createAndOpen };
}
```

- [ ] **Step 4: Add the barrel exports**

In `src/features/collaboration/index.ts`, immediately after the existing
`export { useNoteData } from './notes/hooks/useNoteData';` line, add:

```ts
export { useCreateNote } from './notes/hooks/useCreateNote';
// Note presentation helpers — pure, no Firebase, safe for any consumer.
export { deriveTitle, displayTitle, MAX_DERIVED_TITLE_LENGTH } from './notes/utils/note-title';
export { matchesInText } from './notes/utils/entity-matching';
export { formatLastSaved } from './notes/utils/save-status';
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx jest --testPathPattern="useCreateNote" --maxWorkers=1 && npx tsc --noEmit
```

Expected: PASS, 4 tests. `tsc` clean.

- [ ] **Step 6: Verify the whole suite is still green**

```bash
npx jest --silent 2>&1 | tail -6
```

Expected: `192 passed` suites, `0 failed`, plus the 3 new suites → **195 suites**, 4367 + 35 = ~4402 passed, 2 skipped.

- [ ] **Step 7: Commit**

```bash
git add src/features/collaboration/notes/hooks/useCreateNote.ts src/features/collaboration/notes/hooks/__tests__/useCreateNote.test.ts src/features/collaboration/index.ts
git commit -m "$(cat <<'EOF'
feat(notes): single creation path, and new notes start untitled

NotesPage and NotesList each carried their own copy of the create
handler, both passing the literal title "New Note" -- which is why
every row in the index read "New Note", since nothing renamed one
afterwards. useCreateNote replaces both and creates with an empty
title, leaving the editor to derive one from the first line.

Also exports the three new note utilities from the barrel.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

# PHASE 2 — Two parallel tracks (2 Sonnet subagents, concurrently)

Track A and Track B share **no files**. Dispatch both at once; do not start Phase 3 until both are merged and green.

---

## TRACK A — The notes index

### Task 5: `NoteCard` becomes an index row

**Files:**
- Modify: `src/features/collaboration/notes/components/NoteCard.tsx` (full rewrite)
- Modify: `src/features/collaboration/notes/components/__tests__/NoteCard.test.tsx`

**Interfaces:**
- Consumes: `displayTitle` from `../utils/note-title`; `Note` from `../types`; `useNavigation` from `shared/hooks/useNavigation`.
- Produces:
  ```ts
  interface NoteCardProps {
    note: Note;
    /** Invoked by the "Save now" action on an unsaved row. */
    onSaveNow?: (noteId: string) => void;
  }
  ```

**What dies here:** the `Card`/`Card.Content` shell, the `Calendar` and `Tag` icons with their label text, `note.tags.join(", ")`, and `content.substring(0, 150) + "..."`. That substring and the `line-clamp-2` beneath it are two truncations fighting each other, and the ellipsis frequently lands off-screen.

**What finally gets used:** `entityCounts`, computed on every render today and then thrown away.

- [ ] **Step 1: Rewrite the test file**

Replace the body of `src/features/collaboration/notes/components/__tests__/NoteCard.test.tsx` below the existing `makeNote` fixture helper (**keep** the imports, the `useNavigation` mock, `setupMocks` and `makeNote` exactly as they are) with:

```tsx
describe('NoteCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('title', () => {
    test('should render an explicit title', () => {
      render(<NoteCard note={makeNote({ title: 'Session 5 Notes' })} />);
      expect(screen.getByText('Session 5 Notes')).toBeInTheDocument();
    });

    test('should derive the title from the first content line when untitled', () => {
      render(<NoteCard note={makeNote({ title: '', content: 'Wave Echo Cave\nrest of it' })} />);
      expect(screen.getByText('Wave Echo Cave')).toBeInTheDocument();
    });

    test('should read "Untitled note" only when there is no title and no content', () => {
      render(<NoteCard note={makeNote({ title: '', content: '' })} />);
      expect(screen.getByText('Untitled note')).toBeInTheDocument();
    });

    test('should never render the string "New Note"', () => {
      render(<NoteCard note={makeNote({ title: '', content: '' })} />);
      expect(screen.queryByText('New Note')).not.toBeInTheDocument();
      expect(screen.queryByText('Untitled Note')).not.toBeInTheDocument();
    });
  });

  describe('preview', () => {
    test('should render the content without a manual ellipsis', () => {
      const longContent = 'A'.repeat(200);
      render(<NoteCard note={makeNote({ content: longContent })} />);
      // Truncation is CSS (line-clamp-2), not a substring: the full text is
      // in the DOM and there is no injected "...".
      expect(screen.getByText(longContent)).toBeInTheDocument();
      expect(screen.queryByText(`${'A'.repeat(150)}...`)).not.toBeInTheDocument();
    });

    test('should apply line-clamp-2 to the preview', () => {
      render(<NoteCard note={makeNote({ content: 'Some content here.' })} />);
      expect(screen.getByText('Some content here.')).toHaveClass('line-clamp-2');
    });
  });

  describe('entity chips', () => {
    test('should render a chip per non-zero entity type with correct plurals', () => {
      const note = makeNote({
        extractedEntities: [
          { id: 'e1', text: 'Gundren', type: 'npc', confidence: 0.9, isConverted: true, createdAt: '2024-01-15T10:00:00.000Z' },
          { id: 'e2', text: 'Sildar', type: 'npc', confidence: 0.9, isConverted: true, createdAt: '2024-01-15T10:00:00.000Z' },
          { id: 'e3', text: 'Elmo', type: 'npc', confidence: 0.9, isConverted: true, createdAt: '2024-01-15T10:00:00.000Z' },
          { id: 'e4', text: 'Phandalin', type: 'location', confidence: 0.9, isConverted: true, createdAt: '2024-01-15T10:00:00.000Z' },
          { id: 'e5', text: 'Black Spider', type: 'rumor', confidence: 0.9, isConverted: true, createdAt: '2024-01-15T10:00:00.000Z' },
        ],
      });
      render(<NoteCard note={note} />);

      expect(screen.getByText('3 NPCs')).toBeInTheDocument();
      expect(screen.getByText('1 location')).toBeInTheDocument();
      expect(screen.getByText('1 rumor')).toBeInTheDocument();
    });

    test('should not render a chip for a type with no entities', () => {
      const note = makeNote({
        extractedEntities: [
          { id: 'e1', text: 'Gundren', type: 'npc', confidence: 0.9, isConverted: true, createdAt: '2024-01-15T10:00:00.000Z' },
        ],
      });
      render(<NoteCard note={note} />);

      expect(screen.getByText('1 NPC')).toBeInTheDocument();
      expect(screen.queryByText(/quest/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/location/i)).not.toBeInTheDocument();
    });
  });

  describe('tags', () => {
    test('should render each tag as its own chip, not a joined string', () => {
      render(<NoteCard note={makeNote({ tags: ['session', 'rivendell'] })} />);
      expect(screen.getByText('session')).toBeInTheDocument();
      expect(screen.getByText('rivendell')).toBeInTheDocument();
      expect(screen.queryByText('session, rivendell')).not.toBeInTheDocument();
    });
  });

  describe('unsaved notes', () => {
    test('should show a "Not saved yet" badge', () => {
      render(<NoteCard note={makeNote({ isUnsaved: true })} />);
      expect(screen.getByText('Not saved yet')).toBeInTheDocument();
    });

    test('should offer a "Save now" action that does not navigate', () => {
      const onSaveNow = jest.fn();
      render(<NoteCard note={makeNote({ id: 'note-9', isUnsaved: true })} onSaveNow={onSaveNow} />);

      fireEvent.click(screen.getByRole('button', { name: /save now/i }));

      expect(onSaveNow).toHaveBeenCalledWith('note-9');
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });

    test('should not show the badge for a saved note', () => {
      render(<NoteCard note={makeNote({ isUnsaved: false })} />);
      expect(screen.queryByText('Not saved yet')).not.toBeInTheDocument();
      expect(screen.queryByText('Not Saved')).not.toBeInTheDocument();
    });
  });

  describe('archived notes', () => {
    test('should mark an archived note', () => {
      render(<NoteCard note={makeNote({ status: 'archived' })} />);
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    test('should navigate to the note when the row is activated', () => {
      render(<NoteCard note={makeNote({ id: 'note-3' })} />);
      fireEvent.click(screen.getByText('Session 5 Notes'));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/notes/note-3');
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testPathPattern="NoteCard" --maxWorkers=1
```

Expected: FAIL — "Untitled note", "3 NPCs", "Not saved yet" not found.

- [ ] **Step 3: Rewrite the component**

Replace `src/features/collaboration/notes/components/NoteCard.tsx` entirely:

```tsx
// src/features/collaboration/notes/components/NoteCard.tsx
import React from "react";
import { Note, EntityType } from "../types";
import Typography from "../../../../core/components/Typography";
import { displayTitle } from "../utils/note-title";
import { useNavigation } from "shared/hooks/useNavigation";

interface NoteCardProps {
  /** The note to display */
  note: Note;
  /** Invoked by the "Save now" action on an unsaved row */
  onSaveNow?: (noteId: string) => void;
}

/** Entity types in the order their chips are rendered, with their labels. */
const ENTITY_LABELS: Array<{ type: EntityType; one: string; many: string }> = [
  { type: "npc", one: "NPC", many: "NPCs" },
  { type: "location", one: "location", many: "locations" },
  { type: "quest", one: "quest", many: "quests" },
  { type: "rumor", one: "rumor", many: "rumors" },
];

/**
 * Absolute timestamp for a row, e.g. "2 June, 19:52".
 *
 * Rows are scanned, not read, so a fixed shape the eye can compare down the
 * column beats a relative phrase whose width changes per row.
 */
function formatRowTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Small pill used for both entity counts and tags. */
const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="px-2 py-0.5 rounded text-xs bg-secondary card-border">
    {children}
  </span>
);

/**
 * One row in the notes index.
 *
 * A two-column grid: the note itself on the left (title, two-line preview,
 * entity and tag chips), its timestamp and any row action on the right.
 *
 * The preview is truncated by `line-clamp-2` and nothing else. This component
 * used to also cut the content to 150 characters and append an ellipsis; the
 * two truncations fought and the ellipsis frequently landed off-screen.
 */
const NoteCard: React.FC<NoteCardProps> = ({ note, onSaveNow }) => {
  const { navigateToPage } = useNavigation();

  const handleViewNote = () => {
    navigateToPage(`/notes/${note.id}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleViewNote();
    }
  };

  const handleSaveNow = (event: React.MouseEvent<HTMLButtonElement>) => {
    // The whole row navigates; the action inside it must not.
    event.stopPropagation();
    onSaveNow?.(note.id);
  };

  const title = displayTitle(note);

  // Counts of the entities already stored on the note. Computed here since
  // this redesign began -- previously computed on every render and discarded.
  const entityChips = ENTITY_LABELS.map(({ type, one, many }) => {
    const count = note.extractedEntities.filter(entity => entity.type === type).length;
    return count > 0 ? `${count} ${count === 1 ? one : many}` : null;
  }).filter((label): label is string => label !== null);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleViewNote}
      onKeyDown={handleKeyDown}
      className={`note-card grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4 px-5 py-4 cursor-pointer transition-colors ${
        note.isUnsaved ? "border-l-[3px] border-l-current status-unknown" : ""
      }`}
    >
      {/* Left: the note itself */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {title ? (
            <Typography variant="body" className="font-semibold text-[17px]">
              {title}
            </Typography>
          ) : (
            <Typography variant="body" color="muted" className="font-semibold text-[17px]">
              Untitled note
            </Typography>
          )}

          {note.isUnsaved && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary status-unknown">
              Not saved yet
            </span>
          )}

          {note.status === "archived" && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary typography-secondary">
              Archived
            </span>
          )}
        </div>

        {note.content && (
          <Typography
            variant="body-sm"
            color="secondary"
            className="line-clamp-2 mt-1"
          >
            {note.content}
          </Typography>
        )}

        {(entityChips.length > 0 || note.tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {entityChips.map(label => (
              <Chip key={label}>{label}</Chip>
            ))}
            {note.tags.map(tag => (
              <Chip key={tag}>{tag}</Chip>
            ))}
          </div>
        )}
      </div>

      {/* Right: timestamp and row action */}
      <div className="sm:text-right">
        <Typography variant="body-sm" color="muted" className="text-[13px]">
          {formatRowTimestamp(note.updatedAt)}
        </Typography>

        {note.isUnsaved && onSaveNow && (
          <button
            type="button"
            onClick={handleSaveNow}
            className="mt-1 text-[13px] font-medium status-unknown hover:underline"
          >
            Save now
          </button>
        )}
      </div>
    </div>
  );
};

export default NoteCard;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest --testPathPattern="NoteCard" --maxWorkers=1 && npx tsc --noEmit
```

Expected: PASS, 14 tests. `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/collaboration/notes/components/NoteCard.tsx src/features/collaboration/notes/components/__tests__/NoteCard.test.tsx
git commit -m "$(cat <<'EOF'
feat(notes): render the index entry as a row with its entity counts

NoteCard computed entityCounts on every render and then threw the
result away, so a note that had already been scanned looked identical
to one that had not. The counts are now chips, tags are chips rather
than a joined string, and the row carries its own unsaved treatment
instead of an absolutely-positioned box laid over the card.

Drops the substring(0, 150) + "..." preview: it fought the line-clamp-2
beneath it and put the ellipsis off-screen.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

### Task 6: `NotesList` control row, filtering, sorting

**Files:**
- Modify: `src/features/collaboration/notes/components/NotesList.tsx` (full rewrite)
- Modify: `src/features/collaboration/notes/components/__tests__/NotesList.test.tsx`

**Interfaces:**
- Consumes: `NoteCard` (Task 5, with `onSaveNow`), `displayTitle` (Task 1), `useCreateNote` (Task 4), `useNotes`, `useCampaigns`.
- Produces: `NotesList` as a default export, unchanged prop signature (none).

**Filter semantics — read carefully:**
- `All` means **non-archived**. `All` and `Archived` are disjoint sets.
- `Unsaved` is the subset of non-archived notes with `isUnsaved`.
- `NoteContext` never filtered on `status`, so archived notes are **already** in `notes`. This is pure client-side filtering. **This is the first UI that reaches `status: "archived"` at all.**
- Counts are computed from the **search-filtered** pool so they stay live as the user types.
- Unsaved notes pin to the top under every sort. They are not a separate section.

**Sort fields:** `Newest first`/`Oldest first` → `dateAdded`. `Recently edited` → `updatedAt`.

- [ ] **Step 1: Rewrite the test file**

Replace `src/features/collaboration/notes/components/__tests__/NotesList.test.tsx` entirely:

```tsx
// src/features/collaboration/notes/components/__tests__/NotesList.test.tsx

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import NotesList from '../NotesList';
import { Note } from '../../types';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockSaveNote = jest.fn();
const mockNavigateToPage = jest.fn();
const mockCreateAndOpen = jest.fn();

jest.mock('../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));

jest.mock('../../hooks/useCreateNote', () => ({
  useCreateNote: jest.fn(),
}));

jest.mock('@/features/user-management', () => ({
  useCampaigns: jest.fn(),
}));

jest.mock('shared/hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

const { useNotes } = require('../../context/NoteContext');
const { useCreateNote } = require('../../hooks/useCreateNote');
const { useCampaigns } = require('@/features/user-management');
const { useNavigation } = require('shared/hooks/useNavigation');

function setupMocks({
  notes = [] as Note[],
  isLoading = false,
  error = null as string | null,
  activeCampaignId = 'campaign-1' as string | null,
  activeCampaign = { id: 'campaign-1', name: 'Test Campaign' } as any,
} = {}) {
  (useNotes as jest.Mock).mockReturnValue({
    notes,
    isLoading,
    error,
    saveNote: mockSaveNote,
  });
  (useCreateNote as jest.Mock).mockReturnValue({ createAndOpen: mockCreateAndOpen });
  (useCampaigns as jest.Mock).mockReturnValue({ activeCampaignId, activeCampaign });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    currentPath: '/notes',
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

let noteCounter = 0;

function makeNote(overrides: Partial<Note> = {}): Note {
  noteCounter += 1;
  return {
    id: `note-${noteCounter}`,
    title: `Note ${noteCounter}`,
    content: 'Some content here.',
    extractedEntities: [],
    status: 'active',
    tags: [],
    updatedAt: '2024-01-15T10:00:00.000Z',
    campaignId: 'campaign-1',
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function pillNamed(name: RegExp) {
  return screen.getByRole('button', { name });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    noteCounter = 0;
  });

  describe('states', () => {
    test('should show a loading state', () => {
      setupMocks({ isLoading: true });
      render(<NotesList />);
      expect(screen.getByText(/loading notes/i)).toBeInTheDocument();
    });

    test('should show an error state', () => {
      setupMocks({ error: 'Failed to fetch notes' });
      render(<NotesList />);
      expect(screen.getByText('Failed to fetch notes')).toBeInTheDocument();
    });

    test('should show the no-campaign state', () => {
      setupMocks({ activeCampaignId: null });
      render(<NotesList />);
      expect(screen.getByText(/no campaign selected/i)).toBeInTheDocument();
    });

    test('should show the empty state and let it create a note', () => {
      setupMocks({ notes: [] });
      render(<NotesList />);
      expect(screen.getByText(/no notes for this campaign/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /create note/i }));
      expect(mockCreateAndOpen).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    test('should filter on title', () => {
      setupMocks({
        notes: [
          makeNote({ title: 'Wave Echo Cave', content: 'aaa' }),
          makeNote({ title: 'Redbrand hideout', content: 'bbb' }),
        ],
      });
      render(<NotesList />);

      fireEvent.change(screen.getByPlaceholderText('Search note titles and text'), {
        target: { value: 'redbrand' },
      });

      expect(screen.getByText('Redbrand hideout')).toBeInTheDocument();
      expect(screen.queryByText('Wave Echo Cave')).not.toBeInTheDocument();
    });

    test('should filter on content', () => {
      setupMocks({
        notes: [
          makeNote({ title: 'One', content: 'Gundren Rockseeker was here' }),
          makeNote({ title: 'Two', content: 'nothing relevant' }),
        ],
      });
      render(<NotesList />);

      fireEvent.change(screen.getByPlaceholderText('Search note titles and text'), {
        target: { value: 'gundren' },
      });

      expect(screen.getByText('One')).toBeInTheDocument();
      expect(screen.queryByText('Two')).not.toBeInTheDocument();
    });

    test('should match a derived title', () => {
      setupMocks({
        notes: [
          makeNote({ title: '', content: 'Wave Echo Cave\nmore' }),
          makeNote({ title: 'Other', content: 'unrelated' }),
        ],
      });
      render(<NotesList />);

      fireEvent.change(screen.getByPlaceholderText('Search note titles and text'), {
        target: { value: 'wave echo' },
      });

      expect(screen.getByText('Wave Echo Cave')).toBeInTheDocument();
      expect(screen.queryByText('Other')).not.toBeInTheDocument();
    });
  });

  describe('filter pills', () => {
    function threeKinds() {
      return [
        makeNote({ title: 'Active one' }),
        makeNote({ title: 'Unsaved one', isUnsaved: true }),
        makeNote({ title: 'Archived one', status: 'archived' }),
      ];
    }

    test('should count All as non-archived', () => {
      setupMocks({ notes: threeKinds() });
      render(<NotesList />);
      expect(pillNamed(/^All 2$/)).toBeInTheDocument();
    });

    test('should count Unsaved and Archived', () => {
      setupMocks({ notes: threeKinds() });
      render(<NotesList />);
      expect(pillNamed(/^Unsaved 1$/)).toBeInTheDocument();
      expect(pillNamed(/^Archived 1$/)).toBeInTheDocument();
    });

    test('should hide archived notes under All', () => {
      setupMocks({ notes: threeKinds() });
      render(<NotesList />);
      expect(screen.queryByText('Archived one')).not.toBeInTheDocument();
    });

    test('should reveal archived notes under Archived', () => {
      setupMocks({ notes: threeKinds() });
      render(<NotesList />);

      fireEvent.click(pillNamed(/^Archived 1$/));

      expect(screen.getByText('Archived one')).toBeInTheDocument();
      expect(screen.queryByText('Active one')).not.toBeInTheDocument();
    });

    test('should show only unsaved notes under Unsaved', () => {
      setupMocks({ notes: threeKinds() });
      render(<NotesList />);

      fireEvent.click(pillNamed(/^Unsaved 1$/));

      expect(screen.getByText('Unsaved one')).toBeInTheDocument();
      expect(screen.queryByText('Active one')).not.toBeInTheDocument();
    });

    test('should mark the active pill with aria-pressed', () => {
      setupMocks({ notes: threeKinds() });
      render(<NotesList />);

      expect(pillNamed(/^All 2$/)).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(pillNamed(/^Archived 1$/));
      expect(pillNamed(/^Archived 1$/)).toHaveAttribute('aria-pressed', 'true');
      expect(pillNamed(/^All 2$/)).toHaveAttribute('aria-pressed', 'false');
    });

    test('should keep counts live as the search narrows the pool', () => {
      setupMocks({
        notes: [
          makeNote({ title: 'Keep me' }),
          makeNote({ title: 'Drop me' }),
          makeNote({ title: 'Keep me too' }),
        ],
      });
      render(<NotesList />);

      expect(pillNamed(/^All 3$/)).toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText('Search note titles and text'), {
        target: { value: 'keep' },
      });

      expect(pillNamed(/^All 2$/)).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    function datedNotes() {
      return [
        makeNote({ title: 'Middle', dateAdded: '2024-02-01T00:00:00.000Z', updatedAt: '2024-05-01T00:00:00.000Z' }),
        makeNote({ title: 'Oldest', dateAdded: '2024-01-01T00:00:00.000Z', updatedAt: '2024-06-01T00:00:00.000Z' }),
        makeNote({ title: 'Newest', dateAdded: '2024-03-01T00:00:00.000Z', updatedAt: '2024-04-01T00:00:00.000Z' }),
      ];
    }

    function renderedTitles(): string[] {
      return screen
        .getAllByRole('button')
        .filter(node => node.className.includes('note-card'))
        .map(node => within(node).getAllByText(/Oldest|Middle|Newest|Unsaved one/)[0].textContent ?? '');
    }

    test('should default to newest first by dateAdded', () => {
      setupMocks({ notes: datedNotes() });
      render(<NotesList />);
      expect(renderedTitles()).toEqual(['Newest', 'Middle', 'Oldest']);
    });

    test('should sort oldest first by dateAdded', () => {
      setupMocks({ notes: datedNotes() });
      render(<NotesList />);

      fireEvent.change(screen.getByLabelText('Sort notes'), { target: { value: 'oldest' } });

      expect(renderedTitles()).toEqual(['Oldest', 'Middle', 'Newest']);
    });

    test('should sort by updatedAt under "Recently edited"', () => {
      setupMocks({ notes: datedNotes() });
      render(<NotesList />);

      fireEvent.change(screen.getByLabelText('Sort notes'), { target: { value: 'edited' } });

      expect(renderedTitles()).toEqual(['Oldest', 'Middle', 'Newest']);
    });

    test('should pin unsaved notes to the top regardless of sort', () => {
      const notes = [
        ...datedNotes(),
        makeNote({ title: 'Unsaved one', isUnsaved: true, dateAdded: '2020-01-01T00:00:00.000Z' }),
      ];
      setupMocks({ notes });
      render(<NotesList />);

      expect(renderedTitles()[0]).toBe('Unsaved one');

      fireEvent.change(screen.getByLabelText('Sort notes'), { target: { value: 'oldest' } });
      expect(renderedTitles()[0]).toBe('Unsaved one');
    });
  });

  describe('collapsing a long list', () => {
    test('should show the first four rows and an expander', () => {
      setupMocks({ notes: Array.from({ length: 9 }, () => makeNote()) });
      render(<NotesList />);

      expect(screen.getByText('5 older notes')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show all/i })).toBeInTheDocument();
      expect(screen.queryByText('Note 9')).not.toBeInTheDocument();
    });

    test('should expand in place', () => {
      setupMocks({ notes: Array.from({ length: 9 }, () => makeNote()) });
      render(<NotesList />);

      fireEvent.click(screen.getByRole('button', { name: /show all/i }));

      expect(screen.getByText('Note 9')).toBeInTheDocument();
      expect(screen.queryByText('5 older notes')).not.toBeInTheDocument();
    });

    test('should not show the expander for a short list', () => {
      setupMocks({ notes: Array.from({ length: 3 }, () => makeNote()) });
      render(<NotesList />);
      expect(screen.queryByRole('button', { name: /show all/i })).not.toBeInTheDocument();
    });
  });

  describe('removed markup', () => {
    test('should not render the old section headings', () => {
      setupMocks({ notes: [makeNote({ isUnsaved: true }), makeNote()] });
      render(<NotesList />);

      expect(screen.queryByText('Unsaved Notes')).not.toBeInTheDocument();
      expect(screen.queryByText('Saved Notes')).not.toBeInTheDocument();
      expect(screen.queryByText('Not Saved')).not.toBeInTheDocument();
    });
  });

  describe('save now', () => {
    test('should save an unsaved note in place', () => {
      setupMocks({ notes: [makeNote({ id: 'note-x', isUnsaved: true })] });
      render(<NotesList />);

      fireEvent.click(screen.getByRole('button', { name: /save now/i }));

      expect(mockSaveNote).toHaveBeenCalledWith('note-x');
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testPathPattern="NotesList" --maxWorkers=1
```

Expected: FAIL — the search input, pills and sort control do not exist.

- [ ] **Step 3: Rewrite the component**

Replace `src/features/collaboration/notes/components/NotesList.tsx` entirely:

```tsx
// src/features/collaboration/notes/components/NotesList.tsx

import React, { useMemo, useState } from "react";
import Typography from "../../../../core/components/Typography";
import Button from "../../../../core/components/Button";
import NoteCard from "./NoteCard";
import { Note } from "../types";
import { displayTitle } from "../utils/note-title";
import { useNotes } from "../context/NoteContext";
import { useCreateNote } from "../hooks/useCreateNote";
import { useCampaigns } from "features/user-management";
import { Loader2, AlertCircle, Book, Plus, Users, Search } from "lucide-react";
import { clsx } from "clsx";

/** Which slice of the campaign's notes the index is showing. */
type FilterMode = "all" | "unsaved" | "archived";

/** How the visible rows are ordered. */
type SortMode = "newest" | "oldest" | "edited";

/** Rows shown before the list collapses behind "Show all". */
const COLLAPSED_ROW_COUNT = 4;

/**
 * Notes for the active campaign: a search + filter + sort row, then the notes
 * themselves as rows in a single container.
 *
 * `All` means non-archived, so `All` and `Archived` are disjoint — archived
 * notes were previously in `notes` with no UI able to reach them at all, and
 * this is the first place `status: "archived"` becomes visible.
 */
const NotesList: React.FC = () => {
  const { notes, isLoading, error, saveNote } = useNotes();
  const { activeCampaignId, activeCampaign } = useCampaigns();
  const { createAndOpen } = useCreateNote();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [isExpanded, setIsExpanded] = useState(false);

  // Search narrows the pool the pills count over, so the counts stay live as
  // the reader types -- the same rule the chapters index follows.
  const searchedNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return notes;

    return notes.filter(note => {
      const title = displayTitle(note) ?? "";
      return (
        title.toLowerCase().includes(query) ||
        (note.content ?? "").toLowerCase().includes(query)
      );
    });
  }, [notes, searchQuery]);

  const counts = useMemo(() => {
    const active = searchedNotes.filter(note => note.status !== "archived");
    return {
      all: active.length,
      unsaved: active.filter(note => note.isUnsaved).length,
      archived: searchedNotes.filter(note => note.status === "archived").length,
    };
  }, [searchedNotes]);

  const visibleNotes = useMemo(() => {
    const filtered = searchedNotes.filter(note => {
      if (filterMode === "archived") return note.status === "archived";
      if (note.status === "archived") return false;
      if (filterMode === "unsaved") return !!note.isUnsaved;
      return true;
    });

    const timestamp = (note: Note) =>
      new Date(sortMode === "edited" ? note.updatedAt : note.dateAdded).getTime();

    return [...filtered].sort((a, b) => {
      // Unsaved notes pin to the top under every sort: they are the only rows
      // carrying an action the reader still owes the note.
      if (!!a.isUnsaved !== !!b.isUnsaved) return a.isUnsaved ? -1 : 1;
      return sortMode === "oldest" ? timestamp(a) - timestamp(b) : timestamp(b) - timestamp(a);
    });
  }, [searchedNotes, filterMode, sortMode]);

  const isCollapsed = !isExpanded && visibleNotes.length > COLLAPSED_ROW_COUNT;
  const shownNotes = isCollapsed ? visibleNotes.slice(0, COLLAPSED_ROW_COUNT) : visibleNotes;
  const hiddenCount = visibleNotes.length - shownNotes.length;

  const handleSaveNow = (noteId: string) => {
    saveNote(noteId).catch((saveError: unknown) => {
      console.error("Failed to save note:", saveError);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 mr-3 animate-spin primary" />
        <Typography color="secondary">Loading notes...</Typography>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 error-container">
        <AlertCircle className="w-6 h-6 mr-3 status-failed" />
        <Typography color="error">{error}</Typography>
      </div>
    );
  }

  if (!activeCampaignId) {
    return (
      <div className="notes-list">
        <div className="text-center py-10 px-6 border-2 border-dashed card-border rounded-lg">
          <Users className="w-6 h-6 mx-auto mb-3 typography-secondary" />
          <Typography variant="h4" className="mb-2">
            No Campaign Selected
          </Typography>
          <Typography color="secondary">
            Select a campaign to view and create notes.
          </Typography>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="notes-list">
        <div className="text-center py-10 px-6 border-2 border-dashed card-border rounded-lg">
          <Book className="w-6 h-6 mx-auto mb-3 typography-secondary" />
          <Typography variant="h4" className="mb-2">
            No notes for this campaign
          </Typography>
          <Typography color="secondary" className="mb-4">
            {activeCampaign ? (
              <>
                Create your first note for{" "}
                <span className="font-medium">{activeCampaign.name}</span> to start keeping track
                of what happened.
              </>
            ) : (
              "Create your first note to start keeping track of what happened."
            )}
          </Typography>
          <Button variant="primary" onClick={createAndOpen} className="create-note-button">
            <Plus className="w-5 h-5 mr-2" />
            Create Note
          </Button>
        </div>
      </div>
    );
  }

  const pills: Array<{ mode: FilterMode; label: string }> = [
    { mode: "all", label: `All ${counts.all}` },
    { mode: "unsaved", label: `Unsaved ${counts.unsaved}` },
    { mode: "archived", label: `Archived ${counts.archived}` },
  ];

  return (
    <div className="notes-list">
      {/* Control row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 typography-secondary pointer-events-none" />
          <input
            type="text"
            className="input w-full h-[38px] pl-9"
            placeholder="Search note titles and text"
            aria-label="Search note titles and text"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {pills.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              aria-pressed={filterMode === mode}
              onClick={() => {
                setFilterMode(mode);
                setIsExpanded(false);
              }}
              className={clsx(
                "h-[38px] px-3 rounded-full text-sm font-medium transition-colors",
                filterMode === mode ? "button button-primary" : "button button-outline"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          className="input h-[38px]"
          aria-label="Sort notes"
          value={sortMode}
          onChange={event => setSortMode(event.target.value as SortMode)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="edited">Recently edited</option>
        </select>
      </div>

      {/* Rows */}
      {visibleNotes.length === 0 ? (
        <div className="text-center py-10 px-6 border-2 border-dashed card-border rounded-lg">
          <Typography color="secondary">No notes match this filter.</Typography>
        </div>
      ) : (
        <>
          <div className="card rounded-xl overflow-hidden">
            {shownNotes.map((note, index) => (
              <div
                key={note.id}
                className={clsx(index > 0 && "border-t card-border mx-5")}
              >
                <div className={clsx(index > 0 && "-mx-5")}>
                  <NoteCard note={note} onSaveNow={handleSaveNow} />
                </div>
              </div>
            ))}
          </div>

          {isCollapsed && (
            <div className="flex items-center justify-between gap-4 mt-3 px-1">
              <Typography variant="body-sm" color="secondary">
                {hiddenCount} older {hiddenCount === 1 ? "note" : "notes"}
              </Typography>
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="text-sm font-medium primary hover:underline"
              >
                Show all
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotesList;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest --testPathPattern="NotesList" --maxWorkers=1 && npx tsc --noEmit
```

Expected: PASS, 22 tests. `tsc` clean.

If `renderedTitles()` in the sorting tests proves brittle against the row markup, adjust the **helper** to select rows accurately — do **not** weaken the ordering assertions themselves.

- [ ] **Step 5: Commit**

```bash
git add src/features/collaboration/notes/components/NotesList.tsx src/features/collaboration/notes/components/__tests__/NotesList.test.tsx
git commit -m "$(cat <<'EOF'
feat(notes): give the index a search, filter and sort row

Replaces the "Unsaved Notes"/"Saved Notes" headings and the card stack
with one row list, a live search over titles and content, All/Unsaved/
Archived pills whose counts follow the search, and a sort control.

All means non-archived, so archived notes are reachable for the first
time -- archiveNote and status: "archived" have existed in the context
with no UI able to reach either.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

### Task 7: `NotesPage` header

**Files:**
- Modify: `src/pages/notes/NotesPage.tsx` (full rewrite)
- Modify: `src/pages/notes/__tests__/NotesPage.test.tsx`

**Interfaces:**
- Consumes: `useCreateNote`, `useNotes` (for `isLoading` only), `useCampaigns`, `NotesList`.
- Produces: nothing other tasks consume.

**Keep exactly as-is:** the `isLoading` guard on the "no campaign selected" warning. The comment at the top of the current file explains it — `NoteContext` folds `useCampaignContextStatus().isResolving` into `isLoading`, and reading it here is what stops the warning flashing during auth restore (bug #1413). Preserve both the behaviour and the comment.

- [ ] **Step 1: Rewrite the test file**

Read `src/pages/notes/__tests__/NotesPage.test.tsx` first and **keep its existing mock scaffolding** (it mocks `NotesList`, `useNotes`, `useCampaigns`, `useNavigation`). Add a `useCreateNote` mock alongside them:

```tsx
jest.mock('@/features/collaboration', () => ({
  ...jest.requireActual('@/features/collaboration'),
  NotesList: () => <div data-testid="notes-list" />,
  useNotes: jest.fn(),
  useCreateNote: jest.fn(),
}));
```

Then replace the assertions with:

```tsx
describe('NotesPage', () => {
  test('should render the page heading', () => {
    setupMocks();
    render(<NotesPage />);
    expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
  });

  test('should name the campaign in the subtitle and say the notes are private', () => {
    setupMocks({ activeCampaign: { id: 'campaign-1', name: 'Phandelver' } });
    render(<NotesPage />);
    expect(
      screen.getByText('Your private notes for Phandelver. Only you can read them.')
    ).toBeInTheDocument();
  });

  test('should create a note from the header button', () => {
    setupMocks();
    render(<NotesPage />);

    fireEvent.click(screen.getByRole('button', { name: /new note/i }));

    expect(mockCreateAndOpen).toHaveBeenCalled();
  });

  test('should hide the create button without an active campaign', () => {
    setupMocks({ activeCampaignId: null });
    render(<NotesPage />);
    expect(screen.queryByRole('button', { name: /new note/i })).not.toBeInTheDocument();
  });

  test('should warn when no campaign is selected and loading has settled', () => {
    setupMocks({ activeCampaignId: null, isLoading: false });
    render(<NotesPage />);
    expect(screen.getByText(/no campaign selected/i)).toBeInTheDocument();
  });

  test('should NOT warn while still loading (bug #1413)', () => {
    setupMocks({ activeCampaignId: null, isLoading: true });
    render(<NotesPage />);
    expect(screen.queryByText(/no campaign selected/i)).not.toBeInTheDocument();
  });

  test('should render the notes list', () => {
    setupMocks();
    render(<NotesPage />);
    expect(screen.getByTestId('notes-list')).toBeInTheDocument();
  });
});
```

Extend the file's `setupMocks` so it accepts `isLoading` and wires
`(useCreateNote as jest.Mock).mockReturnValue({ createAndOpen: mockCreateAndOpen })`.

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testPathPattern="NotesPage" --maxWorkers=1
```

Expected: FAIL — heading reads "My Notes"; the subtitle text does not exist.

- [ ] **Step 3: Rewrite the component**

Replace `src/pages/notes/NotesPage.tsx` entirely:

```tsx
// src/pages/notes/NotesPage.tsx
import React from "react";
import Typography from "../../core/components/Typography";
import Button from "../../core/components/Button";
import { NotesList, useNotes, useCreateNote } from "features/collaboration";
import { useCampaigns } from "features/user-management";
import { Plus, AlertCircle } from "lucide-react";

/**
 * Notes index: the page header, then the list itself.
 *
 * `isLoading` is read purely to suppress the "no campaign selected" warning
 * while auth/campaign context is still being restored (bug #1413).
 * NoteContext already folds `useCampaignContextStatus().isResolving` into it,
 * so this needs no additional hook here — which also keeps NotesPage off the
 * `useAuth`/`useGroups` surface its test does not mock.
 */
const NotesPage: React.FC = () => {
  const { isLoading } = useNotes();
  const { activeCampaignId, activeCampaign } = useCampaigns();
  const { createAndOpen } = useCreateNote();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 notes-page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Typography variant="h2" className="typography-heading">
            Notes
          </Typography>

          {activeCampaign && (
            <Typography variant="body" color="secondary" className="mt-1">
              Your private notes for {activeCampaign.name}. Only you can read them.
            </Typography>
          )}

          {!isLoading && !activeCampaignId && (
            <div className="flex items-center mt-2 gap-2">
              <AlertCircle className="w-4 h-4 status-unknown" />
              <Typography variant="body-sm" color="secondary">
                No campaign selected - select a campaign to view and create notes
              </Typography>
            </div>
          )}
        </div>

        {activeCampaignId && (
          <Button
            onClick={createAndOpen}
            variant="primary"
            className="create-note-button"
            startIcon={<Plus className="w-5 h-5" />}
          >
            New note
          </Button>
        )}
      </div>

      <NotesList />
    </div>
  );
};

export default NotesPage;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest --testPathPattern="notes" --maxWorkers=1 && npx tsc --noEmit
```

Expected: PASS across `NotesPage`, `NotesList`, `NoteCard`. `tsc` clean.

- [ ] **Step 5: Confirm the dead string is gone from Track A's files**

```bash
grep -rn "New Note" src/pages/notes src/features/collaboration/notes || echo "clean"
```

Expected: `clean`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/notes/NotesPage.tsx src/pages/notes/__tests__/NotesPage.test.tsx
git commit -m "$(cat <<'EOF'
feat(notes): rebuild the index header around the campaign

Heading, a subtitle that names the campaign and states the notes are
private, and one primary New note action. Creation now goes through
useCreateNote rather than a second copy of the handler.

Keeps the isLoading guard on the no-campaign warning intact (#1413):
NoteContext folds campaign resolution into isLoading, and dropping the
guard makes the warning flash during auth restore.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

## TRACK B — The right rail

### Task 8: `NoteReferences` reads from context and matches on word boundaries

**Files:**
- Modify: `src/features/collaboration/notes/components/NoteReferences.tsx`
- Modify: `src/features/collaboration/notes/components/__tests__/NoteReferences.test.tsx`

**Interfaces:**
- Consumes: `matchesInText` from `../utils/entity-matching` (Task 2); `useNPCs`, `useLocations`, `useQuests`, `useRumors` from `features/campaign-entities`.
- Produces — **this is the interface Task 9 builds on**:
  ```ts
  export interface PotentialReference {
    id: string;
    type: EntityType;
    title: string;
    name?: string;
    matchingText: string[];
  }

  /** Matched campaign entities for a note, derived from context. */
  export function useNoteReferences(noteId: string): {
    references: PotentialReference[];
    isLoading: boolean;
  };

  /** Kept for EntityExtractor's entity-vs-entity equality checks. */
  export const normalizeTextForComparison: (text: string) => string;
  ```
  `NoteReferences` keeps its default export and current props so nothing breaks mid-phase; Task 9 stops rendering it.

**Two things being fixed:** `findReferences` fetched all four collections from `DocumentService` on **every note open**, and re-normalized the whole note body once per entity. Both go away — the collections come from context, and matching is a single pass per entity name against the raw text.

`useNPCs()` returns `{ npcs, isLoading, error, … }`; the others return `{ locations }`, `{ quests }`, `{ rumors }` respectively.

- [ ] **Step 1: Write the failing test**

Rewrite `src/features/collaboration/notes/components/__tests__/NoteReferences.test.tsx`. Replace the `DocumentService` mock with entity-context mocks:

```tsx
// src/features/collaboration/notes/components/__tests__/NoteReferences.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import NoteReferences from '../NoteReferences';
import { Note } from '../../types';

const mockNavigateToPage = jest.fn();
const mockGetNoteById = jest.fn();
const mockGetCollection = jest.fn();

jest.mock('../../context/NoteContext', () => ({ useNotes: jest.fn() }));
jest.mock('@/features/user-management', () => ({ useCampaigns: jest.fn() }));
jest.mock('@/features/campaign-entities', () => ({
  useNPCs: jest.fn(),
  useLocations: jest.fn(),
  useQuests: jest.fn(),
  useRumors: jest.fn(),
}));
jest.mock('shared/hooks/useNavigation', () => ({ useNavigation: jest.fn() }));
jest.mock('core/services/firebase/data/DocumentService', () => ({
  __esModule: true,
  default: { getInstance: () => ({ getCollection: mockGetCollection }) },
}));

const { useNotes } = require('../../context/NoteContext');
const { useCampaigns } = require('@/features/user-management');
const { useNPCs, useLocations, useQuests, useRumors } = require('@/features/campaign-entities');
const { useNavigation } = require('shared/hooks/useNavigation');

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Session',
    content: '',
    extractedEntities: [],
    status: 'active',
    tags: [],
    updatedAt: '2024-01-15T10:00:00.000Z',
    campaignId: 'campaign-1',
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function setupMocks({
  content = '',
  npcs = [] as any[],
  locations = [] as any[],
  quests = [] as any[],
  rumors = [] as any[],
  activeCampaignId = 'campaign-1' as string | null,
} = {}) {
  mockGetNoteById.mockReturnValue(makeNote({ content }));
  (useNotes as jest.Mock).mockReturnValue({ getNoteById: mockGetNoteById });
  (useCampaigns as jest.Mock).mockReturnValue({ activeCampaignId });
  (useNPCs as jest.Mock).mockReturnValue({ npcs, isLoading: false });
  (useLocations as jest.Mock).mockReturnValue({ locations, isLoading: false });
  (useQuests as jest.Mock).mockReturnValue({ quests, isLoading: false });
  (useRumors as jest.Mock).mockReturnValue({ rumors, isLoading: false });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    currentPath: '/notes/note-1',
  });
}

describe('NoteReferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should find an NPC named in the note', async () => {
    setupMocks({
      content: 'The party met Gundren Rockseeker at the inn.',
      npcs: [{ id: 'npc-1', name: 'Gundren Rockseeker' }],
    });

    render(<NoteReferences noteId="note-1" />);

    await waitFor(() => {
      expect(screen.getByText('Gundren Rockseeker')).toBeInTheDocument();
    });
  });

  test('should NOT fetch collections from DocumentService', async () => {
    setupMocks({
      content: 'The party met Gundren Rockseeker.',
      npcs: [{ id: 'npc-1', name: 'Gundren Rockseeker' }],
    });

    render(<NoteReferences noteId="note-1" />);

    await waitFor(() => {
      expect(screen.getByText('Gundren Rockseeker')).toBeInTheDocument();
    });
    // The whole point of the change: four network reads per note open, gone.
    expect(mockGetCollection).not.toHaveBeenCalled();
  });

  test('should not match an entity spanning a sentence boundary', async () => {
    setupMocks({
      content: 'We camped in the cave. Wave Echo starts tomorrow.',
      locations: [{ id: 'loc-1', name: 'Cave Wave Echo' }],
    });

    render(<NoteReferences noteId="note-1" />);

    await waitFor(() => {
      expect(screen.queryByText('Cave Wave Echo')).not.toBeInTheDocument();
    });
  });

  test('should not match a name inside a longer word', async () => {
    setupMocks({
      content: 'The caverns were flooded.',
      locations: [{ id: 'loc-1', name: 'Cave' }],
    });

    render(<NoteReferences noteId="note-1" />);

    await waitFor(() => {
      expect(screen.queryByText('Cave')).not.toBeInTheDocument();
    });
  });

  test('should report matches across all four entity types', async () => {
    setupMocks({
      content: 'Gundren went to Phandalin about the Lost Mine and the Black Spider.',
      npcs: [{ id: 'npc-1', name: 'Gundren' }],
      locations: [{ id: 'loc-1', name: 'Phandalin' }],
      quests: [{ id: 'quest-1', title: 'Lost Mine' }],
      rumors: [{ id: 'rumor-1', title: 'Black Spider' }],
    });

    render(<NoteReferences noteId="note-1" />);

    await waitFor(() => {
      expect(screen.getByText('Gundren')).toBeInTheDocument();
    });
    expect(screen.getByText('Phandalin')).toBeInTheDocument();
    expect(screen.getByText('Lost Mine')).toBeInTheDocument();
    expect(screen.getByText('Black Spider')).toBeInTheDocument();
  });

  test('should report no references for an empty note', async () => {
    setupMocks({ content: '', npcs: [{ id: 'npc-1', name: 'Gundren' }] });

    render(<NoteReferences noteId="note-1" />);

    await waitFor(() => {
      expect(screen.queryByText('Gundren')).not.toBeInTheDocument();
    });
  });

  test('should surface found references to its parent', async () => {
    const onReferencesFound = jest.fn();
    setupMocks({
      content: 'Gundren was here.',
      npcs: [{ id: 'npc-1', name: 'Gundren' }],
    });

    render(<NoteReferences noteId="note-1" onReferencesFound={onReferencesFound} />);

    await waitFor(() => {
      expect(onReferencesFound).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'npc-1', type: 'npc', title: 'Gundren' }),
      ]);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testPathPattern="NoteReferences" --maxWorkers=1
```

Expected: FAIL — the component still calls `DocumentService.getCollection`, and the sentence-boundary case still matches.

- [ ] **Step 3: Rewrite the reference-finding core**

In `src/features/collaboration/notes/components/NoteReferences.tsx`:

1. **Keep** the `PotentialReference` interface and the `normalizeTextForComparison` export exactly as they are — `EntityExtractor` imports both, and `normalizeTextForComparison` is still correct for entity-vs-entity equality.

2. **Replace** the imports of `DocumentService` with:

```tsx
import { useNPCs, useLocations, useQuests, useRumors } from "features/campaign-entities";
import { matchesInText } from "../utils/entity-matching";
```

3. **Replace** the whole `findReferences` async function and its `useEffect` with a memoized derivation, and extract it as a reusable hook above the component:

```tsx
/** One entity as the matcher sees it: an id, a type, and the names to test. */
interface MatchCandidate {
  id: string;
  type: EntityType;
  /** Preferred display label. */
  title: string;
  name?: string;
  /** Every string worth testing against the note, most specific first. */
  candidates: string[];
}

/**
 * Campaign entities that actually appear in a note's text.
 *
 * Reads the four collections from their contexts rather than issuing four
 * `DocumentService.getCollection` calls on every note open, and tests each
 * name once against the raw note body with `matchesInText`. The previous
 * implementation re-normalized the entire note once per entity and matched on
 * dash-joined text, which let a match run across a sentence boundary.
 */
export function useNoteReferences(noteId: string): {
  references: PotentialReference[];
  isLoading: boolean;
} {
  const { getNoteById } = useNotes();
  const { activeCampaignId } = useCampaigns();
  const { npcs, isLoading: npcsLoading } = useNPCs();
  const { locations, isLoading: locationsLoading } = useLocations();
  const { quests, isLoading: questsLoading } = useQuests();
  const { rumors, isLoading: rumorsLoading } = useRumors();

  const note = getNoteById(noteId);
  const noteContent = note?.content ?? "";

  const isLoading =
    !activeCampaignId || npcsLoading || locationsLoading || questsLoading || rumorsLoading;

  const references = useMemo<PotentialReference[]>(() => {
    if (!noteContent || !activeCampaignId) return [];

    const build = (
      items: Array<Record<string, any>>,
      type: EntityType,
      fallback: string
    ): MatchCandidate[] =>
      items.map(item => ({
        id: item.id,
        type,
        title: item.name || item.title || fallback,
        name: item.name,
        // Both fields are tested, de-duplicated, empties dropped.
        candidates: Array.from(
          new Set([item.name, item.title].filter((value): value is string => !!value))
        ),
      }));

    const all: MatchCandidate[] = [
      ...build(npcs as any[], "npc", "Unnamed NPC"),
      ...build(locations as any[], "location", "Unnamed Location"),
      ...build(quests as any[], "quest", "Unnamed Quest"),
      ...build(rumors as any[], "rumor", "Unnamed Rumor"),
    ];

    return all.reduce<PotentialReference[]>((found, entity) => {
      const matchingText = entity.candidates.filter(candidate =>
        matchesInText(noteContent, candidate)
      );

      if (matchingText.length > 0) {
        found.push({
          id: entity.id,
          type: entity.type,
          title: entity.title,
          name: entity.name,
          matchingText,
        });
      }

      return found;
    }, []);
  }, [noteContent, activeCampaignId, npcs, locations, quests, rumors]);

  return { references, isLoading };
}
```

4. Rewrite the `NoteReferences` component body to consume the hook, keeping `onReferencesFound` and `onSearchComplete` firing from a `useEffect` on `[references, isLoading]`, and keeping `navigateToEntity`, `getEntityTypeName` and `getEntityIcon` unchanged. Add `useMemo` to the React import and `EntityType` to the types import.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest --testPathPattern="NoteReferences" --maxWorkers=1 && npx tsc --noEmit
```

Expected: PASS, 7 tests. `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/collaboration/notes/components/NoteReferences.tsx src/features/collaboration/notes/components/__tests__/NoteReferences.test.tsx
git commit -m "$(cat <<'EOF'
perf(notes): derive note references from context, not four fetches

findReferences issued four DocumentService.getCollection calls on every
note open and re-normalized the whole note body once per entity.
useNoteReferences reads npcs, locations, quests and rumors from their
contexts and tests each name once against the raw text.

Matching moves to matchesInText, so a reference can no longer run
across a sentence boundary the way "in the cave. Wave Echo starts"
matched an entity named "Cave Wave Echo".

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

### Task 9: `CampaignLinksPanel` — the merged rail

**Files:**
- Create: `src/features/collaboration/notes/components/CampaignLinksPanel.tsx`
- Create: `src/features/collaboration/notes/components/__tests__/CampaignLinksPanel.test.tsx`
- Modify: `src/features/collaboration/entity-extraction/components/EntityExtractor.tsx`
- Modify: `src/features/collaboration/index.ts`

**Interfaces:**
- Consumes: `useNoteReferences` (Task 8), `EntityCard`, `useEntityExtractor`, `useNotes`, `useNavigation`, `matchesInText`.
- Produces:
  ```ts
  interface CampaignLinksPanelProps {
    noteId: string;
    /** Reads the live editor buffer so a scan sees unsaved text. */
    getCurrentEditorContent?: () => { title: string; content: string };
    /** Saves the editor before analysis; rejects to abort the scan (#1051). */
    saveCurrentEditorContent?: () => Promise<void>;
    /** Fired after an entity is converted, so the editor can refresh. */
    onEntityConverted?: (entityId: string, createdId: string) => void;
  }
  ```
  Exported from the barrel as `CampaignLinksPanel`.

**The behaviour that must survive:** save-before-analysis including the abort-on-failure path (bug #1051), the usage-limit-exceeded panel with its "Request Limit Increase" action, extraction errors, the in-progress state, entity deduplication, and filtering out detections that already exist in the campaign.

**The behaviour that must die:** the two separate card shells, the three-line "Click the search button to…" instruction block, the "No campaign elements found" paragraph, and the "No New Content Found" essay. **When both groups are empty, the panel renders its header and nothing else.**

- [ ] **Step 1: Write the failing test**

Create `src/features/collaboration/notes/components/__tests__/CampaignLinksPanel.test.tsx`:

```tsx
// src/features/collaboration/notes/components/__tests__/CampaignLinksPanel.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CampaignLinksPanel from '../CampaignLinksPanel';
import { Note } from '../../types';
import { PotentialReference } from '../NoteReferences';

const mockNavigateToPage = jest.fn();
const mockGetNoteById = jest.fn();
const mockUpdateNote = jest.fn();
const mockExtractWithOpenAI = jest.fn();
const mockUseNoteReferences = jest.fn();

jest.mock('../NoteReferences', () => ({
  __esModule: true,
  default: () => null,
  useNoteReferences: (...args: any[]) => mockUseNoteReferences(...args),
  normalizeTextForComparison: (text: string) =>
    text.toLowerCase().replace(/[.,!?;:\s]+/g, '-').replace(/^-+|-+$/g, ''),
}));

jest.mock('../../context/NoteContext', () => ({ useNotes: jest.fn() }));
jest.mock('shared/hooks/useNavigation', () => ({ useNavigation: jest.fn() }));
jest.mock('@/features/campaign-entities', () => ({
  useNPCs: jest.fn(() => ({ npcs: [], isLoading: false })),
  useLocations: jest.fn(() => ({ locations: [], isLoading: false })),
  useQuests: jest.fn(() => ({ quests: [], isLoading: false })),
  useRumors: jest.fn(() => ({ rumors: [], isLoading: false })),
}));
jest.mock('@/features/collaboration/entity-extraction/hooks/useEntityExtractor', () => ({
  useEntityExtractor: jest.fn(),
}));

const { useNotes } = require('../../context/NoteContext');
const { useNavigation } = require('shared/hooks/useNavigation');
const {
  useEntityExtractor,
} = require('@/features/collaboration/entity-extraction/hooks/useEntityExtractor');

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Session',
    content: 'x'.repeat(80),
    extractedEntities: [],
    status: 'active',
    tags: [],
    updatedAt: '2024-01-15T10:00:00.000Z',
    campaignId: 'campaign-1',
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function setupMocks({
  references = [] as PotentialReference[],
  note = makeNote(),
  isUsageLimitExceeded = false,
  isExtractionAvailable = true,
} = {}) {
  mockUseNoteReferences.mockReturnValue({ references, isLoading: false });
  mockGetNoteById.mockReturnValue(note);
  (useNotes as jest.Mock).mockReturnValue({
    getNoteById: mockGetNoteById,
    updateNote: mockUpdateNote,
  });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    currentPath: '/notes/note-1',
  });
  (useEntityExtractor as jest.Mock).mockReturnValue({
    extractWithOpenAI: mockExtractWithOpenAI,
    isExtracting: false,
    error: null,
    isUsageLimitExceeded,
    contactInfo: isUsageLimitExceeded
      ? { message: 'Limit reached', contactUrl: '/contact', prefilledSubject: 'More scans' }
      : null,
    isExtractionAvailable: () => isExtractionAvailable,
    refreshUsageStatus: jest.fn(),
  });
  mockUpdateNote.mockResolvedValue(undefined);
}

describe('CampaignLinksPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('empty', () => {
    test('should render only the header when there is nothing to show', () => {
      setupMocks();
      render(<CampaignLinksPanel noteId="note-1" />);

      expect(screen.getByText('Campaign links')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /scan note/i })).toBeInTheDocument();

      // The two empty-state essays this merge exists to delete.
      expect(screen.queryByText(/no campaign elements found/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/click the search button/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/no new content found/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Smart Detection')).not.toBeInTheDocument();
      expect(screen.queryByText('Campaign References Found')).not.toBeInTheDocument();
    });

    test('should not render either group label when both groups are empty', () => {
      setupMocks();
      render(<CampaignLinksPanel noteId="note-1" />);

      expect(screen.queryByText(/in your campaign/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/detected, not in your campaign/i)).not.toBeInTheDocument();
    });
  });

  describe('matched entities', () => {
    const references: PotentialReference[] = [
      { id: 'npc-1', type: 'npc', title: 'Gundren Rockseeker', matchingText: ['Gundren Rockseeker'] },
      { id: 'loc-1', type: 'location', title: 'Phandalin', matchingText: ['Phandalin'] },
    ];

    test('should list them under a counted group label', () => {
      setupMocks({ references });
      render(<CampaignLinksPanel noteId="note-1" />);

      expect(screen.getByText('IN YOUR CAMPAIGN · 2')).toBeInTheDocument();
      expect(screen.getByText('Gundren Rockseeker')).toBeInTheDocument();
      expect(screen.getByText('Phandalin')).toBeInTheDocument();
    });

    test('should show each entity type name', () => {
      setupMocks({ references });
      render(<CampaignLinksPanel noteId="note-1" />);

      expect(screen.getByText('NPC')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    test('should navigate to the entity when its row is clicked', () => {
      setupMocks({ references });
      render(<CampaignLinksPanel noteId="note-1" />);

      fireEvent.click(screen.getByText('Gundren Rockseeker'));

      expect(mockNavigateToPage).toHaveBeenCalledWith('/npcs?highlight=npc-1');
    });
  });

  describe('detections', () => {
    const detected = makeNote({
      extractedEntities: [
        {
          id: 'ent-1',
          text: 'Black Spider',
          type: 'npc',
          confidence: 0.91,
          isConverted: false,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
      ],
    });

    test('should list them under a counted warning group with confidence', () => {
      setupMocks({ note: detected });
      render(<CampaignLinksPanel noteId="note-1" />);

      expect(screen.getByText('DETECTED, NOT IN YOUR CAMPAIGN · 1')).toBeInTheDocument();
      expect(screen.getByText('Black Spider')).toBeInTheDocument();
      expect(screen.getByText('looks like an NPC · 91% confidence')).toBeInTheDocument();
    });

    test('should not list a detection that matches an existing reference', () => {
      setupMocks({
        note: detected,
        references: [
          { id: 'npc-9', type: 'npc', title: 'Black Spider', matchingText: ['Black Spider'] },
        ],
      });
      render(<CampaignLinksPanel noteId="note-1" />);

      expect(screen.queryByText(/detected, not in your campaign/i)).not.toBeInTheDocument();
    });

    test('should offer an Add action', () => {
      setupMocks({ note: detected });
      render(<CampaignLinksPanel noteId="note-1" />);

      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    });
  });

  describe('scanning', () => {
    test('should save the editor before extracting', async () => {
      setupMocks();
      const saveCurrentEditorContent = jest.fn().mockResolvedValue(undefined);
      const getCurrentEditorContent = jest
        .fn()
        .mockReturnValue({ title: '', content: 'y'.repeat(80) });
      mockExtractWithOpenAI.mockResolvedValue([]);

      render(
        <CampaignLinksPanel
          noteId="note-1"
          getCurrentEditorContent={getCurrentEditorContent}
          saveCurrentEditorContent={saveCurrentEditorContent}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /scan note/i }));

      await waitFor(() => {
        expect(saveCurrentEditorContent).toHaveBeenCalled();
      });
      expect(mockExtractWithOpenAI).toHaveBeenCalledWith('y'.repeat(80));
    });

    test('should abort the scan when the pre-save fails (bug #1051)', async () => {
      setupMocks();
      const saveCurrentEditorContent = jest.fn().mockRejectedValue(new Error('offline'));
      mockExtractWithOpenAI.mockResolvedValue([]);

      render(
        <CampaignLinksPanel noteId="note-1" saveCurrentEditorContent={saveCurrentEditorContent} />
      );

      fireEvent.click(screen.getByRole('button', { name: /scan note/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to save your work before analysis/i)).toBeInTheDocument();
      });
      expect(mockExtractWithOpenAI).not.toHaveBeenCalled();
    });

    test('should refuse to scan content that is too short', async () => {
      setupMocks({ note: makeNote({ content: 'too short' }) });

      render(<CampaignLinksPanel noteId="note-1" />);

      fireEvent.click(screen.getByRole('button', { name: /scan note/i }));

      await waitFor(() => {
        expect(screen.getByText(/too short for analysis/i)).toBeInTheDocument();
      });
      expect(mockExtractWithOpenAI).not.toHaveBeenCalled();
    });
  });

  describe('usage limits', () => {
    test('should surface the limit and a way to ask for more', () => {
      setupMocks({ isUsageLimitExceeded: true });
      render(<CampaignLinksPanel noteId="note-1" />);

      expect(screen.getByText(/usage limit reached/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /request limit increase/i })).toBeInTheDocument();
    });

    test('should disable scanning when extraction is unavailable', () => {
      setupMocks({ isExtractionAvailable: false });
      render(<CampaignLinksPanel noteId="note-1" />);

      expect(screen.getByRole('button', { name: /scan note/i })).toBeDisabled();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testPathPattern="CampaignLinksPanel" --maxWorkers=1
```

Expected: FAIL — `Cannot find module '../CampaignLinksPanel'`.

- [ ] **Step 3: Build the panel**

Create `src/features/collaboration/notes/components/CampaignLinksPanel.tsx`. Move the extraction machinery across from `EntityExtractor` verbatim — `deduplicateEntities`, `filterNewEntities`, `isEntityMatchingExistingReference`, `handleExtract`, `handleEntityConverted`, `handleContactForLimitIncrease` — with two changes:

- `filterNewEntities` reads `useNPCs()/useLocations()/useQuests()/useRumors()` instead of four `documentService.getCollection` calls, exactly as Task 8 did.
- References come from `useNoteReferences(noteId)` rather than a prop.

The render is:

```tsx
return (
  <div className="campaign-links card rounded-xl p-4">
    {/* Header — always rendered, even when both groups are empty */}
    <div className="flex items-center justify-between gap-3">
      <Typography variant="body" className="font-semibold">
        Campaign links
      </Typography>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExtract}
        disabled={isProcessing || !isExtractionAvailable()}
        startIcon={
          isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )
        }
      >
        Scan note
      </Button>
    </div>

    {isUsageLimitExceeded && contactInfo && (
      <div className="mt-4 p-3 rounded-lg border-l-4 status-failed">
        <Typography variant="body-sm" className="font-medium mb-1">
          Usage Limit Reached
        </Typography>
        <Typography variant="body-sm" color="secondary" className="mb-2">
          {contactInfo.message}
        </Typography>
        <Button
          variant="outline"
          size="sm"
          onClick={handleContactForLimitIncrease}
          endIcon={<ExternalLink className="w-4 h-4" />}
        >
          Request Limit Increase
        </Button>
      </div>
    )}

    {(error || hookError) && !isUsageLimitExceeded && (
      <div className="mt-4 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 status-failed flex-shrink-0" />
        <Typography variant="body-sm" color="error">
          {error || hookError}
        </Typography>
      </div>
    )}

    {/* Group 1 — matched */}
    {references.length > 0 && (
      <div className="mt-4">
        <Typography
          variant="caption"
          color="muted"
          className="text-[11px] uppercase tracking-wider"
        >
          {`IN YOUR CAMPAIGN · ${references.length}`}
        </Typography>
        <div className="mt-2 space-y-1">
          {references.map(reference => (
            <button
              key={`${reference.type}-${reference.id}`}
              type="button"
              onClick={() => navigateToEntity(reference)}
              className="dropdown-item w-full flex items-center gap-3 px-2 py-1.5 rounded text-left"
            >
              <span className="primary flex-shrink-0">{getEntityIcon(reference.type)}</span>
              <Typography variant="body-sm" className="flex-1 truncate">
                {reference.title}
              </Typography>
              <Typography variant="body-sm" color="secondary" className="flex-shrink-0">
                {getEntityTypeName(reference.type)}
              </Typography>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Group 2 — detected, not yet in the campaign */}
    {detections.length > 0 && (
      <div className="mt-4">
        <Typography
          variant="caption"
          className="text-[11px] uppercase tracking-wider status-unknown"
        >
          {`DETECTED, NOT IN YOUR CAMPAIGN · ${detections.length}`}
        </Typography>
        <div className="mt-2 space-y-2">
          {detections.map(entity => (
            <div
              key={entity.id}
              className="flex items-center gap-3 p-2 rounded bg-secondary"
            >
              <div className="min-w-0 flex-1">
                <Typography variant="body-sm" className="font-medium truncate">
                  {entity.text}
                </Typography>
                <Typography variant="caption" color="secondary">
                  {`looks like ${articleFor(entity.type)} ${getEntityTypeName(entity.type)} · ${Math.round(
                    entity.confidence * 100
                  )}% confidence`}
                </Typography>
              </div>
              <EntityCard
                entity={entity}
                noteId={noteId}
                onConverted={handleEntityConverted}
              />
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Footnote — only where it is relevant */}
    {(references.length > 0 || detections.length > 0) && (
      <Typography variant="caption" color="muted" className="block mt-4">
        Scanning saves your note first.
      </Typography>
    )}
  </div>
);
```

with the helper:

```tsx
/** "an NPC" reads correctly; "a location" does not take "an". */
function articleFor(type: EntityType): string {
  return type === "npc" ? "an" : "a";
}
```

**If `EntityCard` renders more than a compact `Add` button**, wrap or replace it with a plain
`<Button variant="primary" size="sm">Add</Button>` that calls the same `convertEntity` flow
`EntityCard` uses. Check `EntityCard.tsx` before deciding, and keep whichever produces an
accessible button named "Add".

- [ ] **Step 4: Strip `EntityExtractor` back**

`EntityExtractor` is still exported from the barrel and still has its own test. Reduce it to a thin
wrapper that renders `CampaignLinksPanel`, forwarding `noteId`, `getCurrentEditorContent`,
`saveCurrentEditorContent` and `onEntityConverted`, so its existing consumers and test keep working
without two copies of the extraction logic. Update
`src/features/collaboration/entity-extraction/components/__tests__/EntityExtractor.test.tsx` to
assert the wrapper delegates, rather than re-testing extraction internals.

- [ ] **Step 5: Add the barrel export**

In `src/features/collaboration/index.ts`, beside the other note component exports:

```ts
export { default as CampaignLinksPanel } from './notes/components/CampaignLinksPanel';
export { useNoteReferences } from './notes/components/NoteReferences';
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npx jest --testPathPattern="CampaignLinksPanel|EntityExtractor|NoteReferences" --maxWorkers=1 && npx tsc --noEmit
```

Expected: PASS. `tsc` clean.

- [ ] **Step 7: Commit**

```bash
git add src/features/collaboration/notes/components/CampaignLinksPanel.tsx src/features/collaboration/notes/components/__tests__/CampaignLinksPanel.test.tsx src/features/collaboration/entity-extraction/components/EntityExtractor.tsx src/features/collaboration/entity-extraction/components/__tests__/EntityExtractor.test.tsx src/features/collaboration/index.ts
git commit -m "$(cat <<'EOF'
feat(notes): merge Smart Detection and References into one panel

The rail was two stacked cards whose primary content was their own
empty state: three lines of instructions above a search button, and a
"Campaign References Found" heading above "No campaign elements
found".

Campaign links is one panel with two counted groups -- what the note
already links to, and what was detected but is not in the campaign yet.
With nothing to show it renders its header alone.

Keeps save-before-analysis including the abort-on-failure path (#1051),
the usage-limit panel, and detection filtering.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

### Task 10: `UsageMeter`

**Files:**
- Create: `src/features/collaboration/entity-extraction/components/UsageMeter.tsx`
- Create: `src/features/collaboration/entity-extraction/components/__tests__/UsageMeter.test.tsx`
- Modify: `src/features/collaboration/index.ts`

**Interfaces:**
- Consumes: `useUsageContext` from `../context/UsageContext`.
- Produces: `UsageMeter` (no props), exported from the barrel.

`FloatingUsageIndicator` puts a bare number and a coloured ring in the corner of the writing surface with no label at all. Same number, in a place where it has a name. **Do not delete `FloatingUsageIndicator`** — it stays exported and its test stays green; Task 13 simply stops rendering it.

`usageStatus.usage.monthly` is `{ count, limit }`. The **monthly** period is shown, per the mock's "this month".

- [ ] **Step 1: Write the failing test**

Create `src/features/collaboration/entity-extraction/components/__tests__/UsageMeter.test.tsx`:

```tsx
// src/features/collaboration/entity-extraction/components/__tests__/UsageMeter.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import UsageMeter from '../UsageMeter';

jest.mock('../../context/UsageContext', () => ({ useUsageContext: jest.fn() }));

const { useUsageContext } = require('../../context/UsageContext');

function setupUsage(monthly: { count: number; limit: number } | null, extra: any = {}) {
  (useUsageContext as jest.Mock).mockReturnValue({
    usageStatus: monthly
      ? {
          usage: {
            daily: { count: 1, limit: 5 },
            weekly: { count: 3, limit: 10 },
            monthly,
            isUnlimited: false,
            ...extra,
          },
          limitExceeded: false,
          nextReset: { daily: '', weekly: '', monthly: '' },
        }
      : null,
  });
}

describe('UsageMeter', () => {
  beforeEach(() => jest.clearAllMocks());

  test('should label the meter', () => {
    setupUsage({ count: 7, limit: 20 });
    render(<UsageMeter />);
    expect(screen.getByText('Smart detection')).toBeInTheDocument();
  });

  test('should state the monthly count against its limit', () => {
    setupUsage({ count: 7, limit: 20 });
    render(<UsageMeter />);
    expect(screen.getByText('7 of 20 scans used this month')).toBeInTheDocument();
  });

  test('should expose the meter as a progressbar with its value', () => {
    setupUsage({ count: 7, limit: 20 });
    render(<UsageMeter />);

    const meter = screen.getByRole('progressbar');
    expect(meter).toHaveAttribute('aria-valuenow', '7');
    expect(meter).toHaveAttribute('aria-valuemax', '20');
  });

  test('should not exceed 100% when the count passes the limit', () => {
    setupUsage({ count: 25, limit: 20 });
    render(<UsageMeter />);

    const fill = screen.getByTestId('usage-meter-fill');
    expect(fill).toHaveStyle({ width: '100%' });
  });

  test('should say so when usage is unlimited', () => {
    setupUsage({ count: 7, limit: 20 }, { isUnlimited: true });
    render(<UsageMeter />);
    expect(screen.getByText('Unlimited scans')).toBeInTheDocument();
  });

  test('should render nothing before usage data arrives', () => {
    setupUsage(null);
    const { container } = render(<UsageMeter />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testPathPattern="UsageMeter" --maxWorkers=1
```

Expected: FAIL — `Cannot find module '../UsageMeter'`.

- [ ] **Step 3: Write the component**

Create `src/features/collaboration/entity-extraction/components/UsageMeter.tsx`:

```tsx
// src/features/collaboration/entity-extraction/components/UsageMeter.tsx
import React from "react";
import Typography from "../../../../core/components/Typography";
import { useUsageContext } from "../context/UsageContext";

/**
 * Monthly Smart Detection usage, as a labelled row at the foot of the rail.
 *
 * Replaces FloatingUsageIndicator's placement on the note page: that put a
 * bare number and a coloured ring in the corner of the writing surface with
 * nothing naming what it counted. Same number, somewhere it has a label.
 *
 * The monthly period is the one shown — it is the window a reader plans
 * against, and the one the design names.
 */
const UsageMeter: React.FC = () => {
  const { usageStatus } = useUsageContext();

  // Nothing to say until usage has loaded. A skeleton here would be a second
  // unexplained shape in the corner, which is the problem being fixed.
  if (!usageStatus) return null;

  const { monthly, isUnlimited } = usageStatus.usage;
  const percentage = monthly.limit > 0
    ? Math.min((monthly.count / monthly.limit) * 100, 100)
    : 0;

  return (
    <div className="usage-meter card rounded-xl p-4">
      <Typography variant="body-sm" className="font-medium">
        Smart detection
      </Typography>

      {isUnlimited ? (
        <Typography variant="caption" color="secondary" className="block mt-0.5">
          Unlimited scans
        </Typography>
      ) : (
        <>
          <Typography variant="caption" color="secondary" className="block mt-0.5">
            {`${monthly.count} of ${monthly.limit} scans used this month`}
          </Typography>

          <div
            role="progressbar"
            aria-label="Smart detection scans used this month"
            aria-valuenow={monthly.count}
            aria-valuemin={0}
            aria-valuemax={monthly.limit}
            className="progress-container mt-2 h-1 rounded-full overflow-hidden"
          >
            <div
              data-testid="usage-meter-fill"
              className="progress-bar h-full rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default UsageMeter;
```

- [ ] **Step 4: Add the barrel export**

In `src/features/collaboration/index.ts`, beside `FloatingUsageIndicator`:

```ts
export { default as UsageMeter } from './entity-extraction/components/UsageMeter';
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx jest --testPathPattern="UsageMeter|FloatingUsageIndicator" --maxWorkers=1 && npx tsc --noEmit
```

Expected: PASS, 6 new tests; `FloatingUsageIndicator`'s existing tests still green. `tsc` clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/collaboration/entity-extraction/components/UsageMeter.tsx src/features/collaboration/entity-extraction/components/__tests__/UsageMeter.test.tsx src/features/collaboration/index.ts
git commit -m "$(cat <<'EOF'
feat(notes): give the scan counter a label

FloatingUsageIndicator put a bare number and a coloured ring in the
corner of the writing surface with nothing naming what it counted.
UsageMeter states the same monthly figure as "7 of 20 scans used this
month" at the foot of the rail, with a thin meter beside it.

FloatingUsageIndicator is left in place and still exported; only the
note page stops rendering it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

# PHASE 3 — The editor (1 Sonnet subagent, alone)

Runs only after Tasks 5–10 are merged and green. This is the only track that touches `NotePage.tsx`.

---

### Task 11: `NoteEditor` save correctness and derived title

**Files:**
- Modify: `src/features/collaboration/notes/components/NoteEditor.tsx`
- Modify: `src/features/collaboration/notes/components/__tests__/NoteEditor.test.tsx`

**Interfaces:**
- Consumes: `formatLastSaved` (Task 3), `deriveTitle` (Task 1).
- Produces: `NoteEditorRef` unchanged — `{ getCurrentContent, saveCurrentContent }`. `NoteEditorProps` **loses** `onExtractEntities`.

**Four defects fixed here:**

1. `getLastSavedText` → replaced by `formatLastSaved`.
2. The 45 s debounce fires 45 s after the user *stops* typing, so continuous writing never saves. **Shorten the debounce to 2 s and add a real 30 s interval save while dirty.** Clear the interval on unmount and whenever the note goes clean.
3. `MIN_CONTENT_LENGTH = 3` returns early with no state change, stranding a two-character note on "Unsaved changes". **Delete the constant and the guard.**
4. `onExtractEntities` is declared, destructured, and never called. **Delete the prop, its destructuring and its doc comment.**

**Title derivation:** track `hasExplicitTitle` in local state — `true` when the loaded note has a non-empty title, and set to `true` the first time the user types in the title field. While `false`, the saved and displayed title is `deriveTitle(content)`. **No new persisted field.**

**Keep:** `saveCurrentContent` re-throwing (bug #1051), the `triggerManualSave` catch wrapper and its `saveError` surface, and the Ctrl+S handler.

- [ ] **Step 1: Write the failing tests**

Add to `src/features/collaboration/notes/components/__tests__/NoteEditor.test.tsx`, keeping the file's existing mock scaffolding:

```tsx
describe('title derivation', () => {
  test('should save a title derived from the first content line', async () => {
    renderEditor({ note: makeNote({ title: '', content: '' }) });

    fireEvent.change(screen.getByPlaceholderText('Write your note here...'), {
      target: { value: 'Wave Echo Cave\nThe party met Gundren.' },
    });

    jest.advanceTimersByTime(2500);

    await waitFor(() => {
      expect(mockUpdateNote).toHaveBeenCalledWith(
        'note-1',
        expect.objectContaining({ title: 'Wave Echo Cave' })
      );
    });
  });

  test('should stop deriving once the user types a title', async () => {
    renderEditor({ note: makeNote({ title: '', content: 'First line' }) });

    fireEvent.change(screen.getByPlaceholderText('Untitled note'), {
      target: { value: 'My own title' },
    });
    fireEvent.change(screen.getByPlaceholderText('Write your note here...'), {
      target: { value: 'A different first line' },
    });

    jest.advanceTimersByTime(2500);

    await waitFor(() => {
      expect(mockUpdateNote).toHaveBeenCalledWith(
        'note-1',
        expect.objectContaining({ title: 'My own title' })
      );
    });
  });

  test('should hide the derivation hint once the title is explicit', () => {
    renderEditor({ note: makeNote({ title: 'Explicit', content: 'x' }) });
    expect(
      screen.queryByText('Taken from the first line. Click to write your own title.')
    ).not.toBeInTheDocument();
  });

  test('should show the derivation hint while the title is derived', () => {
    renderEditor({ note: makeNote({ title: '', content: 'First line' }) });
    expect(
      screen.getByText('Taken from the first line. Click to write your own title.')
    ).toBeInTheDocument();
  });
});

describe('autosave', () => {
  test('should save about two seconds after typing stops', async () => {
    renderEditor({ note: makeNote({ content: 'start' }) });

    fireEvent.change(screen.getByPlaceholderText('Write your note here...'), {
      target: { value: 'start and more' },
    });

    jest.advanceTimersByTime(1000);
    expect(mockUpdateNote).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1500);
    await waitFor(() => expect(mockUpdateNote).toHaveBeenCalled());
  });

  test('should save on an interval during continuous typing', async () => {
    renderEditor({ note: makeNote({ content: 'start' }) });
    const body = screen.getByPlaceholderText('Write your note here...');

    // Type without ever pausing long enough for the debounce to fire.
    for (let tick = 0; tick < 20; tick += 1) {
      fireEvent.change(body, { target: { value: `start ${'x'.repeat(tick)}` } });
      jest.advanceTimersByTime(1800);
    }

    await waitFor(() => expect(mockUpdateNote).toHaveBeenCalled());
  });

  test('should save a note shorter than three characters', async () => {
    renderEditor({ note: makeNote({ content: '' }) });

    fireEvent.change(screen.getByPlaceholderText('Write your note here...'), {
      target: { value: 'ab' },
    });

    jest.advanceTimersByTime(2500);

    // MIN_CONTENT_LENGTH used to return early with no state change, leaving
    // a two-character note reading "Unsaved changes" forever.
    await waitFor(() => {
      expect(mockUpdateNote).toHaveBeenCalledWith(
        'note-1',
        expect.objectContaining({ content: 'ab' })
      );
    });
  });
});

describe('save status', () => {
  test('should state the save status exactly once', () => {
    renderEditor({ note: makeNote({ isUnsaved: false, dateModified: new Date().toISOString() }) });

    expect(screen.queryByText(/autosave every/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/remember to save your work/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/saved/i)).toHaveLength(1);
  });

  test('should not claim an hour count for an old note', () => {
    const longAgo = new Date('2024-01-01T00:00:00.000Z').toISOString();
    renderEditor({ note: makeNote({ isUnsaved: false, dateModified: longAgo }) });

    expect(screen.queryByText(/\d{3,}h ago/)).not.toBeInTheDocument();
  });

  test('should count words', () => {
    renderEditor({ note: makeNote({ content: 'one two three four five' }) });
    expect(screen.getByText(/5 words/)).toBeInTheDocument();
  });
});

describe('removed API', () => {
  test('should not accept an onExtractEntities prop', () => {
    // Compile-time contract; asserted here so the deletion is recorded.
    const props = Object.keys({ noteId: '', readOnly: false, onSave: () => undefined });
    expect(props).not.toContain('onExtractEntities');
  });
});
```

Add `jest.useFakeTimers()` in `beforeEach` and `jest.useRealTimers()` in `afterEach` if the file does not already do so, and add a `renderEditor` helper if one does not exist.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx jest --testPathPattern="NoteEditor" --maxWorkers=1
```

Expected: FAIL — no derivation hint, 45 s debounce, `MIN_CONTENT_LENGTH` guard still present.

- [ ] **Step 3: Apply the changes to `NoteEditor.tsx`**

```tsx
// Imports
import { deriveTitle } from "../utils/note-title";
import { formatLastSaved } from "../utils/save-status";

// Timing
/** Idle delay before an autosave fires. Short enough that a pause in real
 *  prose reaches the server; the interval below covers continuous writing. */
const AUTOSAVE_DEBOUNCE_MS = 2000;
/** True interval save while the note is dirty. The debounce alone fires only
 *  after typing STOPS, so a writer who never pauses was never saved -- while
 *  the editor claimed "Autosave every 45s". */
const AUTOSAVE_INTERVAL_MS = 30000;
// MIN_CONTENT_LENGTH is deleted: it returned early with no state change, so a
// two-character note read "Unsaved changes" indefinitely with no explanation.

// State
const [hasExplicitTitle, setHasExplicitTitle] = useState(false);

// On load
setHasExplicitTitle(!!noteData.title?.trim());

// The title actually written
const effectiveTitle = hasExplicitTitle ? title : deriveTitle(content);

// Title change handler
const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setHasExplicitTitle(true);
  // ...existing body, minus the MIN_CONTENT_LENGTH concern
};

// Interval save
useEffect(() => {
  if (readOnly || !hasUnsavedChanges || !note) return;
  const id = window.setInterval(() => {
    triggerManualSave();
  }, AUTOSAVE_INTERVAL_MS);
  return () => window.clearInterval(id);
}, [readOnly, hasUnsavedChanges, note, triggerManualSave]);

// Status text
const lastSavedText = lastSaved ? formatLastSaved(lastSaved) : "Not saved yet";

// Word count
const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
```

Delete `onExtractEntities` from `NoteEditorProps`, from the destructuring, and its doc comment.
Delete `getLastSavedText` entirely. Ensure every save path writes `effectiveTitle`, not `title`.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx jest --testPathPattern="NoteEditor" --maxWorkers=1 && npx tsc --noEmit
```

Expected: PASS. `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/collaboration/notes/components/NoteEditor.tsx src/features/collaboration/notes/components/__tests__/NoteEditor.test.tsx
git commit -m "$(cat <<'EOF'
fix(notes): make the editor's save behaviour match what it claims

The caption said "Autosave every 45s" while debounce(45000) fired only
45 seconds after typing STOPPED -- so a writer who never paused was
never saved at all. The debounce drops to 2s and a real 30s interval
runs while the note is dirty.

Also deletes MIN_CONTENT_LENGTH, which returned early with no state
change and stranded a two-character note on "Unsaved changes"; routes
the save status through formatLastSaved so it has a day unit; and
removes onExtractEntities, declared and destructured but never called.

Titles now derive from the first content line until the user types one.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

### Task 12: `NoteEditor` as a writing surface

**Files:**
- Modify: `src/features/collaboration/notes/components/NoteEditor.tsx` (render only)
- Modify: `src/features/collaboration/notes/components/__tests__/NoteEditor.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  interface NoteEditorProps {
    noteId: string;
    readOnly?: boolean;
    onSave?: () => void;
    /** Rendered in the surface's own top bar, left of Archive/Delete. */
    onBack?: () => void;
    onArchive?: () => void;
    onDelete?: () => void;
  }
  ```

**What must be gone:** `<Typography variant="h3">Title</Typography>`, `<Typography variant="h3">Content</Typography>`, `font-mono`, `rows={30}`, the `Autosave every {n}s` caption, `Remember to save your work!`, and the standalone `Save (Ctrl+S)` button row. Save state is stated **once**, in the footer bar.

**Underlines are not implemented.** Do not attempt an overlay. This is recorded in the spec and must appear in the PR description.

- [ ] **Step 1: Write the failing tests**

Add to the `NoteEditor` test file:

```tsx
describe('writing surface', () => {
  test('should not render field headings', () => {
    renderEditor({ note: makeNote() });
    expect(screen.queryByRole('heading', { name: 'Title' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Content' })).not.toBeInTheDocument();
  });

  test('should not render the body in a monospace face', () => {
    renderEditor({ note: makeNote() });
    expect(screen.getByPlaceholderText('Write your note here...')).not.toHaveClass('font-mono');
  });

  test('should not pin the body to thirty rows', () => {
    renderEditor({ note: makeNote() });
    expect(screen.getByPlaceholderText('Write your note here...')).not.toHaveAttribute('rows', '30');
  });

  test('should place the title placeholder as "Untitled note"', () => {
    renderEditor({ note: makeNote({ title: '' }) });
    expect(screen.getByPlaceholderText('Untitled note')).toBeInTheDocument();
  });

  test('should offer back, archive and delete in the top bar', () => {
    const onBack = jest.fn();
    const onArchive = jest.fn();
    const onDelete = jest.fn();
    renderEditor({ note: makeNote(), props: { onBack, onArchive, onDelete } });

    fireEvent.click(screen.getByRole('button', { name: /all notes/i }));
    expect(onBack).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /archive/i }));
    expect(onArchive).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalled();
  });

  test('should state the save mechanism honestly in the footer', () => {
    renderEditor({ note: makeNote({ isUnsaved: false, dateModified: new Date().toISOString() }) });
    expect(screen.getByText(/saves as you write/i)).toBeInTheDocument();
  });

  test('should show the word count and the save shortcut', () => {
    renderEditor({ note: makeNote({ content: 'one two three' }) });
    expect(screen.getByText(/3 words/)).toBeInTheDocument();
    expect(screen.getByText(/to save now/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx jest --testPathPattern="NoteEditor" --maxWorkers=1
```

Expected: FAIL — the headings and `font-mono` are still present.

- [ ] **Step 3: Replace the render**

Replace `NoteEditor`'s returned JSX with:

```tsx
return (
  <div className="note-editor card rounded-xl flex flex-col min-h-[70vh]">
    {/* Top bar */}
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b card-border text-[13px]">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 typography-secondary hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        All notes
      </button>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onArchive}
          disabled={readOnly}
          className="flex items-center gap-1.5 typography-secondary hover:underline disabled:opacity-50"
        >
          <Archive className="w-4 h-4" />
          Archive
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={readOnly}
          className="flex items-center gap-1.5 typography-error hover:underline disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>

    {/* The writing itself */}
    <div className="flex-1 flex flex-col px-8 py-6">
      <input
        value={hasExplicitTitle ? title : deriveTitle(content)}
        onChange={handleTitleChange}
        placeholder="Untitled note"
        disabled={readOnly}
        aria-label="Note title"
        className="note-title w-full bg-transparent border-none outline-none typography-heading text-[30px] font-medium placeholder:opacity-40"
      />

      {!hasExplicitTitle && (
        <Typography variant="caption" color="muted" className="mt-1 text-xs">
          Taken from the first line. Click to write your own title.
        </Typography>
      )}

      <textarea
        ref={bodyRef}
        value={content}
        onChange={handleContentChange}
        placeholder="Write your note here..."
        disabled={readOnly}
        aria-label="Note content"
        className="note-textarea flex-1 w-full mt-5 bg-transparent border-none outline-none resize-none text-[17px] leading-[1.65] placeholder:opacity-40"
        style={{ minHeight: "40vh" }}
      />
    </div>

    {/* Footer: save state stated once, and only once */}
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t card-border bg-secondary text-[13px]">
      {getStatusIndicator()}
      <Typography variant="body-sm" color="secondary" className="text-[13px]">
        {`${wordCount.toLocaleString()} ${wordCount === 1 ? "word" : "words"} · Ctrl+S to save now`}
      </Typography>
    </div>
  </div>
);
```

Rewrite `getStatusIndicator` so its clean branch reads:

```tsx
return (
  <div className="flex items-center gap-2">
    <Check className="w-4 h-4 status-completed" />
    <Typography variant="body-sm" color="secondary" className="text-[13px]">
      {`${lastSavedText} · saves as you write`}
    </Typography>
  </div>
);
```

Add the auto-grow effect, and import `ArrowLeft`, `Archive`, `Trash2`, `Check` from `lucide-react`:

```tsx
const bodyRef = useRef<HTMLTextAreaElement>(null);

// Grow the body to fit its content instead of sitting at a fixed 30 rows.
useEffect(() => {
  const element = bodyRef.current;
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}, [content]);
```

Delete the old status-bar block: the `Save (Ctrl+S)` button, the `Autosave every {n}s` caption and the `Remember to save your work!` line. Ctrl+S still works via the existing keydown handler.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx jest --testPathPattern="NoteEditor" --maxWorkers=1 && npx tsc --noEmit
```

Expected: PASS. `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/collaboration/notes/components/NoteEditor.tsx src/features/collaboration/notes/components/__tests__/NoteEditor.test.tsx
git commit -m "$(cat <<'EOF'
feat(notes): make the note editor a writing surface

"Title" and "Content" were h3 headings -- the largest text on a page
whose purpose is the user's own prose -- above an input and thirty
fixed rows of monospace. Both headings are gone, the body is the
reading face at 17px/1.65 and grows to fit, and the title input is
styled as the page's h1.

Save state now appears exactly once, in a footer bar beside the word
count, replacing the status line, the italic autosave caption, the
"Remember to save your work!" nag and the separate save button.

Detected-name underlines are deliberately not implemented; a plain
textarea cannot render styled runs, and the rail already names every
match and detection.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

### Task 13: `NotePage` layout and delete confirmation

**Files:**
- Modify: `src/pages/notes/NotePage.tsx`
- Modify: `src/pages/notes/__tests__/NotePage.test.tsx`

**Interfaces:**
- Consumes: `NoteEditor` (Tasks 11–12, with `onBack`/`onArchive`/`onDelete`), `CampaignLinksPanel` (Task 9), `UsageMeter` (Task 10), `Dialog` from `core/components/Dialog`.

**Preserve exactly:** the cross-campaign fetch effect including the `crossCampaignNotFound` guard that fixes the infinite re-fetch loop (bug #800), the cross-campaign warning banner, the read-only treatment for cross-campaign notes, the not-found state and the loading state.

**The bug being fixed:** `handleDeleteNote` deletes and navigates away instantly, while leaving a group and deleting an account both get a full confirm dialog.

**Also:** stop rendering `FloatingUsageIndicator`. Do not delete the component.

The banner's `status-warning` class is one of the three phantom classes — change it to `status-unknown` while you are in the file.

- [ ] **Step 1: Write the failing tests**

Add to `src/pages/notes/__tests__/NotePage.test.tsx`:

```tsx
describe('delete confirmation', () => {
  test('should not delete on the first click', () => {
    setupMocks();
    render(<NotePage />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(mockDeleteNote).not.toHaveBeenCalled();
    expect(mockNavigateToPage).not.toHaveBeenCalledWith('/notes');
  });

  test('should ask before deleting', () => {
    setupMocks();
    render(<NotePage />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(screen.getByText(/delete this note/i)).toBeInTheDocument();
  });

  test('should delete once confirmed', async () => {
    setupMocks();
    render(<NotePage />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete note/i }));

    await waitFor(() => expect(mockDeleteNote).toHaveBeenCalledWith('note-1'));
  });

  test('should leave the note alone when the dialog is cancelled', () => {
    setupMocks();
    render(<NotePage />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockDeleteNote).not.toHaveBeenCalled();
  });
});

describe('layout', () => {
  test('should render the merged campaign links panel', () => {
    setupMocks();
    render(<NotePage />);
    expect(screen.getByTestId('campaign-links-panel')).toBeInTheDocument();
  });

  test('should render the labelled usage meter', () => {
    setupMocks();
    render(<NotePage />);
    expect(screen.getByTestId('usage-meter')).toBeInTheDocument();
  });

  test('should NOT render the floating usage indicator', () => {
    setupMocks();
    render(<NotePage />);
    expect(screen.queryByTestId('floating-usage-indicator')).not.toBeInTheDocument();
  });

  test('should archive from the editor top bar', async () => {
    setupMocks();
    render(<NotePage />);

    fireEvent.click(screen.getByRole('button', { name: /archive/i }));

    await waitFor(() => expect(mockArchiveNote).toHaveBeenCalledWith('note-1'));
  });
});
```

Mock the three components with `data-testid` stubs, and make the `NoteEditor` stub render buttons that invoke its `onArchive`/`onDelete`/`onBack` props so the wiring is genuinely exercised:

```tsx
jest.mock('@/features/collaboration', () => ({
  ...jest.requireActual('@/features/collaboration'),
  useNotes: jest.fn(),
  NoteEditor: React.forwardRef((props: any, _ref: any) => (
    <div data-testid="note-editor">
      <button onClick={props.onBack}>All notes</button>
      <button onClick={props.onArchive}>Archive</button>
      <button onClick={props.onDelete}>Delete</button>
    </div>
  )),
  CampaignLinksPanel: () => <div data-testid="campaign-links-panel" />,
  UsageMeter: () => <div data-testid="usage-meter" />,
  FloatingUsageIndicator: () => <div data-testid="floating-usage-indicator" />,
}));
```

Add `archiveNote: mockArchiveNote` to the `useNotes` mock return value.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx jest --testPathPattern="NotePage" --maxWorkers=1
```

Expected: FAIL — delete fires immediately; there is no dialog; `FloatingUsageIndicator` is still rendered.

- [ ] **Step 3: Apply the changes**

In `NotePage.tsx`:

```tsx
// Imports
import Dialog from "core/components/Dialog";
import { useNotes, NoteEditor, NoteEditorRef, CampaignLinksPanel, UsageMeter, Note } from "features/collaboration";
// FloatingUsageIndicator and NoteReferences are no longer imported here.

// State
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);

// Handlers
const { deleteNote, getNoteById, archiveNote } = useNotes();

const handleArchiveNote = async () => {
  try {
    await archiveNote(noteId);
    navigateToPage("/notes");
  } catch (error) {
    console.error("Failed to archive note:", error);
  }
};

/**
 * Deleting a note is irreversible and used to happen on a single click,
 * while leaving a group and deleting an account both ask first.
 */
const handleConfirmDelete = async () => {
  setIsDeleting(true);
  try {
    await deleteNote(noteId);
    navigateToPage("/notes");
  } catch (error) {
    console.error("Failed to delete note:", error);
  } finally {
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
  }
};
```

Replace the page-level header row and the `md:grid-cols-3` grid with:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
  <NoteEditor
    ref={noteEditorRef}
    noteId={noteId}
    onSave={refreshReferences}
    readOnly={isFromDifferentCampaign}
    onBack={handleBackClick}
    onArchive={handleArchiveNote}
    onDelete={() => setIsDeleteDialogOpen(true)}
  />

  <div className="space-y-4">
    {!isFromDifferentCampaign && (
      <CampaignLinksPanel
        noteId={noteId}
        onEntityConverted={refreshReferences}
        getCurrentEditorContent={getCurrentEditorContent}
        saveCurrentEditorContent={saveCurrentEditorContent}
      />
    )}
    <UsageMeter />
  </div>
</div>

<Dialog
  open={isDeleteDialogOpen}
  onClose={() => setIsDeleteDialogOpen(false)}
  title="Delete this note?"
>
  <Typography color="secondary" className="mb-4">
    This permanently removes the note and everything in it. This cannot be undone.
  </Typography>
  <div className="flex justify-end gap-3">
    <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleConfirmDelete} disabled={isDeleting}>
      Delete note
    </Button>
  </div>
</Dialog>
```

Delete the `<FloatingUsageIndicator />` render, the `<NoteReferences />` render, the
`foundReferences` / `referencesSearchComplete` state and their handlers — `CampaignLinksPanel`
owns reference finding now. Keep `referenceUpdateTrigger`/`refreshReferences` only if something
still consumes them; otherwise delete those too. Change the banner's `status-warning` to
`status-unknown`.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx jest --testPathPattern="NotePage" --maxWorkers=1 && npx tsc --noEmit
```

Expected: PASS. `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/pages/notes/NotePage.tsx src/pages/notes/__tests__/NotePage.test.tsx
git commit -m "$(cat <<'EOF'
fix(notes): ask before deleting a note, and rebuild the page layout

handleDeleteNote deleted and navigated away on a single click, while
leaving a group and deleting an account both get a confirm dialog.
Deleting a note now asks first, using the same Dialog.

The page becomes a 1fr/320px grid: the writing surface owns its own
back, archive and delete actions, and the rail is the merged Campaign
links panel above a labelled usage meter. The unlabelled floating "0"
is no longer rendered here.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018q6ZmutUhSJ8cAi3aEMJ9a
EOF
)"
```

---

# PHASE 4 — Verification

### Task 14: Full verification and PR

**Files:** none modified unless a gate fails.

- [ ] **Step 1: Confirm the dead string is gone**

```bash
grep -rn "New Note" src/ || echo "clean"
```

Expected: `clean`. If anything matches, fix it — this is a Definition-of-Done item.

- [ ] **Step 2: Confirm no phantom theme classes were introduced**

```bash
grep -rn "status-warning\|status-archived\|status-success" src/pages/notes src/features/collaboration || echo "clean"
```

Expected: `clean` for the notes surface. Hits elsewhere in the repo are pre-existing and out of scope.

- [ ] **Step 3: Confirm no alias imports shipped**

```bash
grep -rn "from ['\"]@/" src/pages/notes src/features/collaboration --include=*.tsx --include=*.ts | grep -v "__tests__" || echo "clean"
```

Expected: `clean`. Any hit fails `npm run build` even though `tsc` and jest pass.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Full test suite**

```bash
npx jest --silent 2>&1 | tail -6
```

Expected: **0 failed**, 2 skipped. Suite count ≥ 197 (192 baseline + note-title, entity-matching, save-status, useCreateNote, CampaignLinksPanel, UsageMeter). Compare against the recorded baseline of `192 suites, 4367 passed, 2 skipped, 0 failed`. **Any failure is a regression** — do not proceed.

- [ ] **Step 6: Production build**

```bash
npm run build
```

Expected: `Compiled successfully`. This gate is **not** implied by the two above: webpack honours tsconfig `baseUrl` but ignores `paths`, so an `@/…` import passes `tsc` and jest and fails only here.

- [ ] **Step 7: Manual check in the running app**

```bash
.\scripts\start-dev.ps1 -Action start
```

Walk the Definition of Done in all three themes (light, dark, medieval):
1. Create a note → it is untitled, not "New Note".
2. Type a first line → the index row and the editor title both show it.
3. Search, then each of the three filter pills; confirm the counts move with the search.
4. Archive a note → it leaves `All` and appears under `Archived`.
5. Sort all three ways; confirm an unsaved note stays pinned to the top.
6. Delete a note → the dialog appears; cancel leaves it; confirm removes it.
7. Confirm the footer states the save status once and no floating `0` remains.

- [ ] **Step 8: Report**

Report to the user with: the final suite numbers against the baseline, the build result, what was verified in the browser, and — explicitly — that **the detected-name underlines were not implemented**, with the reason, so it lands in the PR description.

Do **not** push or open a PR unless asked.

---

## Self-Review

**Spec coverage** — every section maps to a task:

| Spec § | Task |
| --- | --- |
| §4.1 note-title | 1 |
| §4.2 entity-matching | 2 |
| §6.4.1 save-status | 3 |
| §4.3 useCreateNote + barrel | 4 |
| §5.2 rows, chips, preview, unsaved | 5 |
| §5.2 control row, filters, sort, Show all | 6 |
| §5.1 page header | 7 |
| §7.1 perf + word-boundary matching | 8 |
| §7 merged panel | 9 |
| §8 usage meter | 10 |
| §6.3 derived title, §6.4.1–3 save correctness, §6.5 dead prop | 11 |
| §6.1–6.2 writing surface | 12 |
| §6.1 layout, §6.4.4 delete confirm, §8 drop floating indicator | 13 |
| §9 gates, §11 Definition of Done | 14 |

**Type consistency checked:** `deriveTitle`/`displayTitle`/`MAX_DERIVED_TITLE_LENGTH` (Task 1) are consumed under the same names in Tasks 5, 6, 11, 12. `matchesInText` (Task 2) in Tasks 8, 9. `formatLastSaved` (Task 3) in Task 11. `useCreateNote().createAndOpen` (Task 4) in Tasks 6, 7. `useNoteReferences` (Task 8) in Task 9. `CampaignLinksPanel` and `UsageMeter` prop names match between Tasks 9/10 and Task 13. `NoteCard`'s `onSaveNow` matches between Tasks 5 and 6. `NoteEditor`'s `onBack`/`onArchive`/`onDelete` match between Tasks 12 and 13.

**Known judgement point for the implementer:** Task 9 Step 3 leaves the `EntityCard`-vs-plain-`Add`-button choice open, because it depends on what `EntityCard` renders — read that file before deciding. The requirement is fixed: an accessible button named "Add" running the existing convert flow.
