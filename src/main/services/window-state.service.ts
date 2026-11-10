import fs from 'node:fs';
import path from 'node:path';

/** 持久化的窗口状态（userData 下的 window-state.json）。 */
export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}

const MIN_WIDTH = 1000;
const MIN_HEIGHT = 660;

/**
 * 记住上次的窗口大小与位置（桌面软件的常见行为）。
 *
 * 写入用同步 API：窗口 `close` 时进程可能很快退出，异步写入来不及落盘；
 * 数据量只有几十字节，同步写不会造成卡顿。任何异常都静默忽略——
 * 窗口状态不是关键数据，读不到就回到默认尺寸。
 */
export class WindowStateService {
  constructor(private readonly filePath: string) {}

  read(): WindowState | null {
    try {
      const parsed = JSON.parse(
        fs.readFileSync(this.filePath, 'utf8'),
      ) as Partial<WindowState>;
      if (typeof parsed.width !== 'number' || typeof parsed.height !== 'number')
        return null;
      return {
        x: typeof parsed.x === 'number' ? Math.round(parsed.x) : undefined,
        y: typeof parsed.y === 'number' ? Math.round(parsed.y) : undefined,
        width: Math.max(MIN_WIDTH, Math.round(parsed.width)),
        height: Math.max(MIN_HEIGHT, Math.round(parsed.height)),
        maximized: Boolean(parsed.maximized),
      };
    } catch {
      return null;
    }
  }

  save(state: WindowState): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(state), 'utf8');
    } catch {
      // 忽略：窗口状态不是关键数据
    }
  }
}
