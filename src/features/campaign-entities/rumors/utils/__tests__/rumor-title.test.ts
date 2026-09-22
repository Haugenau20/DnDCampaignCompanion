// src/features/campaign-entities/rumors/utils/__tests__/rumor-title.test.ts
import {
  rumorDisplayTitle,
  rumorTitleText,
  UNTITLED_RUMOR,
} from '../rumor-title';

/**
 * The composer stopped writing what you type into `title` and started writing
 * it into `content`, because a title long enough to say something was never
 * displayable in full. These are the rules the list reads by afterwards.
 */
describe('rumorDisplayTitle', () => {
  test('an explicit title wins over the content', () => {
    expect(
      rumorDisplayTitle({ title: 'The goblin road', content: 'Traders say it is busy.' })
    ).toBe('The goblin road');
  });

  test('a title of only whitespace is not a title', () => {
    expect(rumorDisplayTitle({ title: '   ', content: 'Traders say it is busy.' })).toBe(
      'Traders say it is busy.'
    );
  });

  test('falls back to the first non-empty line of the content', () => {
    expect(
      rumorDisplayTitle({ title: '', content: '\n\n  Traders say it is busy.  \nAnd more.' })
    ).toBe('Traders say it is busy.');
  });

  test('a long first line is capped on a word boundary, with no ellipsis', () => {
    const content =
      'Traders coming down from Rivendell say the goblin road is busy again after dark';
    const derived = rumorDisplayTitle({ title: '', content });

    expect(derived).toBe('Traders coming down from Rivendell say the goblin');
    // A stored ellipsis is indistinguishable from one the user typed, so the
    // cap never adds one -- the row truncates visually instead.
    expect(derived).not.toMatch(/[.…]{2,}/);
    expect(derived!.length).toBeLessThanOrEqual(52);
  });

  test('null when the rumour has neither a title nor any content', () => {
    expect(rumorDisplayTitle({ title: '', content: '' })).toBeNull();
    expect(rumorDisplayTitle({ title: '', content: '   \n  ' })).toBeNull();
  });

  test('tolerates a record missing the fields entirely', () => {
    expect(rumorDisplayTitle({} as never)).toBeNull();
  });

  /**
   * Rumours written before this change all carry a human-typed title. Unlike
   * a note, there is no "New Rumor" placeholder to unpick.
   */
  test('an existing rumour keeps the title it was saved with', () => {
    expect(rumorDisplayTitle({ title: 'New Rumor', content: 'anything' })).toBe('New Rumor');
  });
});

describe('rumorTitleText', () => {
  test('prints the display title when there is one', () => {
    expect(rumorTitleText({ title: '', content: 'Traders say it is busy.' })).toBe(
      'Traders say it is busy.'
    );
  });

  test('prints the untitled fallback when there is not', () => {
    expect(rumorTitleText({ title: '', content: '' })).toBe(UNTITLED_RUMOR);
    expect(UNTITLED_RUMOR).toBe('Untitled rumour');
  });
});
