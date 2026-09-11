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
    /**
     * One accent hue, and it is light's own red moved onto a dark ground.
     *
     * This spent three unrelated hues until D106 -- a blue `primary`, a purple
     * `secondary` and a soft red `accent` -- so the control a user meets on
     * every button was not even the same hue family as light's. Design language
     * section 3 is explicit that a theme "changes values, warmth and ornament
     * strength -- never the number of accents", and section 13 lists needing a
     * second accent as a signal the design is wrong.
     *
     * `#EA9C90` is `#8C1D1D` lifted until it clears 4.5:1 on the lightest
     * content ground, hue held. It reads as a warm brick rather than a pink,
     * which a straight HLS lift of the same red does not.
     */
    color: {
      primary: '#EA9C90', // 5.11:1 on the worst content ground
      // The higher-contrast value of the same hue. Light's `#6E1717` is darker
      // than its `#8C1D1D` because darker gains contrast on a light page; here
      // lighter does. The relationship is mirrored, not the direction (D104).
      secondary: '#F1BEB7',
      accent: '#EA9C90', // The same red, as light's `accent` is its `primary`
      // A warm grey, because light's `emphasis` is a neutral (#9A9082) and not
      // a third hue. This was `#F28B82`, a second red.
      emphasis: '#B3A99A',
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
    /**
     * Status mirrors light's own spend, which is not literally "one status
     * hue": light uses its accent red for `general`, `active` and `failed`, a
     * green for `completed` and a gold for `unknown`. Dark now does the same,
     * where it used to spend a blue on `general` and `active` -- the accent
     * hue doubling as a status, which section 3 forbids in as many words.
     *
     * `active` and `failed` therefore share a colour, in both themes. That is
     * safe because section 2's last principle holds: nothing is encoded by
     * colour alone, and a status is always also the word.
     */
    status: {
      general: '#EA9C90', // The accent, as light's is
      active: '#EA9C90',
      // Lifted from #3FB950, hue and saturation held. D56 tuned it against the
      // old, darker grounds; D104's retune lightened `card` enough that it fell
      // to 4.38 as text.
      completed: '#40BD52', // Green for completed status, legible as a word (D56, D104)
      failed: '#EA9C90', // The accent, as light's is. Was #F98383, a second red
      unknown: '#deaf21', // Yellowish-gold for unknown status
      on: '#1B1710', // Warm near-black ink on a FILLED status chip; 7.32-8.72:1 on the three
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
      // The focus ring is the accent, as light's is. This was `#60a5fa`, a
      // bright blue -- a hue the theme spent nowhere else and the fourth in a
      // theme the handoff counted three in. It is the blue a user sees on every
      // focused field (D106).
      borderFocus: '#EA9C90',
      ringFocus: 'rgba(234, 156, 144, 0.35)', // The accent at light's own ring alpha
      // A more saturated value of the accent hue, the way light's `#B3261E` is
      // to its `#8C1D1D`. Was `#ef4444`, a generic red belonging to no family.
      errorBorder: '#F58776',
      errorFocus: '#F58776',
      errorRing: 'rgba(245, 135, 118, 0.4)',
      successBorder: '#40BD52', // The `completed` green, not a generic `#10b981`
      successFocus: '#40BD52',
      successRing: 'rgba(64, 189, 82, 0.4)',
      disabledBg: '#2A261F', // Follows sunken -- a disabled field recedes
      labelText: '#E9E3D7', // The content ink, as light's is
      helperText: '#B1ADA6', // page.onMuted, as light's is
      errorText: '#EA9C90', // The accent, as light's `errorText` is its own accent
      successText: '#5FCB6E', // The completed green, lifted for text headroom (5.43:1)
    },
    action: {
      primary: {
        bg: '#EA9C90', // The accent
        text: '#1B1710', // Warm near-black on the accent, 8.21:1
        hover: '#E58576', // Deeper on hover, as light's `#761818` is to `#8C1D1D`
      },
      secondary: {
        // A NEUTRAL fill, not a hue. Light's secondary button is `#3F3A32`, a
        // warm dark neutral on a light page; dark's is a warm light neutral on
        // a dark one. It was `#BB86FC`, a purple, which was the whole of dark's
        // second accent.
        bg: '#55514A',
        text: '#E9E3D7', // 6.17:1
        hover: '#615D55',
      },
      link: {
        bg: 'transparent',
        text: '#EA9C90', // The accent, as light's link is
        hover: '#F0BBB2', // Gains contrast on hover; light darkens for the same reason
      },
      outline: {
        bg: 'transparent',
        text: '#F1BEB7', // `color.secondary`, exactly as light's outline text is its own
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
      deleteText: '#EA9C90', // The accent, as light's `deleteText` is its own
      deleteHover: 'rgba(234, 156, 144, 0.12)', // A wash of its own ink, as light does with its red
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
