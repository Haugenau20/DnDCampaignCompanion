// src/shared/utils/__tests__/entity-notes.test.ts
import { replaceNoteText, removeNote, NOTE_CHANGED_MESSAGE } from "../entity-notes";

// Stored in the order written, which is not date order: the pages sort a copy.
const stored = [
  { date: "2025-05-31", text: "Rode to Isengard.", author: "Zendikarr" },
  { date: "2025-04-02", text: "An older note, no author recorded." },
  { date: "2025-06-10", text: "Returned.", author: "Frodo" },
];

describe("replaceNoteText", () => {
  it("changes only the target's text, keeping its date and author", () => {
    const result = replaceNoteText(stored, stored[0], "Rode to Orthanc.");
    expect(result[0]).toEqual({
      date: "2025-05-31",
      text: "Rode to Orthanc.",
      author: "Zendikarr",
    });
  });

  it("keeps every other note, in the stored order", () => {
    const result = replaceNoteText(stored, stored[1], "Fixed.");
    expect(result.map((n) => n.text)).toEqual(["Rode to Isengard.", "Fixed.", "Returned."]);
  });

  it("finds the note by what it says, so a copy of it works", () => {
    const shown = { ...stored[2] };
    expect(replaceNoteText(stored, shown, "Home.")[2].text).toBe("Home.");
  });

  it("does not mutate the array it was given", () => {
    const before = JSON.stringify(stored);
    replaceNoteText(stored, stored[0], "Changed.");
    expect(JSON.stringify(stored)).toBe(before);
  });

  it("refuses when the note is no longer there", () => {
    const gone = { date: "2025-05-31", text: "Someone already edited this." };
    expect(() => replaceNoteText(stored, gone, "x")).toThrow(NOTE_CHANGED_MESSAGE);
  });

  it("treats a missing author and a different author as different notes", () => {
    const credited = { ...stored[1], author: "Sam" };
    expect(() => replaceNoteText(stored, credited, "x")).toThrow(NOTE_CHANGED_MESSAGE);
  });
});

describe("removeNote", () => {
  it("removes the target and keeps the rest in stored order", () => {
    expect(removeNote(stored, stored[0]).map((n) => n.text)).toEqual([
      "An older note, no author recorded.",
      "Returned.",
    ]);
  });

  it("removes one of two identical notes, not both", () => {
    const twice = [stored[2], { ...stored[2] }];
    expect(removeNote(twice, stored[2])).toHaveLength(1);
  });

  it("refuses when the note is no longer there", () => {
    expect(() => removeNote([], stored[0])).toThrow(NOTE_CHANGED_MESSAGE);
  });
});
