import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

import './globals.css';

export const metadata: Metadata = {
  title: 'LOGOS Workbench',
  description: 'Author workbench for the LOGOS narrative orchestration engine.',
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export function AppShell({ children }: RootLayoutProps) {
  return (
    <div className="app-shell">
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
      <div className="app-content">{children}</div>
    </div>
  );
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
