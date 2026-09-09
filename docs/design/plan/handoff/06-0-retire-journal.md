# PR 6.0 — Retire the journal mode

Phase 6 · runs before 6.1 · deletion and bookkeeping only

D39 in the drift log. The journal is deleted rather than migrated: never used
on the live site, answered by the dashboard, and dependent on someone filing
every entry under the right session — which is a maintenance burden with no
payoff the first time anyone forgets.

Deleting it first means Phases 8, 9 and 11 never touch these files.

## Scope

- `src/pages/layouts/journal/` — `JournalLayout.tsx`, `JournalPage.tsx`,
  `JournalPages.tsx`, `sections/` (14 files), `__tests__/` (3 files)
- `src/pages/HomePage.tsx` (the layout toggle, ~lines 16–17 and 293–310)
- `src/pages/__tests__/HomePage.test.tsx` (the journal-mode describe blocks)
- `src/core/themes/css/components.css` (`.journal-*`, ~lines 1030–1195)
- `src/core/themes/css/theme-effects.css` (every `.journal-*` rule under all
  three theme selectors)
- `src/core/themes/token-types.ts` (the `journal` block)
- `src/core/themes/definitions/` — the `journal` block in all three themes
- `src/core/themes/__tests__/token-values.baseline.json`,
  `token-rename-map.json`
- `docs/design/plan/03-drift-log.md`, `04-rollout.md`, `05-archetypes.md`,
  `handoff/` (the bookkeeping half)

## Do

1. Delete the layout, its sections and its tests.
2. Remove the Dashboard/Journal toggle from Home. Home renders the dashboard,
   full stop — no persisted layout preference, no query param, no dead prop.
3. Delete all twelve `--journal-*` tokens: the type, the three themes' values,
   the baseline entries, and every CSS rule that reads one.
4. Grep `src/` for `journal` and leave zero hits outside changelog-style docs.
5. Update the baseline JSON deliberately — eleven fewer keys per theme is the
   expected diff, and it is the receipt for this PR.
6. Settle the drift log's bookkeeping for Phases 6–12: the decisions
   `04-rollout.md`, `05-archetypes.md` and these handoffs cite were never
   written down, and the numbers they cite belong to unrelated Phase 0–5
   entries. Write them, then correct every reference.

## Do not

- Do not build a replacement. A timeline over entries that already carry dates
  is a future feature (D42), not part of this PR, and it is not a mode.
- Do not keep `--journal-page-shadow` "because something might want it". If a
  surface needs a shadow, that is a surface decision, and the design language
  says depth is value and rule rather than shadow (§5).
- Do not migrate a stored layout preference into anything. Drop it.
- Do not renumber any existing drift-log entry. The dangling citations are the
  wrong half of the mismatch; the log is the record and stays as written.

## Gates

- Home renders the dashboard for a signed-in user with no toggle present.
- `token-manifest` and `token-values` tests green against the reduced set.
- `theme-effects.css` shrinks; count the `[data-theme=…]` rules before and
  after and put both numbers in the PR body.
- Screenshot: Home, light and dark, before and after — identical except the
  toggle.

## References
D39–D46, R6–R8, Q10–Q11; design language §5, §12.1, §13.
