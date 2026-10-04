# Fifth-pass browser scale review

Date: 2026-10-04. Reviewed baseline `4ebd53362c34840871745386b99f7905de75c26a`
([PR #200](https://github.com/Haugenau20/DnDCampaignCompanion/pull/200));
application source remains `64fe19512b1d3bd14427fad8996403a742fbe8a9`.
This supplements the [second-pass performance review](../../2026-10-03/pass-2/07-performance.md).

## Method and scope

The specialist prepared `scale.cjs`; the coordinator owns the only browser and
runtime execution slot. The diagnostic seeds three isolated synthetic campaigns
with 100, 1,000 and 3,000 total records. The distribution stays constant:

| Total | NPCs | Locations | Quests | Rumours | Personal notes | Chapters |
|---:|---:|---:|---:|---:|---:|---:|
| 100 | 40 | 20 | 15 | 10 | 10 | 5 |
| 1,000 | 400 | 200 | 150 | 100 | 100 | 50 |
| 3,000 | 1,200 | 600 | 450 | 300 | 300 | 150 |

Records carry ordinary attribution, statuses, canonical location references,
NPC/quest relationships, objectives, notes/tags and bounded prose. NPCs have a
1,100-character description and 400-character background; notes and chapters
have longer bodies. The same common prose deliberately supplies a broad search
term across all six types. Locations contain 20 roots plus ordinary descendants;
this is not a deeply pathological hierarchy. These are synthetic capacity
inputs, not a measured distribution of real campaigns. Admin SDK reads verify
all six collection sizes independently before each scale is exercised.

The diagnostic uses the actual App and local Firebase, with a production CRA
build configured for the synthetic demo project. Campaign selection is setup:
the harness changes only its own synthetic profile's active campaign, then
loads `/npcs` into a new browser document. The first route metric includes
ordinary session restoration and local IO. It has one sample per scale, uses
the same browser HTTP cache/session and is not a statistically comparable cold
network benchmark. The document starts a new App/SDK lifetime.

Repeated metrics start inside the browser at the native input/click event and
end when the expected DOM rows are present, followed by two animation frames.
The latter is an observable rendering opportunity, not a field INP metric or a
paint trace. Three unprofiled repetitions cover each NPC selective search and
restore, broad six-type palette query, warm NPC route return, and location
broad/selective/clear sequence. Palette timing includes its intentional 180 ms
debounce. CPU sampling runs separately for one NPC restore at the two larger
scales and does not enter the unprofiled medians. No CPU throttling, physical
device, production latency or arbitrary response-time SLA is assumed.

After loading all search collections, the diagnostic performs twelve actual
Quests → NPCs route cycles. CDP captures heap usage and DOM counters after an
explicit full garbage collection, at the same visible NPC route after 0, 3, 6
and 12 cycles. Outgoing local Firestore Listen messages provide counted
add/remove targets during each document lifetime. These counts are listener
ownership evidence, not billable reads. The intentional five-minute linger is
not accelerated or awaited; expiry/transport retries remain outside these
runtime measurements.

## Outcome and executed evidence

**No new ranked finding.** The completed production-browser observations show
successful bounded search/filter/navigation controls, a clear growth in roster
rendering work, and stable collection ownership during repeated navigation.
The initial 3,000-record search attempt stopped on partial results; its cause
is consistent with the already-reported REACT-007, but the follow-up did not
isolate that cause. Neither a new search defect nor a memory leak is counted.

The initial run completed the 100/1,000-record scenarios, then timed out after
60 seconds waiting for 30 palette results at 3,000 records. Its screenshot
shows the actual `lantern` input and **15 results**, without a loading skeleton.
The coordinator preserved its observations, measurements and 3,000-record CPU
profile. A separate, fixtures-reusing follow-up completed only the 3,000-record
scenario. No application change was made between runs. The final follow-up
reports zero uncaught page errors; non-loopback requests, including analytics
and hosted fonts, were blocked.

Durable evidence, relative to this report:

- [Runnable probe](evidence/probes/scale/scale.cjs),
  [3,000-record follow-up wrapper](evidence/probes/scale/followup.cjs), and
  [CPU/source-map summarizer](evidence/probes/scale/profile-summary.cjs).
  [initial.cjs](evidence/probes/scale/initial.cjs) reconstructs semantically
  equivalent initial fixed-warmup logic; it is not claimed byte-identical to
  the originally loaded module.
- [Initial measurements](evidence/outputs/scale/initial-measurements.json),
  [follow-up measurements](evidence/outputs/scale/scale-measurements.json), and
  [combined measurements](evidence/outputs/scale/combined-measurements.json).
  The combined file takes only 100/1,000 from the initial run and 3,000 from
  the successful follow-up. It does not infer the initial 3,000-record timings
  that were never flushed before the timeout.
- [Initial observations](evidence/outputs/scale/initial-observations.json) and
  [follow-up observations](evidence/outputs/scale/observations.json) preserve
  actual inputs and hydration/requery observations. `scale-N-readbacks.json`
  files preserve independently read representative records of every type.
- [Listen messages](evidence/outputs/scale/scale-listen-network.json) and
  [source-map CPU summary](evidence/outputs/scale/profile-summary.json), alongside
  the original `.cpuprofile` files and the
  [initial search screenshot](evidence/outputs/scale/initial-search-failure.png).

### Repeated browser timings

Each cell is **median [minimum–maximum] milliseconds, n=3**, from the native
input/click event to the expected DOM state plus two animation frames. All
samples run on the same unthrottled headless Chromium 151/Linux host; the
3,000-record row is the separately completed follow-up. With three observations
per cell, ranges describe this run's variation, not confidence intervals or
population percentiles.

| Total records | NPC selective filter → 1 row | Clear NPC filter → full roster | Warm Quests → NPCs | Palette `lantern` → 30 hits | Broad location search → all places |
|---:|---:|---:|---:|---:|---:|
| 100 | 41.4 [39.9–45.5] | 42.6 [39.6–43.5] | 60.8 [60.5–61.5] | 228.5 [227.0–229.1] | 43.5 [42.8–43.9] |
| 1,000 | 35.5 [34.7–36.8] | 128.2 [125.7–138.9] | 176.4 [170.6–182.7] | 237.1 [236.3–240.6] | 60.0 [58.3–76.8] |
| 3,000 | 53.4 [50.2–58.1] | 346.2 [340.3–373.8] | 569.8 [541.1–571.5] | 238.5 [236.2–240.2] | 190.6 [190.0–236.6] |

The corresponding median **DOM-ready** times for NPC restoration are
11.7 / 109.6 / 334.0 ms; palette DOM-ready times are 199.4 / 208.6 / 223.0 ms.
The palette's 180 ms debounce is included in both metrics: these are not
200–240 ms of search CPU. All completed broad searches returned five results
per type, and selective directory filters showed the intended single record.
Location selective search and clearing back to the 20 roots also passed at all
scales; their full sample ranges remain in the JSON rather than enlarging the
table.

No overlapping long task was recorded for the measured warm palette searches
or NPC selective filters. Clearing back to 400 NPCs recorded one 92–106 ms
long task in each repetition; restoring 1,200 NPCs recorded 271–308 ms tasks,
plus 57–58 ms tasks. Warm returns to the 1,200-row roster included 219–264 ms
tasks. Broad search rendering of 600 locations included 146–176 ms tasks.
These are actual browser long-task entries overlapping the measured action
windows. They characterize main-thread occupancy; they are not a physical
keyboard responsiveness measurement, an INP score or a production SLA breach.

The single new-document `/npcs` observations were **457 ms / 4,173 ms /
38,486 ms**. Their endpoint is the expected NPC row count, not completion of
all asynchronous location/search reads or a paint measurement. The 3,000-record
sample comes from the follow-up, after different emulator/cache history.
No repeatable cold-load comparison or attribution of these large local-IO
outliers to a particular application function is established. They must not be
used as a forecast for production Firebase, or to claim a production build is
faster than development. No matched development-versus-production A/B was run.

### Source attribution and bounded repair direction

`NPCDirectory.tsx:245–256` resolves each filtered NPC's location through
`resolveLocationName`; `location-display.ts:67–83` searches the location array
linearly. `NPCDirectory.tsx:312–337` then maps every location group and every
NPC into a row. `Roster.tsx:679–725` mounts each row's DOM. The completed
1,200-row directory contains **19,407 DOM elements**, compared with 6,607 at
400 rows and 847 at 40 rows. Restoring the full list after a selective filter
recreates those rows, so rendering grows with the visible corpus rather than
the viewport. This supplies actual-App evidence for the previously unranked
full-roster/linear-location-resolution capacity targets in the second-pass
report. It does not establish that one lookup alone causes the whole delay.

The separately recorded V8 profiles map samples to actual production sources,
including React DOM, DOM creation/attribute methods, `NPCDirectory`, `Roster`
and `location-display`. Their initial 1,000/3,000 and follow-up 3,000 captures
contain only 117 / 345 / 326 samples, and approximately **75–80%** of sampled
time maps to `(program)`. Native/style/layout work is not attributed to a React
component by this evidence. These profiles therefore support the inspected
rendering path but do not justify an inclusive component-time ranking or a
precise claim that location lookup dominates. Profiled measurements are kept
separate from the table.

A proportionate capacity improvement, if larger-campaign support is prioritized,
is to reuse a location ID/name index while preserving canonical-reference and
legacy fallback semantics, then bound mounted directory rows with paging or
virtualization. Preserve grouping, expansion, keyboard navigation, selection,
highlight reveal and scroll restoration. A meaningful repair check repeats the
same 100/1,000/3,000 fixtures and search/clear actions on the same quiet host,
verifies the same entities/groups remain accessible, and measures a bounded
mounted row count. Do not replace a demonstrated concurrency/data-loss fix
with speculative broad context rewrites or choose a latency threshold from
these three samples alone.

The location broad-search measurements include the already-reported
**PERF2-001** ancestry/path work: `LocationDirectory.tsx:197–199,339–348` maps
all flattened matches, and its ancestor utilities rebuild indexes per call.
The 600-location App measurement includes rendering and layout, so it cannot
be compared directly with the earlier 2,000-location pure-function timing.
Reuse the existing index as previously recommended and retain cycle/depth
controls; this is not a second finding. No new saga pagination, quick-add
listener or image-maintenance run was performed, and PERF2-002/003/004 are not
recounted.

### Navigation, listeners and heap controls

After the first three route cycles, the compared snapshots have the same visible
NPC directory. Values below are post-GC JavaScript **used heap MiB**; DOM nodes
include text/comment nodes and differ from the element count above.

| Total records | After 3 cycles | After 6 cycles | After 12 cycles | DOM nodes after 3/6/12 | JS event listeners after 3/6/12 | Active collection targets |
|---:|---:|---:|---:|---:|---:|---:|
| 100 | 9.07 | 9.18 | 9.29 | 1,216 / 1,216 / 1,216 | 401 / 401 / 401 | 6 / 6 / 6 |
| 1,000 | 20.42 | 20.54 | 20.66 | 9,676 / 9,676 / 9,676 | 941 / 941 / 941 | 6 / 6 / 6 |
| 3,000 | 45.37 | 45.52 | 45.41 | 28,476 / 28,476 / 28,476 | 2,141 / 2,141 / 2,143 | 6 / 6 / 6 |

All compared snapshots contain one document. The small heap growth at the two
smaller scales and two-event-listener difference at the largest are recorded;
without retained-object attribution or a longer repeated sequence they do not
establish a leak. The initial post-search baseline also contains extra palette
DOM before later cleanup, and has not been compared as though it were the same
DOM state. The post-cycle comparisons show no repeated accumulation of whole
rosters/documents or collection subscriptions in these twelve cycles.

The outgoing messages independently identify the final six targets as NPCs,
locations, quests, rumours, chapters and the user's campaign-constrained notes.
Once search warmed them, target additions/removals did not grow during the
route cycles: provider consumers reused their owners. Story progress used a
separate transient document target, removed after the read. Initial route
ownership was two campaign collection targets. The final six remaining open
for this short sequence agrees with the deliberate five-minute linger in
`useListenerDemand.ts:13,35–56`. `useFirebaseData.ts:122–143` returns the owned
unsubscribe on path/lifetime changes. These source references and prior
provider tests remain the expiry/cleanup evidence; this browser run does not
prove five-minute idle expiry, terminal-listener retry or process-unload cleanup.

### Initial search episode and remaining uncertainty

The initial 3,000-record search episode showed 15 results after the fixed two
second warmup and 60-second diagnostic wait. The six independently read
collections contained the expected data. That result is consistent with known
**REACT-007**: `SearchContext.tsx:166–198` rebuilds an arriving corpus, while
`useSearch.ts:79–87` reruns the debounced query only when that query or handler
changes. It is not proof that all six collections had arrived in that same
browser document. The initial failure did not preserve per-type options or
arrival timestamps, so a precise delivery ordering is not asserted.

In the follow-up, the first recorded query already showed **30 hits across all
six groups** after one second. Leaving it unchanged for another twelve seconds
kept 30; clearing and retyping also returned 30. This is a successful larger
corpus control, **not** a reproduced 15 → 30 requery repair. REACT-007's prior
focused proof remains valid; this episode is an integration lead attached to
that known issue, not a strengthened causal proof or new finding. A proper
repair check deliberately delivers a matching collection after a query runs
and verifies the unchanged query refreshes as the scoped index changes.

No result here establishes long-session memory health, real-device frame
rates, mobile field metrics, Safari behavior, production dataset sizes/costs,
deployed rules parity, or remote Firebase latency. Ordinary local sign-in was
only harness setup; authentication/account lifecycle remains stopped. Review
files and diagnostics are the only changes; application code, existing tests,
rules/configuration/dependencies and backlog were not modified.
