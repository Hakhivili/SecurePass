import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WindowStateService } from '@main/services/window-state.service';

/** 窗口大小/位置记忆：读不到或数据异常时必须安全回退，不能影响启动。 */
let dir: string;
let filePath: string;
let service: WindowStateService;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'securepass-window-'));
  filePath = path.join(dir, 'window-state.json');
  service = new WindowStateService(filePath);
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('WindowStateService', () => {
  it('没有记录时返回 null', () => {
    expect(service.read()).toBeNull();
  });

  it('保存后可以读回完整状态', () => {
    service.save({ x: 120, y: 80, width: 1320, height: 880, maximized: false });
    expect(service.read()).toEqual({
      x: 120,
      y: 80,
      width: 1320,
      height: 880,
      maximized: false,
    });
  });

  it('记录最大化标记', () => {
    service.save({ x: 0, y: 0, width: 1400, height: 900, maximized: true });
    expect(service.read()?.maximized).toBe(true);
  });

  it('尺寸小于下限时抬到最小值', () => {
    service.save({ width: 320, height: 200, maximized: false });
    expect(service.read()).toMatchObject({ width: 1000, height: 660 });
  });

  it('文件损坏时返回 null 而不是抛错', async () => {
    await fs.writeFile(filePath, '{ not json', 'utf8');
    expect(service.read()).toBeNull();
  });

  it('缺少尺寸字段时视为无效记录', async () => {
    await fs.writeFile(filePath, JSON.stringify({ maximized: true }), 'utf8');
    expect(service.read()).toBeNull();
  });
});
