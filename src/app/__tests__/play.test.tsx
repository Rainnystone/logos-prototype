import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PlayWorkbench } from '@/app/play/PlayWorkbench';
import { adapterConfigFixture, storyPackageFixture } from '@/app/__tests__/fixtures';
import type { CollapseInput, LLMAdapter } from '@/engine/types/adapter-interface';
import type { AuditResult, GenerateResult } from '@/engine/types/adapter-interface';
import type { CollapseResponse } from '@/types';

type AuditMode = 'pass' | 'fail-once' | 'fail-always';

interface PlayHarnessConfig {
  readonly auditMode?: AuditMode;
  readonly delayMs?: number;
}

function wait(delayMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function createCollapseResponse(request: CollapseInput): CollapseResponse {
  const suffix = request.phaseConsequences?.[0] ?? request.context.mainAxis;

  return {
    alpha: `Alpha boundary from ${suffix}`,
    beta: `Beta boundary from ${suffix}`,
    inferenceTrace: 'collapse-trace',
    usage: {
      promptTokens: 64,
      completionTokens: 24,
      totalTokens: 88,
    },
  };
}

function createPlayAdapterHarness(config: PlayHarnessConfig = {}) {
  const delayMs = config.delayMs ?? 20;
  let generateCount = 0;
  let auditCount = 0;

  const adapter: LLMAdapter = {
    async collapse(request) {
      await wait(delayMs);
      return createCollapseResponse(request);
    },
    async generate(promptObject) {
      generateCount += 1;
      await wait(delayMs);

      const isRewrite = Boolean(promptObject.generationControl?.isRewrite);
      const suffix = isRewrite ? 'Rewritten' : 'Draft';

      return {
        beatText: `${suffix} beat ${generateCount} for ${promptObject.directorNote.router}.`,
        options: [
          `Option ${generateCount}-1`,
          `Option ${generateCount}-2`,
          `Option ${generateCount}-3`,
          `Option ${generateCount}-4`,
        ],
        usage: {
          promptTokens: 180,
          completionTokens: 52,
          totalTokens: 232,
        },
      } satisfies GenerateResult;
    },
    async audit() {
      auditCount += 1;
      await wait(delayMs);

      if (config.auditMode === 'fail-always') {
        return {
          answers: [false, true],
          usage: {
            promptTokens: 96,
            completionTokens: 16,
            totalTokens: 112,
          },
        } satisfies AuditResult;
      }

      if (config.auditMode === 'fail-once' && auditCount === 1) {
        return {
          answers: [false, true],
          usage: {
            promptTokens: 96,
            completionTokens: 16,
            totalTokens: 112,
          },
        } satisfies AuditResult;
      }

      return {
        answers: [true, true],
        usage: {
          promptTokens: 96,
          completionTokens: 16,
          totalTokens: 112,
        },
      } satisfies AuditResult;
    },
    async settlement() {
      await wait(delayMs);
      return {
        phaseConsequences: ['The signal source has been cornered.'],
        settlementTrace: 'settlement-trace',
        usage: {
          promptTokens: 140,
          completionTokens: 48,
          totalTokens: 188,
        },
      };
    },
  };

  return {
    adapter,
    getGenerateCount: () => generateCount,
  };
}

describe('PlayWorkbench', () => {
  it('shows scene initialization before the workbench is ready', async () => {
    const harness = createPlayAdapterHarness();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    expect(screen.getByText('Initializing Scene...', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Signal Room')).toBeInTheDocument();
    expect(
      await screen.findByText('Beat 1 ready. Choose an option or write the next action.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('shows generating and auditing statuses before accepting a beat', async () => {
    const harness = createPlayAdapterHarness({ delayMs: 40 });
    const user = userEvent.setup();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    await screen.findByText('Beat 1 ready. Choose an option or write the next action.');
    await user.type(screen.getByLabelText('Free text action'), 'Advance into the corridor.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(await screen.findByText('Generating...')).toBeInTheDocument();
    expect(await screen.findByText('Auditing...')).toBeInTheDocument();
    expect(await screen.findByText('Accepted')).toBeInTheDocument();
    expect(await screen.findAllByText('Draft beat 1 for Investigation.')).toHaveLength(2);
  });

  it('displays rewrite feedback when an audit failure triggers a retry', async () => {
    const harness = createPlayAdapterHarness({ auditMode: 'fail-once' });
    const user = userEvent.setup();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    await screen.findByText('Beat 1 ready. Choose an option or write the next action.');
    await user.type(screen.getByLabelText('Free text action'), 'Advance into the corridor.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(await screen.findByText('Rewriting...')).toBeInTheDocument();
    expect(await screen.findByText(/Blocking audit failures detected\./)).toBeInTheDocument();
    expect(await screen.findAllByText('Rewritten beat 2 for Investigation.')).toHaveLength(2);
  });

  it('shows a force-accept warning when retries are exhausted', async () => {
    const harness = createPlayAdapterHarness({ auditMode: 'fail-always' });
    const user = userEvent.setup();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    await screen.findByText('Beat 1 ready. Choose an option or write the next action.');
    await user.type(screen.getByLabelText('Free text action'), 'Advance into the corridor.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(await screen.findByText('Force accepted after retry limit')).toBeInTheDocument();
    await waitFor(() => {
      expect(harness.getGenerateCount()).toBe(4);
    });
  });

  it('submits player input and advances to the next beat', async () => {
    const harness = createPlayAdapterHarness();
    const user = userEvent.setup();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    await screen.findByText('Beat 1 ready. Choose an option or write the next action.');
    await user.type(screen.getByLabelText('Free text action'), 'Cut the local power feed.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(await screen.findAllByText('Draft beat 1 for Investigation.')).toHaveLength(2);
    expect(
      screen.getByText('Beat 2 ready. Choose an option or write the next action.'),
    ).toBeInTheDocument();
  });

  it('toggles the fixture reference drawer and shows runtime diagnostics', async () => {
    const harness = createPlayAdapterHarness();
    const user = userEvent.setup();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    await screen.findByText('Beat 1 ready. Choose an option or write the next action.');

    expect(screen.queryByText('Fixture Reference')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show Fixture Reference' }));
    expect(screen.getByText('Fixture Reference')).toBeInTheDocument();
    expect(screen.getByText(storyPackageFixture.worldBase.locationPatch)).toBeInTheDocument();
    expect(screen.getByText('88 tokens')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Free text action'), 'Inspect the relay cabinet.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(await screen.findByText('232 tokens')).toBeInTheDocument();
    expect(await screen.findByText('112 tokens')).toBeInTheDocument();
    expect(screen.getByText('Latest observed call: Audit')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hide Fixture Reference' }));
    expect(screen.queryByText('Fixture Reference')).not.toBeInTheDocument();
  });
});
