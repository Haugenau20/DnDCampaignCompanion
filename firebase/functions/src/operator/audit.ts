// functions/src/operator/audit.ts
//
// The one place an operator action is recorded (T137). Every action, and
// every refusal, writes one structured line to stdout; on Cloud Run, Cloud
// Logging reads it as a structured entry, and a sink routes the
// `operator_audit` lines to a bucket whose retention is locked
// (docs/architecture/operator/security-architecture.md, section 7).

/** Who acted: what Identity-Aware Proxy signed for the request. */
export interface OperatorIdentity {
  /** The Google account's email, for people reading the log. */
  email: string;
  /** Google's stable id for the account, `accounts.google.com:...`. */
  sub: string;
}

/** Everything the operator page can record. */
export type AuditAction =
  | "founder_link.issue"
  | "founder_link.revoke"
  | "allowance.set"
  | "allowance.clear"
  | "account.lookup"
  | "identity.refused"
  | "csrf.refused";

/** How an action ended. */
export type AuditOutcome = "ok" | "refused" | "error";

/** One audit line, before it is written. */
export interface AuditEntry {
  action: AuditAction;
  /** Null when the request never proved who sent it. */
  operator: OperatorIdentity | null;
  /** What the action touched: a link's first characters, an account's uid. */
  target?: Record<string, string>;
  outcome: AuditOutcome;
  /** Why it was refused or failed. */
  reason?: string;
  /** The request's trace, to find its other log lines. */
  trace?: string;
}

/** How many characters of a founder link's token a log may hold. */
export const LOGGED_LINK_LENGTH = 6;

const SEVERITY: Record<AuditOutcome, string> = {
  ok: "NOTICE",
  refused: "WARNING",
  error: "ERROR",
};

/**
 * The line `audit` writes for `entry`. A founder link is cut to its first
 * characters here, whatever the caller passed: a log must never hold a link
 * that still works.
 *
 * @param {AuditEntry} entry The action
 * @return {string} One line of JSON
 */
export function auditLine(entry: AuditEntry): string {
  const target = entry.target && {...entry.target};
  if (target?.link !== undefined) {
    target.link = target.link.slice(0, LOGGED_LINK_LENGTH);
  }
  return JSON.stringify({
    severity: SEVERITY[entry.outcome],
    message: `operator ${entry.action} ${entry.outcome}`,
    type: "operator_audit",
    action: entry.action,
    operator: entry.operator,
    ...(target && {target}),
    outcome: entry.outcome,
    ...(entry.reason && {reason: entry.reason}),
    ...(entry.trace && {
      "trace": entry.trace,
      "logging.googleapis.com/trace": entry.trace,
    }),
  });
}

/**
 * Record one operator action.
 *
 * @param {AuditEntry} entry The action
 * @param {Function} write Where the line goes; stdout unless a test says
 */
export function audit(
  entry: AuditEntry,
  write: (line: string) => void = (line) => process.stdout.write(line + "\n")
): void {
  write(auditLine(entry));
}
