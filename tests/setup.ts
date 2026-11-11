import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// 组件测试跑在 jsdom 里：每个用例结束后卸载已渲染的 React 树，
// 否则 antd 的 Portal（message/modal）会残留到下一个用例，造成重复元素。
afterEach(async () => {
  if (typeof document === 'undefined') return;
  const { cleanup } = await import('@testing-library/react');
  cleanup();
  document.body.innerHTML = '';
});
