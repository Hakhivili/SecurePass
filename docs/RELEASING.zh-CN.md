# 发布流程（Release）

本文说明如何把一次改动发布成 GitHub Release。发布由 `.github/workflows/release.yml` 自动完成，人工只需三步。

---

## 1. 准备版本

1. 确认 `package.json` 的 `version` 与 `CHANGELOG.md` 的条目一致（如 `0.1.0`）。
2. 把 `CHANGELOG.md` 的 `[Unreleased]` 段改名为 `[x.y.z] - YYYY-MM-DD`，并在顶部新建空的 `[Unreleased]`。
3. 跑一遍完整门禁：

   ```bash
   npm run format:check
   npm run typecheck
   npm run lint
   npm run test:coverage
   npm run build
   ```

4. 提交：`git commit -am "chore(release): vX.Y.Z"`。

## 2. 打标签

```bash
git tag -a v0.1.0 -m "SecurePass v0.1.0"
git push origin main --follow-tags
```

推送 `v*` 标签会触发发布工作流。

## 3. 工作流做了什么

`.github/workflows/release.yml` 触发后会：

1. 在 `ubuntu-latest` / `windows-latest` / `macos-latest` 上分别执行
   `npm ci` → `npm pkg set version=<tag 去掉 v>` → `npm run package`；
2. 删除 `*-unpacked` 目录与 `.blockmap`，把安装包上传为构建产物；
3. 合并三平台产物，生成 `SHA256SUMS.txt`；
4. 用 `gh release create` 创建 Release 并上传全部文件。

也可在 Actions 页面手动触发（`workflow_dispatch`），输入版本号。

## 4. 发布后核对

- [ ] Release 页面包含三平台安装包与 `SHA256SUMS.txt`；
- [ ] 在 Windows 上实际安装一次，确认窗口、图标、版本信息（`属性 → 详细信息`）正确；
- [ ] Release 说明中写明「构建未签名」与「macOS / Linux 未经真机实测」（若确实未实测）；
- [ ] 本地下载后核对哈希：

  ```powershell
  Get-FileHash .\SecurePass-0.1.0-win-x64.exe -Algorithm SHA256
  ```

## 5. 版本号约定

采用语义化版本：

| 变更类型                       | 版本位 | 示例         |
| ------------------------------ | ------ | ------------ |
| 不兼容的接口/数据格式变更      | major  | 1.0.0        |
| 向下兼容的新功能               | minor  | 0.2.0、0.5.0 |
| 向下兼容的修复、文档、依赖更新 | patch  | 0.1.1        |

`0.x` 阶段仍可能有破坏性变更，此时在 `CHANGELOG.md` 的 `Changed`/`Removed` 段显式说明迁移方式。

## 6. 数据格式兼容性

密码库文件包含 `formatVersion`（当前为 1）。修改加密负载结构时必须：

1. 递增 `PAYLOAD_SCHEMA_VERSION`（`src/shared/constants.ts`）；
2. 在 `vault.service.ts` 的 `validatePayload` / `repairItems` / `normalizeSettings` 中提供向后兼容的修补；
3. 在 `tests/unit/payload-integrity.test.ts` 增加旧格式用例；
4. 在 `CHANGELOG.md` 与 `docs/ARCHITECTURE.md` 记录迁移行为。
