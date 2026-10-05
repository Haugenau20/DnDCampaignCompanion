// functions/test/rules/firestore-rules-prod.test.ts
//
// Pins `firestore.rules.prod` -- the review copy of the PRODUCTION ruleset --
// by loading it into the emulator under a `demo-` project and acting as real
// users against it. It lives in the functions package because this is where
// the emulator harness is; nothing here exercises a Cloud Function.
//
// The emulator's own ruleset is `allow read, write: if true`, so none of this
// can be seen by running the app. This suite gates the merge, and the merge
// deploys the file it tests (T105).
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
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
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

describe("server-owned profile fields (T080)", () => {
  const usage = {isUnlimited: false, daily: {count: 10}, weekly: {count: 30}, monthly: {count: 100}};

  beforeEach(async () => {
    await env.withSecurityRulesDisabled((context) =>
      context.firestore().doc("users/frodo").update({entityExtractionUsage: usage})
    );
  });

  it("a member cannot grant themselves unlimited AI usage (SEC-001)", async () => {
    await assertFails(as("frodo").doc("users/frodo").update({"entityExtractionUsage.isUnlimited": true}));
  });

  it("nor reset, remove or replace their usage counters", async () => {
    const db = as("frodo");
    await assertFails(db.doc("users/frodo").update({"entityExtractionUsage.daily.count": 0}));
    await assertFails(db.doc("users/frodo").update({entityExtractionUsage: {}}));
    // A whole-document set is an update of every key it drops.
    await assertFails(db.doc("users/frodo").set({id: "frodo", groups: [G], activeGroupId: G}));
  });

  it("nor add a field the client never writes", async () => {
    await assertFails(as("frodo").doc("users/frodo").update({id: "gandalf"}));
    await assertFails(as("frodo").doc("users/frodo").update({anything: true}));
  });

  it("a member cannot change the uid their group profile names (SEC-002)", async () => {
    await assertFails(as("frodo").doc(`groups/${G}/users/frodo`).update({userId: "gandalf"}));
    await assertFails(as("frodo").doc(`groups/${G}/users/frodo`).update({id: "gandalf"}));
  });

  it("nor when a legacy profile never had the field", async () => {
    await env.withSecurityRulesDisabled((context) =>
      context.firestore().doc(`groups/${G}/users/frodo`).set({username: "Frodo", role: "member"})
    );
    await assertFails(as("frodo").doc(`groups/${G}/users/frodo`).update({userId: "gandalf"}));
  });

  it("a member cannot take another member's name without its reservation (SEC-005)", async () => {
    await assertFails(as("frodo").doc(`groups/${G}/users/frodo`).update({username: "Gandalf"}));
  });

  it("nor take an unreserved name without reserving it", async () => {
    await assertFails(as("frodo").doc(`groups/${G}/users/frodo`).update({username: "MrUnderhill"}));
  });

  it("a group admin cannot rewrite another member's identity or name", async () => {
    await assertFails(as("gandalf").doc(`groups/${G}/users/frodo`).update({userId: "gandalf"}));
    await assertFails(as("gandalf").doc(`groups/${G}/users/frodo`).update({username: "Ringbearer"}));
  });

  it("a member cannot leave by deleting their group profile (SEC-004)", async () => {
    await assertFails(as("frodo").doc(`groups/${G}/users/frodo`).delete());
  });

  it("a group admin cannot remove a member by deleting their profile", async () => {
    await assertFails(as("gandalf").doc(`groups/${G}/users/frodo`).delete());
  });
});

describe("signing in from another device", () => {
  // The requests hold a hash of the secret and the code the approving device
  // must type; reading one would hand a phisher the code.
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc("deviceSignIns/req").set({email: "frodo@shire.dev", code: "1234"});
    });
  });

  it("nobody reads a request from the client, signed in or not", async () => {
    await assertFails(as("frodo").doc("deviceSignIns/req").get());
    await assertFails(env.unauthenticatedContext().firestore().doc("deviceSignIns/req").get());
  });

  it("nobody approves a request from the client", async () => {
    await assertFails(as("frodo").doc("deviceSignIns/req").update({status: "approved", uid: "frodo"}));
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

  it("a member edits their characters and picks one, as the roster does", async () => {
    await assertSucceeds(as("frodo").doc(`groups/${G}/users/frodo`).update({
      characters: [{id: "ch1", name: "Mr Underhill"}],
      activeCharacterId: "ch1",
    }));
  });

  it("a member renames to a name with æ/ø/å, whose reservation is lower-cased", async () => {
    const db = as("frodo");
    await assertSucceeds(db.runTransaction(async (transaction) => {
      const next = db.doc(`groups/${G}/usernames/æowyn`);
      await transaction.get(next);
      transaction.update(db.doc(`groups/${G}/users/frodo`), {username: "Æowyn"});
      transaction.set(next, {userId: "frodo", originalUsername: "Æowyn", createdAt: new Date()});
      transaction.delete(db.doc(`groups/${G}/usernames/frodo`));
    }));
  });

  it("a member renamed before T080, whose name was never reserved, can rename again", async () => {
    // The profile editor used to write `username` alone.
    await env.withSecurityRulesDisabled((context) =>
      context.firestore().doc(`groups/${G}/users/frodo`).update({username: "Ringbearer"})
    );
    const db = as("frodo");
    const rename = (releaseOld: boolean) => db.runTransaction(async (transaction) => {
      const next = db.doc(`groups/${G}/usernames/mrunderhill`);
      const old = db.doc(`groups/${G}/usernames/ringbearer`);
      await transaction.get(next);
      await transaction.get(old);
      transaction.update(db.doc(`groups/${G}/users/frodo`), {username: "MrUnderhill"});
      transaction.set(next, {userId: "frodo", originalUsername: "MrUnderhill", createdAt: new Date()});
      if (releaseOld) transaction.delete(old);
    });
    // Releasing the missing reservation is what changeGroupUsername used to
    // do, and is refused; so it now skips the release.
    await assertFails(rename(true));
    await assertSucceeds(rename(false));
  });

  it("a member changes only the case of their name, keeping its reservation", async () => {
    await assertSucceeds(as("frodo").doc(`groups/${G}/users/frodo`).update({username: "FRODO"}));
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

describe("reading progress (T073)", () => {
  const progress = (uid: string) => `groups/${G}/users/${uid}/story-progress/c1`;
  const place = {currentChapter: "chapter-02", lastRead: new Date(), chapterProgress: {}};

  it("a member saves and reads back their own place in a campaign", async () => {
    await assertSucceeds(as("frodo").doc(progress("frodo")).set(place));
    await assertSucceeds(as("frodo").doc(progress("frodo")).get());
  });

  it("another member cannot read or overwrite it", async () => {
    await env.withSecurityRulesDisabled((context) =>
      context.firestore().doc(progress("frodo")).set(place)
    );
    await assertFails(as("gandalf").doc(progress("frodo")).get());
    await assertFails(as("gandalf").doc(progress("frodo")).set(place));
  });

  it("nor can a stranger write one into the group", async () => {
    await assertFails(as("sauron").doc(progress("sauron")).set(place));
  });
});

// T084 (IMG-003): an upload records itself before the file is written, so the
// daily sweep can tell an upload whose document write is still queued from an
// orphan. The entry is the lease, so its time must be the server's.
describe("pending uploads (T084)", () => {
  const ID = "7d3e2b1c.webp";
  const entry = (id = ID) => `groups/${G}/pendingUploads/${id}`;
  const FILE = `groups/${G}/campaigns/c1/npcs/n1/${ID}`;
  const now = () => firebase.firestore.FieldValue.serverTimestamp();
  const record = (over: Record<string, unknown> = {}) => ({path: FILE, uid: "frodo", createdAt: now(), ...over});

  it("a member records their own upload, stamped by the server", async () => {
    await assertSucceeds(as("frodo").doc(entry()).set(record()));
  });

  it("and removes it once the document is written", async () => {
    await assertSucceeds(as("frodo").doc(entry()).set(record()));
    await assertSucceeds(as("frodo").doc(entry()).delete());
  });

  it("cannot record one in another member's name", async () => {
    await assertFails(as("frodo").doc(entry()).set(record({uid: "gandalf"})));
  });

  it("cannot choose its time, which would stretch the lease", async () => {
    await assertFails(as("frodo").doc(entry()).set(record({createdAt: new Date(Date.now() + 365 * 86400000)})));
  });

  it("must name a file in this group, under the entry's own id", async () => {
    await assertFails(as("frodo").doc(entry()).set(record({path: `groups/mordor/campaigns/c9/npcs/n9/${ID}`})));
    await assertFails(as("frodo").doc(entry()).set(record({path: `groups/${G}/campaigns/c1/npcs/n1/other.webp`})));
  });

  it("holds nothing but the three fields", async () => {
    await assertFails(as("frodo").doc(entry()).set(record({note: "hello"})));
  });

  it("is not changed after the fact, nor removed or read by anyone else", async () => {
    await assertSucceeds(as("frodo").doc(entry()).set(record()));
    await assertFails(as("frodo").doc(entry()).update({path: `groups/${G}/crest/${ID}`}));
    await assertFails(as("gandalf").doc(entry()).delete());
    await assertFails(as("gandalf").doc(entry()).get());
  });

  it("a stranger cannot record one in the group", async () => {
    await assertFails(as("sauron").doc(entry()).set(record({uid: "sauron"})));
  });
});

// T084: the sweep's second ledger. A member records a file before the write
// that stops a document pointing at it, so the daily sweep reads these entries
// rather than every document. The same shape and rules as `pendingUploads`.
describe("released images (T084)", () => {
  const ID = "9a8b7c6d.webp";
  const entry = (id = ID) => `groups/${G}/releasedImages/${id}`;
  const FILE = `groups/${G}/campaigns/c1/npcs/n1/${ID}`;
  const now = () => firebase.firestore.FieldValue.serverTimestamp();
  const record = (over: Record<string, unknown> = {}) => ({path: FILE, uid: "frodo", createdAt: now(), ...over});

  it("a member records a file they are about to drop, stamped by the server", async () => {
    await assertSucceeds(as("frodo").doc(entry()).set(record()));
  });

  it("and removes it once the file is deleted", async () => {
    await assertSucceeds(as("frodo").doc(entry()).set(record()));
    await assertSucceeds(as("frodo").doc(entry()).delete());
  });

  it("covers a banner and a crest as well as an entity's picture", async () => {
    await assertSucceeds(as("frodo").doc(entry("b.webp")).set(record({path: `groups/${G}/campaigns/c1/banner/b.webp`})));
    await assertSucceeds(as("frodo").doc(entry("c.webp")).set(record({path: `groups/${G}/crest/c.webp`})));
  });

  it("cannot record one in another member's name", async () => {
    await assertFails(as("frodo").doc(entry()).set(record({uid: "gandalf"})));
  });

  it("cannot choose its time", async () => {
    await assertFails(as("frodo").doc(entry()).set(record({createdAt: new Date(Date.now() - 365 * 86400000)})));
  });

  it("must name a file in this group, under the entry's own id", async () => {
    await assertFails(as("frodo").doc(entry()).set(record({path: `groups/mordor/campaigns/c9/npcs/n9/${ID}`})));
    await assertFails(as("frodo").doc(entry()).set(record({path: `groups/${G}/campaigns/c1/npcs/n1/other.webp`})));
  });

  it("holds nothing but the three fields", async () => {
    await assertFails(as("frodo").doc(entry()).set(record({note: "hello"})));
  });

  it("is not changed after the fact, nor removed or read by anyone else", async () => {
    await assertSucceeds(as("frodo").doc(entry()).set(record()));
    await assertFails(as("frodo").doc(entry()).update({path: `groups/${G}/crest/${ID}`}));
    await assertFails(as("gandalf").doc(entry()).delete());
    await assertFails(as("gandalf").doc(entry()).get());
  });

  it("a stranger cannot record one in the group", async () => {
    await assertFails(as("sauron").doc(entry()).set(record({uid: "sauron"})));
  });
});

// T084 (IMG-003), second half: the sweep deletes a file once its entry's lease
// is over, so a document write that arrives after that would point at a
// deleted file. The rules refuse it: pointing a document at a different file
// needs that file's entry, still within its lease.
describe("an image path needs its upload's live entry (T084)", () => {
  const LEASE_MS = 30 * 24 * 60 * 60 * 1000;
  const ID = "9a8b7c6d.webp";
  const NPC = `groups/${G}/campaigns/c1/npcs/n1`;
  const entry = (id = ID) => `groups/${G}/pendingUploads/${id}`;
  const image = (path: string) => ({
    path,
    url: `https://firebasestorage.googleapis.com/v0/b/x/o/${encodeURIComponent(path)}?alt=media&token=t`,
    width: 600,
    height: 800,
    uploadedBy: "frodo",
    uploadedAt: "2026-10-04T12:00:00.000Z",
  });
  const npcFile = (id = ID) => `${NPC}/${id}`;
  const OLD = npcFile("0ld0ld.webp");

  /** Record `path` the way `ImageStorageService.upload` does. */
  const record = (uid: string, path: string) =>
    as(uid).doc(entry(path.split("/").pop())).set({
      path,
      uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(NPC).set({name: "Bilbo", image: image(OLD)});
    });
  });

  it("a member points an NPC at a file whose upload is recorded", async () => {
    await assertSucceeds(record("frodo", npcFile()));
    await assertSucceeds(as("frodo").doc(NPC).update({image: image(npcFile())}));
  });

  it("cannot point it at a file with no entry", async () => {
    await assertFails(as("frodo").doc(NPC).update({image: image(npcFile())}));
  });

  it("nor once the entry's lease is over, when the sweep may have deleted the file", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(entry()).set({
        path: npcFile(),
        uid: "frodo",
        createdAt: new Date(Date.now() - LEASE_MS - 60_000),
      });
    });
    await assertFails(as("frodo").doc(NPC).update({image: image(npcFile())}));
  });

  it("nor at a file other than the one the entry names", async () => {
    await assertSucceeds(record("frodo", `groups/${G}/crest/${ID}`));
    await assertFails(as("frodo").doc(NPC).update({image: image(npcFile())}));
  });

  it("nor put back a picture that has since been replaced, whose entry is gone", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(NPC).update({image: image(npcFile())});
    });
    await assertFails(as("frodo").doc(NPC).set({name: "Bilbo", image: image(OLD)}));
  });

  it("an edit that leaves the picture alone needs no entry, patch or whole record", async () => {
    await assertSucceeds(as("frodo").doc(NPC).update({name: "Bilbo Baggins"}));
    await assertSucceeds(as("frodo").doc(NPC).set({name: "Mr Baggins", image: image(OLD)}));
  });

  it("so does one on a legacy picture with no path", async () => {
    const legacy = {url: "https://example.com/bilbo.png"};
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(NPC).set({name: "Bilbo", image: legacy});
    });
    await assertSucceeds(as("frodo").doc(NPC).set({name: "Mr Baggins", image: legacy}));
  });

  it("removing the picture needs no entry", async () => {
    await assertSucceeds(as("frodo").doc(NPC).update({image: null}));
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(NPC).update({image: image(OLD)});
    });
    await assertSucceeds(as("frodo").doc(NPC).update({image: firebase.firestore.FieldValue.delete()}));
  });

  it("holds for a location, created or updated", async () => {
    const place = `groups/${G}/campaigns/c1/locations/l1`;
    const file = `${place}/${ID}`;
    await assertFails(as("frodo").doc(place).set({name: "Bag End", image: image(file)}));
    await assertSucceeds(record("frodo", file));
    await assertSucceeds(as("frodo").doc(place).set({name: "Bag End", image: image(file)}));
  });

  it("holds for a campaign's banner", async () => {
    const campaign = `groups/${G}/campaigns/c1`;
    const file = `${campaign}/banner/${ID}`;
    await assertFails(as("frodo").doc(campaign).update({banner: image(file)}));
    await assertSucceeds(record("frodo", file));
    await assertSucceeds(as("frodo").doc(campaign).update({banner: image(file)}));
  });

  it("holds for a group's crest", async () => {
    const file = `groups/${G}/crest/${ID}`;
    await assertFails(as("gandalf").doc(`groups/${G}`).update({crest: image(file)}));
    await assertSucceeds(record("gandalf", file));
    await assertSucceeds(as("gandalf").doc(`groups/${G}`).update({crest: image(file)}));
  });
});

// T037 (DATA-010): `deleteCampaign` marks the campaign `deleting` before its
// cleanup, which reads each member's notes once. A note, reading progress or
// content written after that would survive the deletion under a campaign
// nobody can open, so the rules refuse it -- and refuse it too once the
// campaign document is gone, which covers writes queued offline.
describe("the contact form's budgets (T099)", () => {
  // Only `sendContactEmail` writes them, through the Admin SDK. A client that
  // could would reset its own budget, or exhaust everyone else's.
  it("no client reads, writes or deletes one, signed in or not", async () => {
    await env.withSecurityRulesDisabled((context) =>
      context.firestore().doc("contactThrottle/anonymous").set({sent: []})
    );
    for (const db of [as("frodo"), env.unauthenticatedContext().firestore()]) {
      await assertFails(db.doc("contactThrottle/anonymous").get());
      await assertFails(db.doc("contactThrottle/anonymous").set({sent: []}));
      await assertFails(db.doc("contactThrottle/account_frodo").set({sent: []}));
      await assertFails(db.doc("contactThrottle/anonymous").delete());
    }
  });
});

describe("turning rumours into a quest is one transaction (T088)", () => {
  const C = `groups/${G}/campaigns/c1`;

  /**
   * What `DocumentService.createDocumentWithUpdates` sends: the quest's id is
   * read and found free, every rumour is read, then the quest is set and each
   * rumour updated, in one commit.
   */
  const convert = (uid: string, rumourIds: string[]) => {
    const db = as(uid);
    return db.runTransaction(async (transaction) => {
      const quest = db.doc(`${C}/quests/find-the-fire`);
      if ((await transaction.get(quest)).exists) throw new Error("taken");
      const rumours = await Promise.all(rumourIds.map((id) => transaction.get(db.doc(`${C}/rumors/${id}`))));
      transaction.set(quest, {title: "Find the fire", createdBy: uid});
      rumours.forEach((rumour) => transaction.update(rumour.ref, {
        convertedToQuestId: "find-the-fire",
        notes: [...rumour.data()!.notes, {id: `converted-${rumour.id}`, content: "Converted to quest: find-the-fire"}],
        modifiedBy: uid,
      }));
    });
  };

  const seedRumours = (count: number) => env.withSecurityRulesDisabled(async (context) => {
    const batch = context.firestore().batch();
    for (let i = 0; i < count; i++) {
      batch.set(context.firestore().doc(`${C}/rumors/r${i}`), {title: `Rumour ${i}`, notes: []});
    }
    await batch.commit();
  });
  const ids = (count: number) => Array.from({length: count}, (_, i) => `r${i}`);

  it("a member converts three rumours", async () => {
    await seedRumours(3);
    await assertSucceeds(convert("frodo", ids(3)));
  });

  // Every write's rules read the member's profile and the campaign, but a
  // request may make only so many reads; identical ones count once. The
  // client allows 499 rumours per conversion.
  it("and the largest selection the client allows, 499", async () => {
    await seedRumours(499);
    await assertSucceeds(convert("frodo", ids(499)));
  });

  it("a stranger converts none, and nothing is created", async () => {
    await seedRumours(3);
    await assertFails(convert("sauron", ids(3)));
    let created = true;
    await env.withSecurityRulesDisabled(async (context) => {
      created = (await context.firestore().doc(`${C}/quests/find-the-fire`).get()).exists;
    });
    expect(created).toBe(false);
  });
});

describe("a campaign being deleted takes no writes (T037)", () => {
  const NOTE = `groups/${G}/users/frodo/notes/n1`;
  const PROGRESS = `groups/${G}/users/frodo/story-progress/c1`;
  const NPC = `groups/${G}/campaigns/c1/npcs/n1`;
  const note = {campaignId: "c1", title: "Bree", content: "The Prancing Pony"};
  const place = {currentChapter: "chapter-02", lastRead: new Date(), chapterProgress: {}};

  const markDeleting = () => env.withSecurityRulesDisabled((context) =>
    context.firestore().doc(`groups/${G}/campaigns/c1`).update({deleting: true})
  );
  const removeCampaignDocument = () => env.withSecurityRulesDisabled((context) =>
    context.firestore().doc(`groups/${G}/campaigns/c1`).delete()
  );
  const seedNoteAndProgress = () => env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(NOTE).set(note);
    await context.firestore().doc(PROGRESS).set(place);
  });

  it("control: an open campaign takes all of them", async () => {
    const db = as("frodo");
    await assertSucceeds(db.doc(NOTE).set(note));
    await assertSucceeds(db.doc(NOTE).update({content: "Strider"}));
    await assertSucceeds(db.doc(PROGRESS).set(place));
    await assertSucceeds(db.doc(NPC).update({name: "Bilbo Baggins"}));
    await assertSucceeds(db.doc(`groups/${G}/campaigns/c1/npcs/n2`).set({name: "Sam"}));
  });

  describe.each([
    ["marked deleting", markDeleting],
    ["whose document is gone", removeCampaignDocument],
  ])("a campaign %s", (_label, makeUnavailable) => {
    beforeEach(async () => {
      await seedNoteAndProgress();
      await makeUnavailable();
    });

    it("refuses a new note and an edit to an existing one", async () => {
      const db = as("frodo");
      await assertFails(db.doc(`groups/${G}/users/frodo/notes/n2`).set(note));
      await assertFails(db.doc(NOTE).update({content: "Strider"}));
    });

    it("refuses reading progress", async () => {
      await assertFails(as("frodo").doc(PROGRESS).set(place));
    });

    it("refuses new content and edits", async () => {
      await assertFails(as("frodo").doc(`groups/${G}/campaigns/c1/npcs/n2`).set({name: "Sam"}));
      await assertFails(as("frodo").doc(NPC).update({name: "Bilbo Baggins"}));
    });

    it("still lets the owner delete their note and progress, and a member delete content", async () => {
      const db = as("frodo");
      await assertSucceeds(db.doc(NOTE).delete());
      await assertSucceeds(db.doc(PROGRESS).delete());
      await assertSucceeds(db.doc(NPC).delete());
    });
  });

  it("refuses an edit to the campaign itself once it is marked", async () => {
    await markDeleting();
    await assertFails(as("gandalf").doc(`groups/${G}/campaigns/c1`).update({name: "Renamed"}));
  });

  it("never lets a client write the mark", async () => {
    await assertFails(as("gandalf").doc(`groups/${G}/campaigns/c1`).update({deleting: true}));
    await assertFails(as("frodo").doc(`groups/${G}/campaigns/c2`).set({name: "New", deleting: false}));
    await markDeleting();
    await assertFails(as("gandalf").doc(`groups/${G}/campaigns/c1`).update({deleting: false}));
  });

  it("keeps other campaigns open", async () => {
    await env.withSecurityRulesDisabled((context) =>
      context.firestore().doc(`groups/${G}/campaigns/c2`).set({name: "Rohan"})
    );
    await markDeleting();
    await assertSucceeds(as("frodo").doc(`groups/${G}/users/frodo/notes/n3`)
      .set({...note, campaignId: "c2"}));
    await assertSucceeds(as("frodo").doc(`groups/${G}/campaigns/c2/npcs/n3`).set({name: "Eowyn"}));
  });

  it("refuses a note that names no campaign", async () => {
    await assertFails(as("frodo").doc(`groups/${G}/users/frodo/notes/n4`)
      .set({title: "Loose", content: "no campaign"}));
  });
});

describe("deleting a group is the deleteGroup function's (T037)", () => {
  const markDeleting = () => env.withSecurityRulesDisabled((context) =>
    context.firestore().doc(`groups/${G}`).update({deleting: true})
  );

  it("control: an admin can still rename the group", async () => {
    await assertSucceeds(as("gandalf").doc(`groups/${G}`).update({name: "The Nine Walkers"}));
  });

  it("refuses a client deleting the group document, which would orphan all beneath it", async () => {
    await assertFails(as("gandalf").doc(`groups/${G}`).delete());
  });

  it("never lets a client write the mark", async () => {
    await assertFails(as("gandalf").doc(`groups/${G}`).update({deleting: true}));
    await assertFails(as("sauron").doc("groups/mordor").set({name: "Mordor", deleting: false}));
    await markDeleting();
    await assertFails(as("gandalf").doc(`groups/${G}`).update({deleting: false}));
  });

  it("refuses an edit to a group once it is marked", async () => {
    await markDeleting();
    await assertFails(as("gandalf").doc(`groups/${G}`).update({name: "Renamed"}));
  });
});
