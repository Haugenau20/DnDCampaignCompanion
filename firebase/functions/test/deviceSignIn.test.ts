// functions/test/deviceSignIn.test.ts
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {call, clearProject, expectHttpsError, useEmulatorProject} from "./emulator";
import {startDeviceSignIn} from "../src/deviceSignIn/startDeviceSignIn";
import {approveDeviceSignIn} from "../src/deviceSignIn/approveDeviceSignIn";
import {claimDeviceSignIn} from "../src/deviceSignIn/claimDeviceSignIn";
import {lookUpDeviceSignIn} from "../src/deviceSignIn/lookUpDeviceSignIn";
import {
  DEVICE_SIGN_INS,
  MAX_CODE_ATTEMPTS,
  MAX_OPEN_REQUESTS,
} from "../src/deviceSignIn/deviceSignIn";

const PROJECT = "demo-device-sign-in";
const db = useEmulatorProject(PROJECT);

const EMAIL = "frodo@shire.dev";

interface Started {
  requestId: string;
  secret: string;
  code: string;
}

const start = (email: string = EMAIL) =>
  call(startDeviceSignIn, {email}) as Promise<Started>;
const approve = (data: object, uid?: string, email?: string) =>
  call(approveDeviceSignIn, data, uid, email);
const lookUp = (data: object) =>
  call(lookUpDeviceSignIn, data) as Promise<{email: string}>;
const claim = (data: object) =>
  call(claimDeviceSignIn, data) as Promise<{status: string; token?: string}>;

/** A real account, as the approving device would be signed in as. */
async function account(email: string = EMAIL): Promise<string> {
  const user = await admin.auth().createUser({email});
  return user.uid;
}

/** A code that is certainly not `code`. */
const wrong = (code: string) => (code === "0000" ? "1111" : "0000");

const requestDoc = (id: string) => db.collection(DEVICE_SIGN_INS).doc(id).get();

beforeEach(() => clearProject(PROJECT));

describe("startDeviceSignIn", () => {
  it("opens a pending request for the normalised address", async () => {
    const started = await start("  Frodo@Shire.dev ");
    expect(started.code).toMatch(/^\d{4}$/);
    const stored = (await requestDoc(started.requestId)).data();
    expect(stored?.email).toBe(EMAIL);
    expect(stored?.status).toBe("pending");
    expect(stored?.code).toBe(started.code);
  });

  it("stores only a hash of the secret", async () => {
    const started = await start();
    const stored = (await requestDoc(started.requestId)).data();
    expect(JSON.stringify(stored)).not.toContain(started.secret);
  });

  it("answers the same for an address with no account", async () => {
    const started = await start("nobody@nowhere.dev");
    expect(started.requestId).toBeTruthy();
  });

  it("refuses an invalid address", async () => {
    await expectHttpsError(start("not-an-address"), "invalid-argument");
  });

  it(`refuses a request past ${MAX_OPEN_REQUESTS} open ones`, async () => {
    for (let i = 0; i < MAX_OPEN_REQUESTS; i++) await start();
    await expectHttpsError(start(), "resource-exhausted");
  });

  it("does not count other addresses against the limit", async () => {
    for (let i = 0; i < MAX_OPEN_REQUESTS; i++) await start("sam@shire.dev");
    await expect(start()).resolves.toBeTruthy();
  });

  it("does not count used requests against the limit", async () => {
    const uid = await account();
    const first = await start();
    await approve({requestId: first.requestId, code: first.code}, uid, EMAIL);
    for (let i = 1; i < MAX_OPEN_REQUESTS; i++) await start();
    await expect(start()).resolves.toBeTruthy();
  });

  it("resets once requests expire, and clears the expired ones away", async () => {
    const ids: string[] = [];
    for (let i = 0; i < MAX_OPEN_REQUESTS; i++) ids.push((await start()).requestId);
    for (const id of ids) {
      await db.collection(DEVICE_SIGN_INS).doc(id).update({
        expiresAt: Timestamp.fromMillis(Date.now() - 1000),
      });
    }
    await expect(start()).resolves.toBeTruthy();
    for (const id of ids) expect((await requestDoc(id)).exists).toBe(false);
  });
});

describe("approveDeviceSignIn", () => {
  it("approves a request for the caller's own address with the right code", async () => {
    const uid = await account();
    const {requestId, code} = await start();
    await expect(approve({requestId, code}, uid, EMAIL)).resolves.toEqual({success: true});
    const stored = (await requestDoc(requestId)).data();
    expect(stored?.status).toBe("approved");
    expect(stored?.uid).toBe(uid);
  });

  it("matches the address regardless of case", async () => {
    const uid = await account();
    const {requestId, code} = await start();
    await expect(approve({requestId, code}, uid, "FRODO@shire.dev")).resolves.toEqual({success: true});
  });

  it("refuses an anonymous caller", async () => {
    const {requestId, code} = await start();
    await expectHttpsError(approve({requestId, code}), "unauthenticated");
  });

  it("refuses an account with another address, even with the right code", async () => {
    const uid = await account("sauron@mordor.dev");
    const {requestId, code} = await start();
    await expectHttpsError(approve({requestId, code}, uid, "sauron@mordor.dev"), "permission-denied");
    expect((await requestDoc(requestId)).data()?.status).toBe("pending");
  });

  it("counts a wrong code and says how many tries are left", async () => {
    const uid = await account();
    const {requestId, code} = await start();
    const error = await expectHttpsError(approve({requestId, code: wrong(code)}, uid, EMAIL), "invalid-argument");
    expect(error.message).toContain(`${MAX_CODE_ATTEMPTS - 1} tries left`);
    const stored = (await requestDoc(requestId)).data();
    expect(stored?.attempts).toBe(1);
    expect(stored?.status).toBe("pending");
  });

  it(`closes the request after ${MAX_CODE_ATTEMPTS} wrong codes -- even the right one fails after`, async () => {
    const uid = await account();
    const {requestId, code} = await start();
    for (let i = 1; i < MAX_CODE_ATTEMPTS; i++) {
      await expectHttpsError(approve({requestId, code: wrong(code)}, uid, EMAIL), "invalid-argument");
    }
    await expectHttpsError(approve({requestId, code: wrong(code)}, uid, EMAIL), "failed-precondition");
    expect((await requestDoc(requestId)).data()?.status).toBe("spent");
    await expectHttpsError(approve({requestId, code}, uid, EMAIL), "failed-precondition");
  });

  it("refuses an expired request", async () => {
    const uid = await account();
    const {requestId, code} = await start();
    await db.collection(DEVICE_SIGN_INS).doc(requestId).update({
      expiresAt: Timestamp.fromMillis(Date.now() - 1000),
    });
    await expectHttpsError(approve({requestId, code}, uid, EMAIL), "failed-precondition");
  });

  it("refuses a request that does not exist", async () => {
    const uid = await account();
    await expectHttpsError(approve({requestId: "nope", code: "1234"}, uid, EMAIL), "failed-precondition");
  });

  it("refuses approving twice", async () => {
    const uid = await account();
    const {requestId, code} = await start();
    await approve({requestId, code}, uid, EMAIL);
    await expectHttpsError(approve({requestId, code}, uid, EMAIL), "failed-precondition");
  });
});

describe("lookUpDeviceSignIn", () => {
  // Anonymous: the approving device is signed in nowhere yet.
  it("answers the address a pending request was opened for, normalised", async () => {
    const {requestId} = await start("  Frodo@Shire.dev ");
    await expect(lookUp({requestId})).resolves.toEqual({email: EMAIL});
  });

  it("gives away nothing else about the request", async () => {
    const {requestId, code, secret} = await start();
    const answer = JSON.stringify(await lookUp({requestId}));
    expect(answer).not.toContain(code);
    expect(answer).not.toContain(secret);
  });

  it("refuses a request that does not exist", async () => {
    await expectHttpsError(lookUp({requestId: "nope"}), "failed-precondition");
  });

  it("refuses an expired request", async () => {
    const {requestId} = await start();
    await db.collection(DEVICE_SIGN_INS).doc(requestId).update({
      expiresAt: Timestamp.fromMillis(Date.now() - 1000),
    });
    await expectHttpsError(lookUp({requestId}), "failed-precondition");
  });

  it("refuses a request that is no longer pending", async () => {
    const uid = await account();
    const {requestId, code} = await start();
    await approve({requestId, code}, uid, EMAIL);
    await expectHttpsError(lookUp({requestId}), "failed-precondition");
  });

  it("refuses a missing id", async () => {
    await expectHttpsError(lookUp({}), "invalid-argument");
  });
});

describe("claimDeviceSignIn", () => {
  it("answers pending until the request is approved", async () => {
    const {requestId, secret} = await start();
    await expect(claim({requestId, secret})).resolves.toEqual({status: "pending"});
  });

  it("hands over a sign-in token for the approved account, once", async () => {
    const uid = await account();
    const {requestId, secret, code} = await start();
    await approve({requestId, code}, uid, EMAIL);

    const claimed = await claim({requestId, secret});
    expect(claimed.status).toBe("approved");
    // The emulator's custom tokens are unsigned JWTs; the uid is in the payload.
    const payload = JSON.parse(Buffer.from(String(claimed.token).split(".")[1], "base64url").toString());
    expect(payload.uid).toBe(uid);

    await expect(claim({requestId, secret})).resolves.toEqual({status: "expired"});
    expect((await requestDoc(requestId)).data()?.status).toBe("claimed");
  });

  it("refuses the wrong secret, and leaves the request collectable", async () => {
    const uid = await account();
    const {requestId, secret, code} = await start();
    await approve({requestId, code}, uid, EMAIL);
    await expectHttpsError(claim({requestId, secret: "stolen"}), "permission-denied");
    expect((await claim({requestId, secret})).status).toBe("approved");
  });

  it("answers expired for an expired approved request", async () => {
    const uid = await account();
    const {requestId, secret, code} = await start();
    await approve({requestId, code}, uid, EMAIL);
    await db.collection(DEVICE_SIGN_INS).doc(requestId).update({
      expiresAt: Timestamp.fromMillis(Date.now() - 1000),
    });
    await expect(claim({requestId, secret})).resolves.toEqual({status: "expired"});
  });

  it("answers expired for a request closed by wrong codes", async () => {
    const uid = await account();
    const {requestId, secret, code} = await start();
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
      await approve({requestId, code: wrong(code)}, uid, EMAIL).catch(() => undefined);
    }
    await expect(claim({requestId, secret})).resolves.toEqual({status: "expired"});
  });

  it("answers expired for a request that does not exist", async () => {
    await expect(claim({requestId: "nope", secret: "x"})).resolves.toEqual({status: "expired"});
  });

  it("issues nothing for an account deleted since it approved", async () => {
    const uid = await account();
    const {requestId, secret, code} = await start();
    await approve({requestId, code}, uid, EMAIL);
    await admin.auth().deleteUser(uid);
    await expect(claim({requestId, secret})).resolves.toEqual({status: "expired"});
  });
});
