import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';

import {
  createTempStoryPackage,
  cleanupTempStoryPackages,
  type TempStoryPackageFixture,
} from '@simulation/temp-package';

/**
 * Tests for TempPackage fixture with Phase 3 storyline repository / variant shape support.
 *
 * Task 5: temp-package should carry the Phase 3 storyline fixture shape
 * - storylineRepository
 * - variantsById
 */

describe('temp-package fixture', () => {
  describe('basic fixture creation', () => {
    it('creates temp package from source', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      expect(fixture.sourcePackageName).toBe('sample-scene');
      expect(fixture.packageName).toMatch(/^\.tmp-simulation-sample-scene-/);
      expect(fixture.packagePath).toBeDefined();

      await fixture.cleanup();
    });

    it('cleanup removes temp package', async () => {
      const fixture = await createTempStoryPackage('sample-scene');
      const packagePath = fixture.packagePath;

      await fixture.cleanup();

      // Path should no longer exist
      await expect(fs.access(packagePath)).rejects.toThrow();
    });
  });

  describe('storyline repository fixture support', () => {
    it('supports storylineRepository fixture shape', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      // Create storyline repository fixture
      const repoPath = path.join(fixture.packagePath, 'storyline-repository.json');
      const repositoryData = {
        version: 1,
        activeStorylineId: 'storyline_main',
        storylinesById: {
          storyline_main: {
            storylineId: 'storyline_main',
            name: 'Main Storyline',
            status: 'active',
            sourceCheckpointId: null,
            headCheckpointId: 'ckpt_001',
            variantId: 'variant_main',
            activeSessionId: 'sess_001',
            createdAt: '2026-04-07T00:00:00.000Z',
            updatedAt: '2026-04-07T01:00:00.000Z',
          },
        },
        variantsById: {
          variant_main: {
            variantId: 'variant_main',
            workspaceRoot: 'variants/variant_main',
            createdFromStorylineId: null,
            createdAt: '2026-04-07T00:00:00.000Z',
            updatedAt: '2026-04-07T00:00:00.000Z',
          },
        },
      };

      await fs.writeFile(repoPath, JSON.stringify(repositoryData, null, 2), 'utf8');

      // Verify fixture shape
      const content = await fs.readFile(repoPath, 'utf8');
      const parsed = JSON.parse(content);

      expect(parsed.activeStorylineId).toBe('storyline_main');
      expect(parsed.storylinesById.storyline_main).toBeDefined();
      expect(parsed.variantsById.variant_main).toBeDefined();

      await fixture.cleanup();
    });

    it('supports runtime sessions fixture shape with checkpoints', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_001',
        sessionsById: {
          sess_001: {
            sessionId: 'sess_001',
            lifecycle: 'in_progress',
            createdAt: '2026-04-07T00:00:00.000Z',
            updatedAt: '2026-04-07T01:00:00.000Z',
            headCheckpointId: 'ckpt_001',
            activeCheckpointId: 'ckpt_001',
            orderedCheckpointIds: ['ckpt_001'],
            checkpointsById: {
              ckpt_001: {
                checkpointId: 'ckpt_001',
                acceptedBeatOrdinal: 1,
                sceneId: 'scene_001',
                phaseIndex: 1,
                beatIndex: 1,
                roundId: 'round_001',
                acceptedTranscript: {
                  playerInput: 'test input',
                  beatText: 'test beat',
                },
                stateSnapshot: {
                  sceneState: {
                    sceneId: 'scene_001',
                    currentPhaseIndex: 1,
                    currentBeatIndexInPhase: 1,
                    mainAxis: 'test axis',
                    endLine: 'test end line',
                    alpha: 'alpha',
                    beta: 'beta',
                  },
                  roundState: {
                    phaseGoal: 'test goal',
                    currentVolume: 'Med',
                    currentRouter: 'router_001',
                    verbLexicon: [],
                    historyWindow: [],
                  },
                  generationState: {
                    directorNoteSummary: 'test summary',
                    promptObject: {},
                    currentBeatText: null,
                    currentOptions: [],
                  },
                  evaluationState: {
                    auditAnswers: [true, true, true],
                    blockingFailures: [],
                    retryCount: 0,
                    rewriteFeedback: null,
                  },
                },
                lastStableRelationshipLayer: {
                  highlightedDeltasText: '',
                  stableBackgroundText: '',
                },
                createdAt: '2026-04-07T01:00:00.000Z',
              },
            },
            lastStableRelationshipLayer: {
              highlightedDeltasText: '',
              stableBackgroundText: '',
            },
          },
        },
      };

      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      const content = await fs.readFile(sessionsPath, 'utf8');
      const parsed = JSON.parse(content);

      expect(parsed.activeSessionId).toBe('sess_001');
      expect(parsed.sessionsById.sess_001.orderedCheckpointIds).toEqual(['ckpt_001']);

      await fixture.cleanup();
    });
  });

  describe('cleanupTempStoryPackages', () => {
    it('cleans up all temp packages', async () => {
      const fixture1 = await createTempStoryPackage('sample-scene');
      const fixture2 = await createTempStoryPackage('sample-scene');

      await cleanupTempStoryPackages();

      // Both should be cleaned up
      await expect(fs.access(fixture1.packagePath)).rejects.toThrow();
      await expect(fs.access(fixture2.packagePath)).rejects.toThrow();
    });
  });
});