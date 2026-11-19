/** Local filters over the pure lower-emission ranking. */
import type { Plan } from '@/domain/plan';
import { profileSchema, type Profile } from '@/domain/profile';
import { moveAlternatives, type MoveAlternative, type MoveBudget } from '@/domain/move';
import { useMemo, useState } from 'react';
import { selected } from '@/ui/select';

/** Everything the Move screen needs to render and filter alternatives. */
export interface MoveController {
  budget: MoveBudget;
  freeFirst: boolean;
  alternatives: readonly MoveAlternative[];
  chooseBudget: (value: string) => void;
  setFreeFirst: (checked: boolean) => void;
}

/** Keeps filter state local and derives alternatives from the same profile as the plan. */
export const useMove = (profile: Profile, plan: Plan | null): MoveController => {
  const [budget, setBudget] = useState<MoveBudget>(profile.budgetTier);
  const [freeFirst, setFreeFirst] = useState(false);
  const alternatives = useMemo(
    () => (plan ? moveAlternatives({ profile, date: new Date(plan.generatedAt), budget, freeFirst }) : []),
    [profile, plan, budget, freeFirst],
  );
  const chooseBudget = (value: string): void => {
    selected(profileSchema.shape.budgetTier, value, setBudget);
  };
  return { budget, freeFirst, alternatives, chooseBudget, setFreeFirst };
};
