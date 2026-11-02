/**
 * Generate one static JSON record per public tool or framework.
 *
 * Homepage cards remain the authoritative content. Dedicated catalogue/
 * directories are generated-only, so obsolete record files can be removed
 * when cards are renamed or deleted. No runtime API or dependencies.
 */
import { readFileSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, ORIGIN } from './generate-site-json.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const namespaces = [
  ['tools', 'tool', 'tools.json'],
  ['frameworks', 'framework', 'frameworks.json'],
];
const publisher = { name: 'The Good Ship', url: ORIGIN + '/' };
const safeId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Build record files entirely from the same in-memory catalogue as tools.json
 * and frameworks.json. Each individual document has a stable absolute URL,
 * links to its collection and retains the published badge as a label only.
 */
export function generateItemRecords(html) {
  const catalogue = generate(html);
  const output = {};

  for (const [directory, type, collectionFile] of namespaces) {
    const collection = catalogue[collectionFile];
    if (!collection || collection.count !== collection.items.length) {
      throw new Error('Missing or inconsistent catalogue: ' + collectionFile);
    }
    for (const item of collection.items) {
      if (!safeId.test(item.id)) throw new Error('Unsafe catalogue ID: ' + item.id);
      const path = 'catalogue/' + directory + '/' + item.id + '.json';
      if (output[path]) throw new Error('Duplicate catalogue path: ' + path);
      const expectedUrl = ORIGIN + '/' + path;
      if (item.json_url !== expectedUrl) throw new Error('Incorrect JSON link for ' + item.id);

      output[path] = {
        ...item,
        type,
        publisher,
        collection_url: ORIGIN + '/' + collectionFile,
        language: 'en-GB',
      };
    }
  }

  return output;
}

export function writeItemRecords(
  html = readFileSync(join(root, 'index.html'), 'utf8'),
  outputRoot = root,
) {
  const records = generateItemRecords(html);
  // These subdirectories are reserved exclusively for generated records.
  for (const [directory] of namespaces) {
    const path = join(outputRoot, 'catalogue', directory);
    mkdirSync(path, { recursive: true });
    const expected = new Set(Object.keys(records)
      .filter(name => name.startsWith('catalogue/' + directory + '/'))
      .map(name => name.split('/').at(-1)));
    for (const filename of readdirSync(path)) {
      if (filename.endsWith('.json') && !expected.has(filename)) {
        unlinkSync(join(path, filename));
      }
    }
  }
  for (const [path, record] of Object.entries(records)) {
    writeFileSync(join(outputRoot, path), JSON.stringify(record, null, 2) + '\n');
  }
  return records;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const records = writeItemRecords();
  console.log('Generated ' + Object.keys(records).length + ' individual resource records');
}
