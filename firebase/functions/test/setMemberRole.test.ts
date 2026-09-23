// functions/test/setMemberRole.test.ts
import {call, clearProject, expectHttpsError, useEmulatorProject} from "./emulator";
import {setMemberRole} from "../src/groupManagement/setMemberRole";

const PROJECT = "demo-set-member-role";
const db = useEmulatorProject(PROJECT);
const GROUP = "g1";

const setRole = (data: object, uid?: string) => call(setMemberRole, data, uid);
const roleOf = async (uid: string) =>
  (await db.doc(`groups/${GROUP}/users/${uid}`).get()).data()?.role;

/** Seeds the group with the given members, as `{uid: role}`. */
async function seed(members: Record<string, string>) {
  await db.doc(`groups/${GROUP}`).set({name: "Fellowship"});
  await Promise.all(Object.entries(members).map(([uid, role]) =>
    db.doc(`groups/${GROUP}/users/${uid}`).set({userId: uid, username: uid, role})
  ));
}

beforeEach(() => clearProject(PROJECT));

describe("setMemberRole", () => {
  describe("refuses", () => {
    it("an anonymous caller", async () => {
      await seed({gandalf: "admin", frodo: "member"});
      await expectHttpsError(setRole({groupId: GROUP, userId: "frodo", role: "admin"}), "unauthenticated");
    });

    it("a role that is neither admin nor member", async () => {
      await seed({gandalf: "admin", frodo: "member"});
      await expectHttpsError(
        setRole({groupId: GROUP, userId: "frodo", role: "owner"}, "gandalf"),
        "invalid-argument"
      );
    });

    it("a caller who is only a member -- including promoting themselves", async () => {
      await seed({gandalf: "admin", frodo: "member"});
      await expectHttpsError(
        setRole({groupId: GROUP, userId: "frodo", role: "admin"}, "frodo"),
        "permission-denied"
      );
      expect(await roleOf("frodo")).toBe("member");
    });

    it("a caller from outside the group", async () => {
      await seed({gandalf: "admin", frodo: "member"});
      await expectHttpsError(
        setRole({groupId: GROUP, userId: "frodo", role: "admin"}, "sauron"),
        "permission-denied"
      );
    });

    it("someone who is not in the group", async () => {
      await seed({gandalf: "admin"});
      await expectHttpsError(
        setRole({groupId: GROUP, userId: "nobody", role: "admin"}, "gandalf"),
        "not-found"
      );
    });

    it("the only admin demoting themselves while others remain", async () => {
      await seed({gandalf: "admin", frodo: "member"});
      const error = await expectHttpsError(
        setRole({groupId: GROUP, userId: "gandalf", role: "member"}, "gandalf"),
        "failed-precondition"
      );
      expect(error.message).toMatch(/only admin/);
      expect(await roleOf("gandalf")).toBe("admin");
    });

    it("the only admin demoting themselves even when alone", async () => {
      await seed({gandalf: "admin"});
      await expectHttpsError(
        setRole({groupId: GROUP, userId: "gandalf", role: "member"}, "gandalf"),
        "failed-precondition"
      );
      expect(await roleOf("gandalf")).toBe("admin");
    });
  });

  describe("allows", () => {
    it("an admin to promote a member", async () => {
      await seed({gandalf: "admin", frodo: "member"});
      await expect(setRole({groupId: GROUP, userId: "frodo", role: "admin"}, "gandalf"))
        .resolves.toEqual({success: true});
      expect(await roleOf("frodo")).toBe("admin");
    });

    it("an admin to demote another admin", async () => {
      await seed({gandalf: "admin", aragorn: "admin"});
      await setRole({groupId: GROUP, userId: "aragorn", role: "member"}, "gandalf");
      expect(await roleOf("aragorn")).toBe("member");
    });

    it("an admin to step down once someone else is an admin", async () => {
      await seed({gandalf: "admin", aragorn: "admin", frodo: "member"});
      await setRole({groupId: GROUP, userId: "gandalf", role: "member"}, "gandalf");
      expect(await roleOf("gandalf")).toBe("member");
    });

    it("setting the role someone already has, as a no-op", async () => {
      await seed({gandalf: "admin", frodo: "member"});
      await expect(setRole({groupId: GROUP, userId: "frodo", role: "member"}, "gandalf"))
        .resolves.toEqual({success: true});
      expect(await roleOf("frodo")).toBe("member");
    });
  });
});
