// functions/test/deviceSignIn.test.ts
import {getAuth} from "firebase-admin/auth";
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
  code?: string;
}

const start = (email: string = EMAIL) =>
  call(startDeviceSignIn, {email}) as Promise<Started>;
const approve = (data: object, uid?: string, email?: string) =>
  call(approveDeviceSignIn, data, uid, email) as Promise<{code: string}>;
const lookUp = (data: object) =>
  call(lookUpDeviceSignIn, data) as Promise<{email: string}>;
const claim = (data: object) =>
  call(claimDeviceSignIn, data) as Promise<{status: string; token?: string}>;

/** A real account, as the approving device would be signed in as. */
async function account(email: string = EMAIL): Promise<string> {
  const user = await getAuth().createUser({email});
  return user.uid;
}

/** A code that is certainly not `code`. */
const wrong = (code: string) => (code === "000000" ? "111111" : "000000");

/** Open a request and approve it as its owner, as the phone would. */
async function approved(): Promise<Started & {code: string; uid: string}> {
  const uid = await account();
  const started = await start();
  const {code} = await approve({requestId: started.requestId}, uid, EMAIL);
  return {...started, code, uid};
}

const requestDoc = (id: string) => db.collection(DEVICE_SIGN_INS).doc(id).get();

beforeEach(() => clearProject(PROJECT));

describe("startDeviceSignIn", () => {
  it("opens a pending request for the normalised address", async () => {
    const started = await start("  Frodo@Shire.dev ");
    const stored = (await requestDoc(started.requestId)).data();
    expect(stored?.email).toBe(EMAIL);
    expect(stored?.status).toBe("pending");
  });

  // Whoever opens a request may not be the address's owner, so the code must
  // not exist until the link is used.
  it("makes no code yet, and returns none", async () => {
    const started = await start();
    expect(started.code).toBeUndefined();
    expect((await requestDoc(started.requestId)).data()?.code).toBeUndefined();
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
    await approved();
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
  it("approves a request for the caller's own address, and returns a 6-digit code", async () => {
    const uid = await account();
    const {requestId} = await start();
    const {code} = await approve({requestId}, uid, EMAIL);
    expect(code).toMatch(/^\d{6}$/);
    const stored = (await requestDoc(requestId)).data();
    expect(stored?.status).toBe("approved");
    expect(stored?.uid).toBe(uid);
    expect(stored?.code).toBe(code);
  });

  it("matches the address regardless of case", async () => {
    const uid = await account();
    const {requestId} = await start();
    await expect(approve({requestId}, uid, "FRODO@shire.dev")).resolves.toHaveProperty("code");
  });

  // A page that asks twice (a re-render) must not strand the first answer.
  it("gives the same code when its approver asks again", async () => {
    const {requestId, code, uid} = await approved();
    await expect(approve({requestId}, uid, EMAIL)).resolves.toEqual({code});
  });

  // The device that opened the request knows its id: the id alone must never
  // be enough to read the code.
  it("refuses an anonymous caller, and makes no code", async () => {
    const {requestId} = await start();
    await expectHttpsError(approve({requestId}), "unauthenticated");
    expect((await requestDoc(requestId)).data()?.code).toBeUndefined();
  });

  it("refuses an account with another address, and makes no code", async () => {
    const uid = await account("sauron@mordor.dev");
    const {requestId} = await start();
    await expectHttpsError(approve({requestId}, uid, "sauron@mordor.dev"), "permission-denied");
    const stored = (await requestDoc(requestId)).data();
    expect(stored?.status).toBe("pending");
    expect(stored?.code).toBeUndefined();
  });

  it("does not tell another account the code of an approved request", async () => {
    const {requestId} = await approved();
    const other = await account("sauron@mordor.dev");
    await expectHttpsError(approve({requestId}, other, "sauron@mordor.dev"), "permission-denied");
  });

  it("refuses an expired request", async () => {
    const uid = await account();
    const {requestId} = await start();
    await db.collection(DEVICE_SIGN_INS).doc(requestId).update({
      expiresAt: Timestamp.fromMillis(Date.now() - 1000),
    });
    await expectHttpsError(approve({requestId}, uid, EMAIL), "failed-precondition");
  });

  it("refuses a request that does not exist", async () => {
    const uid = await account();
    await expectHttpsError(approve({requestId: "nope"}, uid, EMAIL), "failed-precondition");
  });

  it("refuses a request already signed in with", async () => {
    const {requestId, secret, code, uid} = await approved();
    await claim({requestId, secret, code});
    await expectHttpsError(approve({requestId}, uid, EMAIL), "failed-precondition");
  });

  it("refuses a missing id", async () => {
    const uid = await account();
    await expectHttpsError(approve({}, uid, EMAIL), "invalid-argument");
  });
});

describe("lookUpDeviceSignIn", () => {
  // Anonymous: the approving device is signed in nowhere yet.
  it("answers the address a pending request was opened for, normalised", async () => {
    const {requestId} = await start("  Frodo@Shire.dev ");
    await expect(lookUp({requestId})).resolves.toEqual({email: EMAIL});
  });

  it("gives away nothing else about the request", async () => {
    const {requestId, secret} = await start();
    const answer = JSON.stringify(await lookUp({requestId}));
    expect(answer).not.toContain(secret);
    expect(Object.keys(JSON.parse(answer))).toEqual(["email"]);
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
    const {requestId} = await approved();
    await expectHttpsError(lookUp({requestId}), "failed-precondition");
  });

  it("refuses a missing id", async () => {
    await expectHttpsError(lookUp({}), "invalid-argument");
  });
});

describe("claimDeviceSignIn", () => {
  it("answers pending until the link has been opened, whatever the code", async () => {
    const {requestId, secret} = await start();
    await expect(claim({requestId, secret, code: "123456"})).resolves.toEqual({status: "pending"});
    expect((await requestDoc(requestId)).data()?.attempts).toBe(0);
  });

  it("hands over a sign-in token for the approved account with the right code, once", async () => {
    const {requestId, secret, code, uid} = await approved();

    const claimed = await claim({requestId, secret, code});
    expect(claimed.status).toBe("approved");
    // The emulator's custom tokens are unsigned JWTs; the uid is in the payload.
    const payload = JSON.parse(Buffer.from(String(claimed.token).split(".")[1], "base64url").toString());
    expect(payload.uid).toBe(uid);

    await expect(claim({requestId, secret, code})).resolves.toEqual({status: "expired"});
    expect((await requestDoc(requestId)).data()?.status).toBe("claimed");
  });

  it("ignores spaces around the code", async () => {
    const {requestId, secret, code} = await approved();
    expect((await claim({requestId, secret, code: ` ${code} `})).status).toBe("approved");
  });

  it("refuses the wrong secret, even with the right code, and leaves the request collectable", async () => {
    const {requestId, secret, code} = await approved();
    await expectHttpsError(claim({requestId, secret: "stolen", code}), "permission-denied");
    expect((await requestDoc(requestId)).data()?.attempts).toBe(0);
    expect((await claim({requestId, secret, code})).status).toBe("approved");
  });

  it("counts a wrong code and says how many tries are left", async () => {
    const {requestId, secret, code} = await approved();
    const error = await expectHttpsError(claim({requestId, secret, code: wrong(code)}), "invalid-argument");
    expect(error.message).toContain(`${MAX_CODE_ATTEMPTS - 1} tries left`);
    const stored = (await requestDoc(requestId)).data();
    expect(stored?.attempts).toBe(1);
    expect(stored?.status).toBe("approved");
  });

  it(`closes the request after ${MAX_CODE_ATTEMPTS} wrong codes -- even the right one fails after`, async () => {
    const {requestId, secret, code} = await approved();
    for (let i = 1; i < MAX_CODE_ATTEMPTS; i++) {
      await expectHttpsError(claim({requestId, secret, code: wrong(code)}), "invalid-argument");
    }
    await expectHttpsError(claim({requestId, secret, code: wrong(code)}), "failed-precondition");
    expect((await requestDoc(requestId)).data()?.status).toBe("spent");
    await expect(claim({requestId, secret, code})).resolves.toEqual({status: "expired"});
  });

  it("refuses a missing code", async () => {
    const {requestId, secret} = await approved();
    await expectHttpsError(claim({requestId, secret}), "invalid-argument");
    await expectHttpsError(claim({requestId, secret, code: " "}), "invalid-argument");
  });

  it("answers expired for an expired approved request", async () => {
    const {requestId, secret, code} = await approved();
    await db.collection(DEVICE_SIGN_INS).doc(requestId).update({
      expiresAt: Timestamp.fromMillis(Date.now() - 1000),
    });
    await expect(claim({requestId, secret, code})).resolves.toEqual({status: "expired"});
  });

  it("answers expired for a request that does not exist", async () => {
    await expect(claim({requestId: "nope", secret: "x", code: "123456"})).resolves.toEqual({status: "expired"});
  });

  it("issues nothing for an account deleted since it approved", async () => {
    const {requestId, secret, code, uid} = await approved();
    await getAuth().deleteUser(uid);
    await expect(claim({requestId, secret, code})).resolves.toEqual({status: "expired"});
  });
});
