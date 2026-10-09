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
      founder: null,
      device: null,
    });
  });

  // The link must work on a device that never saw the join page, so the
  // invitation travels in the link rather than in this browser's storage.
  test('carries an invitation whole, including a name that needs escaping', () => {
    const invitation = { groupId: 'g-1', token: 'tok&=?', username: 'Samwise the Brave' };
    expect(roundTrip(signInLinkUrl(ORIGIN, { invitation }))).toEqual({
      next: null,
      invitation,
      founder: null,
      device: null,
    });
  });

  // An invitation lands on campaign home once joined; a `next` beside it would
  // be a second, contradictory destination.
  test('drops `next` when there is an invitation', () => {
    const invitation = { groupId: 'g-1', token: 'tok', username: 'Sam' };
    expect(roundTrip(signInLinkUrl(ORIGIN, { invitation, next: '/quests' })).next).toBeNull();
  });

  test('carries the asking device\'s request beside a destination', () => {
    expect(roundTrip(signInLinkUrl(ORIGIN, { next: '/quests', device: 'req-1' }))).toEqual({
      next: '/quests',
      invitation: null,
      founder: null,
      device: 'req-1',
    });
  });

  // Approving another device is for plain sign-ins; an invitation link joins
  // a group, and that path does not run through an approval.
  test('drops `device` when there is an invitation', () => {
    const invitation = { groupId: 'g-1', token: 'tok', username: 'Sam' };
    expect(roundTrip(signInLinkUrl(ORIGIN, { invitation, device: 'req-1' })).device).toBeNull();
  });

  test('names the group `groupId`, as the invitation service reads it', () => {
    const url = signInLinkUrl(ORIGIN, { invitation: { groupId: 'g-1', token: 't', username: 'Sam' } });
    expect(new URL(url).searchParams.get('groupId')).toBe('g-1');
  });

  // T127: a founder signs in from their founder link and must land back on
  // it, to name the group; `next` cannot carry `/join`.
  test('carries a founder link', () => {
    expect(roundTrip(signInLinkUrl(ORIGIN, { founder: 'f-tok_1' }))).toEqual({
      next: null,
      invitation: null,
      founder: 'f-tok_1',
      device: null,
    });
  });

  test('drops `device` and `next` when there is a founder link', () => {
    const intent = roundTrip(signInLinkUrl(ORIGIN, { founder: 'f', next: '/quests', device: 'req-1' }));
    expect(intent.device).toBeNull();
    expect(intent.next).toBeNull();
  });
});

describe('readSignInLinkIntent', () => {
  test('ignores Firebase\'s own parameters', () => {
    const params = new URLSearchParams('mode=signIn&oobCode=abc&apiKey=k&next=%2Fquests');
    expect(readSignInLinkIntent(params)).toEqual({ next: '/quests', invitation: null, founder: null, device: null });
  });

  test('is no invitation when any part of one is missing', () => {
    const params = new URLSearchParams('groupId=g-1&token=tok');
    expect(readSignInLinkIntent(params).invitation).toBeNull();
  });

  test('an invitation wins over a founder link in the same URL', () => {
    const params = new URLSearchParams('groupId=g-1&token=tok&username=Sam&founder=f');
    expect(readSignInLinkIntent(params).founder).toBeNull();
  });

  test('is no founder link when the parameter is empty', () => {
    expect(readSignInLinkIntent(new URLSearchParams('founder=')).founder).toBeNull();
  });
});
