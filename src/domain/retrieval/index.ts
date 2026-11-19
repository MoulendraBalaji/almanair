/**
 * BM25 over a build-time index. BM25 is used because it is transparent,
 * deterministic and needs no model download or network call.
 */
import { config } from '@/config';
import type { KnowledgeIndex } from '@/data/catalogue-schema';
import { knowledgeIndex as bundledIndex } from '@/data';

/** Tokenizer shared by the build script and the runtime retriever. */
export const tokenize = (text: string): readonly string[] => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** A card with its relevance score for a query. */
export interface RetrievedCard {
  id: string;
  title: string;
  text: string;
  tags: readonly string[];
  sources: readonly string[];
  score: number;
}

const inverseDocumentFrequency = (documentFrequency: number, count: number): number =>
  Math.log(1 + (count - documentFrequency + config.math.midpoint) / (documentFrequency + config.math.midpoint));

/** Scores one card for a set of query tokens. */
export const scoreCard = (
  query: readonly string[],
  card: KnowledgeIndex['cards'][number],
  index: KnowledgeIndex,
): number => {
  let score = 0;
  for (const token of query) {
    const frequency = card.termFrequency[token];
    const documentFrequency = index.documentFrequency[token];
    if (!frequency || !documentFrequency) continue;
    const idf = inverseDocumentFrequency(documentFrequency, index.documentCount);
    const denominator = frequency + config.retrieval.k1 * (1 - config.retrieval.b + config.retrieval.b * (card.length / Math.max(index.documentCount, 1)));
    score += idf * (frequency * (config.retrieval.k1 + 1)) / denominator;
  }
  return score;
};

/** Returns the top-k cards; the index can be injected for tests and lazy loading. */
export const retrieve = (query: string, limit: number, index: KnowledgeIndex = bundledIndex): readonly RetrievedCard[] =>
  index.cards
    .map((card) => ({ card, score: scoreCard(tokenize(query), card, index) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.card.id.localeCompare(right.card.id))
    .slice(0, limit)
    .map((item) => ({
      id: item.card.id,
      title: item.card.title,
      text: item.card.text,
      tags: item.card.tags,
      sources: item.card.sources,
      score: item.score,
    }));
