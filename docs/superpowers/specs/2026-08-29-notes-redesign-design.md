# Notes: index and editor redesign

**Date:** 2026-08-29
**Branch:** `redesign/notes`, cut from `main` at `78e2792` (the story-section merge)
**Design reference:** mock `4a` — notes index, then the note editor with its right rail
**Status:** approved, pending implementation plan

---

## 1. Purpose

The Notes section has three problems that compound each other.

Notes are all called "New Note", because `createNote("New Note", "")` is the only thing that
ever sets a title and nothing renames it afterwards. The index is therefore a stack of
identically-labelled cards, and no amount of restyling fixes that.

The editor is a form. `<h3>Title</h3>` and `<h3>Content</h3>` are the largest text on a page
whose entire purpose is the user's own prose, and the body is 30 fixed rows of `font-mono`.
Save state is stated three times, one of those statements is wrong past 24 hours
(`Saved 10870h ago`), and another describes a mechanism that does not exist.

The right rail is two cards whose primary content is their own empty state — Smart Detection
renders three lines of instructions, and Campaign References renders a heading above
"No campaign elements found".

This redesign fixes all three. It reads only data the app already stores: **no change to the
`Note` type, no new Firestore fields.**

## 2. Scope

**In scope**

```
src/pages/notes/NotesPage.tsx
src/pages/notes/NotePage.tsx
src/features/collaboration/notes/components/NotesList.tsx
src/features/collaboration/notes/components/NoteCard.tsx
src/features/collaboration/notes/components/NoteEditor.tsx
src/features/collaboration/notes/components/NoteReferences.tsx
src/features/collaboration/entity-extraction/components/EntityExtractor.tsx
src/features/collaboration/index.ts                          (barrel additions)
```

New files:

```
src/features/collaboration/notes/utils/note-title.ts
src/features/collaboration/notes/utils/entity-matching.ts
src/features/collaboration/notes/hooks/useCreateNote.ts
src/features/collaboration/notes/components/CampaignLinksPanel.tsx
src/features/collaboration/entity-extraction/components/UsageMeter.tsx
```

`src/features/collaboration/notes/context/NoteContext.tsx` is **read-only**. Every capability
the redesign needs — `archiveNote`, `status: "archived"`, `dateAdded`, `updatedAt` — already
exists there.

**Out of scope:** rich-text editing, markdown rendering, note sharing, tag management UI beyond
displaying chips, anything in the Story section.

## 3. Colour and type

Structure, hierarchy, spacing and copy come from the mock. **Colour comes from the theme.**
No hex values from the mock appear in the code. Use the existing tokens in
`src/core/themes/definitions/{lightTheme,darkTheme,medievalTheme}.ts` and the existing utility
classes: `card`, `input`, `dropdown-item`, `status-*`, `typography-*`, `typography-heading`,
`primary`, `bg-secondary`.

Nothing may be styled so that it only works in one theme. The page header follows the pattern
the story redesign established on this same `main`:

```tsx
<Typography variant="h2" className="typography-heading">Notes</Typography>
```

Filter pills follow the story page's `<button type="button" aria-pressed={…}>` +
`rounded-full` idiom, and the search field uses the existing `input` class.

---

## 4. Foundation

### 4.1 `notes/utils/note-title.ts`

Pure functions, no React, no Firestore.

```ts
/** First non-empty line of `content`, trimmed, capped at 80 chars on a word
 *  boundary with no ellipsis. Returns "" when there is no such line. */
export function deriveTitle(content: string): string;

/** The title to show for a note: its explicit title if it has one, else the
 *  title derived from its content, else null — the caller renders
 *  "Untitled note" in muted colour for null. */
export function displayTitle(note: Pick<Note, "title" | "content">): string | null;
```

`deriveTitle` cuts at the last word boundary at or before 80 characters. A single word longer
than 80 characters is hard-cut at 80. No ellipsis is ever added to the **stored** value; the
index adds visual truncation with CSS.

### 4.2 `notes/utils/entity-matching.ts`

```ts
/** True when `candidate` occurs in `noteText` as a whole-word run.
 *  Case-insensitive; leading articles ("the", "a", "an") on the candidate are
 *  ignored; internal whitespace in the candidate matches any whitespace run. */
export function matchesInText(noteText: string, candidate: string): boolean;
```

**`normalizeTextForComparison` is deliberately left alone.** It is exported from the
collaboration barrel and `EntityExtractor` uses it for entity-vs-entity *equality*
(deduplication, reference matching), where dash-joining a single name is harmless. The bug —
`"…in the cave. Wave Echo starts…"` normalizing to `cave-wave-echo` and false-matching an
entity — only exists in the **note-scanning** path. `matchesInText` replaces
`normalizedNoteContent.includes(normalizedName)` there and nowhere else. Smaller blast radius,
and it fixes the actual defect.

Implementation: escape the candidate for regex, collapse its internal whitespace to `\s+`,
anchor with `\b` on both ends, test against the raw note text with the `i` flag. Sentence
boundaries can no longer be crossed because `.` is no longer erased.

### 4.3 `notes/hooks/useCreateNote.ts`

`createNote("New Note", "")` is currently called in **two** places (`NotesPage`, `NotesList`)
with the same surrounding try/catch and the same navigate. One hook replaces both:

```ts
/** Creates an empty note in the active campaign and navigates to it.
 *  No-ops with a console error when there is no active campaign. */
export function useCreateNote(): { createAndOpen: () => Promise<void> };
```

The new note is created with an **empty** title. The string `"New Note"` does not survive this
PR anywhere in `src/`.

All three modules are exported from `features/collaboration/index.ts`.

---

## 5. The notes index

### 5.1 `NotesPage` — header only

- `h1` "Notes" in the display face, matching the story page treatment.
- Subtitle: `Your private notes for {campaign}. Only you can read them.`
- Primary `New note` button with a plus icon, right-aligned on the same baseline, calling
  `useCreateNote().createAndOpen`.
- The existing "no campaign selected" guard keeps its current behaviour exactly, including the
  `isLoading` suppression that fixes bug #1413 (the comment at the top of `NotesPage` explains
  why `isLoading` is read; keep it).

`NotesPage` renders `<NotesList />` and owns nothing else.

### 5.2 `NotesList` — control row, then rows

**Control row.** One row, 38px controls, 12px gaps:

- Search input, `flex: 1`, placeholder `Search note titles and text`, magnifier icon. Filters on
  title *and* content, case-insensitive, entirely client-side. Title here means the **displayed**
  title, so a search matches a derived title too.
- Filter pills with live counts: `All {n}` (selected = solid dark), `Unsaved {n}`, `Archived {n}`.
  - **`All` means non-archived.** `All` and `Archived` are disjoint, so the mock's
    `All 14 / Archived 3` reads as 14 active plus 3 archived.
  - `Unsaved` is the subset of non-archived notes with `isUnsaved`.
  - `NoteContext` never filtered on `status`, so archived notes are already in `notes`. This is
    pure client-side filtering — no context change, no new query. **This is the first UI that
    reaches `archiveNote` and `status: "archived"`, which have existed with no UI at all.**
- Sort control on the right: `Newest first` / `Oldest first` / `Recently edited`.
  - `Newest first` / `Oldest first` sort on `dateAdded`.
  - `Recently edited` sorts on `updatedAt`.
  - **Unsaved notes pin to the top under every sort.** They are not a separate section.

Counts are computed from the search-filtered pool, so they stay live as the user types — the
same rule the story page's filter pills follow.

**Rows, not cards.** One list container (`card`, 1px border, 12px radius) with hairline dividers
inset 20px. Each row is a 2-column grid `1fr 220px` at 16px/20px padding:

| part | content |
| --- | --- |
| left | title (600, ~17px), 2-line preview (14px, secondary), then entity chips and tag chips |
| right | relative/absolute timestamp (13px muted), and any row action |

- **Title** is `displayTitle(note)`, or `Untitled note` in muted colour when that is null.
- **Preview:** `content` rendered with `line-clamp-2` and nothing else. The current
  `content.substring(0, 150) + "..."` is **deleted** — the two truncations fight each other and
  the ellipsis frequently lands off-screen.
- **Entity chips** come from `entityCounts`, which `NoteCard` computes on every render today and
  then throws away. Render only the non-zero types: `3 NPCs · 1 location · 1 rumor`. Small pill,
  `bg-secondary`. Plural forms are per-type.
- **Tags** render as chips, not `note.tags.join(", ")`.
- **Unsaved rows** get a warning-toned 3px left border, a `Not saved yet` badge beside the title,
  and a `Save now` text action on the right. This replaces the absolutely-positioned "Not Saved"
  box and both the "Unsaved Notes" and "Saved Notes" subheadings.
- **Archived rows** carry an `Archived` chip, as `NoteCard` does today.
- Show the first ~4 rows plus a `{n} older notes ——— Show all` divider row when the list is
  longer. `Show all` expands in place.

Loading and empty states keep their current behaviour, restyled to match. Dashed border is fine;
the icon must not be the largest element on the page. The empty state's create button uses
`useCreateNote`.

`NoteCard` becomes the row renderer. It keeps its name and its file.

---

## 6. The note editor

### 6.1 Layout

`NotePage` becomes a `1fr 320px` grid, 20px gap, aligned to the top. The cross-campaign warning
banner, the not-found state, the loading state and the cross-campaign read-only behaviour all
survive unchanged — they are correctness, not decoration.

The old page-level header (`Back to Notes` on the left, `Delete` on the right, outside the card)
is gone; those actions move into the writing surface's own top bar.

### 6.2 Left — the writing surface

A `card` at 12px radius, flex column:

- **Top bar**, thin, 13px, 12–14px padding: `← All notes` on the left; `Archive` and `Delete` as
  quiet text actions with icons on the right. `Delete` uses the error colour. `Archive` calls the
  existing `archiveNote`.
- **Title:** an input styled as an `h1` — display face, ~30px, 500 — with placeholder
  `Untitled note`. Under it, one 12px muted line, shown **only while the title is derived**:
  `Taken from the first line. Click to write your own title.`
- **Body:** a textarea with no visible box, ~17px/1.65, in the app's **reading** face. Not
  `font-mono`. `rows={30}` is replaced by a min-height plus auto-grow, so the body fills the
  available height instead of a fixed 30 rows.
- **Footer bar** (top border, `bg-secondary`), one row, two items:
  - left: save status — `Saved 2 minutes ago · saves as you write`, with a check icon when clean
  - right: `1 042 words · ⌘S to save now`

**Removed entirely:** the `<h3>Title</h3>` and `<h3>Content</h3>` headings, the permanent italic
`Autosave every {n}s` caption, `Remember to save your work!`, and the duplicated status text.
**Save state is stated exactly once**, in the footer bar.

**Underlines are not implemented in this PR.** The design calls for solid underlines on linked
names and dashed on detected-but-unlinked ones. A plain `<textarea>` cannot render styled runs;
the only technique is a mirrored overlay div behind a transparent textarea, tracking font
metrics, scroll offset and resize across three themes. The prompt permits skipping this, and the
right rail already names every match and every detection, so the underlines are reinforcement
bought at high fragility. **This must be stated in the PR description.** The footnote in the
rail (§7) is worded so it does not promise something the editor does not do.

### 6.3 Title derivation in the editor

- `title` stays on the note and is treated as **explicit** only once the user types in the title
  field.
- While the title is untouched, the displayed *and saved* title is `deriveTitle(content)`.
- "The user has typed in the title field" is tracked in `NoteEditor` **local state**. No new
  persisted field. A note loaded with a non-empty `title` starts in the explicit state.

### 6.4 Save-status correctness

Four defects, all fixed here:

1. **`getLastSavedText` has no day unit.** The `else` branch divides by 3600 forever, which is
   why the user's screenshot reads `Saved 10870h ago`. Replace with `Intl.RelativeTimeFormat`:
   minutes → hours → days, falling back to an absolute date (`on 2 June`) past ~7 days.
2. **The autosave caption contradicts the code.** `debounce(…, 45000)` fires 45s after the user
   *stops* typing, so during continuous writing it never fires at all. **Resolution:** shorten
   the debounce to ~2s idle **and** add a true interval save every ~30s while the note is dirty.
   `saves as you write` then describes what actually happens. The interval is cleared on unmount
   and whenever the note becomes clean.
3. **`MIN_CONTENT_LENGTH = 3` returns early with no state change**, so a two-character note reads
   "Unsaved changes" indefinitely with no explanation. **The guard is deleted.** It has no stated
   purpose, and a note the user deliberately typed is worth a write.
4. **Delete has no confirmation.** `handleDeleteNote` deletes and navigates away instantly, while
   leaving a group and deleting an account both get a full confirm dialog. Use the existing
   `core/components/Dialog`, naming the note in the prompt and requiring an explicit confirm.

### 6.5 Dead code

`onExtractEntities` is declared in `NoteEditorProps`, destructured in the component, and never
called. **Delete the prop**, its destructuring, and its doc comment.

The `NoteEditorRef` contract (`getCurrentContent`, `saveCurrentContent`) is **kept** — the rail
depends on it to save before analysis, and `saveCurrentContent` must keep re-throwing so
extraction can abort on a failed pre-save (bug #1051). The `triggerManualSave` wrapper that
catches for the button/Ctrl+S call sites is kept for the same reason.

---

## 7. Right rail — one "Campaign links" panel

`EntityExtractor` (AI extraction) and `NoteReferences` (text matching) merge into **one**
`CampaignLinksPanel`. Today they are two stacked cards whose primary content is their own empty
state.

**Panel** (`card`, 12px radius):

- **Header row:** title `Campaign links` + a small outlined `Scan note` button with a magnifier
  icon, triggering the extraction currently behind Smart Detection's icon button. The existing
  save-before-analysis behaviour is kept, but expressed as a footnote rather than a paragraph.
- **Group 1**, label `IN YOUR CAMPAIGN · {n}` — 11px, uppercase, letterspaced, muted. One row per
  matched entity: type icon, name, type name right-aligned. The whole row navigates to the entity
  exactly as it does today (`/{type}s?highlight={id}`).
- **Group 2**, label `DETECTED, NOT IN YOUR CAMPAIGN · {n}` in a warning tone. Per entity: name,
  a second line `looks like an NPC · 91% confidence` built from `ExtractedEntity.type` and
  `.confidence`, and a solid `Add` button running the existing convert-to-entity flow
  (`EntityCard`'s behaviour; `EntityCard` may be inlined or reused, implementer's call).
- **Footnote:** the mock's `Underlined names in the note are already linked. Dashed ones are
  detections waiting for you.` is **omitted in this PR**, since §6.2 does not ship underlines.
  Only the save-before-analysis footnote appears.
- **When both groups are empty, render the header only.** No explanatory card, no empty-state
  paragraph, no instructions.

Usage-limit-exceeded, extraction-error and in-progress states are preserved; they are real
feedback, not empty states.

### 7.1 Performance and correctness in the matching path

`findReferences` currently fetches **all** npcs + locations + quests + rumors from
`DocumentService` on every note open, and re-normalizes the whole note body once per entity.

- Read the four collections from context instead: `useNPCs()`, `useLocations()`, `useQuests()`,
  `useRumors()`, all exported from the `features/campaign-entities` barrel. A `features/` →
  `features/` barrel edge is explicitly permitted by the dependency rules in `CLAUDE.md`.
- Normalize the note **once**, outside the loops.
- Replace `normalizedNoteContent.includes(normalizedName)` with `matchesInText` (§4.2).
- `EntityExtractor.filterNewEntities` gets the same context-over-fetch treatment.

---

## 8. Usage indicator

`FloatingUsageIndicator` puts a bare `0` and a coloured ring in the bottom-right corner of the
writing surface with no label. A new `UsageMeter` replaces it at the bottom of the right rail: a
labelled row reading `Smart detection` / `{n} of {limit} scans used this month` with a thin
meter. Same number from the same `useUsageContext()`, in a place where it has a name. The
**monthly** period is shown, per the mock's wording.

`FloatingUsageIndicator` itself is **not deleted** — it stays exported and its test stays green.
`NotePage` simply stops rendering it. (It self-gates to `/notes/*`, so in practice it disappears;
keeping the component avoids collateral churn for a component that is not the subject of this PR.)

---

## 9. Testing

Six existing test files are **updated, not deleted**, each by whichever track owns its component:

```
src/pages/notes/__tests__/NotesPage.test.tsx
src/pages/notes/__tests__/NotePage.test.tsx
src/features/collaboration/notes/components/__tests__/NoteCard.test.tsx
src/features/collaboration/notes/components/__tests__/NotesList.test.tsx
src/features/collaboration/notes/components/__tests__/NoteEditor.test.tsx
src/features/collaboration/notes/components/__tests__/NoteReferences.test.tsx
```

Assertions are rewritten to match the new structure. **No assertion is deleted to make a test
pass** — that is the standing rule in `CLAUDE.md`, and it applies here.

New unit tests:

- `deriveTitle`: first non-empty line, leading blank lines, 80-char word-boundary cut, an
  81-char single word, empty content
- `displayTitle`: explicit title wins, derived fallback, null for empty
- `matchesInText`: the `"…in the cave. Wave Echo starts…"` false-match that motivated it, word
  boundaries, leading articles, multi-word names, case insensitivity
- `getLastSavedText`: the minutes/hours/**days** branches and the absolute-date fallback past 7
  days — this is the `Saved 10870h ago` bug, and pinning it is cheap

**Baseline.** Recorded on `redesign/notes` at `78e2792`, before any implementation:
**192 suites, 4367 passed, 2 skipped, 0 failed.** Any red from here is a regression.

**Gates.** Per phase: `npx tsc --noEmit` plus the targeted jest files. Before the PR: full
`npm test` **and** `npm run build` — the latter is not implied by the former two, because
`react-scripts`' webpack honours `baseUrl` but ignores `paths`. All new `src/` imports use bare
`baseUrl` specifiers, never `@/`.

---

## 10. Execution plan

Three phases. Never more than two concurrent subagents; implementing agents are Sonnet.

| Phase | Track | Files owned exclusively |
| --- | --- | --- |
| 1 | Foundation (orchestrator) | `note-title.ts`, `entity-matching.ts`, `useCreateNote.ts`, barrel, their unit tests |
| 2 | **A: Index** (Sonnet) | `NotesPage.tsx`, `NotesList.tsx`, `NoteCard.tsx` + 3 test files |
| 2 | **B: Rail** (Sonnet) | `CampaignLinksPanel.tsx`, `NoteReferences.tsx`, `EntityExtractor.tsx`, `UsageMeter.tsx` + tests |
| 3 | **C: Editor** (Sonnet) | `NotePage.tsx`, `NoteEditor.tsx` + 2 test files |

Phase 1 is a hard prerequisite: every other track imports from it.

A and B are the parallel pair because they share **no files at all**. A owns the index; B owns
the rail and the matching path.

C runs last and alone because it is the only track that touches `NotePage.tsx` — it wires B's
published `CampaignLinksPanel` and `UsageMeter` into the new `1fr 320px` grid. Running C beside
either of the others would put two agents in the same file.

`NoteContext.tsx` is read-only in all three tracks.

## 11. Definition of done

- [ ] No note is ever created or displayed as "New Note"; only a genuinely empty note reads
      "Untitled note"
- [ ] The index has working search, `All / Unsaved / Archived` filters with live counts, and a
      sort control; archived notes are reachable for the first time
- [ ] Rows show entity counts and tag chips
- [ ] The editor has no `Title` / `Content` headings, no monospace body, and no fixed 30 rows
- [ ] Save status appears exactly once, is correct past 24 hours, and no caption contradicts the
      save mechanism
- [ ] Deleting a note asks first
- [ ] Smart Detection and Campaign References are a single panel that renders only its header
      when there is nothing to show
- [ ] The unlabelled floating `0` is gone from the note page
- [ ] `npm test` green against the recorded baseline; `npx tsc --noEmit` and `npm run build` both
      clean
- [ ] The skipped underline treatment is stated in the PR description
