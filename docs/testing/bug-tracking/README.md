# Bug Tracking

Where a bug found by the behavioural suites is filed. Everything else that is left to do lives in
[`../../../TODO.md`](../../../TODO.md).

## The rule

- **Only open bugs live here.** When a bug is fixed, the PR that fixes it deletes its file and its
  row; the PR is the record. Git history keeps every report up to #1427 (at `9810644`).
- Bug numbers are never reused. **The next number is #1428**; raise it here whenever one is taken.
- Code and tests keep naming bugs by number (`#1202`). That is a label into history, not a link.

## How to file a new bug

1. Take the next number, above, and raise it.
2. Create `NNN-short-slug.md` here with these sections: **Title**, **Status**, **Category**,
   **Discovered In** (test file), **Affected File**, **Description**, **Reproduction**,
   **Expected vs Actual**, **Recommended Fix**.
3. Add a row to the table below.
4. If you skip a test because of the bug, reference the bug number in a comment on the `.skip`.

A failing test is not automatically a bug: first establish that it actually executed the code it
names (see `CLAUDE.md`, "Testing philosophy").

## Status legend

| Symbol | Meaning |
|---|---|
| 🔍 DISCOVERED | Bug identified through testing |
| 🔄 IN PROGRESS | Being investigated or fixed |
| 🟡 PARTIALLY FIXED | One instance resolved, but the entry as filed covers more that is still live. The row must say which part is which |
| ⚠️ NEEDS DECISION | Implementation decision required |

## Categories

| Category | Scope |
|---|---|
| CONTEXT | React Context providers and hooks |
| CRUD | Create / Read / Update / Delete operations |
| UI | Component rendering and user interaction |
| DATA | Data integrity and consistency |
| VALIDATION | Input validation and error handling |
| PERFORMANCE | Performance and scalability |
| INTEGRATION | Third-party integration |
| ARCHITECTURE | Cross-cutting structural issues |

## Open bugs

| Bug # | Status | Category | Title | Affected file(s) |
|---|---|---|---|---|

None open.
