/**
 * OMNiLiNK Configuration
 *
 * Reads configuration from environment variables.
 * Uses runtime validation to guarantee safe defaults and deterministic behavior.
 */

import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import type { OmniLinkConfig } from './types';

const logger = createLogger('OmniLinkConfig');
const DEFAULT_BASE_URL = 'https://hub.apexbiz.io';

const envSchema = z.object({
  VITE_OMNILINK_ENABLED: z.enum(['true', 'false']).optional(),
  VITE_OMNILINK_BASE_URL: z.string().url().optional(),
  VITE_OMNILINK_TENANT_ID: z.string().trim().optional(),
  VITE_OMNILINK_API_KEY: z.string().trim().optional(),
  VITE_OMNILINK_TIMEOUT_MS: z.coerce.number().int().positive().max(30000).optional(),
  VITE_OMNILINK_RETRY_ATTEMPTS: z.coerce.number().int().min(0).max(5).optional(),
});

export function getOmniLinkConfig(): OmniLinkConfig {
  const parsed = envSchema.safeParse(import.meta.env);

  if (!parsed.success) {
    logger.warn('Invalid OmniLink environment configuration detected; applying safe defaults', {
      issues: parsed.error.issues.map((issue) => issue.path.join('.') || issue.message),
    });
  }

  const env = parsed.success ? parsed.data : {};
  const enabled = env.VITE_OMNILINK_ENABLED === 'true';

  return {
    enabled,
    baseUrl: env.VITE_OMNILINK_BASE_URL ?? DEFAULT_BASE_URL,
    tenantId: env.VITE_OMNILINK_TENANT_ID ?? '',
    apiKey: env.VITE_OMNILINK_API_KEY ?? '',
    timeout: env.VITE_OMNILINK_TIMEOUT_MS ?? 5000,
    retryAttempts: env.VITE_OMNILINK_RETRY_ATTEMPTS ?? 3,
  };
}

export function isOmniLinkEnabled(): boolean {
  const config = getOmniLinkConfig();
  return config.enabled && config.tenantId.length > 0 && config.apiKey.length > 0;
}
