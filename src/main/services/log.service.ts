import fs from 'node:fs';
import path from 'node:path';

const MAX_LOG_BYTES = 512 * 1024;
const DEFAULT_LOG_FILE_NAME = 'main.log';
const SECRET_KEY_PATTERN = /(password|secret|token|dataKey|kek|dek)/i;

let logFilePath: string | null = null;

/**
 * 日志只记录事件与错误码，绝不写入主密码、明文记录或密钥材料；
 * 序列化细节时按字段名做一次兜底脱敏。
 */
export function initLogger(directory: string): void {
  try {
    fs.mkdirSync(directory, { recursive: true });
    logFilePath = path.join(directory, DEFAULT_LOG_FILE_NAME);
    rotateIfNeeded();
  } catch {
    logFilePath = null;
  }
}

export function getLogFilePath(): string | null {
  return logFilePath;
}

export function closeLogger(): void {
  logFilePath = null;
}

export function logInfo(message: string, detail?: unknown): void {
  write('info', message, detail);
}

export function logWarn(message: string, detail?: unknown): void {
  write('warn', message, detail);
}

export function logError(message: string, detail?: unknown): void {
  write('error', message, detail);
}

function write(
  level: 'info' | 'warn' | 'error',
  message: string,
  detail?: unknown,
): void {
  const line = `${new Date().toISOString()} [${level}] ${message}${formatDetail(detail)}`;

  if (!logFilePath) {
    // 尚未初始化（例如单元测试）时退化为标准错误输出，避免静默丢失。
    if (level === 'error') console.error(line);
    else console.log(line);
    return;
  }

  try {
    rotateIfNeeded();
    fs.appendFileSync(logFilePath, `${line}\n`, { encoding: 'utf8' });
  } catch {
    // 日志失败不能影响主流程。
  }
}

function formatDetail(detail: unknown): string {
  if (detail === undefined) return '';
  if (detail instanceof Error) {
    return ` | ${detail.name}: ${detail.message}\n${detail.stack ?? ''}`;
  }
  try {
    return ` | ${JSON.stringify(detail, (key, value: unknown) =>
      SECRET_KEY_PATTERN.test(key) ? '[redacted]' : value,
    )}`;
  } catch {
    return ` | ${String(detail)}`;
  }
}

function rotateIfNeeded(): void {
  if (!logFilePath) return;
  try {
    const { size } = fs.statSync(logFilePath);
    if (size < MAX_LOG_BYTES) return;
    fs.renameSync(logFilePath, `${logFilePath}.1`);
  } catch {
    // 文件不存在属于正常情况。
  }
}
