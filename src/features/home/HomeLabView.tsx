'use client';

/** Indoor estimates, purifier sizing and low-cost hacks for the largest room. */
import type { Plan, PlanAction } from '@/domain/plan';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { Panel } from '@/ui/Panel';
import { SourceList } from '@/ui/SourceList';
import { formatUnit } from '@/ui/format';
import styles from './HomeLab.module.css';

/** The validated room and its steady-state concentration. */
const RoomMetrics = ({ plan }: Readonly<{ plan: Plan }>): ReactElement => {
  const { locale, t, tk } = useApp();
  const room = plan.indoor.room;
  const roomName = room.name === '' ? t('home.room') : room.name;
  return (
    <Panel title={t('home.room')}>
      <dl className={styles.metrics}>
        <dt>{t('home.room')}</dt>
        <dd>{roomName}</dd>
        <dt>{t('home.volume')}</dt>
        <dd>{formatUnit({ locale, translate: tk, key: 'units.cubicMetres', value: room.volume })}</dd>
        <dt>{t('home.steady')}</dt>
        <dd>{formatUnit({ locale, translate: tk, key: 'units.microgramsPerDay', value: plan.indoor.central })}</dd>
        <dt>{t('home.with')}</dt>
        <dd>{formatUnit({ locale, translate: tk, key: 'units.cubicMetresPerHour', value: plan.indoor.cadr })}</dd>
        <dt>{t('home.without')}</dt>
        <dd>{formatUnit({ locale, translate: tk, key: 'units.microgramsPerDay', value: plan.indoor.withoutPurifier })}</dd>
      </dl>
    </Panel>
  );
};

/** Sizing rule expressed as target air changes and required delivery rate. */
const Sizing = ({ plan }: Readonly<{ plan: Plan }>): ReactElement => {
  const { locale, t, tk } = useApp();
  return (
    <Panel title={t('home.targetAch')} tone="accent">
      <dl className={styles.metrics}>
        <dt>{t('home.targetAch')}</dt>
        <dd>{formatUnit({ locale, translate: tk, key: 'units.airChangesPerHour', value: plan.indoor.targetAch })}</dd>
        <dt>{t('home.cadr')}</dt>
        <dd>{formatUnit({ locale, translate: tk, key: 'units.cubicMetresPerHour', value: plan.indoor.requiredCadr })}</dd>
      </dl>
      <p>{t('home.unitsNeeded', { value: String(plan.indoor.unitsNeeded) })}</p>
    </Panel>
  );
};

/** One ranked low-cost indoor action. */
const Hack = ({ item }: Readonly<{ item: PlanAction }>): ReactElement => {
  const { tk } = useApp();
  return (
    <article className={styles.hack}>
      <h3>{tk(item.action.titleKey)}</h3>
      <p>{tk(item.action.detailKey)}</p>
    </article>
  );
};

/** Cheap, renter-friendly moves filtered from the ranked plan. */
const Hacks = ({ plan }: Readonly<{ plan: Plan }>): ReactElement => {
  const { t } = useApp();
  const hacks = plan.actions.filter((item) => item.action.category === 'indoor' || item.action.category === 'cooking');
  return (
    <Panel title={t('home.hacks')}>
      {hacks.length === 0 ? <p>{t('app.empty')}</p> : (
        <div className={styles.hacks}>
          {hacks.map((item) => <Hack key={item.action.id} item={item} />)}
        </div>
      )}
    </Panel>
  );
};

/** Two common myths, answered from the validated knowledge cards. */
const Myths = (): ReactElement => {
  const { t } = useApp();
  return (
    <Panel title={t('home.myths')}>
      <details>
        <summary>{t('home.myth1q')}</summary>
        <p>{t('home.myth1a')}</p>
      </details>
      <details>
        <summary>{t('home.myth2q')}</summary>
        <p>{t('home.myth2a')}</p>
      </details>
    </Panel>
  );
};

/** Composes the indoor brief from one deterministic plan. */
export const HomeLabView = (): ReactElement => {
  const { plan, t } = useApp();
  if (!plan) return <p>{t('home.empty')}</p>;
  const sources = plan.sources.filter((source) => plan.indoor.sourceIds.includes(source.id));
  return (
    <div className={styles.view}>
      <p className={styles.dateline}>{t('home.dateline')}</p>
      <RoomMetrics plan={plan} />
      <Sizing plan={plan} />
      <Hacks plan={plan} />
      <Panel title={t('home.cooking')}>
        <p>{t('home.coWarning')}</p>
      </Panel>
      <Myths />
      <Panel>
        <SourceList sources={sources} title={t('app.source')} />
      </Panel>
    </div>
  );
};
