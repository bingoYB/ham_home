import type { ThemeMode } from '@/types';

export type WebsiteTheme = Exclude<ThemeMode, 'system'>;

export function themeFromColorScheme(value: string, systemTheme: WebsiteTheme): WebsiteTheme | undefined {
  const schemes = value.toLowerCase().split(/\s+/);
  const light = schemes.includes('light');
  const dark = schemes.includes('dark');
  if (light && dark) return systemTheme;
  if (light) return 'light';
  if (dark) return 'dark';
  return undefined;
}

export function themeFromBackground(red: number, green: number, blue: number): WebsiteTheme {
  const linear = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  // 黑、白在相对亮度约 0.179 处具有相同对比度。
  return luminance < 0.179 ? 'dark' : 'light';
}
