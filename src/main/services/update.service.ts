import { REPOSITORY_SLUG, UPDATE_CHECK_TIMEOUT_MS } from '@shared/constants';
import { AppError, ErrorCode } from '@shared/errors';
import type { UpdateCheckResult } from '@shared/types';

/** `tools/set-repo.mjs` 会把常量里的占位符替换成真实仓库。 */
const PLACEHOLDER_SLUG = '__REPO_SLUG__';
const SLUG_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const RELEASE_API_BASE = 'https://api.github.com/repos/';
/** 发布说明只用于展示摘要，避免把整篇正文塞进界面。 */
const MAX_NOTES_LENGTH = 4_000;

/**
 * 只依赖 `fetch` 的最小形状：便于测试注入假实现，也避免在类型层面绑定 DOM 的 Response。
 */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface UpdateCheckOptions {
  currentVersion: string;
  /** 默认取编译期常量，测试可覆盖。 */
  repositorySlug?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

interface ReleasePayload {
  tag_name?: unknown;
  html_url?: unknown;
  published_at?: unknown;
  body?: unknown;
}

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

function parseVersion(version: string): { parts: number[]; prerelease: string } {
  const trimmed = version.trim().replace(/^v/i, '');
  const plusFree = trimmed.split('+')[0] ?? '';
  const [coreRaw = '', prerelease = ''] = plusFree.split('-');
  const parts = (coreRaw ?? '').split('.').map((piece) => {
    const value = Number.parseInt(piece, 10);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  });
  return { parts, prerelease };
}

/**
 * 语义化版本比较：返回 1 表示 left 更新，-1 表示更旧，0 表示相同。
 * 只覆盖本项目的实际用法（`0.1.0`、`v1.2.3`、`1.0.0-beta.2`），不追求完整 semver 规范。
 */
export function compareVersions(left: string, right: string): number {
  const a = parseVersion(left);
  const b = parseVersion(right);
  const length = Math.max(a.parts.length, b.parts.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a.parts[index] ?? 0) - (b.parts[index] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  if (a.prerelease === b.prerelease) return 0;
  // 正式版高于同号的预发布版：1.0.0 > 1.0.0-beta.1
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease > b.prerelease ? 1 : -1;
}

/**
 * 手动检查更新：**只有用户点击时才会发起这一次 GET 请求**，不带凭据、不带请求体、
 * 不缓存任何响应；除 GitHub 公开 API 外不与任何服务器通信。
 */
export async function checkForUpdate(
  options: UpdateCheckOptions,
): Promise<UpdateCheckResult> {
  const slug = (options.repositorySlug ?? REPOSITORY_SLUG).trim();
  if (!slug || slug === PLACEHOLDER_SLUG || !SLUG_PATTERN.test(slug)) {
    throw new AppError(
      ErrorCode.UpdateCheckFailed,
      '尚未配置仓库地址，无法检查更新（运行 tools/set-repo.mjs 后再试）',
    );
  }

  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const timeoutMs = options.timeoutMs ?? UPDATE_CHECK_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await fetchImpl(`${RELEASE_API_BASE}${slug}/releases/latest`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': `SecurePass/${options.currentVersion}`,
      },
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = controller.signal.aborted;
    throw new AppError(
      ErrorCode.UpdateCheckFailed,
      timedOut ? '检查更新超时，请稍后重试' : '无法连接 GitHub，请检查网络后重试',
      error,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new AppError(
      ErrorCode.UpdateCheckFailed,
      response.status === 404
        ? '仓库还没有发布版本'
        : `GitHub 返回 ${response.status}，请稍后重试`,
    );
  }

  let payload: ReleasePayload;
  try {
    payload = (await response.json()) as ReleasePayload;
  } catch (error) {
    throw new AppError(ErrorCode.UpdateCheckFailed, '更新信息格式无法解析', error);
  }

  const tag = typeof payload.tag_name === 'string' ? payload.tag_name.trim() : '';
  const releaseUrl = typeof payload.html_url === 'string' ? payload.html_url.trim() : '';
  if (!tag || !releaseUrl) {
    throw new AppError(ErrorCode.UpdateCheckFailed, '更新信息缺少版本号或下载地址');
  }

  const latestVersion = tag.replace(/^v/i, '');
  return {
    currentVersion: options.currentVersion,
    latestVersion,
    hasUpdate: compareVersions(latestVersion, options.currentVersion) > 0,
    releaseUrl,
    publishedAt: typeof payload.published_at === 'string' ? payload.published_at : null,
    notes:
      typeof payload.body === 'string' ? payload.body.slice(0, MAX_NOTES_LENGTH) : null,
  };
}
