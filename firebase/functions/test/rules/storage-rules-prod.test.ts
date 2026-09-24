// functions/test/rules/storage-rules-prod.test.ts
//
// Pins `storage.rules.prod` -- the review copy of the PRODUCTION Storage
// ruleset -- by loading it into the Storage emulator and acting as real users
// against it.
//
// The emulator's own ruleset (`storage.rules`) is `allow read, write: if true`,
// so none of this can be seen by running the app, and passing here deploys
// nothing: production rules are pasted into the console by hand.
//
// `RULES_FILE=<path> npx jest test/rules/storage` runs the same checks against
// another ruleset. Run it against a wide-open one and every deny must fail --
// that is the control showing these tests can tell the difference.
//
// UNLIKE EVERY OTHER SUITE HERE, THIS ONE WRITES TO THE DEV PROJECT'S FIRESTORE.
// The rules check membership with `firestore.get()`, and the Storage emulator
// answers those from the project the emulators were STARTED with -- not the
// test's `demo-` project (verified 2026-09-24: seeded under `demo-`, every
// lookup came back empty; the same rule passed for a real dev user). So the
// membership documents are written there, under ids prefixed
// `zz-storage-rules-` that no app data uses, and deleted after the run.
// Storage objects themselves stay in the `demo-` bucket.
import * as fs from "fs";
import * as path from "path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {EMULATOR_HOSTS} from "../emulator";

const RULES_FILE =
  process.env.RULES_FILE || path.resolve(__dirname, "../../../storage.rules.prod");
const [storageHost, storagePort] = EMULATOR_HOSTS.Storage.split(":");

/** Every id this suite writes starts with this, so cleanup can't touch app data. */
const NS = "zz-storage-rules-";
const G = `${NS}fellowship`;
const OTHER = `${NS}mordor`;
const uid = (name: string) => `${NS}${name}`;

/** A name ImageStorageService could have chosen. */
const NAME = "0f8fad5b-d9cb-469f-a165-70867728950e.webp";
const NPC_DIR = `groups/${G}/campaigns/c1/npcs/n1`;
const CREST_DIR = `groups/${G}/crest`;

const WEBP = {contentType: "image/webp"};
const small = () => new Uint8Array(100 * 1024);

const inGroup = (groupId: string) => ({groups: {arrayValue: {values: [{stringValue: groupId}]}}});

/** The Firestore documents the rules consult, keyed by path, in REST form. */
const MEMBERSHIP: Record<string, object> = {
  [`users/${uid("gandalf")}`]: inGroup(G),
  [`users/${uid("frodo")}`]: inGroup(G),
  [`users/${uid("sauron")}`]: inGroup(OTHER),
  [`groups/${G}/users/${uid("gandalf")}`]: {role: {stringValue: "admin"}},
  [`groups/${G}/users/${uid("frodo")}`]: {role: {stringValue: "member"}},
};

let env: RulesTestEnvironment;
let documentsUrl: string;

/**
 * Write or delete a document in the running project's Firestore emulator,
 * bypassing its rules (the `owner` token).
 *
 * @param {string} docPath Document path under `documents/`
 * @param {string} method PATCH to write, DELETE to remove
 * @param {object} fields The document, in Firestore REST form
 */
async function firestoreRequest(docPath: string, method: "PATCH" | "DELETE", fields?: object) {
  const response = await fetch(`${documentsUrl}/${docPath}`, {
    method,
    headers: {"Authorization": "Bearer owner", "Content-Type": "application/json"},
    body: fields ? JSON.stringify({fields}) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${docPath}: ${response.status}`);
}

beforeAll(async () => {
  const config = await (await fetch("http://127.0.0.1:4000/api/config")).json() as {projectId: string};
  documentsUrl =
    `http://${EMULATOR_HOSTS.Firestore}/v1/projects/${config.projectId}/databases/(default)/documents`;

  env = await initializeTestEnvironment({
    projectId: "demo-storage-rules-prod",
    storage: {rules: fs.readFileSync(RULES_FILE, "utf8"), host: storageHost, port: Number(storagePort)},
  });

  await Promise.all(
    Object.entries(MEMBERSHIP).map(([docPath, fields]) => firestoreRequest(docPath, "PATCH", fields))
  );
});

afterAll(async () => {
  await Promise.all(Object.keys(MEMBERSHIP).map((docPath) => firestoreRequest(docPath, "DELETE")));
  await env.cleanup();
});

/**
 * gandalf is the group admin, frodo a member, sauron a stranger with an
 * account in another group, and gollum has an account and no profile at all.
 * An NPC image and a crest already exist.
 */
beforeEach(async () => {
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (context) => {
    const storage = context.storage();
    await storage.ref(`${NPC_DIR}/${NAME}`).put(small(), WEBP);
    await storage.ref(`${CREST_DIR}/${NAME}`).put(small(), WEBP);
  });
});

const as = (name: string) => env.authenticatedContext(uid(name)).storage();
const anonymous = () => env.unauthenticatedContext().storage();
const fresh = (dir: string, ext = "webp") => `${dir}/${crypto.randomUUID()}.${ext}`;

describe("campaign entity images", () => {
  it("a member can get a download URL", async () => {
    await assertSucceeds(as("frodo").ref(`${NPC_DIR}/${NAME}`).getDownloadURL());
  });

  it("a stranger cannot get a download URL", async () => {
    await assertFails(as("sauron").ref(`${NPC_DIR}/${NAME}`).getDownloadURL());
  });

  it("an account with no profile cannot get a download URL", async () => {
    await assertFails(as("gollum").ref(`${NPC_DIR}/${NAME}`).getDownloadURL());
  });

  it("a signed-out visitor cannot get a download URL", async () => {
    await assertFails(anonymous().ref(`${NPC_DIR}/${NAME}`).getDownloadURL());
  });

  it("a member can upload a WebP to an NPC", async () => {
    await assertSucceeds(as("frodo").ref(fresh(NPC_DIR)).put(small(), WEBP).then());
  });

  it("a member can upload a JPEG to a location", async () => {
    const dir = `groups/${G}/campaigns/c1/locations/l1`;
    await assertSucceeds(as("frodo").ref(fresh(dir, "jpg")).put(small(), {contentType: "image/jpeg"}).then());
  });

  it("a stranger cannot upload", async () => {
    await assertFails(as("sauron").ref(fresh(NPC_DIR)).put(small(), WEBP).then());
  });

  it("a signed-out visitor cannot upload", async () => {
    await assertFails(anonymous().ref(fresh(NPC_DIR)).put(small(), WEBP).then());
  });

  it("a file of 2 MB or more is refused", async () => {
    await assertFails(as("frodo").ref(fresh(NPC_DIR)).put(new Uint8Array(2 * 1024 * 1024), WEBP).then());
  });

  it("a PNG is refused -- prepareImage never produces one", async () => {
    await assertFails(as("frodo").ref(fresh(NPC_DIR, "png")).put(small(), {contentType: "image/png"}).then());
  });

  it("an SVG is refused, even named like an image", async () => {
    await assertFails(as("frodo").ref(fresh(NPC_DIR)).put(small(), {contentType: "image/svg+xml"}).then());
  });

  it("a name the app would not choose is refused", async () => {
    await assertFails(as("frodo").ref(`${NPC_DIR}/portrait.webp`).put(small(), WEBP).then());
  });

  it("an entity type without images is refused", async () => {
    await assertFails(as("frodo").ref(fresh(`groups/${G}/campaigns/c1/quests/q1`)).put(small(), WEBP).then());
  });

  it("an existing file cannot be overwritten, even by a member", async () => {
    await assertFails(as("frodo").ref(`${NPC_DIR}/${NAME}`).put(small(), WEBP).then());
  });

  it("a member can delete an image", async () => {
    await assertSucceeds(as("frodo").ref(`${NPC_DIR}/${NAME}`).delete());
  });

  it("a stranger cannot delete an image", async () => {
    await assertFails(as("sauron").ref(`${NPC_DIR}/${NAME}`).delete());
  });
});

describe("the group crest", () => {
  it("a member can get its download URL", async () => {
    await assertSucceeds(as("frodo").ref(`${CREST_DIR}/${NAME}`).getDownloadURL());
  });

  it("a stranger cannot", async () => {
    await assertFails(as("sauron").ref(`${CREST_DIR}/${NAME}`).getDownloadURL());
  });

  it("the admin can upload one", async () => {
    await assertSucceeds(as("gandalf").ref(fresh(CREST_DIR)).put(small(), WEBP).then());
  });

  it("a plain member cannot upload one", async () => {
    await assertFails(as("frodo").ref(fresh(CREST_DIR)).put(small(), WEBP).then());
  });

  it("the admin can delete it", async () => {
    await assertSucceeds(as("gandalf").ref(`${CREST_DIR}/${NAME}`).delete());
  });

  it("a plain member cannot delete it", async () => {
    await assertFails(as("frodo").ref(`${CREST_DIR}/${NAME}`).delete());
  });
});

describe("everything else", () => {
  it("control: a member can write where the rules allow", async () => {
    await assertSucceeds(as("frodo").ref(fresh(NPC_DIR)).put(small(), WEBP).then());
  });

  it("a member cannot write anywhere else in the group", async () => {
    await assertFails(as("frodo").ref(fresh(`groups/${G}/other`)).put(small(), WEBP).then());
  });

  it("a member cannot write outside groups", async () => {
    await assertFails(as("frodo").ref(fresh("users/frodo")).put(small(), WEBP).then());
  });

  it("a member cannot list another group's campaign", async () => {
    await assertFails(as("frodo").ref(`groups/${OTHER}/campaigns/c1/npcs/n1`).listAll());
  });
});
