// src/features/user-management/groups/utils/__tests__/founder-link.test.ts
import { founderLinkPath, readFounderToken } from '../founder-link';

describe('founderLinkPath', () => {
  test('leads to /join with the token', () => {
    expect(founderLinkPath('abc')).toBe('/join?founder=abc');
  });

  test('with no token, leads to the page that asks for one', () => {
    expect(new URLSearchParams(founderLinkPath().split('?')[1]).has('founder')).toBe(true);
  });

  test('escapes what a URL would misread', () => {
    expect(new URLSearchParams(founderLinkPath('a&b=c').split('?')[1]).get('founder')).toBe('a&b=c');
  });
});

describe('readFounderToken', () => {
  test('reads the token out of a whole founder link', () => {
    expect(readFounderToken('https://muninn.quest/join?founder=Ab_c-1')).toBe('Ab_c-1');
  });

  test('takes a bare token as it is, trimmed', () => {
    expect(readFounderToken('  Ab_c-1 ')).toBe('Ab_c-1');
  });

  test.each([
    ['nothing', ''],
    ['a link without the parameter', 'https://muninn.quest/join?token=x'],
    ['an empty parameter', 'https://muninn.quest/join?founder='],
    ['words', 'my founder link'],
  ])('finds none in %s', (_what, input) => {
    expect(readFounderToken(input)).toBeNull();
  });
});
