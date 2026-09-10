# PR 11.3 — One accent, and a gate that can see a state

Phase 11 · closes the phase · depends on 11.2

Two things, and they belong together because the second is what would have
caught the first.

## Part one: dark has three accents where the design language allows one

Measured:

| role | light | dark |
|---|---|---|
| `color.primary` | `#8C1D1D` deep red | `#8AB4F8` **soft blue** |
| `color.secondary` | `#6E1717` (the same red, darker) | `#BB86FC` **muted purple** |
| `color.accent` | `#8C1D1D` (the same red) | `#F28B82` soft red |
| `color.emphasis` | `#9A9082` warm grey | `#F28B82` (the same soft red) |

Light spends one hue on everything that acts: `primary`, `secondary` and
`accent` are one red at two values, and `emphasis` is a neutral. Dark spends
**three unrelated hues** — a blue, a purple and a red — and its `primary`, the
one a user meets on every button, is not even the same hue family as light's.

Design language §2: *One accent, earned by action.* "A single accent hue below
the chrome… If a new accent seems necessary, remove one first." §3 is stronger
still, and it is about themes specifically:

> **Every theme keeps this structure.** A theme changes values, warmth and
> ornament strength — never the number of accents or the surface hierarchy. A
> theme that needs a second accent is a signal the design is wrong, not the
> theme.

§13 lists "a theme needs a second accent to look right" as a signal we got it
wrong. Dark needs three.

This is not a repaint for its own sake: the product's identity is supposed to
survive the theme switch, and right now switching to dark changes what colour
"you can act on this" is.

## Part two: the contrast gate cannot see a state, and R40 is what that costs

`token-contrast.test.ts` checks each surface's `bg` against its `on` and
`onMuted`. **It does not check `on` against `hover` or `selected`.** R35
recorded that gap and did not close it, because closing it needs compositing
and the test does pure hex arithmetic.

R40 is the bill for that. The header's `.navigation-item` /
`.navigation-item-active` classes — which paint `--surface-chrome-on(-muted)`
on `--surface-chrome-selected` — are used in **three** places and only one is
the header:

| consumer | ink on ground | ratio | |
|---|---|---|---|
| `app/layout/Navigation.tsx` | `#A79E90` on `#17140F` | **6.94:1** | correct |
| `AdminPanel` tabs, **active** | `#F5F1E8` on `#FCFBF7` | **1.09:1** | invisible |
| `AdminPanel` tabs, inactive | `#A79E90` on `#FCFAF6` | **2.54:1** | fails AA |
| `PrivacySectionNav` links | `#A79E90` on `#F3EFE6` | **2.31:1** | fails AA |

D90 found this exact defect on the chapter rail, measured it at 1.04:1, and
fixed that one consumer with new `.rail-item` classes. It did not check the
others. **All of these fail in light**, which is worth saying out loud in a
phase about dark.

## Scope

- `src/core/themes/definitions/darkTheme.ts` (and `lightTheme.ts` only if part
  one changes a shared role name)
- `src/core/themes/__tests__/token-contrast.test.ts`
- `src/core/themes/css/components.css` — the nav-item classes
- `src/features/user-management/admin/components/AdminPanel.tsx`
- `src/pages/privacy/PrivacySectionNav.tsx`
- `token-values.baseline.json`

## Do

1. **Reduce dark to one accent and one status hue.** Pick the hue deliberately:
   the constraint is §3's structure, not light's specific red — a dark theme may
   well want a different value of the same hue rather than the same hex. What it
   may not have is three. Write down which hue and why.
2. **Extend `token-contrast.test.ts` to check state roles, with compositing.**
   Add a compositing step — `rgba(r,g,b,a)` over the surface's own `bg` — and
   then assert `on` against `hover` and against `selected` per surface. This is
   the check R35 asked for and is the mechanical reason R40 went unnoticed.
   Its first run should fail; that is the point.
3. **Fix the three `navigation-item` consumers with one shared pair, not a
   third copy.** D90 built `.rail-item` / `.rail-item-active` for the rail. Two
   more consumers now need the same thing, and copying it a third time is how
   there come to be four. Build one pair that takes its ink from the surface it
   sits on, and move the rail, the admin tabs and the privacy nav onto it.
   Keep D90's other conclusion: **no accent on the current item.** A nav item is
   navigation, and an accent marks a control that writes (D66), so "you are
   here" is ground, ink weight and `aria-current`.
4. **Re-check the whole app in dark once parts one and two land.** This is the
   last PR of the theme phase, so this is the moment the "dark at parity" claim
   either holds or does not.

## Do not

- Do not add a second accent to dark to make something look right. That is
  §13's listed signal, verbatim.
- Do not fix R40 by nudging the `navigation-item` colours. They are **correct**
  where they belong — 6.94:1 in the chrome. The defect is that they are used
  outside it, and repainting them would break the header to fix the admin panel.
- Do not extend the contrast gate by reading rgba's first three numbers. That
  is R35's mistake and it reports dark as broken every time.
- Do not let the gate's first green run stand without checking it fails on a
  known-bad value. A contrast test that passes because it silently skipped the
  state roles is worse than no test (R31, applied to a gate rather than an
  assertion).

## Gates

- `token-contrast.test.ts` checks `bg`↔`on`, `bg`↔`onMuted`, `on`↔`hover` and
  `on`↔`selected` for every surface in both themes, and is green.
- Deliberately break one state value and watch the new gate fail, then revert.
  Paste the failure in the PR.
- Dark has one accent hue and one status hue. Say which, with the hex.
- `unnamedControlsIn` and the accent-budget helpers still green everywhere —
  moving three components onto shared nav classes must not lose a name or add a
  filled accent.
- Screenshots in both themes: the header, the chapter rail, the admin panel's
  tab bar and the privacy section nav — the four surfaces this PR touches, with
  the active item visible in each.
- `npx tsc --noEmit`, `npm run build`, suite green.

## References

Design language §2 (one accent), §3 (every theme keeps the structure), §13 (the
signals); D66 and D80 (what an accent marks); D90 (the rail's fix, and the
pattern to generalise rather than copy); R32, R35, R40; `01-token-model.md` §8
(what the manifest cannot catch, and why contrast is a separate mechanism).
