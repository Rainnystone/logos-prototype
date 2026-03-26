import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppShell } from '@/app/layout';

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn(() => '/'),
}));

const { useSearchParams } = vi.hoisted(() => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next/navigation', () => ({
  usePathname,
  useSearchParams,
}));

describe('RootLayout', () => {
  it('renders the global LOGOS header and navigation links', () => {
    usePathname.mockReturnValue('/play');
    useSearchParams.mockReturnValue(new URLSearchParams('storyPackage=sample-scene'));

    render(
      <AppShell>
        <div>Workbench Child</div>
      </AppShell>,
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'LOGOS Workbench' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sample Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Play Workbench' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to Title' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Restart Workbench' })).toHaveAttribute(
      'href',
      '/play?storyPackage=sample-scene',
    );
    expect(screen.getByRole('link', { name: 'Narrative Editor' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=worldbase-cast',
    );
  });

  it('removes the global LOGOS header on edit routes so the editor shell stays singular', () => {
    usePathname.mockReturnValue('/edit');
    useSearchParams.mockReturnValue(new URLSearchParams());

    render(
      <AppShell>
        <div>Editor Child</div>
      </AppShell>,
    );

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'LOGOS Workbench' })).not.toBeInTheDocument();
    expect(screen.getByText('Editor Child')).toBeInTheDocument();
  });

  it('removes the global LOGOS header on the title route so the landing page stands alone', () => {
    usePathname.mockReturnValue('/');
    useSearchParams.mockReturnValue(new URLSearchParams());

    render(
      <AppShell>
        <div>Runtime Child</div>
      </AppShell>,
    );

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'LOGOS Workbench' })).not.toBeInTheDocument();
    expect(screen.getByText('Runtime Child')).toBeInTheDocument();
  });
});
