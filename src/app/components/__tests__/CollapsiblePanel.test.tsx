import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { CollapsiblePanel } from '@/app/components/CollapsiblePanel';

describe('CollapsiblePanel', () => {
  it('renders the title and eyebrow', () => {
    render(
      <CollapsiblePanel title="Panel Title" eyebrow="Panel Eyebrow">
        <p>Panel content</p>
      </CollapsiblePanel>,
    );

    expect(screen.getByText('Panel Eyebrow')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Panel Title' })).toBeInTheDocument();
  });

  it('starts collapsed by default and reveals content when toggled', async () => {
    const user = userEvent.setup();

    render(
      <CollapsiblePanel title="Toggle Me">
        <p>Hidden content</p>
      </CollapsiblePanel>,
    );

    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Toggle Me' }));

    expect(screen.getByText('Hidden content')).toBeInTheDocument();
  });

  it('starts open when defaultOpen is true and hides content when toggled', async () => {
    const user = userEvent.setup();

    render(
      <CollapsiblePanel title="Toggle Me" defaultOpen>
        <p>Visible content</p>
      </CollapsiblePanel>,
    );

    expect(screen.getByText('Visible content')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Toggle Me' }));

    expect(screen.queryByText('Visible content')).not.toBeInTheDocument();
  });

  it('exposes the expanded state on the toggle button', async () => {
    const user = userEvent.setup();

    render(
      <CollapsiblePanel title="Toggle Me">
        <p>Content</p>
      </CollapsiblePanel>,
    );

    const toggle = screen.getByRole('button', { name: 'Toggle Me' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('rotates the chevron when expanded', async () => {
    const user = userEvent.setup();

    render(
      <CollapsiblePanel title="Toggle Me">
        <p>Content</p>
      </CollapsiblePanel>,
    );

    const toggle = screen.getByRole('button', { name: 'Toggle Me' });
    const chevron = toggle.querySelector('span:last-child');

    expect(chevron).not.toHaveClass('rotate-180');

    await user.click(toggle);

    expect(chevron).toHaveClass('rotate-180');
  });

  it('calls the dark variant styling when requested', () => {
    render(
      <CollapsiblePanel title="Dark Panel" variant="dark">
        <p>Content</p>
      </CollapsiblePanel>,
    );

    const section = screen.getByRole('region');

    expect(section).toHaveClass('bg-black', 'text-white');
  });
});
