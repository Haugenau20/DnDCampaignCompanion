// src/features/storytelling/chapters/utils/__tests__/chapter-byline.test.ts
import { deriveChapterByline } from '../chapter-byline';

const created = {
  createdBy: 'uid-1',
  createdByUsername: 'soren',
  dateAdded: '2025-03-12T18:00:00.000Z',
  // Creation stamps the modifier with the same actor and instant.
  modifiedBy: 'uid-1',
  modifiedByUsername: 'soren',
  dateModified: '2025-03-12T18:00:00.000Z',
};

describe('deriveChapterByline', () => {
  it('credits the recorder by username, with the date in words', () => {
    expect(deriveChapterByline(created)).toEqual({
      recordedBy: 'soren',
      recordedOn: '12 March 2025',
      editedBy: undefined,
      editedOn: undefined,
    });
  });

  it('prefers the character the recorder was playing', () => {
    const byline = deriveChapterByline({
      ...created,
      createdByCharacterName: 'Gauthak',
      modifiedByCharacterName: 'Gauthak',
    });
    expect(byline.recordedBy).toBe('Gauthak');
  });

  it('does not call the creation stamp an edit', () => {
    expect(deriveChapterByline(created).editedBy).toBeUndefined();
  });

  it('names the editor and the date when someone else edited it', () => {
    const byline = deriveChapterByline({
      ...created,
      modifiedBy: 'uid-2',
      modifiedByUsername: 'eowyn',
      dateModified: '2026-10-02T09:00:00.000Z',
    });
    expect(byline.editedBy).toBe('eowyn');
    expect(byline.editedOn).toBe('2 Oct 2026');
  });

  it('counts the recorder editing their own chapter later', () => {
    const byline = deriveChapterByline({
      ...created,
      dateModified: '2025-03-13T10:00:00.000Z',
    });
    expect(byline.editedBy).toBe('soren');
    expect(byline.editedOn).toBe('13 Mar 2025');
  });

  it('says nothing it does not know', () => {
    expect(deriveChapterByline({})).toEqual({
      recordedBy: undefined,
      recordedOn: undefined,
      editedBy: undefined,
      editedOn: undefined,
    });
  });

  it('drops an unreadable date rather than printing "Invalid Date"', () => {
    const byline = deriveChapterByline({ ...created, dateAdded: 'not a date' });
    expect(byline.recordedOn).toBeUndefined();
    expect(byline.recordedBy).toBe('soren');
  });
});
