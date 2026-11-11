#!/usr/bin/env node
/**
 * 真实打包产物的端到端冒烟脚本（非 CI 任务，发布前手动执行）。
 *
 * 它不启动应用，而是通过 Chromium DevTools 协议操作一个**已经在运行**的实例：
 *
 *   1. 用临时 user-data-dir 启动打包产物，并打开调试端口：
 *        release\win-unpacked\SecurePass.exe --user-data-dir=<tmp> --remote-debugging-port=9223
 *   2. 另开一个终端执行：
 *        node tools/e2e-smoke.mjs --port 9223 --password "correct horse battery staple"
 *
 * 覆盖流程：创建密码库（含二次确认）→ 新增记录 → 重复记录提醒 → 取消 →
 * 删除二次确认 → 撤销删除 → 锁定 → 错误主密码 → 正确主密码。
 * 任一断言失败以退出码 1 结束，便于在发布检查清单里作为一道关卡。
 */
import process from 'node:process';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i]?.replace(/^--/, '');
  const value = process.argv[i + 1];
  if (key) args.set(key, value);
}

const port = args.get('port') ?? '9223';
const masterPassword = args.get('password') ?? 'correct horse battery staple';
const title = args.get('title') ?? 'E2E smoke record';
const username = args.get('username') ?? 'smoke@example.com';
const password = args.get('value') ?? 'E2E-Pa55word!23';

const failures = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function check(name, condition, detail) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(
      `  ✗ ${name}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`,
    );
  }
}

const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find(
  (target) => target.type === 'page' && target.webSocketDebuggerUrl,
);
if (!page) {
  console.error('找不到调试目标：请确认应用已用 --remote-debugging-port 启动');
  process.exit(2);
}

const socket = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  const entry = pending.get(data.id);
  if (!entry) return;
  pending.delete(data.id);
  data.error
    ? entry.reject(new Error(JSON.stringify(data.error)))
    : entry.resolve(data.result);
});
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

function send(method, params) {
  const id = ++seq;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ?? result.exceptionDetails.text,
    );
  }
  return result.result?.value;
}

await evaluate(`
window.__e2e = {
  text: () => document.body.innerText.replace(/\\s+/g, ' ').trim(),
  rows: () => document.querySelectorAll('.ant-table-tbody .ant-table-row').length,
  click: (needle, scope) => {
    const root = scope ? document.querySelector(scope) : document;
    if (!root) return 'no-scope';
    const hit = [...root.querySelectorAll('button, [role=button]')].find((node) =>
      (node.innerText || '').replace(/\\s+/g, '').includes(needle.replace(/\\s+/g, '')),
    );
    if (!hit) return 'not-found';
    hit.click();
    return 'clicked';
  },
  clickPrimary: (scope) => {
    const root = document.querySelector(scope);
    const button = root?.querySelector('.ant-btn-primary');
    if (!button) return 'no-primary';
    button.click();
    return 'clicked';
  },
  clickSecondary: (scope) => {
    const root = document.querySelector(scope);
    if (!root) return 'no-scope';
    const button = [...root.querySelectorAll('button')].find(
      (node) => !node.className.includes('ant-btn-primary'),
    );
    if (!button) return 'no-secondary';
    button.click();
    return 'clicked';
  },
  fill: (scope, index, value) => {
    const root = document.querySelector(scope);
    if (!root) return 'no-scope';
    const input = [...root.querySelectorAll('input:not([type=checkbox])')][index];
    if (!input) return 'no-input';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'filled';
  },
  submitAccess: () => {
    const form = document.querySelector('.vault-access');
    const button = form?.querySelector('button[type="submit"]');
    if (!button) return 'no-submit';
    button.click();
    return 'clicked';
  },
  waitFor: async (needle, timeoutMs) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (document.body.innerText.includes(needle)) return true;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return document.body.innerText.includes(needle);
  },
};
'ok'`);

async function unlockIfNeeded() {
  const locked = await evaluate('window.__e2e.text().includes("密码库已锁定")');
  if (!locked) return;
  await evaluate(
    `window.__e2e.fill('.vault-access', 0, ${JSON.stringify(masterPassword)}); window.__e2e.submitAccess();`,
  );
  await evaluate('window.__e2e.waitFor("新增记录", 15000)');
}

console.log('E2E 冒烟：真实打包产物');
const initialized = await evaluate(
  'window.securepass.vault.status().then((s) => s.initialized)',
);

if (!initialized) {
  console.log('- 创建密码库');
  await evaluate(
    `window.__e2e.fill('.vault-access', 0, ${JSON.stringify(masterPassword)});` +
      `window.__e2e.fill('.vault-access', 1, ${JSON.stringify(masterPassword)});` +
      `window.__e2e.submitAccess();`,
  );
  await sleep(600);
  const confirmShown = await evaluate(
    'Boolean(document.querySelector(".ant-modal-confirm"))',
  );
  check('创建前弹出「确认创建密码库」二次确认', confirmShown);
  await evaluate('window.__e2e.clickPrimary(".ant-modal-confirm-btns")');
  const created = await evaluate('window.__e2e.waitFor("新增记录", 20000)');
  check('创建后进入已解锁状态', created);
} else {
  await unlockIfNeeded();
  check('既有密码库可解锁', await evaluate('window.__e2e.text().includes("新增记录")'));
}

console.log('- 新增记录');
const rowsBefore = await evaluate('window.__e2e.rows()');
await evaluate('window.__e2e.click("新增记录")');
await sleep(500);
await evaluate(
  `window.__e2e.fill('.ant-modal-content', 0, ${JSON.stringify(title)});` +
    `window.__e2e.fill('.ant-modal-content', 1, ${JSON.stringify(username)});` +
    `window.__e2e.fill('.ant-modal-content', 2, ${JSON.stringify(password)});`,
);
await evaluate('window.__e2e.clickPrimary(".ant-modal-content")');
await sleep(1500);
check(
  '保存后列表多出一条记录',
  (await evaluate('window.__e2e.rows()')) === rowsBefore + 1,
);

console.log('- 重复记录提醒');
await evaluate('window.__e2e.click("新增记录")');
await sleep(500);
await evaluate(
  `window.__e2e.fill('.ant-modal-content', 0, ${JSON.stringify(title)});` +
    `window.__e2e.fill('.ant-modal-content', 1, ${JSON.stringify(username)});` +
    `window.__e2e.fill('.ant-modal-content', 2, ${JSON.stringify(password)});`,
);
await evaluate('window.__e2e.clickPrimary(".ant-modal-content")');
await sleep(1200);
const duplicateText = await evaluate(
  'document.querySelector(".ant-modal-confirm")?.innerText.replace(/\\s+/g, " ") ?? ""',
);
check(
  '重复录入触发提醒',
  duplicateText.includes('重复') || duplicateText.includes('相似记录'),
  duplicateText,
);
await evaluate('window.__e2e.clickSecondary(".ant-modal-confirm-btns")');
await sleep(600);
check(
  '选择「返回修改」后记录数不变',
  (await evaluate('window.__e2e.rows()')) === rowsBefore + 1,
);
await evaluate('document.querySelector(".ant-modal-content .ant-modal-close")?.click()');
await sleep(500);
if (await evaluate('Boolean(document.querySelector(".ant-modal-confirm"))')) {
  await evaluate('window.__e2e.clickPrimary(".ant-modal-confirm-btns")');
  await sleep(400);
}
check(
  '关闭未保存的编辑器时不会残留弹窗',
  (await evaluate('document.querySelectorAll(".ant-modal-content").length')) === 0,
);

console.log('- 删除与撤销');
await evaluate(`(() => {
  const row = document.querySelector('.ant-table-tbody .ant-table-row');
  const buttons = [...row.querySelectorAll('button')];
  buttons[buttons.length - 1].click();
  return 'clicked';
})()`);
await sleep(500);
check(
  '删除需要二次确认',
  await evaluate('Boolean(document.querySelector(".ant-popover"))'),
);
await evaluate('window.__e2e.clickPrimary(".ant-popover")');
await sleep(1200);
check('删除后列表减少一条', (await evaluate('window.__e2e.rows()')) === rowsBefore);
await evaluate(`(() => {
  const undo = [...document.querySelectorAll('.ant-message-notice button')].find((button) =>
    (button.innerText || '').includes('撤销'),
  );
  undo?.click();
  return Boolean(undo);
})()`);
await sleep(1500);
check('撤销后记录恢复', (await evaluate('window.__e2e.rows()')) === rowsBefore + 1);

console.log('- 锁定与解锁');
await evaluate('window.__e2e.click("锁定密码库")');
await sleep(800);
check(
  '锁定后回到解锁表单',
  await evaluate('window.__e2e.text().includes("密码库已锁定")'),
);
await evaluate(
  `window.__e2e.fill('.vault-access', 0, 'definitely-not-the-password'); window.__e2e.submitAccess();`,
);
await sleep(2500);
check(
  '错误主密码给出可读提示',
  await evaluate('window.__e2e.text().includes("密码错误")'),
  await evaluate('window.__e2e.text().slice(-160)'),
);
await evaluate(
  `window.__e2e.fill('.vault-access', 0, ${JSON.stringify(masterPassword)}); window.__e2e.submitAccess();`,
);
check('正确主密码可再次解锁', await evaluate('window.__e2e.waitFor("新增记录", 20000)'));

socket.close();

console.log('');
if (failures.length > 0) {
  console.error(`E2E 冒烟失败 ${failures.length} 项：${failures.join('、')}`);
  process.exit(1);
}
console.log('E2E 冒烟全部通过');
