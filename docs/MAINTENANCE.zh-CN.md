# 维护政策（Maintenance Policy）

> 这份文档回答三个问题：项目会一直开源吗？更新会持续多久？出安全问题谁来修？

## 1. 永久承诺（不会改变）

| 承诺                       | 说明                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **永久 MIT 许可**          | 代码永远以 MIT 发布，不做 open-core、不加付费墙、不拆「企业版」。任何 fork 都合法。                                      |
| **不引入 CLA**             | 只用 DCO（`Signed-off-by`）接收贡献，不签可支撑「未来闭源/双许可」的贡献者协议。                                         |
| **不向用户收费**           | 项目本身永久免费。若维护者将来接受个人捐赠（博客、爱发电等），那是个人行为，与本项目、本代码库无关，也不会解锁任何功能。 |
| **无账号、无遥测、无云端** | 唯一联网行为是用户手动点击的「检查更新」，详见 `docs/PRIVACY.zh-CN.md`。                                                 |

## 2. 维护状态（README 顶部会同步标注）

| 状态        | 含义       | 承诺                                          |
| ----------- | ---------- | --------------------------------------------- |
| Active      | 正常开发   | 新功能 + 修复 + 依赖跟进                      |
| Maintenance | 功能已冻结 | 只做安全修复、Electron/依赖兼容修复、文档更正 |
| Archived    | 不再维护   | 保留只读；最后一个版本的安全补丁承诺已到期    |

从进入 **Maintenance** 起，维护者承诺：

- **安全报告仍受理**，并在 **12 个月内** 为最后一个发布版本提供安全补丁；
- 严重漏洞（可导致密码库泄露或远程代码执行）优先处理，补丁以 patch 版本发布；
- 12 个月后若仍无维护者接手，在 README 与 Release 说明里明确写出「不再提供安全更新」，不静默停更。

## 3. 版本与支持范围

- 采用语义化版本：`0.x` 阶段允许不兼容变更，`1.0.0` 之后破坏性变更必须升主版本；
- **只维护最新 minor 线**（例如发布 `0.4.x` 后，`0.3.x` 不再回补功能补丁，但严重安全问题会评估是否回补）；
- 数据格式兼容：`vault.securepass` 的 `formatVersion` 递增时必须提供迁移路径，旧库通过 `validatePayload` / `repairItems` / `normalizeSettings` 自动修补，并且新增迁移必须补测试（见 `docs/RELEASING.zh-CN.md` §5）。

## 4. 依赖与平台跟进

- 依赖更新：Dependabot 自动提 PR（npm + GitHub Actions），`npm audit --omit=dev` 纳入 CI；
- Electron 大版本：**每年至少跟进一次**，避免两年后无法修复上游 CVE；
- 平台支持：Windows（主力，已实测）、macOS / Linux（构建与代码路径已就绪，见下条说明）。

### macOS 说明

macOS 版本目前**未签名、未公证**（Apple Developer Program 需每年 99 美元，与「零收费」目标冲突）。

现状与建议：

- 发布 `.dmg`/`.zip` 时在 Release 说明中标注「未签名」；
- 首次打开需右键 → 打开，或执行 `xattr -d com.apple.quarantine /Applications/SecurePass.app`；
- 若将来有资助或赞助覆盖证书成本，再启用 Developer ID 签名与公证，配置方法已写在 `docs/SIGNING.zh-CN.md`。

## 5. 安全问题的处理流程

1. 报告渠道：**GitHub Security Advisories**（仓库 Security 页 → Report a vulnerability），不要开公开 Issue；
2. 响应：7 天内确认收到，给出初步判断与预计修复窗口；
3. 修复：补丁版本发布，Release 说明中注明影响范围与升级建议，并在仓库 Security Advisories 中公开致谢（除非你希望匿名）；
4. 处理原则：先修复、再披露细节；不隐瞒、不淡化。

## 6. 贡献与质量门禁

任何 PR 都必须通过：

```bash
npm run format:check
npm run typecheck
npm run lint
npm run test:coverage   # 阈值 statements 78 / branches 85 / functions 78 / lines 78
```

涉及界面改动的 PR 需要截图；涉及加密、数据格式、IPC 契约的 PR 需要在描述里写明兼容性影响。

## 7. 这份文档本身的约束

维护者可以更新本政策（例如把「12 个月」延长），但**不能缩短已承诺的支持期**，也不能删除 §1 的永久承诺。变更需在 `CHANGELOG.md` 中记录。
