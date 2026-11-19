/** Tiny typed evaluator for declarative action applicability rules. */
import type { Action, FactTest, Predicate } from '@/data/catalogue-schema';

/** Facts exposed to action rules; only profile-derived, non-identifying values. */
export type Facts = Readonly<Record<string, string | number | boolean>>;

/** Time-of-day labels used by action rules. */
export type TimeOfDay = 'morning' | 'midday' | 'evening' | 'any';

const asText = (value: string | number | boolean): string => String(value);

const matchesText = (test: FactTest, actual: string | number | boolean): boolean => {
  const text = asText(actual);
  return test.in?.includes(text) === true || test.equals === text;
};

const matchesNumber = (test: FactTest, actual: string | number | boolean): boolean =>
  typeof actual === 'number' && ((test.gte !== undefined && actual >= test.gte) || (test.lte !== undefined && actual <= test.lte));

/** Evaluates one leaf test against the fact map. */
export const testFact = (test: FactTest, facts: Facts): boolean => {
  const actual = facts[test.fact];
  if (actual === undefined) return false;
  return matchesText(test, actual) || matchesNumber(test, actual);
};

/** Evaluates all/any/none clauses; an empty predicate is universally applicable. */
export const matchesPredicate = (predicate: Predicate, facts: Facts): boolean => {
  if (predicate.all && !predicate.all.every((test) => testFact(test, facts))) return false;
  if (predicate.any && predicate.any.length > 0 && !predicate.any.some((test) => testFact(test, facts))) return false;
  if (predicate.none?.some((test) => testFact(test, facts))) return false;
  return true;
};

/** Filters actions by predicate, tenure and time of day. */
export const applicableActions = (actions: readonly Action[], facts: Facts, timeOfDay: TimeOfDay): readonly Action[] =>
  actions.filter(
    (action) =>
      matchesPredicate(action.applicability, facts) &&
      (action.tenure === 'any' || action.tenure === facts['home.tenure']) &&
      (action.timeOfDay.includes('any') || action.timeOfDay.includes(timeOfDay)),
  );
