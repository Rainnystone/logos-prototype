import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppShell } from '@/app/layout';

describe('RootLayout', () => {
  it('renders the global LOGOS header and navigation links', () => {
    render(
      <AppShell>
        <div>Workbench Child</div>
      </AppShell>,
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'LOGOS Workbench' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sample Dashboard' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Play Workbench' })).toHaveAttribute('href', '/play');
  });

  it('renders child content inside the main layout shell', () => {
    render(
      <AppShell>
        <div>Runtime Child</div>
      </AppShell>,
    );

    expect(screen.getByText('Runtime Child')).toBeInTheDocument();
  });
});
