// functions/test/deleteAccountScript.test.ts
//
// What `scripts/delete-account.js` tells the maintainer before it deletes
// anything. The deletion itself is `deleteAccount`, tested in
// accountDeletion.test.ts; this is the report a decision is made from.

// A plain-JS operator script, so required rather than imported.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {describePlan} = require("../scripts/delete-account.js") as {
  describePlan: (plan: unknown, apply: boolean) => string;
};

const frodo = {
  uid: "frodo",
  email: "frodo@example.com",
  hasSignIn: true,
  hasProfile: true,
  groups: [
    {groupId: "g1", names: ["Mr Underhill", "frodo"], notes: 3, readingProgress: 1, onlyAdmin: false},
    {groupId: "g2", names: ["frodo"], notes: 0, readingProgress: 0, onlyAdmin: false},
  ],
};

describe("the deletion script's report", () => {
  it("lists what goes, group by group, and says a dry run changed nothing", () => {
    expect(describePlan(frodo, false)).toBe([
      "Account frodo (frodo@example.com)",
      "  sign-in: yes",
      "  profile: yes",
      "  group g1: names Mr Underhill, frodo; 3 private notes; reading progress in 1 campaign",
      "  group g2: names frodo; 0 private notes; reading progress in 0 campaigns",
      "",
      "Nothing has been changed. Run again with --apply to delete all of the above.",
    ].join("\n"));
  });

  it("says it is deleting when asked to", () => {
    expect(describePlan(frodo, true).split("\n").pop()).toBe("Deleting all of the above. This cannot be undone.");
  });

  it("calls out a group whose only admin they are, which refuses the deletion", () => {
    const gandalf = {
      ...frodo, uid: "gandalf", email: "gandalf@example.com",
      groups: [{groupId: "g1", names: ["gandalf"], notes: 0, readingProgress: 0, onlyAdmin: true}],
    };
    for (const apply of [false, true]) {
      const report = describePlan(gandalf, apply);
      expect(report).toContain(
        "  group g1: names gandalf; 0 private notes; reading progress in 0 campaigns\n" +
        "    ONLY ADMIN of g1, which has other members. Make one of them an admin first " +
        "(groups/g1/users/<their uid>, role \"admin\"); until then --apply refuses."
      );
      // Even with --apply, it does not claim to be deleting.
      expect(report.split("\n").pop()).toBe("Nothing has been changed, and nothing can be until g1 has another admin.");
    }
  });

  it("says plainly when there is nothing to delete", () => {
    const nobody = {uid: "sauron", email: undefined, hasSignIn: false, hasProfile: false, groups: []};
    expect(describePlan(nobody, false)).toBe("There is no account sauron: no sign-in and no profile.");
  });

  it("names no note, only how many", () => {
    expect(describePlan(frodo, false)).not.toMatch(/secret|title|content/i);
  });
});
