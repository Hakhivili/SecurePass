import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  closeLogger,
  getLogFilePath,
  initLogger,
  logError,
  logInfo,
  logWarn,
} from '@main/services/log.service';
import { createTempDir, removeDir } from '../helpers/vault-fixture';

let dir: string;

beforeEach(async () => {
  dir = await createTempDir('securepass-log-');
  initLogger(dir);
});

afterEach(async () => {
  closeLogger();
  await removeDir(dir);
});

async function readLog(): Promise<string> {
  const file = getLogFilePath();
  expect(file).toBeTruthy();
  return fs.readFile(file as string, 'utf8');
}

describe('log.service', () => {
  it('writes timestamped lines with level prefixes', async () => {
    logInfo('应用启动', { version: '0.1.0' });
    logWarn('磁盘写入偏慢');
    logError('调用失败', new Error('boom'));

    const text = await readLog();
    const lines = text.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z \[info\] 应用启动/);
    expect(text).toContain('[warn] 磁盘写入偏慢');
    expect(text).toContain('[error] 调用失败');
    expect(text).toContain('Error: boom');
  });

  it('never records secret-looking fields', async () => {
    logInfo('解锁尝试', {
      masterPassword: 'correct horse battery staple',
      password: 'hunter2',
      dataKey: 'a'.repeat(64),
      itemId: 'item-1',
    });

    const text = await readLog();
    expect(text).not.toContain('correct horse battery staple');
    expect(text).not.toContain('hunter2');
    expect(text).not.toContain('a'.repeat(64));
    expect(text).toContain('[redacted]');
    expect(text).toContain('item-1');
  });

  it('redacts secrets that leak through error messages and stack traces', async () => {
    const error = new Error(
      'unlock failed for password=hunter2 with masterPassword: correct horse',
    );
    error.stack = [
      'Error: unlock failed with masterPassword=topsecret and token=abc123',
      '    at VaultService.unlock (vault.service.ts:1:1)',
      `    at payload ${'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5'.repeat(2)}`,
    ].join('\n');

    logError('解锁失败', error);

    const text = await readLog();
    expect(text).not.toContain('hunter2');
    expect(text).not.toContain('correct horse');
    expect(text).not.toContain('topsecret');
    expect(text).not.toContain('abc123');
    expect(text).not.toContain('QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5');
    expect(text).toContain('[redacted]');
    expect(text).toContain('vault.service.ts:1:1');
  });

  it('keeps unrelated error text intact', async () => {
    logError('磁盘写入失败', new Error('ENOSPC: no space left on device'));

    const text = await readLog();
    expect(text).toContain('ENOSPC: no space left on device');
  });

  it('rotates once the file grows past the size limit', async () => {
    // 用带空格的中文填充，避免被「长 base64/口令」脱敏规则压成 [redacted]
    const chunk = '填充内容 '.repeat(1024);
    for (let index = 0; index < 80; index += 1) {
      logInfo(`填充 ${index}`, chunk);
    }

    const files = await fs.readdir(dir);
    expect(files).toContain('main.log');
    expect(files).toContain('main.log.1');
    const rotated = await fs.stat(path.join(dir, 'main.log.1'));
    expect(rotated.size).toBeLessThan(1024 * 1024);
  });

  it('falls back to the console when no directory is configured', () => {
    closeLogger();
    expect(getLogFilePath()).toBeNull();
    expect(() => logError('测试兜底')).not.toThrow();
  });
});
