"""Emit lightTheme.ts for a chosen finish.

Verifies the result against the same contrast rules the jest suite enforces and
refuses to write if any fail, so a tuning pass cannot quietly regress
accessibility while chasing a look.
"""
import io
import sys
import copy

SHARED = {
    'color': {'primary': '#8C1D1D', 'secondary': '#6E1717', 'heading': '#241F1B'},
    'surface': {
        'page':   {'bg': '#F3EFE6', 'on': '#241F1B', 'onMuted': '#655C50',
                   'border': '#E2DACB', 'hover': '#E7E0D2', 'selected': '#DCD2BF'},
        'card':   {'bg': '#FCFAF6', 'on': '#241F1B', 'onMuted': '#655C50',
                   'border': '#E6DFD1', 'hover': '#F0EADC', 'selected': '#E4DBC9'},
        'sunken': {'bg': '#EAE3D6', 'on': '#241F1B', 'onMuted': '#5F564A',
                   'border': '#DBD2C1', 'hover': '#E2DACA', 'selected': '#D6CCB8'},
        'chrome': {'bg': '#17140F', 'on': '#F5F1E8', 'onMuted': '#A79E90',
                   'hover': 'rgba(255, 255, 255, 0.08)',
                   'selected': 'rgba(255, 255, 255, 0.14)'},
        'band':   {'bg': '#211C16', 'on': '#F5F1E8', 'onMuted': '#B3A99A',
                   'border': '#332C24', 'hover': 'rgba(255, 255, 255, 0.08)'},
    },
    'status': {'general': '#8C1D1D', 'completed': '#46663A', 'failed': '#8C1D1D',
               'unknown': '#A67C1F', 'on': '#FFFFFF'},
    'state': {'hoverLight': '#E7E0D2', 'hoverMedium': '#DCD2BF', 'selected': '#E4DBC9'},
    'icon': {'bg': '#E7E0D2', 'border': '#C9BCA3'},
    'field': {'bg': '#FCFAF6', 'placeholder': '#8A8072', 'border': '#8B8375',
              'borderFocus': '#8C1D1D', 'ringFocus': 'rgba(140, 29, 29, 0.35)',
              'errorBorder': '#B3261E', 'errorFocus': '#B3261E',
              'errorRing': 'rgba(179, 38, 30, 0.4)', 'successBorder': '#46663A',
              'successFocus': '#46663A', 'successRing': 'rgba(70, 102, 58, 0.4)',
              'disabledBg': '#EDE7DA', 'labelText': '#241F1B', 'helperText': '#655C50',
              'errorText': '#8C1D1D', 'successText': '#3C5A31'},
    'action': {
        'primary':   {'bg': '#8C1D1D', 'text': '#FDFBF7', 'hover': '#761818'},
        'secondary': {'bg': '#3F3A32', 'text': '#FDFBF7', 'hover': '#2E2A24'},
        'link':      {'bg': 'transparent', 'text': '#8C1D1D', 'hover': '#761818'},
        'outline':   {'bg': 'transparent', 'text': '#6E1717', 'hover': '#EFE7D9',
                      'border': '#8F7C63'},
        'ghost':     {'bg': 'transparent', 'text': '#4A423A', 'hover': '#E7E0D2'},
    },
    'danger': {'bg': 'transparent', 'deleteBg': 'transparent', 'deleteText': '#8C1D1D',
               'deleteHover': 'rgba(140, 29, 29, 0.10)'},
    'journal': {'leather': '#6B4A2F', 'binding': '#4E3623', 'stitch': '#D9C5A9',
                'pageShadow': 'rgba(0, 0, 0, 0.06)',
                'sectionDivider': 'rgba(0, 0, 0, 0.10)',
                'characterCardBg': 'rgba(0, 0, 0, 0.02)',
                'characterCardHover': 'rgba(0, 0, 0, 0.04)',
                'questItemBg': 'rgba(0, 0, 0, 0.01)',
                'questItemHover': 'rgba(0, 0, 0, 0.03)',
                'activityHover': 'rgba(0, 0, 0, 0.02)',
                'notesArea': 'rgba(0, 0, 0, 0.03)'},
    'font': {'primary': 'Inter, sans-serif', 'secondary': 'system-ui, sans-serif',
             'heading': 'Newsreader, Georgia, serif'},
    'border': {'radius': {'sm': '0.25rem', 'md': '0.375rem', 'lg': '0.5rem'},
               'width': {'sm': '1px', 'md': '2px', 'lg': '4px'}},
    'entityPalette': ['#75504D', '#6D563C', '#5A5E3E', '#416451',
                      '#366368', '#455D76', '#5D5574', '#6E5064'],
    'entityInk': '#F5F1E8',
}

# The finishes differ only in how far the accent reaches below the chrome.
FINISH = {
    '2a': {'color.accent': '#C9A227', 'color.emphasis': '#C9A227',
           'status.active': '#C9A227', 'surface.chrome.border': '#C9A227',
           'surface.band.selected': 'rgba(201, 162, 39, 0.22)'},
    '3a': {'color.accent': '#8C1D1D', 'color.emphasis': '#9A9082',
           'status.active': '#8C1D1D', 'surface.chrome.border': '#2B2620',
           'surface.band.selected': 'rgba(255, 255, 255, 0.14)'},
}

DESCRIPTION = {
    '2a': ('higher accent load -- gold reaches below the chrome, into the quest '
           'progress, the hero eyebrow and the band'),
    '3a': ('accents concentrated in the chrome -- the interior you scan every '
           'session stays quiet'),
}


def build(name):
    tokens = copy.deepcopy(SHARED)
    for path, value in FINISH[name].items():
        node = tokens
        parts = path.split('.')
        for part in parts[:-1]:
            node = node[part]
        node[parts[-1]] = value
    return tokens


def _lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def _lum(p):
    return 0.2126 * _lin(p[0]) + 0.7152 * _lin(p[1]) + 0.0722 * _lin(p[2])


def _hx(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def ratio(a, b):
    la, lb = _lum(_hx(a)), _lum(_hx(b))
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def check(tokens, name):
    """Same rules as token-contrast.test.ts, run before anything is written."""
    problems = []
    for surface, pair in tokens['surface'].items():
        for role in ('on', 'onMuted'):
            r = ratio(pair['bg'], pair[role])
            if r < 4.5:
                problems.append('surface.%s.%s vs bg: %.2f:1 (needs 4.5)' % (surface, role, r))
    grounds = [tokens['surface']['page']['bg'], tokens['surface']['card']['bg']]
    for key, value in [('field.border', tokens['field']['border']),
                       ('action.outline.border', tokens['action']['outline']['border'])]:
        r = min(ratio(value, g) for g in grounds)
        if r < 3.0:
            problems.append('%s: %.2f:1 (needs 3)' % (key, r))
    # The hero eyebrow is small uppercase type on the band -- exactly the case
    # the design language warns is treated as though it were large. It sat at
    # 4.36:1 until this check existed.
    r = ratio(tokens['color']['emphasis'], tokens['surface']['band']['bg'])
    if r < 4.5:
        problems.append('color.emphasis on band: %.2f:1 (needs 4.5)' % r)
    ratios = [ratio(h, tokens['entityInk']) for h in tokens['entityPalette']]
    if min(ratios) < 4.5:
        problems.append('entityPalette worst: %.2f:1 (needs 4.5)' % min(ratios))
    if max(ratios) - min(ratios) >= 1.5:
        problems.append('entityPalette spread: %.2f (needs < 1.5)' % (max(ratios) - min(ratios)))
    return problems


def emit(tokens, name):
    lines = []

    def walk(node, indent):
        pad = '  ' * indent
        for key, value in node.items():
            if isinstance(value, dict):
                lines.append('%s%s: {' % (pad, key))
                walk(value, indent + 1)
                lines.append('%s},' % pad)
            elif isinstance(value, list):
                lines.append('%s%s: [' % (pad, key))
                for entry in value:
                    lines.append("%s  '%s'," % (pad, entry))
                lines.append('%s],' % pad)
            else:
                lines.append("%s%s: '%s'," % (pad, key, value))

    lines.append('tokens: {')
    walk(tokens, 1)
    lines.append('},')
    body = '\n'.join('  ' + line for line in lines)

    header = [
        '// src/core/themes/definitions/lightTheme.ts',
        "import { Theme } from '../types';",
        '',
        '/**',
        ' * Light theme, finish %s: %s.' % (name, DESCRIPTION[name]),
        ' *',
        ' * A warm ivory page that reads as paper rather than screen, a near-black',
        ' * chrome and hero band carrying the value contrast, and one deep red accent',
        ' * for things you can act on. Only values are tuned here; the token structure',
        ' * is Phase 1\'s and is untouched.',
        ' *',
        ' * Every hue was checked against the contrast rules before being written -- see',
        ' * the generator recorded in the drift log.',
        ' */',
        'export const lightTheme: Theme = {',
        "  name: 'light',",
    ]
    return '\n'.join(header) + '\n' + body + '\n};\n'


if __name__ == '__main__':
    which = sys.argv[1]
    built = build(which)
    problems = check(built, which)
    if problems:
        print('REFUSING TO WRITE -- contrast failures in finish %s:' % which)
        for problem in problems:
            print('    ' + problem)
        sys.exit(1)
    io.open('src/core/themes/definitions/lightTheme.ts', 'w',
            encoding='utf-8', newline='').write(emit(built, which))
    print('wrote finish %s; contrast checks passed' % which)
