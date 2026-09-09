// src/core/themes/definitions/lightTheme.ts
import { Theme } from '../types';

/**
 * Light theme, finish 3a: accents concentrated in the chrome -- the interior you scan every session stays quiet.
 *
 * A warm ivory page that reads as paper rather than screen, a near-black
 * chrome and hero band carrying the value contrast, and one deep red accent
 * for things you can act on. Only values are tuned here; the token structure
 * is Phase 1's and is untouched.
 *
 * Every hue was checked against the contrast rules before being written -- see
 * the generator recorded in the drift log.
 */
export const lightTheme: Theme = {
  name: 'light',
  tokens: {
    color: {
      primary: '#8C1D1D',
      secondary: '#6E1717',
      heading: '#241F1B',
      accent: '#8C1D1D',
      emphasis: '#9A9082',
    },
    surface: {
      page: {
        bg: '#F3EFE6',
        on: '#241F1B',
        onMuted: '#655C50',
        border: '#E2DACB',
        hover: '#E7E0D2',
        selected: '#DCD2BF',
      },
      card: {
        bg: '#FCFAF6',
        on: '#241F1B',
        onMuted: '#655C50',
        border: '#E6DFD1',
        hover: '#F0EADC',
        selected: '#E4DBC9',
      },
      sunken: {
        bg: '#EAE3D6',
        on: '#241F1B',
        onMuted: '#5F564A',
        border: '#DBD2C1',
        hover: '#E2DACA',
        selected: '#D6CCB8',
      },
      chrome: {
        bg: '#17140F',
        on: '#F5F1E8',
        onMuted: '#A79E90',
        hover: 'rgba(255, 255, 255, 0.08)',
        selected: 'rgba(255, 255, 255, 0.14)',
        border: '#2B2620',
      },
      band: {
        bg: '#211C16',
        on: '#F5F1E8',
        onMuted: '#B3A99A',
        border: '#332C24',
        hover: 'rgba(255, 255, 255, 0.08)',
        selected: 'rgba(255, 255, 255, 0.14)',
      },
    },
    status: {
      general: '#8C1D1D',
      completed: '#46663A',
      failed: '#8C1D1D',
      unknown: '#A67C1F',
      on: '#FFFFFF',
      active: '#8C1D1D',
    },
    state: {
      hoverLight: '#E7E0D2',
      hoverMedium: '#DCD2BF',
      selected: '#E4DBC9',
    },
    icon: {
      bg: '#E7E0D2',
      border: '#C9BCA3',
    },
    field: {
      bg: '#FCFAF6',
      placeholder: '#8A8072',
      border: '#8B8375',
      borderFocus: '#8C1D1D',
      ringFocus: 'rgba(140, 29, 29, 0.35)',
      errorBorder: '#B3261E',
      errorFocus: '#B3261E',
      errorRing: 'rgba(179, 38, 30, 0.4)',
      successBorder: '#46663A',
      successFocus: '#46663A',
      successRing: 'rgba(70, 102, 58, 0.4)',
      disabledBg: '#EDE7DA',
      labelText: '#241F1B',
      helperText: '#655C50',
      errorText: '#8C1D1D',
      successText: '#3C5A31',
    },
    action: {
      primary: {
        bg: '#8C1D1D',
        text: '#FDFBF7',
        hover: '#761818',
      },
      secondary: {
        bg: '#3F3A32',
        text: '#FDFBF7',
        hover: '#2E2A24',
      },
      link: {
        bg: 'transparent',
        text: '#8C1D1D',
        hover: '#761818',
      },
      outline: {
        bg: 'transparent',
        text: '#6E1717',
        hover: '#EFE7D9',
        border: '#8F7C63',
      },
      ghost: {
        bg: 'transparent',
        text: '#4A423A',
        hover: '#E7E0D2',
      },
    },
    danger: {
      bg: 'transparent',
      deleteBg: 'transparent',
      deleteText: '#8C1D1D',
      deleteHover: 'rgba(140, 29, 29, 0.10)',
    },
    font: {
      primary: 'Inter, sans-serif',
      secondary: 'system-ui, sans-serif',
      heading: 'Newsreader, Georgia, serif',
    },
    border: {
      radius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
      },
      width: {
        sm: '1px',
        md: '2px',
        lg: '4px',
      },
    },
    entityPalette: [
      '#75504D',
      '#6D563C',
      '#5A5E3E',
      '#416451',
      '#366368',
      '#455D76',
      '#5D5574',
      '#6E5064',
    ],
    entityInk: '#F5F1E8',
  },
};
