import { describe, expect, it } from 'vitest';
import { isLocale, locales, translate, type Locale } from '@/content/messages';
import { config } from '@/config';
import { defaultProfile, parseProfile, profileSchema } from '@/domain/profile';

describe('versioned profile', () => {
  it('starts from a valid, safe default', () => {
    const profile = defaultProfile();
    expect(profileSchema.safeParse(profile).success).toBe(true);
    expect(profile.version).toBe(config.storage.version);
    expect(profile.preferences.chatConsent).toBe(false);
    expect(profile.home.rooms).toHaveLength(1);
  });

  it('accepts a current profile unchanged', () => {
    const profile = defaultProfile();
    const parsed = parseProfile(profile);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value).toEqual(profile);
  });

  it('migrates a version-1 record to current defaults', () => {
    const parsed = parseProfile({ version: 1 });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value).toEqual(defaultProfile());
  });

  it('rejects unknown or malformed records', () => {
    expect(parseProfile({ bad: true })).toEqual({ ok: false, error: 'invalid-profile' });
    expect(parseProfile({ ...defaultProfile(), version: config.storage.version + 1 })).toEqual({
      ok: false,
      error: 'invalid-profile',
    });
  });
});

describe('locale messages', () => {
  it('recognises shipped locales and resolves typed keys', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('es')).toBe(true);
    expect(isLocale('hi')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    for (const locale of locales) {
      const typed: Locale = locale;
      expect(translate(typed, 'app.name').length).toBeGreaterThan(0);
      expect(translate(typed, 'app.tagline', { name: 'Almanair' }).length).toBeGreaterThan(0);
    }
  });
});
