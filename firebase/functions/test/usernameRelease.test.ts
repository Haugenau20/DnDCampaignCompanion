// functions/test/usernameRelease.test.ts
//
// SEC-005 (T080): leaving a group, or deleting an account, released the
// reservation named by the profile's `username` -- a field the member could
// write -- without checking who owned it. A member who renamed themselves to
// another member's name and then left released that member's reservation.
// Cleanup must release the departing user's own reservations, and nobody
// else's.
import {getAuth} from "firebase-admin/auth";
import {WriteBatch} from "firebase-admin/firestore";
import {call, clearProject, expectHttpsError, useEmulatorProject} from "./emulator";
import {removeUserFromGroup} from "../src/userManagement/removeUserFromGroup";
import {deleteUser} from "../src/userManagement/deleteUser";

const PROJECT = "demo-username-release";
const db = useEmulatorProject(PROJECT);
const G1 = "g1";
const G2 = "g2";

const reservation = (group: string, name: string) => db.doc(`groups/${group}/usernames/${name}`);
const ownerOf = async (group: string, name: string) =>
  (await reservation(group, name).get()).data()?.userId;

/** Seeds a member: Auth account, global profile, group profiles and usernames. */
async function seedMember(uid: string, role: string, groups: string[] = [G1]) {
  await getAuth().createUser({uid});
  await db.doc(`users/${uid}`).set({id: uid, groups, activeGroupId: groups[0]});
  for (const group of groups) {
    await db.doc(`groups/${group}`).set({name: group});
    await db.doc(`groups/${group}/users/${uid}`).set({userId: uid, username: uid, role});
    await reservation(group, uid).set({userId: uid, originalUsername: uid});
  }
}

const leave = (group: string, uid: string) =>
  call(removeUserFromGroup, {groupId: group, userId: uid}, uid);
const deleteAccount = (uid: string) => call(deleteUser, {userId: uid}, uid);

beforeEach(async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  await clearProject(PROJECT);
  await seedMember("gandalf", "admin");
  await seedMember("frodo", "member");
});

afterEach(() => jest.restoreAllMocks());

describe.each([
  ["leaving the group", () => leave(G1, "frodo")],
  ["deleting the account", () => deleteAccount("frodo")],
])("%s", (_, depart) => {
  it("releases the member's own reservation", async () => {
    await depart();
    expect((await reservation(G1, "frodo").get()).exists).toBe(false);
  });

  it("never releases a reservation that names someone else", async () => {
    // The forgery: frodo's profile claims gandalf's name.
    await db.doc(`groups/${G1}/users/frodo`).update({username: "Gandalf"});

    await depart();

    expect(await ownerOf(G1, "gandalf")).toBe("gandalf");
    expect((await reservation(G1, "frodo").get()).exists).toBe(false);
  });

  it("releases every name still reserved to the member, not just the current one", async () => {
    // The profile editor used to rename without moving the reservation, so a
    // member can hold an old name while their profile shows an unreserved one.
    await reservation(G1, "ringbearer").set({userId: "frodo", originalUsername: "Ringbearer"});
    await db.doc(`groups/${G1}/users/frodo`).update({username: "MrUnderhill"});

    await depart();

    expect((await reservation(G1, "frodo").get()).exists).toBe(false);
    expect((await reservation(G1, "ringbearer").get()).exists).toBe(false);
    expect(await ownerOf(G1, "gandalf")).toBe("gandalf");
  });

  it("fails rather than release a reservation that changed hands meanwhile", async () => {
    // Between cleanup reading frodo's reservations and committing, frodo's
    // name is released and taken by gandalf.
    const commit = WriteBatch.prototype.commit;
    const spy = jest.spyOn(WriteBatch.prototype, "commit");
    spy.mockImplementationOnce(async () => {
      await reservation(G1, "frodo").delete();
      await reservation(G1, "frodo").set({userId: "gandalf", originalUsername: "Frodo"});
      return commit.call(spy.mock.contexts[0]);
    });

    await expectHttpsError(depart(), "internal");

    expect(await ownerOf(G1, "frodo")).toBe("gandalf");
  });
});

it("leaving one group keeps the member's names in the others", async () => {
  await seedMember("bilbo", "member", [G1, G2]);

  await leave(G1, "bilbo");

  expect((await reservation(G1, "bilbo").get()).exists).toBe(false);
  expect(await ownerOf(G2, "bilbo")).toBe("bilbo");
});
