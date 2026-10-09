// functions/test/accountCount.test.ts
//
// The account count (T128): the document the sign-up gate keeps instead of
// listing Auth on every sign-up, and the daily recount that corrects it.
import {getAuth} from "firebase-admin/auth";
import {clearProject, useEmulatorProject} from "./emulator";
import {
  ACCOUNT_COUNT,
  MAX_ACCOUNTS,
  accountLimitReached,
  countAccounts,
  recountAccounts,
  releaseAccountSlot,
} from "../src/signUp/accountCount";

const PROJECT = "demo-account-count";
const db = useEmulatorProject(PROJECT);

const stored = async () => (await db.doc(ACCOUNT_COUNT).get()).data();

async function makeAccounts(count: number) {
  for (let i = 0; i < count; i++) {
    await getAuth().createUser({email: `player${i}@test.dev`});
  }
}

beforeEach(() => clearProject(PROJECT));

describe("countAccounts", () => {
  it("counts every Auth account", async () => {
    await makeAccounts(3);
    expect(await countAccounts()).toBe(3);
  });
});

describe("accountLimitReached", () => {
  it("reads the stored count", async () => {
    await db.doc(ACCOUNT_COUNT).set({count: MAX_ACCOUNTS});
    expect(await accountLimitReached(db)).toBe(true);
    await db.doc(ACCOUNT_COUNT).set({count: MAX_ACCOUNTS - 1});
    expect(await accountLimitReached(db)).toBe(false);
  });

  it("counts Auth before there is a stored count, and stores nothing", async () => {
    await makeAccounts(2);
    expect(await accountLimitReached(db)).toBe(false);
    expect(await stored()).toBeUndefined();
  });
});

describe("releaseAccountSlot", () => {
  it("counts one fewer", async () => {
    await db.doc(ACCOUNT_COUNT).set({count: 5});
    await releaseAccountSlot(db);
    expect((await stored())?.count).toBe(4);
  });

  it("never goes below zero", async () => {
    await db.doc(ACCOUNT_COUNT).set({count: 0});
    await releaseAccountSlot(db);
    expect((await stored())?.count).toBe(0);
  });

  it("writes nothing before there is a count", async () => {
    await releaseAccountSlot(db);
    expect(await stored()).toBeUndefined();
  });
});

describe("recountAccounts", () => {
  it("sets the count from Auth, whatever it said", async () => {
    await makeAccounts(4);
    await db.doc(ACCOUNT_COUNT).set({count: 40});
    const now = new Date("2026-10-09T04:20:00Z");

    expect(await recountAccounts(now, db)).toBe(4);
    const after = await stored();
    expect(after?.count).toBe(4);
    expect(after?.recountedAt.toDate()).toEqual(now);
  });
});
