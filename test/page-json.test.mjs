import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { generatePage, generatePages, PAGE_ROUTES } from '../scripts/generate-page-json.mjs';
import { ORIGIN } from '../scripts/generate-site-json.mjs';

const pages = generatePages();

test('four editorial pages are exported with explicit canonical JSON URLs', () => {
  assert.equal(Object.keys(pages).length, 4);
  for (const { slug } of PAGE_ROUTES) {
    const page = pages[slug + '/page.json'];
    assert.equal(page.id, ORIGIN + '/' + slug + '/');
    assert.equal(page.json_url, page.id + 'page.json');
    assert.ok(page.title.length > 8);
    assert.ok(page.description.length > 20);
    assert.ok(page.sections.length >= 2);
    assert.ok(page.sections.every(s => s.heading && s.blocks.length && s.id));
  }
});

test('public text does not contain scripts, SVG markup or navigation boilerplate', () => {
  for (const page of Object.values(pages)) {
    const contents = JSON.stringify(page);
    assert.doesNotMatch(contents, /<script|<svg|<nav|<iframe/i);
    assert.doesNotMatch(contents, /DEBUG_TOKEN|WEBHOOK_TOKEN|client_secret/i);
    assert.doesNotMatch(contents, /"url":"javascript:/i);
    assert.ok(page.sections.some(s => s.blocks.some(b => b.type === 'paragraph')));
  }
});

test('Open Org exposes chapters and published schemas, not just page metadata', () => {
  const page = pages['open-org/page.json'];
  assert.ok(page.sections.some(s => s.heading.includes('Four objects')));
  assert.ok(page.links.some(l => l.url.endsWith('/open-org/org-profile.schema.json')));
  assert.ok(page.links.some(l => l.url.endsWith('/open-org/org-strategy.schema.json')));
});

test('Shipyard includes its two delivery approaches', () => {
  const page = pages['shipyard/page.json'];
  const text = JSON.stringify(page.sections);
  assert.match(text, /Ship It/);
  assert.match(text, /Learn & Ship/);
  assert.match(text, /Tools you own/);
});

test('Responsible AI includes workshop resources; Slow Post links to its public form', () => {
  const ai = pages['responsible-ai/page.json'];
  assert.ok(ai.links.some(l => l.url.includes('scvo.scot')));
  const slowPost = pages['slow-post/page.json'];
  assert.ok(slowPost.sections.some(s => s.heading === 'Three ways in'));
  assert.ok(slowPost.embeds.some(e => e.url.includes('driftforms.app/f/the-slow-post-')));
});

test('rejected links and invalid pages cannot be published', () => {
  const html = readFileSync(new URL('../shipyard/index.html', import.meta.url), 'utf8');
  assert.throws(() => generatePage(html, 'private'), /Unknown editorial/);
  const altered = html.replace('https://good-ship.co.uk/shipyard/', 'https://example.org/unrelated');
  assert.throws(() => generatePage(altered, 'shipyard'), /Unexpected canonical/);
});
