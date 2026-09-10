# PR 11.0 — Medieval goes

Phase 11 · runs first · everything after it is smaller once a third theme stops existing

> **Measured before writing, per R36's practice. `04-rollout.md` calls Phase 11
> "a deletion PR plus a migration PR — a stored preference of `medieval` must
> resolve to something, and roughly a third of `theme-effects.css` is its
> ornament", then "Dark then gets real values for every surface pair instead of
> fallbacks".**
>
> The first half is right. **The second half is stale, and it changes the whole
> phase** — see `11-2`. Dark defines all 117 token properties, exactly as many
> as light and medieval; there is precisely **one** `var(--x, var(--y))`
> fallback chain left in all of `src`
> (`components.css:739`). Dark is not unmigrated. It is migrated and
> *untuned* — a different design wearing the same token names, which is a
> bigger job than filling in blanks and a different one.
>
> This PR is only the deletion. It is worth doing first because medieval is 13
> of the 23 `[data-theme=…]` rules left in the tree, and because two of the
> things it drags out are already dead.

## The measurement

| | count |
|---|---|
| `[data-theme="medieval"]` rules | **13** (12 in `theme-effects.css`, 1 in `components.css`) |
| `[data-theme="dark"]` rules | 3 (2 scrollbar, 1 dialog shadow) |
| `[data-theme="light"]` rules | 6 (card hover, book surfaces, 2 scrollbar, reader) |
| `medievalTheme.ts` | 175 lines, 117 props |
| files naming `medieval` outside tests | 10 |
| test suites naming `medieval` | 10 |

**Two of these are already dead and should be deleted rather than migrated:**

1. **`theme-utils.ts` (99 lines, 4 exports) is stranded.** Nothing imports it
   but its own 215-line test. `ismedievalTheme`, `getThemeClasses`,
   `combineThemeStyles` and `getMedievalDecoration` have **zero** callers — and
   `getThemeClasses` returns `medieval-card`, `medieval-button`,
   `medieval-input`, `medieval-typography`, `medieval-navigation`,
   `medieval-heading`, `medieval-divider`, `medieval-section`, **none of which
   exists in any stylesheet.** So even if it were called it would apply class
   names that style nothing. This is the sixth stranded module (R13's three
   cards, R15's `NPCLegend`, R29's `LatestChapter`) — and note that `10-3`
   declared "the streak of stranded components ends here" for **A5**. It did.
   The theme layer had one nobody had looked at.
2. **`.decoration-scroll` has zero consumers.** Four rules in
   `theme-effects.css` (the class plus `::before`/`::after`) styling a class no
   component renders.

## Scope

- `src/core/themes/definitions/medievalTheme.ts`, `definitions/index.ts`
- `src/core/themes/theme-utils.ts` and its test — **deleted, not migrated**
- `src/core/themes/css/theme-effects.css`, `css/components.css`
- `src/core/themes/types.ts` (the `ThemeName` union)
- `src/core/themes/ThemeContext.tsx` (the stored-preference migration)
- `src/shared/components/user-menu/ThemeSegmented.tsx`
- `src/features/user-management/auth/components/SessionManager.tsx`
- the 10 test suites that name `medieval`

## Do

1. **Decide what a stored `medieval` resolves to, and migrate it on read.**
   This is the one item with a user consequence: somebody has the string
   `medieval` in `localStorage` under `medieval-companion-theme`, and after this
   PR it names nothing. Resolve it to `light` on load and write the resolved
   value back, so the migration happens once rather than on every visit.
   Note the storage **key** keeps the word — renaming it would orphan every
   stored preference, including `light` and `dark`. Leave it, and say in a
   comment that the name is historical.
2. **Narrow `ThemeName` to `'light' | 'dark'`.** Do this early: the compiler
   then finds every remaining site for you, which is more reliable than the
   grep that produced the table above.
3. **Delete `theme-utils.ts` and its test.** Do not port them. See the
   measurement — they are dead twice over, once for having no callers and once
   for returning class names that do not exist.
4. **Delete the 13 `[data-theme="medieval"]` rules**, and `.decoration-scroll`
   with them. That is most of `theme-effects.css`.
5. **Drop the third segment from `ThemeSegmented`.** Its comment explains that
   "Med." abbreviates medieval "to keep all three the same width" — with two
   segments that constraint is gone, so check the control still looks
   deliberate rather than just narrower.
6. **Keep the token-contrast and token-values suites honest.** They iterate
   over three themes; they should iterate over two, not over three with one
   skipped.

## Do not

- Do not touch dark's values. That is `11-2`, and mixing a deletion with a
  retune makes the deletion unrevertable.
- Do not remove the `[data-theme="dark"]` or `[data-theme="light"]` rules.
  Nine of them survive this PR on purpose; `11-1` retires the four scrollbar
  ones properly, with a mechanism rather than by hand.
- Do not "simplify" `ThemeContext`'s `applyThemeToCssVariables` because there
  are fewer themes. It is the single source of truth for which variables exist
  (`variables.css` says so at length, including why that file declares none).
- Do not rename the storage key. See item 1.

## Gates

- A profile with a stored `medieval` preference loads on `light`, once, and
  the stored value is `light` afterwards. Check it by setting the key by hand
  in the browser, not only in a test.
- `npx tsc --noEmit` clean with the narrowed union — this is the gate that
  proves the deletion is complete.
- `token-contrast.test.ts` and `token-values.test.ts` green over two themes.
- No `[data-theme="medieval"]` anywhere in `src`; `grep` it and paste the empty
  result.
- Suite green, and the count **drops** by whatever `theme-utils.test.ts` held
  (215 lines' worth). A deletion PR whose test count goes up is a PR that
  migrated something it should have deleted.
- Screenshots: light and dark, on Home and one directory, before and after —
  they must be identical, since nothing this PR touches is rendered by either.

## References

D40 (medieval goes); R15 and R29 for the stranded-component pattern and for
when *not* to delete; `01-token-model.md` §6 on ornament as an enum, which is
what medieval's hardcoded data-URI SVGs were the argument against;
`variables.css`'s header for why nothing declares custom properties statically.
