'use client';

/** Browsable, cited field cards backed by the same BM25 index as Ask Pulse. */
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { Button } from '@/ui/Button';
import { formatNumber } from '@/ui/format';
import { Panel } from '@/ui/Panel';
import { SafeText } from '@/ui/SafeText';
import { SourceList } from '@/ui/SourceList';
import { TextField } from '@/ui/Controls';
import type { LearnCard } from './useLearn';
import { useLearn } from './useLearn';
import styles from './Learn.module.css';

/** One sourced card; all text is rendered as plain text. */
const Card = ({ card }: Readonly<{ card: LearnCard }>): ReactElement => {
  const { t } = useApp();
  return (
    <Panel title={card.title}>
      <SafeText text={card.text} />
      <h3>{t('learn.tags')}</h3>
      <ul className={styles.tags}>
        {card.tags.map((tag) => <li key={tag}>{tag}</li>)}
      </ul>
      <SourceList sources={card.sources} title={t('learn.sources')} />
    </Panel>
  );
};

/** Search field, result announcement and the card list. */
export const LearnView = (): ReactElement => {
  const { locale, t } = useApp();
  const { query, cards, setQuery, clear } = useLearn();
  const count = formatNumber(locale, cards.length);
  const summary = query.trim().length === 0
    ? t('learn.all')
    : cards.length === 1 ? t('learn.resultOne') : t('learn.results', { count });
  return (
    <div className={styles.view}>
      <p className={styles.dateline}>{t('learn.dateline')}</p>
      <Panel title={t('learn.title')}>
        <TextField id="learn-search" label={t('learn.search')} value={query} onChange={setQuery} />
        <p className={styles.summary} role="status" aria-live="polite">{summary}</p>
        {query.length > 0 ? <Button variant="quiet" onClick={clear}>{t('learn.clear')}</Button> : null}
      </Panel>
      {cards.length === 0 ? <Panel><p>{t('learn.empty')}</p></Panel> : null}
      {cards.map((card) => <Card key={card.id} card={card} />)}
    </div>
  );
};
