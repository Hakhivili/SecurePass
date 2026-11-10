import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sessionStub = vi.hoisted(() => ({
  setPermissionRequestHandler: vi.fn(),
  setPermissionCheckHandler: vi.fn(),
  webRequest: { onHeadersReceived: vi.fn() },
}));

vi.mock('electron', () => ({
  app: { on: vi.fn() },
  session: { defaultSession: sessionStub },
}));

const { CONTENT_SECURITY_POLICY, applySecurityPolicies, isAllowedNavigation } =
  await import('@main/security');

const DEV_SERVER_URL = 'http://127.0.0.1:5173';

describe('isAllowedNavigation', () => {
  const original = process.env.VITE_DEV_SERVER_URL;

  beforeEach(() => {
    delete process.env.VITE_DEV_SERVER_URL;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.VITE_DEV_SERVER_URL;
    } else {
      process.env.VITE_DEV_SERVER_URL = original;
    }
  });

  it('rejects every navigation once no dev server is running', () => {
    expect(isAllowedNavigation(`${DEV_SERVER_URL}/#/settings`)).toBe(false);
    expect(isAllowedNavigation('https://securepass.example')).toBe(false);
  });

  it('allows same-origin navigations to the dev server', () => {
    process.env.VITE_DEV_SERVER_URL = DEV_SERVER_URL;
    expect(isAllowedNavigation(`${DEV_SERVER_URL}/`)).toBe(true);
    expect(isAllowedNavigation(`${DEV_SERVER_URL}/#/settings`)).toBe(true);
    expect(isAllowedNavigation('http://localhost:5173/#/vault')).toBe(true);
  });

  it('rejects other origins and malformed urls', () => {
    process.env.VITE_DEV_SERVER_URL = DEV_SERVER_URL;
    expect(isAllowedNavigation('https://evil.example/phish')).toBe(false);
    expect(isAllowedNavigation('http://127.0.0.1:9999/')).toBe(false);
    expect(isAllowedNavigation('not a url')).toBe(false);
  });
});

describe('applySecurityPolicies', () => {
  it('denies permissions and blocks attached webviews', () => {
    const on = vi.fn();
    const window = {
      webContents: { session: sessionStub, on },
    };

    applySecurityPolicies(window as never);

    expect(sessionStub.setPermissionRequestHandler).toHaveBeenCalledTimes(1);
    const requestHandler = sessionStub.setPermissionRequestHandler.mock.calls[0][0];
    const callback = vi.fn();
    requestHandler({}, 'notifications', callback);
    expect(callback).toHaveBeenCalledWith(false);

    expect(sessionStub.setPermissionCheckHandler).toHaveBeenCalledTimes(1);
    expect(sessionStub.setPermissionCheckHandler.mock.calls[0][0]()).toBe(false);
    expect(on).toHaveBeenCalledWith('will-navigate', expect.any(Function));
    expect(on).toHaveBeenCalledWith('will-attach-webview', expect.any(Function));
  });

  it('only injects the CSP header for the dev server session', () => {
    const window = { webContents: { session: sessionStub, on: vi.fn() } };
    delete process.env.VITE_DEV_SERVER_URL;
    applySecurityPolicies(window as never);
    expect(sessionStub.webRequest.onHeadersReceived).not.toHaveBeenCalled();

    process.env.VITE_DEV_SERVER_URL = DEV_SERVER_URL;
    try {
      applySecurityPolicies(window as never);
      expect(sessionStub.webRequest.onHeadersReceived).toHaveBeenCalledTimes(1);
    } finally {
      delete process.env.VITE_DEV_SERVER_URL;
    }
  });

  it('ships a policy that forbids remote script and framing', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-eval');
  });
});
