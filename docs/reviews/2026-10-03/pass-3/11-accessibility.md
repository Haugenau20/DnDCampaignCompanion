# Third-pass accessibility and interaction review

Reviewed commit: `0ba261205f2a55082a0560f1c68861a463fb8f89`, the head of PR #197.
Application source remains identical to `64fe19512b1d3bd14427fad8996403a742fbe8a9`.
Reviewer: GPT-6.1 Sol, xhigh. Date: 2026-10-03.

**Six accessibility/interaction findings are confirmed, all medium severity.**
The coordinator's actual-component Chromium run completed successfully with
real keyboard events, geometry and an accessibility-tree check. Assertions
characterize the reported failures; they are diagnostics, not implementation
fixes. Bounded contrast/name checks passed in both themes, while computed
styles and screenshots separately confirmed invisible Button focus.

This report owns interaction barriers, not the previously reported save,
search-index, attachment-identity or account-lifecycle defects. No production
source, existing tests, dependencies, rules, configuration or backlog changed.
The reviewer prepared temporary diagnostics; the coordinator builds and runs
them centrally. The stopped authentication/account-lifecycle assignment was
not resumed or replaced.

## Contracts, scope and limits

Read `AGENTS.md`, current `TODO.md`, the live behavioural tracker, both prior
summaries and the [third-pass plan](plan.md). Current requirements include
[design language §10](../../../design/design-language.md), the
[palette keyboard contract §5.4](../../../superpowers/specs/2026-09-02-header-command-palette-design.md),
[quick add and attachment §4–5](../../../design/plan/15-entity-authoring/00-entity-authoring.md),
the [dialog contract §6](../../../design/plan/00-surface-routing.md), and the
[contrast pairing contract](../../../design/colour-schema.md).

| Surface | Inspected paths under `/workspace/DnDCampaignCompanion/` | Evidence boundary |
|---|---|---|
| Native fields, buttons and modal decisions | `src/core/components/{Input,Select,Button,Dialog,Typography}.tsx`; `src/shared/components/quick-add/{QuickAddForm,QuickAddDialog,quickAddSpecs}.tsx/.ts` | Actual component rendering, real browser keys and Chromium accessibility tree; create IO replaced with an unused synthetic callback during invalid submission. |
| Relation picking | `src/shared/components/attach-tray/{AttachTray,attachCandidates}.tsx/.ts`; callers in NPC, quest, location and rumour editing | Actual tray and candidate builder with synthetic NPCs; attach/detach callbacks record intent and update local state. Persistence is not exercised. |
| Palette and navigation | `src/shared/components/command-palette/{CommandPalette,SearchTrigger,useCommandPaletteKeys}.tsx/.ts`; `src/shared/hooks/usePopoverKeys.ts`; app header/navigation; create and context/user menu components | Actual palette presentation and keyboard hook with synthetic search/results/navigation. Menu/header source inspection is not a complete signed-in browser journey. |
| Reader drawer | `src/features/storytelling/stories/components/{ChapterRail,ChapterReader}.tsx`; `src/pages/story/StoryPage.tsx` | Actual rail with 30 synthetic chapters at its phone CSS breakpoint, composed before reader controls as the page does. Reader loading/progress services are excluded. |
| Feedback, contrast and touch affordances | Shared inline editor, row ladder, image upload control; core theme CSS, theme context and contrast tests; entity-authoring design | Bounded browser controls use repository CSS and both actual themes. Source review covers error/name recipes and existing target-size fixes. Physical touch input, real device keyboards and every rendered colour pair are excluded. |

The harness imports actual shipping components and themes; webpack substitutes
only the specified search, campaign, navigation, quick-add context and create
IO seams. It does not mount `App`, Firebase, authentication or production data.
Browser keyboard/geometry observations are kept separate from source-traced
page composition and persistence consequences. No screen-reader speech engine
is run; Chromium's accessible tree is evidence about names/descriptions, not
a claim about exact NVDA, VoiceOver or TalkBack announcements.

## Confirmed findings

### A11Y-001 — The attachment tray intercepts keys intended for its filter and action buttons

**Severity:** medium. **Confidence:** high. **Classification:** new interaction defect, distinct from DATA-008's
untyped attachment identity and DUP-001's rumour-name drift.

**Source evidence:**

- [src/shared/components/attach-tray/AttachTray.tsx:158](../../../../src/shared/components/attach-tray/AttachTray.tsx#L158)
  handles Arrow keys, Enter and Space without checking the event target. Lines
  176–180 prevent default and toggle the current candidate for either activation key.
- [AttachTray.tsx:293](../../../../src/shared/components/attach-tray/AttachTray.tsx#L293)
  attaches that handler to the entire open tray at line 303, above the filter,
  Close button and create escape hatch at lines 314–329 and 370–379.
- [src/pages/quests/QuestDetailPage.tsx:474](../../../../src/pages/quests/QuestDetailPage.tsx#L474)
  mounts it for the ordinary people relation; the NPC, location and rumour
  callers use the same component.

**Requirement and reachable trigger:** the filter is an accelerator for a
browsable relation list, and the explicit Close/create controls must remain
keyboard operable. Open a populated tray, type an NPC's first name into Filter,
then press Space to continue the full name. Alternatively, focus Close or
“No such person yet — add one” and press Enter.

**Expected:** Space enters a character in the textbox; Enter activates the
focused button; only a list option toggles its relation. **Actual:** those
events bubble to the tray-wide list handler, which prevents the native action
and toggles the active candidate. This blocks multiword filtering and can
attach or detach a record when the user meant to close the picker or create a
missing record. Actual persistence follows the caller and is not claimed from
the synthetic callback.

**Reproduction and observed outcome:** the
[browser diagnostic](evidence/probes/accessibility/browser.cjs) filled `Ada`
and pressed real Space: the value stayed `Ada` and `onAttach('ada')` ran.
Enter on Close invoked `onDetach('ada')` and left the listbox open. Enter on
the create hatch attached Ada again and made zero create calls. Escape closed
the list and restored the Attach trigger. All four checks passed, proving
both the specific barrier and the preserved exit control.

**Fix and validation:** bind option navigation/activation to the listbox or
check that the event originated from an option. Preserve Escape across the
whole tray if desired, without capturing textbox editing or native button
activation. Verify Space in a multiword filter, caret Arrow keys, Enter/Space
on both action buttons, and Arrow/Enter/Space on list rows. Check actual caller
payloads to ensure that cancelling/filtering never changes a relation.

### A11Y-002 — Palette arrow navigation selects results outside the visible scroll area

**Severity:** medium. **Confidence:** high. **Classification:** new visual keyboard barrier; not
FUNC-004's dropped creation name or REACT-006/007's stale search results.

**Source evidence:**

- [src/shared/components/command-palette/useCommandPaletteKeys.ts:50](../../../../src/shared/components/command-palette/useCommandPaletteKeys.ts#L50)
  updates virtual selection on ArrowDown/ArrowUp; Enter commits it at line 61.
- [src/shared/components/command-palette/CommandPalette.tsx:156](../../../../src/shared/components/command-palette/CommandPalette.tsx#L156)
  supplies only `setSelectedIndex` for movement. The result rows at lines
  234–247 change selected styling, but no selection effect scrolls them into view.
- [CommandPalette.tsx:293](../../../../src/shared/components/command-palette/CommandPalette.tsx#L293)
  puts all rows inside an `overflow-y-auto` panel capped at `70vh` on desktop;
  virtual DOM focus remains on the combobox at lines 302–314.

**Requirement and reachable trigger:** virtual-focus movement must keep the
active option visible so a sighted keyboard user can identify the result
before opening it. Search a campaign with more matching rows than the panel
can display, then repeatedly press ArrowDown into the later matches.

**Expected:** only the palette's scroll area moves enough to keep its selected
row visible. **Actual:** the selected index and `aria-activedescendant` can
continue beyond the viewport while the panel remains at its original scroll
position. Enter still opens that invisible selection. A live option id proves
semantic linkage, not visibility; this consequence requires browser geometry.

**Reproduction and observed outcome:** with 35 synthetic two-line NPC results
at 1280×720, 22 ArrowDown presses selected `cmdk-option-npc-person-22` while
focus remained in the input. Its rectangle was y=1602–1688; the visible panel
was y=90–594 and its `scrollTop` remained zero. Enter navigated to
`/npcs/person-22`. The [screenshot](evidence/outputs/accessibility/palette-offscreen.png)
shows only early rows and no selected row. Escape on a second open returned
focus to the trigger. All checks passed with the corrected repository CSS.

**Fix and validation:** when virtual selection changes, adjust the palette's
own scroll container to reveal the active option with nearest alignment.
Do not scroll the document behind it. Verify bottom and top boundaries,
create-command selection, filter/query reset and a phone viewport with real
bounding rectangles; retain the valid active-descendant and Enter contracts.

### A11Y-003 — Quick add steals its own modal's focus-return target

**Severity:** medium. **Confidence:** high. **Classification:** new composition defect in the existing modal
focus implementation, not a refiling of fixed portal bug #150.

**Source evidence:**

- [src/core/components/Dialog.tsx:207](../../../../src/core/components/Dialog.tsx#L207)
  captures `document.activeElement` in its open-panel effect at line 211,
  then focuses the panel; cleanup restores that captured element only if it
  remains in the document at lines 218–224.
- [src/shared/components/quick-add/QuickAddForm.tsx:96](../../../../src/shared/components/quick-add/QuickAddForm.tsx#L96)
  focuses its name field in a child mount effect when `autoFocus` is true,
  which is the default at line 73.
- [src/shared/components/quick-add/QuickAddDialog.tsx:47](../../../../src/shared/components/quick-add/QuickAddDialog.tsx#L47)
  mounts that form inside the actual Dialog without overriding autofocus.

**Requirement and reachable trigger:** modal dismissal should return the
keyboard user to the control that opened it. Open Add NPC/quest/location with
the keyboard, then cancel or press Escape before typing.

**Expected:** dismissal returns focus to the opener, preserving the user's
place in the directory or relation form. **Actual:** the child
focus effect runs before the parent focus-capture effect, so Dialog records
its own field rather than the opener. That field is removed on dismissal and
cannot be restored. Keyboard focus therefore falls to the document body;
continuing with Tab can lose the user's local place. The generic dialog's
ordinary focus tests do not exercise a child that takes focus first.

**Reproduction and observed outcome:** opening actual `QuickAddDialog` from
a focused trigger moved focus to its dialog panel. Escape without typing
removed the dialog and left `document.activeElement` equal to `BODY`, even
though the opener remained mounted. A separate actual Dialog without child
autofocus passed panel entry, Shift+Tab/Tab wrap and Escape return to its
opener. This verifies a composition failure rather than a general absence of
modal focus handling. Cancel and nested quick add are fix-validation cases,
not additional executed journeys.

**Fix and validation:** capture the opener before rendering descendants that
may take focus, or centralize initial focus in Dialog so its opener capture
always happens first. Preserve an intentional initial-field target without
overwriting the return target. Verify Escape, Cancel, successful add-and-stay,
and nested quick add from an attachment tray; navigation after a successful
create should focus the new page's appropriate control instead.

### A11Y-004 — The chapter drawer leaves keyboard focus on the obscured reader

**Severity:** medium. **Confidence:** high. **Classification:** new keyboard/focus defect in the small-screen
presentation. T026's reported physical touch-scroll problem remains a
separate known, unverified concern.

**Source evidence:**

- [src/features/storytelling/stories/components/ChapterRail.tsx:229](../../../../src/features/storytelling/stories/components/ChapterRail.tsx#L229)
  conditionally renders a fixed drawer and pointer-dismiss backdrop, with no
  focus entry/return, keyboard exit or modal semantics at lines 229–251.
- [src/pages/story/StoryPage.tsx:182](../../../../src/pages/story/StoryPage.tsx#L182)
  places the rail before reader content in DOM order; its Chapters trigger
  at lines 195–206 only sets open state.

**Requirement and reachable trigger:** a drawer whose scrim blocks the reader
must let a keyboard user operate the visible chapter choices and return to
the reader. At a width below `lg`, use a hardware keyboard or switch input to
activate Chapters, then press Tab or Escape.

**Expected:** focus enters the drawer, stays in its usable controls while it
is open, and returns to Chapters on dismissal; Escape closes it. **Actual:**
focus remains on Chapters behind the scrim. Because
the drawer precedes that trigger in DOM order, the next forward Tab goes into
reader controls behind it. Escape has no handler. The keyboard user is left
operating the obscured reader until they navigate backwards or traverse the
document to locate the drawer. The drawer also lacks a named modal boundary
for assistive technology.

**Reproduction and observed outcome:** actual ChapterRail with 30 chapters
at 390×844, rendered in the page's rail-before-reader order, opened on Enter
while focus stayed on Chapters. Tab moved to the synthetic reader's Edit
chapter control behind the drawer; Escape left the visible Close chapter
list control and drawer mounted. There were zero modal roles. The
[screenshot](evidence/outputs/accessibility/drawer-focus.png) records the open
drawer. This verifies browser keyboard behaviour at a CSS breakpoint, not
physical-phone touch scrolling or a full signed-in StoryPage.

**Fix and validation:** give the overlay explicit focus entry, containment,
return and Escape handling with named dialog semantics, while preserving
the persistent desktop navigation. Verify phone/tablet keyboard journeys,
chapter selection, Close/Escape and backdrop dismissal. Separately reproduce
T026 on the originally affected phone; this fix alone cannot establish that
touch scrolling works.

### A11Y-005 — Quick-add validation supplies neither field descriptions nor a submission announcement

**Severity:** medium. **Confidence:** high. **Classification:** new validation-feedback
barrier; #251's label association is fixed and is not refiled.

**Source evidence:**

- [src/core/components/Input.tsx:143](../../../../src/core/components/Input.tsx#L143)
  renders input/textarea without binding its message as an accessible
  description. Its error paragraph at lines 168–175 has no id or live role.
- [src/shared/components/quick-add/QuickAddForm.tsx:108](../../../../src/shared/components/quick-add/QuickAddForm.tsx#L108)
  stores field errors and returns on invalid submission without moving focus
  or publishing a validation summary. The form uses `noValidate` at line 155.
  Lines 157–176 pass visual errors and `aria-invalid`, but no description.
- [src/core/components/Select.tsx:128](../../../../src/core/components/Select.tsx#L128)
  already binds its own message through `aria-describedby`; the Input
  primitive does not provide the corresponding contract.

**Requirement and reachable trigger:** field validation must expose the reason
alongside the invalid field, and a failed submission must make the new errors
discoverable without sight. On Add NPC, leave the required fields empty,
focus Create & open and activate it with Enter.

**Expected:** announce a validation result or focus the first invalid field,
and expose each reason as that field's description. **Actual:** both error
paragraphs appear visually, but focus stays on the unchanged submit button.
No alert/live region is inserted, and neither field describes the reason.
The existing name association and invalid flag help once the user finds the
fields; they do not explain the failure where submission left the user.
Someone relying on speech output must search surrounding prose to determine
why nothing happened. Exact spoken behaviour remains screen-reader dependent.

**Reproduction and observed outcome:** the actual form and validator rejected
empty submission with zero create calls and retained focus on Create & open.
Both labelled fields had `aria-invalid="true"` and visible reasons (“Give
them a name.” / “Say who they are, in a line.”), but no description link and
zero alert/live regions. Chromium's Name-field accessibility node correctly
had name `Name` and invalid state, with no error description. The diagnostic
passed. Error text is ordinary readable prose in the document; the finding
concerns its absent field association and absent submission-notification
mechanism, not a claim that a screen reader can never find the text.

**Fix and validation:** give Input messages stable ids and merge their ids
into `aria-describedby`, retaining caller-supplied descriptions; derive
invalid state from an error unless callers deliberately override it. Give
QuickAddForm a focused invalid field or live validation summary on failure.
Verify input and textarea errors, multiple fields, helper-to-error replacement,
error removal and existing external descriptions in the accessible tree, then
test a real screen reader. Do not duplicate the separate write-error alert.

### A11Y-006 — The shared Button recipe suppresses the visible keyboard focus indicator

**Severity:** medium. **Confidence:** high. **Classification:** new residual
cascade defect. D109's old invalid CSS/default-blue-ring problem was fixed;
this is the separate current utility override, not a claim that the old CSS
was left unchanged.

**Source evidence:**

- [src/core/components/Button.tsx:101](../../../../src/core/components/Button.tsx#L101)
  adds `focus:outline-none` to every Button variant and to links that reuse
  `buttonClasses`. The suggested ring replacement on that line is commented
  out. The shared `.button` styles provide no replacement focus state.
- [src/styles/globals.css:42](../../../../src/styles/globals.css#L42)
  supplies the intended global `:focus-visible` outline inside the Tailwind
  base layer. In the generated CSS, the later utility layer's
  `focus:outline-none` sets a solid 2px **transparent** outline instead.
  [src/core/themes/css/variables.css:21](../../../../src/core/themes/css/variables.css#L21)
  declares that utilities outrank base/application layers.
- [src/shared/components/quick-add/QuickAddForm.tsx:209](../../../../src/shared/components/quick-add/QuickAddForm.tsx#L209)
  uses ordinary outline and primary Buttons for both create actions; the same
  recipe is used by many other shipping page/dialog actions.

**Requirement and reachable trigger:** keyboard focus must be visible
([acceptance criterion](../../../design/plan/02-acceptance-criteria.md#phase-0--foundations--bug-fixes);
WCAG 2.4.7). Tab to an ordinary enabled Button, such as Create & open or
Create & add another.

**Expected:** an unmistakable visible focus outline/ring or equivalent state
change. **Actual:** focus moves to the control and `:focus-visible` matches,
but the outline is transparent, there is no shadow/ring and the primary
button's foreground/background stay unchanged. The keyboard user cannot see
which action will receive Enter/Space. This is independent of the modal's
focus location, the drawer and the palette's selected-row visibility.

**Reproduction and observed outcome:** the actual primary and outline Button
variants were reached with real Tab in both themes. All four had
`:focus-visible=true`, `outline-style:solid`, `outline-width:2px`,
`outline-color:rgba(0,0,0,0)` and `box-shadow:none`. The primary button's
colours exactly matched its unfocused state. Reviewed
[light](evidence/outputs/accessibility/button-focus-light.png) and
[dark](evidence/outputs/accessibility/button-focus-dark.png) screenshots
confirm no visible focus marker. The CSSOM guard verified that actual theme
component rules were loaded before measurement. The bounded axe contrast/name
checks returned zero violations; they do not measure this focus barrier.

**Fix and validation:** remove the suppressing utility or provide an explicit
focus-visible recipe that wins the cascade and meets the theme's focus
contrast requirement. Apply it to `buttonClasses` so Button-styled links share
the correction. Verify computed styles and screenshots after keyboard Tab,
both themes, primary/outline/ghost/link variants and representative page and
dialog actions. Preserve ordinary pointer/disabled behaviour; a class-name
assertion alone cannot verify the rendered focus indicator.

## Verification

Prepared diagnostic commands, run by the coordinator with Node 22:

```bash
/tmp/code-review-runtime/node_modules/.bin/node /tmp/pass3-accessibility/build.cjs
/tmp/code-review-runtime/node_modules/.bin/node /tmp/pass3-accessibility/browser.cjs
```

Build uses installed webpack/Babel and the application's normal
style-loader/css-loader/postcss-loader path for actual Tailwind/theme imports.
The browser script serves four static files from an ephemeral loopback-only
HTTP server, blocks requests to every other origin, and closes server/browser
on success or failure. All findings use the final successful run, with a
CSSOM guard confirming the actual theme component rules are present.

| Check | Observed result |
|---|---|
| Actual populated attachment tray | Space/Close/create-hatch interception reproduced; Escape preserved. A11Y-001. |
| Actual long-result palette | Live selected option completely outside the panel; Enter commits it. Escape returns focus. A11Y-002. |
| Actual QuickAddDialog composition | Entry focuses panel; untouched Escape closes to BODY. Generic Dialog entry/wrap/return passes. A11Y-003. |
| Actual rail at 390×844 | Entry focus remains behind overlay, forward Tab reaches reader action, Escape does not close. A11Y-004. |
| Actual quick-add validation/Input | Both reasons visible, no linked descriptions/live mechanism, focus unchanged, zero writes; Name label/invalid state present in Chromium AX. A11Y-005. |
| Actual Buttons in light/dark | Four keyboard-focused variant/theme cases have transparent outlines and no ring; screenshots reviewed. A11Y-006. |
| Bounded contrast/name/label controls | Zero axe violations and zero incomplete results in either theme, for only the rendered primary/outline actions, secondary card text, error text and labelled native Select/helper. No broader conformance claim. |
| Runtime isolation | Zero browser page errors; browser routes permit only the ephemeral local origin. No Firebase, paid API or external IO was invoked. |

The [five small probe inputs](evidence/probes/accessibility/),
[build log](evidence/outputs/accessibility/build-results.txt),
[browser log](evidence/outputs/accessibility/browser-results.txt) and
[structured observations](evidence/outputs/accessibility/observations.json)
are saved by the coordinator. Copy the five inputs into
`/tmp/pass3-accessibility` before replaying the commands above; generated
bundles and axe's dependency source are rebuilt rather than archived.

Two preparatory navigation attempts failed before complete coverage: policy
blocked `file://`, then hash-only page changes did not remount the harness.
The initial manual CSS pipeline also omitted imported theme rules; its focus/
contrast outputs were discarded, including a spurious dark Select contrast
failure. The final normal CSS import path removed that contrast result while
independently reproducing all six reported root causes. These harness failures
are not application findings and their partial outputs are not used as evidence.

No geometry assertion is inferred from jsdom or from Tailwind class names.
No existing test or full suite is executed by this reviewer; the byte-identical
source baseline's gates are reused by the coordinator as the third-pass plan
specifies.

## Reconciliation and exclusions

- T075 already includes the narrow-header overflow/crowding below roughly
  380px. It remains known work, not a new accessibility finding. This harness
  does not mount a complete signed-in header or decide the future site name.
- T026 remains a reported physical-phone touch-scroll concern. A11Y-004
  addresses separate keyboard focus and dismissal; neither CSS inspection nor
  desktop-emulated width proves touch behaviour on the affected device.
- Fixed #251 label associations and #150 open-on-mount portals remain fixed.
  The Input message and autofocus-composition issues concern different seams.
- FUNC-005/FUNC-006 save/delete recovery, FUNC-004 named palette creation,
  REACT-001/002 editor identity/error teardown, REACT-003/004 note autosave
  loss/feedback, REACT-006/007 index/query lifecycle and DATA-008 attachment
  identity are prior findings, not renamed accessibility counts. Fixes to
  those workflows should preserve focus and announce recovery, but their root
  causes are not duplicated here.
- DUP-001 owns raw/empty rumour names in attachment candidates and inbound
  links. The keyboard probe uses two correctly named NPCs to isolate the
  unrelated event-capture defect.
- Native Select semantics, authored word-based state controls, field labels,
  alert-based write errors, and existing responsive ladder/detach target fixes
  were inspected. Their presence is not a WCAG certification or proof that
  every user journey has correct announcements or targets.
- Complete menus/header journeys, nested-modal interactions, forced-colour
  modes, 200–400% zoom, reduced-motion preferences, all contrast pairs,
  physical touch/virtual keyboards, screen-reader speech and Windows/macOS/
  Safari/mobile-browser differences remain outside executed coverage.
- Credentials, invitations, account deletion, sign-in/access policy, external
  AI calls, real mail, production data, billing and deployment are excluded.

No finding quota or generic checklist was used. Suggested regression checks
are focused on the specific reachable failures and preserved controls above;
they are recommendations, not added product tests or implemented fixes.
