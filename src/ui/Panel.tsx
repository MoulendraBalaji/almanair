import type { ReactElement, ReactNode } from 'react';
import styles from './Panel.module.css';

/** Optional visual tones are named, never hard-coded per component. */
export type PanelTone = 'default' | 'accent' | 'caution';

/** A labelled surface used by every screen. */
export const Panel = ({ title, children, tone = 'default' }: Readonly<{ title?: ReactNode; children: ReactNode; tone?: PanelTone }>): ReactElement => {
  const panelClass = styles.panel ?? '';
  const toneClass = tone === 'default' ? '' : styles[tone] ?? '';
  return (
    <section className={`${panelClass} ${toneClass}`}>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      {children}
    </section>
  );
};
