// src/core/themes/definitions/lightTheme.ts
// Torchlight Forge, light mode.
//
// Nothing is authored here. Every value comes from the hue-and-chroma contract
// in docs/design/colour-schema.md section 4; this mode supplies lightness and
// nothing else, so light and dark cannot be two different designs.

import { Theme } from '../types';
import { deriveTokens } from '../derive';

export const lightTheme: Theme = {
  name: 'light',
  tokens: deriveTokens('light'),
};
