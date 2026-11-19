import type { PlanSource } from '@/domain/plan/sources';
import type { ReactElement, ReactNode } from 'react';
import styles from './SourceList.module.css';

/** Deduplicated, human-verifiable citations shared by receipts and answers. */
export const SourceList = ({ sources, title }: Readonly<{ sources: readonly PlanSource[]; title: ReactNode }>): ReactElement => (
  <div className={styles.sources}>
    <h3>{title}</h3>
    <ul className={styles.list}>
      {sources.map((source) => (
        <li key={source.id}>
          <a href={source.url} target="_blank" rel="noreferrer noopener">
            {source.title}
          </a>
        </li>
      ))}
    </ul>
  </div>
);
