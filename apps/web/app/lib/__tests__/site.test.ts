import { describe, expect, it } from 'vitest';
import { SITE_URL, isSupportedLanguage, languageAlternates, localizedPath, switchLanguagePath } from '../site';

describe('switchLanguagePath', () => {
  it('preserves the current guide instead of returning to the home page', () => {
    expect(switchLanguagePath('/en/guides/tab-workspaces/', 'zh')).toBe('/zh/guides/tab-workspaces/');
    expect(switchLanguagePath('/zh/guides/semantic-search/', 'en')).toBe('/en/guides/semantic-search/');
  });

  it('switches legacy home and privacy links into localized routes', () => {
    expect(switchLanguagePath('/', 'en')).toBe('/en/');
    expect(switchLanguagePath('/privacy-policy/', 'en')).toBe('/en/privacy-policy/');
    expect(switchLanguagePath('/zh/privacy-policy/', 'en')).toBe('/en/privacy-policy/');
  });

  it('replaces only the leading language segment', () => {
    expect(switchLanguagePath('/en/guides/zh/', 'zh')).toBe('/zh/guides/zh/');
    expect(switchLanguagePath('/english/', 'zh')).toBe('/zh/english/');
  });
});

describe('localizedPath', () => {
  it('keeps one trailing slash with or without input slashes', () => {
    expect(localizedPath('en', 'guides/privacy-sync')).toBe('/en/guides/privacy-sync/');
    expect(localizedPath('en', '/guides/privacy-sync/')).toBe('/en/guides/privacy-sync/');
    expect(localizedPath('zh')).toBe('/zh/');
  });
});

describe('isSupportedLanguage', () => {
  it('rejects locales without generated routes', () => {
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('zh')).toBe(true);
    expect(isSupportedLanguage('en-US')).toBe(false);
    expect(isSupportedLanguage('fr')).toBe(false);
  });
});

describe('languageAlternates', () => {
  it('points x-default at the canonical Chinese page instead of the legacy root', () => {
    expect(languageAlternates()).toEqual({
      'zh-CN': `${SITE_URL}/zh/`,
      en: `${SITE_URL}/en/`,
      'x-default': `${SITE_URL}/zh/`,
    });
  });

  it('keeps the same page path for every language', () => {
    expect(languageAlternates('guides/tab-workspaces')).toEqual({
      'zh-CN': `${SITE_URL}/zh/guides/tab-workspaces/`,
      en: `${SITE_URL}/en/guides/tab-workspaces/`,
      'x-default': `${SITE_URL}/zh/guides/tab-workspaces/`,
    });
  });
});
