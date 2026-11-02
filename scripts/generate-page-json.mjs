/**
 * Generate structured, read-only JSON for Good Ship editorial subpages.
 * The existing public HTML remains the sole source of truth.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { plain, ORIGIN } from './generate-site-json.mjs';

export const PAGE_ROUTES = Object.freeze([
  { slug: 'shipyard', name: 'Shipyard' },
  { slug: 'open-org', name: 'Open Org' },
  { slug: 'responsible-ai', name: 'Responsible AI' },
  { slug: 'slow-post', name: 'The Slow Post' },
]);

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const excluded = 'script|style|svg|nav|aside|footer|form|button|iframe|template|noscript';

function getAttribute(tag, name) {
  const found = tag.match(new RegExp('\\b' + name + '\\s*=\\s*["\\x27]([^"\\x27]*)["\\x27]', 'i'));
  return found?.[1] ?? '';
}

function metadescription(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  return plain(getAttribute(tags.find(tag => getAttribute(tag, 'name').toLowerCase() === 'description') ?? '', 'content'));
}

function canonicalUrl(html, slug) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const canonical = getAttribute(tags.find(tag => getAttribute(tag, 'rel').toLowerCase() === 'canonical') ?? '', 'href');
  const expected = ORIGIN + '/' + slug + '/';
  if (canonical && canonical !== expected) {
    throw new Error('Unexpected canonical URL for ' + slug + ': ' + canonical);
  }
  return expected;
}

function publicLink(href, base) {
  if (!href || href.startsWith('#')) return null;
  try {
    const url = new URL(href, base);
    if (!['https:', 'http:', 'mailto:'].includes(url.protocol)) return null;
    if (['token', 'key', 'secret', 'password', 'auth', 'code'].some(key => url.searchParams.has(key))) return null;
    return url.href;
  } catch {
    return null;
  }
}

function bodyContent(html) {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!body) throw new Error('Missing HTML body');
  return body.replace(/<!--[\s\S]*?-->/g, '')
    .replace(new RegExp('<(' + excluded + ')\\b[^>]*>[\\s\\S]*?<\\/\\1>', 'gi'), '');
}

function identifier(text, used) {
  const initial = text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
  let candidate = initial;
  for (let n = 2; used.has(candidate); n++) candidate = initial + '-' + n;
  used.add(candidate);
  return candidate;
}

function sectionLinks(markup, base) {
  const seen = new Set();
  const links = [];
  for (const match of markup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const url = publicLink(getAttribute(match[1], 'href'), base);
    const label = plain(match[2]);
    if (!url || !label || seen.has(url + ' ' + label)) continue;
    seen.add(url + ' ' + label);
    links.push({ label, url });
  }
  return links;
}

function getEmbeds(html, base) {
  const embeds = [];
  for (const tag of html.match(/<iframe\b[^>]*>/gi) ?? []) {
    const url = publicLink(getAttribute(tag, 'src'), base);
    if (!url) continue;
    embeds.push({ title: plain(getAttribute(tag, 'title')) || 'Embedded resource', url });
  }
  return embeds;
}

/**
 * Preserve authored headings, paragraphs, lists and quotations in page order.
 * Scripts, navigation, embedded applications, forms and decorative SVG are excluded.
 * This is deliberately a constrained extractor, not a generic HTML parser.
 */
export function generatePage(html, slug) {
  if (!PAGE_ROUTES.some(page => page.slug === slug)) throw new Error('Unknown editorial page: ' + slug);
  const canonical_url = canonicalUrl(html, slug);
  const title = plain(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const description = metadescription(html);
  const rawBody = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '';
  const content = bodyContent(html);
  const heading = plain(content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  if (!title || !description || !heading) throw new Error('Missing editorial metadata: ' + slug);

  const blocks = [...content.matchAll(/<(h[1-4]|p|li|blockquote|pre)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  const headings = blocks.filter(match => match[1].toLowerCase() === 'h2');
  if (headings.length < 2) throw new Error('Not enough sections in ' + slug);

  const used = new Set();
  const sections = headings.map((match, i) => ({
    id: identifier(plain(match[2]), used),
    heading: plain(match[2]),
    blocks: [],
    links: sectionLinks(content.slice(match.index, headings[i + 1]?.index ?? content.length), canonical_url),
  }));
  const introduction = [];
  const introLinks = sectionLinks(content.slice(0, headings[0].index), canonical_url);

  for (const match of blocks) {
    const tag = match[1].toLowerCase();
    if (tag === 'h1' || tag === 'h2' || tag === 'pre') continue;
    if (tag === 'li' && /<(h[1-4]|p|li)\b/i.test(match[2])) continue;
    const text = plain(match[2]);
    if (!text) continue;
    const block = tag === 'h3' || tag === 'h4'
      ? { type: 'subheading', level: Number(tag[1]), text }
      : { type: tag === 'li' ? 'list_item' : tag === 'blockquote' ? 'quotation' : 'paragraph', text };
    const sectionIndex = headings.findLastIndex(h => h.index < match.index);
    (sectionIndex < 0 ? introduction : sections[sectionIndex].blocks).push(block);
  }

  if (sections.some(s => !s.heading || s.blocks.length === 0)) {
    throw new Error('An editorial section has no prose: ' + slug);
  }

  return {
    id: canonical_url,
    type: 'web_page',
    title,
    name: heading,
    description,
    language: 'en-GB',
    publisher: { name: 'The Good Ship', url: ORIGIN + '/' },
    canonical_url,
    source_page: canonical_url,
    json_url: canonical_url + 'page.json',
    version: '0.1',
    introduction,
    introduction_links: introLinks,
    sections,
    links: sectionLinks(content, canonical_url),
    embeds: getEmbeds(rawBody, canonical_url),
  };
}

export function generatePages(read = path => readFileSync(join(root, path), 'utf8')) {
  const result = {};
  for (const page of PAGE_ROUTES) {
    result[page.slug + '/page.json'] = generatePage(read(page.slug + '/index.html'), page.slug);
  }
  return result;
}

export function writePages() {
  const result = generatePages();
  for (const [path, page] of Object.entries(result)) {
    writeFileSync(join(root, path), JSON.stringify(page, null, 2) + '\n');
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = writePages();
  console.log('Generated ' + Object.keys(result).join(', '));
}
