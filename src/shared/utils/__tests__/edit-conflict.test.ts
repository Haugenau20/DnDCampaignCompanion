// src/shared/utils/__tests__/edit-conflict.test.ts
import {
  assertUnchanged,
  editedText,
  EditConflictError,
  EDIT_CONFLICT_MESSAGE,
  isEditConflict,
} from "../edit-conflict";

interface Record {
  description?: string;
  name: string;
}

describe("assertUnchanged", () => {
  it("allows a save when the stored text is what the editor opened with", () => {
    expect(() => assertUnchanged("Old.", "Old.", "New.")).not.toThrow();
  });

  it("refuses when someone else changed the text since, carrying their version", () => {
    let caught: unknown;
    try {
      assertUnchanged("Theirs.", "Old.", "Mine.");
    } catch (error) {
      caught = error;
    }
    expect(isEditConflict(caught)).toBe(true);
    expect((caught as EditConflictError).theirs).toBe("Theirs.");
    expect((caught as EditConflictError).message).toBe(EDIT_CONFLICT_MESSAGE);
  });

  it("is not a conflict when both made the same change", () => {
    expect(() => assertUnchanged("Same fix.", "Old.", "Same fix.")).not.toThrow();
  });

  it("reads a missing field as empty, both ways", () => {
    expect(() => assertUnchanged(undefined, "", "First words.")).not.toThrow();
    expect(() => assertUnchanged(undefined, "Was here.", "Mine.")).toThrow(EditConflictError);
  });

  it("compares exactly: whitespace someone added is a change", () => {
    expect(() => assertUnchanged("Old. ", "Old.", "New.")).toThrow(EditConflictError);
  });
});

describe("editedText", () => {
  it("sets only the edited field", () => {
    const change = editedText<Record>("description", "New.", "Old.");
    expect(change({ name: "Bree", description: "Old." })).toEqual({ description: "New." });
  });

  it("refuses against a record whose field moved on", () => {
    const change = editedText<Record>("description", "Mine.", "Old.");
    expect(() => change({ name: "Bree", description: "Theirs." })).toThrow(EditConflictError);
  });

  it("fills a field nobody had written yet", () => {
    const change = editedText<Record>("description", "First.", "");
    expect(change({ name: "Bree" })).toEqual({ description: "First." });
  });
});

describe("isEditConflict", () => {
  it("is false for any other error", () => {
    expect(isEditConflict(new Error(EDIT_CONFLICT_MESSAGE))).toBe(false);
    expect(isEditConflict(undefined)).toBe(false);
  });
});
