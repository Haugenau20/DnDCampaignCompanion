// functions/test/appCheck.test.ts
//
// T126: the callables a stranger can reach on the way in -- reserving a
// sign-up, joining a group, starting one -- refuse a call that carries no App
// Check token, so the public API key alone cannot drive them from a script.
// The dev app attaches no App Check against the emulators (bug #1411), so
// inside the emulator they take the call.
//
// `fn.run`, which every other suite uses, skips the SDK's request checks; this
// one calls the HTTP handler the way a client's request reaches it.
import type {Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {useEmulatorProject} from "./emulator";

useEmulatorProject("demo-app-check");

const CALLABLES = [
  ["createGroup", "../src/groupManagement/createGroup"],
  ["reserveSignUp", "../src/signUp/reserveSignUp"],
  ["redeemInvitation", "../src/groupManagement/redeemInvitation"],
] as const;

type Handler = (req: Request, res: Response) => unknown;

/**
 * The SDK's own refusal of a request without the token it requires. The
 * handlers' "you must be signed in" is also UNAUTHENTICATED, in words of its own.
 */
const SDK_REFUSAL = "Unauthenticated";

/** What the handler answered to a callable request with an empty payload and no tokens. */
function invoke(handler: Handler): Promise<{status: number; body: {error?: {status: string; message: string}}}> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = {"content-type": "application/json"};
    const req = {
      method: "POST",
      headers,
      header: (name: string) => headers[name.toLowerCase()],
      get: (name: string) => headers[name.toLowerCase()],
      body: {data: {}},
      url: "/",
      on: () => undefined,
    };
    const res = {
      statusCode: 200,
      headers: {} as Record<string, unknown>,
      setHeader(key: string, value: unknown) {
        this.headers[key] = value;
      },
      getHeader(key: string) {
        return this.headers[key];
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send(body: never) {
        resolve({status: this.statusCode, body});
      },
      json(body: never) {
        resolve({status: this.statusCode, body});
      },
      end(body: never) {
        resolve({status: this.statusCode, body});
      },
      on: () => undefined,
    };
    handler(req as unknown as Request, res as unknown as Response);
  });
}

/** The callable `name` from `path`, loaded fresh under `FUNCTIONS_EMULATOR` as given. */
function load(name: string, path: string, emulator: boolean): Handler {
  const before = process.env.FUNCTIONS_EMULATOR;
  if (emulator) process.env.FUNCTIONS_EMULATOR = "true";
  else delete process.env.FUNCTIONS_EMULATOR;
  let handler: Handler | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    handler = require(path)[name];
  });
  if (before === undefined) delete process.env.FUNCTIONS_EMULATOR;
  else process.env.FUNCTIONS_EMULATOR = before;
  return handler as Handler;
}

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe.each(CALLABLES)("%s", (name, path) => {
  it("refuses a call without an App Check token, before it reads anything", async () => {
    const answer = await invoke(load(name, path, false));

    expect(answer.status).toBe(401);
    expect(answer.body.error?.message).toBe(SDK_REFUSAL);
  });

  it("takes the call inside the emulator, where the dev app attaches no App Check", async () => {
    const answer = await invoke(load(name, path, true));

    // Past the SDK's checks, the handler refuses the unsigned, empty call
    // itself, in its own words.
    expect(answer.body.error?.message).toBeDefined();
    expect(answer.body.error?.message).not.toBe(SDK_REFUSAL);
  });
});
