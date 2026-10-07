// functions/test/createGroup.test.ts
import {call, clearProject, expectHttpsError, useEmulatorProject} from "./emulator";
import {createGroup} from "../src/groupManagement/createGroup";

const PROJECT = "demo-create-group";
const db = useEmulatorProject(PROJECT);

const create = (data: object, uid?: string) =>
  call(createGroup, data, uid, uid ? `${uid}@example.com` : undefined) as
    Promise<{success: boolean; groupId: string}>;

beforeEach(() => clearProject(PROJECT));

describe("createGroup", () => {
  describe("refuses", () => {
    it("an anonymous caller", async () => {
      await expectHttpsError(create({name: "Fellowship"}), "unauthenticated");
    });

    it("a name that is only whitespace", async () => {
      await expectHttpsError(create({name: "   "}, "gandalf"), "invalid-argument");
    });

    // T119: the rules cap a group's name and description for the client's
    // edits; the group is written here, past the rules, so the same caps are
    // checked here.
    it("a name over 200 characters, or a description over 10,000, creating nothing", async () => {
      await expectHttpsError(create({name: "x".repeat(201)}, "gandalf"), "invalid-argument");
      await expectHttpsError(
        create({name: "Fellowship", description: "x".repeat(10_001)}, "gandalf"), "invalid-argument"
      );
      expect((await db.collection("groups").get()).size).toBe(0);
    });

    it("a description that is not text", async () => {
      await expectHttpsError(create({name: "Fellowship", description: {long: true}}, "gandalf"), "invalid-argument");
      expect((await db.collection("groups").get()).size).toBe(0);
    });

    it("nothing at the limits: a name of 200 and a description of 10,000", async () => {
      const {groupId} = await create({name: "x".repeat(200), description: "y".repeat(10_000)}, "gandalf");
      expect((await db.doc(`groups/${groupId}`).get()).data()?.description).toHaveLength(10_000);
    });
  });

  // The transaction wrote the group before it read the caller's profile, and
  // the Firestore SDK refuses a read after a write: every call failed with
  // "Firestore transactions require all reads to be executed before all
  // writes" -- in production too. No test covered this callable until then.
  describe("for a caller with a profile", () => {
    beforeEach(() =>
      db.doc("users/gandalf").set({
        id: "gandalf",
        username: "Gandalf",
        groups: ["older-group"],
        activeGroupId: "older-group",
      })
    );

    it("creates the group, named as asked", async () => {
      const {success, groupId} = await create(
        {name: "  The Fellowship  ", description: "Nine walkers"},
        "gandalf"
      );

      expect(success).toBe(true);
      expect((await db.doc(`groups/${groupId}`).get()).data()).toMatchObject({
        name: "The Fellowship",
        description: "Nine walkers",
        createdBy: "gandalf",
      });
    });

    it("makes the caller its admin, under their own username", async () => {
      const {groupId} = await create({name: "The Fellowship"}, "gandalf");

      expect((await db.doc(`groups/${groupId}/users/gandalf`).get()).data()).toMatchObject({
        userId: "gandalf",
        username: "Gandalf",
        role: "admin",
      });
      expect((await db.doc(`groups/${groupId}/usernames/gandalf`).get()).data()).toMatchObject({
        userId: "gandalf",
        originalUsername: "Gandalf",
      });
    });

    it("adds the group to the caller's groups, and makes it the active one", async () => {
      const {groupId} = await create({name: "The Fellowship"}, "gandalf");

      expect((await db.doc("users/gandalf").get()).data()).toMatchObject({
        groups: ["older-group", groupId],
        activeGroupId: groupId,
      });
    });
  });

  it("creates the profile of a caller who has none", async () => {
    const {groupId} = await create({name: "The Fellowship"}, "frodo");

    expect((await db.doc("users/frodo").get()).data()).toMatchObject({
      id: "frodo",
      email: "frodo@example.com",
      groups: [groupId],
      activeGroupId: groupId,
    });
    expect((await db.doc(`groups/${groupId}/users/frodo`).get()).data()?.role).toBe("admin");
  });
});
