// src/core/themes/derive/role-map.ts
// The other 61 leaves, transcribed from design/colour-schema.md section 5.4.
//
// Sections 5.1-5.3 generate 91 primitives. This says which primitive each
// remaining token name resolves to.
//
// **A role is a derivation, not an alias.** `action.primary.bg` does not point
// at a variable named `accent` -- it *is* the accent, resolved here to a
// literal value in the theme tree. Nothing in the running application indirects
// through a second name, because an alias is a second way to say what a pair
// already says, and it outlives the migration it was meant to enable.
//
// Three rules govern the table, and all three are the schema's:
//   1. No role introduces a value. Every entry is a primitive or a literal.
//      A token that seems to need a colour no primitive provides means the
//      contract is incomplete -- raise it, never invent a hex.
//   2. A borrowed role is re-verified against its new ground. See
//      `verifyBorrowedRoles` in `generate.ts`.
//   3. "Retired" means deleted, not aliased. Entries marked `12-3` resolve
//      here so that no commit is broken, and are removed with their consumers.

/** Where a token's value comes from: a primitive path, or a literal. */
export type Role =
  | { from: string; retire?: string }
  | { literal: string; retire?: string };

/**
 * Token path to role. Keys are dotted paths into the theme tree; `from` values
 * are dotted paths into the primitives that section 5.1-5.3 generate.
 */
export const ROLE_MAP: Readonly<Record<string, Role>> = {
  // Legacy `color.*`. Three of the five are retired in 12-3.
  "color.primary": { from: "accent.base", retire: "12-3" },
  "color.secondary": { from: "accent.hover", retire: "12-3" },
  "color.accent": { from: "accent.base", retire: "12-3" },
  // Was #9A9082 at 2.7:1. Taking the page's muted ink fixes it.
  "color.emphasis": { from: "surface.page.onMuted" },
  "color.heading": { from: "surface.page.on" },

  // Legacy `status.*`. All six go in 12-3, with their consumers, and are
  // replaced by scales named after meaning rather than appearance.
  "status.general": { from: "surface.card.onMuted", retire: "12-3" },
  "status.active": { from: "accent.base", retire: "12-3" },
  "status.completed": { from: "outcome.succeeded", retire: "12-3" },
  "status.failed": { from: "outcome.failedInk", retire: "12-3" },
  "status.unknown": { from: "knowledge.0", retire: "12-3" },
  "status.on": { from: "accent.on", retire: "12-3" },

  // Legacy `state.*`. A global hover grey is exactly what the pair model
  // forbids: a state belongs to the surface it lands on.
  "state.hoverLight": { from: "surface.card.hover", retire: "12-3" },
  "state.hoverMedium": { from: "surface.card.selected", retire: "12-3" },
  "state.selected": { from: "surface.card.selected", retire: "12-3" },

  // Icons. `icon.border` was #C9BCA3 at 1.8:1; it now reuses the neutral that
  // was solved to 3:1 for field borders.
  "icon.bg": { from: "surface.sunken.bg" },
  "icon.border": { from: "neutralBorder" },

  // Form fields, including their validation states.
  "field.bg": { from: "surface.card.bg" },
  "field.placeholder": { from: "placeholder" },
  "field.border": { from: "neutralBorder" },
  "field.borderFocus": { from: "accent.base" },
  "field.ringFocus": { from: "accent.ring" },
  "field.errorBorder": { from: "outcome.failedInk" },
  "field.errorFocus": { from: "outcome.failedInk" },
  "field.errorRing": { from: "outcome.failedRing" },
  "field.successBorder": { from: "outcome.succeeded" },
  "field.successFocus": { from: "outcome.succeeded" },
  "field.successRing": { from: "outcome.successRing" },
  "field.disabledBg": { from: "disabledBg" },
  "field.labelText": { from: "surface.card.on" },
  "field.helperText": { from: "surface.card.onMuted" },
  "field.errorText": { from: "outcome.failedInk" },
  "field.successText": { from: "outcome.succeeded" },

  // Buttons and links.
  "action.primary.bg": { from: "accent.base" },
  "action.primary.text": { from: "accent.on" },
  "action.primary.hover": { from: "accent.hover" },
  "action.secondary.bg": { from: "secondary.bg" },
  "action.secondary.text": { from: "secondary.on" },
  "action.secondary.hover": { from: "secondary.hover" },
  "action.link.bg": { literal: "transparent" },
  "action.link.text": { from: "accent.base" },
  "action.link.hover": { from: "accent.hover" },
  "action.outline.bg": { literal: "transparent" },
  "action.outline.text": { from: "accent.base" },
  "action.outline.hover": { from: "surface.page.hover" },
  // Identifies a control, so 3:1 is verified. Not a decorative hairline.
  "action.outline.border": { from: "neutralBorder" },
  "action.ghost.bg": { literal: "transparent" },
  "action.ghost.text": { from: "surface.page.onMuted" },
  "action.ghost.hover": { from: "surface.page.hover" },

  // Destructive actions. Delete text is the failure red, which is what finally
  // distinguishes it from an ordinary link.
  "danger.bg": { literal: "transparent" },
  "danger.deleteBg": { literal: "transparent" },
  "danger.deleteText": { from: "outcome.failedInk" },
  "danger.deleteHover": { from: "outcome.failedWash" },

  // Type. Identical in both modes: dark shipping a sans heading while light
  // shipped serif was the same class of drift as the colour.
  "font.primary": { literal: "Archivo, system-ui, sans-serif" },
  "font.secondary": { literal: "Archivo, system-ui, sans-serif" },
  "font.heading": { literal: "'Zilla Slab', Georgia, serif" },

  // Geometry, not colour.
  "border.radius.sm": { literal: "0.25rem" },
  "border.radius.md": { literal: "0.375rem" },
  "border.radius.lg": { literal: "0.5rem" },
  "border.width.sm": { literal: "1px" },
  "border.width.md": { literal: "2px" },
  "border.width.lg": { literal: "4px" },
};
