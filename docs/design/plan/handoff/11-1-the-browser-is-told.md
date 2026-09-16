# PR 11.1 — The browser is told which way up the theme is

Phase 11 · second PR · answers Q16 · depends on 11.0 only for tidiness

Q16, from the drift log:

> **Q16** — How does a theme say it is dark, so the browser paints native
> controls (a `<select>`'s popup, scrollbars, a date picker) to match? See R22.
> Phase 11 needs an answer; a `[data-theme=…]` rule is not one.

**The answer is `color-scheme`, and it is currently set nowhere in `src`.**
Measured: zero occurrences in any `.css`, `.ts` or `.tsx` file.

That single missing declaration is why R22 exists. A native `<select>`'s popup
list, the scrollbars, the focus ring on a native control, and any date or
colour picker are painted by the browser, not by this stylesheet — and with no
`color-scheme` the browser assumes light and paints a white popup with dark
text over a dark page. No CSS rule can reach inside that popup; this is
precisely the case a `[data-theme=…]` patch cannot fix, which is why the drift
log ruled one out in advance.

## What it also retires

Four of the nine surviving `[data-theme=…]` rules are hand-painted scrollbars,
two per theme, using the `::-webkit-scrollbar-thumb` prefix:

| file | rules |
|---|---|
| `theme-effects.css` | `[data-theme="dark"] ::-webkit-scrollbar-thumb` (+ `:hover`) |
| `theme-effects.css` | `[data-theme="light"] ::-webkit-scrollbar-thumb` (+ `:hover`) |

`color-scheme` makes the browser paint both correctly, in every engine rather
than only in Blink and WebKit, and it does it for the controls the prefix
cannot reach at all. Deleting them is the point of the PR, not a side effect —
design language §12.8 says a new theme-conditional rule means the surface model
is missing something, and this is the something.

## Scope

- `src/core/themes/ThemeContext.tsx` — where the theme is applied to the
  document element
- `src/core/themes/css/theme-effects.css` — the four scrollbar rules
- `src/core/themes/types.ts` / `definitions/*.ts` if the scheme is expressed as
  a token rather than derived from the theme name (see item 2)
- the theme suites

## Do

1. **Set `color-scheme` on the document element, wherever `data-theme` is
   already set.** `applyThemeToCssVariables` in `ThemeContext.tsx` is the one
   place that owns what the document element carries, and
   `variables.css`'s header is explicit that it must stay the single source of
   truth — so this belongs there and not in a stylesheet.
2. **Decide whether the scheme is derived or declared, and record it.** Two
   honest options: derive it from the theme name (`dark` → `dark`), which is
   two lines and correct for exactly today's two themes; or add a
   `scheme: 'light' | 'dark'` field to the theme definition, which is one more
   token and survives a future theme whose name does not say which way up it
   is. The token model has an opinion worth reading first — §6 calls this shape
   an **enum**, and §6's whole argument is that validating an enum means
   checking the *value* is legal rather than that the variable exists. Pick
   one, and say why in the drift log.
3. **Delete the four scrollbar rules** and verify in both themes that the
   scrollbars still look right — they will look *different*, because they will
   be the browser's, and that is the intended result.
4. **Check the native `<select>` that motivated R22.** `RosterFilterSelect` in
   `core/components/Roster.tsx` is a real native `<select>` kept on purpose
   (see `raw-controls.test.ts`'s allow-list), and `Select.tsx` renders the
   others. Open one in dark and confirm the popup is now dark. That is the
   observable that closes Q16; a passing test is not one, because the popup is
   drawn outside the DOM.

## Do not

- Do not add `color-scheme` in CSS as `:root { color-scheme: … }` alongside a
  `[data-theme=…]` selector. That reintroduces the rule this PR removes, and
  splits ownership of the document element between two files.
- Do not touch the `[data-theme="dark"] .dialog` shadow or the three
  `[data-theme="light"]` book/card rules. They are surface questions, not
  native-control questions; `11-2` decides them.
- Do not set `color-scheme` on `body` or on individual components. It cascades,
  and setting it twice is how a nested control ends up disagreeing with its
  page.

## Gates

- `grep -rn "::-webkit-scrollbar" src` returns nothing.
- A native `<select>`'s popup is dark in dark and light in light, checked by
  opening one in the browser in both themes.
- Scrollbars are legible in both themes — a screenshot each, scrolled far
  enough that the thumb is visible.
- The remaining `[data-theme=…]` count is **5**, down from 9 after `11-0`
  (dark's dialog shadow, and light's card hover, two book rules and reader
  rule). State the number in the PR so the next reader can check it.
- Suite green; `npx tsc --noEmit` clean.

## References

Q16 and R22 (the dark-select defect this closes); design language §12.8 (a new
theme-conditional rule means the surface model is missing something);
`01-token-model.md` §6 (enum tokens, and validating values not names);
`variables.css`'s header (why the document element has one owner).
