import { describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@shared/errors';
import {
  checkForUpdate,
  compareVersions,
  type FetchLike,
} from '@main/services/update.service';

const SLUG = 'example/securepass';

interface ReleaseOptions {
  tag?: string;
  url?: string;
  publishedAt?: string | null;
  body?: string | null;
}

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

function releaseResponse(options: ReleaseOptions = {}) {
  return jsonResponse({
    tag_name: options.tag ?? 'v0.2.0',
    html_url: options.url ?? 'https://github.com/example/securepass/releases/tag/v0.2.0',
    published_at: options.publishedAt ?? '2026-12-01T10:00:00Z',
    body: options.body ?? '## 更新内容\n- 支持导入',
  });
}

function fetchOf(response: unknown): FetchLike {
  return vi.fn(async () => response as Awaited<ReturnType<FetchLike>>);
}

describe('compareVersions', () => {
  it('按数字段比较，忽略 v 前缀', () => {
    expect(compareVersions('0.2.0', '0.1.0')).toBe(1);
    expect(compareVersions('v0.1.0', '0.1.0')).toBe(0);
    expect(compareVersions('0.9.9', '0.10.0')).toBe(-1);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
  });

  it('正式版高于同号预发布版', () => {
    expect(compareVersions('1.0.0', '1.0.0-beta.1')).toBe(1);
    expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBe(-1);
  });
});

describe('checkForUpdate', () => {
  it('发现更高版本时返回版本号、发布地址与说明', async () => {
    const result = await checkForUpdate({
      currentVersion: '0.1.0',
      repositorySlug: SLUG,
      fetchImpl: fetchOf(releaseResponse()),
    });

    expect(result).toMatchObject({
      currentVersion: '0.1.0',
      latestVersion: '0.2.0',
      hasUpdate: true,
      releaseUrl: 'https://github.com/example/securepass/releases/tag/v0.2.0',
      publishedAt: '2026-12-01T10:00:00Z',
    });
    expect(result.notes).toContain('支持导入');
  });

  it('同版本或更低版本时 hasUpdate 为 false', async () => {
    const same = await checkForUpdate({
      currentVersion: '0.2.0',
      repositorySlug: SLUG,
      fetchImpl: fetchOf(releaseResponse({ tag: 'v0.2.0' })),
    });
    expect(same.hasUpdate).toBe(false);

    const older = await checkForUpdate({
      currentVersion: '0.2.0',
      repositorySlug: SLUG,
      fetchImpl: fetchOf(releaseResponse({ tag: 'v0.1.9' })),
    });
    expect(older.hasUpdate).toBe(false);
  });

  it('只发一次匿名 GET 请求，不带凭据也不带请求体', async () => {
    const fetchImpl = fetchOf(releaseResponse());
    await checkForUpdate({ currentVersion: '0.1.0', repositorySlug: SLUG, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, { method: string; headers: Record<string, string> }];
    expect(url).toBe('https://api.github.com/repos/example/securepass/releases/latest');
    expect(init.method).toBe('GET');
    expect(init.headers.Accept).toBe('application/vnd.github+json');
    expect(init.headers['User-Agent']).toBe('SecurePass/0.1.0');
    expect(Object.keys(init).sort()).toEqual(['headers', 'method', 'signal']);
  });

  it('发布说明超过 4000 字符时截断', async () => {
    const result = await checkForUpdate({
      currentVersion: '0.1.0',
      repositorySlug: SLUG,
      fetchImpl: fetchOf(releaseResponse({ body: 'x'.repeat(9000) })),
    });
    expect(result.notes).toHaveLength(4_000);
  });

  it('仓库尚未发布版本时给出可读提示', async () => {
    await expect(
      checkForUpdate({
        currentVersion: '0.1.0',
        repositorySlug: SLUG,
        fetchImpl: fetchOf(jsonResponse({ message: 'Not Found' }, 404)),
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.UpdateCheckFailed,
      message: '仓库还没有发布版本',
    });
  });

  it('其它状态码把状态码写进提示', async () => {
    await expect(
      checkForUpdate({
        currentVersion: '0.1.0',
        repositorySlug: SLUG,
        fetchImpl: fetchOf(jsonResponse({}, 500)),
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.UpdateCheckFailed,
      message: 'GitHub 返回 500，请稍后重试',
    });
  });

  it('网络异常时提示检查网络', async () => {
    const failingFetch: FetchLike = async () => {
      throw new Error('getaddrinfo ENOTFOUND api.github.com');
    };
    await expect(
      checkForUpdate({
        currentVersion: '0.1.0',
        repositorySlug: SLUG,
        fetchImpl: failingFetch,
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.UpdateCheckFailed,
      message: '无法连接 GitHub，请检查网络后重试',
    });
  });

  it('超过超时时间后放弃并提示超时', async () => {
    const hangingFetch: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')));
      });

    await expect(
      checkForUpdate({
        currentVersion: '0.1.0',
        repositorySlug: SLUG,
        fetchImpl: hangingFetch,
        timeoutMs: 10,
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.UpdateCheckFailed,
      message: '检查更新超时，请稍后重试',
    });
  });

  it('响应不是 JSON 时提示格式错误', async () => {
    const brokenJson = {
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    };
    await expect(
      checkForUpdate({
        currentVersion: '0.1.0',
        repositorySlug: SLUG,
        fetchImpl: fetchOf(brokenJson),
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.UpdateCheckFailed,
      message: '更新信息格式无法解析',
    });
  });

  it('缺少版本号或地址时拒绝使用该响应', async () => {
    await expect(
      checkForUpdate({
        currentVersion: '0.1.0',
        repositorySlug: SLUG,
        fetchImpl: fetchOf(jsonResponse({ tag_name: 'v0.2.0' })),
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.UpdateCheckFailed,
      message: '更新信息缺少版本号或下载地址',
    });
  });

  it('仓库地址仍是占位符时不发任何请求', async () => {
    const fetchImpl = fetchOf(releaseResponse());
    await expect(
      checkForUpdate({
        currentVersion: '0.1.0',
        repositorySlug: '__REPO_SLUG__',
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.UpdateCheckFailed });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
