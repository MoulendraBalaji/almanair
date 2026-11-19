import { z } from 'zod';
import { sourceSchema } from './schema';

/** A leaf fact test inside a declarative action rule. */
export const factTestSchema = z.object({
  fact: z.string().min(1),
  in: z.array(z.string()).optional(),
  equals: z.string().optional(),
  gte: z.number().optional(),
  lte: z.number().optional(),
});

/** Applicability is data, so the evaluator never contains business rules. */
export const predicateSchema = z.object({
  all: z.array(factTestSchema).optional(),
  any: z.array(factTestSchema).optional(),
  none: z.array(factTestSchema).optional(),
});

/** A recommended change with sourced effects and plain-language copy keys. */
export const actionSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['indoor', 'transport', 'cooking', 'heating', 'waste', 'community']),
  costTier: z.enum(['free', 'low', 'medium', 'high']),
  effort: z.enum(['low', 'medium', 'high']),
  timeOfDay: z.array(z.enum(['morning', 'midday', 'evening', 'any'])).min(1),
  tenure: z.enum(['any', 'rent', 'own']),
  applicability: predicateSchema,
  effectRefs: z.array(z.string().min(1)),
  sourceIds: z.array(z.string().min(1)).min(1),
  titleKey: z.string().min(1),
  detailKey: z.string().min(1),
  whyKey: z.string().min(1),
});

/** Build-time BM25 card record. */
export const knowledgeCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tags: z.array(z.string()),
  sources: z.array(z.string()),
  text: z.string().min(1),
  length: z.number().positive(),
  termFrequency: z.record(z.string(), z.number()),
});

/** The precomputed on-device retrieval index. */
export const knowledgeIndexSchema = z.object({
  documentCount: z.number().positive(),
  documentFrequency: z.record(z.string(), z.number()),
  cards: z.array(knowledgeCardSchema),
});

/** One checklist step in a community playbook. */
export const playbookStepSchema = z.object({
  ownerKey: z.string().min(1),
  taskKey: z.string().min(1),
  effort: z.enum(['low', 'medium', 'high']),
});

/** A sourced community playbook. */
export const playbookSchema = z.object({
  id: z.string().min(1),
  communityType: z.enum(['neighbourhood', 'school', 'workplace', 'worship', 'market']),
  steps: z.array(playbookStepSchema).min(1),
  source: sourceSchema,
  confidence: z.enum(['high', 'medium', 'low']),
  notes: z.string(),
});

/** Qualitative local-pollutant tier for a fuel or mode. */
export const localTierSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  tier: z.enum(['lower', 'similar', 'higher']),
  source: sourceSchema,
  confidence: z.enum(['high', 'medium', 'low']),
  notes: z.string(),
});

/** Validated action catalogue. */
export type Action = z.infer<typeof actionSchema>;
/** Validated leaf fact test. */
export type FactTest = z.infer<typeof factTestSchema>;
/** Validated local-pollutant tier. */
export type LocalTier = z.infer<typeof localTierSchema>;
/** Validated retrieval index. */
export type KnowledgeIndex = z.infer<typeof knowledgeIndexSchema>;
/** Validated community playbook. */
export type Playbook = z.infer<typeof playbookSchema>;
/** Validated predicate. */
export type Predicate = z.infer<typeof predicateSchema>;
