import type { ReactElement } from 'react';
import styles from './SafeText.module.css';

/** Renders model or local-guide text as plain text; HTML is never injected. */
export const SafeText = ({ text }: Readonly<{ text: string }>): ReactElement => <p className={styles.text}>{text}</p>;
