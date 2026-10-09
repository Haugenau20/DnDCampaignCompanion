// functions/src/operator/http/headers.ts
//
// The headers every operator response carries, refusals included
// (security architecture, section 4). The content policy runs no inline
// script and loads nothing from elsewhere, so even an escaping slip runs
// nothing; the rest keeps the page out of frames, caches and referrers.

import type {ServerResponse} from "node:http";

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy":
    "default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; " +
    "form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=63072000",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "",
};

/**
 * Set the security headers on a response, before anything else is decided.
 *
 * @param {ServerResponse} res The response
 */
export function applySecurityHeaders(res: ServerResponse): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
}
