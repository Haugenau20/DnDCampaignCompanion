# Notes redesign — decisions taken without you

**Context:** you approved the plan and went to bed, asking me to continue to
completion and record any decision I had to make in your absence, together with
the option I chose. This file is that record. Every entry says what the question
was, what I chose, why, and **what it costs if I chose wrong** — so you can
reverse any of them cheaply.

Branch: `redesign/notes` (off `main` at `78e2792`)
Spec: `docs/superpowers/specs/2026-08-29-notes-redesign-design.md`
Plan: `docs/superpowers/plans/2026-08-29-notes-redesign.md`

---

## Decisions you answered before bed (for completeness)

These four you actually chose; they are here so the record is in one place.

| # | Question | Your choice |
|---|---|---|
| A | Branch base | Off updated `main` — you had already merged and deleted the story branch |
| B | Autosave mechanism | Shorter debounce (~2s) **plus** a true ~30s interval save while dirty |
| C | Textarea underlines for detected names | Skip; document in the PR description |
| D | `MIN_CONTENT_LENGTH = 3` guard | Delete it; save short notes |

---

## Decisions I made in your absence

### RULING 1 — I let the new barrel dependency form a cycle

**Question.** Task 8 has `NoteReferences` (in `features/collaboration`) import
`useNPCs`/`useLocations`/`useQuests`/`useRumors` from the
`features/campaign-entities` barrel. But `campaign-entities` **already** imports
`features/collaboration` — four entity form files pull in `useNotes`. That makes
a barrel-level import cycle.

**What I chose.** Proceed with the barrel import as planned.

**Why.** I verified it empirically before dispatching anything, rather than
reasoning about it: a throwaway probe test imported both barrels and referenced
`useNPCs` at module scope inside `NoteReferences.tsx`. Both barrels resolved,
`typeof useNPCs === "function"`, probe green. The alternative — importing
`campaign-entities/npcs/context/NPCContext` and friends directly — would breach
the one architectural rule `CLAUDE.md` says actually matters ("never another
feature's internals"), and `CLAUDE.md` explicitly sanctions barrel-level
coupling between features, noting 26 existing instances.

**Cost if wrong.** Reference finding breaks at runtime in a way jest did not
catch. The browser walk in Task 14 is where that surfaces. Fallback is to inject
the four collections from `pages/NotePage`, which has no cycle.

---

### RULING 2 — `EntityExtractor` keeps two vestigial props for one extra task

**Question.** Task 9 reduces `EntityExtractor` to a thin wrapper around the new
`CampaignLinksPanel`, but `NotePage` goes on passing it `existingReferences` and
`referencesSearchComplete` until Task 13 rewrites that page. Between those two
tasks the tree would not type-check if the wrapper dropped the props.

**What I chose.** The wrapper keeps both props declared, optional, and ignored.
Task 13 deletes the call site; Task 14's greps confirm nothing else passes them.

**Why.** The alternative is reordering the plan so the page is rewritten before
the rail exists, which puts two agents in `NotePage.tsx` and loses the
parallelism the whole phase structure is built on.

**Cost if wrong.** Two dead optional props survive one task longer than
necessary. Trivial to delete.

---

### RULING 3 — I did not delete `EntityExtractor` or `NoteReferences`

**Question.** After Task 13 neither component is rendered anywhere. Delete them?

**What I chose.** No. Both stay exported from the barrel and stay tested.

**Why.** The spec's "dead code to remove" list names exactly three things —
`entityCounts`, `onExtractEntities`, and redundant `NotesList` markup. Deleting
two public barrel exports is scope the spec did not grant me, and I was not
willing to take it while you were asleep. `NoteReferences.tsx` has to survive
regardless: it hosts `PotentialReference`, `normalizeTextForComparison` and the
new `useNoteReferences` hook.

**Cost if wrong.** Two unrendered components linger in the barrel. A follow-up
deletes them in minutes once you have confirmed the redesign in the browser —
and that is the right order anyway, since they are the fallback if the new panel
turns out wrong.

---

### RULING 4 — I extended scope by one file: the global action button

**Question.** Grepping after Phase 1 turned up a **third** copy of
`createNote("New Note", "")` that neither the spec nor the plan mentions:
`src/shared/components/GlobalActionButton.tsx`, the floating "+" button. Your
Definition of Done says *"No note is ever created or displayed as 'New Note'"* — so
fixing only the two known call sites would have left a note made from the FAB still
born "New Note".

**What I chose.** Rewire it to `useCreateNote().createAndOpen`. Its menu *label*
"New Note" stays — that's a menu item, not a note title.

**Cost if wrong.** One file touched outside the spec's stated list; a one-line revert.

---

### RULING 5 — I ran Phase 2's two tracks sequentially, not in parallel

**Question.** The plan schedules the index and rail tracks as two concurrent
implementers. The subagent-driven-development skill forbids that.

**What I chose.** Sequential.

**Why.** Two agents share one working tree and git index, so concurrent
`git add`/`git commit` interleave and one commits the other's half-written files.
The tracks share no source files, so sequential output is identical. I considered a
git worktree per track and rejected it — merging two worktrees unsupervised at 1am
for a pure wall-clock gain wasn't a trade I wanted to make.

**Cost if wrong.** Wall-clock time only.

---

### RULING 6 — I fixed a coverage gap the plan itself had baked in

**Question.** The index review found that `NotesPage.test.tsx` never exercised
"no campaign id" *together with* "no campaign object", leaving the subtitle's guard
untested in the genuinely-cleared state. That hole came from the plan's own literal
test file — which I wrote.

**What I chose.** Fix it anyway. The plan's authorship doesn't get to grade its own
work, and it was two small edits.

**Cost if wrong.** One extra test and a tightened mock default.

---

### RULING 7 — I restored ~22 tests the panel merge quietly dropped

**Question.** Merging Smart Detection into `CampaignLinksPanel` moved the extraction
logic, but `EntityExtractor.test.tsx` went 40 tests → 5 while the new panel added
only 13. Net −24 across the suite. The plan's canonical test file specified exactly
those 13, so the gap was plan-mandated.

**What I chose.** Restore the coverage before accepting the track.

**Why.** Six behaviours the spec *itself* lists as "must survive" had no test
anywhere: extraction errors, the in-progress state, deduplication, campaign-collection
filtering (the very code the task moved off `DocumentService`), the Add-button
conversion flow, and limit-increase navigation. Shipping a merge that halves the
coverage of the thing being merged is the failure mode your testing policy exists to
prevent.

**Cost if wrong.** Six extra tests.

---

### RULING 8 — a real race in the new rail

**Question.** `CampaignLinksPanel` ignored the `isLoading` flag from
`useNoteReferences` and classified detections on mount regardless.

**What I chose.** Gate the classification on loading, with a test.

**Why.** Not brief-mandated — a genuine defect. Opening a note before campaign-entity
data arrived could label an entity that *is* in your campaign as "detected, not in
your campaign".

**Cost if wrong.** None; a straightforward correctness fix.

---

### RULING 9 — your existing notes still *displayed* "New Note"

**Question.** Found by looking at the running app, not by any test. Your existing
notes have `title: "New Note"` persisted in Firestore, and `displayTitle` prefers an
explicit title — so every pre-existing note still read "New Note" even though the
creation path was fixed. Your DoD says no note is ever created **or displayed** as
"New Note".

**What I chose.** Treat the exact string "New Note" as *not* an explicit title, via
one shared constant used by both `displayTitle` and the editor.

**Why.** A Firestore migration is out of scope and riskier, and the spec requires
everything to read data the app already stores.

**Cost if wrong.** If you ever deliberately title a note exactly "New Note" and
reload, it re-derives from the first line instead. A title merely *containing* "New
Note" is unaffected.

---

### RULING 10 — my spec was wrong about the floating pill

**Question.** Spec §8 claimed `FloatingUsageIndicator` "self-gates to `/notes/*`, so
in practice it disappears" once `NotePage` stopped rendering it. It doesn't —
`app/layout/Layout.tsx` also rendered it. The unlabelled pill was still sitting on the
note page, which I saw in the browser.

**What I chose.** Remove the render from `Layout.tsx` too.

**Why.** My inference was simply false, and the DoD requires the pill gone. The
component, its export and its test all still exist (per Ruling 3).

**Cost if wrong.** None — it returns `null` on every non-note route anyway.

---

### RULING 11 — a data-loss path, and the most serious thing found

**Question.** The final whole-branch review composed three facts no single task
review could see: `createNote` writes to React state only; `updateNote` is a no-op to
Firestore for an unsaved note, so *neither* autosave persisted a new one; and Task 12
deleted the Save button. Net effect: **New note → write → close the tab → gone.** On a
touch device, unsavable at all. An earlier review had rated the first half "Minor"
because the footer honestly says "Not saved to server".

**What I chose.** `performAutosave` calls `saveNote` when the note is unsaved.

**Why.** Honesty is not a save affordance — the footer told you your work wasn't safe
and then offered no control that made it safe. I verified the fix end-to-end in the
browser: typed into a new note, watched the footer reach "Saved just now", then did a
full page reload and the note survived.

**Cost if wrong.** A new note reaches Firestore ~2s after your first keystroke rather
than on an explicit save. Creation is still instant.

---

### RULING 12 — my spec contradicts itself on derived titles

**Question.** Spec §6.3 says the derived title is "displayed **and saved**", and also
says explicitness is tracked in local state with "no new persisted field". Both cannot
hold: once the derived title is saved, the next load can't tell it from one you typed
— so the hint vanished and the title stopped tracking your first line.

**What I chose.** Don't persist derived titles. Save `title: ""` and derive at read
time, which the index already did.

**Why.** Where the spec contradicts itself, its stated intent governs. Verified in the
browser: after a reload the derivation hint is still shown.

**Cost if wrong.** One place reads `note.title` raw — `NoteContext.tsx:272`, seeding a
description when converting an extracted entity — and it already falls back to the note
id, so it degrades gracefully. No other consumer exists.

---

### RULING 13 — two more from the final review

**Silent scans.** A scan that found nothing rendered byte-identical output, so a
multi-second AI call gave no feedback at all. Spec §7's "no empty-state paragraph"
governs the *idle* panel, not a user-initiated action. It now shows one line.

**Accessibility.** The index row was `role="button"` containing a real `<button>` (an
ARIA violation), with an `aria-label` that hid the timestamp, chips and badges from
screen readers. The reviewer offered to defer it; I didn't, because this redesign
introduced it. The title is now the interactive element.

**Cost if wrong.** Both are small and self-contained.

---

## Things I could not verify, that you should

1. **Light and medieval themes were verified statically, not visually.** Two reviewers
   independently confirmed every class the branch uses exists in `components.css` and
   resolves through per-theme CSS variables, and there are no hardcoded colours. But I
   only *looked* at dark — the theme selector sits in a user dropdown I couldn't reach
   at the tested viewport. Worth a 30-second eyeball.
2. **The skipped underline treatment must go in the PR description.** It is the one
   Definition-of-Done item a branch cannot satisfy by itself.

## Deferred, with reasons

Fifteen Minor findings were recorded and deliberately not fixed. The ones most worth a
follow-up ticket:

- `CampaignLinksPanel.tsx` is ~458 lines mixing render, orchestration and business
  logic. Splitting it now would churn the file that just gained the most new tests.
- **Nothing un-archives a note.** This branch makes archived notes *visible* for the
  first time, which is a real gain, but the trip is currently one-way.
- If you navigate away within the 2s debounce window on a brand-new note, it is still
  lost — there is no flush-on-unmount. Generic to the debounce design and predating the
  branch, but Ruling 11 narrowed that window rather than closing it.
- `EntityExtractor` and `NoteReferences`' default exports are now unrendered (Ruling 3).
  Delete them once you're happy with the redesign.
- The delete-confirm button uses `variant="primary"`; there is no danger variant in the
  design system, so adding one is the honest fix and was out of scope.
