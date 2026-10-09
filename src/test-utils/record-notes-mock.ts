// src/test-utils/record-notes-mock.ts

/**
 * A stand-in for `features/campaign-entities/shared/recordNotes` (T133), for
 * suites that render a provider, a list or a page without Firestore.
 *
 * Notes are documents of their own now, read and written through the document
 * service directly. Install it with
 * `jest.mock('features/campaign-entities/shared/recordNotes', () => require('@/test-utils/record-notes-mock').recordNotesMock())`
 * and reach the writes through `jest.requireMock` of the same path.
 *
 * Reads find no note documents, so what is shown is the record's own array;
 * writes resolve and record their arguments. The merge is the real one.
 */
export function recordNotesMock() {
  const actual = jest.requireActual('features/campaign-entities/shared/recordNotes');
  return {
    __esModule: true,
    notesPathOf: actual.notesPathOf,
    mergeRecordNotes: actual.mergeRecordNotes,
    useRecordNotes: jest.fn(() => undefined),
    useCampaignRecordNotes: jest.fn((_collection: string, record: { notes?: unknown[] }) =>
      actual.mergeRecordNotes(record.notes, undefined)
    ),
    addRecordNote: jest.fn(() => Promise.resolve('note-1')),
    editRecordNote: jest.fn(() => Promise.resolve()),
    deleteRecordNote: jest.fn(() => Promise.resolve()),
    deleteRecordNotes: jest.fn(() => Promise.resolve()),
  };
}
