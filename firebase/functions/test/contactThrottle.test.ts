// functions/test/contactThrottle.test.ts
//
// T099 (SEC-006): the contact form's budgets. They lived in one process's
// memory, keyed for a signed-out caller by the reply-to address the caller
// typed, so a new address -- or a new function instance -- reset them. Now
// they are Firestore documents: by account, or signed out by network address
// and against a ceiling every signed-out caller shares. Mail is stubbed.
import {getFirestore} from "firebase-admin/firestore";
import {clearProject, expectHttpsError, useEmulatorProject} from "./emulator";
import {
  ANONYMOUS_LIMIT,
  CONTACT_THROTTLE,
  PER_ACCOUNT_LIMIT,
  PER_ADDRESS_LIMIT,
  THROTTLE_WINDOW_MS,
  budgetsFor,
  callerAddress,
  sweepContactThrottle,
  takeSend,
} from "../src/contactThrottle";

const mockSendMail = jest.fn();
jest.mock("nodemailer", () => ({
  __esModule: true,
  default: {
    createTransport: () => ({
      sendMail: (...args: unknown[]) => mockSendMail(...args),
    }),
  },
}));

import {sendContactEmail} from "../src/contact";

const PROJECT = "demo-contact-throttle";
useEmulatorProject(PROJECT);

const form = (email = "frodo@example.com") => ({
  name: "Frodo",
  email,
  category: "other",
  message: "Hello from the Shire.",
});

/**
 * Calls the function as Google's front end would hand it over: the caller's
 * own `X-Forwarded-For` (if any), then the address the front end saw.
 *
 * @param {object} data The form
 * @param {object} from Who calls: a uid, or the address and any forged prefix
 * @return {Promise<unknown>} What the handler returned
 */
const send = (
  data: object,
  from: {uid?: string; address?: string; forged?: string} = {}
) => {
  const chain = [from.forged, from.address ?? "203.0.113.1"].filter(Boolean).join(", ");
  return sendContactEmail.run({
    data,
    auth: from.uid ? {uid: from.uid, token: {uid: from.uid}} : undefined,
    rawRequest: {headers: {"x-forwarded-for": chain}, ip: from.forged ?? from.address},
    acceptsStreaming: false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

/** Sends `count` times, each with a fresh reply-to address. */
const sendTimes = async (count: number, from: Parameters<typeof send>[1]) => {
  for (let i = 0; i < count; i++) {
    await send(form(`invented-${i}@example.com`), from);
  }
};

const budgetDoc = async (id: string) =>
  (await getFirestore().collection(CONTACT_THROTTLE).doc(id).get()).data();

beforeEach(async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  mockSendMail.mockReset().mockResolvedValue({});
  await clearProject(PROJECT);
});

afterEach(() => jest.restoreAllMocks());

describe("a signed-out caller", () => {
  it("control: may send up to the address's limit", async () => {
    await sendTimes(PER_ADDRESS_LIMIT, {});

    expect(mockSendMail).toHaveBeenCalledTimes(PER_ADDRESS_LIMIT);
  });

  // SEC-006's reproduction: five sends, then ten more with ten invented
  // reply-to addresses, all of which used to go through.
  it("cannot reset its budget by typing another reply-to address", async () => {
    await sendTimes(PER_ADDRESS_LIMIT, {});

    await expectHttpsError(send(form("someone-new@example.com"), {}), "resource-exhausted");
    expect(mockSendMail).toHaveBeenCalledTimes(PER_ADDRESS_LIMIT);
  });

  it("cannot reset it by forging X-Forwarded-For either", async () => {
    await sendTimes(PER_ADDRESS_LIMIT, {forged: "198.51.100.1"});

    await expectHttpsError(send(form(), {forged: "198.51.100.2"}), "resource-exhausted");
  });

  it("shares a ceiling with every other signed-out caller, however many addresses they use", async () => {
    for (let i = 0; i < ANONYMOUS_LIMIT; i++) {
      await send(form(), {address: `192.0.2.${i}`});
    }

    await expectHttpsError(send(form(), {address: "192.0.2.250"}), "resource-exhausted");
    expect(mockSendMail).toHaveBeenCalledTimes(ANONYMOUS_LIMIT);
  });

  it("stores its address only as a hash", async () => {
    await send(form(), {address: "203.0.113.7"});

    const ids = (await getFirestore().collection(CONTACT_THROTTLE).listDocuments()).map((ref) => ref.id);
    expect(ids.join(" ")).not.toContain("203.0.113.7");
    expect(ids).toContain("anonymous");
  });

  it("takes nothing from the shared ceiling when its own budget refuses", async () => {
    await sendTimes(PER_ADDRESS_LIMIT, {});
    await expectHttpsError(send(form(), {}), "resource-exhausted");

    expect((await budgetDoc("anonymous"))?.sent).toHaveLength(PER_ADDRESS_LIMIT);
  });
});

describe("a signed-in caller", () => {
  it("may send up to the account's limit, then is refused", async () => {
    await sendTimes(PER_ACCOUNT_LIMIT, {uid: "frodo"});

    await expectHttpsError(send(form(), {uid: "frodo"}), "resource-exhausted");
    expect(mockSendMail).toHaveBeenCalledTimes(PER_ACCOUNT_LIMIT);
  });

  it("is not held back by signed-out callers using up their ceiling", async () => {
    for (let i = 0; i < ANONYMOUS_LIMIT; i++) {
      await send(form(), {address: `192.0.2.${i}`});
    }

    await send(form(), {uid: "frodo"});
    expect(mockSendMail).toHaveBeenCalledTimes(ANONYMOUS_LIMIT + 1);
  });
});

describe("the budgets themselves", () => {
  // The in-memory throttle was reset by a new instance. This one's state is
  // nowhere but Firestore: remove the document and the budget is fresh.
  it("live in Firestore, not in the process", async () => {
    await sendTimes(PER_ACCOUNT_LIMIT, {uid: "sam"});
    expect((await budgetDoc("account_sam"))?.sent).toHaveLength(PER_ACCOUNT_LIMIT);

    await getFirestore().collection(CONTACT_THROTTLE).doc("account_sam").delete();
    await send(form(), {uid: "sam"});
    expect(mockSendMail).toHaveBeenCalledTimes(PER_ACCOUNT_LIMIT + 1);
  });

  it("free a send an hour after it was made", async () => {
    const budgets = budgetsFor("merry", "unused");
    const start = new Date("2026-10-05T12:00:00Z");
    for (let i = 0; i < PER_ACCOUNT_LIMIT; i++) {
      expect(await takeSend(budgets, start)).toBe(true);
    }

    expect(await takeSend(budgets, new Date(start.getTime() + THROTTLE_WINDOW_MS - 1000))).toBe(false);
    expect(await takeSend(budgets, new Date(start.getTime() + THROTTLE_WINDOW_MS + 1000))).toBe(true);
  });

  it("let two calls at once take the last send only once", async () => {
    const budgets = budgetsFor("pippin", "unused");

    const results = await Promise.all(
      Array.from({length: PER_ACCOUNT_LIMIT * 2}, () => takeSend(budgets))
    );

    expect(results.filter(Boolean)).toHaveLength(PER_ACCOUNT_LIMIT);
  });

  it("carry the expiry the daily sweep deletes them by", async () => {
    const now = new Date("2026-10-05T12:00:00Z");
    await takeSend(budgetsFor("sam", "unused"), now);

    const doc = await budgetDoc("account_sam");
    expect(doc?.expiresAt.toMillis()).toBe(now.getTime() + THROTTLE_WINDOW_MS);
  });
});

describe("callerAddress", () => {
  it("takes the address Google's front end appended, not the caller's own prefix", () => {
    expect(callerAddress({headers: {"x-forwarded-for": "198.51.100.1, 203.0.113.9"}})).toBe("203.0.113.9");
  });

  it("falls back to the socket's address, then to one shared value", () => {
    expect(callerAddress({headers: {}, ip: "203.0.113.4"})).toBe("203.0.113.4");
    expect(callerAddress(undefined)).toBe("unknown");
  });
});

describe("the daily sweep", () => {
  const start = new Date("2026-10-05T12:00:00Z");
  const later = (ms: number) => new Date(start.getTime() + ms);

  it("deletes a budget whose last send has left the window", async () => {
    await takeSend(budgetsFor(undefined, "203.0.113.7"), start);

    const result = await sweepContactThrottle(later(THROTTLE_WINDOW_MS + 1));

    expect(result).toEqual({deleted: 2, more: false});
    expect(await getFirestore().collection(CONTACT_THROTTLE).listDocuments()).toHaveLength(0);
  });

  it("keeps a budget still in its window", async () => {
    await takeSend(budgetsFor("sam", "unused"), start);
    await takeSend(budgetsFor("sam", "unused"), later(THROTTLE_WINDOW_MS / 2));

    const result = await sweepContactThrottle(later(THROTTLE_WINDOW_MS + 1));

    expect(result.deleted).toBe(0);
    expect((await budgetDoc("account_sam"))?.sent).toHaveLength(2);
  });
});
