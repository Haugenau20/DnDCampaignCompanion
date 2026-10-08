// functions/test/issueFounderInvitationScript.test.ts
//
// What `scripts/issue-founder-invitation.js` hands the maintainer: the link to
// send, and when it stops working. Issuing is `issueFounderInvitation`, tested
// in founderInvitations.test.ts.

// A plain-JS operator script, so required rather than imported.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {describeIssued, siteFor} = require("../scripts/issue-founder-invitation.js") as {
  describeIssued: (issued: {link: string; expiresAt: Date; note?: string}) => string;
  siteFor: (emulator: boolean) => string;
};

describe("the founder-invitation script", () => {
  it("prints the link, when it expires, and who it is for", () => {
    expect(describeIssued({
      link: "https://muninn.quest/join?founder=abc",
      expiresAt: new Date("2026-10-22T12:00:00Z"),
      note: "Bree table",
    })).toBe([
      "Founder invitation for: Bree table",
      "https://muninn.quest/join?founder=abc",
      "Works once, until 2026-10-22 12:00 UTC.",
    ].join("\n"));
  });

  it("leaves out the note when there is none", () => {
    expect(describeIssued({
      link: "https://muninn.quest/join?founder=abc",
      expiresAt: new Date("2026-10-22T12:00:00Z"),
    }).split("\n")[0]).toBe("https://muninn.quest/join?founder=abc");
  });

  it("links to the live site, or to the dev server against the emulators", () => {
    expect(siteFor(false)).toBe("https://muninn.quest");
    expect(siteFor(true)).toBe("http://localhost:3000");
  });
});
