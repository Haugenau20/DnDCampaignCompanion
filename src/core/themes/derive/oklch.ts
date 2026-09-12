// src/core/themes/derive/oklch.ts
// OKLCH to sRGB, and the two measurements the contract is solved against.
//
// Lightness is the input to this phase, so the conversion has to be exact
// rather than approximately right: every value in both themes is produced
// here and checked against an independently authored fixture.

/** A colour in the authored space: lightness 0-1, chroma, hue in degrees. */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

type Rgb = readonly [number, number, number];

/** OKLab to linear sRGB. Channels may fall outside 0-1; the caller decides. */
const oklchToLinearRgb = ({ l, c, h }: Oklch): Rgb => {
  const radians = (h * Math.PI) / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);

  const lCube = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mCube = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sCube = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube,
    -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube,
    -0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube,
  ];
};

/**
 * The sRGB transfer function, extended linearly below zero.
 *
 * The extension is not cosmetic: the gamut test below asks how far outside the
 * range a channel is, and the standard curve is undefined for negatives.
 */
const encode = (linear: number): number =>
  linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;

/** Half of one 8-bit step, in encoded units. */
const HALF_STEP = 0.5 / 255;

/**
 * Whether a colour survives the trip to an sRGB byte triple.
 *
 * The test is representability, not mathematical containment: a channel that
 * encodes to -0.001 still rounds to 0 and is reproduced exactly, so rejecting
 * it would discard chroma the display can show. The tolerance is therefore
 * half an 8-bit step rather than an arbitrary epsilon.
 */
const isRepresentable = (colour: Oklch): boolean =>
  oklchToLinearRgb(colour).every((linear) => {
    const encoded = linear > 0 ? encode(linear) : 12.92 * linear;
    return encoded >= -HALF_STEP && encoded <= 1 + HALF_STEP;
  });

/**
 * The largest chroma at this lightness and hue that sRGB can show.
 *
 * **Chroma is reduced, never clipped.** Clipping a channel moves the hue --
 * an out-of-gamut orange clips its blue to zero and arrives somewhere else --
 * which would silently break the one property the whole schema rests on, that
 * a role is the same hue in both modes.
 */
const fitChroma = (colour: Oklch): number => {
  if (isRepresentable(colour)) return colour.c;

  let low = 0;
  let high = colour.c;
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    if (isRepresentable({ ...colour, c: mid })) low = mid;
    else high = mid;
  }
  return low;
};

const toByte = (linear: number): number =>
  Math.round(Math.min(1, Math.max(0, encode(linear))) * 255);

/** `#RRGGBB`, upper case, chroma-reduced into gamut first. */
export const oklchToHex = (colour: Oklch): string => {
  const fitted = { ...colour, c: fitChroma(colour) };
  return `#${oklchToLinearRgb(fitted)
    .map((linear) => toByte(linear).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
};

const parseHex = (hex: string): Rgb => {
  const body = hex.replace(/^#/, "");
  return [0, 2, 4].map((i) => parseInt(body.slice(i, i + 2), 16)) as unknown as Rgb;
};

const relativeLuminance = (hex: string): number => {
  const [r, g, b] = parseHex(hex).map((byte) => {
    const channel = byte / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio between two opaque hex colours. */
export const contrastRatio = (a: string, b: string): number => {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

/** `#8D4F00` at 0.35 becomes `rgba(141, 79, 0, 0.35)`. */
export const withAlpha = (hex: string, alpha: number): string =>
  `rgba(${parseHex(hex).join(", ")}, ${alpha})`;
