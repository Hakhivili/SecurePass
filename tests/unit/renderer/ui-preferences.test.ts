import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_UI_PREFERENCES } from '@shared/types';
import {
  normalizeAccent,
  normalizeGeneratorPosition,
  normalizeLanguage,
  normalizeTheme,
  readUiPreferences,
  writeUiPreferences,
} from '@/utils/ui-preferences';

const STORAGE_KEY = 'securepass.ui-preferences';

beforeEach(() => {
  window.localStorage.clear();
});

describe('renderer/ui-preferences normalisers', () => {
  it('keeps known values and falls back to defaults for anything else', () => {
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('sepia')).toBe(DEFAULT_UI_PREFERENCES.theme);
    expect(normalizeLanguage('en')).toBe('en');
    expect(normalizeLanguage('fr')).toBe(DEFAULT_UI_PREFERENCES.language);
    expect(normalizeAccent('rose')).toBe('rose');
    expect(normalizeAccent(null)).toBe(DEFAULT_UI_PREFERENCES.accent);
    expect(normalizeGeneratorPosition('right')).toBe('right');
    expect(normalizeGeneratorPosition('bottom')).toBe(
      DEFAULT_UI_PREFERENCES.generatorPosition,
    );
  });
});

describe('renderer/ui-preferences storage', () => {
  it('returns defaults when nothing has been cached yet', () => {
    expect(readUiPreferences()).toEqual(DEFAULT_UI_PREFERENCES);
  });

  it('round-trips a partial update without losing the other fields', () => {
    writeUiPreferences({ theme: 'dark', accent: 'emerald' });
    writeUiPreferences({ language: 'en' });

    expect(readUiPreferences()).toEqual({
      theme: 'dark',
      language: 'en',
      accent: 'emerald',
      generatorPosition: DEFAULT_UI_PREFERENCES.generatorPosition,
    });
  });

  it('sanitises corrupted cache content', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'neon', language: 7, accent: ['rose'] }),
    );

    expect(readUiPreferences()).toEqual(DEFAULT_UI_PREFERENCES);
  });

  it('survives unparsable payloads', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');

    expect(readUiPreferences()).toEqual(DEFAULT_UI_PREFERENCES);
  });

  it('stays silent when storage is unavailable', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => writeUiPreferences({ theme: 'light' })).not.toThrow();

    setItem.mockRestore();
  });
});
