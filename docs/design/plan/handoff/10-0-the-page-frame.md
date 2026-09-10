# PR 10.0 — The page frame, on the public pages

Phase 10 · runs first · `10-1` repeats it on the gated pages

> **Phase 10's paragraph in `04-rollout.md` says these pages "need to inherit
> correctly and be readable, not to be interesting". Measured across all 26 A5
> files (4,494 lines), that is more true than it reads — and the inheriting is
> the part that is missing.** See `10-3` for the full measurement; the short
> version is that the colour work is already done and the *composition* is not:
>
> - **Zero hardcoded hex. Zero `[data-theme=…]` patches. Zero raw `<select>`.**
>   Fourth phase running where a repainting brief arrives to find the paint
>   right (R13, R19, R29, and now this).
> - **None of the four A5 pages uses `PageShell` or `usePageGate`.** Every A1,
>   A2 and A4 route does. These four each hand-roll their own page frame, and
>   two of them hand-roll their own signed-out and loading copy.
>
> So Phase 10 is a composition phase wearing a repainting phase's description.
> That is the third time the description has been wrong in the same direction,
> which is why the handoff is written after the measurement rather than before.

This PR takes the two **public** pages, because they have no auth states to get
wrong and therefore prove the frame before `10-1` puts it under one.

## Scope

- `src/pages/PrivacyPolicyPage.tsx` (295 lines)
- `src/pages/ContactPage.tsx` (61 lines)
- `src/pages/privacy/PrivacySectionNav.tsx`, `PrivacyLastUpdated.tsx`,
  `PrivacyDataTable.tsx` — only where the frame changes what they receive
- the matching test files

## Do

1. **Adopt `PageShell`.** Both pages build their own title-and-container
   markup. `PageShell` already owns the page's max width, its title, its
   breadcrumb slot and its actions slot, and eight other routes go through it.
   The point is not tidiness: a page that declares its own frame is a page that
   drifts when the frame changes, and Phase 12 is going to change the frame.
2. **Keep the privacy page's section navigation working.** `PrivacySectionNav`
   is the one piece of real interaction here, and it is the thing most likely
   to break when the container it scrolls inside moves. Check it after, at both
   the wide and the narrow width.
3. **`surface.card` sections on the page ground, one rule between, no
   ornament** (A5). `PrivacyPolicyPage` already renders 6 `Card`s; the work is
   whether they read as one document with parts or as six stacked boxes —
   design language §5 is explicit that inset rules read as one object and boxes
   read as many.
4. **`ContactPage` is 61 lines and renders no `Card` at all.** It is a heading
   and a `ContactForm`. Decide whether the form sits on a card like every other
   form in the product (D79 ratified that for the eleven entity forms) and say
   which, because right now it is neither.
5. **Leave the tables alone.** A5 asks for "rules, not zebra fills" and
   `PrivacyDataTable` already uses `border-b card-divider` on every row.
   Measured, already right — say so and change nothing.

## Do not

- Do not rewrite the privacy copy. It is a legal document that happens to live
  in a component; this PR moves the frame around it, not the words inside it.
- Do not add a gate to either page. Both are public and must stay linkable
  while signed out — that is what makes them the right pair to go first.
- Do not touch `ContactForm`'s internals. Its raw `<textarea>` is real and is
  `10-3`'s, and its 379 lines are a form, not a utility page.
- Do not introduce a serif anywhere. A5 is sans throughout, because nothing
  here is content of the world (§4) — and measured, no A5 file currently
  reaches for a heading or reading face, so this is a property to preserve
  rather than to fix.

## Gates

- Both pages render correctly **signed out**, which is their normal state for a
  first-time visitor arriving from a footer link.
- `PrivacySectionNav` still moves to every section, at 320px and at desktop.
- No new `[data-theme=…]` rule; A5 still has zero.
- `npm run build` and `npx tsc --noEmit` clean; suite green.
- One screenshot per page, light and dark, before and after.
- The narrow-width check uses a 320px iframe, not a resized window — a
  maximized Chrome silently ignores widths below its minimum, and the header's
  known overflow below ~380px is pre-existing and not yours (see `CLAUDE.md`).

## References

A5 in `../05-archetypes.md`; design language §5, §4, §14; D79 for a form's
surface; `PageShell` and `usePageGate` as used by `ChaptersPage`.
