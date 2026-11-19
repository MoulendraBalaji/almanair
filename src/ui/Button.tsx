import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';
import styles from './Button.module.css';

/** Button emphasis is a named choice, not a raw colour. */
export type ButtonVariant = 'primary' | 'secondary' | 'quiet';

/** Accessible native button with shared token-only styling. */
export const Button = ({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
}: Readonly<{
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  type?: 'button' | 'submit';
  disabled?: boolean;
}>): ReactElement => (
  <button type={type === 'submit' ? 'submit' : 'button'} className={styles[variant]} onClick={onClick} disabled={disabled}>
    {children}
  </button>
);

/** Internal link styled exactly like a button. */
export const LinkButton = ({
  href,
  children,
  variant = 'primary',
}: Readonly<{ href: string; children: ReactNode; variant?: ButtonVariant }>): ReactElement => (
  <Link href={href} className={styles[variant]}>
    {children}
  </Link>
);
