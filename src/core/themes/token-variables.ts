// src/core/themes/token-variables.ts
// Turns a nested token object into CSS custom properties.
//
// The map from token path to variable name is mechanical, so a token cannot
// exist without its variable and a variable cannot exist without its token.
// The set is therefore enumerable, which is what makes it checkable against a
// manifest -- see 01-token-model.md section 4.

/** A token tree: nested plain objects with string leaves. */
export type TokenTree = { [key: string]: string | TokenTree };

/**
 * `surface.card.onMuted` -> `--surface-card-on-muted`.
 *
 * Path segments join with `-`, and camelCase inside a segment splits on the
 * same character, so `onMuted` and `on-muted` cannot both appear and mean
 * different things.
 */
export const variableNameFor = (pathSegments: readonly string[]): string =>
  "--" +
  pathSegments
    .map((segment) => segment.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase())
    .join("-");

/**
 * Flattens a token tree to `{ '--variable-name': value }`.
 *
 * Throws on an ambiguous tree rather than resolving it: two paths that derive
 * the same name (`onMuted` alongside `on-muted`) would otherwise let one token
 * silently overwrite another, and the survivor would depend on key order.
 */
export const flattenTokens = (tree: TokenTree): Record<string, string> => {
  const out: Record<string, string> = {};
  const sourcePath: Record<string, string> = {};

  const walk = (node: TokenTree, trail: string[]): void => {
    Object.entries(node).forEach(([key, value]) => {
      const nextTrail = [...trail, key];
      if (typeof value === "string") {
        const name = variableNameFor(nextTrail);
        const joined = nextTrail.join(".");
        if (name in out) {
          throw new Error(
            `Ambiguous token path: "${joined}" and "${sourcePath[name]}" both ` +
              `derive the variable "${name}". Rename one; two paths must never ` +
              `produce one name.`
          );
        }
        out[name] = value;
        sourcePath[name] = joined;
        return;
      }
      walk(value, nextTrail);
    });
  };

  walk(tree, []);
  return out;
};

/** Applies a token tree to an element as inline custom properties. */
export const applyTokens = (tree: TokenTree, element: HTMLElement): void => {
  const flat = flattenTokens(tree);
  Object.entries(flat).forEach(([name, value]) => {
    element.style.setProperty(name, value);
  });
};
