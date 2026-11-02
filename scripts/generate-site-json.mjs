/**
 * Build public, machine-readable representations of the Good Ship website.
 *
 * The existing HTML is authoritative: never maintain a second catalogue.
 * No dependencies or backend required. Run with Node 20+.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

export const ORIGIN = 'https://good-ship.co.uk';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const entities = {
  amp: '&', nbsp: ' ', mdash: '—', ndash: '–', hellip: '…',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  quot: '"', apos: "'", lt: '<', gt: '>',
};

export function plain(value = '') {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, key) => {
      if (key[0] === '#') {
        const n = key[1].toLowerCase() === 'x'
          ? Number.parseInt(key.slice(2), 16)
          : Number.parseInt(key.slice(1), 10);
        return Number.isInteger(n) && n > 0 && n <= 0x10ffff
          && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : m;
      }
      return entities[key.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function section(html, id) {
  const found = html.match(new RegExp('<section\\b[^>]*\\bid="' + id + '"[^>]*>[\\s\\S]*?<\\/section>', 'i'));
  if (!found) throw new Error('Missing website section: ' + id);
  return found[0];
}

function attr(tag, name) {
  const found = tag.match(new RegExp('\\b' + name + '="([^"]*)"', 'i'));
  return found?.[1] ?? '';
}

function tagText(html, tag) {
  return plain(html.match(new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'))?.[1] ?? '');
}

function classText(html, className, tag = '[a-z0-9]+') {
  const found = html.match(new RegExp('<' + tag + '\\b[^>]*class="[^"]*\\b' + className + '\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
  return plain(found?.[1] ?? '');
}

/** Card boundaries use the next card opening, not nested closing divs. */
function cards(html, className, tag = 'div') {
  const re = new RegExp('<' + tag + '\\b[^>]*class="[^"]*\\b' + className + '\\b[^"]*"[^>]*>', 'gi');
  const starts = [...html.matchAll(re)];
  return starts.map((m, i) => ({
    opening: m[0],
    body: html.slice(m.index + m[0].length, starts[i + 1]?.index ?? html.length),
  }));
}

function absolute(href) {
  const url = new URL(href, ORIGIN + '/');
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsafe public URL: ' + href);
  return url.href;
}

function slug(value) {
  return value.toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function unique(items, name) {
  const ids = items.map(item => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate ' + name + ' IDs');
  return items;
}

export function generate(html) {
  const title = tagText(html, 'title');
  const description = attr(html.match(/<meta\s+name="description"[^>]*>/i)?.[0] ?? '', 'content');
  if (!title || !description) throw new Error('Missing homepage metadata');

  const aboutHtml = section(html, 'about');
  const story = aboutHtml.split(/<div class="about__sidebar\b/)[0];
  const intro = [...story.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m => plain(m[1]));
  const facts = [...aboutHtml.matchAll(/<div class="about__fact-label">([\s\S]*?)<\/div>\s*<div class="about__fact-value">([\s\S]*?)<\/div>/gi)]
    .map(m => ({ label: plain(m[1]), value: plain(m[2]) }))
    .filter(f => f.label && f.value);
  const organisations = [...aboutHtml.matchAll(/<li>([\s\S]*?)<\/li>/gi)]
    .map(m => plain(m[1]));
  const email = html.match(/href="mailto:([^"?]+)"/i)?.[1] ?? null;
  if (!intro.length || !facts.length || !organisations.length) throw new Error('Incomplete About content');

  const about = {
    id: ORIGIN + '/#about',
    type: 'organisation_description',
    name: 'The Good Ship',
    title: 'About The Good Ship',
    description,
    founder: attr(html.match(/<meta\s+name="author"[^>]*>/i)?.[0] ?? '', 'content'),
    story: intro,
    facts,
    organisations_worked_with: organisations,
    contact: { website: ORIGIN + '/', email },
    canonical_url: ORIGIN + '/#about',
    source_page: ORIGIN + '/',
  };

  const services = unique(cards(section(html, 'services'), 'service-card').map(card => {
    const name = tagText(card.body, 'h3');
    return {
      id: slug(name),
      name,
      description: tagText(card.body.slice(card.body.indexOf('</h3>') + 5), 'p'),
      url: ORIGIN + '/#services',
    };
  }), 'service');
  if (services.length !== 6 || services.some(x => !x.name || !x.description)) {
    throw new Error('Unexpected service content; inspect homepage markup');
  }

  const tools = unique(cards(section(html, 'tools'), 'tool-card', 'a').map(card => {
    const name = tagText(card.body, 'h3');
    return {
      id: slug(name),
      name,
      description: classText(card.body, 'tool-card__desc', 'p'),
      category: attr(card.opening, 'data-category'),
      label: classText(card.body, 'tool-card__badge', 'span') || null,
      featured: attr(card.opening, 'data-featured') === 'true',
      url: absolute(attr(card.opening, 'href')),
      source_page: ORIGIN + '/#tools',
      json_url: ORIGIN + '/catalogue/tools/' + slug(name) + '.json',
    };
  }), 'tool');
  if (tools.length < 10 || tools.some(x => !x.name || !x.description || !x.category)) {
    throw new Error('Unexpected tools content; inspect homepage markup');
  }

  const frameworks = unique(cards(section(html, 'frameworks'), 'framework-card').map(card => {
    const name = tagText(card.body, 'h3');
    const links = [...card.body.matchAll(/<a\b([^>]*\bhref="[^"]+"[^>]*)>([\s\S]*?)<\/a>/gi)]
      .map(m => ({
        label: plain(m[2]),
        url: absolute(attr(m[1], 'href')),
        format: plain(m[2]).toLowerCase(),
      }));
    return {
      id: slug(name),
      name,
      description: tagText(card.body.slice(card.body.indexOf('</h3>') + 5), 'p'),
      resources: links,
      source_page: ORIGIN + '/#frameworks',
      json_url: ORIGIN + '/catalogue/frameworks/' + slug(name) + '.json',
    };
  }), 'framework');
  if (frameworks.length < 7 || frameworks.some(x => !x.name || !x.description || !x.resources.length)) {
    throw new Error('Unexpected frameworks content; inspect homepage markup');
  }

  const collection = (type, name, anchor, items) => ({
    type: 'collection',
    name,
    description: 'Public information from The Good Ship website. Generated from its HTML, not maintained separately.',
    source_page: ORIGIN + '/#' + anchor,
    count: items.length,
    items,
  });

  const resources = [
    { type: 'site', url: ORIGIN + '/site.json', html: ORIGIN + '/' },
    { type: 'organisation', url: ORIGIN + '/about.json', html: ORIGIN + '/#about' },
    { type: 'services', url: ORIGIN + '/services.json', html: ORIGIN + '/#services' },
    { type: 'tools', url: ORIGIN + '/tools.json', html: ORIGIN + '/#tools' },
    { type: 'frameworks', url: ORIGIN + '/frameworks.json', html: ORIGIN + '/#frameworks' },
  ];

  const site = {
    id: ORIGIN + '/',
    type: 'website',
    name: 'The Good Ship',
    description,
    title,
    canonical_url: ORIGIN + '/',
    language: 'en-GB',
    publisher: { name: 'The Good Ship', url: ORIGIN + '/' },
    version: '0.1',
    representations: ['text/html', 'application/json', 'text/plain'],
    resources,
    other_pages: [
      { name: 'Shipyard', url: ORIGIN + '/shipyard/', json: ORIGIN + '/shipyard/page.json' },
      { name: 'Open Org', url: ORIGIN + '/open-org/', json: ORIGIN + '/open-org/page.json' },
      { name: 'Responsible AI', url: ORIGIN + '/responsible-ai/', json: ORIGIN + '/responsible-ai/page.json' },
      { name: 'Sets', url: ORIGIN + '/sets/' },
      { name: 'Slow Post', url: ORIGIN + '/slow-post/', json: ORIGIN + '/slow-post/page.json' },
    ],
    standards: [
      { name: 'Open Org profile', url: ORIGIN + '/open-org/org-profile.schema.json' },
      { name: 'Open Org strategy', url: ORIGIN + '/open-org/org-strategy.schema.json' },
      { name: 'Open Org idea', url: ORIGIN + '/open-org/org-idea.schema.json' },
      { name: 'Open Org access grant', url: ORIGIN + '/open-org/org-access-grant.schema.json' },
    ],
    discovery: { llms: ORIGIN + '/llms.txt', sitemap: ORIGIN + '/sitemap.xml' },
  };

  return {
    'site.json': site,
    'about.json': about,
    'services.json': collection('services', 'Services', 'services', services),
    'tools.json': collection('tools', 'Tools and products', 'tools', tools),
    'frameworks.json': collection('frameworks', 'Frameworks and resources', 'frameworks', frameworks),
  };
}

export function writeAll(html = readFileSync(join(root, 'index.html'), 'utf8')) {
  const files = generate(html);
  for (const [path, value] of Object.entries(files)) {
    writeFileSync(join(root, path), JSON.stringify(value, null, 2) + '\n');
  }
  return files;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const files = writeAll();
  console.log('Generated ' + Object.entries(files).map(([p, data]) => p + (data.count ? ' (' + data.count + ')' : '')).join(', '));
}
