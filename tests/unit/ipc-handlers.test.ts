import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ErrorCode } from '@shared/errors';
import { IPC } from '@shared/types';
import type { AppContext } from '@main/app-context';

const electronStub = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, ...args: unknown[]) => unknown>(),
  setTitleBarOverlay: vi.fn(),
  openPath: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: (
      channel: string,
      handler: (event: unknown, ...args: unknown[]) => unknown,
    ) => {
      electronStub.handlers.set(channel, handler);
    },
  },
  BrowserWindow: {
    fromWebContents: () => ({ setTitleBarOverlay: electronStub.setTitleBarOverlay }),
  },
  app: { getName: () => 'SecurePass', getVersion: () => '0.1.0' },
  shell: { openPath: electronStub.openPath },
}));

const { isTrustedSender, registerIpcHandlers } = await import('@main/ipc');

interface ContextStub {
  vault: {
    exists: () => Promise<boolean>;
    list: () => Promise<unknown[]>;
    status: () => Promise<{ unlocked: boolean }>;
    getSettings: () => Promise<unknown>;
  };
}

function createContext(overrides: Partial<ContextStub['vault']> = {}) {
  const vault = {
    exists: vi.fn(async () => true),
    list: vi.fn(async () => []),
    status: vi.fn(async () => ({ unlocked: true })),
    getSettings: vi.fn(async () => ({})),
    ...overrides,
  };
  const context = { vault, paths: { baseDir: 'C:\\data' } } as unknown as AppContext;
  return { context, vault };
}

const sender = { id: 42 };
const mainWindow = { isDestroyed: () => false, webContents: sender };

function invoke(channel: string, event: unknown, ...args: unknown[]) {
  const handler = electronStub.handlers.get(channel);
  if (!handler) throw new Error(`channel not registered: ${channel}`);
  return handler(event, ...args);
}

beforeEach(() => {
  electronStub.handlers.clear();
  electronStub.setTitleBarOverlay.mockClear();
  electronStub.openPath.mockReset();
  electronStub.openPath.mockResolvedValue('');
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('isTrustedSender', () => {
  it('accepts only the main window webContents', () => {
    expect(isTrustedSender(mainWindow as never, sender as never)).toBe(true);
    expect(isTrustedSender(mainWindow as never, { id: 7 } as never)).toBe(false);
    expect(isTrustedSender(null, sender as never)).toBe(false);
    expect(
      isTrustedSender(
        { isDestroyed: () => true, webContents: sender } as never,
        sender as never,
      ),
    ).toBe(false);
  });
});

describe('registerIpcHandlers', () => {
  it('rejects calls coming from another webContents', async () => {
    const { context, vault } = createContext();
    registerIpcHandlers(context, () => mainWindow as never);

    const result = await invoke(IPC.vaultExists, { sender: { id: 7 } });

    expect(result).toEqual({
      ok: false,
      error: { code: ErrorCode.UntrustedSender, message: expect.any(String) },
    });
    expect(vault.exists).not.toHaveBeenCalled();
  });

  it('wraps successful handler results', async () => {
    const { context, vault } = createContext();
    registerIpcHandlers(context, () => mainWindow as never);

    await expect(invoke(IPC.vaultExists, { sender })).resolves.toEqual({
      ok: true,
      data: true,
    });
    expect(vault.exists).toHaveBeenCalledTimes(1);
  });

  it('passes application error codes through unchanged', async () => {
    const { context } = createContext({
      list: vi.fn(async () => {
        throw new AppError(ErrorCode.VaultLocked, '密码库已锁定，请先解锁');
      }),
    });
    registerIpcHandlers(context, () => mainWindow as never);

    const result = (await invoke(IPC.vaultList, { sender })) as {
      ok: boolean;
      error: { code: string };
    };
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe(ErrorCode.VaultLocked);
  });

  it('maps validation and unexpected failures to stable codes', async () => {
    const { context } = createContext();
    registerIpcHandlers(context, () => mainWindow as never);

    const invalid = (await invoke(IPC.vaultGet, { sender }, 42)) as {
      ok: boolean;
      error: { code: string };
    };
    expect(invalid.error.code).toBe(ErrorCode.InvalidInput);

    electronStub.openPath.mockResolvedValue('Access is denied');
    const opened = (await invoke(IPC.appOpenDataDir, { sender })) as {
      ok: boolean;
      error: { code: string; message: string };
    };
    expect(opened.ok).toBe(false);
    expect(opened.error.code).toBe(ErrorCode.InvalidInput);
    expect(opened.error.message).toContain('Access is denied');
  });

  it('refuses to restyle the title bar for an untrusted sender', async () => {
    const { context } = createContext();
    registerIpcHandlers(context, () => mainWindow as never);

    await invoke(IPC.windowSyncTitleBar, { sender: { id: 7 } }, { color: '#000' });
    expect(electronStub.setTitleBarOverlay).not.toHaveBeenCalled();

    await invoke(
      IPC.windowSyncTitleBar,
      { sender },
      { color: '#15171b', symbolColor: '#e6e9ee', height: 56 },
    );
    expect(electronStub.setTitleBarOverlay).toHaveBeenCalledWith({
      color: '#15171b',
      symbolColor: '#e6e9ee',
      height: 56,
    });
  });
});
