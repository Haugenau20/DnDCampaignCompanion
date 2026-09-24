# Campaign images on Firebase Storage — implementation plan

**Spec**: `docs/superpowers/specs/2026-09-24-storage-images-design.md` · **TODO**: T021
**Branches**: PR 1 `feat/storage-plumbing`, PR 2 `feat/storage-images-ui`, both from `main`.

Each task is test-first: write the test from the spec, watch it fail for the
right reason, then implement. Gates at the end of each PR are the three in
CLAUDE.md (`tsc`, `npm test`, `npm run build`) plus the functions suite
wherever `firebase/` changed.

---

## PR 1 — plumbing (ships nothing a user can see)

### Task 1 — Verify the emulator config question (spike, 15 min)
- Stop the emulators. Try `firebase emulators:start --only storage` with no
  `storage` key in `firebase.json`, and record what happens.
- If it refuses: create `firebase/firebase.emulators.json` (a copy of
  `firebase.json` plus `"storage": {"rules": "storage.rules"}` and
  `"emulators.storage": {"port": 9199}`), and make **all four**
  `emulators:start` / `emulators:export` calls in `scripts/start-dev.ps1` pass
  `--config firebase.emulators.json`. Add a `//` comment to both files saying
  why there are two.
- If it starts without the key: just add the 9199 port to `firebase.json`.
- **Check**: `firebase deploy --only storage --dry-run` from `firebase/` must not
  find any rules to deploy (it doesn't touch the live project).
- **Check**: `-Action start`, `stop` (export) and `start` (import) all
  round-trip, and the emulator UI shows a Storage tab.
- Update CLAUDE.md's "Running the Project" and its ports line (4000/5001/8080/9099 → plus 9199).

### Task 2 — `StoredImage` type
- `src/core/types/storedImage.ts`, exported from the `core/types` barrel if there is one.
- Add `image?: StoredImage` to `NPC` and `Location`, and `crest?: StoredImage`
  to the group type. Check each type file's imports: `core/` may not import `features/`.

### Task 3 — `prepareImage`
- `src/core/utils/image/prepareImage.ts` + `__tests__/prepareImage.test.ts`.
- Tests (with `createImageBitmap`, `HTMLCanvasElement.toBlob` and
  `getContext` mocked — JSDOM has none of them): 4000×3000 → 1600×1200;
  800×600 stays 800×600; a WebP request answered with PNG falls back to JPEG;
  over 20 MB refused; `text/plain` refused; `image/svg+xml` refused; a decode
  rejection gives the "not supported in this browser" message; an
  over-2 MB result is re-encoded once, then refused.
- Export the limits (`MAX_INPUT_BYTES`, `MAX_UPLOAD_BYTES`, `MAX_EDGE_PX`) so
  the rules test and the UI copy can't disagree with them.

### Task 4 — Storage in `BaseFirebaseService`
- Register `storage` (`getStorage(app)`) and, with emulators,
  `connectStorageEmulator`. Update `BaseFirebaseService`'s tests and the
  `firebase/storage` jest mock (find how `firebase/firestore` is mocked in
  `setupTests.ts`/`__mocks__` and do the same).
- The storage instance must come from the **default app** — the one
  `src/index.tsx:57` attaches App Check to, which production Storage now enforces.

### Task 5 — `ImageStorageService`
- `src/core/services/firebase/storage/ImageStorageService.ts`, extending
  `BaseFirebaseService`; registered in `core/services/firebase/index.ts`
  (`FirebaseServices.storage`) and its lazy stand-in.
- `upload(prefix, prepared, onProgress?)`: `uploadBytesResumable` with
  `{contentType, cacheControl: "public, max-age=31536000, immutable"}`, then
  `getDownloadURL`, and returns a `StoredImage` (`uploadedBy` from
  `auth.currentUser`, which is required).
- `remove(path)`: `deleteObject`; `storage/object-not-found` resolves.
- `entityImagePrefix(groupId, campaignId, "npcs" | "locations", id)` and `crestPrefix(groupId)`.
- `isOwnBucketUrl(url)` for the render guard (spec §4), tested with the
  production and emulator URL shapes and a foreign URL.

### Task 6 — Rules review copy + rules suite
- `firebase/storage.rules.prod` from spec §6, after re-checking the helpers
  against `firestore.rules.prod` (they must read the same fields). Header
  comment on the `firestore.rules.prod` model: review copy, console-authored,
  never deployed from here.
- `firebase/storage.rules` is **not changed** (T021's catch).
- `firebase/functions/test/rules/storage-rules-prod.test.ts`, with
  `@firebase/rules-unit-testing` against the Storage emulator. Seed Firestore
  (`users/{uid}.groups`, `groups/{g}/users/{uid}.role`) with rules disabled.
  Cases: member reads, non-member doesn't; member creates a 100 KB WebP on an
  NPC path; refused for ≥ 2 MB, `image/png`, `image/svg+xml`, `quests/…`,
  non-member, signed out; overwrite refused; member deletes; crest create —
  admin yes, member no; `groups/{g}/other/x` denied.
- Add 9199 to `test/globalSetup.ts`'s reachability check.
- **Control**: `RULES_FILE=<wide-open ruleset>` must fail every deny case. Record it in the PR.

### Task 7 — `deleteCampaign` removes the files
- In `firebase/functions/src/campaignManagement/deleteCampaign.ts`:
  `admin.storage().bucket().deleteFiles({prefix: "groups/{g}/campaigns/{c}/"})`
  **before** `recursiveDelete`, next to the existing notes deletion and
  covered by its ordering comment.
- A new `test/deleteCampaign.test.ts` (copy the `test/emulator.ts` harness):
  files under the campaign are gone; a sibling campaign's and another group's
  files remain; a non-admin caller deletes nothing.
- The functions' default bucket is the same `.firebasestorage.app` bucket —
  confirm `admin.storage().bucket()` resolves to it in the emulator, or pass it by name.

### PR 1 gates
`npx tsc --noEmit` · `npm test` · `npm run build` · `cd firebase/functions && npm test && npm run build`.
Merge. Nothing in the app calls the service yet.

---

## Console (maintainer, between PRs)
1. Storage → Rules: paste `firebase/storage.rules.prod`, publish, and accept
   the Firestore cross-service permission prompt.
2. Read the rules back from the console and diff them against the file.
3. Cloud Billing → Budgets: a $5/month alert.
4. After PR 1 merges: redeploy functions so `deleteCampaign` has the prefix delete.

App Check enforcement for Storage is already on (2026-09-24).

---

## PR 2 — UI and privacy policy

### Task 8 — `ImageSlot` filled state
- Props `image?: StoredImage` and `alt?: string`. Render the `<img>` only when
  `isOwnBucketUrl(image.url)`; otherwise the unchanged empty state.
- Tests: empty unchanged (existing tests stay green untouched); filled renders
  `img` with alt, width, height and lazy loading; a foreign URL renders empty.
- Rewrite the doc comment's "no Storage, no picker" paragraph.
- If a new class is needed for the filled state, add it to the stylesheet and
  the CSS class manifest test's expectations; theme tokens only.

### Task 9 — `ImageUploadControl`
- `src/shared/components/ImageUploadControl.tsx`. Props: `image?`, `onUpload(file)`,
  `onRemove()`, `label`. Owns only UI state: idle / preparing / uploading(%) /
  error, and remove confirmation. Calls `prepareImage` and hands the result to
  the parent's handler, so it knows nothing about Firestore.
- Tests: add → progress → done; a `prepareImage` error shows its message; a
  service error shows a retryable message; remove requires confirm; buttons are
  disabled while busy; keyboard-reachable; no hardcoded colours.

### Task 10 — NPC image
- `NPCDetailPage`: pass `npc.image` to the existing slot and render the control.
- The attach/replace/remove orchestration lives in a hook in the NPC feature
  (`useEntityImage` or similar in `campaign-entities` — check whether the
  location needs the same hook, and if so, place it where both can import it
  without crossing a barrel). Order per spec §7: upload → `updateNPC({image})`
  → `remove(oldPath)` best effort, with its failure logged, not shown.
- `deleteNPC`: after the document delete, `remove(image.path)` best effort.
- Tests: the order is asserted (a failing `updateNPC` must not delete the old
  file); delete removes the image; a failing image removal doesn't fail the delete.

### Task 11 — Location image
- `LocationDetailPage` header band gains an `ImageSlot` + control, matching the
  NPC layout; update the `:96` doc bullet.
- Same hook as Task 10. `deleteLocation`: remove the image of **every** location
  the subtree strategy deletes, not only the root.
- Tests as in Task 10, plus the subtree case.

### Task 12 — Crest
- `PartyCrest` shows `activeGroup.crest`. The control renders only for group
  admins (use the existing role check the admin UI uses — find it, don't add a new one).
- Writes go through the existing group update path (admin-only in Firestore
  already). Tests: a member sees the crest but no control; an admin gets the
  control; the replace order is as in Task 10.

### Task 13 — Privacy policy
- `privacy.ts`: new `images` row (spec §10) and whatever constants the
  legal-basis text reads. `PrivacyPolicyPage.tsx`: the legal-basis paragraph
  (three things leave the EU), metadata stripping, and link visibility. A "What
  changed" entry and the hand-written date.
- Tests: the new row renders; the US storage is named; metadata stripping is
  stated. Where an existing test pins the old "two things" wording, change its
  expectation, because the requirement changed. Say so in the PR.

### Task 14 — Browser check (dev server, emulators)
- On each surface: add a phone JPEG with GPS EXIF, replace it with a PNG,
  remove it. Download the stored file and confirm no EXIF (`exiftool` or
  similar). Refuse an SVG and a 25 MB file. Member vs admin on the crest (log in
  as `player8@example.com`, the second admin, and as a plain member). 320px
  iframe check on the NPC and location headers.

### Task 15 — Bookkeeping
- TODO.md: close T021 per the closing rule (entry, row and every prose
  mention); T020 is no longer blocked on it — update its row. File the orphan
  sweeper as a new item.
- `ImageSlot`/`LocationDetailPage` comments that say uploads don't exist are gone.

### PR 2 gates
`npx tsc --noEmit` · `npm test` · `npm run build`. After merge: the live
check in spec §12 step 4. It is the only test of the App Check path.
