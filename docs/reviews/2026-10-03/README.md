# Code review records — 2026-10-03

Status: first-pass results delivered. Security, data integrity, and uploaded-image
reviews are complete within their documented scopes. The auth specialist was
stopped at the maintainer's request and its retained report is explicitly partial.

This directory holds the review plan, specialist reports, verification evidence,
and consolidated outcomes. It is a review record; `TODO.md` remains the backlog
and `docs/testing/bug-tracking/README.md` remains the behavioural bug tracker.
Cross-reference those records rather than copying their contents as new findings.

## Documents

- [pass-1-summary.md](pass-1-summary.md): start here; grouped findings, priorities,
  coverage, and recommended fix order.
- [plan.md](plan.md): approved first-pass scopes, models, and later angles.
- [baseline.md](baseline.md): tools, check commands/results, environment limits.
- [01-security.md](01-security.md): completed security specialist report.
- [02-auth-account-lifecycle.md](02-auth-account-lifecycle.md): partial evidence
  assembled by the coordinator after the auth specialist was stopped.
- [03-data-integrity.md](03-data-integrity.md): completed data specialist report.
- [04-uploaded-images.md](04-uploaded-images.md): completed image specialist report.
- [evidence/probe-results.md](evidence/probe-results.md): reproduction outcomes,
  preserved diagnostic source/logs, and their interpretation limits.

Store subsequent pass reports here with their own baseline and summary. The
remaining agreed angles have not run. This directory is an assessment record;
it contains no implemented application fixes or changes to the backlog.

## Specialist report structure

1. Scope, reviewer model/reasoning, date, and reviewed commit SHA.
2. Inspected paths/workflows and important coverage exclusions.
3. Findings ordered by severity, with stable identifiers such as `SEC-001`,
   `AUTH-001`, `DATA-001`, or `IMG-001`.
4. Checks/reproductions and their outcomes; separate observed behavior from
   source-only inference and blocked verification.
5. Unverified concerns and optional improvements, separate from confirmed bugs.
6. Existing tracker references, cross-agent overlaps, and follow-up questions.

For each finding record:

- Title, severity (critical/high/medium/low), and confidence.
- Exact repository-relative source path and line references at the reviewed SHA.
- Trigger/preconditions, expected behavior, and actual behavior.
- Concrete user/security/data/cost impact.
- Source evidence, reproduction steps or command, and observed result when run.
- Suggested fix direction and meaningful verification for that fix.
- Known issue/new finding/regression classification and relevant tracker links.

Do not include secrets, private user data, or full credential-bearing URLs.
Claims of no issue must state their inspected scope and verification limits.

## Consolidated summary

Provide the reviewed commit, verification status, coverage matrix, ranked
deduplicated findings linked to specialist evidence, and an actionable fix order.
Separate confirmed findings from unverified leads and optional improvements.
Keep severity grounded in a reachable failure scenario. Recheck stale reports
against current code, and do not count the same shared root cause as independent
confirmation merely because several agents observed it.
