// functions/test/rules/firestore-rules-prod.test.ts
//
// Pins `firestore.rules.prod` -- the review copy of the PRODUCTION ruleset --
// by loading it into the emulator under a `demo-` project and acting as real
// users against it. It lives in the functions package because this is where
// the emulator harness is; nothing here exercises a Cloud Function.
//
// The emulator's own ruleset is `allow read, write: if true`, so none of this
// can be seen by running the app. And passing here does not deploy anything:
// production rules are pasted into the console by hand.
//
// `RULES_FILE=<path> npx jest test/rules` runs the same checks against another
// revision. That is how each hole below was shown to be open before
// 2026-09-23: the membership and admin tests fail against the old file.
import * as fs from "fs";
import * as path from "path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {setLogLevel} from "firebase/firestore";
import {EMULATOR_HOSTS} from "../emulator";

// Every denied write is logged as a warning with a stack; here, being denied
// is the point.
setLogLevel("error");

const RULES_FILE =
  process.env.RULES_FILE || path.resolve(__dirname, "../../../firestore.rules.prod");
const [host, port] = EMULATOR_HOSTS.Firestore.split(":");
const G = "fellowship";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-rules-prod",
    firestore: {rules: fs.readFileSync(RULES_FILE, "utf8"), host, port: Number(port)},
  });
});

afterAll(() => env.cleanup());

/**
 * A group with an admin (gandalf), a member (frodo), a campaign with an NPC,
 * a live invitation, and a stranger (sauron) who has an account and nothing
 * else.
 */
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc("users/gandalf").set({id: "gandalf", groups: [G]});
    await db.doc("users/frodo").set({id: "frodo", groups: [G], activeGroupId: G});
    await db.doc(`groups/${G}`).set({name: "Fellowship"});
    await db.doc(`groups/${G}/users/gandalf`).set({userId: "gandalf", username: "Gandalf", role: "admin"});
    await db.doc(`groups/${G}/users/frodo`).set({userId: "frodo", username: "Frodo", role: "member"});
    await db.doc(`groups/${G}/usernames/gandalf`).set({userId: "gandalf", originalUsername: "Gandalf"});
    await db.doc(`groups/${G}/usernames/frodo`).set({userId: "frodo", originalUsername: "Frodo"});
    await db.doc(`groups/${G}/campaigns/c1`).set({name: "There and back"});
    await db.doc(`groups/${G}/campaigns/c1/npcs/n1`).set({name: "Bilbo"});
    await db.doc(`groups/${G}/registrationTokens/tok`).set({token: "tok", used: false});
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();

describe("joining a group (T052)", () => {
  it("control: a stranger cannot read a group's campaigns", async () => {
    await assertFails(as("sauron").doc(`groups/${G}/campaigns/c1/npcs/n1`).get());
  });

  it("a stranger cannot create a profile listing the group", async () => {
    await assertFails(as("sauron").doc("users/sauron").set({id: "sauron", groups: [G]}));
  });

  it("a member cannot add another group to their own profile", async () => {
    await assertFails(as("frodo").doc("users/frodo").update({groups: [G, "mordor"]}));
  });

  it("a stranger cannot create their own member profile in the group", async () => {
    await assertFails(
      as("sauron").doc(`groups/${G}/users/sauron`).set({userId: "sauron", username: "Sauron", role: "member"})
    );
  });

  it("a stranger cannot mark an invitation as used", async () => {
    await assertFails(
      as("sauron").doc(`groups/${G}/registrationTokens/tok`).update({used: true, usedBy: "sauron", usedAt: new Date()})
    );
  });

  it("a stranger can still look an invitation up, which the join page needs", async () => {
    await assertSucceeds(env.unauthenticatedContext().firestore().doc(`groups/${G}/registrationTokens/tok`).get());
  });

  it("a stranger cannot reserve a name in the group", async () => {
    await assertFails(
      as("sauron").doc(`groups/${G}/usernames/sauron`).set({userId: "sauron", originalUsername: "Sauron"})
    );
  });
});

describe("global admin", () => {
  it("a new account cannot create its own profile as a global admin", async () => {
    await assertFails(as("sauron").doc("users/sauron").set({id: "sauron", isAdmin: true}));
  });

  it("a member cannot make themselves a global admin", async () => {
    await assertFails(as("frodo").doc("users/frodo").update({isAdmin: true}));
  });
});

describe("roles (T034)", () => {
  it("a group admin cannot change a role directly -- only setMemberRole can", async () => {
    await assertFails(as("gandalf").doc(`groups/${G}/users/frodo`).update({role: "admin"}));
  });

  it("a member cannot change their own role", async () => {
    await assertFails(as("frodo").doc(`groups/${G}/users/frodo`).update({role: "admin"}));
  });
});

describe("what members still do from the client", () => {
  it("a member reads the group's campaigns and writes an NPC", async () => {
    await assertSucceeds(as("frodo").doc(`groups/${G}/campaigns/c1/npcs/n1`).get());
    await assertSucceeds(as("frodo").doc(`groups/${G}/campaigns/c1/npcs/n2`).set({name: "Sam"}));
  });

  it("a member updates lastLogin, activeGroupId and preferences on their profile", async () => {
    await assertSucceeds(as("frodo").doc("users/frodo").update({
      lastLogin: new Date(),
      activeGroupId: G,
      preferences: {theme: "dark"},
    }));
  });

  it("a member updates their own group profile", async () => {
    await assertSucceeds(as("frodo").doc(`groups/${G}/users/frodo`).update({activeCampaignId: "c1"}));
  });

  it("a member renames themselves, exactly as changeGroupUsername does", async () => {
    const db = as("frodo");
    await assertSucceeds(db.runTransaction(async (transaction) => {
      const next = db.doc(`groups/${G}/usernames/mrunderhill`);
      await transaction.get(next);
      transaction.update(db.doc(`groups/${G}/users/frodo`), {username: "MrUnderhill"});
      transaction.set(next, {userId: "frodo", originalUsername: "MrUnderhill", createdAt: new Date()});
      transaction.delete(db.doc(`groups/${G}/usernames/frodo`));
    }));
  });

  it("a member cannot release someone else's name", async () => {
    await assertFails(as("frodo").doc(`groups/${G}/usernames/gandalf`).delete());
  });

  it("a group admin still edits an invitation's note", async () => {
    await assertSucceeds(as("gandalf").doc(`groups/${G}/registrationTokens/tok`).update({notes: "For Sam"}));
  });
});
