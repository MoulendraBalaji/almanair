/** Builds grounded local answers and the one optional chat request. */
import { config } from '@/config';
import type { MessageKey } from '@/content/messages';
import type { Plan } from '@/domain/plan';
import { sourceForId, uniqueSources, type PlanSource } from '@/domain/plan/sources';
import { chatRequestSchema, type ChatErrorCode } from '@/domain/retrieval/chat';
import { retrieve } from '@/domain/retrieval';
import { askChat } from '@/infra/chat-client';

/** A rendered answer with its citations and provenance notice. */
export interface AnswerDraft {
  paragraphs: readonly string[];
  sources: readonly PlanSource[];
  noticeKey: MessageKey;
}

/** Machine-readable failures mapped to catalogue copy. */
const errorKeys: Readonly<Record<ChatErrorCode, MessageKey>> = {
  offline: 'ask.localFallback',
  'rate-limited': 'ask.rateLimited',
  invalid: 'ask.error',
  unavailable: 'ask.localFallback',
};

/** Resolves only citation ids that exist in the validated catalogues. */
const resolveSources = (ids: readonly string[], plan: Plan): readonly PlanSource[] => {
  const known = new Map(plan.sources.map((source) => [source.id, source]));
  const resolved = ids.flatMap((id) => {
    const found = known.get(id);
    if (found) return [found];
    try {
      return [sourceForId(id)];
    } catch {
      return [];
    }
  });
  return uniqueSources(resolved);
};

/** Local BM25 answer with cited cards from the bundled library. */
export const localAnswer = (question: string, plan: Plan): AnswerDraft => {
  const cards = retrieve(question, config.ui.knowledgeTopK);
  return {
    paragraphs: cards.map((card) => card.text),
    sources: resolveSources(cards.flatMap((card) => card.sources), plan),
    noticeKey: cards.length === 0 ? 'ask.noMatch' : 'ask.localAnswer',
  };
};

/** Returns a remote answer when consented, otherwise the local answer. */
export const requestAnswer = async (question: string, plan: Plan, consent: boolean): Promise<AnswerDraft> => {
  const local = localAnswer(question, plan);
  if (!consent) return local;
  const request = chatRequestSchema.safeParse({
    question,
    digest: plan.digest.slice(0, config.chat.maxDigestChars),
    locale: plan.locale,
    sourceIds: [...new Set([...plan.sources.map((source) => source.id), ...local.sources.map((source) => source.id)])],
  });
  if (!request.success) return { ...local, noticeKey: 'ask.error' };
  const outcome = await askChat(request.data);
  if (!outcome.ok) return { ...local, noticeKey: errorKeys[outcome.error] };
  const allowed = new Set(plan.sources.map((source) => source.id));
  const sources = plan.sources.filter((source) => allowed.has(source.id) && outcome.response.sourceIds.includes(source.id));
  return { paragraphs: [outcome.response.answer], sources, noticeKey: 'ask.notice' };
};
