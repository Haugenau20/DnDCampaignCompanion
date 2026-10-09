// functions/src/operator/http/html.ts
//
// The one way the operator page builds HTML (T137). Every value interpolated
// into `html` is escaped unless it is itself `html`, so a string a player
// chose -- an email, a note -- can never become markup: the operator is the
// most valuable person to attack through this page (stored XSS, T6).

/** Markup this module built, safe to put into more markup. */
export class SafeHtml {
  /** @param {string} value The markup */
  constructor(readonly value: string) {}

  /** @return {string} The markup */
  toString(): string {
    return this.value;
  }
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

/**
 * A string as text, safe in an element and in a quoted attribute.
 *
 * @param {string} text Anything
 * @return {string} The text, escaped
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'`]/g, (char) => ESCAPES[char]);
}

/**
 * One interpolated value: markup as it is, a list item by item, nothing for
 * null, undefined or false, and anything else escaped as text.
 *
 * @param {unknown} value What was interpolated
 * @return {string} Its markup
 */
function render(value: unknown): string {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  if (value === null || value === undefined || value === false) return "";
  return escapeHtml(String(value));
}

/**
 * The template tag every page uses.
 *
 * @param {TemplateStringsArray} strings The literal parts
 * @param {unknown[]} values The interpolated values
 * @return {SafeHtml} The markup
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0];
  values.forEach((value, index) => {
    out += render(value) + strings[index + 1];
  });
  return new SafeHtml(out);
}
