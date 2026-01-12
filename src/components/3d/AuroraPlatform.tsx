/**
 * @fileoverview Minimal safe placeholder for AuroraPlatform component
 * @module components/3d/AuroraPlatform
 */

import { FC } from 'react';

/** Component props */
export interface AuroraPlatformProps {
  /** Override particle count (otherwise device-adaptive) */
  readonly particleCount?: number
  /** Enable sparkle particle field */
  readonly enableSparkles?: boolean
}

/**
 * Minimal placeholder AuroraPlatform component.
 * Returns null to prevent render errors while actual component loads.
 */
export const AuroraPlatform: FC<AuroraPlatformProps> = () => {
  return null;
};
