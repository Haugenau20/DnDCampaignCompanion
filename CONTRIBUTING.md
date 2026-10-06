# Contributing

This is a personal project, and **outside contributions aren't being accepted during the beta**.
Pull requests from outside the project will be closed. Please don't take that as a judgement of
the work.

## What is welcome

- **Bug reports and ideas**, as [issues](https://github.com/Haugenau20/DnDCampaignCompanion/issues/new/choose).
  Use the templates; they ask for what makes a report actionable.
- **Security problems**, privately. Never in an issue: see [`SECURITY.md`](SECURITY.md).
- Reading, running and forking the code under its [licence](LICENSE).

Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).

## Running it locally

[`CLAUDE.md`](CLAUDE.md) is the working guide: running the app against the Firebase emulators,
the architecture and its dependency rules, and the testing philosophy. [`docs/`](docs/README.md)
holds the specs and the bug tracker, and [`TODO.md`](TODO.md) the backlog.

## How changes get in

For the record, and for when contributions open. `main` deploys to production on every merge, so
every change goes through a pull request that passes the same checks CI runs:

1. `npx tsc --noEmit`
2. `npm test`, fully green
3. `npm run lint` (zero warnings) and `npm run lint:tests` (no file above its baseline)
4. `npm run build`, then `npm run check:bundle`
5. the `firebase/functions` suite when `firebase/` changes (`CLAUDE.md` says how to run it)

The pull request template lists them, with the privacy-policy check.
