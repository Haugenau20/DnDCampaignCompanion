// functions/src/operator/http/identity.ts
//
// The service checks who Identity-Aware Proxy let through, on every request
// (security architecture, section 3). IAP is the first gate; this is the
// second, so a request is refused even if IAP were switched off and a public
// invoker added. The verification is google-auth-library's, Google's
// documented path; around it, this file insists on what the documentation
// leaves to the caller: the algorithm, a 30-second clock, and a subject on
// the service's own list.

import {OAuth2Client} from "google-auth-library";
import type {OperatorIdentity} from "../audit";

/** The header IAP signs. */
export const IAP_HEADER = "x-goog-iap-jwt-assertion";

/** Who signs it. */
export const IAP_ISSUER = "https://cloud.google.com/iap";

/** How far `exp` and `iat` may sit from the service's clock. */
export const CLOCK_SKEW_SECONDS = 30;

/** Public keys by key id, as PEM. */
export type PublicKeys = Record<string, string>;

/** What the check needs. Production takes all of it from its configuration. */
export interface IdentityConfig {
  /** `/projects/{number}/locations/europe-west1/services/operator`. */
  audience: string;
  /** Google's `sub` of every operator; an email can change hands. */
  subjects: ReadonlySet<string>;
  /** The signing keys; asked again when a key id is unknown. */
  keys: (kid: string) => Promise<PublicKeys>;
  /** The clock, in milliseconds; for the tests. */
  now?: () => number;
}

/** Whom a request proved to be, or why it proved nothing. */
export type IdentityResult =
  | {ok: true; operator: OperatorIdentity}
  | {ok: false; status: 401 | 403; reason: string; operator: OperatorIdentity | null};

/**
 * A JWT segment, decoded as JSON, or null.
 *
 * @param {string} segment A base64url segment
 * @return {Record<string, unknown> | null} Its JSON
 */
function decodeSegment(segment: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
    return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

const verifier = new OAuth2Client();

/**
 * Check the IAP header of one request.
 *
 * The library's own messages hold the token, so none of them is passed on:
 * a refusal says only which check failed.
 *
 * @param {string | string[] | undefined} header The header's value
 * @param {IdentityConfig} config What to check against
 * @return {Promise<IdentityResult>} The operator, or why not
 */
export async function verifyIdentity(
  header: string | string[] | undefined,
  config: IdentityConfig
): Promise<IdentityResult> {
  const refuse = (reason: string): IdentityResult =>
    ({ok: false, status: 401, reason, operator: null});

  if (typeof header !== "string" || header.length === 0) return refuse("no identity");
  const segments = header.split(".");
  if (segments.length !== 3) return refuse("malformed identity");
  const envelope = decodeSegment(segments[0]);
  if (!envelope) return refuse("malformed identity");
  if (envelope.alg !== "ES256") return refuse("wrong algorithm");
  if (typeof envelope.kid !== "string") return refuse("no key id");

  let keys: PublicKeys;
  try {
    keys = await config.keys(envelope.kid);
  } catch {
    return refuse("signing keys unavailable");
  }

  let payload: Record<string, unknown>;
  try {
    const ticket = await verifier.verifySignedJwtWithCertsAsync(
      header, keys, config.audience, [IAP_ISSUER]
    );
    payload = (ticket.getPayload() ?? {}) as Record<string, unknown>;
  } catch {
    return refuse("invalid identity");
  }

  // The library allows five minutes either way; IAP's own guidance is less.
  const now = (config.now ?? Date.now)() / 1000;
  if (Number(payload.exp) < now - CLOCK_SKEW_SECONDS) return refuse("expired identity");
  if (Number(payload.iat) > now + CLOCK_SKEW_SECONDS) return refuse("identity from the future");

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email : "";
  if (!sub) return refuse("no subject");
  const operator = {email, sub};
  if (!config.subjects.has(sub)) {
    return {ok: false, status: 403, reason: "not an operator", operator};
  }
  return {ok: true, operator};
}

/** How long fetched keys are trusted before they are fetched again. */
const KEY_CACHE_MS = 60 * 60 * 1000;

/** The least time between two fetches for an unknown key id. */
const KEY_REFRESH_MS = 60 * 1000;

/**
 * IAP's published signing keys, cached, and fetched again when they are an
 * hour old or a token names a key id they lack (they rotate), at most once a
 * minute so a stream of forged key ids cannot make the service hammer
 * Google.
 *
 * @param {Function} fetchKeys Where the keys come from; Google's, unless a test says
 * @return {Function} The `keys` an `IdentityConfig` takes
 */
export function iapKeyStore(
  fetchKeys: () => Promise<PublicKeys> = async () =>
    (await verifier.getIapPublicKeys()).pubkeys as PublicKeys,
  now: () => number = Date.now
): (kid: string) => Promise<PublicKeys> {
  let cached: PublicKeys | null = null;
  let fetchedAt = 0;
  return async (kid) => {
    const age = now() - fetchedAt;
    const stale = cached === null || age > KEY_CACHE_MS;
    const unknown = cached !== null && !(kid in cached) && age > KEY_REFRESH_MS;
    if (stale || unknown) {
      cached = await fetchKeys();
      fetchedAt = now();
    }
    return cached as PublicKeys;
  };
}
