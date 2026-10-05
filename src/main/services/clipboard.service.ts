import { clipboard } from 'electron';

export class ClipboardService {
  private clearTimer: NodeJS.Timeout | null = null;
  private lastCopied: string | null = null;

  copySecret(value: string, clearAfterSeconds: number): void {
    this.clearTimerIfNeeded();
    clipboard.writeText(value);
    this.lastCopied = value;
    this.clearTimer = setTimeout(
      () => this.clearIfStillOwned(),
      Math.max(1, clearAfterSeconds) * 1000,
    );
  }

  clearIfStillOwned(): void {
    if (this.lastCopied !== null && clipboard.readText() === this.lastCopied) {
      clipboard.clear();
    }
    this.lastCopied = null;
    this.clearTimer = null;
  }

  dispose(): void {
    this.clearTimerIfNeeded();
    this.clearIfStillOwned();
  }

  private clearTimerIfNeeded(): void {
    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
  }
}
