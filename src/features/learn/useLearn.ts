/** On-device BM25 search over the build-time field library. */
import { config } from '@/config';
import { knowledgeIndex } from '@/data';
import type { PlanSource } from '@/domain/plan/sources';
import { sourceForId } from '@/domain/plan/sources';
import { retrieve } from '@/domain/retrieval';
import { useMemo, useState } from 'react';

/** Shared shape of an indexed card and a retrieved card. */
interface CardLike {
  id: string;
  title: string;
  text: string;
  tags: readonly string[];
  sources: readonly string[];
}

/** A card with resolvable citations for the UI. */
export interface LearnCard {
  id: string;
  title: string;
  text: string;
  tags: readonly string[];
  sources: readonly PlanSource[];
}

/** Everything the Learn screen needs to search and reset. */
export interface LearnController {
  query: string;
  cards: readonly LearnCard[];
  setQuery: (value: string) => void;
  clear: () => void;
}

/** Resolves citation ids through the same validated catalogue as receipts. */
const toLearnCard = (card: CardLike): LearnCard => ({
  id: card.id,
  title: card.title,
  text: card.text,
  tags: card.tags,
  sources: card.sources.map(sourceForId),
});

/** Ranks a query locally, or lists every card when no query is entered. */
export const useLearn = (): LearnController => {
  const [query, setQuery] = useState('');
  const cards = useMemo<readonly LearnCard[]>(() => {
    const value = query.trim();
    if (value.length === 0) return knowledgeIndex.cards.map(toLearnCard);
    return retrieve(value, config.ui.knowledgeTopK).map(toLearnCard);
  }, [query]);
  return { query, cards, setQuery, clear: (): void => { setQuery(''); } };
};
