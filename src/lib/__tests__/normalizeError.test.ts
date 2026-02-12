import { describe, it, expect } from 'vitest';
import { normalizeError, shouldShowErrorBanner, getErrorMessage } from '../normalizeError';

describe('normalizeError', () => {
  describe('Empty/No Data Scenarios', () => {
    it('handles PGRST116 (0 rows) as empty state', () => {
      const error = { code: 'PGRST116', message: 'The result contains 0 rows' };
      const normalized = normalizeError(error);
      expect(normalized).toEqual({
        kind: 'empty',
        message: 'No data found',
        raw: error,
        isNonError: true,
      });
    });

    it('handles 406 (Not Acceptable) as empty state', () => {
      const error = { code: '406', message: 'Not Acceptable' };
      const normalized = normalizeError(error);
      expect(normalized.kind).toBe('empty');
      expect(normalized.isNonError).toBe(true);
    });

    it('handles "no rows" message patterns', () => {
      const errors = [
        { message: 'no rows found' },
        { message: 'result contains 0 rows' },
        { message: 'row not found in table' },
      ];

      errors.forEach((err) => {
        const normalized = normalizeError(err);
        expect(normalized.kind).toBe('empty');
        expect(normalized.isNonError).toBe(true);
      });
    });
  });

  describe('Auth Scenarios', () => {
    it('handles 401 status code', () => {
      const error = { status: 401, message: 'Unauthorized' };
      const normalized = normalizeError(error);
      expect(normalized).toEqual({
        kind: 'auth',
        message: 'Please sign in to continue',
        raw: error,
        isNonError: false,
      });
    });

    it('handles 403 status code', () => {
      const error = { status: 403, message: 'Forbidden' };
      const normalized = normalizeError(error);
      expect(normalized).toEqual({
        kind: 'auth',
        message: 'You do not have permission to access this resource',
        raw: error,
        isNonError: false,
      });
    });

    it('handles auth message patterns', () => {
      const errors = [
        { message: 'user unauthorized' },
        { message: 'unauthenticated access' },
        { message: 'jwt expired' },
        { message: 'token expired' },
      ];

      errors.forEach((err) => {
        const normalized = normalizeError(err);
        expect(normalized.kind).toBe('auth');
        expect(normalized.message).toBe('Please sign in to continue');
        expect(normalized.isNonError).toBe(false);
      });
    });
  });

  describe('Network Scenarios', () => {
    it('handles network error patterns', () => {
      const errors = [
        { message: 'network error' },
        { message: 'failed to fetch' },
        { message: 'connection refused' },
        { message: 'offline' },
      ];

      errors.forEach((err) => {
        const normalized = normalizeError(err);
        expect(normalized.kind).toBe('network');
        expect(normalized.message).toContain('Network error');
        expect(normalized.isNonError).toBe(false);
      });
    });

    it('handles TypeError with fetch message', () => {
      const error = new TypeError('Failed to fetch');
      const normalized = normalizeError(error);
      expect(normalized.kind).toBe('network');
      expect(normalized.isNonError).toBe(false);
    });
  });

  describe('Server Scenarios', () => {
    it('handles 5xx status codes', () => {
      const errors = [
        { status: 500 },
        { status: 502 },
        { status: 503 },
        { status: 504 },
      ];

      errors.forEach((err) => {
        const normalized = normalizeError(err);
        expect(normalized.kind).toBe('server');
        expect(normalized.message).toContain('Server error');
        expect(normalized.isNonError).toBe(false);
      });
    });
  });

  describe('Unknown/Default Scenarios', () => {
    it('handles null and undefined', () => {
      expect(normalizeError(null)).toEqual({
        kind: 'unknown',
        message: 'An unknown error occurred',
        raw: null,
        isNonError: false,
      });

      expect(normalizeError(undefined)).toEqual({
        kind: 'unknown',
        message: 'An unknown error occurred',
        raw: undefined,
        isNonError: false,
      });
    });

    it('handles generic errors', () => {
      const error = { message: 'Something went wrong' };
      const normalized = normalizeError(error);
      expect(normalized.kind).toBe('unknown');
      expect(normalized.message).toBe('Something went wrong'); // original message case preserved
      expect(normalized.isNonError).toBe(false);
    });

    it('handles primitive error values', () => {
        const error = "Simple string error";
        const normalized = normalizeError(error);
        expect(normalized.kind).toBe('unknown');
        // Current implementation defaults to generic message for primitives
        expect(normalized.message).toBe('An unexpected error occurred');
    });
  });

  describe('Helper Functions', () => {
    describe('shouldShowErrorBanner', () => {
      it('returns false for empty/non-error kinds', () => {
        const error = { code: 'PGRST116' };
        expect(shouldShowErrorBanner(error)).toBe(false);
      });

      it('returns true for other error kinds', () => {
        const error = { status: 500 };
        expect(shouldShowErrorBanner(error)).toBe(true);
      });
    });

    describe('getErrorMessage', () => {
      it('returns the normalized message', () => {
        const error = { message: 'Some Error' };
        expect(getErrorMessage(error)).toBe('Some Error');
      });
    });
  });
});
