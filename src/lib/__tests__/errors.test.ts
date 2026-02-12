import { describe, it, expect } from 'vitest';
import {
  isRetriableError,
  AppError,
  SessionError,
  AIServiceError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NetworkError,
} from '../errors';

class CustomAppError extends AppError {
  constructor(message: string, code: string, statusCode: number) {
    super(message, code, statusCode);
  }
}

describe('isRetriableError', () => {
  it('returns true for AIServiceError (statusCode >= 500)', () => {
    const error = new AIServiceError('Service unavailable');
    expect(error.statusCode).toBe(502);
    expect(isRetriableError(error)).toBe(true);
  });

  it('returns true for NetworkError (code === NETWORK_ERROR)', () => {
    const error = new NetworkError('Connection lost');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(isRetriableError(error)).toBe(true);
  });

  it('returns true for RateLimitError (code === RATE_LIMIT)', () => {
    const error = new RateLimitError(60);
    expect(error.code).toBe('RATE_LIMIT');
    expect(isRetriableError(error)).toBe(true);
  });

  it('returns true for custom AppError with statusCode >= 500', () => {
    const error = new CustomAppError('Internal Server Error', 'INTERNAL_ERROR', 500);
    expect(isRetriableError(error)).toBe(true);
  });

  it('returns false for SessionError (statusCode < 500)', () => {
    const error = new SessionError('Session invalid');
    expect(error.statusCode).toBe(400);
    expect(isRetriableError(error)).toBe(false);
  });

  it('returns false for AuthenticationError (statusCode 401)', () => {
    const error = new AuthenticationError('Unauthorized');
    expect(error.statusCode).toBe(401);
    expect(isRetriableError(error)).toBe(false);
  });

  it('returns false for ValidationError (statusCode 400)', () => {
    const error = new ValidationError('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(isRetriableError(error)).toBe(false);
  });

  it('returns false for custom AppError with statusCode < 500', () => {
    const error = new CustomAppError('Not Found', 'NOT_FOUND', 404);
    expect(isRetriableError(error)).toBe(false);
  });

  it('returns false for standard Error object', () => {
    const error = new Error('Something went wrong');
    expect(isRetriableError(error)).toBe(false);
  });

  it('returns false for string error', () => {
    const error = 'Something went wrong';
    expect(isRetriableError(error)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isRetriableError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isRetriableError(undefined)).toBe(false);
  });

  it('returns false for object resembling AppError but not instance of AppError', () => {
    const error = {
      message: 'Fake Error',
      code: 'NETWORK_ERROR',
      statusCode: 500,
    };
    expect(isRetriableError(error)).toBe(false);
  });
});
