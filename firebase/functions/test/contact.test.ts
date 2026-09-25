// functions/test/contact.test.ts
//
// T020: `sendContactEmail` attaches a bug-report screenshot the caller uploaded
// to `support/{uid}/`, then deletes it -- and refuses any path that is not
// the caller's own. Mail is stubbed; the screenshot is real, in the Storage
// emulator.
import {call, clearProject, expectHttpsError, useEmulatorProject} from "./emulator";
import {imageBucket} from "../src/shared/imageBucket";

const mockSendMail = jest.fn();
jest.mock("nodemailer", () => ({
  __esModule: true,
  default: {
    createTransport: () => ({
      sendMail: (...args: unknown[]) => mockSendMail(...args),
    }),
  },
}));

// Imported after the mock, which jest hoists above every import anyway.
import {sendContactEmail} from "../src/contact";

const PROJECT = "demo-contact-screenshot";
useEmulatorProject(PROJECT);

const NAME = "0f8fad5b-d9cb-469f-a165-70867728950e.webp";
const BYTES = Buffer.from("not really a webp, but the function never decodes it");

/**
 * A caller of its own per test: the function rate-limits by uid in memory,
 * five an hour, and every test here shares one module instance.
 */
let caller = 0;
let uid: string;

const form = (extra: object = {}) => ({
  name: "Frodo",
  email: "frodo@example.com",
  category: "broken",
  message: "Deleting a note takes me back to the list.",
  ...extra,
});

const exists = async (path: string) => (await imageBucket().file(path).exists())[0];

/**
 * Put a file in the bucket as if it had been uploaded, bypassing the rules.
 *
 * @param {string} path The object path
 * @param {string} contentType The object's type
 * @return {Promise<string>} The path
 */
const upload = async (path: string, contentType = "image/webp") => {
  await imageBucket().file(path).save(BYTES, {contentType});
  return path;
};

/** @return {object} The one email the function tried to send */
const sentMail = () => {
  expect(mockSendMail).toHaveBeenCalledTimes(1);
  return mockSendMail.mock.calls[0][0];
};

beforeEach(async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  mockSendMail.mockReset().mockResolvedValue({});
  uid = `frodo-${++caller}`;
  await clearProject(PROJECT);
  await imageBucket().deleteFiles();
});

afterEach(() => jest.restoreAllMocks());

describe("sending without a screenshot", () => {
  it("control: sends the email with no attachment, as before", async () => {
    await call(sendContactEmail, form(), uid);

    expect(sentMail().attachments ?? []).toHaveLength(0);
    expect(sentMail().text).not.toMatch(/Screenshot/);
  });

  it("still works for a signed-out sender", async () => {
    await call(sendContactEmail, form());

    expect(sentMail().attachments ?? []).toHaveLength(0);
  });
});

describe("sending with a screenshot", () => {
  it("attaches the caller's screenshot, named after the reference", async () => {
    const path = await upload(`support/${uid}/${NAME}`);

    const result = await call(sendContactEmail, form({screenshotPath: path}), uid) as {reference: string};

    const [attachment] = sentMail().attachments;
    expect(attachment.filename).toBe(`screenshot-${result.reference}.webp`);
    expect(attachment.contentType).toBe("image/webp");
    expect(Buffer.compare(attachment.content, BYTES)).toBe(0);
    expect(sentMail().text).toMatch(`Screenshot: attached (screenshot-${result.reference}.webp)`);
  });

  it("names a JPEG .jpg", async () => {
    const path = await upload(`support/${uid}/${NAME.replace(".webp", ".jpg")}`, "image/jpeg");

    await call(sendContactEmail, form({screenshotPath: path}), uid);

    expect(sentMail().attachments[0].filename).toMatch(/\.jpg$/);
  });

  it("deletes the screenshot once the email has gone", async () => {
    const path = await upload(`support/${uid}/${NAME}`);

    await call(sendContactEmail, form({screenshotPath: path}), uid);

    expect(await exists(path)).toBe(false);
  });

  it("keeps the screenshot when the email fails, so the sender can try again", async () => {
    const path = await upload(`support/${uid}/${NAME}`);
    mockSendMail.mockRejectedValue(new Error("smtp down"));

    await expectHttpsError(call(sendContactEmail, form({screenshotPath: path}), uid), "internal");

    expect(await exists(path)).toBe(true);
  });

  it("says so when the screenshot is gone, and sends nothing", async () => {
    await expectHttpsError(
      call(sendContactEmail, form({screenshotPath: `support/${uid}/${NAME}`}), uid),
      "not-found"
    );

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("refuses a file that is not a WebP or JPEG, even in the caller's folder", async () => {
    const path = await upload(`support/${uid}/${NAME}`, "image/svg+xml");

    await expectHttpsError(call(sendContactEmail, form({screenshotPath: path}), uid), "invalid-argument");

    expect(mockSendMail).not.toHaveBeenCalled();
  });
});

describe("paths that are not the caller's to attach", () => {
  it("refuses a signed-out sender", async () => {
    const path = await upload(`support/${uid}/${NAME}`);

    await expectHttpsError(call(sendContactEmail, form({screenshotPath: path})), "unauthenticated");

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("refuses someone else's screenshot, and leaves it where it is", async () => {
    const theirs = await upload(`support/sam/${NAME}`);

    await expectHttpsError(call(sendContactEmail, form({screenshotPath: theirs}), uid), "permission-denied");

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(await exists(theirs)).toBe(true);
  });

  it("refuses a path outside the support folders", async () => {
    const crest = await upload(`groups/g1/crest/${NAME}`);

    await expectHttpsError(call(sendContactEmail, form({screenshotPath: crest}), uid), "permission-denied");

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(await exists(crest)).toBe(true);
  });

  it("refuses a path that climbs out of the caller's folder", async () => {
    const theirs = await upload(`support/sam/${NAME}`);

    await expectHttpsError(
      call(sendContactEmail, form({screenshotPath: `support/${uid}/../sam/${NAME}`}), uid),
      "invalid-argument"
    );

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(await exists(theirs)).toBe(true);
  });

  it("refuses a name the app would not choose", async () => {
    const path = await upload(`support/${uid}/screenshot.webp`);

    await expectHttpsError(call(sendContactEmail, form({screenshotPath: path}), uid), "invalid-argument");

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("refuses a path that is not a string", async () => {
    await expectHttpsError(call(sendContactEmail, form({screenshotPath: {path: "x"}}), uid), "invalid-argument");

    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
