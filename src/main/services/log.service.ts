import fs from 'node:fs';
import path from 'node:path';

const MAX_LOG_BYTES = 512 * 1024;
const DEFAULT_LOG_FILE_NAME = 'main.log';
const SECRET_KEY_PATTERN = /(password|secret|token|dataKey|kek|dek)/i;
/** `password=xxx`、`"password":"xxx"`、`password: xxx` 等形态。 */
const SECRET_ASSIGNMENT_PATTERN =
  /(\b(?:masterPassword|password|passphrase|secret|token|apiKey|dataKey|kek|dek)\b["']?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;)}\]]+)/gi;
/** 裸的 base64/十六进制长串（密钥、密文、盐），日志里没有保留价值。 */
const LONG_BLOB_PATTERN = /\b[A-Za-z0-9+/]{40,}={0,2}\b/g;
const MAX_STACK_CHARS = 2_000;

let logFilePath: string | null = null;

/**
 * 日志只记录事件与错误码，绝不写入主密码、明文记录或密钥材料；
 * 序列化细节时按字段名做一次兜底脱敏，异常消息与堆栈同样经过脱敏。
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

/**
 * 脱敏任意文本：先处理「键 = 值」，再抹掉长 base64/hex 串。
 *
 * 异常消息与堆栈是自由文本，无法像对象那样按键名过滤，因此统一走这里。
 */
export function redactSecrets(text: string): string {
  return text
    .replace(SECRET_ASSIGNMENT_PATTERN, (_match, prefix: string) => `${prefix}[redacted]`)
    .replace(LONG_BLOB_PATTERN, '[redacted]');
}

function write(
  level: 'info' | 'warn' | 'error',
  message: string,
  detail?: unknown,
): void {
  const line = `${new Date().toISOString()} [${level}] ${redactSecrets(message)}${formatDetail(
    detail,
  )}`;

  if (!logFilePath) {
    // 尚未初始化（例如单元测试）时退化为标准输出，避免静默丢失。
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
    const stack = detail.stack
      ? redactSecrets(detail.stack).slice(0, MAX_STACK_CHARS)
      : '';
    return ` | ${detail.name}: ${redactSecrets(detail.message)}${stack ? `\n${stack}` : ''}`;
  }
  try {
    const serialized = JSON.stringify(detail, (key, value: unknown) =>
      SECRET_KEY_PATTERN.test(key) ? '[redacted]' : value,
    );
    return ` | ${redactSecrets(serialized ?? String(detail))}`;
  } catch {
    return ` | ${redactSecrets(String(detail))}`;
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
