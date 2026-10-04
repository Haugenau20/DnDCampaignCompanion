# Complete-App keyboard journeys

Date: 2026-10-04. Baseline: `4ebd53362c34840871745386b99f7905de75c26a`
(PR #200); application source remains `64fe195`. This review extends the
focused-component accessibility work in
[pass 3](../../2026-10-03/pass-3/11-accessibility.md) to the real App with
synthetic local Firebase records. It implements no fixes.

## Scope and method

The coordinator owns the browser, production build and loopback-only
`demo-review-pass5` emulators. The reviewer supplies a `seed(api)` / `run(api)`
module and uses separate synthetic `pass5-user-keyboard*` /
`pass5-group-keyboard*` contexts for the main run and bounded follow-ups. Ordinary initial navigation and fixture seeding
set up each scenario; every application action under review uses Tab,
Enter, Escape, arrows, Home/End, text insertion or Control+S. No click or
imperative focus is used to make a reviewed journey pass. DOM, Chromium's
partial accessibility tree and Firestore readback are observational checks.

The inspected source includes the complete layout/navigation shell, account
and group/campaign menus, shared menu/dialog/quick-add/attachment contracts,
NPC/location/quest inline editing, command palette, note editor and chapter
form/reader/rail. AGENTS.md, TODO.md, the current bug tracker and summaries for
passes 1–4 were reconciled before identifying new issues. The existing
A11Y-001–006, FUNC-005/006, REACT-002/003/004 and fourth-pass recovery issues
retain their original ownership.

**Two additional focus issues are confirmed: one medium and one low, both high
confidence.** Existing accessibility findings receive full-App confirmation
without additional counts.

## Confirmed new findings

### A11Y-007 — Location and quest inline editors remove keyboard focus without returning it

**Severity:** medium. **Confidence:** high. **Classification:** a new page
composition defect; not A11Y-003's modal autofocus capture, A11Y-006's CSS
focus-indicator suppression or REACT-002's rejected-write teardown.

**Source evidence:**

- [LocationDetailPage.tsx:612](../../../../src/pages/locations/LocationDetailPage.tsx#L612)
  closes the name editor on save and Cancel by setting `editing` to null,
  without restoring its still-available Rename trigger. Description editing
  repeats the same callbacks at lines 642–643.
- [QuestDetailPage.tsx:639](../../../../src/pages/quests/QuestDetailPage.tsx#L639)
  does the same for title editing; description repeats it at lines 651–652.
- [InlineEditor.tsx:113](../../../../src/shared/components/inline-edit/InlineEditor.tsx#L113)
  correctly focuses the textarea on entry. Escape calls the owner's Cancel
  callback at lines 172–176; a successful save calls `onSaved` at line 146.
  Its contract leaves closing/return focus to the page.
- The positive implementation is
  [NPCDetailPage.tsx:338](../../../../src/pages/npcs/NPCDetailPage.tsx#L338):
  after the trigger remounts, the page restores it. Its save callback at
  lines 504–508 and name Cancel at lines 715–718 record that return target.

**Reachable trigger and expected behavior:** use the keyboard to open Rename
on a location or quest, then press Escape, activate Cancel, or save a changed
name/title. Closing a temporary inline editor should return focus to its
recreated trigger or an explicit meaningful successor. Successful save should
leave an identifiable keyboard location from which editing can continue.

**Observed result:** all six full-App location/quest dismissal cases left
`document.activeElement` at `BODY`. Opening each editor correctly focused its
labelled textarea. Saved names/titles persisted in Firestore and rendered on
the detail page; the defect concerns interaction continuity, not write loss.
The equivalent NPC Escape, Cancel and successful save each focused the name
trigger, including its updated accessible name after save.

The next forward Tab after a successful location save focused its Type Select;
after the quest save it focused the description button. Chromium retained a
local sequential starting position in these cases. This evidence **does not**
show a restart at the top of the document. It shows a period with no focused
control and no explicit return to the previous editing target; keyboard users
lose the immediate visible/semantic point of interaction and must navigate to
resume or correct the just-edited field. The quest's inspected DOM had no live
region after save; the location had only an empty status region. No exact
screen-reader utterance is claimed.

**Fix and validation:** let each page record its editor opener and restore it
once the close commit has remounted the control, as the NPC page already does.
Handle Escape, Cancel and acknowledged successful saves consistently. Keep
composers that remain mounted distinct from temporary editors. Verify the
actual pages with Tab and Enter, changed accessible names, backward/forward
continuation and several editable fields. Preserve focus entry and the
existing slow/failed-save contracts; rejected-save retention needs its own
REACT-002 regression checks. Inspect the accessible tree and use a real screen
reader for confirmation feedback; this review does not establish speech.

### A11Y-008 — Campaign selection and Undo remove their focused controls without handing focus back

**Severity:** low. **Confidence:** high. **Classification:** new menu/state
composition gap, separate from modal opener capture (A11Y-003) and inline
entity editing (A11Y-007). Recovery with the next Tab succeeds, which limits
the observed impact and severity.

**Source evidence:**

- [ContextSwitcher.tsx:108](../../../../src/shared/components/context-switcher/ContextSwitcher.tsx#L108)
  awaits the campaign change, closes the menu and mounts its Undo toast,
  without refocusing the retained trigger. Successful Undo at lines 171–178
  removes that toast and its focused button without choosing a successor.
- [usePopoverKeys.ts:63](../../../../src/shared/hooks/usePopoverKeys.ts#L63)
  restores the trigger explicitly for Escape, but its cleanup at line 104
  only removes the key handler. Other close paths do not inherit that return
  contract.
- [UndoToast.tsx:69](../../../../src/shared/components/context-switcher/UndoToast.tsx#L69)
  is a regular keyboard-focusable Undo button. Its surrounding live status
  at lines 54–56 exposes the switch confirmation through a live status region.

**Reachable trigger and expected behavior:** open the campaign menu using
Enter, choose another campaign with the keyboard, and activate Undo. After
removing a focused menu/temporary action, leave focus on the persistent
campaign trigger or another explicitly chosen meaningful control.

**Observed result:** the fully restored follow-up opened on Change; a
successful keyboard campaign selection closed to `BODY`. Its named live status
contained “Switched to Keyboard Other Campaign” and the **very next Tab reached
Undo**. Enter on Undo persisted the original campaign id, removed the toast and
again left focus on `BODY`; the next Tab reached Home. Reopening then pressing
Escape correctly returned focus to the named active-campaign trigger. Thus
selection/undo work, the success is exposed in a live region, and keyboard
recovery is immediate. The residual failure is the absence of a focused control
between completion and the user's next navigation keystroke, and inconsistent
return behavior compared with Escape. No inaccessible Undo, page-top restart,
wrong campaign, missed spoken announcement or permanent trap is claimed.

The same bounded sequence observed `BODY` after Change replaced the campaign
step and after the group step's back action replaced it again. Tab recovered to
Choose a group, and the menu's dynamic row lookup kept the next operation
correct. These are supplementary focus-transition observations, not two more
findings or a claim that the menu's keyboard trap stops working.

**Fix and validation:** centralize keyboard menu dismissal/step focus ownership.
After acknowledged selection/Undo, restore the persistent campaign trigger
once the relevant UI commit is complete; when replacing steps, choose the
new step's intended initial row. Preserve the live confirmation, immediate
Undo accessibility, Escape return and dynamic row navigation. Check same
campaign selection, pending/failed change, successful switch, Undo and timeout
dismissal; do not steal focus on unrelated provider updates. A pending or
rejected switch was not executed in this keyboard probe.

## Executed controls and known overlaps

| Actual App journey | Bounded observation | Ownership |
|---|---|---|
| Account menu | Enter focuses Light; End reaches Sign out; Tab wraps to Light; Home/ArrowDown reaches Dark; Escape returns to the account trigger. Light/Dark expose menuitemradio checked states. Sign out was not activated. | Passing keyboard and DOM controls; no account-lifecycle review. |
| Campaign menu and Undo | Change/back/successful switch/Undo leave BODY focused; next Tab reaches the current step, Undo, or Home as appropriate. Original campaign id is restored. Escape returns trigger and live switch confirmation is present. | A11Y-008, low severity; actions remain keyboard-recoverable. |
| NPC Rename | Entry focuses textarea; Escape/Cancel/save return to the correct name button; updated name persists. | Positive focus-return comparison for A11Y-007. |
| Location/quest Rename | Entry works; Escape/Cancel/save leave BODY focused; saved values persist and the next Tab stays in local page controls. | A11Y-007. |
| Quick-add route validation | Failed empty submission keeps focus on Create & open; both reasons have no field description/live mechanism. Chromium AX exposes Name and invalid=true but no reason. Valid creation reaches the persisted NPC detail page. | Strengthens A11Y-005; no new count. |
| Attachment → quick-add dialog | Filter ArrowDown reaches an option; tray Escape returns to its named Attach trigger. An unmatched filter allows Enter on the actual create hatch. Untouched dialog Escape closes to BODY. | Full-App/nested-context confirmation of A11Y-003; no new count. The query avoids A11Y-001's already-known Space interception. |
| Main Notes → New note | Navigation retains the Notes button; New note reaches a new note route and leaves BODY focused. The next Tab reaches All notes locally; there are no live regions. | Bounded route/focus observation, not a new general SPA-navigation finding. |
| Search trigger/shortcut → note | Enter opens and focuses the palette input; Escape returns Search; Control+K reopens. ArrowDown/ArrowUp selects the live `cmdk-option-note-kb-note` and Enter opens the correct seeded note without reissuing the query. Successful navigation leaves BODY focused; the next Tab reaches the branding link and the note page has no live region. | Passing selection/destination/Escape controls plus a bounded landing-focus observation; retained as a route-focus improvement recommendation, not an additional finding count. |
| Note keyboard authoring | Keyboard title/body edits plus Control+S persist exactly; focus remains in the content textarea. All notes returns to the list route. | Positive write/focus control. Existing REACT-003/004 retain autosave loss and feedback ownership. |
| Location native Type Select | Keyboard reaches the control; Chromium AX names it Type and exposes value Town with focus. The attempted native key sequence retains the existing town value. | Bounded native name/focus control; no claim that a changed type was saved. |
| Chapter empty submit | Native required validation focuses Chapter Title and reports “Please fill out this field.” | Passing native-validation control; avoids incorrectly treating all form submissions as custom validation. |
| Chapter whitespace submit | Nonempty whitespace passes native required and then navigates away after the custom validation failure. A subsequent valid keyboard-authored chapter persists and returns to the index. | FUNC-005 already owns the unconditional finally navigation/draft loss. No separate validation-announcement count. |
| Actual StoryPage at 390×844 | Chapters opens with focus still on its trigger; Tab goes to Edit behind the drawer; Escape leaves it open; there are zero dialog roles. | Strengthens A11Y-004 from component-order harness to actual full reader. No physical-phone touch claim or T026 closure. |

## Verification and limitations

The coordinator executes the supplied modules with the already-built App,
actual local Firebase IO and Chromium. The main module exits zero while recording
observations; that exit does not mean all journeys passed. Two main-run
preconditions were initially sampled before session/campaign restoration:
the campaign's original trigger name was captured as No Campaign, and the
Search shortcut ran before its signed-in handler existed. Those diagnostic
failures are not application defects. The bounded campaign follow-up passes
with the actual restored trigger name. Its Search wait then matched the six
creation options whose names contain the query before the debounced result
arrived; that strict-selector failure is also diagnostic, not a product issue.
The first Search-only probe then ambiguously matched the Notes page's native
Sort notes Select alongside the palette input. The final input-specific
Search-only probe passes with the provider's actual seeded note and exact
result option id; `reissuedQuery` is false. No REACT-007 query-rebuild issue was
reproduced in that final sequence. The original modules and all partial outputs
are preserved. These four preparatory failures are selector/setup defects,
not additional application findings.

All 13 planned main scenarios have observations after the two bounded
follow-ups; the main run supplies 11, the campaign follow-up one and the final
Search run one. Four preparatory scenario attempts recorded diagnostic errors.

The [probe inputs](evidence/probes/keyboard/) include the preserved main,
follow-up, initial Search-only and corrected Search-only modules. Authoritative
results are the [main observations](evidence/outputs/keyboard/observations.json),
[campaign follow-up](evidence/outputs/keyboard-followup/observations.json) and
[final Search observations](evidence/outputs/keyboard-search-fixed/observations.json).
The main [location save screenshot](evidence/outputs/keyboard/keyboard-inline-location-save.png)
records the renamed persisted page with its editor removed; the
[actual reader drawer](evidence/outputs/keyboard/keyboard-story-phone-drawer.png)
records the existing overlay. DOM focus records, rather than screenshots alone,
establish the focus findings.

The completed observations show zero uncaught browser page errors. Remote
font, analytics and Firebase metadata requests were blocked by the coordinator;
no external services were used for the reviewed data writes. No existing test,
application source, dependency, rule or config was changed. The existing full
baseline gates apply to byte-identical source; the coordinator records the
fresh App build separately.

Source inspection of write errors is not a terminal-write rejection experiment.
Quick-add's existing write-error alert and InlineEditor's slow/failed status
mechanisms were inspected, but this reviewer does not claim end-to-end rejected
write announcements or recovery. The pass-5 write-failure specialist owns those
injected faults, and prior REACT-002/004 and FUNC-005/006 remain cross-references.
This keyboard module verifies ordinary acknowledged saves and custom/native
validation boundaries.

The inspected and executed journeys do not certify every route or WCAG criterion.
No physical keyboard/device, screen-reader speech, forced colors, 200–400% zoom,
real mobile virtual keyboard, Safari/Firefox/platform comparison or complete
contrast audit was executed. The stopped auth/account-lifecycle review remains
stopped: synthetic sign-in is setup only; no account, membership, invitation or
sign-out action is reviewed. Production data/policies, credentials, real mail,
paid models and deployment are excluded.
