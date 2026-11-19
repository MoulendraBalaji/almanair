import { AppProvider } from '@/features/app/AppProvider';
import { Shell } from '@/features/app/Shell';
import type { ReactElement, ReactNode } from 'react';

/** The nonce CSP needs per-request HTML; static HTML cannot carry a fresh nonce. */
export const dynamic = 'force-dynamic';

/** Wraps every screen in the single client state provider and shared chrome. */
export default function ShellLayout({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <AppProvider>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
