import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gallery = readFileSync(join(root, 'shipyard/gallery/index.html'), 'utf8');
const shell = readFileSync(join(root, 'shipyard/gallery/try.html'), 'utf8');
const app = readFileSync(join(root, 'shipyard/gallery/try.js'), 'utf8');
const landing = readFileSync(join(root, 'shipyard/index.html'), 'utf8');

test('landing and gallery link to all three sample demonstrations', () => {
  assert.match(landing, /href="\/shipyard\/gallery\/"/);
  for (const example of ['volunteers', 'grants', 'referrals']) {
    assert.ok(gallery.includes('try.html?example=' + example), example);
    assert.ok(landing.includes('try.html?example=' + example), example);
  }
});

test('gallery clearly distinguishes examples from real products', () => {
  assert.match(gallery, /fictional examples/i);
  assert.match(gallery, /live product/);
  assert.match(gallery, /https:\/\/www\.mapmypatch\.co\.uk\//);
  assert.match(gallery, /https:\/\/driftforms\.app\//);
  assert.match(gallery, /href="\/sets\/"/);
  assert.match(shell, /nothing is stored or sent/i);
});

test('demonstrations have no network, email or browser storage actions', () => {
  assert.doesNotMatch(app, /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|mailto:/);
  assert.match(shell, /noindex,follow/);
});

function makeElement(tag = 'div') {
  return {
    tag, value: 'all', textContent: '', children: [], listeners: {},
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    setAttribute(name, value) { this[name] = value; },
    reset() {}
  };
}

function startDemo(example) {
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement());
      return elements.get(id);
    },
    createElement: makeElement
  };
  const window = {location: {search: '?example=' + example}};
  vm.runInNewContext(app, {window, document, URLSearchParams}, {timeout: 1000});
  return {elements, get: document.getElementById.bind(document)};
}

for (const example of ['volunteers', 'grants', 'referrals']) {
  test(example + ' is interactive with fictional data only', () => {
    const {get} = startDemo(example);
    assert.equal(get('total-count').textContent, '4');
    assert.equal(get('items-body').children.length, 4);

    const rows = get('items-body').children;
    const advance = rows.find(row => row.children[3]?.children?.length)?.children[3].children[0];
    assert.equal(typeof advance?.listeners?.click, 'function');
    advance.listeners.click();
    assert.equal(get('total-count').textContent, '4');

    get('item-name').value = 'Fictional task';
    get('item-owner').value = 'Example colleague';
    get('add-form').listeners.submit({preventDefault() {}});
    assert.equal(get('total-count').textContent, '5');
    assert.equal(get('items-body').children[0].children[0].textContent, 'Fictional task');

    get('status-filter').value = 'does-not-exist';
    get('status-filter').listeners.change();
    assert.match(get('items-body').children[0].children[0].textContent, /No example entries/);
  });
}
