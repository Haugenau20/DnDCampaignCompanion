// functions/test/operator/accounts.test.ts
//
// T137: the operator looks up one account by exact email, and sees what
// setting an allowance needs, nothing of what the person wrote or joined.
import {getAuth} from "firebase-admin/auth";
import {Timestamp} from "firebase-admin/firestore";
import {clearProject, useEmulatorProject} from "../emulator";
import {lookUpAccount} from "../../src/operator/accounts";
import {Refusal} from "../../src/shared/refusal";

const PROJECT = "demo-operator-accounts";
const db = useEmulatorProject(PROJECT);
const DAY = 24 * 60 * 60 * 1000;

const lookUp = (email: string, now?: Date) => lookUpAccount(db, getAuth(), email, now);

beforeEach(() => clearProject(PROJECT));

describe("looking up an account", () => {
  it("finds it by email, whatever the case or spaces", async () => {
    const {uid} = await getAuth().createUser({email: "frodo@shire.dev"});

    const account = await lookUp("  Frodo@Shire.DEV ");

    expect(account?.uid).toBe(uid);
    expect(account?.email).toBe("frodo@shire.dev");
    expect(account?.createdAt).toBeInstanceOf(Date);
  });

  it("finds nothing for an address without an account", async () => {
    expect(await lookUp("nobody@shire.dev")).toBeNull();
  });

  it("refuses what is not an email address", async () => {
    for (const email of ["", "frodo", "frodo @shire.dev", `${"x".repeat(250)}@shire.dev`]) {
      let caught: unknown;
      try {
        await lookUp(email);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(Refusal);
      expect((caught as Refusal).reason).toBe("invalid_input");
    }
  });

  it("says when the account has no profile yet", async () => {
    await getAuth().createUser({email: "frodo@shire.dev"});

    const account = await lookUp("frodo@shire.dev");

    expect(account?.hasProfile).toBe(false);
    expect(account?.usage).toBeNull();
    expect(account?.allowance).toBeNull();
    expect(account?.limits).toEqual({unlimited: false, limits: {daily: 3, weekly: 5, monthly: 10}, raisedUntil: null});
  });

  it("shows the usage, the limits in force and the allowance, and nothing else", async () => {
    const {uid} = await getAuth().createUser({email: "frodo@shire.dev"});
    const until = new Date(Date.now() + 7 * DAY);
    const today = new Date().toISOString();
    await db.doc(`users/${uid}`).set({
      id: uid,
      email: "frodo@shire.dev",
      groups: ["fellowship"],
      activeGroupId: "fellowship",
      preferences: {theme: "dark"},
      entityExtractionUsage: {
        daily: {count: 4, lastReset: today, limit: 3},
        weekly: {count: 9, lastReset: today, limit: 5},
        monthly: {count: 9, lastReset: today, limit: 10},
      },
      extractionAllowance: {
        unlimited: false,
        limits: {daily: 10, weekly: 40, monthly: 80},
        expiresAt: Timestamp.fromDate(until),
        setAt: Timestamp.now(),
      },
    });

    const account = await lookUp("frodo@shire.dev");

    expect(account?.hasProfile).toBe(true);
    expect(account?.usage?.usage.daily).toMatchObject({count: 4, limit: 10});
    expect(account?.usage?.usage.weekly).toMatchObject({count: 9, limit: 40});
    expect(account?.limits.raisedUntil).toEqual(until);
    expect(account?.allowance).toMatchObject({
      unlimited: false,
      limits: {daily: 10, weekly: 40, monthly: 80},
      expiresAt: until,
      expired: false,
    });
    const shown = JSON.stringify(account);
    expect(shown).not.toContain("fellowship");
    expect(shown).not.toContain("dark");
    expect(Object.keys(account ?? {}).sort()).toEqual(
      ["allowance", "createdAt", "email", "hasProfile", "lastSignInAt", "limits", "uid", "usage"]
    );
  });

  it("marks an allowance past its date as expired, and shows the defaults in force", async () => {
    const {uid} = await getAuth().createUser({email: "frodo@shire.dev"});
    await db.doc(`users/${uid}`).set({
      id: uid,
      extractionAllowance: {
        unlimited: true,
        limits: null,
        expiresAt: Timestamp.fromDate(new Date(Date.now() - DAY)),
        setAt: Timestamp.now(),
      },
    });

    const account = await lookUp("frodo@shire.dev");

    expect(account?.allowance?.expired).toBe(true);
    expect(account?.limits.unlimited).toBe(false);
  });
});
