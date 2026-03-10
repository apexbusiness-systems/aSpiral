import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOmniLinkConfig, isOmniLinkEnabled } from '../config';

const clearOmniLinkEnv = (): void => {
  vi.unstubAllEnvs();
};

afterEach(() => {
  clearOmniLinkEnv();
});

describe('OmniLink config hardening', () => {
  it('uses safe defaults when env is absent', () => {
    const config = getOmniLinkConfig();

    expect(config).toEqual({
      enabled: false,
      baseUrl: 'https://hub.apexbiz.io',
      tenantId: '',
      apiKey: '',
      timeout: 5000,
      retryAttempts: 3,
    });
    expect(isOmniLinkEnabled()).toBe(false);
  });

  it('enables OmniLink only when all required fields are present', () => {
    vi.stubEnv('VITE_OMNILINK_ENABLED', 'true');
    vi.stubEnv('VITE_OMNILINK_BASE_URL', 'https://omnilink.example.com');
    vi.stubEnv('VITE_OMNILINK_TENANT_ID', 'tenant-123');
    vi.stubEnv('VITE_OMNILINK_API_KEY', 'api-key-123');
    vi.stubEnv('VITE_OMNILINK_TIMEOUT_MS', '6000');
    vi.stubEnv('VITE_OMNILINK_RETRY_ATTEMPTS', '4');

    expect(getOmniLinkConfig()).toEqual({
      enabled: true,
      baseUrl: 'https://omnilink.example.com',
      tenantId: 'tenant-123',
      apiKey: 'api-key-123',
      timeout: 6000,
      retryAttempts: 4,
    });
    expect(isOmniLinkEnabled()).toBe(true);
  });

  it('falls back to defaults for invalid connection tuning values', () => {
    vi.stubEnv('VITE_OMNILINK_ENABLED', 'true');
    vi.stubEnv('VITE_OMNILINK_TENANT_ID', 'tenant-123');
    vi.stubEnv('VITE_OMNILINK_API_KEY', 'api-key-123');
    vi.stubEnv('VITE_OMNILINK_TIMEOUT_MS', '-1');
    vi.stubEnv('VITE_OMNILINK_RETRY_ATTEMPTS', '99');

    const config = getOmniLinkConfig();

    expect(config.timeout).toBe(5000);
    expect(config.retryAttempts).toBe(3);
    expect(config.baseUrl).toBe('https://hub.apexbiz.io');
  });
});
