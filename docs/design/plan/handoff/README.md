# Handoffs

One markdown per PR, written for Claude Code to execute without further
context. Each is self-contained: read the file, do the work, open the PR.

Handoffs are written **as a phase starts**, not up front — the same reason
`00-transition-plan.md` deferred the 2a/3a choice. A handoff written three
phases early is a guess with a checklist attached.

Currently written: Phase 6 (`06-0` … `06-3`, done); Phase 7 (`07-0` … `07-2`
done, then `07-2-5` -- a redo of the NPC page against a design mock, which
absorbed `07-3`. Phase 7 is complete; `07-3` is kept for the record with a note
saying where its work went, R18); Phase 8 (`08-0` … `08-3`, done); and Phase 9
(`09-0` … `09-3` done, so Phase 9 is complete); and Phase 10 (`10-0` done; `10-1` done but **narrowed to `ProfilePage` alone**,
R39; `10-2` and `10-3` done, so Phase 10 is
complete); and Phase 11 (`11-0` … `11-3` done, so Phase 11 is complete).

`09-0` settled Q10 as D82/D83 and answered its own "where do rendered notes
appear" as D84: **nowhere**. That narrows what follows — `09-1` renders two
surfaces rather than three, and `09-2` still moves `NoteEditor` onto `Input`
for the label association but gives it **no toolbar**, so its item 6 (the
markdown hint) applies to the chapter and saga forms alone. Amend `09-2` when
it starts rather than reading it as written.

`09-1` settled the `BookViewer` question its own text left open — pagination
stays and now breaks on block boundaries (D85, D86) — and pulled the
code-splitting lever D82 had deferred (D87). **That closes `09-3`'s item 2**,
so `09-3` is down to three items: the rail's surface (Q17), `LatestChapter`
(Q18), and the `ChaptersPage`/`BookshelfView` read. Its item 2 needs only a
line saying D85 exists.

`09-2` built the toolbar (D88) and converted the note body onto `Input`
(D89) — the owner's call, made after measurement found the handoff's stated
reason for it already satisfied. Its two findings are worth reading before the
next PR that touches a form: **R33**, the stub pattern for the fifth and sixth
time, with the shape of a stub that cannot go stale; and **R34**, the
accessible-name gate being structurally unable to see a button, which turns out
to hide 6 real unnamed controls in `QuestCreateForm` alone. R34 is a
forms-and-A3 job, not a Phase 9 one.

`09-3` closed the phase: the rail is `sunken` with its own ink (D90, settling
Q17 and fixing R32), `LatestChapter` is retired (D91, settling Q18), and
`ChaptersPage`'s two empty states adopt `RosterEmpty` (D92). Read **R35**
before Phase 11: a contrast check that touches a `hover` or `selected` role has
to composite the rgba overlay first, or it will report dark as broken every
time — it nearly caused a fix here to a defect that did not exist.

Phase 10 is four PRs, written from a measurement of all 26 A5 files rather than
from the rollout's paragraph (R36). `10-0` and `10-1` are the phase's real
work and run in that order — **none of the four A5 pages uses `PageShell` or
`usePageGate`**, so this is a composition phase, not the repainting its brief
describes. `10-1` turned out to be half the work its table describes: `AdminPanel` has no
route and no page frame, so it was deferred whole (R39), taking `10-3`'s item 2
and R40's contrast defect with it. Two findings from what remained are worth
reading first: **D95**, the gate could not express "signed in is enough" and a
third `requires` value had to exist before an account page could adopt it; and
**R40**, the header's `navigation-item` classes are used in two places that are
not the header and fail contrast in both — 1.09:1 for the admin panel's
selected tab. That is D90's defect, unfixed, in the two consumers D90 did not
check.
`10-2` adopted the gates on 23 A5 suites and **took R34** (D98). Read D98
before extending any test helper: adding `button` to `NAMEABLE` alone fails 11
suites rather than 5, because `accessibleNameOf` had no name-from-contents
branch, and six of those eleven are correctly labelled submits that a trusting
reader would "fix" into D89's defect. The gates found 4 placeholder-only
controls in A5 and 14 unnamed icon-only buttons in A3 (R42). `10-3` is independent, holds the measurement for the record,
and corrects `09-2`'s claim that `NoteEditor` was the last raw textarea — it
was not; `ContactForm` in `src/shared/` still has one.

`10-3` closed the phase. `ContactForm`'s textarea is on the primitive and
09-2's "last one" claim is corrected (D100, R43) — and the grep that produced
that claim is now a test, `raw-controls.test.ts`, which walks all of `src` and
immediately found the one raw `<select>` this codebase keeps on purpose. The A5
read confirmed three of A5's four rules and found the fourth **worded wrong**:
"Sans throughout" is true of an A5 page's body and false of its headings, all
of which are serif by inheritance, as §4 says titles should be. `05-archetypes.md`
is amended (R44).

Phase 11 is four PRs, written from a measurement of the theme layer rather than
from `04-rollout.md`'s paragraph — the fifth phase running where that was worth
doing, and the second where the paragraph was wrong about the *premise* rather
than the scope. **`04-rollout.md` says dark "gets real values for every surface
pair instead of fallbacks". Dark defines all 117 token properties, the same as
light, and one fallback chain survives in all of `src`.** Dark is migrated and
untuned: five surfaces sharing one ink, one muted grey, one border and one pair
of state overlays, with chrome and page at ~1.2:1 where light is ~14:1. That is
`11-2`, and it is the phase's real work.
`11-0` deletes medieval and takes two already-dead things with it — `theme-utils.ts`
(99 lines, zero callers, returning eight class names that exist in no
stylesheet: the sixth stranded module) and `.decoration-scroll`. **Done** (D102):
it also took a third, `public/decorative/`, which its `src`-only measurement could
not see (R47). Two findings worth reading before `11-1`: the retired name lives in
**two** stores, `localStorage` and `users/{uid}.preferences.theme`, and only the
first is in the handoff; and the deletion **strengthened** two gates rather than
shrinking them — medieval's 1.38:1 exemption from the 3:1 boundary check and the
last status-hue ratchet are both gone, so both remaining themes now face the real
bar with no exemptions anywhere. `11-1` answers
Q16 with `color-scheme`, which is set nowhere today and is why R22's dark
`<select>` popup is white. **Done** (D103): the scheme is **declared** as the
model's first enum token rather than derived from the theme's name, because
Phase 12 hands this model to a package whose consumers name their own themes —
and Q2 now has a worked answer in the app, since `scheme: 'drak'` would pass
every existing gate and then be silently dropped by the browser. Two findings
for `11-2`: the four scrollbar rules in the handoff's table were **not** the ones
painting scrollbars — `globals.css` had four more with broader reach, and the
cascade reasoning about which won was wrong until a control experiment settled it
(R48); and `11-0`'s deletion left medieval's *data* in two JSON fixtures, unseen
by a gate that grepped for a CSS selector (R49). **When deleting a theme, ask
what holds theme data as well as what holds theme code** — `11-2` reads a
baseline diff closely and wants that file clean. `11-3` reduces dark's three accent hues to one and
extends `token-contrast.test.ts` to check state roles **with compositing** —
the gap R35 recorded and the mechanical reason R40's 1.09:1 admin tab went
unnoticed.

`11-2` is **done** (D104, D105). Four things `11-3` inherits:
- **Dark is warm now.** The owner chose light's warm axis over keeping the cool
  blue-slate family, so `11-3`'s one-accent choice lands in a theme whose
  neutrals are already warm — a red in light's own family will sit naturally
  where the blue, purple and soft red currently do not.
- **`page`/`chrome` was 1.03:1, not the ~1.2:1 the handoff recorded**, and chrome
  was very slightly *lighter* than page, so the frame was inverted rather than
  merely weak. It is 1.51:1 now — deliberately ~40% clear of the 1.08–1.12 that
  GitHub, VS Code and Slack spend on the same separation, because a strong frame
  is this product's identity and not a default.
- **Two status hues moved** (`completed`, `failed`). D56 tuned them against the
  old darker grounds and the lighter `card` dropped them to 4.38 and 4.02 as
  text; both are lifted to 4.56. Expect that class of breakage from any further
  ground change.
- **`[data-theme=…]` is down to 1** from 23 at the phase's start, and the
  survivor is documented rather than overlooked (R50). Do not let `11-3` add one.

Read **R51** before extending the contrast gate: every figure in `11-2` was
composited first, the palette was *solved* against target ratios rather than
eyeballed — which is how three gate failures were found before a file was
written — and a control experiment settled a cascade question the spec appeared
to answer the other way. Read **R52** too: light's `field.placeholder` fails AA
at 3.72:1 and nothing gates it; dark's was fixed here and light's deliberately
left alone.

`11-3` closed the phase. Dark spends **one accent** — `#EA9C90`, light's own red
lifted onto a dark ground (D106) — and the handoff's count of three was low: a
**fourth** hue, `field.borderFocus` at `#60a5fa`, was the blue on every focused
field, with the validation family on generic Tailwind values besides. R40 is
closed by one `.nav-item` pair that takes its ink from whichever surface the
container declares (D107), and R40 **undercounted too**: `Navigation.tsx` holds
two nav lists, and the mobile bar sits on a card ground while taking chrome ink
— 1.09:1 in light, in the same file R40 cleared as "the header".

Three findings for Phase 12:
- **R53** — the contrast gate now checks state roles with compositing. Making
  the compositor naive fails **light's** chrome and band as well as dark's, so
  R35's trap was never dark-only.
- **R55** — the manifest gate now collects CSS-local `--name:` declarations
  instead of exempting a prefix, because D107's indirection variables are not
  theme tokens. It still catches a typo in one.
- **R54** — the blue in a native `<select>`'s open popup is the **system**
  accent and is not stylable: `accent-color` does not reach it, and
  `option:checked` with `!important` does not override it, though `option`
  backgrounds *are* respected. Both established by control experiment. Do not
  re-investigate.

The one surviving `[data-theme=…]` rule wants `ornament.strength` as an enum,
which is Phase 12's (R50). `01-token-model.md` §6 now has `scheme` as a worked
example of that shape (D103).

Phase 8 is worth reading in order. `08-0` builds the `Select` that does not
exist, `08-1` adopts it and fixes 17 unassociated labels, `08-2` unifies nine
hand-rolled chips, and `08-3` handles rhythm and actions. Nothing after `08-0`
can start without it, and `08-1` is the one carrying the accessibility fix that
turned out to be the real point of the phase (R19).

Phase 9 is three PRs in a chain plus one that is independent. `09-0` decides and
builds markdown (Q10) and blocks `09-1` (the two reading surfaces adopt it) and
`09-2` (the authoring toolbar). `09-3` depends on none of them and can be taken
first or last: it is the loose ends left by `413259e`, which built most of what
Phase 9 was scoped to build, before Phase 9 started (R29).

Phase 7's optional fourth PR — the image **upload** path — is deliberately not
written. D6 keeps bitmaps out of this project entirely, so it is a handoff for
work that may never be scheduled, and writing it now would be the guess this
section warns about.

## Contract every handoff follows

- **Scope** — the files it may touch. Anything else is out of scope; log it in
  `../03-drift-log.md` rather than doing it.
- **Do** — the change, concretely.
- **Do not** — the adjacent temptations, named.
- **Gates** — what must be green, plus the phase's own checks.
- **Design language references** — the section that decides any judgement call
  the handoff did not anticipate.

Read `../../design/design-language.md` and `../01-token-model.md` before the
first one. When a handoff and the design language disagree, the design
language wins and the handoff is wrong.
