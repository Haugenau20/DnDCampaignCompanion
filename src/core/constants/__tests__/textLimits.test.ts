// src/core/constants/__tests__/textLimits.test.ts
import { overlongField } from '../textLimits';

describe('overlongField (T119)', () => {
  const limits = { name: 5, description: 10 };

  it('finds nothing when every field fits, at the limit included', () => {
    expect(overlongField(limits, { name: 'Bilbo', description: '0123456789' })).toBeUndefined();
  });

  it('names the first field over its limit, with its length', () => {
    expect(overlongField(limits, { name: 'Gandalf' })).toEqual({ field: 'name', length: 7, limit: 5 });
  });

  it('counts as the rules do: an emoji is two', () => {
    expect(overlongField(limits, { name: '😀😀😀' })).toEqual({ field: 'name', length: 6, limit: 5 });
  });

  it('ignores fields it has no limit for, and values that are not text', () => {
    expect(overlongField(limits, { notes: 'x'.repeat(50), description: null, name: undefined })).toBeUndefined();
    expect(overlongField(limits, { description: ['x'.repeat(50)] })).toBeUndefined();
  });
});
