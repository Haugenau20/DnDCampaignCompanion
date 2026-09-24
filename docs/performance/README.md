# Performance review documentation

- [Consolidated performance review](performance-review-2026-08-30.md)
- [Runtime and static-analysis evidence](runtime-evidence-2026-08-30.md)
- [Initial investigation notes](initial-findings.md)

The consolidated review is the source of truth for the audit performed on 2026-08-30 at commit `b73232a`. It is a point-in-time review, not a claim that every finding still applies to later revisions of `main`. The initial notes are preserved as earlier investigation context.

## Partially revalidated 2026-09-16

Six findings were re-checked against `main` at `ebc0a28`, and **three were already fixed** by work that landed after the audit — including `PERF-01`, the Critical one, and `PERF-07`. `PERF-10` is half closed. **The review's prioritized remediation order therefore opens with a finding that no longer exists; do not work straight down it.** The remaining nine (`PERF-02`, `03`, `05`, `06`, `09`, `11`, `12`, `13`, `14`) have not been checked at all.

Which findings are still open, and what is tracked against them, lives in [`TODO.md`](../../TODO.md) under **Performance** — entries `T029`–`T033`. This directory stays the record of the audit and its evidence; it is not updated as findings close.
