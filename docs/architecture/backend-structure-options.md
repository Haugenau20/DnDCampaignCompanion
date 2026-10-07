# Backend structure: was it any good, and what would be better? (T119)

Written 2026-10-07. This is a companion to
[`data-model-review.md`](data-model-review.md), not a replacement. That review looks at how the
*code* uses the data. This one asks whether the backend's *structure* would be better built
differently, whatever the effort. Nothing has been changed.

**The brief** (maintainer, 2026-10-07):

- The backend was designed when nothing about it was known. Now that much is, is what we have
  been doing all along any good?
- Better is better, whatever the migration costs.
- Explore several routes, at least one of them on Firebase, and compare them in a decision
  matrix.
- No future features are to be designed for.
- Nothing may depend on a machine at home.
- The EU is preferred but not absolute: images already sit in the US because that is free.
- A fixed monthly fee is unwelcome, since the site has no income. A small fee is still better
  than a site that stops working when a free allowance runs out (added the same day).

**How it was measured.** The verdict on the current backend is read in the code and git history
(`main` at `b78d72f`), with sizes counted as stated. Facts about the other platforms come from
their documentation, linked under [Sources](#sources), as read on 2026-10-07. Every claim that
only a prototype could settle is listed under [What a spike must prove](#what-a-spike-must-prove).

---

## The verdict on what we have

### What holds up

- **The group is the tenant**, and everything a group owns sits under `groups/{g}`. Access,
  deletion and image paths all follow that one boundary. Every route below keeps it.
- **Membership and roles are server-side**: Cloud Functions write them, and the rules refuse them
  to clients. The rules ship from the repo and are pinned by tests that act as real users. This
  part is well built for the platform it is on.
- **Deletion is resumable** (`campaignDeletions`, `groupDeletions` and the daily resume jobs).
  Nothing is stranded when a function dies halfway.

### Where the platform's shape has cost us

The data is **relational**: about a dozen kinds of record, linked to each other by id, with rules
like "one username per group", "a quest's NPCs exist", "deleting a campaign deletes everything in
it" and "a group keeps an admin". Firestore is a document store. It has no foreign keys, no
uniqueness, no cascades and no joins, and a transaction can neither run a query nor include Storage
or Auth. Each of those gaps was paid for by building the missing piece by hand:

| What a relational store gives for free | What we built instead | Where |
|---|---|---|
| unique constraint | a reservation document per username; slug ids claimed by atomic create (T081) | `usernames/`, `entity-id.ts`, `createDocumentIfAbsent.ts` |
| foreign keys and `ON DELETE CASCADE` | deletion functions, a resume ledger and a daily resume job per kind; a `deleting` mark the rules check on every write (T037) | the deletion functions (643 lines), rules `campaignOpen` |
| a transaction that includes a query (delete a subtree) | a `deleting` fence on locations, walked level by level from the client (T088) | rules `locationFenceHolds`, 12 references in `locations/` |
| row-level lists (a note is a row) | read-modify-write transactions on arrays inside records (T083) | 7 client modules use transactions |
| `JOIN` | whole-collection listeners, joined in the browser | every detail page's "inbound" list |
| one membership row | membership stored twice: `users/{uid}.groups` (what the rules read) and the group profile (T052, T080) | `firestore.rules.prod:318` |
| column types and `CHECK` | the rules name the record types, require a name as text and cap each text field (T119 F4); what is inside a list stays unchecked | rules `namingField`, `keepsItsName`, `textFits` |
| defaults set by the server | attribution and times written by the browser and believed (T119 F5, F6) | `attribution.ts` |

Measured in git history: 30 of the 931 commits on `main` belong to these seven items (T037, T052,
T080, T081, T083, T084, T088). All but T084 trace back to a row of the table. Some cost is
unrelated to the store and stays on any route:

- the image ledgers (T084), because no store commits a file and a row together;
- the sign-up gate and device sign-in, because they are about authentication.

**Verdict.** The structure is good *Firestore*. It is the right tenant boundary, defended
carefully, and most of the bugs it had are fixed. But much of the recent backend work went into
rebuilding, by hand, guarantees that a relational database enforces itself. The question is not
whether the work was done well. It is whether it should have been needed. For this domain it
should not have been. A relational store fits the data better, and the routes below are judged
mostly on that.

---

## What every route must keep

- **Live updates** between players at one table.
- **Group tenancy**: shared campaign content, plus private notes and reading progress per player.
- **Sign-in by magic link and Google**, admitting only invited addresses (the gate), with no
  passwords.
- **Images**, resized in the browser, stored as files.
- **AI extraction on the server**, with the OpenAI key never in the browser, and per-user quotas.
- **Nothing at home.** Every piece is a hosted service.

---

## The routes

Seven routes: three stay on Firestore, four move to a relational or reactive store. The
[relational schema](#appendix-the-relational-schema) at the end is shared by R4, R5 and R7, and
is the table layout for R6.

### R1. Firestore as it is (the baseline)

Today's layout, with the frontend fixes from `data-model-review.md` (one owner per relationship,
the persistent cache). Every gap in the table above stays, held by the code that holds it now.

- **Cost**: within Firestore's free daily quota at today's size.
- **Effort**: none.

### R2. Firestore, restructured

The "from scratch" layout in `data-model-review.md`:

- one membership document, `groups/{g}/members/{uid}`;
- every collection named in the rules, with the required fields and size limits checked there;
- attribution checked against `request.auth.uid` and `request.time`;
- notes and chapter text in their own documents;
- server Timestamps;
- auto ids.

The rules become a real schema.

- **What it fixes**: F3 to F7 of the review.
- **What it leaves**: no uniqueness, no cascades, no joins, no cross-document constraints. The
  deletion functions, the reservations and the fences all stay.
- **Effort**: a full rewrite of the data, the rules and the services. That is close to a
  migration's effort, for about half its benefit.

### R3. Firestore, with every write on the server

The R2 layout, but the rules become **read-only** for content. Every write goes through a Cloud
Function: one domain layer in TypeScript that validates, stamps attribution and time, and keeps
cross-document invariants inside Admin SDK transactions.

- **What it fixes**: everything about trust. Validation is ordinary code with ordinary tests,
  not the rules language.
- **What it leaves**: the same missing database features as R2, now enforced in function code
  instead of rules.
- **What it costs**:
  - Every edit makes a function round trip: a cold start the first time, and a save that fails
    without a network, where today Firestore queues it.
  - It adds function invocations to the bill.
  - It is the most code to own of any route.

### R4. Firebase SQL Connect (Postgres inside Firebase)

SQL Connect is Firebase's managed Postgres, on Cloud SQL. It was called Data Connect until 2026.
Its pieces:

- The schema is written in GraphQL and becomes Postgres tables.
- Clients call only **named queries and mutations** deployed with the schema, each with an
  `@auth` rule. A client cannot run arbitrary queries, so the API layer of R3 comes built in.
- Live updates arrive through query subscriptions. A lookup by key refreshes on its own. A list or
  a join refreshes only where it is annotated with `@refresh`, and only for mutations made
  through SQL Connect (not `_deleteMany` or `_updateMany`).
- Firebase Auth, App Check, Storage, Hosting, Functions, the emulator suite and the CI deploy all
  stay.

**What it fixes**: every gap in the verdict's table except the image ledgers:

- uniqueness, foreign keys and cascades in the schema;
- joins and counts in queries;
- one membership row;
- attribution and time stamped on the server (`@default(expr: "auth.uid")`,
  `request.time`).

The deletion functions, resume jobs, reservations and fences go.

**What it costs**:

- **A fixed monthly fee.** Cloud SQL has a 90-day free trial, then from about $9.37/month for the
  smallest instance, plus SQL Connect operations beyond 250k a month at $4 per million.
- **Images stay in the US** unless the bucket moves to the EU, which is not free but is cents a
  month at today's volume.
- **Offline writes are gone.** A save needs the network.
- **Live updates are the newest part of the product.** Annotating every list with its refresh
  triggers is ours to keep right.

### R5. Supabase (leave Firebase)

Postgres with Row Level Security, Realtime, Auth, Storage and Edge Functions as one hosted
service, with EU regions. Its pieces:

- The schema is plain SQL, and every access rule is an RLS policy in SQL, testable with pgTAP.
- Realtime streams any change to a subscribed table, filtered by RLS for each subscriber.
- Business actions (create a group, redeem an invitation, change a role) become Postgres functions
  that run in a single transaction.
- Supabase's "before user created" auth hook can refuse an uninvited address, which is today's
  gate.
- Firebase Auth can be kept at first, as a supported third-party provider, so data and accounts
  can move separately.

**What it fixes**: everything R4 fixes, plus:

- **Every write path updates live**, not only annotated ones.
- **All data in the EU**, images included.
- **The least lock-in**: it is plain Postgres, the platform is open source, and the data and
  policies move anywhere.

**What it costs**:

- **$25/month at least.** Free projects pause after a week without activity, so production needs
  Pro.
- **Everything moves**: auth, files, server code (Edge Functions, or keep Cloud Functions calling
  Supabase), CI and the deploy.
- **Docker for local development and CI.** `supabase start` runs the stack in containers, and
  this repo removed Docker on purpose.
- **Offline writes are gone**, as in R4.

### R6. Convex (a reactive backend)

A hosted database where every query and mutation is a TypeScript function deployed with the app,
and every query is live by default. It has an EU region (Dublin) since February 2026, on every
plan. Its pieces:

- Mutations are serializable transactions.
- A schema with typed ids and indexes; relations are ids, as in Firestore.
- File storage is built in.
- Auth through any OIDC provider, so Firebase Auth can stay.

**What it fixes**:

- **Live updates everywhere**, with no listeners to manage.
- **Transactions as wide as needed**, so the fences and the read-modify-write code go.
- **All of it in the EU.**
- **Validation and attribution in code**, as in R3, but without R3's cold starts.

**What it leaves**: no foreign keys, no uniqueness and no cascades. They become code inside
transactions, which is safe but still ours to write.

**What it costs**:

- **No fixed fee, and the site keeps running.** The Starter plan is pay-as-you-go once a card is
  registered: 1M function calls, a 0.5 GB database, 1 GB of database I/O and 1 GB of files are
  included each month, and beyond that usage is billed while deployments keep serving. A spend
  limit can be set to warn rather than to disable. Without a card, the free plan may answer with
  errors once a limit has been exceeded for a while, so production belongs on Starter.
  Billed usage in the EU region is priced 30% higher than in the US.
- **Database I/O counts every document a query scans**, not only those it returns. A missing
  index costs money.
- **No daily backups below the $25 Professional plan.** Backups become a scheduled export we run
  ourselves.
- **The most lock-in**: a proprietary programming model, although its backend can be self-hosted.
- **A smaller ecosystem**.
- **A full rewrite of every data path**.

### R7. Cloudflare: D1, Workers and Durable Objects

A relational store at the edge, with the API and live updates written by us. Its pieces:

- **D1** is SQLite: real foreign keys, uniqueness and cascades. A database can be pinned to the EU
  when it is created.
- **Workers** are the API. Every read and write goes through one, which checks the caller's
  Firebase ID token and their membership. This is the domain layer of R3, but in front of a
  relational store.
- **A Durable Object per campaign** holds the players' WebSockets. After a write, the Worker tells
  it what changed, and it tells the players, whose pages fetch again.
- **R2** holds images, in the EU. Firebase Auth can stay.

**What it fixes**: the schema gaps in the verdict's table, as R4 and R5 do: uniqueness, foreign
keys, cascades, joins and one membership row. It puts all data in the EU, and it needs no Docker
(`wrangler dev` runs everything locally).

**What it leaves**:

- **Live updates are ours to build.** That includes reconnects, and catching up on what a
  dropped connection missed.
- **The whole API is ours.** Every endpoint checks access in code, and nothing declarative backs
  it up.
- **D1 has no interactive transactions.** A batch of statements is atomic, but read-then-decide
  logic (a group keeps an admin) must be one conditional statement, or must go through a Durable
  Object.

**What it costs**:

- **$5/month.** That is the Workers Paid minimum, which covers D1, Durable Objects and Workers
  far beyond this site's use, and bills any overage. The free plan costs nothing, but since
  2026-09-01 D1 refuses queries once a daily limit is reached, until midnight UTC. Per the
  maintainer's preference (a small fee over a site that stops), this route is priced on Paid.
- **Lock-in in the edges.** The schema is portable SQLite; the Worker and Durable Object code is
  Cloudflare's.

---

## Decision matrix

Scores run from 1 (poor) to 5 (best) for the end state. Migration effort is shown but **not
scored**, as the brief asks. Scores are a judgement from the sections above, not measurements.

Cost is split in two:

- **Fixed monthly cost** is what is paid whatever the use. The maintainer would rather not have
  one, since the site earns nothing. A small fee is still better than a site that stops working.
- **Usage cost** is what is billed on top, for use beyond what is included.

OpenAI extraction is usage-billed on every route and is left out.

| | R1 Firestore as is | R2 Firestore restructured | R3 Firestore, server writes | R4 SQL Connect | R5 Supabase | R6 Convex | R7 Cloudflare |
|---|---|---|---|---|---|---|---|
| **Fits the data** (linked records, constraints) | 2 | 3 | 3 | 5 | 5 | 4 | 5 |
| **The store enforces integrity** (unique, FK, cascade, transactions) | 1 | 2 | 3 | 5 | 5 | 4 | 4 |
| **Access model** (how clear, how testable) | 3 | 4 | 5 | 4 | 5 | 4 | 4 |
| **Live updates** | 5 | 5 | 5 | 3 | 4 | 5 | 3 |
| **Offline edits** | 4 | 4 | 2 | 2 | 2 | 2 | 2 |
| **Read efficiency** (joins, paging, counts) | 2 | 3 | 3 | 5 | 5 | 4 | 5 |
| **Hand-built backend code that disappears** | 1 | 2 | 2 | 4 | 4 | 4 | 3 |
| **Fixed monthly cost** | 5 ($0) | 5 ($0) | 5 ($0) | 3 (~$9.37) | 1 ($25) | 5 ($0) | 4 ($5) |
| **Usage cost, today** | 5 | 5 | 4 | 5 | 5 | 5 | 5 |
| **Usage cost, 30 groups** | 4 | 4 | 4 | 4 | 5 | 4 | 5 |
| **All data in the EU** | 3 | 3 | 3 | 3 | 5 | 5 | 5 |
| **Nothing to operate** | 5 | 5 | 5 | 4 | 4 | 5 | 5 |
| **Local dev and tests without Docker** | 5 | 5 | 5 | 4 | 2 | 4 | 5 |
| **Portability, lock-in** | 2 | 2 | 2 | 3 | 5 | 2 | 3 |
| **Maturity of the parts we rely on** | 5 | 5 | 5 | 3 | 4 | 3 | 4 |
| **Total (of 75)** | 52 | 57 | 56 | 57 | 61 | 60 | 62 |
| *Migration effort* | *none* | *large* | *large* | *large* | *largest* | *largest* | *largest* |

Every route bills overage rather than stopping: Firebase on Blaze, Convex on Starter, Supabase on
Pro and Cloudflare on Workers Paid.

**How to read the totals.** They weight every row equally. That is not how the brief weights
them, so do not decide on the totals:

- "Better is better" puts the first three rows and "hand-built code that disappears" above
  convenience. On those four rows, R5 leads (19 of 20), then R4 (18), then R6 and R7 (16 each),
  then R3 (13).
- The cost stance then counts against a fixed fee. That rules out R5 at $25/month and weakens R4.
  It leaves R6 ($0) and R7 ($5) as the routes that fix the structure at a price the site can
  carry.
- Between R6 and R7:
  - Convex builds in what Cloudflare leaves to us: live updates and transactions that can read
    before they write.
  - Cloudflare builds in what Convex leaves to us: foreign keys, uniqueness and cascades.

---

## Recommendation

**Leave Firestore for a store that fits the data, without a large fixed fee. Spike Convex first.**

- **R6, Convex**, is the first spike. It has no fixed fee and keeps running past its allowance.
  Live updates come everywhere without building them, mutations are transactions that can query,
  and everything is in the EU. Its gaps are foreign keys, uniqueness and cascades, which become
  code inside those transactions. That is the same kind of code we write today, but without
  fences, ledgers or resume jobs, because nothing can interleave with it. The price is lock-in,
  and backups we schedule ourselves.
- **R7, Cloudflare**, is the alternative if the spike shows Convex's missing constraints or
  lock-in weigh more than expected. It is real SQL integrity in the EU for $5/month, at the price
  of writing the API and the live updates ourselves.
- **R5, Supabase**, remains the best end state on integrity and portability. At $25/month it does
  not fit a site with no income.
- **R4, SQL Connect**, is set back by its fixed fee and by the youngest live updates.

R2, restructuring Firestore at $0, is the fallback if both spikes fail. It is worth doing on its
own merits, but it keeps every gap in the verdict's table.

---

## What a spike must prove

One campaign, NPCs and quests only, two browsers side by side. A route that fails any of these is
out.

1. **Live lists.** A player adds an NPC to a quest, and the other browser's quest page *and* NPC
   page update without a reload. For R7, this tests the broadcast we would write.
2. **Access.** A non-member cannot read or write the campaign, through the API rather than the UI.
   One player's private note is unreadable by another.
3. **Integrity.** Deleting the campaign removes everything under it in one transaction, private
   notes included. A username cannot be taken twice, even by two players at the same instant.
4. **Firebase sign-in carries over.** The new store accepts today's Firebase ID tokens: Convex as
   an OIDC provider, Cloudflare by verifying them in a Worker. The invite gate stays as it is.
5. **Tests.** The access checks run in CI as automated tests, the way the rules suite does today,
   with no Docker.
6. **Backups.** A scheduled export restores into a fresh deployment.
7. **Cost.** A week of the spike's usage, read from the billing page. The spend setting warns and
   does not stop the site.

---

## How the move would go

1. **The schema and its access rules**, from the appendix, with tests. Records keep their current
   ids as keys, so every URL and bookmark keeps working.
2. **Auth stays on Firebase.** The new store trusts Firebase ID tokens. Users notice nothing.
3. **A copy script** in the shape of `audit-location-ids.js`: it reads Firestore with the Admin
   SDK, writes the new store, and has a dry run and a count check. The data is small (kilobytes
   per record), so a full copy takes minutes. It is re-runnable until cutover.
4. **The frontend's data layer is swapped** behind the existing context hooks (`useNPCs` and the
   rest), one domain at a time, on a branch running against the copy.
5. **Cutover.** Freeze writes, run the final copy and switch. Firestore stays read-only for a
   while as the rollback.
6. **Then** move images into the new store's file storage in the EU, and delete what the new store
   made unnecessary: deletion functions, resume jobs, reservations and fences.

---

## Considered and set aside

- **PocketBase, or Appwrite on our own server.** Good fits for the data, but someone has to run
  the server. A rented VPS satisfies "not at home" but brings patching and backups.
- **MongoDB Atlas.** Another document store, with the same gaps as Firestore.
- **Firebase Realtime Database.** Fewer guarantees than Firestore, not more.

## Sources

Read 2026-10-07.

- SQL Connect live updates: <https://firebase.google.com/docs/sql-connect/realtime>
- SQL Connect and Cloud SQL trial and pricing: <https://firebase.blog/posts/2026/03/fdc-ift/>,
  <https://firebase.google.com/docs/data-connect/pricing>
- Supabase plans: <https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/>
- Supabase with Firebase Auth: <https://supabase.com/docs/guides/auth/third-party/firebase-auth>
- Supabase "before user created" hook: <https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook>
- Convex EU region: <https://ship.convex.dev/changelog/eu-region-hosting-dublin>
- Convex with an OIDC provider: <https://docs.convex.dev/auth/custom-auth>
- Convex plans and overage: <https://www.convex.dev/pricing>, <https://www.convex.dev/pricing/faq>
- Cloudflare Workers Paid: <https://developers.cloudflare.com/workers/platform/pricing/>
- D1 limits, free-plan enforcement and EU jurisdiction: <https://developers.cloudflare.com/d1/platform/limits>,
  <https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/>,
  <https://developers.cloudflare.com/changelog/post/2025-11-05-d1-jurisdiction/>
- Durable Objects pricing: <https://developers.cloudflare.com/durable-objects/platform/pricing>

---

## Appendix: the relational schema

What R4, R5 and R7 share: R4 writes it in GraphQL, R5 in Postgres SQL, R7 in SQLite. For R6 the
same tables become Convex tables, with the constraints written in its mutations. Every table carries `created_by`,
`created_at`, `modified_by` and `modified_at`, set by the server and never by the client.

```
groups            id, name, description, crest_path
members           group_id → groups, user_id, role, username, joined_at,
                  active_campaign_id, active_character_id
                  PK (group_id, user_id); UNIQUE (group_id, lower(username))
characters        id, group_id, user_id, name, campaign_id
invitations       token PK, group_id → groups, expires_at, used_by, used_at, note
campaigns         id, group_id → groups ON DELETE CASCADE, name, description, banner_path

-- all below: campaign_id → campaigns ON DELETE CASCADE
locations         id, parent_id → locations, name, type, status, description, image_path,
                  last_visited, tags[]
npcs              id, name, title, status, race, occupation, relationship, description,
                  appearance, personality, background, image_path, tags[],
                  location_id → locations ON DELETE SET NULL, location_text
quests            id, title, description, status, background, level_range, completed_on,
                  location_id → locations ON DELETE SET NULL
quest_objectives  id, quest_id → quests ON DELETE CASCADE, position, description, completed
rumors            id, title, content, status, source_type, source_name,
                  source_npc_id → npcs, location_id → locations,
                  converted_to_quest_id → quests

-- links, one row per link, each stored once
quest_npcs        quest_id, npc_id                  PK (quest_id, npc_id)
quest_places      quest_id, name, description, location_id → locations (nullable)
npc_npcs          npc_id, other_npc_id, kind
rumor_npcs        rumor_id, npc_id
rumor_locations   rumor_id, location_id

record_notes      id, npc_id | location_id | rumor_id (exactly one), text, noted_on (date)
chapters          id, position, title, summary, content
saga              campaign_id PK, content

-- private to one player
private_notes     id, user_id, campaign_id → campaigns ON DELETE CASCADE, title, content,
                  status, tags[]
extracted_entities id, note_id → private_notes ON DELETE CASCADE, type, text, confidence,
                  converted_to_id
reading_progress  user_id, campaign_id, chapter_id, position, completed[]
ai_usage          user_id, period, used, resets_at
```

Deleting a campaign is one `DELETE`. "Quests this NPC is in" is one query in each direction.
A username cannot be taken twice. A location's subtree goes in one transaction (a recursive
query). None of these needs a function, a ledger or a fence.
