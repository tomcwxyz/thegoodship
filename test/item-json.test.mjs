import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ORIGIN, generate } from '../scripts/generate-site-json.mjs';
import { generateItemRecords, writeItemRecords } from '../scripts/generate-item-json.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const catalogue = generate(html);
const records = generateItemRecords(html);

test('every catalogue entry links to exactly one JSON record', () => {
  const all = [
    ['tools.json', 'tool', 'tools'],
    ['frameworks.json', 'framework', 'frameworks'],
  ];
  let total = 0;
  for (const [collection, kind, directory] of all) {
    for (const item of catalogue[collection].items) {
      const path = 'catalogue/' + directory + '/' + item.id + '.json';
      assert.equal(item.json_url, ORIGIN + '/' + path);
      assert.ok(records[path], 'Missing ' + path);
      assert.equal(records[path].name, item.name);
      assert.equal(records[path].description, item.description);
      assert.equal(records[path].source_page, item.source_page);
      assert.equal(records[path].type, kind);
      assert.equal(records[path].collection_url, ORIGIN + '/' + collection);
      assert.deepEqual(
        Object.fromEntries(Object.entries(records[path]).filter(([key]) => !['type', 'publisher', 'collection_url', 'language'].includes(key))),
        item,
      );
      total++;
    }
  }
  assert.equal(Object.keys(records).length, total);
});

test('records contain original framework links and tool labels without invented metadata', () => {
  const drift = records['catalogue/tools/drift.json'];
  assert.equal(drift.url, 'https://driftforms.app/');
  assert.equal(drift.category, 'forms');
  const openOrg = records['catalogue/tools/open-org.json'];
  assert.equal(openOrg.url, ORIGIN + '/open-org/');
  const garden = records['catalogue/frameworks/garden-of-ideas.json'];
  assert.ok(garden.resources.some(item => item.url.endsWith('garden-of-ideas.pdf')));
  assert.ok(garden.resources.some(item => item.url.endsWith('garden-of-ideas-slides.pptx')));
  assert.ok(records['catalogue/tools/techfreedom.json'].label?.toLowerCase().includes('soon'));
  assert.ok(Object.values(records).every(item => !('price' in item) && !('licence' in item)));
});

test('generator writes all files and cleans up a removed item safely', () => {
  const folder = mkdtempSync(join(tmpdir(), 'good-ship-catalogue-'));
  try {
    const first = writeItemRecords(html, folder);
    for (const [path, record] of Object.entries(first)) {
      assert.deepEqual(JSON.parse(readFileSync(join(folder, path), 'utf8')), record);
    }
    const unwanted = join(folder, 'catalogue', 'tools', 'retired-tool.json');
    writeFileSync(unwanted, '{"old":true}\n');
    writeItemRecords(html, folder);
    assert.ok(!readdirSync(join(folder, 'catalogue', 'tools')).includes('retired-tool.json'));
    assert.equal(readdirSync(join(folder, 'catalogue', 'tools')).length, catalogue['tools.json'].count);
    assert.equal(readdirSync(join(folder, 'catalogue', 'frameworks')).length, catalogue['frameworks.json'].count);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test('all individual JSON links are same-origin and use safe names', () => {
  for (const [path, record] of Object.entries(records)) {
    assert.match(path, /^catalogue\/(tools|frameworks)\/[a-z0-9-]+\.json$/);
    assert.equal(record.json_url, ORIGIN + '/' + path);
    assert.ok(record.name && record.description && record.publisher.name);
    assert.ok(!JSON.stringify(record).includes('DEBUG_TOKEN'));
    assert.ok(!JSON.stringify(record).includes('WEBHOOK_TOKEN'));
  }
});
