# SecurePass 开源就绪清单（GitHub / MIT）

> 用途：产品用途已确认为「个人自用 + 开发完成后在 GitHub 开源」，本清单用于发布前逐项核对。
> 状态标记：✅ 已具备｜🔧 待补齐（可代劳）｜🙋 需要你提供信息｜⛔ 发布前必须确认

---

## 1. 发布形态（建议）

| 项                                | 决定                                                                  |
| --------------------------------- | --------------------------------------------------------------------- |
| 协议                              | MIT（`LICENSE` 已存在）                                               |
| 首发版本                          | `v0.1.0`，与 `package.json` / `CHANGELOG.md` 保持一致                 |
| 发布内容                          | 源码 + 三平台**未签名**安装包 + `SHA256SUMS.txt`                      |
| 代码签名 / 公证                   | 暂不做（需付费证书）；在 Release 说明中告知用户系统会提示"未知发布者" |
| 自动更新                          | 暂不做（`electron-updater` 需签名后才可靠），列入 v0.5                |
| `package.json` 的 `private: true` | **保留**。它只阻止误发布到 npm registry，不影响 GitHub 开源           |

---

## 2. 已具备 ✅

| 项                     | 位置                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| MIT 许可证             | `LICENSE`                                                                                                                                        |
| 中英文说明             | `README.md`、`README_CN.md`                                                                                                                      |
| 架构 / 安全 / API 文档 | `docs/ARCHITECTURE.md`、`SECURITY.md`（根目录）、`docs/API.md`                                                                                   |
| 需求基线 / 部署记录    | `docs/REQUIREMENTS-BASELINE.zh-CN.md`、`docs/DEPLOYMENT-NOTES.zh-CN.md`                                                                          |
| 贡献指南与行为准则     | `CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`                                                                                                          |
| 变更日志               | `CHANGELOG.md`（0.1.0）                                                                                                                          |
| Issue 模板             | `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md`                                                                                         |
| CI（三平台）           | `.github/workflows/ci.yml`：`npm ci` → format:check → typecheck → lint → test → build                                                            |
| 发布流程               | `.github/workflows/release.yml`：三平台 `npm run package`，生成 `SHA256SUMS.txt` 并创建 GitHub Release                                           |
| 工程规范               | `.editorconfig`、`.eslintrc.cjs`、`.prettierrc`、`.prettierignore`、`.gitignore`（忽略 `node_modules/dist/dist-electron/release/coverage/.env`） |
| 代码格式化             | ✅ **2026-10-05 已统一**：全仓库通过 `npm run format:check`（此前 27 个文件不合格）                                                              |
| 依赖安全               | `npm audit` 结果需在发布前复核（本次安装因沙箱网络限制未跑完整审计）                                                                             |
| 运行时依赖许可证       | **77 个包全部 MIT**，无 copyleft（见第 5 节）                                                                                                    |

---

## 3. 待补齐（🔧 我可以直接做）

| 项                      | 说明                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------- |
| README 增强             | 徽章（CI / License / Release）、功能截图或 GIF、下载指引、`yourusername` 占位符替换    |
| `CHANGELOG.md` 维护约定 | 增加「如何为下一个版本写变更」的说明，配合 Release 流程                                |
| GitHub 标签与里程碑     | 按草案建立：`bug/enhancement/feature/documentation/security`、`priority: high          | medium | low`、`help wanted/good first issue`；里程碑 `v0.1.0 / v0.5.0 / v1.0.0` |
| 测试覆盖率门槛          | 安装 `@vitest/coverage-v8`，在 CI 增加 `npm run test:coverage` 与阈值（草案建议 >80%） |

### 已完成（2026-11-11）

| 项                       | 结果                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| 根目录 `SECURITY.md`     | 已从 `docs/` 移到仓库根目录，补「Security Advisories 私下上报」一节                                   |
| `THIRD-PARTY-NOTICES.md` | 已生成，由 `node tools/generate-notices.mjs` 从 `package.json` 依赖重新生成                           |
| 用户手册                 | `docs/USER-GUIDE.zh-CN.md`                                                                            |
| 应用图标                 | `build/icon.png` / `build/icon.ico`（`python tools/generate-icon.py` 可重新生成），已在打包配置里引用 |
| exe 元数据               | `ProductName=SecurePass`、`FileVersion=0.1.0`、`CompanyName=SecurePass Contributors`                  |
| `SHA256SUMS.txt`         | `release.yml` 打包后自动生成并随 Release 上传                                                         |
| 安装包体积               | `app.asar` 75 MB → 1.2 MB（前端依赖已被 Vite 打进 dist，不再重复随包）                                |
| 打包冒烟                 | `ci.yml` 新增 `package-smoke` 任务，校验 exe 元数据与 asar 体积预算                                   |

---

## 4. 需要你提供（🙋）

| 项                                                          | 用于                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| GitHub 用户名 + 仓库名（如 `yourname/securepass`）          | 替换 `package.json` `repository`/`bugs`/`homepage`、README 徽章与克隆地址、`electron-builder.yml` 的 `publish` |
| 安全漏洞报告渠道（邮箱或"仅通过 GitHub Security Advisory"） | 根目录 `SECURITY.md`；建议直接用 GitHub 私密漏洞上报，无需暴露邮箱                                             |
| 应用图标（或其设计意图/配色）                               | `build/icon.*`；也可以先用现有蓝色主色 `#2563eb` 生成一个简单图标                                              |
| 目标 Git 分支命名（默认 `main`）与是否保留 `develop`        | `ci.yml` 目前监听 `main`/`develop`                                                                             |
| 是否要公开发布安装包（否则只发源码）                        | Release 内容范围                                                                                               |

---

## 5. 运行时依赖许可证清单（全部 MIT ✅）

直接依赖 7 个（`react`、`react-dom`、`react-router-dom`、`zustand`、`antd`、`@ant-design/icons`、`hash-wasm`），
生产依赖闭包共 **77 个包，全部为 MIT**，无 GPL/AGPL/LGPL/MPL 等 copyleft 组件，与项目 MIT 许可兼容。

生成方式（发布前应重新执行并核对版本）：

```powershell
# 遍历 package.json 的 dependencies 闭包，读取每个包的 license 字段
node <清单脚本>   # 脚本随后加入 scripts/ 目录
```

主要包版本：`react@18.3.1`、`react-dom@18.3.1`、`react-router-dom@6.30.6`、`zustand@5.0.15`、
`antd@5.29.3`、`@ant-design/icons@5.6.1`、`hash-wasm@4.12.0`。

> 开发依赖（electron、vite、vitest、eslint、prettier、typescript 等）不随产物分发，
> 仍建议在 `THIRD-PARTY-NOTICES.md` 中单列一节说明。

---

## 6. 发布前必须确认（⛔）

- [ ] **仓库内无个人数据**：`vault.securepass`、`*.bak`、`pre-restore-*` 均不在仓库（密码库位于 userData 目录，天然隔离）——需在**清理提交历史后**再确认一次。
- [ ] **无密钥/令牌/证书**：仓库内不存在 `.env`、`*.pem`、`*.p12`、签名证书或 CI 密钥。
- [ ] **无本机绝对路径**：代码与文档中不得出现 `C:\Users\...`、`D:\ToolsDataSite\...` 等本机路径（当前 `docs/DEPLOYMENT-NOTES.zh-CN.md` 与 `docs/REQUIREMENTS-BASELINE.zh-CN.md` 含本机路径与部署细节，**开源前需改写或移到仓库外**）。
- [ ] **提交历史检查**：确认历史提交中不含上述内容（必要时用 `git filter-repo` 清理，或首次公开前重建仓库）。
- [ ] **`npm audit` 复核**：记录已知漏洞与处置结论。
- [ ] **`CHANGELOG.md` 与版本号一致**，Release tag 为 `v0.1.0`。
- [ ] **README 中的占位符全部替换**（`yourusername` 等）。
- [ ] **安装包可用性**：在 Windows 真机安装验证；macOS/Linux 若无法真机验证，需在 Release 说明中注明"未经该平台实测"。

---

## 7. 已知限制（任务书 §9 要求交付，可直接放入 README/SECURITY）

1. **内存明文无法可靠清零**：JavaScript 字符串不可变，锁定时只能清零 `Buffer` 并释放引用，GC 时机不可控。
2. **剪贴板历史无法清除**：仅清空系统剪贴板当前内容，且只在内容仍为本次复制内容时执行；系统或第三方剪贴板历史保留的副本无法删除。
3. **无主密码找回**：忘记主密码后，密码库与加密备份均无法解密。
4. **单写者限制**：同一密码库同一时刻只允许一个进程写入（锁文件机制），不支持多实例并发。
5. **备份为整库替换**：恢复是"替换当前库"，不提供按记录合并或差异恢复。
6. **不防本地恶意软件**：操作系统被控、存在键盘记录器、或解锁期间内存被读取时，不在防护范围内。
7. **主题与语言设置尚未生效**：`theme` / `language` 已持久化但界面尚未消费（当前为浅色 + 简体中文）。
8. **搜索性能未验证**：搜索为渲染层全量过滤，任务书的"1000 条 <300 ms"尚无基准数据。
9. **发布与更新**：首版无代码签名、无自动更新；Windows 可能提示"未知发布者"。
10. **跨平台实测范围**：当前仅在 Windows 上完成构建与测试。
