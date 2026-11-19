'use client';

/** One ranked action with its plain-language reasoning and impact receipt. */
import { config } from '@/config';
import type { PlanAction } from '@/domain/plan';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { Meter } from './Meter';
import { Panel } from './Panel';
import { Receipt } from './Receipt';
import styles from './ActionCard.module.css';

/** Clamps an unbounded benefit score to the configured percentage scale. */
const percentOf = (score: number): number => Math.min(config.math.percent, Math.max(0, score * config.math.percent));

/** Shows an action, its cost and its explainable estimate. */
export const ActionCard = ({ item }: Readonly<{ item: PlanAction }>): ReactElement => {
  const { t, tk } = useApp();
  return (
    <Panel title={tk(item.action.titleKey)}>
      <p>{tk(item.action.detailKey)}</p>
      <p className={styles.why}>{tk(item.action.whyKey)}</p>
      <div className={styles.meta}>
        <span>{tk(`options.${item.action.costTier}`)}</span>
        <span>{tk(`options.${item.effect.receipt.effort}`)}</span>
      </div>
      <Meter label={t('app.estimate')} value={percentOf(item.effect.score)} />
      <Receipt receipt={item.effect.receipt} />
    </Panel>
  );
};
