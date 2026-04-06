import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import RootLayout, { AppShell } from '@/app/layout';

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
    useSearchParams.mockReturnValue(new URLSearchParams('storyPackage=alt-scene'));

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
      '/play?storyPackage=alt-scene',
    );
    expect(screen.getByRole('link', { name: 'Narrative Editor' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=alt-scene&section=story-package-management',
    );
  });

  it('falls back to the default editor route when no package is in context', () => {
    usePathname.mockReturnValue('/play');
    useSearchParams.mockReturnValue(new URLSearchParams());

    render(
      <AppShell>
        <div>Workbench Child</div>
      </AppShell>,
    );

    expect(screen.getByRole('link', { name: 'Narrative Editor' })).toHaveAttribute(
      'href',
      '/edit?section=story-package-management',
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

  it('wraps the app shell in suspense so production prerender can resolve search params safely', () => {
    const result = RootLayout({
      children: <div>Layout Child</div>,
    });

    expect(result.type).toBe('html');
    expect(result.props.children.type).toBe('body');
    expect(result.props.children.props.children.type).toBe(Suspense);
    expect(result.props.children.props.children.props.children.type).toBe(AppShell);
  });
});
