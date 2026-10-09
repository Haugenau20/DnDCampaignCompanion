// functions/src/operator/http/csrf.ts
//
// Cross-site request forgery (security architecture, section 4; T5). A POST
// passes only when the browser says it came from this page, and it carries a
// form token only this service can make: an HMAC of the operator's subject
// and the hour, under a key from Secret Manager.

import {createHmac, timingSafeEqual} from "node:crypto";
import type {IncomingHttpHeaders} from "node:http";

const HOUR_MS = 60 * 60 * 1000;

/**
 * The form token for `sub` in the hour holding `nowMs`.
 *
 * @param {Buffer} key The CSRF key
 * @param {string} sub The operator's subject
 * @param {number} nowMs The moment
 * @return {string} The token
 */
export function csrfToken(key: Buffer, sub: string, nowMs: number): string {
  const hour = Math.floor(nowMs / HOUR_MS);
  return createHmac("sha256", key).update(`${sub}\n${hour}`).digest("base64url");
}

/**
 * Whether `token` is `sub`'s for this hour or the one before, so a form left
 * open over the turn of the hour still works once.
 *
 * @param {Buffer} key The CSRF key
 * @param {string} sub The operator's subject
 * @param {unknown} token What the form sent
 * @param {number} nowMs The moment
 * @return {boolean} Whether it is valid
 */
export function csrfTokenValid(key: Buffer, sub: string, token: unknown, nowMs: number): boolean {
  if (typeof token !== "string" || token.length === 0) return false;
  const sent = Buffer.from(token);
  return [nowMs, nowMs - HOUR_MS].some((moment) => {
    const expected = Buffer.from(csrfToken(key, sub, moment));
    return expected.length === sent.length && timingSafeEqual(expected, sent);
  });
}

/**
 * Whether the browser says the request came from this page:
 * `Sec-Fetch-Site: same-origin`, or, from a browser that sends none, an
 * `Origin` equal to this service's own. Neither, and it is refused.
 *
 * @param {IncomingHttpHeaders} headers The request's headers
 * @param {string} ownOrigin This service's origin
 * @return {boolean} Whether it is same-origin
 */
export function sameOrigin(headers: IncomingHttpHeaders, ownOrigin: string): boolean {
  const site = headers["sec-fetch-site"];
  if (site !== undefined) return site === "same-origin";
  return headers.origin === ownOrigin;
}
