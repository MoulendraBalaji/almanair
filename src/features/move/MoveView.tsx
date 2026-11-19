'use client';

/** Lower-emission alternatives ranked with the plan's Impact Receipts. */
import { formatUnit } from '@/ui/format';
import type { MoveAlternative } from '@/domain/move';
import type { PlanSource } from '@/domain/plan/sources';
import { profileSchema } from '@/domain/profile';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { CheckboxField, SelectField } from '@/ui/Controls';
import { Panel } from '@/ui/Panel';
import { Receipt } from '@/ui/Receipt';
import { SourceList } from '@/ui/SourceList';
import { useMove } from './useMove';
import styles from './Move.module.css';

/** Named budget labels are taken from the validated profile enum. */
const budgetOptions = profileSchema.shape.budgetTier.options.map((tier) => ({ value: tier }));

/** Budget and free-first controls; all labels come from the catalogue. */
const Filters = ({ budget, freeFirst, chooseBudget, setFreeFirst }: Readonly<{
  budget: string;
  freeFirst: boolean;
  chooseBudget: (value: string) => void;
  setFreeFirst: (checked: boolean) => void;
}>): ReactElement => {
  const { t, tk } = useApp();
  const options = budgetOptions.map((option) => ({ ...option, label: tk(`options.${option.value}`) }));
  return (
    <div className={styles.filters}>
      <SelectField id="move-budget" label={t('move.filter')} value={budget} options={options} onChange={chooseBudget} />
      <CheckboxField id="move-free-first" label={t('move.freeFirst')} checked={freeFirst} onChange={setFreeFirst} />
    </div>
  );
};

/** One ranked alternative with its modelled change and verified citations. */
const Alternative = ({ item, sources }: Readonly<{ item: MoveAlternative; sources: readonly PlanSource[] }>): ReactElement => {
  const { locale, t, tk } = useApp();
  const { action, effect } = item;
  const weekly = formatUnit({ locale, translate: tk, key: 'units.kgPerWeek', value: effect.receipt.emissionsDelta });
  return (
    <Panel title={tk(action.titleKey)}>
      <p className={styles.meta}>{tk(`app.${action.costTier}`)}</p>
      <p className={styles.meta}>{tk(`app.${action.effort}`)}</p>
      <p>{tk(action.detailKey)}</p>
      <p>{tk(action.whyKey)}</p>
      <p className={styles.weekly}>{weekly}</p>
      <Receipt receipt={effect.receipt} />
      <SourceList sources={sources} title={t('app.source')} />
    </Panel>
  );
};

/** Composes filters, ranked alternatives and the citations used by them. */
export const MoveView = (): ReactElement => {
  const { plan, profile, t } = useApp();
  const { budget, freeFirst, alternatives, chooseBudget, setFreeFirst } = useMove(profile, plan);
  if (!plan) return <p>{t('app.empty')}</p>;
  const cited = new Set(alternatives.flatMap((item) => item.effect.sourceIds));
  const sources = plan.sources.filter((source) => cited.has(source.id));
  return (
    <div className={styles.view}>
      <Panel title={t('move.title')}>
        <p className={styles.dateline}>{t('move.dateline')}</p>
        <Filters budget={budget} freeFirst={freeFirst} chooseBudget={chooseBudget} setFreeFirst={setFreeFirst} />
      </Panel>
      {alternatives.length === 0 ? <Panel><p>{t('move.none')}</p></Panel> : null}
      {alternatives.map((item) => (
        <Alternative
          key={item.action.id}
          item={item}
          sources={sources.filter((source) => item.effect.sourceIds.includes(source.id))}
        />
      ))}
      <Panel>
        <SourceList sources={sources} title={t('app.source')} />
      </Panel>
    </div>
  );
};
