// src/utils/__tests__/password-validation.test.ts

import { validatePassword } from '../password-validation';

describe('password-validation', () => {
  describe('validatePassword', () => {
    describe('valid passwords', () => {
      test('should return isValid=true and no errors for a fully valid password', () => {
        const result = validatePassword('ValidPass1!');
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test('should accept exactly 8 characters meeting all requirements', () => {
        const result = validatePassword('Abcdef1!');
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test('should accept a complex 100-character password', () => {
        // 100 chars exactly: meets max length boundary
        const password = 'A1!' + 'a'.repeat(97);
        expect(password.length).toBe(100);
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test('should accept passwords with various special characters', () => {
        const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '=', '~', '?'];
        specialChars.forEach((sc) => {
          const result = validatePassword(`Abcdefg1${sc}`);
          expect(result.isValid).toBe(true);
        });
      });
    });

    describe('length violations', () => {
      test('should reject passwords shorter than 8 characters', () => {
        const result = validatePassword('A1!a');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters long');
      });

      test('should reject empty string', () => {
        const result = validatePassword('');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters long');
      });

      test('should reject passwords longer than 100 characters', () => {
        const password = 'A1!' + 'a'.repeat(98); // 101 chars
        expect(password.length).toBe(101);
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be less than 100 characters long');
      });
    });

    describe('character requirements', () => {
      test('should reject passwords without uppercase', () => {
        const result = validatePassword('lowercase1!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      });

      test('should reject passwords without lowercase', () => {
        const result = validatePassword('UPPERCASE1!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
      });

      test('should reject passwords without a number', () => {
        const result = validatePassword('NoNumbers!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
      });

      test('should reject passwords without a special character', () => {
        const result = validatePassword('NoSpecial1');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one special character');
      });
    });

    describe('multiple violations', () => {
      test('should accumulate all errors for an empty password', () => {
        const result = validatePassword('');
        expect(result.isValid).toBe(false);
        // Empty triggers: too-short, no uppercase, no lowercase, no number, no special
        expect(result.errors).toHaveLength(5);
        expect(result.errors).toEqual(
          expect.arrayContaining([
            'Password must be at least 8 characters long',
            'Password must contain at least one uppercase letter',
            'Password must contain at least one lowercase letter',
            'Password must contain at least one number',
            'Password must contain at least one special character',
          ])
        );
      });

      test('should accumulate multiple errors for partially compliant password', () => {
        // Long enough, has lowercase, no uppercase, no number, no special
        const result = validatePassword('alllowercase');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
        expect(result.errors).toContain('Password must contain at least one number');
        expect(result.errors).toContain('Password must contain at least one special character');
        expect(result.errors).not.toContain('Password must contain at least one lowercase letter');
        expect(result.errors).not.toContain('Password must be at least 8 characters long');
      });
    });

    describe('result shape', () => {
      test('should always return an object with isValid and errors fields', () => {
        const result = validatePassword('AnyPass1!');
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(typeof result.isValid).toBe('boolean');
      });

      test('isValid should be false whenever errors is non-empty', () => {
        const result = validatePassword('short');
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.isValid).toBe(false);
      });
    });
  });
});
