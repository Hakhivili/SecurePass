import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../src/renderer/i18n/messages';
import { translate } from '../../src/renderer/i18n';

/**
 * 回归：一次真实缺陷——创建主密码时长度不足，提示里把 `{min}` 原样显示给了用户
 * （组件调用 t() 时漏传参数）。这里加两道网：
 *  1. 静态扫描：所有「不带参数」的 t('key') 调用，其文案都不能含 `{占位符}`；
 *  2. 运行期：translate() 在渲染后仍有占位符时必须告警。
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RENDERER_DIR = path.resolve(HERE, '../../src/renderer');
const PLACEHOLDER = /\{[a-zA-Z_]\w*\}/;
/** 只匹配字面量 key 且没有第二个参数的形式：t('some.key') */
const CALL_WITHOUT_PARAMS = /\bt\(\s*'([^'\\]+)'\s*\)/g;
const LANGUAGES = ['zh-CN', 'en'] as const;

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectSourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) files.push(full);
  }
  return files;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('i18n 插值参数', () => {
  it("不带参数的 t('key') 调用，其文案不能含 {占位符}", () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(RENDERER_DIR)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(CALL_WITHOUT_PARAMS)) {
        const key = match[1] as keyof (typeof MESSAGES)['zh-CN'];
        for (const language of LANGUAGES) {
          const template = MESSAGES[language][key];
          if (template && PLACEHOLDER.test(template)) {
            offenders.push(
              `${path.relative(RENDERER_DIR, file)} → t('${key}') [${language}]`,
            );
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('主密码长度提示会正确替换 {min}', () => {
    expect(translate('zh-CN', 'validation.masterTooShort', { min: 15 })).toBe(
      '主密码至少需要 15 个字符',
    );
    expect(translate('en', 'validation.masterTooShort', { min: 15 })).toBe(
      'The master password needs at least 15 characters',
    );
  });

  it('漏传参数时保留占位符并告警（便于开发期发现）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const rendered = translate('zh-CN', 'validation.masterTooShort');
    expect(rendered).toContain('{min}');
    expect(warn).toHaveBeenCalledOnce();
  });

  it('两种语言的键集合一致（缺翻译会在这里暴露）', () => {
    const zhKeys = Object.keys(MESSAGES['zh-CN']).sort();
    const enKeys = Object.keys(MESSAGES.en).sort();
    expect(enKeys).toEqual(zhKeys);
  });
});
