import { describe, expect, it } from 'vitest';

import { createHappyPathScenario } from '../scenarios/happy-path';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('happy path scenario', () => {
  it('completes author save -> runtime beat -> agent observation with structured traces', async () => {
    const report = await runSimulationScenario(createHappyPathScenario());

    expect(report.assertions.every((item) => item.pass)).toBe(true);
    expect(report.authoringTrace?.[0]).toMatchObject({
      resultKind: 'save_applied',
    });
    expect(report.runtimeTrace?.[0]).toMatchObject({
      accepted: true,
    });
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'auditor-skipped-when-no-questions-selected',
        pass: true,
      }),
    );
    expect(report.adapterTrace?.map((item) => item.operation)).not.toContain('audit');
    expect(report.agentTrace?.[0]).toMatchObject({
      agentId: 'gossipelog',
      stage: 'cycle',
      outcome: 'no-op',
      stableBackgroundText: 'stable background',
    });
  });
});
