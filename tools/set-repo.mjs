#!/usr/bin/env node
/**
 * 把仓库地址写入 README 与 package.json。
 *
 * 用法：
 *   node tools/set-repo.mjs <owner>/<repo>
 *   例：node tools/set-repo.mjs yourname/securepass
 *
 * 作用：
 *   - README.md / README_CN.md 中的 __REPO_URL__ 占位符替换为 https://github.com/<owner>/<repo>
 *   - package.json 写入 repository / bugs / homepage
 *   - src/shared/constants.ts 的 REPOSITORY_SLUG 写成 <owner>/<repo>（手动检查更新要用）
 *   - 重复执行会把已有的 GitHub 地址替换成新地址（幂等）
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const slug = process.argv[2];
if (!slug || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(slug)) {
  console.error('用法: node tools/set-repo.mjs <owner>/<repo>');
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = `https://github.com/${slug}`;
const repoPattern = /https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/g;

for (const file of ['README.md', 'README_CN.md']) {
  const target = path.join(root, file);
  const before = await readFile(target, 'utf8');
  const after = before.replaceAll('__REPO_URL__', url).replace(repoPattern, url);
  await writeFile(target, after, 'utf8');
  console.log(`${file}: ${before === after ? '无变化' : '已更新'}`);
}

const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
pkg.repository = { type: 'git', url: `git+${url}.git` };
pkg.bugs = { url: `${url}/issues` };
pkg.homepage = `${url}#readme`;

const ordered = {};
for (const key of Object.keys(pkg)) {
  ordered[key] = pkg[key];
  if (key === 'license') {
    ordered.repository = pkg.repository;
    ordered.bugs = pkg.bugs;
    ordered.homepage = pkg.homepage;
  }
}
await writeFile(pkgPath, `${JSON.stringify(ordered, null, 2)}\n`, 'utf8');
console.log(`package.json: repository/bugs/homepage -> ${url}`);

const constantsPath = path.join(root, 'src', 'shared', 'constants.ts');
const constantsBefore = await readFile(constantsPath, 'utf8');
const constantsAfter = constantsBefore.replace(
  /export const REPOSITORY_SLUG = '[^']*';/,
  `export const REPOSITORY_SLUG = '${slug}';`,
);
await writeFile(constantsPath, constantsAfter, 'utf8');
console.log(
  `src/shared/constants.ts: REPOSITORY_SLUG -> ${slug}（${
    constantsBefore === constantsAfter ? '无变化' : '已更新'
  }）`,
);

console.log('\n下一步：git remote add origin ' + url + '.git && git push -u origin main');
