'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

type AppShellProps = Readonly<{
  children: ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hideGlobalHeader = pathname === '/' || pathname?.startsWith('/edit');
  const selectedPackageName = searchParams.get('storyPackage');
  const restartWorkbenchHref = selectedPackageName
    ? `/play?storyPackage=${encodeURIComponent(selectedPackageName)}`
    : '/play';
  const narrativeEditorHref = selectedPackageName
    ? `/edit?storyPackage=${encodeURIComponent(selectedPackageName)}&section=worldbase-cast`
    : '/edit?section=worldbase-cast';

  return (
    <div className="app-shell">
      {!hideGlobalHeader ? (
        <header className="app-header" role="banner">
          <div className="app-brand">
            <p className="app-brand__kicker">Linguistic Oriented Game Orchestration Studio</p>
            <h1>LOGOS Workbench</h1>
          </div>
          <nav className="app-nav" aria-label="Primary">
            <Link href="/">Return to Title</Link>
            <Link href={restartWorkbenchHref}>Restart Workbench</Link>
            <Link href={narrativeEditorHref}>Narrative Editor</Link>
          </nav>
        </header>
      ) : null}
      <div className="app-content">{children}</div>
    </div>
  );
}
