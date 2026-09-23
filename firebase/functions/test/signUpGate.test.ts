// functions/test/signUpGate.test.ts
import * as admin from "firebase-admin";
import {AuthBlockingEvent, HttpsError} from "firebase-functions/v2/identity";
import {call, clearProject, expectHttpsError, useEmulatorProject} from "./emulator";
import {reserveSignUp} from "../src/signUp/reserveSignUp";
import {admitAccount} from "../src/signUp/gateAccountCreation";
import {MAX_ACCOUNTS, RESERVATIONS, reservationId} from "../src/signUp/signUpGate";

const PROJECT = "demo-sign-up-gate";
const db = useEmulatorProject(PROJECT);

const GROUP = "g1";
const TOKEN = "tok-live";
const DAY = 24 * 60 * 60 * 1000;

const reserve = (data: object) => call(reserveSignUp, data);

/** What Auth hands the blocking function for an account about to exist. */
const creating = (email?: string, signInMethod = "emailLink") =>
  admitAccount({
    data: email ? {email} : {},
    eventType: `providers/cloud.auth/eventTypes/user.beforeCreate:${signInMethod}`,
  } as unknown as AuthBlockingEvent);

/** Asserts the gate refuses, with the given code and client-facing marker. */
async function expectRefused(promise: Promise<unknown>, code: string, marker: string) {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(HttpsError);
  expect((caught as HttpsError).code).toBe(code);
  expect((caught as HttpsError).message).toContain(marker);
}

async function seedToken(token: object = {used: false}) {
  await db.doc(`groups/${GROUP}`).set({name: "Fellowship"});
  await db.doc(`groups/${GROUP}/registrationTokens/${TOKEN}`).set({token: TOKEN, ...token});
}

async function fillAccounts(count: number) {
  for (let i = 0; i < count; i++) {
    await admin.auth().createUser({email: `existing${i}@test.dev`});
  }
}

const reservationDoc = () => db.collection(RESERVATIONS).doc(reservationId(GROUP, TOKEN)).get();

beforeEach(() => clearProject(PROJECT));

describe("reserveSignUp", () => {
  it("reserves the normalised email against a live invitation", async () => {
    await seedToken();
    await reserve({groupId: GROUP, token: TOKEN, email: "  Frodo@Shire.dev "});
    const reservation = await reservationDoc();
    expect(reservation.data()?.email).toBe("frodo@shire.dev");
    expect(reservation.data()?.expiresAt.toDate().getTime()).toBeGreaterThan(Date.now());
  });

  it("spends nothing -- the invitation stays unused", async () => {
    await seedToken();
    await reserve({groupId: GROUP, token: TOKEN, email: "frodo@shire.dev"});
    expect((await db.doc(`groups/${GROUP}/registrationTokens/${TOKEN}`).get()).data()?.used).toBe(false);
  });

  it("holds one email per invitation: reserving again replaces it", async () => {
    await seedToken();
    await reserve({groupId: GROUP, token: TOKEN, email: "frodo@shire.dev"});
    await reserve({groupId: GROUP, token: TOKEN, email: "sam@shire.dev"});
    const all = await db.collection(RESERVATIONS).get();
    expect(all.docs.map((doc) => doc.data().email)).toEqual(["sam@shire.dev"]);
  });

  describe("refuses", () => {
    it.each([
      ["no token", {groupId: GROUP, email: "frodo@shire.dev"}],
      ["no group", {token: TOKEN, email: "frodo@shire.dev"}],
      ["no email", {groupId: GROUP, token: TOKEN}],
      ["a malformed email", {groupId: GROUP, token: TOKEN, email: "frodo"}],
    ])("a request with %s", async (_label, data) => {
      await seedToken();
      await expectHttpsError(reserve(data), "invalid-argument");
      expect((await db.collection(RESERVATIONS).get()).empty).toBe(true);
    });

    it("a token that does not exist", async () => {
      await seedToken();
      await expectHttpsError(reserve({groupId: GROUP, token: "forged", email: "frodo@shire.dev"}), "not-found");
      expect((await db.collection(RESERVATIONS).get()).empty).toBe(true);
    });

    it("a used token", async () => {
      await seedToken({used: true});
      await expectHttpsError(reserve({groupId: GROUP, token: TOKEN, email: "frodo@shire.dev"}), "failed-precondition");
      expect((await reservationDoc()).exists).toBe(false);
    });

    it("an expired token", async () => {
      await seedToken({used: false, expiresAt: new Date(Date.now() - DAY)});
      await expectHttpsError(reserve({groupId: GROUP, token: TOKEN, email: "frodo@shire.dev"}), "failed-precondition");
      expect((await reservationDoc()).exists).toBe(false);
    });

    it("anyone once the project is at the account limit", async () => {
      await seedToken();
      await fillAccounts(MAX_ACCOUNTS);
      const error = await expectHttpsError(
        reserve({groupId: GROUP, token: TOKEN, email: "frodo@shire.dev"}),
        "resource-exhausted"
      );
      expect(error.message).toContain("ACCOUNTS_FULL");
      expect((await reservationDoc()).exists).toBe(false);
    });
  });
});

describe("admitAccount (beforeUserCreated)", () => {
  it("admits an email holding a live reservation, and consumes it", async () => {
    await seedToken();
    await reserve({groupId: GROUP, token: TOKEN, email: "frodo@shire.dev"});
    await expect(creating("Frodo@Shire.dev")).resolves.toBeUndefined();
    expect((await reservationDoc()).exists).toBe(false);
  });

  it("admits one account per reservation", async () => {
    await seedToken();
    await reserve({groupId: GROUP, token: TOKEN, email: "frodo@shire.dev"});
    await creating("frodo@shire.dev");
    await expectRefused(creating("frodo@shire.dev"), "permission-denied", "INVITE_REQUIRED");
  });

  describe("refuses", () => {
    it("an email nobody invited", async () => {
      await expectRefused(creating("stranger@elsewhere.dev"), "permission-denied", "INVITE_REQUIRED");
    });

    it("an email other than the one reserved", async () => {
      await seedToken();
      await reserve({groupId: GROUP, token: TOKEN, email: "frodo@shire.dev"});
      await expectRefused(creating("sam@shire.dev"), "permission-denied", "INVITE_REQUIRED");
      expect((await reservationDoc()).exists).toBe(true);
    });

    it("an account with no email at all", async () => {
      await expectRefused(creating(undefined), "permission-denied", "INVITE_REQUIRED");
    });

    it("a reservation past its own expiry, and deletes it", async () => {
      await seedToken();
      await db.collection(RESERVATIONS).doc(reservationId(GROUP, TOKEN)).set({
        email: "frodo@shire.dev", groupId: GROUP, token: TOKEN,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expectRefused(creating("frodo@shire.dev"), "permission-denied", "INVITE_REQUIRED");
      expect((await reservationDoc()).exists).toBe(false);
    });

    it("a reservation whose invitation was used since", async () => {
      await seedToken();
      await reserve({groupId: GROUP, token: TOKEN, email: "frodo@shire.dev"});
      await db.doc(`groups/${GROUP}/registrationTokens/${TOKEN}`).update({used: true});
      await expectRefused(creating("frodo@shire.dev"), "permission-denied", "INVITE_REQUIRED");
    });

    it("a reservation whose invitation was deleted since", async () => {
      await seedToken();
      await reserve({groupId: GROUP, token: TOKEN, email: "frodo@shire.dev"});
      await db.doc(`groups/${GROUP}/registrationTokens/${TOKEN}`).delete();
      await expectRefused(creating("frodo@shire.dev"), "permission-denied", "INVITE_REQUIRED");
    });

    it("a reserved email once the project is at the account limit, keeping the reservation", async () => {
      await seedToken();
      await reserve({groupId: GROUP, token: TOKEN, email: "frodo@shire.dev"});
      await fillAccounts(MAX_ACCOUNTS);
      await expectRefused(creating("frodo@shire.dev"), "resource-exhausted", "ACCOUNTS_FULL");
      expect((await reservationDoc()).exists).toBe(true);
    });
  });

  describe("the emulator's sample-data exemption", () => {
    afterEach(() => {
      delete process.env.FUNCTIONS_EMULATOR;
    });

    it("admits an example.com password sign-up inside the emulator", async () => {
      process.env.FUNCTIONS_EMULATOR = "true";
      await expect(creating("dm@example.com", "password")).resolves.toBeUndefined();
    });

    it("does not exist outside it", async () => {
      await expectRefused(creating("dm@example.com", "password"), "permission-denied", "INVITE_REQUIRED");
    });

    // The generator signs up with a password; the app never does. A Google or
    // magic-link sign-up with an example.com address is a manual test of the
    // real gate and must meet it.
    it.each(["google.com", "emailLink"])("does not cover a %s sign-up, even in the emulator", async (method) => {
      process.env.FUNCTIONS_EMULATOR = "true";
      await expectRefused(creating("play57@example.com", method), "permission-denied", "INVITE_REQUIRED");
    });
  });
});
