#!/usr/bin/env node
/**
 * 生成 THIRD-PARTY-NOTICES.md。
 *
 * 作用：把 package.json 里声明的运行时依赖（会被打进安装包的部分）以及 Electron / Chromium
 * 的许可证信息汇总成一份随仓库发布的通知文件。新增或升级依赖后重新运行即可：
 *
 *   node tools/generate-notices.mjs
 */
import { createRequire } from 'node:module';
import { readFile, readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

const LICENSE_FILES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'license',
  'COPYING',
];

function findLicenseFile(dir) {
  for (const name of LICENSE_FILES) {
    const file = path.join(dir, name);
    if (existsSync(file)) return file;
  }
  return null;
}

function indent(text) {
  return text
    .replace(/\r\n/g, '\n')
    .trim()
    .split('\n')
    .map((line) => (line.trim() ? `    ${line}` : ''))
    .join('\n');
}

const sections = [];
const summary = [];

for (const name of Object.keys(pkg.dependencies ?? {}).sort()) {
  let manifest;
  try {
    manifest = require(`${name}/package.json`);
  } catch {
    const fallback = path.join(root, 'node_modules', name, 'package.json');
    if (!existsSync(fallback)) continue;
    manifest = JSON.parse(readFileSync(fallback, 'utf8'));
  }

  const dir = path.dirname(require.resolve(`${name}/package.json`));
  const licenseFile = findLicenseFile(dir);
  const licenseText = licenseFile ? readFileSync(licenseFile, 'utf8') : null;
  const license = typeof manifest.license === 'string' ? manifest.license : 'Unknown';

  summary.push(`| \`${name}\` | ${manifest.version ?? '-'} | ${license} |`);
  sections.push(
    [
      `## ${name}`,
      '',
      `- 版本：${manifest.version ?? '未知'}`,
      `- 许可证：${license}`,
      `- 主页：${manifest.homepage ?? manifest.repository?.url ?? '（未声明）'}`,
      '',
      licenseText
        ? indent(licenseText)
        : `    该依赖未随包提供许可证正文，请访问 ${
            manifest.homepage ?? 'npm 页面'
          } 查看。`,
    ].join('\n'),
  );
}

const header = `# 第三方组件许可通知

SecurePass 本身以 MIT 许可证发布。应用分发时还会包含下列第三方组件，它们各自的许可证如下。

## 组件清单

| 组件 | 版本 | 许可证 |
| --- | --- | --- |
${summary.join('\n')}

### Electron 与 Chromium

安装包内的 \`SecurePass.exe\` 由 Electron 打包，其中包含 Chromium、Node.js、V8 及若干
Chromium 依赖（BSD 风格许可证等）。完整许可证正文随安装包提供：

- \`resources/eula.txt\`（Electron 许可证）
- \`LICENSES.chromium.html\`（Chromium 及其依赖的许可证）

## 许可证正文

> 本文件由 \`node tools/generate-notices.mjs\` 生成，请勿手工编辑；新增或升级依赖后重新运行。
`;

const body = sections.join('\n\n');
writeFileSync(path.join(root, 'THIRD-PARTY-NOTICES.md'), `${header}\n${body}\n`, 'utf8');
console.log(
  `wrote THIRD-PARTY-NOTICES.md (${Object.keys(pkg.dependencies ?? {}).length} packages)`,
);
