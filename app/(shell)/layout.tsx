import { AppProvider } from '@/features/app/AppProvider';
import { Shell } from '@/features/app/Shell';
import type { ReactElement, ReactNode } from 'react';

/** Wraps every screen in the single client state provider and shared chrome. */
export default function ShellLayout({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <AppProvider>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
