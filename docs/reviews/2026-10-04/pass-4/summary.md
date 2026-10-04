# Fourth-pass review summary

Date: 2026-10-04. Reviewed `c2d8a88d0541b01c0f9cc2e7c497206a29746ce5`,
`main` after review PRs [#196](https://github.com/Haugenau20/DnDCampaignCompanion/pull/196),
[#197](https://github.com/Haugenau20/DnDCampaignCompanion/pull/197) and
[#198](https://github.com/Haugenau20/DnDCampaignCompanion/pull/198) merged.
Application source matches the original `64fe195` baseline. This separate PR
adds assessment documents and diagnostics; it implements no application fixes.

**Five new confirmed findings: three medium and two low, all high confidence.**
Three specialist reviews exercised the full App with real local Firebase IO,
adding integration evidence to the earlier source and focused-component reviews.
See [verification](verification.md) and the [evidence guide](evidence/README.md)
for runtime setup, executed inputs, readbacks and limits.

## Additional findings and fix order

| Order | Finding | Severity | Reachable result | Suggested repair and proof |
|---|---|---|---|---|
| 1 | [RECOVERY-001](15-browser-recovery.md#recovery-001--a-queued-note-save-transfers-to-the-next-note-and-drops-its-own-latest-submitted-text) | Medium | A second manual save queued offline for note A executes the callback for B after Search navigation. A loses its latest submitted text; B receives a redundant write and changed modification time. B is not overwritten with A's prose. | Bind queue/editor lifetime to full record identity; retain same-note coalescing. Repeat offline → two saves → Search B → reconnect; latest A persists and B receives no A-owned write. Preserve the passing full-unmount control. |
| 2 | [RECOVERY-002](15-browser-recovery.md#recovery-002--another-notes-fallback-or-missing-state-survives-ordinary-routecampaign-changes) | Medium | Campaign menu and Search navigation leave the URL on the second owned cross-campaign note but show the first note's heading. Old missing state also suppresses a different existing lookup in the supplemental route probe. | Key fallback/missing/in-flight state and async responses by lookup identity. Reproduce the ordinary menu/Search journey and preserve the earlier bounded-fetch-loop fixes. |
| 3 | [BROWSER-001](14-browser-workflows.md#browser-001--create--add-another-in-the-attachment-escape-hatch-creates-an-unlinked-record) | Medium | From a location's attachment escape hatch, Create & add another persists an NPC and acknowledges success without attaching it. Create & open attaches a second NPC correctly. | Define creation notification independently of dismissal, or remove repeat-create in this context. Verify every offered creation action against the reopened parent's stored relationship. |
| 4 | [LEGACY-001](16-legacy-data.md#legacy-001--calendar-date-notes-display-the-previous-day-west-of-utc) | Low | A supported `2025-05-31` note displays May 30 in Los Angeles, including the edit prompt. Its stored date remains correct after an ordinary edit. | Format date-only values as calendar components. Check date and action labels in western/eastern timezones, retaining full-ISO and persistence controls. |
| 5 | [BROWSER-002](14-browser-workflows.md#browser-002--cancel-on-a-new-chapter-opens-the-first-chapter-reader) | Low | Cancelling chapter creation opens the first existing chapter through an undefined-ID reader route. No cancelled draft is written. | Route create-mode Cancel to the chapter index; retain edit-mode return behavior. Check empty and populated campaigns. |

The table orders new work within this pass. Earlier high-severity security and
data-integrity findings retain their priority. Record-identity repair can be
planned alongside REACT-001 and DATA-002, but the submitted-save queue and note
fallback are separate causes and need separate regression sequences. FUNC-001's
blank cross-campaign reader does not repair fallback ownership.

## Coverage and positive controls

| Specialist | Assignment | Completed evidence |
|---|---|---|
| [Browser workflows](14-browser-workflows.md) | GPT-6.1 Sol, xhigh | Create/edit/reopen and leaf delete for NPC/location/quest/rumour; real attachment/detachment; note idle autosave; four prepared-detection conversions with persisted source/target IDs; chapter authoring/read/progress and saga; six exact Search destinations; actual Storage portrait upload/decode/reopen/remove/reopen. Two new findings. |
| [Browser recovery](15-browser-recovery.md) | GPT-6.1 Sol, xhigh | Queued save/navigation/reconnect, passing queued-save/full-unmount control, same-account tabs, blocked Write-channel/reload, note fallback transitions and ordinary campaign/Search confirmation. Two new findings; terminal listener injection remains unverified. |
| [Legacy data](16-legacy-data.md) | GPT-6 Astra, xhigh | Seven supported historical-shape controls through real read/edit/persistence, plus UTC/Los Angeles date-only/ISO comparison and edit readback. One new finding. |

Prepared detections bypass the supplier call, then use actual conversion UI and
writers. Portrait checks upload a real tiny synthetic image, verify the emulator
binary, decode it in Chromium, and verify document/binary removal. Legacy
fixtures derive from historical writers, current types or explicit compatibility
policy; arbitrary malformed data is not counted as a supported-data defect.
No uncaught page errors appear in the completed main/follow-up observations.
A diagnostic process exiting zero characterizes the observations; it does not
mean the five defects were fixed or that every journey passed.

## Prior findings strengthened, without new counts

- **DATA-003:** two same-account tabs reproduce a stale-body overwrite when the
  second tab changes only the title. Both tabs use ordinary shared local session
  persistence; no account-lifecycle investigation was resumed.
- **REACT-003:** leaving before the note debounce loses the final line, as before.
  This pass also demonstrates that an SDK-queued, unacknowledged save is lost on
  document reload under a local Write-channel block. Durable draft/reload
  protection must cover that broader case; it stays in the existing issue group.
- **FUNC-003:** clearing an NPC's optional role leaves Save disabled and retains
  the old value in Firestore.
- **FUNC-001:** cross-campaign fields remain blank in the existing read-only path;
  RECOVERY-002 adds an independently wrong fallback identity.
- **#1202, T079, T050 and other tracker contracts:** compatibility controls and
  historical fixture provenance are documented in the specialist reports. The
  Timestamp control renders/edits successfully; this does not close every
  #1202 consumer. The tracker and TODO were not changed.

## Remaining coverage limits

The bounded listener-error experiments saw local transport but did not select
and terminate the notes Watch target. No terminal-listener recovery defect or
successful retry is claimed. Direct-read response reordering also remains a
source lead, not another finding.

The Windows PowerShell script could not run on this Linux host. Its emulator
configuration, services and ports were used directly, with loopback bindings,
a fresh synthetic demo project and separately built/staged Functions. No actual
emulator export/import, host restart, production backup/restore or Windows
process-management behavior was exercised. Development rules are permissive;
these results do not establish deployed authorization or policy parity.

Physical devices, real-device metrics, Safari/iOS/Android, screen-reader speech,
production traces/settings and live model behavior remain outside this pass.
Chromium timezone emulation is a controlled browser comparison. The stopped
authentication/account-lifecycle review remains stopped. The earlier reports
and their evidence limits remain in the [previous index](../../2026-10-03/README.md).
