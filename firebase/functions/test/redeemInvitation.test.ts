// functions/test/redeemInvitation.test.ts
import {call, clearProject, expectHttpsError, useEmulatorProject} from "./emulator";
import {redeemInvitation} from "../src/groupManagement/redeemInvitation";

const PROJECT = "demo-redeem-invitation";
const db = useEmulatorProject(PROJECT);

const GROUP = "g1";
const TOKEN = "tok-live";
const DAY = 24 * 60 * 60 * 1000;

const redeem = (data: object, uid?: string, email?: string) =>
  call(redeemInvitation, data, uid, email);

/** Seeds a group with one admin and a token in the given state. */
async function seed(token: object = {used: false}) {
  await db.doc(`groups/${GROUP}`).set({name: "Fellowship", createdBy: "admin"});
  await db.doc(`groups/${GROUP}/users/admin`).set({userId: "admin", username: "Gandalf", role: "admin"});
  await db.doc(`groups/${GROUP}/usernames/gandalf`).set({userId: "admin", originalUsername: "Gandalf"});
  await db.doc(`groups/${GROUP}/registrationTokens/${TOKEN}`).set({token: TOKEN, ...token});
}

const tokenDoc = () => db.doc(`groups/${GROUP}/registrationTokens/${TOKEN}`).get();

beforeEach(() => clearProject(PROJECT));

describe("redeemInvitation", () => {
  describe("refuses", () => {
    it("an anonymous caller", async () => {
      await seed();
      await expectHttpsError(redeem({groupId: GROUP, token: TOKEN, username: "Frodo"}), "unauthenticated");
    });

    it("a request with no token", async () => {
      await seed();
      await expectHttpsError(redeem({groupId: GROUP, username: "Frodo"}, "u1"), "invalid-argument");
    });

    it.each([["too short", "Fr"], ["too long", "F".repeat(21)], ["blank once trimmed", "     "]])(
      "a username that is %s",
      async (_label, username) => {
        await seed();
        await expectHttpsError(redeem({groupId: GROUP, token: TOKEN, username}, "u1"), "invalid-argument");
      }
    );

    it("a token that does not exist, and grants nothing", async () => {
      await seed();
      await expectHttpsError(redeem({groupId: GROUP, token: "forged", username: "Frodo"}, "u1"), "not-found");
      expect((await db.doc("users/u1").get()).exists).toBe(false);
      expect((await db.doc(`groups/${GROUP}/users/u1`).get()).exists).toBe(false);
    });

    it("a token for a group that does not exist", async () => {
      await db.doc(`groups/${GROUP}/registrationTokens/${TOKEN}`).set({used: false});
      await expectHttpsError(redeem({groupId: GROUP, token: TOKEN, username: "Frodo"}, "u1"), "not-found");
    });

    it("a used token, and grants nothing", async () => {
      await seed({used: true, usedBy: "someone-else"});
      const error = await expectHttpsError(
        redeem({groupId: GROUP, token: TOKEN, username: "Frodo"}, "u1"),
        "failed-precondition"
      );
      expect(error.message).toMatch(/already been used/);
      expect((await db.doc(`groups/${GROUP}/users/u1`).get()).exists).toBe(false);
      expect((await tokenDoc()).data()?.usedBy).toBe("someone-else");
    });

    it("an expired token, and grants nothing", async () => {
      await seed({used: false, expiresAt: new Date(Date.now() - DAY)});
      const error = await expectHttpsError(
        redeem({groupId: GROUP, token: TOKEN, username: "Frodo"}, "u1"),
        "failed-precondition"
      );
      expect(error.message).toMatch(/expired/);
      expect((await db.doc(`groups/${GROUP}/users/u1`).get()).exists).toBe(false);
      expect((await tokenDoc()).data()?.used).toBe(false);
    });

    it("an existing member, without spending the token", async () => {
      await seed();
      await db.doc("users/u1").set({id: "u1", groups: [GROUP]});
      await expectHttpsError(redeem({groupId: GROUP, token: TOKEN, username: "Frodo"}, "u1"), "already-exists");
      expect((await tokenDoc()).data()?.used).toBe(false);
    });

    it("a name someone else holds, case-insensitively, without spending the token", async () => {
      await seed();
      const error = await expectHttpsError(
        redeem({groupId: GROUP, token: TOKEN, username: "GANDALF"}, "u1"),
        "already-exists"
      );
      expect(error.message).toMatch(/Username is already taken/);
      expect((await tokenDoc()).data()?.used).toBe(false);
    });

    it("a second redemption of the same token by someone else", async () => {
      await seed();
      await redeem({groupId: GROUP, token: TOKEN, username: "Frodo"}, "u1");
      await expectHttpsError(redeem({groupId: GROUP, token: TOKEN, username: "Sam"}, "u2"), "failed-precondition");
      expect((await db.doc(`groups/${GROUP}/users/u2`).get()).exists).toBe(false);
    });
  });

  describe("for a brand-new account", () => {
    it("creates the global profile, the member profile and the reservation, and spends the token", async () => {
      await seed({used: false, expiresAt: new Date(Date.now() + DAY)});

      const result = await redeem({groupId: GROUP, token: TOKEN, username: "  Frodo  "}, "u1", "frodo@shire.test");

      expect(result).toEqual({success: true, groupId: GROUP});

      const user = (await db.doc("users/u1").get()).data();
      expect(user).toMatchObject({id: "u1", email: "frodo@shire.test", groups: [GROUP], activeGroupId: GROUP});
      expect(user?.isAdmin).toBeUndefined();

      expect((await db.doc(`groups/${GROUP}/users/u1`).get()).data()).toMatchObject({
        userId: "u1",
        username: "Frodo",
        role: "member",
        preferences: {theme: "light"},
      });
      expect((await db.doc(`groups/${GROUP}/usernames/frodo`).get()).data()).toMatchObject({
        userId: "u1",
        originalUsername: "Frodo",
      });
      expect((await tokenDoc()).data()).toMatchObject({used: true, usedBy: "u1"});
    });

    it("accepts a token minted before expiry existed", async () => {
      await seed({used: false});
      await redeem({groupId: GROUP, token: TOKEN, username: "Frodo"}, "u1");
      expect((await db.doc(`groups/${GROUP}/users/u1`).get()).exists).toBe(true);
    });
  });

  describe("for an existing account", () => {
    it("adds the group to the ones it already has, and makes it active", async () => {
      await seed();
      await db.doc("users/u1").set({id: "u1", email: "frodo@shire.test", groups: ["other"], activeGroupId: "other"});

      await redeem({groupId: GROUP, token: TOKEN, username: "Frodo"}, "u1");

      expect((await db.doc("users/u1").get()).data()).toMatchObject({
        email: "frodo@shire.test",
        groups: ["other", GROUP],
        activeGroupId: GROUP,
      });
      expect((await db.doc(`groups/${GROUP}/users/u1`).get()).data()).toMatchObject({
        role: "member",
        preferences: {theme: "default"},
      });
    });
  });
});
