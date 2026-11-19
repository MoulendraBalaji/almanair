import { describe, expect, it } from 'vitest';
import { config } from '@/config';
import type { KnowledgeIndex } from '@/data/catalogue-schema';
import { retrieve, scoreCard, tokenize } from '@/domain/retrieval';

const card = (id: string, termFrequency: Record<string, number>, length: number): KnowledgeIndex['cards'][number] => ({
  id,
  title: id,
  tags: [],
  sources: ['source'],
  text: id,
  length,
  termFrequency,
});

const index: KnowledgeIndex = {
  documentCount: 2,
  documentFrequency: { smog: 2, mask: 1 },
  cards: [card('mask-card', { smog: 3, mask: 1 }, 4), card('smog-card', { smog: 1 }, 2)],
};

describe('on-device retrieval', () => {
  it('tokenizes deterministically', () => {
    expect(tokenize('Winter SMOG, masks! 42')).toEqual(['winter', 'smog', 'masks', '42']);
    expect(tokenize('')).toEqual([]);
  });

  it('scores term frequency above a single mention', () => {
    const high = scoreCard(['smog'], index.cards[0] ?? card('missing', {}, 1), index);
    const low = scoreCard(['smog'], index.cards[1] ?? card('missing', {}, 1), index);
    expect(high).toBeGreaterThan(low);
    expect(scoreCard(['absent'], index.cards[0] ?? card('missing', {}, 1), index)).toBe(0);
  });

  it('ranks injected cards and ignores empty queries', () => {
    expect(retrieve('smog mask', 1, index).map((item) => item.id)).toEqual(['mask-card']);
    expect(retrieve('smog', 5, index)).toHaveLength(2);
    expect(retrieve('unknown', 5, index)).toEqual([]);
  });

  it('returns cited cards from the bundled index', () => {
    const results = retrieve('mask', config.ui.knowledgeTopK);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.sources.length).toBeGreaterThan(0);
    for (let position = 1; position < results.length; position += 1) {
      const previous = results[position - 1];
      const current = results[position];
      if (previous && current) expect(previous.score).toBeGreaterThanOrEqual(current.score);
    }
  });
});
