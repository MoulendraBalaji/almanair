import type { ReactElement, ReactNode } from 'react';
import styles from './Field.module.css';

/** Labelled form row with optional explanatory copy. */
export const Field = ({
  id,
  label,
  hint,
  children,
}: Readonly<{ id: string; label: ReactNode; hint?: ReactNode; children: ReactNode }>): ReactElement => (
  <div className={styles.field}>
    <label className={styles.label} htmlFor={id}>
      {label}
    </label>
    {children}
    {hint ? <p className={styles.hint}>{hint}</p> : null}
  </div>
);
