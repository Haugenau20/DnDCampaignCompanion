# Documentation

Supporting documents. What is left to do lives in [`../TODO.md`](../TODO.md), not here; bugs the
behavioural suites find are filed in [`testing/bug-tracking/README.md`](testing/bug-tracking/README.md).

## Layout

```
docs/
├── architecture/            # Backend options and the data-model review (T119), the new-group plan (T120)
│   └── migration/           # Long-term feature ideas, and the unbuilt field-rename outline
├── design/                  # The design language, the colour schema and the token model
├── images/                  # Screenshots the root README shows
└── testing/bug-tracking/    # Where a bug found by the behavioural suites is filed
```

## Conventions

- These are references for the product as it is, plus ideas not built yet. A document that only
  describes work that has been done -- a phase plan, a handoff, a review, a design spec, a bug
  write-up -- is deleted once the work ships, whatever still cites it. Git history keeps it: the
  phase plans and handoffs, the drift log, the code reviews, the performance review, the feature
  specs and every bug report up to #1427 are at `9810644` (T113).
- A code comment may still name a phase (`15-6`), a decision (`D125`) or a bug (`#1202`). Those are
  labels into that history, not links to a file here.
