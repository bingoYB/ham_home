import { describe, expect, it } from 'vitest';
import { themeFromBackground, themeFromColorScheme } from '../website-theme.utils';

describe('website theme', () => {
  it('respects an explicit scheme even if the system prefers the other theme', () => {
    expect(themeFromColorScheme('only light', 'dark')).toBe('light');
    expect(themeFromColorScheme('dark', 'light')).toBe('dark');
    expect(themeFromColorScheme('normal', 'dark')).toBeUndefined();
  });

  it('uses the system preference when the site supports both schemes', () => {
    expect(themeFromColorScheme('light dark', 'dark')).toBe('dark');
    expect(themeFromColorScheme('dark light', 'light')).toBe('light');
  });

  it('distinguishes luminance even for saturated page backgrounds', () => {
    expect(themeFromBackground(25, 31, 28)).toBe('dark');
    expect(themeFromBackground(252, 234, 217)).toBe('light');
    expect(themeFromBackground(0, 0, 255)).toBe('dark');
    expect(themeFromBackground(0, 255, 0)).toBe('light');
  });
});
