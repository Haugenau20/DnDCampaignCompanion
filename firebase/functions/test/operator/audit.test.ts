// functions/test/operator/audit.test.ts
//
// T137: every operator action leaves one structured line, which Cloud Logging
// reads as an entry and a sink routes to a locked bucket. A line never holds a
// founder link that still works.
import {audit, auditLine} from "../../src/operator/audit";

const OPERATOR = {email: "operator@muninn.quest", sub: "accounts.google.com:1234"};

describe("an audit line", () => {
  it("is one line of JSON in the shape the design gives", () => {
    const line = auditLine({
      action: "founder_link.revoke",
      operator: OPERATOR,
      target: {link: "Xy3kQ9"},
      outcome: "ok",
      trace: "projects/p/traces/abc",
    });

    expect(line).not.toContain("\n");
    expect(JSON.parse(line)).toEqual({
      "severity": "NOTICE",
      "message": "operator founder_link.revoke ok",
      "type": "operator_audit",
      "action": "founder_link.revoke",
      "operator": OPERATOR,
      "target": {link: "Xy3kQ9"},
      "outcome": "ok",
      "trace": "projects/p/traces/abc",
      "logging.googleapis.com/trace": "projects/p/traces/abc",
    });
  });

  it("cuts a founder link to its first six characters, whatever it was given", () => {
    const token = "Xy3kQ9secretsecretsecretsecretsecretsecret";
    const line = auditLine({action: "founder_link.issue", operator: OPERATOR, target: {link: token}, outcome: "ok"});

    expect(line).not.toContain("secret");
    expect(JSON.parse(line).target.link).toBe("Xy3kQ9");
  });

  it("carries the reason for a refusal, at a severity that stands out", () => {
    const parsed = JSON.parse(auditLine({
      action: "identity.refused",
      operator: null,
      outcome: "refused",
      reason: "unknown subject",
    }));

    expect(parsed.severity).toBe("WARNING");
    expect(parsed.operator).toBeNull();
    expect(parsed.reason).toBe("unknown subject");
    expect(parsed).not.toHaveProperty("target");
    expect(parsed).not.toHaveProperty("trace");
  });

  it("marks a failure as an error", () => {
    expect(JSON.parse(auditLine({action: "allowance.set", operator: OPERATOR, outcome: "error"})).severity)
      .toBe("ERROR");
  });

  it("is written as one line to stdout", () => {
    const writes: string[] = [];
    const spy = jest.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    try {
      audit({action: "account.lookup", operator: OPERATOR, target: {uid: "u1"}, outcome: "ok"});
    } finally {
      spy.mockRestore();
    }

    expect(writes).toHaveLength(1);
    expect(writes[0].endsWith("\n")).toBe(true);
    expect(JSON.parse(writes[0]).target).toEqual({uid: "u1"});
  });
});
