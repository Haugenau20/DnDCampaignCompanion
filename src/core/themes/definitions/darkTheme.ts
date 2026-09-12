// src/core/themes/definitions/darkTheme.ts
// Torchlight Forge, dark mode.
//
// The same contract as light, at a different lightness ramp. The two files
// being this short is the point: a mode that can only supply lightness cannot
// drift into Material blue and a sans heading the way this one had.

import { Theme } from '../types';
import { deriveTokens } from '../derive';

export const darkTheme: Theme = {
  name: 'dark',
  tokens: deriveTokens('dark'),
};
