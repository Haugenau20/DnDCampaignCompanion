# PR 10.2 — Named and counted

Phase 10 · third PR · independent of 10.0 and 10.1

> **Measured, and this is the finding the phase turns on: not one A5 suite uses
> `unnamedControlsIn`, `formAccentsIn` or `unnamedButtonsIn`.** Every A5
> component has a test file — 20 of them, across privacy, contact, profile,
> admin and auth — and none is gated on whether its controls have names or its
> surfaces have one accent.
>
> Phase 8 discovered the same shape from the other end: R19 found that phase's
> real work was 17 unnamed controls rather than the repainting its brief
> described. Here the controls are unmeasured rather than known-bad, which is a
> weaker claim and a worse position: nobody knows.

So this PR measures, then fixes what it finds.

## Scope

- Test files across A5: `PrivacyPolicyPage`, `ContactPage`, `ProfilePage`,
  `AdminPanel` and its four views, the nine profile cards, `SignInForm`,
  `RegistrationForm`, `PrivacyNotice`, `SessionTimeoutWarning`
- whichever A5 components the gates find fault in
- `src/test-utils/accessible-names.ts` — only if item 4 is taken

## Do

1. **Add the two gates to every A5 suite that renders controls.** One test
   each, the same two the entity forms carry:
   ```
   expect(unnamedControlsIn(container)).toEqual([]);
   expect(formAccentsIn(container)).toHaveLength(1);   // or 0, where nothing writes
   ```
   The accent count is not always 1 — a privacy page writes nothing and should
   have none. Pick the right number per surface and say why in a comment, since
   a wrong expectation here is worse than no test.
2. **Add `unnamedButtonsIn` too**, and expect it to find things. A5 has **40
   `startIcon` usages** and only 4 files carrying any `aria-label`, so an
   icon-only button with no name is likely — and `unnamedControlsIn` cannot see
   buttons at all (R34), which is why this is a separate call rather than a
   stronger version of the same one.
3. **Fix what the gates find, in the component.** Not in the test, and not with
   a `placeholder` — a placeholder is the name a control has until someone
   types in it, which is to say it is not a name, and that is written into
   `accessibleNameOf` for exactly this reason.
4. **Decide whether to close R34 here, and record the decision either way.**
   R34 is the finding that `NAMEABLE` is `"input, select, textarea"`, so
   buttons pass 8.1's gate unseen. Extending it was measured in 9.2: it fails
   **5 suites** — `SagaEditPage`, `QuestCreateForm`, `QuestEditForm`,
   `LocationCreateForm`, `LocationEditForm` — and in `QuestCreateForm` the **6
   offenders are rendered by the real `Button`, not a stub**. Those are real
   unnamed controls in A3's forms.
   This PR is the natural home for that work: it is the gate-adoption PR, and
   Phase 8 is closed so nothing else will pick it up. But it is a second
   archetype's worth of fixes, so it is a judgement about PR size rather than
   about correctness. Take it or log it — do not leave R34 unmentioned.

## Do not

- **Do not stub your way to green.** D75, R28 and R33 are the same lesson three
  times: a stub laxer than its component turns a real gate into a green light.
  R33 is the worst case to learn from — a `Button` stub that dropped
  `aria-label` made a correct component look broken, and an `Input` stub that
  dropped `helperText` made rendered text look missing. If a stub is in the
  way, fix the stub.
- **Do not let an absence assertion stand alone.** R31: a test that asserts
  only that something is missing passes against a component that rendered
  nothing at all. Where a gate expects an empty array, assert something
  positive alongside it — that the form has the controls you think it has.
- Do not restyle anything. This PR adds names and counts accents; it does not
  move a pixel.
- Do not add `aria-label` to a control that already has a visible label. Two
  names is one too many, and the `aria-label` wins — which is how a visible
  label becomes decorative without anyone noticing (D89 hit this).

## Gates

- Every A5 suite that renders a control asserts both gates, and each assertion
  is accompanied by something positive so it cannot pass vacuously.
- The suite grows only by the new tests; no existing count moves.
- Any component change is a name or an accent variant, never a layout or a
  colour — the diff should read as boring.
- If R34 is taken: `NAMEABLE` includes `button`, buttons are named by their own
  text, and all 5 previously-failing suites pass on fixed components rather
  than on relaxed expectations.
- If R34 is not taken: a drift-log line saying so, and why, so the next reader
  does not have to re-measure it.

## References

R34 (the gate's blind spot, with the measured blast radius); R31 (a vacuous
absence assertion); R33, R28, D75 (stubs); D66, D78, D80 (what an accent
marks); `accessible-names.ts` and `accent-budget.ts`; A5 in
`../05-archetypes.md`.
