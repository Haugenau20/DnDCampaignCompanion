// src/shared/utils/__tests__/author-name.test.ts
//
// T132: authors are credited by the names they have now; the stored name is
// the fallback for someone who has left the group.
import { authorName, lastActorName } from '../author-name';

const directory = new Map([
  ['wren', { username: 'Wren', characters: [{ id: 'ilse', name: 'Ilse the Bold' }] }],
  ['corvin', { username: 'Corvin' }],
]);

describe('authorName', () => {
  it('names a current character by its name now', () => {
    expect(authorName({ uid: 'wren', characterId: 'ilse', storedCharacterName: 'Ilse Varn' }, directory)).toBe(
      'Ilse the Bold'
    );
  });

  it("names a member's username now when no character is recorded", () => {
    expect(authorName({ uid: 'corvin', storedUsername: 'Old Name' }, directory)).toBe('Corvin');
  });

  it('keeps a stored character name when the character is gone or was never given an id', () => {
    expect(authorName({ uid: 'wren', characterId: 'gone', storedCharacterName: 'Ilse Varn' }, directory)).toBe('Ilse Varn');
    expect(authorName({ uid: 'wren', storedCharacterName: 'Ilse Varn' }, directory)).toBe('Ilse Varn');
  });

  it('falls back to the stored names for someone who left, or while loading', () => {
    expect(authorName({ uid: 'mara', storedUsername: 'Mara' }, directory)).toBe('Mara');
    expect(authorName({ uid: 'wren', characterId: 'ilse', storedCharacterName: 'Ilse Varn' }, undefined)).toBe('Ilse Varn');
  });

  it('names nobody when nothing names them', () => {
    expect(authorName({}, directory)).toBe('');
  });
});

describe('lastActorName', () => {
  it('names the last editor, else the creator', () => {
    expect(lastActorName({ createdBy: 'wren', modifiedBy: 'corvin' }, directory)).toBe('Corvin');
    expect(lastActorName({ createdBy: 'wren' }, directory)).toBe('Wren');
  });
});
