# PR 11.2 — Dark gets the pair model it never had

Phase 11 · the phase's real work · depends on 11.0

> **`04-rollout.md` says "Dark then gets real values for every surface pair
> instead of fallbacks." Measured, that is the wrong description of the wrong
> problem.** Dark defines all 117 token properties — the same count as light —
> and there is exactly one `var(--x, var(--y))` fallback chain left in `src`.
> Dark is not unmigrated. It has every token the model asks for, and it fills
> them the way it did before the model existed.

## The measurement

Light was tuned to finish 3a. Dark was not. Put the two side by side and the
difference is not missing values, it is a missing *model*:

| | light | dark |
|---|---|---|
| `page.onMuted` | `#655C50` | `#B0B0B0` |
| `card.onMuted` | `#655C50` | `#B0B0B0` |
| `sunken.onMuted` | **`#5F564A`** | `#B0B0B0` |
| `chrome.onMuted` | **`#A79E90`** | `#B0B0B0` |
| `band.onMuted` | **`#B3A99A`** | `#B0B0B0` |
| distinct `border` values | 5 | **1** (`#3B3B52`) |
| distinct `hover` values | 4 | **1** (`rgba(255,255,255,0.05)`) |
| distinct `selected` values | 4 | **1** (`rgba(255,255,255,0.1)`) |

**In dark, all five surfaces share one ink, one muted grey, one border and one
pair of state overlays. Only `bg` varies.** `01-token-model.md` §2 is explicit
about why that is the defect and not a simplification:

> `on-muted` is part of the pair, not a global grey. A muted ink that passes on
> `card` may fail on `sunken` — the pair is what makes that checkable.

Light does exactly that: `sunken.onMuted` is deliberately two steps darker than
`card.onMuted` because `sunken` is a lighter ground. Dark has the same five
surfaces and one grey for all of them, which is the thing the pair model was
introduced to make impossible.

Second finding, and the sharper one:

| | light | dark |
|---|---|---|
| `page.bg` | `#F3EFE6` warm ivory | `#1E1E2E` |
| `chrome.bg` | `#17140F` near-black | `#222222` |
| value contrast, page↔chrome | **~14:1** | **~1.2:1** |

Design language §2 opens with the principle it calls "the single most useful
principle in the document": *contrast lives in the chrome; calm lives in the
content.* In light, the near-black chrome against warm ivory paper **is** the
identity (§3: "The warmth of the page against the neutrality of the chrome *is*
the identity"). In dark, chrome and page are within a whisker of each other and
the frame simply disappears. A theme may change values and warmth; §3 says it
may not change the surface hierarchy, and this one has flattened it.

Third: `band.bg` and `sunken.bg` are the same value (`#2A2A3C`), so the hero
has no value of its own.

## Scope

- `src/core/themes/definitions/darkTheme.ts`
- `src/core/themes/css/theme-effects.css` — the surviving `[data-theme=…]`
  surface rules (dark's dialog shadow, light's card hover and two book rules)
- `token-values.baseline.json`
- the theme suites

**Not** `lightTheme.ts`. Light is finished; a PR that adjusts both is a PR
whose dark screenshots cannot be compared to anything.

## Do

1. **Give every dark surface its own four roles.** Five distinct `onMuted`
   values, five `border`s, and state overlays chosen per surface — `chrome` and
   `band` sit on near-black and can take a stronger overlay than `card` does.
   Light's own values are the worked example of the shape, not of the numbers.
2. **Restore the value progression.** Chrome and band must read as the frame
   again. In a dark theme that does **not** mean copying light's near-black —
   it means chrome and page must differ enough to be seen as different
   surfaces, in the same direction light does it. Decide deliberately whether
   dark's chrome goes darker than its page or lighter, and record which, because
   the answer sets the direction for every later surface.
3. **Give `band` a value of its own**, distinct from `sunken`.
4. **Decide the shadow rule, and record it (R45).** `Card.tsx` renders
   `rounded-lg shadow-sm overflow-hidden card`, and the shadow is real:
   `rgba(0,0,0,0.05) 0 1px 2px`, on **every card in the product**. §5 says
   "Depth is expressed by value and rule, not by shadow… it does not float",
   and §14 lists decorative drop shadows under Not this. The card is otherwise
   correct — a genuine hairline and a real value step. Two honest outcomes:
   remove the shadow (and check that light's cards still separate from the page
   without it — they should, the value step is `#FCFAF6` on `#F3EFE6`), or
   amend §5. Do not leave it undecided a third time.
   This is dark's PR because a shadow does almost nothing on a dark ground, so
   dark is where the question is cheapest to answer honestly.
5. **Then look at the four surviving surface `[data-theme=…]` rules.** Dark's
   `.dialog` shadow and light's `.card:hover`, `.book-content-area` and
   `.book-content`/`.book-text`. Each is a surface the model should be able to
   express; §12.8 says a theme-conditional rule means the model is missing
   something. Fix the model where that is true, and leave the rule with a
   reason where it is not.

## Do not

- Do not touch `lightTheme.ts`.
- Do not regenerate `token-values.baseline.json` blind. Every diff in it is a
  design decision with a drift-log line, or it is a bug. This PR will produce a
  large diff there; that is expected, and it is expected to be *read*.
- Do not add a token. Dark has all 117 already; if a surface needs a role it
  does not have, that is a change to the model and it applies to light too.
- Do not chase the accent count here. Dark's three hues are real and they are
  `11-3`'s.
- Do not measure a state role by reading its rgba string. See the gates.

## Gates

- `token-contrast.test.ts` green — and note it currently checks `bg` against
  `on` and `onMuted` only. `11-3` extends it; until then, check the state roles
  by hand and composite first.
- **Every contrast figure in this PR must be composited before it is a ratio
  (R35).** Dark expresses `hover` and `selected` as translucent white overlays.
  A script that reads the first three numbers out of `rgba(255,255,255,0.1)`
  sees opaque white and reports the theme as broken. R35 nearly caused a fix to
  a defect that did not exist, and this is the PR most exposed to it.
- No surface in dark shares an `onMuted`, a `border` or a state overlay with
  another surface unless there is a comment saying why.
- `page.bg` and `chrome.bg` differ by enough to read as different surfaces —
  state the ratio.
- Screenshots in **dark** of: Home, one directory, an entity page, the reader,
  a form, and the profile. Light screenshots too, unchanged, to prove nothing
  leaked.
- Suite green; `npx tsc --noEmit` and `npm run build` clean.

## References

`01-token-model.md` §2 (surfaces carry their foreground; `on-muted` is not a
global grey); design language §2, §3, §5, §12.8, §14; R35 (composite before you
divide); R45 (the card shadow); D90 for the worked example of a surface whose
ink was borrowed from another one, and what fixing it looked like.
