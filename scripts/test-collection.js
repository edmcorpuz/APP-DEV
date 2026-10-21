// Checks the exported Postman request order and assertions against isolated servers.
// This is a small pm API shim, not a replacement for testing Postman's own UI.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fixture, root } from '../tests/helpers.js';
const app = await fixture(14002, 15002);
const collection = JSON.parse(readFileSync(path.join(root, 'docs/Sugilanon.postman_collection.json'), 'utf8'));
const variables = Object.fromEntries(collection.variable.map(({ key, value }) => [key, value]));
variables.auth = app.auth; variables.blog = app.blog;
const substitute = text => text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
  assert.ok(key in variables, 'Missing collection variable ' + key); return variables[key];
});
const results = [];
try {
  for (const item of collection.item) {
    const request = item.request;
    const response = await fetch(substitute(request.url), {
      method: request.method,
      headers: Object.fromEntries(request.header.map(({ key, value }) => [key, substitute(value)])),
      ...(request.body ? { body: substitute(request.body.raw) } : {}),
    });
    const data = await response.json();
    const pm = {
      response: { code: response.status, json: () => data },
      collectionVariables: { set: (key, value) => { variables[key] = value; } },
      test: (name, fn) => { fn(); },
      expect: actual => ({ to: { include: value => assert.ok(actual.includes(value), 'Unexpected status ' + value), eql: value => assert.equal(JSON.stringify(actual), JSON.stringify(value)) } }),
    };
    for (const event of item.event || []) {
      if (event.listen === 'test') runInNewContext(event.script.exec.join('\n'), { pm });
    }
    results.push({ request: item.name, status: response.status });
  }
  mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  writeFileSync(path.join(root, 'artifacts/collection-results.json'), JSON.stringify({ passed: results.length, results }, null, 2));
  console.log('PASS: all ' + results.length + ' exported collection requests and test scripts.');
} catch (error) {
  console.error('Failed after ' + results.length + ' requests:', error);
  process.exitCode = 1;
} finally { await app.cleanup(); }
