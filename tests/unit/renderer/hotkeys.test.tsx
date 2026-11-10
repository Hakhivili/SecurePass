import { describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook } from '@testing-library/react';
import { useHotkey } from '@/utils/hotkeys';

function press(key: string, init: KeyboardEventInit = {}): boolean {
  return fireEvent.keyDown(window, { key, ...init });
}

describe('renderer/useHotkey', () => {
  it('fires on Ctrl/Cmd + key and prevents the browser default', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey({ key: 'n' }, handler));

    const notCancelled = press('n', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(notCancelled).toBe(false);
  });

  it('ignores the bare key when a modifier is required', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey({ key: 'l' }, handler));

    press('l');

    expect(handler).not.toHaveBeenCalled();
  });

  it('is case insensitive and ignores Alt combinations', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey({ key: 'f' }, handler));

    press('F', { metaKey: true });
    press('f', { ctrlKey: true, altKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('steps aside inside inputs when no modifier is required', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey({ key: 'k', ctrlOrMeta: false }, handler));

    const input = document.createElement('input');
    document.body.append(input);
    fireEvent.keyDown(input, { key: 'k' });
    expect(handler).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'k' });
    expect(handler).toHaveBeenCalledTimes(1);

    input.remove();
  });

  it('does not fire while disabled and unbinds on unmount', () => {
    const handler = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ enabled }: { enabled: boolean }) => useHotkey({ key: 'l', enabled }, handler),
      { initialProps: { enabled: false } },
    );

    press('l', { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();

    rerender({ enabled: true });
    press('l', { ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    press('l', { ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
