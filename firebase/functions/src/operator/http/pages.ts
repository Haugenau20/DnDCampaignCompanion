// functions/src/operator/http/pages.ts
//
// The operator page's pages, rendered on the server (T137). Every value goes
// through `html`, which escapes it; the pages work without JavaScript, and
// every form carries the CSRF token.

import {SafeHtml, html} from "./html";
import type {OperatorIdentity} from "../audit";
import type {FounderLinkPage, FounderLinkRow} from "../founderLinks";
import type {AccountView} from "../accounts";
import {ALLOWANCE_BOUNDS} from "../allowances";
import {DEFAULT_USAGE_LIMITS, USAGE_PERIODS} from "../../extractionAllowance";

/** A message above a page's content. */
export interface Notice {
  kind: "ok" | "bad";
  text: string;
}

/** What every page needs. */
export interface PageContext {
  operator: OperatorIdentity;
  /** The form token for this operator and hour. */
  csrf: string;
}

/** The areas, for the navigation. */
type Area = "home" | "founder-links" | "accounts";

const AREAS: ReadonlyArray<[Area, string, string]> = [
  ["home", "/", "Home"],
  ["founder-links", "/founder-links", "Founder links"],
  ["accounts", "/accounts", "Accounts"],
];

/**
 * A moment as the page shows it: UTC, to the minute.
 *
 * @param {Date | null} date The moment
 * @return {string} `2026-10-09 14:03 UTC`, or a dash
 */
export function formatUtc(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return "—";
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/**
 * The last day of the month holding `now`, as a date field wants it.
 *
 * @param {Date} now The moment
 * @return {string} `YYYY-MM-DD`
 */
export function endOfMonthUtc(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    .toISOString().slice(0, 10);
}

/**
 * The hidden field every form carries.
 *
 * @param {PageContext} ctx The page
 * @return {SafeHtml} The field
 */
function csrfField(ctx: PageContext): SafeHtml {
  return html`<input type="hidden" name="csrf" value="${ctx.csrf}">`;
}

/**
 * A whole page.
 *
 * @param {PageContext} ctx The page
 * @param {Area} area Which area it is in
 * @param {string} title Its heading
 * @param {SafeHtml} body Its content
 * @param {Notice} notice A message above the content
 * @return {string} The document
 */
export function layout(
  ctx: PageContext,
  area: Area,
  title: string,
  body: SafeHtml,
  notice?: Notice
): string {
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title} · Muninn operator</title>
<link rel="stylesheet" href="/assets/operator.css">
<script src="/assets/copy.js" defer></script>
</head>
<body>
<header>
<nav aria-label="Operator">
${AREAS.map(([name, href, label]) => html`<a href="${href}"${name === area ? html` aria-current="page"` : ""}>${label}</a>`)}
</nav>
<p>Signed in as ${ctx.operator.email || ctx.operator.sub}. Times are UTC.</p>
</header>
<main>
<h1>${title}</h1>
${notice ? html`<div class="notice ${notice.kind}" role="${notice.kind === "bad" ? "alert" : "status"}">${notice.text}</div>` : ""}
${body}
</main>
</body>
</html>
`.value;
}

/**
 * Home: the two areas.
 *
 * @param {PageContext} ctx The page
 * @return {string} The document
 */
export function homePage(ctx: PageContext): string {
  return layout(ctx, "home", "Operator", html`
<section>
<h2><a href="/founder-links">Founder links</a></h2>
<p>Issue a link that lets one person start a group, see which links are open, and revoke one.</p>
</section>
<section>
<h2><a href="/accounts">Accounts</a></h2>
<p>Look an account up by its email, and set how many smart detections it may run.</p>
</section>`);
}

const STATUS_LABEL: Record<FounderLinkRow["status"], string> = {
  open: "Open",
  used: "Used",
  expired: "Expired",
  revoked: "Revoked",
};

/**
 * One founder link in the list: never its token, only its first characters.
 *
 * @param {PageContext} ctx The page
 * @param {FounderLinkRow} row The link
 * @return {SafeHtml} Its list item
 */
function linkRow(ctx: PageContext, row: FounderLinkRow): SafeHtml {
  return html`<li>
<p><span class="status">${STATUS_LABEL[row.status]}</span> · <code>${row.ref}</code>${row.note ? html` · ${row.note}` : ""}</p>
<p class="meta">Issued ${formatUtc(row.createdAt)} by ${row.issuedBy ?? "unknown"}. ${
  row.status === "used" ? html`Used ${formatUtc(row.usedAt)}.` :
  row.status === "revoked" ? html`Revoked ${formatUtc(row.revokedAt)} by ${row.revokedBy ?? "unknown"}.` :
  html`Expires ${formatUtc(row.expiresAt)}.`}</p>
${row.status === "open" ? html`<form method="post" action="/founder-links/revoke">
${csrfField(ctx)}<input type="hidden" name="id" value="${row.ref}">
<button type="submit" class="secondary" aria-label="Revoke ${row.ref}">Revoke</button>
</form>` : ""}
</li>`;
}

/**
 * The issue form and the list of links.
 *
 * @param {PageContext} ctx The page
 * @param {FounderLinkPage} page The links to list
 * @param {Notice} notice A message above them
 * @param {string} note The note to fill in again after a refusal
 * @return {string} The document
 */
export function founderLinksPage(
  ctx: PageContext,
  page: FounderLinkPage,
  notice?: Notice,
  note = ""
): string {
  return layout(ctx, "founder-links", "Founder links", html`
<section>
<h2>Issue a founder link</h2>
<form method="post" action="/founder-links">
${csrfField(ctx)}
<div class="field">
<label for="note">Note (optional)</label>
<input type="text" id="note" name="note" maxlength="200" value="${note}">
<p class="hint">For your own records: who it is for. Nobody else sees it.</p>
</div>
<button type="submit">Issue a founder link</button>
</form>
<p class="hint">A link lets one person create an account and start one group. It works once, for 14 days, and is shown only once.</p>
</section>
<section aria-labelledby="links-heading">
<h2 id="links-heading">Links, newest first</h2>
${page.rows.length === 0 ? html`<p>No founder links yet.</p>` :
  html`<ul class="links">${page.rows.map((row) => linkRow(ctx, row))}</ul>`}
${page.next ? html`<p><a href="/founder-links?before=${encodeURIComponent(page.next)}">Older links</a></p>` : ""}
</section>`, notice);
}

/**
 * The one response that shows a founder link in full.
 *
 * @param {PageContext} ctx The page
 * @param {object} issued The link, its ref and its expiry
 * @return {string} The document
 */
export function issuedLinkPage(
  ctx: PageContext,
  issued: {link: string; ref: string; expiresAt: Date}
): string {
  return layout(ctx, "founder-links", "Founder link issued", html`
<section>
<p>Send this to the person who will start the group. It is shown only now: this page cannot show it again.</p>
<p class="link" id="founder-link">${issued.link}</p>
<p><button type="button" data-copy="founder-link" hidden>Copy the link</button></p>
<p class="meta">Listed as <code>${issued.ref}</code>. Works once, until ${formatUtc(issued.expiresAt)}.</p>
<p><a href="/founder-links">Back to the founder links</a></p>
</section>`, {kind: "ok", text: "Founder link issued."});
}

/**
 * The limits as a short line: `3 / 5 / 10 a day, week and month`.
 *
 * @param {object} limits The limits
 * @return {string} The line
 */
function limitsLine(limits: Record<string, number>): string {
  return `${limits.daily} / ${limits.weekly} / ${limits.monthly} a day, week and month`;
}

/**
 * The account found, and the forms that change its allowance.
 *
 * @param {PageContext} ctx The page
 * @param {AccountView} account The account
 * @param {Date} now The moment, for the default end date
 * @return {SafeHtml} The account's sections
 */
function accountSections(ctx: PageContext, account: AccountView, now: Date): SafeHtml {
  const limits = account.limits;
  const usage = account.usage?.usage;
  const allowance = account.allowance;
  const shown = allowance?.limits ?? limits.limits;

  return html`
<section aria-labelledby="account-heading">
<h2 id="account-heading">${account.email}</h2>
<dl>
<dt>Account</dt><dd><code>${account.uid}</code></dd>
<dt>Created</dt><dd>${formatUtc(account.createdAt)}</dd>
<dt>Last sign-in</dt><dd>${formatUtc(account.lastSignInAt)}</dd>
<dt>Limits now</dt><dd>${limits.unlimited ? "Unlimited" : limitsLine(limits.limits)}${limits.raisedUntil ? html`, until ${formatUtc(limits.raisedUntil)}` : ""}</dd>
<dt>Allowance</dt><dd>${!allowance ? "None: the defaults apply" :
  html`${allowance.unlimited ? "Unlimited" : limitsLine(allowance.limits ?? {})}${allowance.expiresAt ? html`, until ${formatUtc(allowance.expiresAt)}` : ", until changed"}${allowance.expired ? " (expired: the defaults apply)" : ""}. Set ${formatUtc(allowance.setAt)}.`}</dd>
</dl>
${account.hasProfile ? "" : html`<p class="notice bad">This account has no profile yet: it is in no group, so it cannot use smart detection, and no allowance can be set.</p>`}
${usage ? html`<table>
<caption class="hint">Smart detections used</caption>
<thead><tr><th scope="col">Period</th><th scope="col">Used</th><th scope="col">Limit</th></tr></thead>
<tbody>${USAGE_PERIODS.map((period) => html`<tr><th scope="row">${period}</th><td>${usage[period].count}</td><td>${usage.isUnlimited ? "—" : usage[period].limit}</td></tr>`)}</tbody>
</table>` : ""}
</section>
${account.hasProfile ? html`<section aria-labelledby="allowance-heading">
<h2 id="allowance-heading">Set the allowance</h2>
<form method="post" action="/accounts/allowance">
${csrfField(ctx)}
<input type="hidden" name="uid" value="${account.uid}">
<input type="hidden" name="email" value="${account.email}">
<input type="hidden" name="mode" value="set">
<label class="check"><input type="checkbox" name="unlimited" value="on"${allowance?.unlimited ? html` checked` : ""}> Unlimited</label>
<div class="row">
${USAGE_PERIODS.map((period) => html`<div class="field">
<label for="${period}">${period[0].toUpperCase() + period.slice(1)} limit</label>
<input type="number" id="${period}" name="${period}" min="0" max="${ALLOWANCE_BOUNDS[period]}" step="1" inputmode="numeric" value="${shown[period]}">
<p class="hint">0 to ${ALLOWANCE_BOUNDS[period]}</p>
</div>`)}
</div>
<div class="field">
<label for="expires">Until (optional)</label>
<input type="date" id="expires" name="expires" value="${endOfMonthUtc(now)}">
<p class="hint">The end of that day, UTC. Leave it empty for until it is changed; at most a year away.</p>
</div>
<button type="submit">Set the allowance</button>
</form>
</section>
<section>
<h2>Back to the defaults</h2>
<p>${limitsLine(DEFAULT_USAGE_LIMITS)}.</p>
<form method="post" action="/accounts/allowance">
${csrfField(ctx)}
<input type="hidden" name="uid" value="${account.uid}">
<input type="hidden" name="email" value="${account.email}">
<input type="hidden" name="mode" value="clear">
<button type="submit" class="secondary">Reset to the defaults</button>
</form>
</section>` : ""}`;
}

/**
 * The look-up form, and the account it found.
 *
 * @param {PageContext} ctx The page
 * @param {object} found What was asked for and what was found
 * @param {Notice} notice A message above them
 * @param {Date} now The moment
 * @return {string} The document
 */
export function accountsPage(
  ctx: PageContext,
  found: {email: string; account: AccountView | null | undefined},
  notice: Notice | undefined,
  now: Date
): string {
  return layout(ctx, "accounts", "Accounts", html`
<section>
<h2>Find an account</h2>
<form method="get" action="/accounts">
<div class="field">
<label for="email">Email</label>
<input type="email" id="email" name="email" required value="${found.email}" autocomplete="off">
<p class="hint">The exact address the account signs in with.</p>
</div>
<button type="submit">Look up</button>
</form>
</section>
${found.account === null ? html`<p class="notice bad" role="status">No account has this email.</p>` : ""}
${found.account ? accountSections(ctx, found.account, now) : ""}`, notice);
}

/**
 * The page for anything that went wrong on our side: a status, a trace id,
 * and nothing more.
 *
 * @param {string} trace The request's trace id
 * @return {string} The document
 */
export function errorPage(trace: string): string {
  return html`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Something went wrong · Muninn operator</title><link rel="stylesheet" href="/assets/operator.css"></head>
<body><main><h1>Something went wrong</h1><p>Reload the page to see what happened, then try again. The log has the detail under trace <code>${trace}</code>.</p>
<p><a href="/">Back to the start</a></p></main></body></html>
`.value;
}
