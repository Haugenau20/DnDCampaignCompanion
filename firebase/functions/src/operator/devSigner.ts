// functions/src/operator/devSigner.ts
//
// Signs identity headers the way Identity-Aware Proxy does, with a key pair
// made on the spot: for `dev.ts` and the tests only. `.dockerignore` keeps it
// out of the image, and nothing in production could use it anyway: the
// production verifier trusts Google's published keys and nothing else.

import {KeyObject, generateKeyPairSync, sign} from "node:crypto";
import {IAP_ISSUER, PublicKeys} from "./http/identity";

/** What a dev header claims; anything left out takes a sensible value. */
export interface DevClaims {
  sub: string;
  email: string;
  aud: string;
  iss?: string;
  /** Seconds since the epoch. */
  iat?: number;
  exp?: number;
  /** The header's algorithm; for tests of a wrong one. */
  alg?: string;
  kid?: string;
}

/** A throwaway signer and the keys that verify it. */
export interface DevSigner {
  kid: string;
  /** The public keys, as `IdentityConfig.keys` returns them. */
  keys: PublicKeys;
  /** A signed `x-goog-iap-jwt-assertion`. */
  assertion: (claims: DevClaims) => string;
}

/**
 * One header, signed.
 *
 * @param {KeyObject} privateKey The key
 * @param {string} kid Its id
 * @param {DevClaims} claims What it says
 * @return {string} The compact JWT
 */
function signAssertion(privateKey: KeyObject, kid: string, claims: DevClaims): string {
  const now = Math.floor(Date.now() / 1000);
  const header = {alg: claims.alg ?? "ES256", typ: "JWT", kid: claims.kid ?? kid};
  const payload = {
    iss: claims.iss ?? IAP_ISSUER,
    aud: claims.aud,
    sub: claims.sub,
    email: claims.email,
    iat: claims.iat ?? now,
    exp: claims.exp ?? now + 600,
  };
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const signed = `${encode(header)}.${encode(payload)}`;
  const signature = sign("sha256", Buffer.from(signed), {key: privateKey, dsaEncoding: "ieee-p1363"});
  return `${signed}.${signature.toString("base64url")}`;
}

/**
 * A new ES256 key pair and a signer for it.
 *
 * @param {string} kid The key id the headers name
 * @return {DevSigner} The signer
 */
export function createDevSigner(kid = "dev-key"): DevSigner {
  const {publicKey, privateKey} = generateKeyPairSync("ec", {namedCurve: "prime256v1"});
  return {
    kid,
    keys: {[kid]: publicKey.export({type: "spki", format: "pem"}).toString()},
    assertion: (claims) => signAssertion(privateKey, kid, claims),
  };
}
