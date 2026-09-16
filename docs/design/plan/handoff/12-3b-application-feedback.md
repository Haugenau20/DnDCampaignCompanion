# PR 12.3b — Application feedback, and the pre-pair-model tokens deleted

Phase 12 · fifth PR · closes the semantic migration

Depends on `12-2b` for `accent.*` and `feedback.*`.

## Read-only, in every PR of this phase

`../../design/colour-schema.md`, `colour-schema.json`, `design-language.md`,
`01-token-model.md`, `06-colour-schema-rollout.md` and every
`handoff/12-*.md` are **read-only**. A handoff that is wrong is reported, not
rewritten. `../03-drift-log.md` is append-only and is where findings go.
Schema §9 has the procedure.

Roughly sixteen files use the status hues as generic UI feedback rather than to
describe campaign state. They are the application talking about itself, and
they get their own scale.

## Scope

- `collaboration/notes/` — `NoteCard`, `NotesList`, `NoteEditor`, `CampaignLinksPanel`
- `collaboration/entity-extraction/` — `EntityCard`, `FloatingUsageIndicator`, `UsageMeter`
- `user-management/` — `SessionTimeoutWarning`, `DangerZoneCard`
- `pages/NotePage`, `shared/ErrorBoundary`, `shared/ContactForm`, `RumorBatchActions`
- `src/core/themes/css/components.css`, `globals.css`
- `src/core/themes/token-types.ts`, `definitions/`, `derive/`

## Do

1. **Map each consumer to `feedback.*`** — error, warning, success, progress.
   Schema §3's lower rows are the specification. A save failure is
   `feedback.error`, not `outcome.failed`; they resolve alike today and are
   named apart so they can diverge.
2. **Migrate `color.primary` to `accent.*`.** The `accent` scale (schema §5.5,
   shipped by `12-2b`) is what gives these consumers a successor — the accent
   was previously a primitive with no name in the token tree, which is the gap
   that stopped this PR the first time it was attempted. All three of
   `accent.ink`/`edge`/`fill` carry the value `color.primary` had, so this is
   a rename at the call sites and not a visual change — but pick the one that
   matches how each site *uses* it, since that distinction is the point. `color.primary` is spent in
   five different jobs across ~20 uses in `components.css` — ink, border,
   outline, background, `border-top-color`. They resolve as:
   - ink, border and outline → `accent.ink` / `accent.edge`
   - background carrying ink → `accent.fill` + `accent.on`, or
     `action.primary.bg` + `action.primary.text` where it is literally a button
   - `:focus-visible` outline in `globals.css` → `accent.ring`

   All of these are built by `12-2b`, which lands first.

   The warning at `components.css:691` — "Ink and edge come from
   `--color-primary`, not `--action-primary-bg`" — is obsolete and should be
   deleted with the line it guards. Its reason was that the old fill was
   `#A32B22` at 1.83:1. `accent.ink` is `#8D4F00` light and `#D69253` dark;
   for the measured ratios read schema §5.2 rather than trusting a number
   quoted in a handoff — an earlier revision of this file carried two that were
   not reproducible from any ground pairing in the theme.
3. **Delete the pre-pair-model tokens** marked "Retired · 12-3b" in schema §5.4:
   - `color.primary`, `color.secondary`, `color.accent`
   - `state.hoverLight`, `state.hoverMedium`, `state.selected` — consumers move
     to their own surface's `hover` and `selected`. A global hover grey is what
     token model §2 says cannot exist once surfaces carry their own feedback.

   `color.emphasis` and `color.heading` stay; §5.4 gives them sources.
4. **A filled destructive button uses `danger.confirmBg` + `danger.confirmText`**
   (7.83:1 light, 4.68:1 dark). Red text on a plain surface stays
   `danger.deleteText`. Do not put `feedback.error.ink` on
   `feedback.error.wash` — that pairing fails AA in dark and is asserted
   against in `12-2b`; a washed banner takes `surface.*.on` for its text.
5. **`DangerZoneCard.tsx:71` uses `var(--status-failed)` in an inline style.**
   TypeScript cannot see a string in a style prop, so the compiler will not
   find it. It is grep-only — check it explicitly.

## Do not

- Do not keep `color.primary` as a deprecated synonym for the accent. Nothing
  is using the site during this phase; there is no audience for a shim.
- Do not give `feedback` an `info` member. Warning and progress both take the
  accent by design.
- Do not route a campaign state through `feedback.*` to avoid touching
  `12-3a`'s files, or vice versa.

## Gates

- `grep -r` clean across `src/` for `status-`, `color-primary`,
  `color-secondary`, `color-accent`, `state-hover`, `state-selected` —
  **excluding comments.** `variables.css:33` legitimately mentions
  `--color-primary` inside a comment explaining why empty declarations are
  harmful; scope the gate to declarations and `var()` references.
- `ThemeContext.test.tsx` updated — two tests assert `--color-primary` is
  applied. `token-rename-map.json` records five of these names as Phase 1
  history and is a historical record; leave it.
- Screenshots: an error banner, a session-timeout warning, an unsaved-note
  indicator, a usage meter at 80%, both modes.
- `colour-schema.md` and `colour-schema.json` unmodified in the diff.

## References

Schema §2 (why feedback is its own scale), §3, §5.4, §5.5. Token model §2
(surfaces carry their own state), §7 (no aliases). Record D31 and D33.
