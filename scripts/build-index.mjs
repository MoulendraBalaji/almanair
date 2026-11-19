/**
 * Precomputes the on-device retrieval index and the action catalogue.
 * Cards stay as Markdown with frontmatter in /content; the generated JSON is
 * the only artefact imported by the domain layer (which may not read files).
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const knowledgeDir = join(root, 'src', 'content', 'knowledge');
const actionsDir = join(root, 'src', 'content', 'actions');
const messagesDir = join(root, 'src', 'content', 'messages');
const outDir = join(root, 'src', 'data', 'generated');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = async (name, value) => {
  await writeFile(join(outDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};
const tokenize = (text) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** Flattens nested message objects to typed dot paths. */
const flatten = (value, prefix = '', result = {}) => {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, result);
    else result[path] = String(child);
  }
  return result;
};

const parseCard = (markdown) => {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(normalized);
  if (!match) throw new Error('Knowledge card is missing frontmatter');
  const [, frontmatter, body] = match;
  const field = (key) => {
    const found = new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(frontmatter ?? '');
    return found?.[1]?.trim() ?? '';
  };
  return {
    id: field('id'),
    title: field('title'),
    tags: field('tags').split(',').map((tag) => tag.trim()).filter(Boolean),
    sources: field('sources').split(',').map((source) => source.trim()).filter(Boolean),
    text: (body ?? '').replace(/\s+/g, ' ').trim(),
  };
};

const main = async () => {
  await mkdir(outDir, { recursive: true });
  const cardNames = (await readdir(knowledgeDir)).filter((name) => name.endsWith('.md')).sort();
  const cards = await Promise.all(cardNames.map(async (name) => parseCard(await readFile(join(knowledgeDir, name), 'utf8'))));
  const sourceIds = (await readJson(join(root, 'src', 'data', 'sources.json'))).map((source) => source.id);
  const factorIds = (await readJson(join(root, 'src', 'data', 'factors.json'))).map((factor) => factor.id);
  const knownIds = new Set([...sourceIds, ...factorIds]);
  for (const card of cards) {
    for (const id of card.sources) {
      if (!knownIds.has(id)) throw new Error(`Knowledge card ${card.id} has unknown source: ${id}`);
    }
  }
  const terms = cards.map((card) => tokenize(`${card.title} ${card.tags.join(' ')} ${card.text}`));
  const documentFrequency = new Map();
  for (const tokens of terms) {
    for (const token of new Set(tokens)) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  }
  const indexedCards = cards.map((card, position) => ({
    ...card,
    length: terms[position]?.length ?? 0,
    termFrequency: Object.fromEntries(
      [...new Set(terms[position] ?? [])].map((token) => [token, (terms[position] ?? []).filter((item) => item === token).length]),
    ),
  }));
  await writeJson('knowledge-index.json', {
    documentCount: cards.length,
    documentFrequency: Object.fromEntries(documentFrequency),
    cards: indexedCards,
  });

  const actionNames = (await readdir(actionsDir)).filter((name) => name.endsWith('.json')).sort();
  const actions = (await Promise.all(actionNames.map(async (name) => readJson(join(actionsDir, name))))).flat();
  await writeJson('actions.json', actions);

  const messageNames = (await readdir(messagesDir)).filter((name) => name.endsWith('.json')).sort();
  const messages = {};
  for (const name of messageNames) {
    messages[name.replace('.json', '')] = flatten(await readJson(join(messagesDir, name)));
  }
  await writeJson('messages.json', messages);
  console.log(`Indexed ${cards.length} cards, ${actions.length} actions and ${Object.keys(messages).length} locales.`);
};

await main();
