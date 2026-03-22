import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { stateSnapshotFixture } from '@/app/__tests__/fixtures';
import { createEmptyWorkbenchDiagnostics, type WorkbenchDiagnostics } from '@/app/play/runtime';
import { PromptStatusPanel } from '@/app/components/PromptStatusPanel';

function createDiagnosticsFixture(): WorkbenchDiagnostics {
  return {
    ...createEmptyWorkbenchDiagnostics(),
    latestOperation: 'audit',
    usage: {
      collapse: {
        promptTokens: 90,
        completionTokens: 18,
        totalTokens: 108,
      },
      route: {
        promptTokens: 60,
        completionTokens: 12,
        totalTokens: 72,
      },
      generate: {
        promptTokens: 240,
        completionTokens: 76,
        totalTokens: 316,
      },
      audit: {
        promptTokens: 120,
        completionTokens: 24,
        totalTokens: 144,
      },
      settlement: null,
    },
  };
}

describe('PromptStatusPanel', () => {
  it('renders prompt summary and prompt object diagnostics', () => {
    render(
      <PromptStatusPanel state={stateSnapshotFixture} diagnostics={createDiagnosticsFixture()} />,
    );

    expect(screen.getByText('Volume=High | BeatRules=Active | OptionRules=Active')).toBeInTheDocument();
    expect(screen.getByText('4 layers')).toBeInTheDocument();
    expect(screen.getByText('2 entries')).toBeInTheDocument();
    expect(screen.getByText('Latest observed call: Audit')).toBeInTheDocument();
    expect(screen.queryByText('Runtime Usage')).not.toBeInTheDocument();
  });

  it('shows a pending state before the first prompt is assembled', () => {
    render(<PromptStatusPanel state={null} diagnostics={createEmptyWorkbenchDiagnostics()} />);

    expect(screen.getByText('Awaiting first assembled prompt.')).toBeInTheDocument();
    expect(screen.getByText('Prompt Status')).toBeInTheDocument();
  });
});
