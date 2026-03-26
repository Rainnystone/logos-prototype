import type { Metadata } from 'next';
import type { ReactNode } from 'react';

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

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
