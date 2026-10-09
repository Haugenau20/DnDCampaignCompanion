// functions/src/operator/config.ts
//
// The production service's configuration, all of it from the environment
// Cloud Run sets (design, "The service"). Anything missing stops the process
// at start: there is no default that admits (security architecture,
// principle 7).

/** What `main.ts` runs with. */
export interface OperatorConfig {
  /** Google's `sub` of every operator. */
  subjects: Set<string>;
  /** `/projects/{number}/locations/europe-west1/services/operator`. */
  audience: string;
  /** The site founder links point at. */
  siteOrigin: string;
  /** The CSRF key, from Secret Manager. */
  csrfKey: Buffer;
  port: number;
}

/** The fewest bytes a CSRF key may have. */
const CSRF_KEY_MIN_BYTES = 32;

/**
 * Whether `value` is an https origin and nothing more.
 *
 * @param {string} value The setting
 * @return {boolean} Whether it is one
 */
function isHttpsOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === value;
  } catch {
    return false;
  }
}

/**
 * The configuration, or every reason it is not usable.
 *
 * @param {NodeJS.ProcessEnv} env The environment
 * @return {OperatorConfig} The configuration
 * @throws {Error} Naming everything missing or wrong
 */
export function readConfig(env: NodeJS.ProcessEnv): OperatorConfig {
  const problems: string[] = [];

  const subjects = new Set((env.OPERATOR_SUBJECTS ?? "")
    .split(",").map((sub) => sub.trim()).filter(Boolean));
  if (subjects.size === 0) problems.push("OPERATOR_SUBJECTS names no operator");

  const audience = (env.IAP_AUDIENCE ?? "").trim();
  if (!/^\/projects\/\d+\/locations\/[a-z0-9-]+\/services\/[a-z0-9-]+$/.test(audience)) {
    problems.push("IAP_AUDIENCE is not /projects/{number}/locations/{region}/services/{name}");
  }

  const siteOrigin = (env.SITE_ORIGIN ?? "").trim();
  if (!isHttpsOrigin(siteOrigin)) problems.push("SITE_ORIGIN is not an https origin");

  const csrfKey = Buffer.from((env.OPERATOR_CSRF_KEY ?? "").trim(), "base64");
  if (csrfKey.length < CSRF_KEY_MIN_BYTES) {
    problems.push(`OPERATOR_CSRF_KEY is not ${CSRF_KEY_MIN_BYTES} or more bytes, base64`);
  }

  const port = Number(env.PORT ?? "8080");
  if (!Number.isInteger(port) || port <= 0 || port > 65535) problems.push("PORT is not a port");

  if (problems.length > 0) {
    throw new Error(`The operator service is not configured: ${problems.join("; ")}.`);
  }
  return {subjects, audience, siteOrigin, csrfKey, port};
}
