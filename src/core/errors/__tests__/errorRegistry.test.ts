// src/core/errors/__tests__/errorRegistry.test.ts
// The error registry and the sign-in failures it names.

import { ERROR_REGISTRY, RETIRED_REFS, refForCode, withRef, ErrorRef } from '../errorRegistry';
import { describeSignInError } from 'core/services/firebase/auth/signInErrors';

const withCode = (code: string, message = 'Firebase: raw detail (x).') =>
  Object.assign(new Error(message), { code });

const refs = Object.keys(ERROR_REGISTRY) as ErrorRef[];

describe('the registry', () => {
  test('every reference is AREA-NN', () => {
    refs.forEach(ref => expect(ref).toMatch(/^[A-Z]+-\d{2}$/));
  });

  test('no retired reference is in use again', () => {
    Object.keys(RETIRED_REFS).forEach(ref => expect(refs).not.toContain(ref));
  });

  test('every entry explains itself for the maintainer', () => {
    refs.forEach(ref => expect(ERROR_REGISTRY[ref].meaning.length).toBeGreaterThan(20));
  });

  test('an error code belongs to one reference only', () => {
    const owners = new Map<string, string>();
    refs.forEach(ref => {
      ERROR_REGISTRY[ref].causes.forEach((code: string) => {
        expect(owners.get(code)).toBeUndefined();
        owners.set(code, ref);
      });
    });
  });

  test('refForCode finds a code within its area, and nothing outside it', () => {
    expect(refForCode('AUTH', 'auth/user-disabled')).toBe('AUTH-05');
    expect(refForCode('NOTE', 'auth/user-disabled')).toBeUndefined();
    expect(refForCode('AUTH', 'auth/never-heard-of-it')).toBeUndefined();
  });

  test('withRef appends the reference', () => {
    expect(withRef('It broke.', 'AUTH-01')).toBe('It broke. (Ref: AUTH-01)');
  });
});

describe('sign-in failures carry a reference, never Firebase text', () => {
  const GENERIC = 'Something went wrong signing you in. Please try again.';

  test.each([
    ['auth/firebase-app-check-token-is-invalid', 'AUTH-01'],
    ['auth/internal-error', 'AUTH-02'],
    ['auth/unauthorized-domain', 'AUTH-04'],
    ['auth/user-disabled', 'AUTH-05'],
    ['auth/web-storage-unsupported', 'AUTH-06'],
    ['auth/quota-exceeded', 'AUTH-08'],
  ])('%s shows %s', (code, ref) => {
    const shown = describeSignInError(withCode(code));
    expect(shown).toBe(`${GENERIC} (Ref: ${ref})`);
    expect(shown).not.toContain('raw detail');
  });

  test('an uncaught server fault in a callable is not the bare word "internal"', () => {
    expect(describeSignInError(withCode('functions/internal', 'internal'))).toBe(`${GENERIC} (Ref: AUTH-09)`);
  });

  test('an unreachable or timed-out callable has its own reference', () => {
    expect(describeSignInError(withCode('functions/unavailable', 'unavailable'))).toBe(`${GENERIC} (Ref: AUTH-10)`);
    expect(describeSignInError(withCode('functions/deadline-exceeded', 'deadline-exceeded'))).toBe(`${GENERIC} (Ref: AUTH-10)`);
  });

  test('a callable\'s deliberate refusal is still shown in its own words', () => {
    expect(describeSignInError(withCode('functions/permission-denied', 'This invitation is for another group.'))).toBe(
      'This invitation is for another group.'
    );
    expect(describeSignInError(withCode('functions/invalid-argument', 'That username is taken.'))).toBe(
      'That username is taken.'
    );
  });

  test('a Firebase code nobody has catalogued gets the catch-all reference', () => {
    expect(describeSignInError(withCode('auth/something-new'))).toBe(`${GENERIC} (Ref: AUTH-99)`);
  });

  test('a bug (a TypeError, or a thrown non-Error) gets its own reference, not its message', () => {
    expect(describeSignInError(new TypeError("Cannot read properties of undefined (reading 'uid')"))).toBe(
      `${GENERIC} (Ref: AUTH-98)`
    );
    expect(describeSignInError('a string')).toBe(`${GENERIC} (Ref: AUTH-98)`);
    expect(describeSignInError(undefined)).toBe(`${GENERIC} (Ref: AUTH-98)`);
  });

  test('a plain Error our services throw for the reader still passes through', () => {
    expect(describeSignInError(new Error('You must be signed in to join a group'))).toBe(
      'You must be signed in to join a group'
    );
  });

  test('a failure that already has a sentence keeps it, without a reference', () => {
    expect(describeSignInError(withCode('auth/network-request-failed'))).not.toContain('Ref:');
  });
});
