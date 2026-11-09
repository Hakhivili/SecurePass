import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_UI_PREFERENCES } from '@shared/types';
import {
  PreferencesService,
  normalizeLanguage,
  normalizeTheme,
} from '@main/services/preferences.service';

/**
 * 界面偏好（主题/语言）必须能在**未解锁**时读写：
 * 应用启动即进入工作台，此时密码库还锁着，用户仍应能切主题/语言。
 */
let dir: string;
let filePath: string;
let service: PreferencesService;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'securepass-prefs-'));
  filePath = path.join(dir, 'ui-preferences.json');
  service = new PreferencesService(filePath);
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('PreferencesService', () => {
  it('文件不存在时返回默认值', async () => {
    await expect(service.read()).resolves.toEqual(DEFAULT_UI_PREFERENCES);
  });

  it('更新后立即持久化，并可再次读回', async () => {
    await expect(service.update({ theme: 'dark' })).resolves.toEqual({
      theme: 'dark',
      language: DEFAULT_UI_PREFERENCES.language,
    });

    const raw = await fs.readFile(filePath, 'utf8');
    expect(JSON.parse(raw)).toEqual({
      theme: 'dark',
      language: DEFAULT_UI_PREFERENCES.language,
    });

    const fresh = new PreferencesService(filePath);
    await expect(fresh.read()).resolves.toEqual({
      theme: 'dark',
      language: DEFAULT_UI_PREFERENCES.language,
    });
  });

  it('局部更新不会覆盖另一项', async () => {
    await service.update({ theme: 'light', language: 'zh-CN' });
    await expect(service.update({ language: 'en' })).resolves.toEqual({
      theme: 'light',
      language: 'en',
    });
  });

  it('非法值被规范化为默认值', async () => {
    await expect(
      service.update({ theme: 'neon' as never, language: 'fr' as never }),
    ).resolves.toEqual(DEFAULT_UI_PREFERENCES);
  });

  it('文件损坏时回退默认值而不是抛错', async () => {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, '{ not json', 'utf8');
    await expect(service.read()).resolves.toEqual(DEFAULT_UI_PREFERENCES);
  });

  it('normalize 辅助函数只接受白名单取值', () => {
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme(undefined)).toBe(DEFAULT_UI_PREFERENCES.theme);
    expect(normalizeLanguage('en')).toBe('en');
    expect(normalizeLanguage('de')).toBe(DEFAULT_UI_PREFERENCES.language);
  });
});
