import { useEffect, useState } from 'react';
import type { AppTheme } from '@shared/types';

export type ResolvedTheme = 'light' | 'dark';

export function resolveTheme(theme: AppTheme, systemTheme: ResolvedTheme): ResolvedTheme {
  return theme === 'auto' ? systemTheme : theme;
}

function queryPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** 跟随系统主题：监听 prefers-color-scheme 变化。 */
export function useSystemTheme(): ResolvedTheme {
  const [prefersDark, setPrefersDark] = useState<boolean>(queryPrefersDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return prefersDark ? 'dark' : 'light';
}

/** 把解析后的主题写到 <html> 上，供 CSS 变量与 antd 使用。 */
export function applyResolvedTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
