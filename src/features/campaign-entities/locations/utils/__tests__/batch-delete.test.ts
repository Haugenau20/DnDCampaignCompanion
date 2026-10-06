// src/features/campaign-entities/locations/utils/__tests__/batch-delete.test.ts
import { planBatchDelete } from '../batch-delete';
import { Location } from '../../types';

const place = (id: string, parentId = ''): Location =>
  ({ id, name: id, type: 'city', status: 'known', description: '', parentId } as Location);

/**
 * region ─┬─ city ─┬─ inn
 *         │        └─ market ── stall
 *         └─ port
 * island ── cave
 * lone
 */
const world: Location[] = [
  place('region'),
  place('city', 'region'),
  place('inn', 'city'),
  place('market', 'city'),
  place('stall', 'market'),
  place('port', 'region'),
  place('island'),
  place('cave', 'island'),
  place('lone'),
];

describe('planBatchDelete', () => {
  describe('what the selection holds', () => {
    test('counts the places inside a selection that are not ticked themselves', () => {
      // city holds inn, market and stall; lone holds nothing.
      expect(planBatchDelete(world, ['city', 'lone']).inside).toBe(3);
    });

    test('does not count a ticked place as inside another ticked place', () => {
      // region holds city, inn, market, stall, port; city is ticked too.
      expect(planBatchDelete(world, ['region', 'city']).inside).toBe(4);
    });

    test('reports nothing inside a selection of leaves', () => {
      expect(planBatchDelete(world, ['inn', 'stall', 'lone']).inside).toBe(0);
    });
  });

  describe('deleting everything inside', () => {
    test('removes every ticked place and everything below them, each counted once', () => {
      const plan = planBatchDelete(world, ['region', 'city', 'island']);
      // region, city, inn, market, stall, port + island, cave
      expect(plan.removed['delete-subtree']).toBe(8);
    });

    test('deletes outer places before the ticked places inside them', () => {
      const { order } = planBatchDelete(world, ['stall', 'city', 'region']);
      expect(order['delete-subtree']).toEqual(['region', 'city', 'stall']);
    });
  });

  describe('moving what is inside up', () => {
    test('removes only the ticked places', () => {
      expect(planBatchDelete(world, ['region', 'city', 'island']).removed['promote-to-grandparent']).toBe(3);
    });

    test('moves the places directly inside a ticked place that are not ticked themselves', () => {
      // region's port, city's inn and market, island's cave. stall stays in market.
      expect(planBatchDelete(world, ['region', 'city', 'island']).movedUp).toBe(4);
    });

    test('deletes inner places first, so what they hold climbs to the nearest place that stays', () => {
      const { order } = planBatchDelete(world, ['region', 'stall', 'city']);
      expect(order['promote-to-grandparent']).toEqual(['stall', 'city', 'region']);
    });
  });

  test('ignores an id the list does not hold, and keeps it in the order for the server to judge', () => {
    const plan = planBatchDelete(world, ['gone', 'lone']);
    expect(plan.inside).toBe(0);
    expect(plan.removed['delete-subtree']).toBe(1);
    expect(plan.order['delete-subtree']).toEqual(expect.arrayContaining(['gone', 'lone']));
  });

  test('terminates on a parent cycle', () => {
    const cyclic = [place('a', 'b'), place('b', 'a')];
    const plan = planBatchDelete(cyclic, ['a']);
    expect(plan.inside).toBe(1);
    expect(plan.removed['delete-subtree']).toBe(2);
  });
});
