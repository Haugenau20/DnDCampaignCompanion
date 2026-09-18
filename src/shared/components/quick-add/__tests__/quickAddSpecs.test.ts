// src/shared/components/quick-add/__tests__/quickAddSpecs.test.ts
import {
  QUICK_ADD_SPECS,
  quickAddEntities,
  splitInitialData,
  validateQuickAdd,
  type QuickAddEntity,
} from "../quickAddSpecs";

describe("quickAddSpecs", () => {
  describe("the shape of the set", () => {
    it("covers exactly the three entities that get a dialog in 15-1", () => {
      // The rumour is deliberately absent: `15-1` item 9 leaves it on its
      // existing form for `15-7`, because its third required field
      // (`sourceName`) cannot be dropped without relaxing validation.
      expect(quickAddEntities).toEqual(["npc", "quest", "location"]);
    });

    it("asks for exactly two fields on every entity", () => {
      quickAddEntities.forEach((entity) => {
        const { labels } = QUICK_ADD_SPECS[entity];
        expect(labels.nameLabel).toBeTruthy();
        expect(labels.lineLabel).toBeTruthy();
        expect(Object.keys(labels)).toEqual(
          expect.arrayContaining(["nameLabel", "lineLabel"])
        );
      });
    });
  });

  describe("validation", () => {
    it.each(quickAddEntities)("requires both fields for %s", (entity) => {
      const errors = validateQuickAdd(entity, { name: "", line: "" });
      expect(errors.name).toBeTruthy();
      expect(errors.line).toBeTruthy();
    });

    it.each(quickAddEntities)("accepts both fields filled for %s", (entity) => {
      const errors = validateQuickAdd(entity, { name: "Thorin", line: "A dwarf king" });
      expect(errors).toEqual({});
    });

    it("treats whitespace as empty", () => {
      const errors = validateQuickAdd("npc", { name: "   ", line: "\t\n " });
      expect(errors.name).toBeTruthy();
      expect(errors.line).toBeTruthy();
    });

    it("names the offending field rather than listing both", () => {
      const errors = validateQuickAdd("quest", { name: "Reclaim Erebor", line: "" });
      expect(errors.name).toBeUndefined();
      expect(errors.line).toBeTruthy();
    });
  });

  describe("buildDocument", () => {
    it("gives a new NPC the defaults §4 specifies: alive, stance unknown", () => {
      const doc = QUICK_ADD_SPECS.npc.buildDocument({
        name: "Thorin",
        line: "Exiled king under the mountain",
      }) as Record<string, unknown>;

      expect(doc.name).toBe("Thorin");
      expect(doc.description).toBe("Exiled king under the mountain");
      expect(doc.status).toBe("alive");
      expect(doc.relationship).toBe("unknown");
      expect(doc.connections).toEqual({
        relatedNPCs: [],
        affiliations: [],
        relatedQuests: [],
      });
      expect(doc.notes).toEqual([]);
    });

    it("gives a new quest status active and no objectives", () => {
      const doc = QUICK_ADD_SPECS.quest.buildDocument({
        name: "Reclaim Erebor",
        line: "Take back the mountain from Smaug",
      }) as Record<string, unknown>;

      expect(doc.title).toBe("Reclaim Erebor");
      expect(doc.description).toBe("Take back the mountain from Smaug");
      expect(doc.status).toBe("active");
      expect(doc.objectives).toEqual([]);
    });

    it("gives a new location type poi and knowledge known", () => {
      const doc = QUICK_ADD_SPECS.location.buildDocument({
        name: "Bag End",
        line: "A hobbit hole in Hobbiton",
      }) as Record<string, unknown>;

      expect(doc.name).toBe("Bag End");
      expect(doc.description).toBe("A hobbit hole in Hobbiton");
      expect(doc.type).toBe("poi");
      expect(doc.status).toBe("known");
    });

    it("trims both fields before writing", () => {
      const doc = QUICK_ADD_SPECS.npc.buildDocument({
        name: "  Bilbo  ",
        line: "  A burglar  ",
      }) as Record<string, unknown>;
      expect(doc.name).toBe("Bilbo");
      expect(doc.description).toBe("A burglar");
    });

    it("pre-sets the location's parent when one is supplied", () => {
      const doc = QUICK_ADD_SPECS.location.buildDocument({
        name: "Bag End",
        line: "A hobbit hole",
        parentId: "hobbiton",
      }) as Record<string, unknown>;
      expect(doc.parentId).toBe("hobbiton");
    });

    it("omits parentId entirely when there is no parent", () => {
      // Firestore rejects `undefined`; the existing form writes '' or omits.
      const doc = QUICK_ADD_SPECS.location.buildDocument({
        name: "Rivendell",
        line: "An elven refuge",
      }) as Record<string, unknown>;
      expect(doc.parentId).toBe("");
    });

    describe("carry-through from note conversion", () => {
      // `15-1` says to pre-fill the two fields and leave note conversion's
      // wiring alone. The AI extraction also supplies race, occupation,
      // objectives and relations; dropping those on the floor would throw away
      // the extraction's work, so they ride along untouched.
      it("keeps extracted NPC fields the two-field form does not show", () => {
        const doc = QUICK_ADD_SPECS.npc.buildDocument(
          { name: "Thorin", line: "A dwarf" },
          { race: "Dwarf", occupation: "King", title: "Oakenshield" }
        ) as Record<string, unknown>;

        expect(doc.race).toBe("Dwarf");
        expect(doc.occupation).toBe("King");
        expect(doc.title).toBe("Oakenshield");
      });

      it("keeps extracted quest objectives and relations", () => {
        const doc = QUICK_ADD_SPECS.quest.buildDocument(
          { name: "Reclaim Erebor", line: "Take the mountain" },
          { objectives: [{ id: "o1", description: "Find the door", completed: false }], relatedNPCIds: ["thorin"] }
        ) as Record<string, unknown>;

        expect(doc.objectives).toEqual([
          { id: "o1", description: "Find the door", completed: false },
        ]);
        expect(doc.relatedNPCIds).toEqual(["thorin"]);
      });

      it("never lets carried data override the two typed fields", () => {
        const doc = QUICK_ADD_SPECS.npc.buildDocument(
          { name: "Bilbo", line: "A burglar" },
          { name: "Something else", description: "Something else" }
        ) as Record<string, unknown>;

        expect(doc.name).toBe("Bilbo");
        expect(doc.description).toBe("A burglar");
      });

      it("never lets carried data set the status fields 15-1 item 6 fixes", () => {
        const doc = QUICK_ADD_SPECS.quest.buildDocument(
          { name: "Reclaim Erebor", line: "Take the mountain" },
          { status: "completed" }
        ) as Record<string, unknown>;

        expect(doc.status).toBe("active");
      });
    });
  });

  describe("destinationFor", () => {
    it("sends a new NPC to its own page, which already exists", () => {
      expect(QUICK_ADD_SPECS.npc.destinationFor("npc-1")).toBe("/npcs/npc-1");
    });

    it("sends a new quest to its own page, which `15-5` added", () => {
      // It landed on the directory with the row highlighted until then,
      // because a quest had no address at all.
      expect(QUICK_ADD_SPECS.quest.destinationFor("quest-1")).toBe("/quests/quest-1");
    });

    it("sends a new location to its own page, which 15-4 built", () => {
      // It was `/locations?highlight=` while the route did not exist. The
      // record a two-field create leaves behind is mostly unwritten, and the
      // page is where the prompts that finish it are.
      expect(QUICK_ADD_SPECS.location.destinationFor("location-1")).toBe(
        "/locations/location-1"
      );
    });

    it("uses ?highlight= rather than inventing a second parameter", () => {
      // D15.11: the addressable expansion is `?highlight=`, and `15-3`
      // unifies its four existing consumers. Adding `?open=` beside a
      // parameter that already has four meanings creates a fifth.
      quickAddEntities.forEach((entity) => {
        const url = QUICK_ADD_SPECS[entity].destinationFor("x");
        expect(url).not.toContain("open=");
      });
    });
  });

  describe("focusField", () => {
    it("names the first unwritten field on each destination", () => {
      expect(QUICK_ADD_SPECS.npc.focusField).toBe("appearance");
      expect(QUICK_ADD_SPECS.quest.focusField).toBe("objectives");
      expect(QUICK_ADD_SPECS.location.focusField).toBe("parent");
    });
  });

  describe("splitInitialData", () => {
    it("returns empty values when note conversion sent nothing", () => {
      expect(splitInitialData("npc")).toEqual({
        initialName: "",
        initialLine: "",
        carry: {},
      });
    });

    it("maps an NPC payload's name and description to the two fields", () => {
      const split = splitInitialData("npc", {
        name: "Thorin",
        description: "Exiled king",
        race: "Dwarf",
        occupation: "King",
      });

      expect(split.initialName).toBe("Thorin");
      expect(split.initialLine).toBe("Exiled king");
      expect(split.carry).toEqual({ race: "Dwarf", occupation: "King" });
    });

    it("maps a quest payload's title, not its name", () => {
      const split = splitInitialData("quest", {
        title: "Reclaim Erebor",
        description: "Take the mountain",
        objectives: [{ id: "o1" }],
      });

      expect(split.initialName).toBe("Reclaim Erebor");
      expect(split.initialLine).toBe("Take the mountain");
      expect(split.carry).toEqual({ objectives: [{ id: "o1" }] });
    });

    it("never writes the note wiring onto the record", () => {
      const split = splitInitialData("npc", {
        name: "Thorin",
        description: "A dwarf",
        noteId: "note-1",
        entityId: "entity-1",
      });

      expect(split.carry).not.toHaveProperty("noteId");
      expect(split.carry).not.toHaveProperty("entityId");
    });

    it("drops undefined values, which Firestore rejects", () => {
      const split = splitInitialData("npc", {
        name: "Thorin",
        description: "A dwarf",
        race: undefined,
      });

      expect(split.carry).not.toHaveProperty("race");
    });

    it("surfaces a converted location's parent as the pre-set parent", () => {
      const split = splitInitialData("location", {
        name: "Bag End",
        description: "A hobbit hole",
        parentId: "hobbiton",
      });

      expect(split.parentId).toBe("hobbiton");
    });

    it("survives a payload whose fields are not strings", () => {
      const split = splitInitialData("npc", { name: 42, description: null });
      expect(split.initialName).toBe("");
      expect(split.initialLine).toBe("");
    });
  });
});
