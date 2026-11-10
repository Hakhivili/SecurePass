import { useEffect, useRef } from 'react';

export interface HotkeyOptions {
  /** 单键（不区分大小写），例如 `n`、`f`。 */
  key: string;
  /** 是否要求 Ctrl/Cmd；默认 true。为 false 时在输入控件内不触发。 */
  ctrlOrMeta?: boolean;
  enabled?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * 全局快捷键。
 *
 * 带 Ctrl/Cmd 的组合在输入框里也生效（例如 Ctrl+F 聚焦搜索框）；
 * 不带修饰键的组合在可编辑元素中让位给正常输入。
 */
export function useHotkey(options: HotkeyOptions, handler: () => void): void {
  const { key, ctrlOrMeta = true, enabled = true } = options;
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.altKey) return;
      const hasModifier = event.ctrlKey || event.metaKey;
      if (ctrlOrMeta ? !hasModifier : hasModifier) return;
      if (!ctrlOrMeta && isEditableTarget(event.target)) return;
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      event.preventDefault();
      handlerRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, ctrlOrMeta, enabled]);
}
