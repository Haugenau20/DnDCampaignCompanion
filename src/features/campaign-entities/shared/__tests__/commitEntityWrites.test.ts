// src/features/campaign-entities/shared/__tests__/commitEntityWrites.test.ts
import { commitEntityWrites, MAX_BATCH_WRITES } from '../commitEntityWrites';

const mockBatchOperations = jest.fn();

jest.mock('core/services/firebase', () => ({
  __esModule: true,
  default: { document: { batchOperations: (ops: unknown) => mockBatchOperations(ops) } },
}));

/** T017: every entity's batch action commits through this, as one batch. */
describe('commitEntityWrites', () => {
  beforeEach(() => {
    mockBatchOperations.mockReset().mockResolvedValue(undefined);
  });

  it('commits every write in one batch, against the given collection', async () => {
    await commitEntityWrites('npcs', 'NPCs', [
      { type: 'update', id: 'a', data: { status: 'deceased' } },
      { type: 'delete', id: 'b' },
    ]);

    expect(mockBatchOperations).toHaveBeenCalledTimes(1);
    expect(mockBatchOperations).toHaveBeenCalledWith([
      { type: 'update', id: 'a', data: { status: 'deceased' }, collection: 'npcs' },
      { type: 'delete', id: 'b', collection: 'npcs' },
    ]);
  });

  it('commits nothing for an empty selection', async () => {
    await commitEntityWrites('npcs', 'NPCs', []);
    expect(mockBatchOperations).not.toHaveBeenCalled();
  });

  it('refuses more writes than one batch holds, before writing anything', async () => {
    const writes = Array.from({ length: MAX_BATCH_WRITES + 1 }, (_, i) => ({
      type: 'delete' as const,
      id: `n${i}`,
    }));

    await expect(commitEntityWrites('npcs', 'NPCs', writes)).rejects.toThrow(
      `One action can change at most ${MAX_BATCH_WRITES} NPCs at once.`
    );
    expect(mockBatchOperations).not.toHaveBeenCalled();
  });

  it('passes a failed commit on to the caller', async () => {
    mockBatchOperations.mockRejectedValue(new Error('permission-denied'));
    await expect(
      commitEntityWrites('npcs', 'NPCs', [{ type: 'delete', id: 'a' }])
    ).rejects.toThrow('permission-denied');
  });
});
