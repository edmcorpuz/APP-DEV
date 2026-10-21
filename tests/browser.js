// Lightweight real-browser test driver using native WebSocket + Chrome DevTools.
// Avoids the Playwright pipe/ws incompatibility with Bun 1.3.13 on this Windows host.
import { writeFileSync } from 'node:fs';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

class Connection {
  constructor(socket) {
    this.socket = socket; this.sequence = 0; this.pending = new Map(); this.listeners = [];
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        clearTimeout(pending.timer); this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      } else this.listeners.forEach(fn => fn(message));
    };
  }
  static async open(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP websocket timed out')), 10000);
      socket.onopen = () => { clearTimeout(timer); resolve(); };
      socket.onerror = () => { clearTimeout(timer); reject(new Error('CDP connection failed')); };
    });
    return new Connection(socket);
  }
  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timed out: ' + method)); }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

// This function runs inside the browser. It returns DOM matches, not source data.
function locate(steps) {
  let nodes = [document];
  const name = el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();
  const matches = (text, expected, exact) => expected === undefined || (exact ? text === expected : text.includes(expected));
  for (const step of steps) {
    if (step.kind === 'filter') { nodes = nodes.filter(el => name(el).includes(step.text)); continue; }
    let selected = [];
    for (const parent of nodes) {
      if (step.kind === 'css') selected.push(...parent.querySelectorAll(step.selector));
      if (step.kind === 'role') {
        const selectors = { heading: 'h1,h2,h3,h4,h5,h6', button: 'button,[role="button"]', link: 'a[href]',
          navigation: 'nav,[role="navigation"]', searchbox: 'input[type="search"]', status: '[role="status"]', alert: '[role="alert"]' };
        selected.push(...[...parent.querySelectorAll(selectors[step.role] || '[role="' + step.role + '"]')]
          .filter(el => el.getClientRects().length && matches(name(el), step.name, step.exact)));
      }
      if (step.kind === 'label') {
        selected.push(...[...parent.querySelectorAll('input,textarea,select')].filter(el =>
          matches(el.getAttribute('aria-label') || [...(el.labels || [])].map(label => name(label)).join(' '), step.name, step.exact)));
      }
      if (step.kind === 'text') {
        selected.push(...[...parent.querySelectorAll('*')].filter(el => el.getClientRects().length &&
          matches(name(el), step.name, step.exact) && ![...el.children].some(child => matches(name(child), step.name, step.exact))));
      }
    }
    nodes = [...new Set(selected)];
  }
  return nodes;
}
class Locator {
  constructor(page, steps) { this.page = page; this.steps = steps; }
  getByRole(role, options = {}) { return new Locator(this.page, [...this.steps, { kind: 'role', role, ...options }]); }
  filter({ hasText }) { return new Locator(this.page, [...this.steps, { kind: 'filter', text: hasText }]); }
  expression(action) { return '(' + action.toString() + ')((' + locate.toString() + ')(' + JSON.stringify(this.steps) + '))'; }
  async count() { return this.page.expression(this.expression(nodes => nodes.length)); }
  async waitFor() {
    const start = Date.now();
    while (Date.now() - start < this.page.timeout) {
      try { if (await this.count()) return; } catch {}
      await pause(70);
    }
    throw new Error('Element not found: ' + JSON.stringify(this.steps));
  }
  async click() {
    await this.waitFor();
    const point = await this.page.expression(this.expression(nodes => {
      if (nodes.length !== 1) throw new Error('Click expected exactly one element, found ' + nodes.length);
      const el = nodes[0]; el.scrollIntoView({ block: 'center' });
      const box = el.getBoundingClientRect(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    }));
    await this.page.cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await this.page.cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  }
  async fill(value) {
    await this.waitFor();
    await this.page.expression('(function(nodes,value){ const el=nodes[0]; el.focus(); el.value=value; el.dispatchEvent(new Event("input",{bubbles:true})); el.dispatchEvent(new Event("change",{bubbles:true})); })((' + locate.toString() + ')(' + JSON.stringify(this.steps) + '),' + JSON.stringify(value) + ')');
  }
  async selectOption(value) { return this.fill(value); }
}
class Page {
  constructor(cdp) {
    this.cdp = cdp; this.timeout = 12000; this.currentUrl = ''; this.handlers = {};
    cdp.listeners.push(message => {
      if (message.method === 'Page.navigatedWithinDocument') this.currentUrl = message.params.url;
      if (message.method === 'Page.frameNavigated' && !message.params.frame.parentId) this.currentUrl = message.params.frame.url;
      if (message.method === 'Runtime.exceptionThrown') this.handlers.pageerror?.({ message: message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text });
      if (message.method === 'Runtime.consoleAPICalled') this.handlers.console?.({ type: () => message.params.type, text: () => message.params.args.map(arg => arg.value || arg.description).join(' ') });
    });
  }
  on(event, handler) { this.handlers[event] = handler; }
  setDefaultTimeout(value) { this.timeout = value; }
  url() { return this.currentUrl; }
  async expression(expression) {
    const result = await this.cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  evaluate(fn, arg) { return this.expression('(' + fn.toString() + ')(' + (arg === undefined ? '' : JSON.stringify(arg)) + ')'); }
  async goto(url) {
    // A full navigation reloads localStorage into the app, like a new browser visit.
    await this.cdp.send('Page.navigate', { url: 'about:blank' });
    await pause(30);
    await this.cdp.send('Page.navigate', { url }); this.currentUrl = url;
    for (let i = 0; i < 150; i++) {
      try { if (await this.evaluate(() => document.readyState === 'complete' && !!document.querySelector('#main'))) return; } catch {}
      await pause(50);
    }
    throw new Error('Navigation timed out: ' + url);
  }
  getByRole(role, options = {}) { return new Locator(this, [{ kind: 'role', role, ...options }]); }
  getByLabel(name, options = {}) { return new Locator(this, [{ kind: 'label', name, ...options }]); }
  getByText(name, options = {}) { return new Locator(this, [{ kind: 'text', name, ...options }]); }
  locator(selector) { return new Locator(this, [{ kind: 'css', selector }]); }
  async setViewportSize({ width, height }) {
    await this.cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  }
  async screenshot({ path, fullPage }) {
    const metrics = await this.cdp.send('Page.getLayoutMetrics');
    const size = metrics.cssContentSize;
    const result = await this.cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!fullPage,
      ...(fullPage ? { clip: { x: 0, y: 0, width: size.width, height: size.height, scale: 1 } } : {}) });
    writeFileSync(path, Buffer.from(result.data, 'base64'));
  }
}
export async function connectBrowser(base) {
  const targets = await (await fetch(base + '/json/list')).json();
  const target = targets.find(target => target.type === 'page');
  if (!target) throw new Error('Chrome has no page target.');
  const cdp = await Connection.open(target.webSocketDebuggerUrl);
  const page = new Page(cdp);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  return {
    async newContext({ viewport }) { await page.setViewportSize(viewport); return { newPage: async () => page }; },
    async close() { cdp.close(); },
  };
}
