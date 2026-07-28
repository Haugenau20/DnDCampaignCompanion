// src/components/features/layouts/common/utils/__tests__/layoutUtils.test.ts
import {
  calculateCompletionPercentage,
} from '../layoutUtils';

// ---------------------------------------------------------------------------
// calculateCompletionPercentage
// ---------------------------------------------------------------------------
describe('calculateCompletionPercentage', () => {
  it('returns 0 for an empty array', () => {
    expect(calculateCompletionPercentage([])).toBe(0);
  });

  it('returns 0 when objectives is null/undefined (guard)', () => {
    // The implementation checks !objectives, so passing null should return 0
    expect(calculateCompletionPercentage(null as any)).toBe(0);
  });

  it('returns 0 when no objectives are completed', () => {
    const objectives = [
      { completed: false },
      { completed: false },
    ];
    expect(calculateCompletionPercentage(objectives)).toBe(0);
  });

  it('returns 100 when all objectives are completed', () => {
    const objectives = [
      { completed: true },
      { completed: true },
      { completed: true },
    ];
    expect(calculateCompletionPercentage(objectives)).toBe(100);
  });

  it('returns 50 when half of objectives are completed', () => {
    const objectives = [
      { completed: true },
      { completed: false },
    ];
    expect(calculateCompletionPercentage(objectives)).toBe(50);
  });

  it('rounds to the nearest integer', () => {
    // 1 of 3 = 33.333... → 33
    const objectives = [
      { completed: true },
      { completed: false },
      { completed: false },
    ];
    expect(calculateCompletionPercentage(objectives)).toBe(33);
  });

  it('handles a single completed objective', () => {
    expect(calculateCompletionPercentage([{ completed: true }])).toBe(100);
  });

  it('handles a single uncompleted objective', () => {
    expect(calculateCompletionPercentage([{ completed: false }])).toBe(0);
  });

  it('returns a value between 0 and 100 for mixed objectives', () => {
    const objectives = Array.from({ length: 10 }, (_, i) => ({
      completed: i < 7,
    }));
    const result = calculateCompletionPercentage(objectives);
    expect(result).toBe(70);
  });
});
