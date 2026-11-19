/** Deduplicated citation records for receipts and chat answers. */
import { sourceById } from '@/data';
import type { Source } from '@/data/schema';

/** A citation with a stable id. */
export interface PlanSource extends Source {
  id: string;
}

/** Wraps a data record's source with its owning id. */
export const sourceRecord = (id: string, source: Source): PlanSource => ({ id, ...source });

/** Resolves a factor or citation id into a source record. */
export const sourceForId = (id: string): PlanSource => {
  const found = sourceById(id);
  return { id: found.id, title: found.title, publisher: found.publisher, url: found.url, year: found.year };
};

/** Removes duplicate citations while preserving the input order. */
export const uniqueSources = (values: readonly PlanSource[]): readonly PlanSource[] => {
  const seen = new Set<string>();
  return values.filter((source) => {
    if (seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
};
