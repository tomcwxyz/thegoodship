import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { generate, ORIGIN } from '../scripts/generate-site-json.mjs';
import { generatePage, PAGE_ROUTES } from '../scripts/generate-page-json.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const homepage = readFileSync(join(root, 'index.html'), 'utf8');
const site = generate(homepage);
const guides = [
  ['ai-technology-strategy', 'AI & Technology Strategy'],
  ['data-strategy', 'Data Strategy, Architecture & Design'],
  ['organisational-resilience', 'Organisational Resilience'],
];

test('each new service is a complete indexable, accessible editorial page', () => {
  for (const [slug, name] of guides) {
    const html = readFileSync(join(root, slug, 'index.html'), 'utf8');
    const page = generatePage(html, slug);
    assert.equal(page.canonical_url, ORIGIN + '/' + slug + '/');
    assert.equal(page.json_url, ORIGIN + '/' + slug + '/page.json');
    assert.ok(page.title.length > 25 && page.title.length < 95);
    assert.ok(page.description.length > 90 && page.description.length < 180);
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1);
    assert.ok(page.sections.length >= 4);
    assert.ok(page.sections.reduce((sum, s) => sum + s.blocks.length, 0) >= 20);
    assert.ok(html.includes('class="skip" href="#main"'));
    assert.ok(html.includes('id="main"'));
    assert.ok(html.includes('href="/assets/service-pages.css"'));
    assert.ok(html.includes('href="#approach"'));
    assert.ok(html.includes('href="/' + slug + '/page.json"'));
    assert.ok(html.includes('<meta name="robots" content="index, follow">'));
    assert.ok(!/lorem ipsum|sample testimonial|fake quote|placeholder client/i.test(html));
    assert.ok(PAGE_ROUTES.some(route => route.slug === slug));
    const entry = site['services.json'].items.find(item => item.name === name);
    assert.equal(entry.url, page.canonical_url);
    assert.equal(entry.source_page, ORIGIN + '/#services');
    assert.ok(site['site.json'].other_pages.some(p => p.url === page.canonical_url && p.json === page.json_url));
  }
});

test('service Schema.org provider references the existing organisation, not an invented company', () => {
  for (const [slug] of guides) {
    const html = readFileSync(join(root, slug, 'index.html'), 'utf8');
    const matches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(matches.length, 1);
    const schema = JSON.parse(matches[0][1]);
    const service = schema['@graph'].find(x => x['@type'] === 'Service');
    const webPage = schema['@graph'].find(x => x['@type'] === 'WebPage');
    assert.equal(service.provider['@id'], ORIGIN + '/#organisation');
    assert.equal(webPage.about['@id'], service['@id']);
    assert.equal(webPage.url, ORIGIN + '/' + slug + '/');
    assert.ok(!('review' in service) && !('aggregateRating' in service));
  }
});

test('every relative link on the new pages resolves to a local file or anchor', () => {
  for (const [slug] of guides) {
    const html = readFileSync(join(root, slug, 'index.html'), 'utf8');
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (href.startsWith('#')) {
        assert.ok(html.includes('id="' + href.slice(1) + '"'), slug + ': missing ' + href);
      }
      if (!href.startsWith('/')) continue;
      const path = href.split('#')[0].split('?')[0];
      const local = path.endsWith('/') ? path + 'index.html' : path;
      assert.ok(existsSync(join(root, local.slice(1))), slug + ': missing local link ' + path);
    }
  }
});

test('Shipyard includes practical build-or-buy guidance and does not invent customer results', () => {
  const html = readFileSync(join(root, 'shipyard', 'index.html'), 'utf8');
  assert.match(html, /Should you build software or buy something\?/);
  assert.match(html, /What will we own\?/);
  assert.match(html, /these show aspects of my own building practice/i);
  assert.match(html, /href="\/ai-technology-strategy\/"/);
  assert.match(html, /href="\/data-strategy\/"/);
});
