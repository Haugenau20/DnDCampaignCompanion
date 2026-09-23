// src/features/user-management/auth/utils/__tests__/email-link.test.ts
import { readSignInLinkIntent, signInLinkUrl } from '../email-link';

const ORIGIN = 'https://companion.test';

/** What the landing page reads back out of a URL `signInLinkUrl` built. */
const roundTrip = (url: string) => readSignInLinkIntent(new URL(url).searchParams);

describe('signInLinkUrl', () => {
  test('opens /auth/link on the given origin', () => {
    expect(signInLinkUrl(ORIGIN)).toBe(`${ORIGIN}/auth/link`);
  });

  test('carries a destination', () => {
    expect(roundTrip(signInLinkUrl(ORIGIN, { next: '/npcs?filter=alive' }))).toEqual({
      next: '/npcs?filter=alive',
      invitation: null,
    });
  });

  // The link must work on a device that never saw the join page, so the
  // invitation travels in the link rather than in this browser's storage.
  test('carries an invitation whole, including a name that needs escaping', () => {
    const invitation = { groupId: 'g-1', token: 'tok&=?', username: 'Samwise the Brave' };
    expect(roundTrip(signInLinkUrl(ORIGIN, { invitation }))).toEqual({
      next: null,
      invitation,
    });
  });

  // An invitation lands on campaign home once joined; a `next` beside it would
  // be a second, contradictory destination.
  test('drops `next` when there is an invitation', () => {
    const invitation = { groupId: 'g-1', token: 'tok', username: 'Sam' };
    expect(roundTrip(signInLinkUrl(ORIGIN, { invitation, next: '/quests' })).next).toBeNull();
  });

  test('names the group `groupId`, as the invitation service reads it', () => {
    const url = signInLinkUrl(ORIGIN, { invitation: { groupId: 'g-1', token: 't', username: 'Sam' } });
    expect(new URL(url).searchParams.get('groupId')).toBe('g-1');
  });
});

describe('readSignInLinkIntent', () => {
  test('ignores Firebase\'s own parameters', () => {
    const params = new URLSearchParams('mode=signIn&oobCode=abc&apiKey=k&next=%2Fquests');
    expect(readSignInLinkIntent(params)).toEqual({ next: '/quests', invitation: null });
  });

  test('is no invitation when any part of one is missing', () => {
    const params = new URLSearchParams('groupId=g-1&token=tok');
    expect(readSignInLinkIntent(params).invitation).toBeNull();
  });
});
