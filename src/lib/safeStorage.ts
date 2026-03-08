/**
 * Safe Storage Utility
 * Provides error-resistant localStorage/sessionStorage access
 * Handles Safari private browsing, quota exceeded, and other storage errors
 */

import { createLogger } from './logger';

const logger = createLogger('SafeStorage');

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

/**
 * Creates a safe storage wrapper that handles errors gracefully
 */
function createSafeStorage(storage: Storage, storageName: string): StorageAdapter {
  return {
    getItem(key: string): string | null {
      try {
        return storage.getItem(key);
      } catch (error) {
        logger.warn(`Failed to read from ${storageName}`, { key, error });
        return null;
      }
    },

    setItem(key: string, value: string): void {
      try {
        storage.setItem(key, value);
      } catch (error) {
        // Handle quota exceeded or other storage errors
        if (error instanceof DOMException) {
          if (error.name === 'QuotaExceededError') {
            logger.error(`${storageName} quota exceeded`, { key, valueLength: value.length } as any);
          } else if (error.name === 'SecurityError') {
            logger.warn(`${storageName} access denied (private browsing?)`, { key } as any);
          } else {
            logger.error(`${storageName} setItem failed`, { key, errorName: error.name } as any);
          }
        } else {
          logger.error(`${storageName} setItem failed`, { key } as any);
        }
      }
    },

    removeItem(key: string): void {
      try {
        storage.removeItem(key);
      } catch (error) {
        logger.warn(`Failed to remove from ${storageName}`, { key } as any);
      }
    },

    clear(): void {
      try {
        storage.clear();
      } catch (error) {
        logger.error(`Failed to clear ${storageName}`, { error });
      }
    },
  };
}

/**
 * Safe localStorage wrapper
 */
export const safeLocalStorage: StorageAdapter = createSafeStorage(localStorage, 'localStorage');

/**
 * Safe sessionStorage wrapper
 */
export const safeSessionStorage: StorageAdapter = createSafeStorage(sessionStorage, 'sessionStorage');

/**
 * Checks if storage is available and working
 */
export function isStorageAvailable(storage: Storage): boolean {
  try {
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
