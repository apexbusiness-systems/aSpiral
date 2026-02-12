import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar');
    });

    it('should handle array inputs', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle object inputs', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('should resolve Tailwind CSS conflicts', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should handle mixed inputs', () => {
      expect(cn('foo', ['bar', { baz: true }], false && 'qux', 'p-4', 'p-2')).toBe('foo bar baz p-2');
    });

    it('should handle undefined and null inputs', () => {
        expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('should return empty string for no inputs', () => {
      expect(cn()).toBe('');
    });
  });
});
