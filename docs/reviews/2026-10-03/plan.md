# Repository review plan

Date: 2026-10-03 (Europe/Copenhagen)

Status: approved; results delivered with the maintainer-directed auth coverage
limitation. See [pass-1-summary.md](pass-1-summary.md).

Repository: `Haugenau20/DnDCampaignCompanion`

Review baseline: `64fe19512b1d3bd14427fad8996403a742fbe8a9` (`origin/main`).
The clean `work` checkout was fast-forwarded from `34ed625` to this commit
before preparing this plan. The newly merged code does not change the review
order or priorities. A fresh fetch at execution start confirmed this remains
`origin/main`. The only initial local changes were the review documentation.

## Goal and boundaries

Find concrete security, data-loss, reliability, correctness, performance, and
maintenance problems in the current implementation. Review production code and
the seams between the frontend, Cloud Functions, Firebase rules, and external
services. Existing reports, comments, and tests provide leads, not proof.

Here, images means user-uploaded campaign pictures and Firebase Storage, not
Docker/container images. Docker is secondary and receives no dedicated
first-pass review. A later operations review may inspect a Docker file if a live
CI/deployment path depends on it, without recommending retention or removal
merely because it exists.

This is an assessment. Agents may write their assigned reports and use temporary
reproductions; they must not modify application code, existing tests, rules,
dependencies, backlog entries, or deployment configuration. Do not deploy,
invoke production mutations, send contact messages, or call paid AI services.
Run destructive workflow checks only against disposable local/emulator data.

## First-pass assignments

Four specialist agents run concurrently; the coordinating agent handles the
baseline checks, evidence verification, and consolidated report. This leaves
capacity within the seven-agent limit. Model names below are available tool
identifiers; each assignment uses an explicit model and `xhigh` reasoning.

| Agent | Model | Scope and principal questions | Report |
|---|---|---|---|
| Security and authorization | `gpt-6-astra` | Can a user read or mutate another user's private notes, another campaign/group, or privileged records? Review production Firestore/Storage rules, callable authorization, server-side validation, client-controlled identity/role fields, token exposure, and abuse controls. Trace actual reachable request paths. | `01-security.md` |
| Authentication and account lifecycle | `gpt-6.1-sol` | Do magic links, Google sign-in, device approval, invitations, sessions, role transitions, leaving groups, and account deletion behave correctly under replay, expiry, parallel requests, and partial failure? Review identity/token lifecycle and admin safeguards. | `02-auth-account-lifecycle.md` |
| Data integrity and concurrency | `gpt-6-astra` | Can concurrent edits, conversion, batch writes, cascading deletion, nested locations, chapter reordering, or failed multi-step operations lose data or strand references? Review atomicity, idempotency, attribution, schema assumptions, and retry/recovery behavior. | `03-data-integrity.md` |
| Uploaded-image lifecycle | `gpt-6.1-sol` | Do image preparation, validation, upload, replacement, document writes, deletion, and orphan sweeping preserve valid images and clean abandoned objects? Check interrupted operations, concurrent replacement/deletion, quota/size constraints, access URLs, and Firestore/Storage consistency. | `04-uploaded-images.md` |

### Why these models

Use Astra for adversarial trust-boundary analysis and multi-document concurrency,
where subtle interactions warrant the frontier model. Use GPT-6.1 Sol for the
auth and image specialists' detailed code tracing and emulator-backed workflow
verification. These are capable reviewers with high reasoning allocation, not
lightweight triage agents. Assignments reflect task fit; they are not a claim of
measured review accuracy for this repository.

### Ownership at overlapping seams

- Security owns access-control findings. Auth owns credential/session state and
  user-facing account transitions; suspected authorization bypasses are shared
  with security for confirmation.
- Data integrity owns persisted relationship/cascade correctness. Auth owns
  whether the requested account action is permitted and completes its lifecycle.
- Image review owns binary-object/document consistency. Security owns Storage
  authorization. Data integrity owns deletion of the associated entity graph.
- Agents should cross-reference overlapping findings. The coordinator merges
  duplicate root causes while retaining each distinct affected scenario.

## Execution after approval

1. Confirm the checkout still matches the recorded commit and inspect any local
   changes. If main has advanced before launch, fetch and fast-forward a clean
   checkout, record the new baseline, and apply the same scopes and priorities.
   Do not update the baseline during a running pass.
2. Record runtime/tool availability and establish the current baseline once:
   frontend type-check, app/test lint, Jest coverage suite, production build and
   bundle check; Functions build and emulator-backed Functions/rules suite.
   Follow the pinned Node/Firebase tooling and the existing CI commands. Record
   environment limitations separately from code failures. Dependency setup, if
   necessary, must preserve lockfiles and use the repo's existing install flags.
3. Launch the four specialists against the same commit. Each reads `AGENTS.md`,
   relevant current specs, and applicable existing tracker entries. Every agent
   can read the entire repository; ownership limits the question, not visibility.
   Reports must list inspected paths and important uncovered paths.
4. Specialists trace real call sites, challenge failure paths, and return source
   evidence plus focused reproduction requests. The coordinator runs shared
   suites/emulators and targeted probes to avoid four competing test runners.
   Browser verification is used where relevant and available. Temporary probes
   stay outside production source and existing test files.
5. Verify critical/high findings independently, inspect cross-agent seams, and
   reconcile new findings with the current backlog and bug tracker. Label known
   open issues, regressions, new issues, and disproved leads accurately. Historical
   tests/counts or closed tracker rows do not establish the current state.
6. Write `pass-1-summary.md` with ranked, deduplicated findings, evidence,
   recommended fix sequence, coverage gaps, and unresolved questions. Keep fixes
   as recommendations; implementation is separate work.

No first-pass approval is requested for Docker retention/removal or deployment.
Approval here is solely to run this review plan.

## Reporting standard

Follow [README.md](README.md) for finding fields and report conventions. A
credible report can contain zero confirmed findings; do not invent problems to
fill a quota. Distinguish confirmed defects, credible unverified concerns, and
optional improvements. Confidence and severity are separate.

Completion requires all four reports, a recorded verification baseline, a
consolidated summary, and explicit coverage limitations. If runtime checks are
unavailable, complete source analysis and identify precisely what remains
unverified; do not call the pass fully runtime-verified.

**Execution amendment:** The maintainer instructed the coordinator to stop and
not resume the auth specialist after its OpenAI policy interruption. The other
three specialists completed their reports; the coordinator retained verified
auth evidence in an explicitly partial fourth document. The baseline and focused
checks completed, but the auth scope is not certified complete. No replacement
auth agent was launched and the stopped agent was not resumed after the stop.

## Subsequent passes (not included in this approval)

Keep the remaining agreed review angles for later scheduling:

- Functional correctness; React state/asynchronous behavior; performance,
  scalability and cost; test quality and coverage gaps.
- Architecture/dependency boundaries; duplication/maintainability;
  accessibility/interaction quality; AI/external integration reliability;
  deployment/operational reliability.

Uploaded images and operations split the original twelfth area into separate
workstreams so the former receives first-pass priority. The full review retains
all original angles. Assign models and detailed scopes for later passes after
the first-pass evidence is available.
