import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import ErrorFallback from './ErrorFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * 顶层错误边界。
 *
 * 生产包没有菜单和 DevTools，任何渲染异常都会让用户面对一个白窗口，
 * 只能去杀进程；这里至少给出可读的错误、可复制的详情和恢复入口。
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[renderer] 界面未捕获异常', error, info.componentStack);
  }

  private reload = (): void => {
    window.location.reload();
  };

  private retry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <ErrorFallback error={error} onReload={this.reload} onRetry={this.retry} />;
  }
}
