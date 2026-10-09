// functions/src/operator/http/server.ts
//
// The operator service (T137; design, "The HTTP layer"). Node's own
// `node:http`: six routes and two static files, and every dependency is one
// more thing running with the runtime account's access to Firestore.
//
// Every request, in this order: security headers; the identity IAP signed,
// checked again; on a POST, the CSRF checks; the handler; one audit line for
// what it did. A failure before the handler answers with a status and
// nothing more. There is no unauthenticated path, not even for a 404.

import {randomBytes} from "node:crypto";
import {createServer, IncomingMessage, Server, ServerResponse} from "node:http";
import type {Auth} from "firebase-admin/auth";
import type {Firestore} from "firebase-admin/firestore";
import {AuditAction, AuditEntry, OperatorIdentity, audit as writeAudit} from "../audit";
import {lookUpAccount} from "../accounts";
import {AllowanceRequest, clearAllowance, setAllowance} from "../allowances";
import {issueFounderLink, listFounderLinks, revokeFounderLink} from "../founderLinks";
import {founderLink} from "../../signUp/founderInvitations";
import {Refusal, RefusalReason} from "../../shared/refusal";
import {COPY_JS, OPERATOR_CSS} from "./assets";
import {csrfToken, csrfTokenValid, sameOrigin} from "./csrf";
import {applySecurityHeaders} from "./headers";
import {IAP_HEADER, IdentityConfig, verifyIdentity} from "./identity";
import {
  Notice,
  PageContext,
  accountsPage,
  errorPage,
  founderLinksPage,
  homePage,
  issuedLinkPage,
} from "./pages";

/** What the service runs against. */
export interface OperatorDeps {
  db: Firestore;
  auth: Auth;
  identity: IdentityConfig;
  /** The CSRF key, from Secret Manager in production. */
  csrfKey: Buffer;
  /** The site founder links point at, e.g. `https://muninn.quest`. */
  siteOrigin: string;
  /** Where audit lines go; stdout unless a test says. */
  auditWrite?: (line: string) => void;
  /** Where error details go; stderr unless a test says. */
  logError?: (line: string) => void;
  /** The clock; for the tests. */
  now?: () => Date;
}

/** One request, once it has proved who sent it. */
interface Context {
  deps: OperatorDeps;
  req: IncomingMessage;
  url: URL;
  operator: OperatorIdentity;
  page: PageContext;
  /** The form fields of a POST. */
  form: URLSearchParams;
  trace: string;
  now: Date;
  audit: (entry: Omit<AuditEntry, "operator" | "trace">) => void;
}

/** What a handler answers. */
type Reply =
  | {status: number; body: string; type?: string}
  | {redirect: string};

/** A route of the table. */
export interface Route {
  method: "GET" | "POST";
  path: string;
  /** What a failure of this route is audited as; routes that change nothing have none. */
  auditAs?: (form: URLSearchParams) => AuditAction;
  handle: (ctx: Context) => Promise<Reply>;
}

/** The largest form body accepted. */
const MAX_BODY_BYTES = 16 * 1024;

/** The status a refusal answers with (design, "Errors"). */
const REFUSAL_STATUS: Record<RefusalReason, number> = {
  invalid_input: 400,
  budget_spent: 429,
  link_not_found: 404,
  link_ambiguous: 409,
  link_used: 409,
  no_profile: 409,
};

const HTML = "text/html; charset=utf-8";

/**
 * A refusal as the page's notice.
 *
 * @param {Refusal} refusal The refusal
 * @return {Notice} The notice
 */
function noticeOf(refusal: Refusal): Notice {
  return {kind: "bad", text: refusal.message};
}

/**
 * A date field's `YYYY-MM-DD`, as the end of that day in UTC; an invalid date
 * for anything else, which the bounds then refuse.
 *
 * @param {string} value The field
 * @return {Date | null} The moment, or null for an empty field
 */
function endOfDayUtc(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(NaN);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return date.getUTCDate() === day ? date : new Date(NaN);
}

/**
 * A number field as a whole number, or NaN, which the bounds then refuse.
 *
 * @param {string | null} value The field
 * @return {number} The number
 */
function wholeNumber(value: string | null): number {
  return value !== null && /^\d{1,6}$/.test(value.trim()) ? Number(value.trim()) : NaN;
}

/**
 * The founder-links page, listing the newest links.
 *
 * @param {Context} ctx The request
 * @param {Notice} notice A message above them
 * @param {string} note The note to fill in again
 * @return {Promise<string>} The document
 */
async function linksPage(ctx: Context, notice?: Notice, note?: string): Promise<string> {
  const page = await listFounderLinks(ctx.deps.db, {now: ctx.now});
  return founderLinksPage(ctx.page, page, notice, note);
}

/**
 * The accounts page for `email`, looked up again.
 *
 * @param {Context} ctx The request
 * @param {string} email The address
 * @param {Notice} notice A message above it
 * @return {Promise<string>} The document
 */
async function accountPage(ctx: Context, email: string, notice?: Notice): Promise<string> {
  const account = email ? await lookUpAccount(ctx.deps.db, ctx.deps.auth, email, ctx.now) : undefined;
  return accountsPage(ctx.page, {email, account}, notice, ctx.now);
}

/** The route table. The tests walk it, so a route added here is covered. */
export const ROUTES: readonly Route[] = [
  {
    method: "GET",
    path: "/",
    handle: async (ctx) => ({status: 200, body: homePage(ctx.page)}),
  },
  {
    method: "GET",
    path: "/founder-links",
    handle: async (ctx) => {
      const before = ctx.url.searchParams.get("before") ?? undefined;
      const revoked = ctx.url.searchParams.get("revoked");
      const notice: Notice | undefined = revoked && /^[A-Za-z0-9_-]{6}$/.test(revoked) ?
        {kind: "ok", text: `Founder link ${revoked} revoked.`} : undefined;
      try {
        const page = await listFounderLinks(ctx.deps.db, {before, now: ctx.now});
        return {status: 200, body: founderLinksPage(ctx.page, page, notice)};
      } catch (error) {
        if (!(error instanceof Refusal)) throw error;
        return {status: REFUSAL_STATUS[error.reason], body: await linksPage(ctx, noticeOf(error))};
      }
    },
  },
  {
    method: "POST",
    path: "/founder-links",
    auditAs: () => "founder_link.issue",
    handle: async (ctx) => {
      const note = ctx.form.get("note") ?? "";
      try {
        const issued = await issueFounderLink(ctx.deps.db, {
          issuedBy: ctx.operator.email || ctx.operator.sub,
          note,
          now: ctx.now,
        });
        ctx.audit({action: "founder_link.issue", target: {link: issued.ref}, outcome: "ok"});
        return {
          status: 200,
          body: issuedLinkPage(ctx.page, {
            link: founderLink(ctx.deps.siteOrigin, issued.token),
            ref: issued.ref,
            expiresAt: issued.expiresAt,
          }),
        };
      } catch (error) {
        if (!(error instanceof Refusal)) throw error;
        ctx.audit({action: "founder_link.issue", outcome: "refused", reason: error.reason});
        return {status: REFUSAL_STATUS[error.reason], body: await linksPage(ctx, noticeOf(error), note)};
      }
    },
  },
  {
    method: "POST",
    path: "/founder-links/revoke",
    auditAs: () => "founder_link.revoke",
    handle: async (ctx) => {
      const ref = ctx.form.get("id") ?? "";
      try {
        await revokeFounderLink(ctx.deps.db, {
          ref,
          revokedBy: ctx.operator.email || ctx.operator.sub,
          now: ctx.now,
        });
        ctx.audit({action: "founder_link.revoke", target: {link: ref}, outcome: "ok"});
        return {redirect: `/founder-links?revoked=${encodeURIComponent(ref)}`};
      } catch (error) {
        if (!(error instanceof Refusal)) throw error;
        ctx.audit({
          action: "founder_link.revoke",
          target: {link: ref.slice(0, 6)},
          outcome: "refused",
          reason: error.reason,
        });
        return {status: REFUSAL_STATUS[error.reason], body: await linksPage(ctx, noticeOf(error))};
      }
    },
  },
  {
    method: "GET",
    path: "/accounts",
    handle: async (ctx) => {
      const email = (ctx.url.searchParams.get("email") ?? "").trim();
      const saved = ctx.url.searchParams.get("saved");
      const notice: Notice | undefined =
        saved === "set" ? {kind: "ok", text: "Allowance set."} :
          saved === "clear" ? {kind: "ok", text: "Back on the defaults."} : undefined;
      if (!email) {
        return {status: 200, body: accountsPage(ctx.page, {email, account: undefined}, notice, ctx.now)};
      }
      try {
        const account = await lookUpAccount(ctx.deps.db, ctx.deps.auth, email, ctx.now);
        ctx.audit({
          action: "account.lookup",
          ...(account ? {target: {uid: account.uid}} : {}),
          outcome: "ok",
          ...(account ? {} : {reason: "no account"}),
        });
        return {status: 200, body: accountsPage(ctx.page, {email, account}, notice, ctx.now)};
      } catch (error) {
        if (!(error instanceof Refusal)) throw error;
        ctx.audit({action: "account.lookup", outcome: "refused", reason: error.reason});
        return {
          status: REFUSAL_STATUS[error.reason],
          body: accountsPage(ctx.page, {email, account: undefined}, noticeOf(error), ctx.now),
        };
      }
    },
  },
  {
    method: "POST",
    path: "/accounts/allowance",
    auditAs: (form) => form.get("mode") === "clear" ? "allowance.clear" : "allowance.set",
    handle: async (ctx) => {
      const uid = ctx.form.get("uid") ?? "";
      const email = (ctx.form.get("email") ?? "").trim();
      const clearing = ctx.form.get("mode") === "clear";
      const action: AuditAction = clearing ? "allowance.clear" : "allowance.set";
      try {
        if (clearing) {
          await clearAllowance(ctx.deps.db, uid);
        } else {
          const request: AllowanceRequest = {
            unlimited: ctx.form.get("unlimited") === "on",
            limits: {
              daily: wholeNumber(ctx.form.get("daily")),
              weekly: wholeNumber(ctx.form.get("weekly")),
              monthly: wholeNumber(ctx.form.get("monthly")),
            },
            expiresAt: endOfDayUtc((ctx.form.get("expires") ?? "").trim()),
          };
          await setAllowance(ctx.deps.db, uid, request, ctx.now);
        }
        ctx.audit({action, target: {uid}, outcome: "ok"});
        return {
          redirect: `/accounts?email=${encodeURIComponent(email)}&saved=${clearing ? "clear" : "set"}`,
        };
      } catch (error) {
        if (!(error instanceof Refusal)) throw error;
        ctx.audit({action, target: {uid: uid.slice(0, 128)}, outcome: "refused", reason: error.reason});
        return {status: REFUSAL_STATUS[error.reason], body: await accountPage(ctx, email, noticeOf(error))};
      }
    },
  },
  {
    method: "GET",
    path: "/assets/operator.css",
    handle: async () => ({status: 200, body: OPERATOR_CSS, type: "text/css; charset=utf-8"}),
  },
  {
    method: "GET",
    path: "/assets/copy.js",
    handle: async () => ({status: 200, body: COPY_JS, type: "text/javascript; charset=utf-8"}),
  },
];

/**
 * The request's trace id: Cloud Run's, or one of our own.
 *
 * @param {IncomingMessage} req The request
 * @return {string} The trace id
 */
function traceOf(req: IncomingMessage): string {
  const header = req.headers["x-cloud-trace-context"];
  const id = typeof header === "string" ? header.split("/")[0] : "";
  return /^[0-9a-f]{32}$/i.test(id) ? id : randomBytes(16).toString("hex");
}

/**
 * This service's origin, as the browser sees it.
 *
 * @param {IncomingMessage} req The request
 * @return {string} The origin
 */
function ownOrigin(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-proto"];
  const proto = typeof forwarded === "string" && forwarded.split(",")[0].trim() === "https" ? "https" : "http";
  return `${proto}://${req.headers.host ?? ""}`;
}

/** A request body too large to read. */
class BodyTooLarge extends Error {}

/**
 * A form body, read up to the limit.
 *
 * @param {IncomingMessage} req The request
 * @return {Promise<URLSearchParams>} The fields
 */
async function readForm(req: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new BodyTooLarge();
    chunks.push(chunk as Buffer);
  }
  const type = req.headers["content-type"] ?? "";
  if (!type.startsWith("application/x-www-form-urlencoded")) return new URLSearchParams();
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

/**
 * Send a plain answer: a status and a short sentence, nothing more.
 *
 * @param {ServerResponse} res The response
 * @param {number} status The status
 * @param {string} text The sentence
 */
function sendPlain(res: ServerResponse, status: number, text: string): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(text);
}

/**
 * The service's request handler.
 *
 * @param {OperatorDeps} deps What it runs against
 * @return {Function} The handler `node:http` calls
 */
export function createOperatorHandler(
  deps: OperatorDeps
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const write = deps.auditWrite;
  const logError = deps.logError ?? ((line: string) => process.stderr.write(line + "\n"));

  return async (req, res) => {
    applySecurityHeaders(res);
    const trace = traceOf(req);
    // Set once a request has proved who sent it, for the audit of a failure.
    let operator: OperatorIdentity | null = null;
    let route: Route | undefined;
    let form = new URLSearchParams();
    try {
      const identity = await verifyIdentity(req.headers[IAP_HEADER], deps.identity);
      if (!identity.ok) {
        writeAudit({
          action: "identity.refused",
          operator: identity.operator,
          outcome: "refused",
          reason: identity.reason,
          trace,
        }, write);
        req.resume();
        sendPlain(res, identity.status, "Not allowed.");
        return;
      }
      operator = identity.operator;
      const now = (deps.now ?? (() => new Date()))();
      const url = new URL(req.url ?? "/", "http://operator.invalid");

      const onPath = ROUTES.filter((route) => route.path === url.pathname);
      route = onPath.find((candidate) => candidate.method === req.method);
      if (!route) {
        req.resume();
        if (onPath.length > 0) res.setHeader("Allow", onPath.map((candidate) => candidate.method).join(", "));
        sendPlain(res, onPath.length > 0 ? 405 : 404, onPath.length > 0 ? "Method not allowed." : "Not found.");
        return;
      }

      if (route.method === "POST") {
        form = await readForm(req);
        const csrfOk = sameOrigin(req.headers, ownOrigin(req)) &&
          csrfTokenValid(deps.csrfKey, operator.sub, form.get("csrf"), now.getTime());
        if (!csrfOk) {
          writeAudit({action: "csrf.refused", operator, outcome: "refused", reason: route.path, trace}, write);
          sendPlain(res, 403, "This form has expired. Go back, reload the page and try again.");
          return;
        }
      }

      const ctx: Context = {
        deps,
        req,
        url,
        operator,
        page: {operator, csrf: csrfToken(deps.csrfKey, operator.sub, now.getTime())},
        form,
        trace,
        now,
        audit: (entry) => writeAudit({...entry, operator: identity.operator, trace}, write),
      };
      const reply = await route.handle(ctx);
      if ("redirect" in reply) {
        // POST, redirect, GET: a reload never repeats an action.
        res.statusCode = 303;
        res.setHeader("Location", reply.redirect);
        res.end();
        return;
      }
      res.statusCode = reply.status;
      res.setHeader("Content-Type", reply.type ?? HTML);
      res.end(reply.body);
    } catch (error) {
      if (error instanceof BodyTooLarge) {
        sendPlain(res, 413, "Too large.");
        return;
      }
      if (operator && route?.auditAs) {
        writeAudit({action: route.auditAs(form), operator, outcome: "error", trace}, write);
      }
      logError(JSON.stringify({
        severity: "ERROR",
        message: `operator request failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
        trace,
      }));
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", HTML);
        res.end(errorPage(trace));
      }
    }
  };
}

/**
 * The service.
 *
 * @param {OperatorDeps} deps What it runs against
 * @return {Server} The server, not yet listening
 */
export function createOperatorServer(deps: OperatorDeps): Server {
  const handler = createOperatorHandler(deps);
  return createServer((req, res) => {
    void handler(req, res);
  });
}
