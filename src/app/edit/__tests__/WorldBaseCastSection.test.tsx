import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WorldBaseCastSection } from '@/app/edit/sections/WorldBaseCastSection';

describe('WorldBaseCastSection', () => {
  it('renders the worldbase slice with a summary rail and editor controls', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onReset = vi.fn();
    const onChange = vi.fn();

    render(
      <WorldBaseCastSection
        packageName="sample-scene"
        value={{
          mainCharacters: '主文本',
          npcCharacters: '竹田启司：稳重的男友',
          locationPatch: '2年C班教室',
        }}
        onChange={onChange}
        onSubmit={onSubmit}
        onReset={onReset}
      />,
    );

    expect(screen.getByRole('heading', { name: 'WorldBase & Cast' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Main Characters' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Main Characters' })).toHaveValue('主文本');

    await user.type(screen.getByRole('textbox', { name: 'Main Characters' }), ' 追加');

    expect(onChange).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save Section' }));
    await user.click(screen.getByRole('button', { name: 'Reset Section' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
