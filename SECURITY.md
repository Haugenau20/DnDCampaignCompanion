# Security policy

## Reporting a vulnerability

**Please don't open a public issue for a security problem.** Report it privately through GitHub:
the repository's **Security** tab → **Report a vulnerability**
([direct link](https://github.com/Haugenau20/Muninn/security/advisories/new)).
Only the maintainer sees the report.

Include what you found, how to reproduce it, and what an attacker could do with it. A proof of
concept against your own account or a local copy (see [`CLAUDE.md`](CLAUDE.md) for running it
against the Firebase emulators) is welcome. Don't test against other people's accounts or data on
the live site.

## What to expect

This is a personal project with one maintainer, so there is no fixed response time. Reports are
read, confirmed or answered, and fixed in order of severity. Once a fix has shipped, the report can
be published as an advisory, with credit to you if you want it.

## Scope

The code in this repository: the web app, the Cloud Functions in `firebase/functions`, and the
Firestore and Storage rules (`firebase/*.rules.prod`), which are deployed from here. The Firebase
and Google Cloud platforms themselves belong to Google's own programme.
