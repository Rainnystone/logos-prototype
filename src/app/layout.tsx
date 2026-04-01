import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';

import { AppShell } from '@/app/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'LOGOS',
  description: 'Title page for the LOGOS narrative orchestration studio.',
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export { AppShell };

function AppShellFallback({ children }: RootLayoutProps) {
  return <div className="app-shell"><div className="app-content">{children}</div></div>;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<AppShellFallback>{children}</AppShellFallback>}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
