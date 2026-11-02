import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { generate, ORIGIN } from '../scripts/generate-site-json.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
const generated = generate(html);

test('public site discovery explains audiences, services and practice without parallel copy', () => {
  const site = generated['site.json'];
  const about = generated['about.json'];
  const services = generated['services.json'].items;
  assert.ok(site.summary.length > 400, 'Provide more context than the short SEO description');
  assert.ok(site.positioning.overview.includes('consultancy, practical product development and open research'));
  assert.ok(site.positioning.who_we_help.includes('charities'));
  assert.ok(site.positioning.who_we_help.includes('social enterprises'));
  assert.ok(site.positioning.what_we_do.length === services.length);
  assert.deepEqual(site.positioning.what_we_do.map(item => item.name), services.map(item => item.name));
  assert.equal(site.positioning.geography.based_in, 'North East England');
  assert.equal(site.positioning.geography.working, 'Globally');
  assert.equal(site.positioning.approach, 'Open by default');
  assert.deepEqual(site.evidence.named_organisations_worked_with, about.organisations_worked_with);
  assert.equal(site.evidence.tools_count, generated['tools.json'].count);
  assert.equal(site.evidence.frameworks_count, generated['frameworks.json'].count);
  assert.equal(site.organisation.profile_url, ORIGIN + '/about.json');
  assert.equal(site.organisation.external_profiles.founder_blog, 'https://tomcw.xyz');
  assert.equal(about.audiences.length, site.positioning.who_we_help.length);
});

test('homepage has coherent, grounded Organisation, Person and WebSite linked data', () => {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 1, 'Use a single linked graph with stable entity IDs');
  const schema = JSON.parse(scripts[0][1]);
  assert.equal(schema['@context'], 'https://schema.org');
  const nodes = schema['@graph'];
  const organisation = nodes.find(n => n['@type'] === 'Organization');
  const founder = nodes.find(n => n['@type'] === 'Person');
  const website = nodes.find(n => n['@type'] === 'WebSite');
  assert.ok(organisation && founder && website);
  assert.equal(organisation.name, generated['site.json'].name);
  assert.equal(organisation.founder['@id'], founder['@id']);
  assert.equal(website.publisher['@id'], organisation['@id']);
  assert.equal(founder.name, generated['about.json'].founder);
  assert.equal(organisation.location.name, 'North East England');
  assert.equal(organisation.areaServed.name, 'Worldwide');
  assert.deepEqual(organisation.knowsAbout, generated['services.json'].items.map(item => item.name));
  assert.equal(founder.sameAs[0], 'https://linkedin.com/in/tomcampbellwatson');
  assert.ok(html.includes('href="' + founder.sameAs[0] + '"'));
  assert.ok(html.includes('href="/open-org/"'));
  assert.ok(html.includes('href="/shipyard/"'));
  assert.ok(!('address' in organisation), 'Do not invent a postal address for a remote consultancy');
});

test('short descriptive search metadata is separate from detailed discovery JSON', () => {
  const meta = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  const og = html.match(/<meta property="og:description" content="([^"]+)"/)?.[1];
  assert.ok(meta && meta.length > 100 && meta.length < 170);
  assert.equal(meta, og);
  assert.equal(meta, generated['site.json'].description);
  assert.ok(generated['site.json'].summary.length > meta.length);
});

test('sitemap contains all canonical HTML pages, not JSON representations', () => {
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const expected = [ORIGIN + '/', ...generated['site.json'].other_pages.map(p => p.url)];
  assert.deepEqual([...urls].sort(), [...expected].sort());
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every(url => url.startsWith(ORIGIN + '/')));
  assert.ok(urls.every(url => !url.endsWith('.json')));
  assert.ok(!sitemap.includes('<lastmod>'), 'Do not publish inaccurate change dates');
});
