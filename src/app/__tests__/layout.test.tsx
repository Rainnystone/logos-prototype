import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppShell } from '@/app/layout';

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn(() => '/'),
}));

vi.mock('next/navigation', () => ({
  usePathname,
}));

describe('RootLayout', () => {
  it('renders the global LOGOS header and navigation links', () => {
    usePathname.mockReturnValue('/');

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

  it('removes the global LOGOS header on edit routes so the editor shell stays singular', () => {
    usePathname.mockReturnValue('/edit');

    render(
      <AppShell>
        <div>Editor Child</div>
      </AppShell>,
    );

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'LOGOS Workbench' })).not.toBeInTheDocument();
    expect(screen.getByText('Editor Child')).toBeInTheDocument();
  });

  it('renders child content inside the main layout shell', () => {
    usePathname.mockReturnValue('/');

    render(
      <AppShell>
        <div>Runtime Child</div>
      </AppShell>,
    );

    expect(screen.getByText('Runtime Child')).toBeInTheDocument();
  });
});
