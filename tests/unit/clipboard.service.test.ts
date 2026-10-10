import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clipboardMock = vi.hoisted(() => {
  const state = { text: '' };
  return {
    state,
    writeText: vi.fn((value: string) => {
      state.text = value;
    }),
    readText: vi.fn(() => state.text),
    clear: vi.fn(() => {
      state.text = '';
    }),
  };
});

vi.mock('electron', () => ({
  clipboard: {
    writeText: clipboardMock.writeText,
    readText: clipboardMock.readText,
    clear: clipboardMock.clear,
  },
}));

const { ClipboardService } = await import('@main/services/clipboard.service');

/**
 * 验收标准第 11 项：剪贴板 —— 到时清理本次复制内容，且不误清理用户后来复制的内容。
 */
let service: InstanceType<typeof ClipboardService>;

beforeEach(() => {
  vi.useFakeTimers();
  clipboardMock.state.text = '';
  clipboardMock.writeText.mockClear();
  clipboardMock.readText.mockClear();
  clipboardMock.clear.mockClear();
  service = new ClipboardService();
});

afterEach(() => {
  service.dispose();
  vi.useRealTimers();
});

describe('ClipboardService', () => {
  it('复制后写入剪贴板，并在设定时间后清空', () => {
    service.copySecret('secret-1', 30);
    expect(clipboardMock.state.text).toBe('secret-1');

    vi.advanceTimersByTime(29_999);
    expect(clipboardMock.state.text).toBe('secret-1');

    vi.advanceTimersByTime(1);
    expect(clipboardMock.state.text).toBe('');
    expect(clipboardMock.clear).toHaveBeenCalledTimes(1);
  });

  it('用户后来复制了别的内容时不误清空', () => {
    service.copySecret('secret-1', 30);
    clipboardMock.state.text = '用户手动复制的内容';

    vi.advanceTimersByTime(30_000);
    expect(clipboardMock.state.text).toBe('用户手动复制的内容');
    expect(clipboardMock.clear).not.toHaveBeenCalled();
  });

  it('新的复制会重置计时器', () => {
    service.copySecret('first', 10);
    vi.advanceTimersByTime(9_000);
    service.copySecret('second', 10);

    vi.advanceTimersByTime(9_000);
    expect(clipboardMock.state.text).toBe('second');

    vi.advanceTimersByTime(1_000);
    expect(clipboardMock.state.text).toBe('');
  });

  it('时长下限被限制为 1 秒', () => {
    service.copySecret('short-lived', 0);
    vi.advanceTimersByTime(999);
    expect(clipboardMock.state.text).toBe('short-lived');
    vi.advanceTimersByTime(1);
    expect(clipboardMock.state.text).toBe('');
  });

  it('dispose 会在内容仍属于本次复制时立即清理', () => {
    service.copySecret('secret-2', 300);
    service.dispose();
    expect(clipboardMock.state.text).toBe('');
  });

  it('dispose 不会清理用户后来复制的内容', () => {
    service.copySecret('secret-2', 300);
    clipboardMock.state.text = '用户内容';
    service.dispose();
    expect(clipboardMock.state.text).toBe('用户内容');
  });
});
