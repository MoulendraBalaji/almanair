'use client';

/** Primary navigation; every label comes from the message catalogue. */
import type { MessageKey } from '@/content/messages';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactElement } from 'react';
import { useApp } from './AppProvider';
import styles from './Navigation.module.css';

/** A single named destination. */
interface NavItem {
  href: string;
  labelKey: MessageKey;
}

/** All shipped routes in product order. */
const items: readonly NavItem[] = [
  { href: '/today', labelKey: 'nav.today' },
  { href: '/routine', labelKey: 'nav.routine' },
  { href: '/home', labelKey: 'nav.home' },
  { href: '/ask', labelKey: 'nav.ask' },
  { href: '/move', labelKey: 'nav.move' },
  { href: '/community', labelKey: 'nav.community' },
  { href: '/learn', labelKey: 'nav.learn' },
  { href: '/settings', labelKey: 'nav.settings' },
  { href: '/setup', labelKey: 'nav.setup' },
];

/** Responsive list with an explicit menu state on small screens. */
export const Navigation = (): ReactElement => {
  const { t } = useApp();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const listClass = styles.list ?? '';
  const openClass = open ? styles.open ?? '' : '';

  return (
    <nav className={styles.nav} id="app-navigation" aria-label={t('nav.main')}>
      <button
        className={styles.toggle}
        type="button"
        aria-expanded={open}
        aria-controls="app-navigation"
        onClick={(): void => {
          setOpen(!open);
        }}
      >
        {open ? t('nav.closeMenu') : t('nav.menu')}
      </button>
      <ul className={`${openClass} ${listClass}`}>
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={active ? styles.active : styles.item}
                aria-current={active ? 'page' : undefined}
              >
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
