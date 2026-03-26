'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type AppShellProps = Readonly<{
  children: ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const hideGlobalHeader = pathname?.startsWith('/edit');

  return (
    <div className="app-shell">
      {!hideGlobalHeader ? (
        <header className="app-header" role="banner">
          <div className="app-brand">
            <p className="app-brand__kicker">Linguistic Oriented Game Orchestration Studio</p>
            <h1>LOGOS Workbench</h1>
          </div>
          <nav className="app-nav" aria-label="Primary">
            <Link href="/">Sample Dashboard</Link>
            <Link href="/play">Play Workbench</Link>
          </nav>
        </header>
      ) : null}
      <div className="app-content">{children}</div>
    </div>
  );
}
