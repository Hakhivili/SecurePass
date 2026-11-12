# 代码签名指南（Windows / macOS）

本文说明 SecurePass 的安装包如何签名、有哪些可选方案、每种方案的具体操作，以及在 GitHub
Actions 里怎么配置。**不签名也能用**：产物照常安装运行，只是首次下载运行会出现
SmartScreen / Gatekeeper 提示。签名解决的是「系统是否信任发布者」，不改变程序本身的行为。

## 1. 先搞清楚要解决什么

| 现象                                                  | 原因                         | 签名能解决吗                                                                  |
| ----------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| Windows 提示「Windows 已保护你的电脑」（SmartScreen） | 该文件没有足够的信誉记录     | 部分。EV 证书或 Azure Trusted Signing 可以立刻获得信任；OV 证书还要累积下载量 |
| 「未知发布者」                                        | 安装包没有 Authenticode 签名 | 是                                                                            |
| 企业/学校的终端管控禁止运行未签名程序                 | 策略要求有效签名             | 是                                                                            |
| macOS 提示「无法打开，因为无法验证开发者」            | 未签名或未公证（notarize）   | 是（需 Apple 开发者账号 + 公证）                                              |
| 别人改了你的安装包                                    | 需要完整性校验               | 签名 + `SHA256SUMS.txt` 一起用                                                |

> 签名只能证明「这个包是证书持有人发布的、且未被篡改」，**不能**证明代码没有漏洞。

## 2. 方案对比（价格为 2026 年前后公开报价的量级，具体以 CA 官网为准）

| 方案                                  | 费用           | 适用                  | 优点                                                        | 缺点                                                                  |
| ------------------------------------- | -------------- | --------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| 不签名 + 发布 `SHA256SUMS.txt`        | 0              | 自用、小范围内测      | 零成本，当前默认状态                                        | 每次都有 SmartScreen 提示                                             |
| 自签名证书（自己生成）                | 0              | 自己机器、小团队内测  | 完全离线，可把证书装进「受信任的根证书颁发机构」            | 别人的机器仍然报警；证书过期/重装要重新导入                           |
| Azure Trusted Signing（微软云签名）   | 约 $10/月      | 有合规身份的团队/个人 | 最便宜的「真签名」，无需保管硬件；electron-builder 原生支持 | 需要通过身份验证（组织一般要求成立满 3 年；个人身份在部分区域受限）   |
| SignPath.io（开源项目免费）           | 0（开源项目）  | 开源仓库              | 免费提供 OV/EV 级签名，密钥在对方 HSM                       | 需要申请、审核，签名在其云端完成                                      |
| Certum / SSL.com 开源代码签名证书     | 约 €30–80/年   | 开源项目              | 便宜、被 Windows 认可                                       | 需用厂商云签名工具或 USB 令牌                                         |
| 普通 OV 代码签名证书                  | 约 $200–400/年 | 商业分发              | 通行做法                                                    | 2023 年 6 月起必须把私钥存硬件（USB 令牌/云 HSM），还得买令牌或云服务 |
| EV 代码签名证书                       | 约 $300–600/年 | 面向大量陌生用户分发  | SmartScreen 信誉最好                                        | 贵，且硬件令牌流程更繁琐                                              |
| Apple Developer Program（macOS 公证） | $99/年         | 发布 macOS 版         | 唯一能消除 Gatekeeper 拦截的途径                            | 只能签 Apple 平台；需 `notarytool` 流程                               |

**给本项目的建议**：

1. 只是发给朋友/自己用 → 保持不签名，把 `SHA256SUMS.txt` 一起给出（现在就是这样）。
2. 想让提示彻底消失、且能通过身份验证 → Azure Trusted Signing（每月约 10 美元，最省事）。
3. 想开源免费签 → 申请 SignPath.io 或买 Certum 开源证书。
4. macOS 版本要给别人用 → 必须 Apple Developer Program + 公证。

## 3. Windows：用证书文件签名（PFX / Base64）

electron-builder 通过两个环境变量就能签名，配置里不需要写任何密钥：

```powershell
# CSC_LINK 可以是 .pfx 文件路径，也可以是 pfx 的 base64 字符串
$env:CSC_LINK = 'C:\path\to\securepass.pfx'          # 或 base64 文本
$env:CSC_KEY_PASSWORD = 'pfx 的密码'
npm run package
```

`electron-builder.yml` 里已有的部分（无需改动即可生效）：

```yaml
win:
  signtoolOptions:
    publisherName: SecurePass Contributors
    rfc3161TimeStampServer: http://timestamp.digicert.com
  signingHashAlgorithms:
    - sha256
```

时间戳很重要：**没有时间戳的签名在证书过期后即失效**，加了 RFC3161 时间戳则长期有效。

### 3.1 自签名证书（仅自用/内测）

```powershell
$cert = New-SelfSignedCertificate `
  -Type CodeSigningCert `
  -Subject 'CN=SecurePass Contributors' `
  -KeyUsage DigitalSignature `
  -FriendlyName 'SecurePass Self-Signed' `
  -CertStoreLocation 'Cert:\CurrentUser\My' `
  -NotAfter (Get-Date).AddYears(3)

$pwd = ConvertTo-SecureString -String 'change-me' -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath build\securepass-selfsigned.pfx -Password $pwd

# 转成 base64（供 CI 使用；本地直接用路径也行）
[Convert]::ToBase64String([IO.File]::ReadAllBytes('build\securepass-selfsigned.pfx')) |
  Set-Content build\securepass-selfsigned.pfx.base64 -Encoding ascii
```

签名后验证：

```powershell
Get-AuthenticodeSignature release\SecurePass-0.1.0-win-x64.exe |
  Format-List Status, StatusMessage, SignerCertificate
# Status 应为 Valid
```

> 自签名包在**别人的机器上仍显示「未知发布者」**。要让某台机器信任，需把证书导入
> `certlm.msc → 受信任的根证书颁发机构`（或用组策略下发）。因此它适合内测，不适合公开分发。

### 3.2 USB 令牌 / 云 HSM（OV、EV 证书的常见形态）

私钥在硬件里，签名时由 `signtool` 调用厂商的 CSP/加密服务：

```powershell
# 令牌插入后，取证书指纹
Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.EnhancedKeyUsageList.ObjectId -contains '1.3.6.1.5.5.7.3.3' } |
  Select-Object Subject, Thumbprint
```

然后二选一：

```yaml
# 方式 A：让 electron-builder 调 signtool
win:
  signtoolOptions:
    certificateSha1: 'AB12…（去掉空格的指纹）'
    rfc3161TimeStampServer: http://timestamp.digicert.com
```

```jsonc
// 方式 B：自定义签名脚本（build/sign-windows.cjs），适合云 HSM 客户端
module.exports = async function sign(configuration) {
  const { execFileSync } = require('node:child_process');
  execFileSync('C:\\path\\to\\signtool.exe', [
    'sign', '/sha1', process.env.CERT_SHA1, '/fd', 'sha256',
    '/tr', 'http://timestamp.digicert.com', '/td', 'sha256',
    '/d', 'SecurePass', configuration.path,
  ], { stdio: 'inherit' });
};
```

配置里写 `win.sign: './build/sign-windows.cjs'` 即可。

### 3.3 Azure Trusted Signing（推荐的低价方案）

1. 在 Azure 订阅里创建 **Trusted Signing Account** + **Certificate Profile**（Public Trust）。
2. 给服务主体授予角色 _Trusted Signing Certificate Profile Signer_。
3. 配置：

```yaml
win:
  azureSignOptions:
    publisherName: SecurePass Contributors
    endpoint: https://eus.codesigning.azure.net
    codeSigningAccountName: <account 名>
    certificateProfileName: <profile 名>
```

4. 环境变量：`AZURE_TENANT_ID`、`AZURE_CLIENT_ID`、`AZURE_CLIENT_SECRET`（或用 OIDC 联邦登录，
   免存长期密钥）。electron-builder 25 内置支持，无需额外依赖。

### 3.4 验证签名与时间戳

```powershell
signtool verify /pa /v /d release\SecurePass-0.1.0-win-x64.exe
Get-AuthenticodeSignature release\SecurePass-0.1.0-win-x64.exe | Format-List *
```

## 4. macOS：Developer ID + 公证

```yaml
mac:
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  notarize: true
```

需要的环境变量：

| 变量                          | 说明                                                 |
| ----------------------------- | ---------------------------------------------------- |
| `CSC_LINK`                    | Developer ID Application 证书 `.p12` 的路径或 base64 |
| `CSC_KEY_PASSWORD`            | `.p12` 密码                                          |
| `APPLE_ID`                    | Apple 开发者账号邮箱                                 |
| `APPLE_APP_SPECIFIC_PASSWORD` | appleid.apple.com 生成的 App 专用密码                |
| `APPLE_TEAM_ID`               | 团队 ID（10 位）                                     |

公证完成后 electron-builder 会自动 `stapler staple`，可离线验证：

```bash
spctl -a -vvv -t install "SecurePass-0.1.0-mac-arm64.dmg"
codesign --verify --deep --strict --verbose=2 "SecurePass.app"
```

## 5. 在 GitHub Actions 里启用签名

`release.yml` 已预留好这一步（见「Prepare signing material」），**没有配置 secret 时自动跳过签名**，
产物与现在一致。需要签名时在仓库 _Settings → Secrets and variables → Actions_ 添加：

| Secret                                                        | 用于             | 说明                                              |
| ------------------------------------------------------------- | ---------------- | ------------------------------------------------- |
| `WINDOWS_CERT_PFX_BASE64`                                     | Windows          | pfx 的 base64（`[Convert]::ToBase64String(...)`） |
| `WINDOWS_CERT_PASSWORD`                                       | Windows          | pfx 密码                                          |
| `MAC_CERT_PFX_BASE64`                                         | macOS            | Developer ID `.p12` 的 base64                     |
| `MAC_CERT_PASSWORD`                                           | macOS            | `.p12` 密码                                       |
| `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID`  | macOS 公证       | 见上表                                            |
| `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` | Windows（Azure） | 改用 Azure Trusted Signing 时用                   |

注意事项：

- 证书与密码属于高敏信息，**只能放 Secrets**，不要提交进仓库；`.gitignore` 已忽略 `*.pfx`、`*.p12`、`*.base64`。
- 证书到期前 30 天会有告警，记得续期后更换 secret；时间戳能让已发布版本的签名长期有效。
- Fork 的 PR 拿不到 secrets，所以 `package-smoke` 任务只验证产物结构，不验证签名。

## 6. 发布时的推荐做法

1. 有签名：发布 `SecurePass-x.y.z-win-x64.exe` + `SHA256SUMS.txt`，在 Release 说明里写
   「由 <证书主体> 签名」。
2. 无签名：一定附带 `SHA256SUMS.txt`，并提示用户核对：

   ```powershell
   Get-FileHash .\SecurePass-0.1.0-win-x64.exe -Algorithm SHA256
   ```

3. 无论是否签名，都不要把私钥、密码、`*.pfx` 放进仓库或 Release 资产。

## 7. 常见问题

| 问题                                                               | 处理                                                                                         |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `Cannot create symbolic link …`（winCodeSign 包含 macOS 符号链接） | 打开 Windows 开发者模式，或以管理员身份运行终端；打包结束后的签名不受影响                    |
| 签名后 exe 元数据又变回 Electron                                   | `win.signAndEditExecutable: false` 会跳过 rcedit，把该选项去掉即可同时改元数据并签名         |
| 签名成功但 SmartScreen 仍提示                                      | OV 证书需要下载信誉累积；想让提示立即消失需 EV 或 Azure Trusted Signing                      |
| `signtool` 报 0x8007000B / 找不到令牌                              | 安装证书厂商的驱动/客户端，确认令牌已插入且证书在「个人」存储区                              |
| macOS 打包报 `notarize` 失败                                       | 检查 `APPLE_*` 三个变量、`.p12` 是否含 Developer ID Application、以及 Apple 账号是否已签协议 |
