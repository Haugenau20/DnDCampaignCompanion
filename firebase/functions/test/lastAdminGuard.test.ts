// functions/test/lastAdminGuard.test.ts
//
// T035: leaving, and deleting your account, are the two other doors out of a
// group's administration. Both refuse when they would leave nobody able to run
// the group -- and both still work for everyone else.
import * as admin from "firebase-admin";
import {call, clearProject, expectHttpsError, useEmulatorProject} from "./emulator";
import {removeUserFromGroup} from "../src/userManagement/removeUserFromGroup";
import {deleteUser} from "../src/userManagement/deleteUser";

const PROJECT = "demo-last-admin-guard";
const db = useEmulatorProject(PROJECT);
const GROUP = "g1";

const isMember = async (uid: string) =>
  (await db.doc(`groups/${GROUP}/users/${uid}`).get()).exists;

/** Seeds the group, each member's global profile and Auth account. */
async function seed(members: Record<string, string>) {
  await db.doc(`groups/${GROUP}`).set({name: "Fellowship"});
  for (const [uid, role] of Object.entries(members)) {
    await admin.auth().createUser({uid});
    await db.doc(`users/${uid}`).set({id: uid, groups: [GROUP], activeGroupId: GROUP});
    await db.doc(`groups/${GROUP}/users/${uid}`).set({userId: uid, username: uid, role});
    await db.doc(`groups/${GROUP}/usernames/${uid}`).set({userId: uid, originalUsername: uid});
  }
}

const leave = (uid: string) => call(removeUserFromGroup, {groupId: GROUP, userId: uid}, uid);
const deleteAccount = (uid: string) => call(deleteUser, {userId: uid}, uid);

beforeEach(async () => {
  // Both functions log every refusal before rethrowing it; that is their
  // production behaviour, and noise here.
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  await clearProject(PROJECT);
});

afterEach(() => jest.restoreAllMocks());

describe("leaving a group", () => {
  it("is refused to the only admin while anyone else remains, and changes nothing", async () => {
    await seed({gandalf: "admin", frodo: "member"});
    const error = await expectHttpsError(leave("gandalf"), "failed-precondition");
    expect(error.message).toMatch(/only admin/);
    expect(await isMember("gandalf")).toBe(true);
    expect((await db.doc("users/gandalf").get()).data()?.groups).toEqual([GROUP]);
  });

  it("is allowed to the only admin when nobody else is in the group", async () => {
    await seed({gandalf: "admin"});
    await leave("gandalf");
    expect(await isMember("gandalf")).toBe(false);
  });

  it("is allowed to an admin when another admin remains", async () => {
    await seed({gandalf: "admin", aragorn: "admin", frodo: "member"});
    await leave("gandalf");
    expect(await isMember("gandalf")).toBe(false);
  });

  it("is allowed to a member", async () => {
    await seed({gandalf: "admin", frodo: "member"});
    await leave("frodo");
    expect(await isMember("frodo")).toBe(false);
    expect((await db.doc("users/frodo").get()).data()?.groups).toEqual([]);
  });
});

describe("deleting your account", () => {
  it("is refused to the only admin of a group others are in, and deletes nothing", async () => {
    await seed({gandalf: "admin", frodo: "member"});
    await expectHttpsError(deleteAccount("gandalf"), "failed-precondition");
    expect(await isMember("gandalf")).toBe(true);
    expect((await db.doc("users/gandalf").get()).exists).toBe(true);
    await expect(admin.auth().getUser("gandalf")).resolves.toBeDefined();
  });

  it("is allowed to a member", async () => {
    await seed({gandalf: "admin", frodo: "member"});
    await deleteAccount("frodo");
    expect(await isMember("frodo")).toBe(false);
    expect((await db.doc("users/frodo").get()).exists).toBe(false);
  });
});
