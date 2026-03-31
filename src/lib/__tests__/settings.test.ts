import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadStoredSettings,
  saveStoredSettings,
  defaultSettings,
  SETTINGS_STORAGE_KEY
} from '../settings';

// Setup a simple store for the mock
let store: Record<string, string> = {};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
  writable: true,
});

describe('settings', () => {
  beforeEach(() => {
    store = {};
    vi.clearAllMocks();

    // Reset any custom implementations from mockImplementationOnce
    localStorageMock.getItem.mockImplementation((key: string) => store[key] ?? null);
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      store[key] = value;
    });
  });

  describe('saveStoredSettings', () => {
    it('should save settings to localStorage', () => {
      saveStoredSettings(defaultSettings);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(defaultSettings)
      );
      expect(store[SETTINGS_STORAGE_KEY]).toBe(JSON.stringify(defaultSettings));
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Quota exceeded');
      });

      expect(() => saveStoredSettings(defaultSettings)).not.toThrow();
    });
  });

  describe('loadStoredSettings', () => {
    it('should return null if no settings are stored', () => {
      const settings = loadStoredSettings();
      expect(settings).toBeNull();
    });

    it('should load and return valid settings from localStorage', () => {
      store[SETTINGS_STORAGE_KEY] = JSON.stringify(defaultSettings);

      const settings = loadStoredSettings();
      expect(settings).toEqual(defaultSettings);
    });

    it('should return null if stored JSON is invalid', () => {
      store[SETTINGS_STORAGE_KEY] = 'invalid-json';

      const settings = loadStoredSettings();
      expect(settings).toBeNull();
    });

    it('should return null if stored data is not a valid SettingsState', () => {
      const invalidSettings = { ...defaultSettings, theme: 'invalid-theme' as any };
      store[SETTINGS_STORAGE_KEY] = JSON.stringify(invalidSettings);

      const settings = loadStoredSettings();
      expect(settings).toBeNull();
    });

    it('should return null if a required field is missing', () => {
      const incompleteSettings = { ...defaultSettings };
      // @ts-ignore - simulating missing field
      delete incompleteSettings.voiceEnabled;

      store[SETTINGS_STORAGE_KEY] = JSON.stringify(incompleteSettings);

      const settings = loadStoredSettings();
      expect(settings).toBeNull();
    });

    it('should handle localStorage.getItem errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage disabled');
      });

      const settings = loadStoredSettings();
      expect(settings).toBeNull();
    });
  });
});
