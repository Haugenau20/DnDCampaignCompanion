// functions/test/extractEntities.test.ts
//
// T019: smart detection must not suggest the party -- a member's username or
// any of their characters -- as NPCs.
// OpenAI is replaced with a stub that records the prompt and returns what the
// test tells it to; everything else -- the roster read, the membership check,
// usage counting -- runs against the emulator.
import {call, clearProject, expectHttpsError, useEmulatorProject} from "./emulator";

const mockCreate = jest.fn();
jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({chat: {completions: {create: mockCreate}}})),
}));

// eslint-disable-next-line import/first
import {extractEntities, getUsageStatus} from "../src/entityExtraction";

const PROJECT = "demo-extract-entities";
const db = useEmulatorProject(PROJECT);
const GROUP = "g1";
const CONTENT = "Aragorn and Legolas met Barliman Butterbur at the Prancing Pony.";

const npc = (name: string) => ({
  type: "npc", text: name, confidence: 0.9, name, title: null, race: null,
  occupation: null, location: null, relationship: null, description: null, context: "",
});

/** The model's answer: a tool call carrying `entities`. */
function modelReturns(entities: object[]) {
  mockCreate.mockResolvedValueOnce({
    choices: [{message: {
      refusal: null,
      tool_calls: [{type: "function", function: {
        name: "extract_entities",
        arguments: JSON.stringify({entities}),
      }}],
    }}],
  });
}

const systemPrompt = (): string => mockCreate.mock.calls[0][0].messages[0].content;
const extract = (data: object, uid?: string) =>
  call(extractEntities, data, uid) as Promise<{entities: {name?: string}[]}>;

async function seedGroup() {
  await db.doc(`groups/${GROUP}`).set({name: "Fellowship"});
  await db.doc(`groups/${GROUP}/users/frodo`).set({
    userId: "frodo", username: "frodo", role: "member",
    characters: [{id: "c1", name: "Aragorn"}, {id: "c2", name: " Legolas "}],
  });
  await db.doc(`groups/${GROUP}/users/sam`).set({
    userId: "sam", username: "sam", role: "member",
    characters: [{id: "c3", name: "Aragorn"}, {id: "c4", name: ""}],
  });
  await db.doc(`groups/${GROUP}/users/pippin`).set({userId: "pippin", username: "pippin", role: "member"});
}

beforeAll(() => {
  process.env.OPENAI_API_KEY = "test-key";
});

beforeEach(async () => {
  await clearProject(PROJECT);
  mockCreate.mockReset();
  await seedGroup();
});

describe("extractEntities and the party's own characters", () => {
  it("names every character in the group to the model, once each", async () => {
    modelReturns([]);
    await extract({content: CONTENT, groupId: GROUP}, "frodo");

    const prompt = systemPrompt();
    expect(prompt).toContain("\"Aragorn\"");
    expect(prompt).toContain("\"Legolas\"");
    expect(prompt.match(/"Aragorn"/g)).toHaveLength(1);
    expect(prompt).not.toContain("\"\"");
  });

  it("names the members by the username they signed up with, too", async () => {
    modelReturns([]);
    await extract({content: CONTENT, groupId: GROUP}, "frodo");

    const prompt = systemPrompt();
    for (const username of ["frodo", "sam", "pippin"]) {
      expect(prompt).toContain(JSON.stringify(username));
    }
  });

  it("drops a member's username the model returned as an NPC", async () => {
    modelReturns([npc("Pippin"), npc("Barliman Butterbur")]);
    const result = await extract({content: CONTENT, groupId: GROUP}, "frodo");

    expect(result.entities.map((e) => e.name)).toEqual(["Barliman Butterbur"]);
  });

  it("drops a party character the model returned anyway, and keeps the real NPC", async () => {
    modelReturns([npc("Aragorn"), npc("legolas"), npc("Barliman Butterbur")]);
    const result = await extract({content: CONTENT, groupId: GROUP}, "frodo");

    expect(result.entities.map((e) => e.name)).toEqual(["Barliman Butterbur"]);
  });

  it("drops only NPCs -- a location that shares a name is not a character", async () => {
    modelReturns([{type: "location", name: "Aragorn", text: "", confidence: 1, context: ""}]);
    const result = await extract({content: CONTENT, groupId: GROUP}, "frodo");

    expect(result.entities).toHaveLength(1);
  });

  it("excludes nobody when the caller sends no group, as an older client does", async () => {
    modelReturns([npc("Aragorn")]);
    const result = await extract({content: CONTENT}, "frodo");

    expect(result.entities.map((e) => e.name)).toEqual(["Aragorn"]);
    expect(systemPrompt()).not.toContain("They are the party");
  });

  it("refuses a caller outside the group, before calling the model or counting usage", async () => {
    await expectHttpsError(extract({content: CONTENT, groupId: GROUP}, "sauron"), "permission-denied");

    expect(mockCreate).not.toHaveBeenCalled();
    expect((await db.doc("users/sauron").get()).exists).toBe(false);
  });

  it("refuses a group id that is not a string", async () => {
    await expectHttpsError(extract({content: CONTENT, groupId: 42}, "frodo"), "invalid-argument");
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// T087: the allowance is reserved atomically, and a status read writes nothing.
describe("the usage allowance", () => {
  /** A usage record with `used` of each period spent, reset today. */
  const usage = (used: number, lastReset = new Date().toISOString()) => ({
    daily: {count: used, lastReset, limit: 10},
    weekly: {count: used, lastReset, limit: 30},
    monthly: {count: used, lastReset, limit: 100},
  });
  const storedUsage = async () =>
    (await db.doc("users/frodo").get()).get("entityExtractionUsage");

  it("admits exactly one of several calls racing for the last slot (SEC-003)", async () => {
    await db.doc("users/frodo").set({entityExtractionUsage: usage(9)});
    mockCreate.mockResolvedValue({
      choices: [{message: {refusal: null, tool_calls: [{type: "function", function: {
        name: "extract_entities", arguments: JSON.stringify({entities: []}),
      }}]}}],
    });

    const outcomes = await Promise.allSettled(
      Array.from({length: 4}, () => extract({content: CONTENT, groupId: GROUP}, "frodo"))
    );

    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    for (const o of outcomes.filter((o) => o.status === "rejected")) {
      expect((o as PromiseRejectedResult).reason.code).toBe("resource-exhausted");
    }
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const stored = await storedUsage();
    expect(stored.daily.count).toBe(10);
    expect(stored.weekly.count).toBe(10);
    expect(stored.monthly.count).toBe(10);
  });

  it("counts every admitted call when several race with room to spare", async () => {
    await db.doc("users/frodo").set({entityExtractionUsage: usage(2)});
    mockCreate.mockResolvedValue({
      choices: [{message: {refusal: null, tool_calls: [{type: "function", function: {
        name: "extract_entities", arguments: JSON.stringify({entities: []}),
      }}]}}],
    });

    await Promise.all(
      Array.from({length: 4}, () => extract({content: CONTENT, groupId: GROUP}, "frodo"))
    );

    expect((await storedUsage()).daily.count).toBe(6);
  });

  it("reports a period that has rolled over as reset, without writing it back", async () => {
    const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const before = usage(10, yesterday);
    await db.doc("users/frodo").set({entityExtractionUsage: before});

    const result = await call(getUsageStatus, {}, "frodo") as {
      usage: {limitExceeded: boolean; usage: {daily: {count: number}}};
    };

    expect(result.usage.limitExceeded).toBe(false);
    expect(result.usage.usage.daily.count).toBe(0);
    // A status read that wrote its copy back could overwrite a reservation
    // made in between; the next reservation does the reset instead.
    expect(await storedUsage()).toEqual(before);
  });

  it("resets a rolled-over period when it reserves", async () => {
    const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    await db.doc("users/frodo").set({entityExtractionUsage: usage(10, yesterday)});
    modelReturns([]);

    await extract({content: CONTENT, groupId: GROUP}, "frodo");

    expect((await storedUsage()).daily.count).toBe(1);
  });
});

// T087 (AI-002): confidence is a fraction, and the server holds the model to it.
describe("the confidence the model reports", () => {
  it("passes a confidence from 0 to 1 through", async () => {
    modelReturns([{...npc("Butterbur"), confidence: 0}, {...npc("Bill Ferny"), confidence: 1}]);
    const result = await extract({content: CONTENT, groupId: GROUP}, "frodo");

    expect(result.entities.map((e) => e.name)).toEqual(["Butterbur", "Bill Ferny"]);
  });

  it("drops a detection whose confidence is not a fraction, rather than guess what it meant", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    modelReturns([
      {...npc("Butterbur"), confidence: 90},
      {...npc("Bill Ferny"), confidence: -0.4},
      {...npc("Nob"), confidence: 0.7},
    ]);
    const result = await extract({content: CONTENT, groupId: GROUP}, "frodo");

    expect(result.entities.map((e) => e.name)).toEqual(["Nob"]);
  });

  it("tells the model the scale", async () => {
    modelReturns([]);
    await extract({content: CONTENT, groupId: GROUP}, "frodo");

    const tool = mockCreate.mock.calls[0][0].tools[0];
    const variants = tool.function.parameters.properties.entities.items.anyOf;
    for (const variant of variants) {
      expect(variant.properties.confidence.description).toMatch(/0 to 1/);
    }
  });
});
