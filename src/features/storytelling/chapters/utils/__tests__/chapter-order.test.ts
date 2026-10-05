// src/features/storytelling/chapters/utils/__tests__/chapter-order.test.ts
//
// T088 (DATA-007): two chapters can share an `order` -- two people inserting
// at once both write the same one, and nothing short of a shared document can
// stop it. The answer is to make a shared value harmless: a fixed tiebreak,
// and every chapter numbered by its place, not by the value it stores.
import { inReadingOrder, numberedInReadingOrder } from '../chapter-order';
import type { Chapter } from '../../types';

const chapter = (id: string, order: number, dateAdded = '2026-01-01T00:00:00.000Z') =>
  ({ id, order, dateAdded, title: id, content: '' }) as Chapter;

describe('inReadingOrder', () => {
  it('reads by order', () => {
    expect(inReadingOrder([chapter('b', 2), chapter('a', 1)]).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('puts the chapter written first first, when two share an order', () => {
    const later = chapter('later', 3, '2026-02-01T00:00:00.000Z');
    const earlier = chapter('earlier', 3, '2026-01-01T00:00:00.000Z');

    expect(inReadingOrder([later, earlier]).map((c) => c.id)).toEqual(['earlier', 'later']);
    expect(inReadingOrder([earlier, later]).map((c) => c.id)).toEqual(['earlier', 'later']);
  });

  it('falls back to the id when they were written at the same moment, so every reader agrees', () => {
    expect(inReadingOrder([chapter('y', 3), chapter('x', 3)]).map((c) => c.id)).toEqual(['x', 'y']);
  });

  it('leaves the list it was given alone', () => {
    const list = [chapter('b', 2), chapter('a', 1)];
    inReadingOrder(list);
    expect(list.map((c) => c.id)).toEqual(['b', 'a']);
  });
});

describe('numberedInReadingOrder', () => {
  it('numbers each chapter by its place: a shared order and a gap read 1, 2, 3, 4', () => {
    const numbered = numberedInReadingOrder([
      chapter('d', 3, '2026-02-01T00:00:00.000Z'),
      chapter('a', 1),
      chapter('c', 3, '2026-01-01T00:00:00.000Z'),
      chapter('b', 2),
      chapter('e', 9),
    ]);

    expect(numbered.map((c) => [c.id, c.order])).toEqual([
      ['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5],
    ]);
  });

  it('hands back a chapter already in its place as the same object', () => {
    const a = chapter('a', 1);
    expect(numberedInReadingOrder([a])[0]).toBe(a);
  });
});
