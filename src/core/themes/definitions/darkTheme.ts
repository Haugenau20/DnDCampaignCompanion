// src/core/themes/definitions/darkTheme.ts
import { Theme } from '../types';

/**
 * Dark theme, tuned to the pair model in Phase 11 (D104).
 *
 * Before this it had every token the model asks for and filled them the way it
 * did before the model existed: all five surfaces shared one ink, one muted
 * grey, one border and one pair of state overlays, with only `bg` varying.
 * `chrome` and `page` measured **1.03:1** against light's 16:1, so the frame
 * the design language calls the identity simply was not there, and `band` was
 * the same hex as `sunken`, so the hero had no value of its own.
 *
 * Two things decide every value below.
 *
 * **The structure is light's, not its numbers.** Light is the worked example:
 * surfaces run `chrome < band << sunken < page < card`, the frame carries the
 * value contrast, the content surfaces cluster, and `card` is the lightest and
 * calmest because it is what you read. Dark keeps that order and that job
 * split. What it cannot keep is the span -- two dark surfaces cannot sit 16:1
 * apart -- so `page`/`chrome` lands at **1.51:1**, which is deliberately well
 * clear of the 1.08-1.12 that GitHub, VS Code and Slack spend on the same
 * separation, because a strong frame is this product's identity and not a
 * default.
 *
 * **The warmth is light's too.** Design language section 3: "the warmth of the
 * page against the neutrality of the chrome *is* the identity". Dark used to be
 * a cool blue-slate family, so switching themes changed the product's
 * temperature. Every ground, ink, hairline and neutral below sits on light's
 * own warm axis -- R > G > B at very low chroma -- so dark now reads as the
 * same record, at night.
 *
 * The accent hues are deliberately NOT touched here. Dark spends three where
 * the design language allows one, and that is 11-3's job; mixing it in would
 * make this retune unreviewable.
 */
export const darkTheme: Theme = {
  name: 'dark',
  tokens: {
    scheme: 'dark',
    color: {
      primary: '#8AB4F8', // Soft blue for primary elements -- 11-3 reduces the three hues to one
      secondary: '#BB86FC', // Muted purple for secondary elements -- 11-3
      accent: '#F28B82', // Soft red for accents -- 11-3
      emphasis: '#F28B82', // Soft red for important highlights -- 11-3
      // Matches the content ink rather than being pure white, exactly as light
      // does (its `heading` and its content `on` are both #241F1B). #FFFFFF on
      // a warm dark ground glares and belongs to no family here.
      heading: '#E9E3D7',
    },
    /**
     * Five surfaces, each carrying its own four roles.
     *
     * Two values are shared, both mirroring light and both for light's reason:
     *
     *  - `on` comes in two families -- one ink for the content surfaces you read
     *    (page/card/sunken) and a brighter one for the frame (chrome/band).
     *    Light splits it the same way, though there the frame *inverts*. Here
     *    every ground is dark, so both families are light ink; they stay two
     *    values because the frame sits deeper and can run brighter without
     *    glare, while the content ink is the one you read at length.
     *  - `hover` is one value across chrome and band, as in light.
     *
     * Everything else -- five `onMuted`, five `border`, five `selected` -- is
     * distinct per surface, which is the whole point of the pair model: a muted
     * ink that passes on `card` may fail on `sunken`, and only a pair makes that
     * checkable.
     *
     * State overlays follow light's split too: the content surfaces take
     * **opaque** tints and the frame takes **translucent white**. That is not
     * decoration -- the band carries imagery (design language section 6), and an
     * opaque tint would paint over it.
     */
    surface: {
      page: {
        bg: '#343029', // Warm dark paper -- the ground everything sits on
        on: '#E9E3D7', // Content ink. 10.27:1
        onMuted: '#B1ADA6', // 5.87:1, inside light's own 5.6-7.3 band
        border: '#4C4841', // Hairline, 1.44:1 -- steps toward the ink, as light's do
        hover: '#3D3932',
        selected: '#46423B',
      },
      card: {
        bg: '#3F3B35', // The lightest surface: what you read, and the calmest
        on: '#E9E3D7', // 8.70:1 -- the tightest text pair in the theme, still well clear of AA
        onMuted: '#BDB9B2', // 5.69:1
        border: '#55514A', // 1.41:1
        hover: '#48443E',
        selected: '#514D47',
      },
      sunken: {
        bg: '#2A261F', // Recessed from page and card, as light's is
        on: '#E9E3D7', // 11.78:1
        onMuted: '#A9A59E', // 6.14:1 -- its own value; on a darker ground the muted ink follows
        border: '#45413A', // 1.48:1
        hover: '#332F28',
        selected: '#3C3831',
      },
      chrome: {
        bg: '#0D0A05', // The frame. Deep warm near-black, 1.51:1 from the page
        on: '#F5EFE3', // Frame ink, 17.26:1
        onMuted: '#9D9992', // 6.97:1
        border: '#36322B', // 1.55:1
        hover: 'rgba(255, 255, 255, 0.08)', // Translucent: the frame may sit over imagery
        selected: 'rgba(255, 255, 255, 0.15)', // Deeper ground than card, so a stronger overlay
      },
      band: {
        bg: '#1E1A14', // The hero: its own value at last, no longer sunken's hex
        on: '#F5EFE3', // 15.12:1
        onMuted: '#ACA8A1', // 7.31:1
        border: '#3D3932', // 1.51:1
        hover: 'rgba(255, 255, 255, 0.08)',
        selected: 'rgba(255, 255, 255, 0.14)',
      },
    },
    status: {
      general: '#8AB4F8', // Soft blue for general status
      active: '#8AB4F8', // Soft blue for active status
      // Lifted from #3FB950 / #F87171, hue and saturation held. D56 tuned those
      // against the old, darker grounds; the retune lightens `card` enough that
      // both fell to 4.38 and 4.02 as text. Both now clear 4.56 on the worst of
      // page/card/sunken -- the same fix D56 made, for the same reason (D104).
      completed: '#40BD52', // Green for completed status, legible as a word (D56, D104)
      failed: '#F98383', // Red for failed status, legible as a word (D56, D104)
      unknown: '#deaf21', // Yellowish-gold for unknown status
      on: '#121212', // Near black for status text on a filled status chip
    },
    state: {
      // These three are the GLOBAL state tokens, used where no surface pair
      // applies. They stay translucent in dark on purpose: a global token does
      // not know its ground, and a white overlay is right on any of the five
      // dark grounds where an opaque page tint would be wrong on chrome. Light
      // can afford opaque values here because its content surfaces are all
      // near-white.
      hoverLight: 'rgba(255, 255, 255, 0.05)',
      hoverMedium: 'rgba(255, 255, 255, 0.1)',
      selected: '#46423B', // Was #3B3B52, a cool slate that belonged to no family here
    },
    icon: {
      bg: '#3D3932', // Follows page.hover, as light's follows its own
      border: '#6A655C',
    },
    field: {
      bg: '#3F3B35', // Equals card.bg, exactly as light's equals its card -- the border defines the control
      placeholder: '#ADA8A0', // 4.71:1. See the note in the drift log: light's own is 3.72 and fails AA
      border: '#8C877E', // 3.11:1 against the worst of page/card -- clears WCAG 1.4.11
      borderFocus: '#60a5fa', // Bright blue for focused input border
      ringFocus: 'rgba(59, 130, 246, 0.5)', // Semi-transparent blue for focus ring
      errorBorder: '#ef4444', // Bright red for error border
      errorFocus: '#ef4444', // Bright red for focused error border
      errorRing: 'rgba(239, 68, 68, 0.5)', // Semi-transparent red for error focus ring
      successBorder: '#10b981', // Bright green for success border
      successFocus: '#10b981', // Bright green for focused success border
      successRing: 'rgba(16, 185, 129, 0.5)', // Semi-transparent green for success focus ring
      disabledBg: '#2A261F', // Follows sunken -- a disabled field recedes
      labelText: '#E9E3D7', // The content ink, as light's is
      helperText: '#B1ADA6', // page.onMuted, as light's is
      errorText: '#f87171', // Soft red for error text
      successText: '#34d399', // Bright green for success text
    },
    action: {
      primary: {
        bg: '#8AB4F8', // 11-3 owns the hue
        text: '#1B1710', // Warm near-black on the accent, 8.47:1
        hover: '#729DE3',
      },
      secondary: {
        bg: '#BB86FC', // 11-3 owns the hue
        text: '#1B1710', // 6.74:1
        hover: '#9E6EDC',
      },
      link: {
        bg: 'transparent',
        text: '#8AB4F8',
        hover: '#A0C4FF',
      },
      outline: {
        bg: 'transparent',
        text: '#E9E3D7', // The content ink
        hover: '#48443E', // card.hover -- an outline button usually sits on a card
        border: '#9A9189', // 3.59:1, clears WCAG 1.4.11 for a boundary that identifies a control
      },
      ghost: {
        bg: 'transparent',
        text: '#B1ADA6', // page.onMuted
        hover: '#3D3932', // page.hover, as light's ghost follows its own
      },
    },
    danger: {
      bg: 'transparent',
      deleteBg: 'transparent',
      deleteText: '#F87171', // Soft red for delete button text
      deleteHover: 'rgba(248, 113, 113, 0.12)', // A wash of its own ink, as light does with its red
    },
    font: {
      primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', // Clean sans-serif for primary text
      secondary: 'system-ui, sans-serif', // System default sans-serif for secondary text
      heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', // Clean sans-serif for headings
    },
    border: {
      radius: {
        sm: '0.25rem', // Small border radius for subtle rounding
        md: '0.375rem', // Medium border radius for moderate rounding
        lg: '0.5rem', // Large border radius for significant rounding
      },
      width: {
        sm: '1px', // Thin border width for subtle outlines
        md: '2px', // Medium border width for moderate outlines
        lg: '4px', // Thick border width for strong outlines
      },
    },
    // Eight hues at one OKLCH lightness and chroma, hue angle the only
    // variable. Order is the contract: a mark's hue comes from its index.
    // Unchanged by the retune -- they are already a tuned ramp, and they sit
    // 7.19:1 from the ink below at a spread of 0.44.
    entityPalette: [
      '#68413E',
      '#60482B',
      '#4C512D',
      '#315643',
      '#22565B',
      '#354F6A',
      '#4F4768',
      '#614157',
    ],
    entityInk: '#F5EFE3', // The frame ink. Was #E8ECF2, the last cool value in the theme
  },
};
