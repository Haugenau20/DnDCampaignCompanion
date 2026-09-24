# Campaign images on Firebase Storage — design

**Status**: approved in conversation 2026-09-24 · **TODO**: T021 · **Plan**: `docs/superpowers/plans/2026-09-24-storage-images.md`

## 1. Goal and scope

Let a group put images on its campaign: a portrait on an NPC, a picture on a
location, and a crest for the party. Designed for a public user base, not the
maintainer's test group, so nothing here has to be reworked at launch.

**In v1**
- NPC image, on `/npcs/:npcId`
- Location image, on `/locations/:locationId` (the page gains an `ImageSlot` in its header band)
- Group crest, on the dashboard's `PartyCrest`, changeable by **group admins only**

**Out of v1, but the layout leaves room for them without moving a file**
- User avatars (`users/{uid}/…`), bug-report screenshots (T020, `support/{uid}/…`),
  maintainer default artwork (`public/…`)
- Images on quests, rumors, chapters
- Uploading from a create form — images are added on the detail page afterwards
- A thumbnail rendition (nothing lists images small yet)
- A focal point for cropping (see §8)
- An orphan sweeper (see §7; built after v1)

## 2. Decisions and why

| # | Decision | Why |
|---|---|---|
| D1 | Bucket `dnd-campaign-companion.firebasestorage.app` in **us-west1** | Only us-west1/us-central1/us-east1 get the no-cost quota (5 GB stored, 100 GB/month download). Region is permanent. Cost: a US transfer, disclosed in the privacy policy (§10). |
| D2 | Images are served by **download URL** (`getDownloadURL`), not rules-checked reads | Scales best: a view is CDN-served and browser-cached, runs no rule and costs no Firestore read. Rules-checked reads (`getBlob`) would run the rules — and their Firestore `get()` — on **every view**, and defeat caching. Trade-off: the URL is a bearer capability (§6). |
| D3 | Every upload gets a **new random file name**; files are never overwritten | An object that never changes can be cached forever (`Cache-Control: public, max-age=31536000, immutable`), and a replace can't show a stale image. |
| D4 | **Resize and re-encode in the browser** before upload | Size (a 6 MB phone photo becomes ~200 KB), no server cost, and it **strips EXIF, including GPS** — a privacy requirement, not an optimisation. |
| D5 | Rules are a **review copy** (`firebase/storage.rules.prod`) pasted into the console, never deployed from the repo | Same model as `firestore.rules.prod`; see T021's catch and `firebase.json`'s `//` comments. |
| D6 | Crest: **group admins** only | Matches who may update the group document today — no Firestore rule changes. |
| D7 | Upload only on detail pages | A create form has no entity id yet, so it would need upload-then-attach ordering for no real gain. |
| D8 | Location image sits in the **page header**, as on the NPC page | Consistent; a later page redesign (todo.txt) only restyles the slot, because the stored image is uncropped (§8). |

## 3. Storage layout

```
groups/{groupId}/campaigns/{campaignId}/npcs/{npcId}/{imageId}.{webp|jpg}
groups/{groupId}/campaigns/{campaignId}/locations/{locationId}/{imageId}.{webp|jpg}
groups/{groupId}/crest/{imageId}.{webp|jpg}
```

- Mirrors the Firestore paths, so a rule can take `groupId` from the path and a
  campaign's files are one prefix.
- `imageId` is a random id (`crypto.randomUUID()`); the extension follows the
  encoded type.
- Only `npcs` and `locations` are accepted under a campaign in v1; adding an
  entity type later is one word in the rules and one in the type union.

## 4. Data model

One new type in `core/types/` (a dedicated file, per code style):

```ts
/** An image held in Firebase Storage and referenced from a Firestore document. */
export interface StoredImage {
  /** Full object path in the bucket; what deletion uses. */
  path: string;
  /** Tokenised download URL; what rendering uses. */
  url: string;
  /** Pixel size after resizing — lets any slot shape crop it correctly. */
  width: number;
  height: number;
  /** uid of the uploader. */
  uploadedBy: string;
  /** ISO timestamp. */
  uploadedAt: string;
}
```

- `NPC.image?: StoredImage`, `Location.image?: StoredImage`, `Group.crest?: StoredImage`.
- Written with the existing update paths (`updateNPC`, `updateLocation`, the
  group update), so attribution and `updateDoc` merge behave as today.
- **Render guard**: a member can write any value into Firestore. `ImageSlot`
  renders `url` only if it starts with this bucket's download base
  (`https://firebasestorage.googleapis.com/v0/b/<bucket>/o/`, or the emulator's
  equivalent). Otherwise it shows the empty state. This stops a member from
  planting a third-party tracking image that logs every viewer's IP.

## 5. Image preparation (browser)

`core/utils/image/prepareImage.ts` — a pure-ish function, `File → { blob, width, height, contentType }`.

1. **Any image format the viewer's browser can decode is accepted**, and
   converted here. The user never has to produce WebP. In practice that is
   JPEG, PNG, WebP, GIF (first frame), AVIF and BMP everywhere, plus HEIC in
   Safari. iOS's file picker also hands over iPhone photos as JPEG when the
   input doesn't ask for HEIC. Refused before decoding: inputs over **20 MB**,
   anything not `image/*`, and **SVG** (it is a document that can carry
   scripts and has no fixed pixel size). If decoding fails, the message says
   the format isn't supported in this browser and suggests JPEG or PNG.
2. Decode with `createImageBitmap(file, { imageOrientation: "from-image" })`, so
   phone photos come out upright.
3. Scale so the **longest edge ≤ 1600 px** (never enlarge).
4. Draw to a canvas and encode **WebP at quality 0.82**. If the browser returns
   a non-WebP blob (older Safari), encode **JPEG at 0.85** instead.
5. If the result is still over the 2 MB rule limit, re-encode once at a lower
   quality; if it still doesn't fit, fail with a message.

Re-encoding through a canvas drops all metadata, including EXIF GPS.

## 6. Security rules — `firebase/storage.rules.prod`

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function signedIn() { return request.auth != null; }
    function userDoc() {
      return firestore.get(/databases/(default)/documents/users/$(request.auth.uid));
    }
    function isMember(groupId) {
      return signedIn() && userDoc() != null && userDoc().data.groups.hasAny([groupId]);
    }
    function isGroupAdmin(groupId) {
      let p = firestore.get(/databases/(default)/documents/groups/$(groupId)/users/$(request.auth.uid));
      return signedIn() && p != null && p.data.role == "admin";
    }
    function isImage() {
      return request.resource.size < 2 * 1024 * 1024
          && request.resource.contentType.matches('image/(webp|jpeg)');
    }
    function isNew() { return resource == null; }

    match /groups/{groupId}/campaigns/{campaignId}/{entityType}/{entityId}/{fileName} {
      allow read: if isMember(groupId);
      allow create: if isMember(groupId) && entityType in ['npcs', 'locations'] && isImage();
      allow update: if false;
      allow delete: if isMember(groupId);
    }

    match /groups/{groupId}/crest/{fileName} {
      allow read: if isMember(groupId);
      allow create: if isGroupAdmin(groupId) && isImage();
      allow update: if false;
      allow delete: if isGroupAdmin(groupId);
    }
    // Everything else: no rule matches, so it is denied.
  }
}
```

- The helpers mirror `firestore.rules.prod` (`isGroupMember` reads
  `users/{uid}.groups`; `isGroupAdmin` reads `groups/{g}/users/{uid}.role`).
  Implementation must re-check them against that file, not against this sketch.
- `read` covers `getDownloadURL` (issuing a URL) — **not** viewing through an
  existing URL. Each `firestore.get()` is billed as one Firestore read, so a
  rule costs 1–2 reads per upload or URL issue, and nothing per view.
- Delete by any member matches the relaxed entity-delete rule (#1406).
- `update: false` enforces D3: files are immutable; metadata can't be edited either.
- Global admins are deliberately not granted: nothing in v1 needs it, and it
  would cost another `firestore.get()` on every evaluation.

**The download URL is a bearer capability.** Anyone holding it can view the
image until the token is revoked (console: file → revoke). Only group members can
read the Firestore document that holds it. A removed member loses access to
new URLs; images they already saw they could have saved anyway. The privacy
policy says this in plain words.

**Console steps no CI gate performs** (the plan tracks them):
1. Paste `storage.rules.prod` into Storage → Rules, and accept the prompt that
   grants Storage permission to read Firestore (required for `firestore.get()`).
2. ~~App Check → Storage → enforce~~ — **done 2026-09-24**, before any code
   exists. Consequence: every production Storage request must carry an App
   Check token, so `ImageStorageService` must get its `FirebaseStorage` from
   the app `attachAppCheck` was called on (the default app). The emulator
   doesn't check App Check (bug #1411), so only the post-merge browser check
   in production can catch a mistake here.
3. A Cloud Billing budget alert (e.g. $5/month).

## 7. Lifecycle

| Event | Sequence | If it fails partway |
|---|---|---|
| Add | upload → write `image` to the document | Upload OK, write fails → orphan file |
| Replace | upload new → write `image` → delete old file (best effort) | Old file left → orphan |
| Remove | clear `image` in the document → delete the file | File left → orphan |
| Delete NPC | delete the document → delete its image | File left → orphan |
| Delete location | the existing subtree delete, then delete each deleted location's image | as above |
| Delete campaign | `deleteCampaign` also deletes the `groups/{g}/campaigns/{c}/` prefix, **before** `recursiveDelete` (the function's existing "retryable first" ordering) | Callable returns an error; retry is safe |
| Leave/removed from group | nothing (the content stays with the group, as the policy already says) | — |
| Delete account | nothing (same) | — |

The document is always written before the old file is deleted, so a failure can
leave an orphaned file but never a document pointing at a missing one. Orphans
cost storage, not correctness. A daily scheduled sweep lists the objects,
compares them with the documents, and deletes what's unreferenced after a day
(`firebase/functions/src/imageMaintenance/sweepOrphanedImages.ts`).

## 8. UI

- **`ImageSlot`** gains `image?: StoredImage` and `alt`. Filled: an `<img>` with
  `object-cover`, `loading="lazy"`, `decoding="async"` and `width`/`height`
  (no layout shift). Empty: unchanged. Its doc comment ("no Storage, no picker")
  is rewritten.
- **`ImageUploadControl`** (`shared/components/`): Add / Replace / Remove, a
  hidden file input with `accept="image/*"` (§5 decides what gets through),
  an upload progress bar (`uploadBytesResumable`), inline error text, and a
  confirm step before Remove. Buttons are disabled while busy. Theme tokens only.
- **Placement**: NPC detail header (existing slot), location detail header
  (new slot), `PartyCrest` (control shown to group admins only).
- Alt text: `Portrait of {name}`, `{name}`, `{group} crest`.
- **Cropping**: the stored image is uncropped and its size is known, so a slot
  of any shape just crops with `object-cover`. The planned portrait NPC slot
  (todo.txt) is a CSS change. Centre-cropping a landscape photo into a portrait
  slot may cut a face; a focal point on `StoredImage` is the fix if that bites.

## 9. Service and emulator

- `BaseFirebaseService` registers `getStorage(app)` and, with emulators,
  `connectStorageEmulator(storage, host, emulatorPorts.storage)` (9199 is
  already in `firebaseConfig.ts`).
- `core/services/firebase/storage/ImageStorageService.ts`, extending
  `BaseFirebaseService`, registered in the barrel:
  - `upload(prefix, prepared, onProgress?) → Promise<StoredImage>`, which sets
    `contentType` and the immutable `cacheControl`
  - `remove(path) → Promise<void>`, treating `storage/object-not-found` as success
  - Path builders: `entityImagePrefix(groupId, campaignId, type, id)`, `crestPrefix(groupId)`
- **Emulator config, verified first (plan task 1)**: the Storage emulator is
  expected to need a `storage.rules` key in `firebase.json`, and that key would
  make `firebase deploy` push rules. If so, the emulators get their own config
  (`firebase/firebase.emulators.json`, which adds `storage` and the 9199 port)
  that `start-dev.ps1` passes with `--config`. The deployable `firebase.json`
  stays free of rules keys. `firebase/storage.rules` stays the permissive
  emulator ruleset.

## 10. Privacy policy

- New table row `images`: "Images you add" · "Portraits, places and your party's
  crest" · "Google Cloud Storage in the US (us-west1), visible to your group" ·
  "Stays with the group if you leave".
- Legal basis: images become the third thing that leaves the EU, under
  Google's Data Processing Addendum. Also: photos are resized and their metadata
  (including location) removed before upload, and an image can be seen by
  anyone who has its link, which only group members can look up.
- A "What changed" entry and the date, per the page's own rule.
- `PrivacyPolicyPage` tests are extended for the new facts. Tests asserting the
  old region wording get their expectations changed, because the requirement
  changed — not to make them pass.

## 11. Testing

- **Unit (jest)**: `prepareImage` (canvas and `createImageBitmap` mocked: size
  cap, never enlarges, WebP → JPEG fallback, the size, non-image and SVG
  refusals, the decode-failure message), `ImageStorageService` (`firebase/storage` mocked: path, metadata,
  not-found on delete), `ImageSlot` filled/empty/foreign-URL,
  `ImageUploadControl` states, the lifecycle orderings in the NPC, location and
  group flows.
- **Rules (`firebase/functions/test/rules/storage-rules-prod.test.ts`)** with
  `@firebase/rules-unit-testing` against the Storage emulator: member vs
  non-member read; create size, type and path limits; `update` denied; crest
  admin vs member; unknown paths denied. **Control**: run it with
  `RULES_FILE` pointing at a wide-open ruleset — the deny tests must fail.
- **`deleteCampaign`**: a new test that the campaign's files are gone afterwards,
  and another group's files are untouched.
- **Browser**: add, replace and remove on each surface in the dev server;
  confirm EXIF is gone from a downloaded file; check the 320px width.

## 12. Rollout

Merging to `main` deploys live, and the live bucket denies everything until
rules are pasted, so the order is:

1. **PR 1 — plumbing** (no UI): service, preparation, emulator config, rules
   review copy and tests, the `deleteCampaign` prefix delete. Safe to ship: nothing calls it.
2. **Console**: paste the rules, grant the Firestore permission, set the budget alert.
3. **PR 2 — UI and policy**: `ImageSlot`, the control, the three surfaces, the
   privacy policy. The policy ships in the same PR as the first upload button.
4. **Live check**: add, replace and remove one image in production. This is
   the only place the App Check path gets exercised.
