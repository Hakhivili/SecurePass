import { describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import {
  MASTER_PASSWORD,
  createVaultFixture,
  readAllFileTexts,
  type VaultFixture,
} from '../helpers/vault-fixture';

/**
 * 验收标准第 7 项：加密落盘 —— 用可识别测试数据，检查正式文件、临时文件、
 * 备份文件与日志，均不得出现业务明文。
 */
const SENTINELS = {
  title: 'SENTINEL-TITLE-7f3c1a',
  username: 'SENTINEL-USER-7f3c1a@example.com',
  password: 'SENTINEL-PASSWORD-7f3c1a',
  url: 'https://sentinel-7f3c1a.example.com/login',
  notes: 'SENTINEL-NOTES-7f3c1a',
  category: 'SENTINEL-CATEGORY-7f3c1a',
  tag: 'SENTINEL-TAG-7f3c1a',
};

const ALL_SENSITIVE = [...Object.values(SENTINELS), MASTER_PASSWORD];

async function assertNoPlaintext(fixture: VaultFixture): Promise<void> {
  const files = await readAllFileTexts(fixture.baseDir);
  expect(files.length).toBeGreaterThan(0);

  for (const file of files) {
    const name = file.path.slice(fixture.baseDir.length + 1);
    for (const secret of ALL_SENSITIVE) {
      expect(file.text.includes(secret), `文件 ${name} 中出现了明文 ${secret}`).toBe(
        false,
      );
      // base64 密文里也不应该“恰好”出现明文（防御性检查）
      expect(
        file.text
          .toLowerCase()
          .includes(Buffer.from(secret).toString('base64').toLowerCase()),
        `文件 ${name} 的编码内容中出现了 ${secret}`,
      ).toBe(false);
    }
  }
}

describe('加密落盘（无业务明文）', () => {
  it('密码库文件、.bak 与锁文件中都不含密码/主密码明文', async () => {
    const fixture = await createVaultFixture('securepass-plaintext-');
    try {
      await fixture.vault.create(MASTER_PASSWORD);

      // 第一条写入 → 产生正式文件；第二条写入 → 让 .bak 也包含含密文数据的版本
      await fixture.vault.createItem({
        title: SENTINELS.title,
        username: SENTINELS.username,
        password: SENTINELS.password,
        url: SENTINELS.url,
        notes: SENTINELS.notes,
        category: SENTINELS.category,
        tags: [SENTINELS.tag],
        isFavorite: true,
      });
      await fixture.vault.createItem({
        title: `${SENTINELS.title}-2`,
        username: SENTINELS.username,
        password: SENTINELS.password,
        tags: [],
        isFavorite: false,
      });

      const entries = await fs.readdir(fixture.baseDir);
      expect(entries).toContain('vault.securepass');
      expect(entries).toContain('vault.securepass.bak');

      await assertNoPlaintext(fixture);

      // 正式文件仍然只是一个自描述的加密容器
      const raw = await fs.readFile(fixture.paths.vaultFilePath, 'utf8');
      expect(raw).toContain('"magic": "SECUREPASS"');
      expect(raw).toContain('"algorithm": "aes-256-gcm"');
      expect(raw).not.toContain(SENTINELS.password);
    } finally {
      await fixture.dispose();
    }
  });

  it('修改主密码后，旧文件与新文件都不含明文', async () => {
    const fixture = await createVaultFixture('securepass-plaintext-rotate-');
    try {
      await fixture.vault.create(MASTER_PASSWORD);
      await fixture.vault.createItem({
        title: SENTINELS.title,
        username: SENTINELS.username,
        password: SENTINELS.password,
        tags: [],
        isFavorite: false,
      });

      const newPassword = 'an entirely new master password';
      await fixture.vault.changeMasterPassword(MASTER_PASSWORD, newPassword);
      await fixture.vault.createItem({
        title: `${SENTINELS.title}-after-rotation`,
        username: SENTINELS.username,
        password: SENTINELS.password,
        tags: [],
        isFavorite: false,
      });

      await assertNoPlaintext(fixture);
    } finally {
      await fixture.dispose();
    }
  });
});
