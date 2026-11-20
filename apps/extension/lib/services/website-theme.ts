import type { PanelPosition } from '@/types';
import { themeFromBackground, themeFromColorScheme, type WebsiteTheme } from '@/utils/website-theme.utils';

const THEME_ATTRIBUTES = ['data-theme', 'data-bs-theme', 'data-color-mode', 'data-color-scheme', 'data-darkreader-scheme'];
const DARK_MARKER = /^(dark|dark-mode|theme-dark|dark-theme)$/i;
const LIGHT_MARKER = /^(light|light-mode|theme-light|light-theme)$/i;

// 只取入口附近的大块页面背景，避开按钮自身和文章中的局部卡片。
function getPageSurfaces(position: PanelPosition): Element[] {
  if (!document.body) return [document.documentElement];
  const { innerWidth: width, innerHeight: height } = window;
  const offset = Math.min(52, width / 2);
  const stack = document.elementsFromPoint(position === 'left' ? offset : width - offset, height / 2);
  const surfaces = stack.filter(element => {
    if (element === document.body || element === document.documentElement) return false;
    const rect = element.getBoundingClientRect();
    return rect.width >= width / 2 && rect.height >= height / 2;
  });
  return [...surfaces, document.body, document.documentElement];
}

function readTheme(surfaces: Element[], systemTheme: WebsiteTheme, pixel: CanvasRenderingContext2D | null): WebsiteTheme {
  for (const element of surfaces) {
    const markers = [...THEME_ATTRIBUTES.map(name => element.getAttribute(name) ?? ''), ...element.classList];
    for (const value of markers) {
      if (DARK_MARKER.test(value)) return 'dark';
      if (LIGHT_MARKER.test(value)) return 'light';
    }
  }

  const styles = surfaces.map(element => getComputedStyle(element));
  const metaScheme = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="color-scheme" i]'))
    .find(meta => !meta.media || window.matchMedia(meta.media).matches)?.content;
  const fallback = styles.map(style => themeFromColorScheme(style.colorScheme, systemTheme)).find(Boolean)
    ?? themeFromColorScheme(metaScheme ?? '', systemTheme) ?? systemTheme;

  const backgrounds = styles.map(style => style.backgroundColor).filter(color => color !== 'rgba(0, 0, 0, 0)');
  if (!backgrounds.length) return fallback;
  const rgb = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(backgrounds[0]);
  if (rgb) return themeFromBackground(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));

  // 半透明和广色域背景交给浏览器按绘制顺序合成。这里只绘制颜色值。
  if (!pixel) return fallback;
  pixel.fillStyle = fallback === 'dark' ? 'black' : 'white';
  pixel.fillRect(0, 0, 1, 1);
  for (const color of backgrounds.reverse()) {
    pixel.fillStyle = color;
    pixel.fillRect(0, 0, 1, 1);
  }
  try {
    const [r, g, b] = pixel.getImageData(0, 0, 1, 1).data;
    return themeFromBackground(r, g, b);
  } catch {
    // 浏览器禁用像素读取时，仍能使用网页声明的配色方案。
    return fallback;
  }
}

export function watchWebsiteTheme(position: PanelPosition, onChange: (theme: WebsiteTheme) => void): () => void {
  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const pixel = canvas.getContext('2d', { willReadFrequently: true });
  let frame = 0;
  const observer = new MutationObserver(schedule);

  function refresh() {
    frame = 0;
    const surfaces = getPageSurfaces(position);
    onChange(readTheme(surfaces, scheme.matches ? 'dark' : 'light', pixel));
    observer.disconnect();
    for (const element of surfaces) {
      observer.observe(element, {
        attributes: true, attributeFilter: [...THEME_ATTRIBUTES, 'class', 'style', 'bgcolor'],
        childList: true,
      });
    }
    if (document.head) observer.observe(document.head, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['name', 'content', 'media', 'href', 'disabled'],
    });
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(refresh);
  }

  function onTransition(event: TransitionEvent) {
    if (event.propertyName === 'background-color') schedule();
  }

  refresh();
  const head = document.head;
  head?.addEventListener('load', schedule, true);
  scheme.addEventListener('change', schedule);
  window.addEventListener('resize', schedule);
  document.addEventListener('change', schedule);
  document.addEventListener('transitionend', onTransition);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    head?.removeEventListener('load', schedule, true);
    scheme.removeEventListener('change', schedule);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('change', schedule);
    document.removeEventListener('transitionend', onTransition);
  };
}
