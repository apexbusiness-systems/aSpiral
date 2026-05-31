export interface SpiralError {
  code: 'STT_FETCH_FAILED' | 'STT_TIMEOUT' | 'STT_PARSE_ERROR' | 'CORS_ERROR';
  message: string;
  retryable: boolean;
}
