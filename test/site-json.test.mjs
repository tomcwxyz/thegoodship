import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { generate, plain, ORIGIN } from '../scripts/generate-site-json.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const outputs = generate(html);

test('entity decoding is readable and safe', () => {
  assert.equal(plain('A &amp; B&nbsp;&mdash; &#163;5'), 'A & B — £5');
  assert.equal(plain('<strong>Good</strong> <em>Ship</em>'), 'Good Ship');
});

test('homepage is authoritative for catalogue and service cards', () => {
  assert.equal(outputs['services.json'].count, 6);
  assert.equal(outputs['tools.json'].count, [...html.matchAll(/class="tool-card\b/g)].length);
  assert.equal(outputs['frameworks.json'].count, [...html.matchAll(/class="framework-card\b/g)].length);
  const tools = outputs['tools.json'].items;
  assert.equal(tools.find(item => item.name === 'Drift')?.url, 'https://driftforms.app/');
  assert.equal(tools.find(item => item.name === 'Open Org')?.url, ORIGIN + '/open-org/');
  assert.equal(tools.find(item => item.name === 'Sets')?.featured, true);
  assert.ok(tools.every(x => x.description && x.category && x.url));
});

test('framework resources and organisational facts are extracted', () => {
  const resources = outputs['frameworks.json'].items;
  assert.ok(resources.every(item => item.resources.length >= 1));
  assert.ok(resources.find(x => x.name === 'Garden of Ideas')?.resources.some(x => x.url.endsWith('.pdf')));
  assert.ok(outputs['about.json'].facts.some(f => f.value === 'North East England'));
  assert.ok(outputs['about.json'].organisations_worked_with.includes('ClientEarth'));
});

test('discovery includes valid public URLs and current JSON endpoints', () => {
  const discover = outputs['site.json'];
  assert.equal(discover.resources.length, 5);
  assert.deepEqual(discover.resources.map(x => x.url), [
    '/site.json', '/about.json', '/services.json', '/tools.json', '/frameworks.json',
  ].map(path => ORIGIN + path));
  for (const payload of Object.values(outputs)) {
    assert.ok(JSON.stringify(payload).indexOf('DEBUG_TOKEN') === -1);
  }
});
