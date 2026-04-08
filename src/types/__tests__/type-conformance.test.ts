import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  AuditPacket,
  AuditQuestionSet,
  CollapseRequest,
  CollapseResponse,
  GossipelogInjectionResult,
  GossipelogUpdateResult,
  PhaseConsequenceRequest,
  PhaseConsequenceResponse,
  PhasePlan,
  PromptObject,
  StateSnapshot,
  StoryPackageManagementStorylineRowView,
  StoryPackageManagementWorkspaceView,
} from '@/types';

describe('Phase 00 contract types', () => {
  it('registers gossipelog agent metadata in the shared agent entrypoint', async () => {
    const { agentRegistry } = await import('@/agents/registry');
    const { gossipelogAgentDefinition } = await import('@/agents/gossipelog');

    expect(agentRegistry.gossipelog).toMatchObject({
      agentId: 'gossipelog',
      displayName: 'gossipelog agent',
      surfaceType: 'sidecar',
      responsibilitySummary: 'Tracks persisted relationship state after accepted beats.',
      skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
      packageConfigPath: 'agents/gossipelog/config.yaml',
      packageStatePath: 'agents/gossipelog/character-relationships.yaml',
    });
    expect(typeof agentRegistry.gossipelog.summarizeState).toBe('function');
    expect(gossipelogAgentDefinition).toBe(agentRegistry.gossipelog);
  });

  it('exports a structured runtime character schema and world-base schema', async () => {
    const types = await import('@/types');

    expect(
      types.CharacterProfileSchema.parse({
        characterId: 'chr_hero01',
        name: 'Hero One',
        identityRole: 'Lead character',
        lightNovelTrait: 'Calm and precise',
        gender: 'Female',
        personality: 'Reserved',
        age: '16',
        occupation: 'Student',
        characterSummary: 'Primary viewpoint character.',
        capabilityBoundary: 'Uses only physical methods.',
        behaviorBoundary: 'Does not panic under pressure.',
        oocRedLine: 'Never breaks character.',
        clothing: 'School uniform',
        propsWeapon: 'None',
      }),
    ).toMatchObject({ characterId: 'chr_hero01' });

    expect(
      types.WorldBaseSchema.parse({
        worldBaseSetting: 'World setting',
        worldRules: 'World rules',
        toneBaseline: 'Tone baseline',
        hero: {
          characterId: 'chr_hero01',
          name: 'Hero One',
          identityRole: 'Lead character',
          lightNovelTrait: 'Calm and precise',
          gender: 'Female',
          personality: 'Reserved',
          age: '16',
          occupation: 'Student',
          characterSummary: 'Primary viewpoint character.',
          capabilityBoundary: 'Uses only physical methods.',
          behaviorBoundary: 'Does not panic under pressure.',
          oocRedLine: 'Never breaks character.',
          clothing: 'School uniform',
          propsWeapon: 'None',
        },
        coreCast: [],
        antagonists: [],
        npcCharacters: 'NPC pool',
        locationPatch: 'Location notes',
      }),
    ).toHaveProperty('hero.characterId', 'chr_hero01');
  });

  it('accepts loc_ ids on persisted world-base locations', async () => {
    const types = await import('@/types');

    expect(() =>
      types.WorldBaseSchema.parse({
        worldBaseSetting: 'World setting',
        worldRules: 'World rules',
        toneBaseline: 'Tone baseline',
        hero: {
          characterId: 'chr_hero01',
          name: 'Hero One',
          identityRole: 'Lead character',
          lightNovelTrait: 'Calm and precise',
          gender: 'Female',
          personality: 'Reserved',
          age: '16',
          occupation: 'Student',
          characterSummary: 'Primary viewpoint character.',
          capabilityBoundary: 'Uses only physical methods.',
          behaviorBoundary: 'Does not panic under pressure.',
          oocRedLine: 'Never breaks character.',
          clothing: 'School uniform',
          propsWeapon: 'None',
        },
        coreCast: [],
        antagonists: [],
        npcCharacters: 'NPC pool',
        locationPatch: 'Location notes',
        locations: [
          {
            locationId: 'loc_a1b2c3',
            name: '',
            description: '',
            environmentAppearance: '',
            atmosphereDescription: '',
            humanContextDescription: '',
          },
        ],
      }),
    ).not.toThrow();
  });

  it('exports a separate prompt-only world-base schema', async () => {
    const types = await import('@/types');

    expect(
      types.PromptWorldBaseSchema.parse({
        mainCharacters: 'main-characters',
        npcCharacters: 'npc-characters',
        locationPatch: 'location-patch',
      }),
    ).toMatchObject({
      mainCharacters: 'main-characters',
      npcCharacters: 'npc-characters',
      locationPatch: 'location-patch',
    });
  });

  it('parses a versioned runtime-sessions file with one active session and explicit head pointers', async () => {
    const types = await import('@/types');

    expect(
      types.RuntimeSessionsFileSchema.parse({
        version: 1,
        activeSessionId: 'sess_01',
        sessionsById: {
          sess_01: {
            sessionId: 'sess_01',
            lifecycle: 'awaiting_start',
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
            headCheckpointId: null,
            activeCheckpointId: null,
            orderedCheckpointIds: [],
            checkpointsById: {},
            lastStableRelationshipLayer: {
              highlightedDeltasText: '',
              stableBackgroundText: '',
            },
          },
        },
      }),
    ).toBeDefined();
  });

  it('keeps scene cast available on the public scene spec contract', async () => {
    const storyPackage = await import('@/types/story-package');

    expect(storyPackage.SceneSpecSchema).toBeDefined();
    expect(() =>
      storyPackage.SceneSpecSchema.parse({
        sceneId: 'scene-id',
        sceneName: 'Scene Name',
        cast: ['chr_hero01', 'chr_core01'],
        mainAxis: 'main-axis',
        endLine: 'end-line',
      }),
    ).not.toThrow();
  });

  it('models PromptObject with an optional generationControl payload', () => {
    const promptObject: PromptObject = {
      worldBase: {
        mainCharacters: 'main-characters',
        npcCharacters: 'npc-characters',
        locationPatch: 'location-patch',
      },
      relationshipLayer: {
        highlightedDeltasText: 'chr_core01 -> chr_hero01: trust has risen this round.',
        stableBackgroundText: 'chr_core01 -> chr_hero01: long-term baseline is guarded trust.',
      },
      history: [
        { role: 'assistant', content: 'previous beat' },
        { role: 'user', content: 'player input' },
      ],
      narrative: {
        mainAxis: 'main-axis',
        endLine: 'end-line',
        phaseGoal: 'phase-goal',
        alpha: 'alpha-boundary',
        beta: 'beta-boundary',
      },
      directorNote: {
        volume: 'Low',
        router: 'router-name',
        verbLexicon: ['observe', 'move'],
        beatConstraints: 'beat constraints',
        optionConstraints: 'option constraints',
      },
      generationControl: {
        isRewrite: true,
        retryCount: 1,
        rewriteFeedback: 'Fix the failing constraint.',
        previousDraft: {
          beatText: 'previous draft',
          options: ['opt-1', 'opt-2', 'opt-3', 'opt-4'],
        },
      },
    };

    expect(promptObject.directorNote.volume).toBe('Low');
    expect(promptObject.generationControl?.previousDraft?.options).toHaveLength(4);
  });

  it('models gossipelog skill packet results with the dynamic relationship layer', () => {
    const updateResult: GossipelogUpdateResult = {
      involvedRoleIds: ['chr_core01', 'chr_hero01'],
      invocationNoOp: false,
      edgeUpdates: [
        {
          sourceRoleId: 'chr_core01',
          targetRoleId: 'chr_hero01',
          mode: 'noop',
        },
      ],
    };

    const injectionResult: GossipelogInjectionResult = {
      highlightedDeltasText: 'chr_core01 -> chr_hero01: trust has risen this round.',
      stableBackgroundText: 'chr_core01 -> chr_hero01: long-term baseline is guarded trust.',
    };

    expect(updateResult.edgeUpdates[0]?.mode).toBe('noop');
    expect(injectionResult.highlightedDeltasText).toContain('chr_core01');
  });

  it('models StateSnapshot with scene, round, generation, and evaluation state', () => {
    const stateSnapshot: StateSnapshot = {
      sceneState: {
        sceneId: 'scene-id',
        currentPhaseIndex: 1,
        currentBeatIndexInPhase: 1,
        mainAxis: 'main-axis',
        endLine: 'end-line',
        alpha: 'alpha',
        beta: 'beta',
        sceneProgress: 'scene-progress',
        phaseConsequences: ['fact-1'],
      },
      roundState: {
        phaseGoal: 'phase-goal',
        currentVolume: 'Med',
        currentRouter: 'router-name',
        verbLexicon: ['verb-1'],
        historyWindow: [{ role: 'assistant', content: 'history' }],
        directorConstraints: 'constraints',
      },
      generationState: {
        directorNoteSummary: 'summary',
        promptObject: {},
        currentBeatText: null,
        currentOptions: [],
      },
      evaluationState: {
        auditAnswers: [true],
        blockingFailures: [],
        retryCount: 0,
        rewriteFeedback: null,
      },
    };

    expect(stateSnapshot.roundState.currentVolume).toBe('Med');
    expect(stateSnapshot.evaluationState.retryCount).toBe(0);
  });

  it('models PhasePlan with a fixed beat count', () => {
    const phasePlan: PhasePlan = {
      phaseId: 'phase-01',
      phaseIndex: 1,
      phaseGoal: 'phase-goal',
      gradientType: 'Rising',
      beatCount: 4,
      routerHint: 'router-hint',
      notes: 'notes',
    };

    expect(phasePlan.gradientType).toBe('Rising');
    expect(phasePlan.beatCount).toBe(4);
  });

  it('models AuditPacket with an optional audit question selection', () => {
    const auditPacket: AuditPacket = {
      context: {
        precedingBeats: [{ role: 'assistant', content: 'history' }],
      },
      generatedContent: {
        beatText: 'beat-text',
        options: ['opt-1', 'opt-2', 'opt-3', 'opt-4'],
      },
      auditQuestions: [],
    };

    expect(auditPacket.generatedContent.options).toHaveLength(4);
    expect(auditPacket.auditQuestions).toHaveLength(0);
  });

  it('models an AuditQuestionSet with an empty default selection', () => {
    const auditQuestionSet: AuditQuestionSet = {
      sceneId: 'scene-id',
      globalQuestions: [
        {
          id: 'AQ-G-001',
          question: 'Is the output valid?',
          expected: true,
          blocking: true,
        },
      ],
      controlQuestions: [],
      selectionPolicy: {
        default: [],
      },
    };

    expect(auditQuestionSet.selectionPolicy.default).toHaveLength(0);
  });

  it('models collapse and settlement packets', () => {
    const collapseRequest: CollapseRequest = {
      context: {
        mainAxis: 'main-axis',
        endLine: 'end-line',
        currentAlpha: 'alpha',
        currentBeta: 'beta',
        sceneProgress: 'progress',
        completedPhaseGoal: 'goal',
      },
      phaseConsequences: ['fact-1'],
    };

    const collapseResponse: CollapseResponse = {
      alpha: 'next-alpha',
      beta: 'next-beta',
      inferenceTrace: 'trace',
    };

    const consequenceRequest: PhaseConsequenceRequest = {
      context: {
        mainAxis: 'main-axis',
        endLine: 'end-line',
        phaseGoal: 'phase-goal',
        sceneProgress: 'progress',
        currentPhaseIndex: 1,
      },
      phaseTranscript: [
        { role: 'assistant', content: 'assistant turn' },
        { role: 'user', content: 'user turn' },
      ],
    };

    const consequenceResponse: PhaseConsequenceResponse = {
      phaseConsequences: ['fact-1'],
      settlementTrace: 'trace',
    };

    expect(collapseRequest.phaseConsequences).toHaveLength(1);
    expect(collapseResponse.inferenceTrace).toBe('trace');
    expect(consequenceRequest.phaseTranscript).toHaveLength(2);
    expect(consequenceResponse.phaseConsequences).toHaveLength(1);
  });

  it('models AuditQuestionSet with phase overrides', () => {
    const auditQuestionSet: AuditQuestionSet = {
      sceneId: 'scene-id',
      globalQuestions: [
        {
          id: 'AQ-G-001',
          question: 'Is the output valid?',
          expected: true,
          blocking: true,
        },
      ],
      controlQuestions: [
        {
          id: 'AQ-C-001',
          question: 'Does the beat respect the current volume?',
          expected: true,
          blocking: false,
        },
      ],
      phaseSpecificQuestions: {
        'phase-01': [
          {
            id: 'AQ-P1-001',
            question: 'Phase-specific question',
            expected: true,
            blocking: false,
          },
        ],
      },
      selectionPolicy: {
        default: ['AQ-G-001', 'AQ-C-001'],
        phaseOverrides: {
          'phase-01': {
            append: ['AQ-P1-001'],
          },
        },
      },
    };

    expect(auditQuestionSet.selectionPolicy.default).toContain('AQ-G-001');
    expect(auditQuestionSet.phaseSpecificQuestions?.['phase-01']).toHaveLength(1);
  });

  it('requires a non-null activeStorylineId once a storyline repository exists', async () => {
    const types = await import('@/types');

    expect(() =>
      types.StorylineRepositoryFileSchema.parse({
        version: 1,
        activeStorylineId: null,
        storylinesById: {},
        variantsById: {},
      }),
    ).toThrow(/activeStorylineId/i);
  });

  it('pins workspaceRoot to variants/<variantId>', async () => {
    const types = await import('@/types');

    expect(() =>
      types.StorylineVariantSchema.parse({
        variantId: 'variant_main',
        workspaceRoot: 'variants/other',
        createdFromStorylineId: null,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      }),
    ).toThrow(/workspaceRoot/i);
  });

  it('rejects unsafe storyline and variant ids in storyline repository contracts', async () => {
    const types = await import('@/types');

    expect(() =>
      types.StorylineRecordSchema.parse({
        storylineId: '../escape',
        name: 'Main Line',
        status: 'active',
        sourceCheckpointId: null,
        headCheckpointId: null,
        variantId: 'variant_main',
        activeSessionId: 'sess_main',
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      }),
    ).toThrow(/storylineId/i);

    expect(() =>
      types.StorylineVariantSchema.parse({
        variantId: 'variant/main',
        workspaceRoot: 'variants/variant/main',
        createdFromStorylineId: null,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      }),
    ).toThrow(/variantId/i);
  });

  it('defines a bounded story package management workspace view without raw repository maps', async () => {
    const types = await import('@/types');

    expect(
      types.StoryPackageManagementWorkspaceViewSchema.parse({
        packages: [],
        packageName: 'sample-scene',
        activeStorylineId: 'storyline_main',
        storylines: [],
      }),
    ).toMatchObject({
      packageName: 'sample-scene',
      activeStorylineId: 'storyline_main',
    });

    expectTypeOf<StoryPackageManagementWorkspaceView>().toMatchTypeOf<{
      packages: readonly { readonly packageName: string }[];
      packageName: string;
      activeStorylineId: string;
      storylines: readonly { readonly storylineId: string }[];
    }>();
  });

  it('adds delete availability to the bounded storyline row view', () => {
    expectTypeOf<StoryPackageManagementStorylineRowView>().toMatchTypeOf<{
      storylineId: string;
      displayName: string;
      canDelete: boolean;
      deleteDisabledReason: string | null;
    }>();
  });

  it('accepts delete_storyline and package-creation payload contracts', async () => {
    const types = await import('@/types');

    expect(() =>
      types.StorylineActionSchema.parse({
        kind: 'delete_storyline',
        storylineId: 'storyline_main',
      }),
    ).not.toThrow();

    expect(() =>
      types.StoryPackageCreationRequestSchema.parse({
        mode: 'blank',
        displayName: '新故事包',
      }),
    ).not.toThrow();

    expect(() =>
      types.StoryPackageCreationRequestSchema.parse({
        mode: 'text_import',
        sourceText: '一个可导入的故事包文本。',
      }),
    ).not.toThrow();
  });

  it('freezes text import and weaver contract parsing', async () => {
    const types = await import('@/types');

    expect(() =>
      types.StoryPackageCreationRequestSchema.parse({
        mode: 'text_import',
        sourceText: '  一段可导入的文本  ',
      }),
    ).not.toThrow();

    expect(() =>
      types.StoryPackageCreationRequestSchema.parse({
        mode: 'text_import',
        sourceText: 'x'.repeat(12_001),
      }),
    ).toThrow();

    expect(() =>
      types.WeaverImportPayloadSchema.parse({
        sourceSummary: 'source summary',
        importSummary: 'import summary',
        openingHook: '   ',
        worldBase: { worldBaseSetting: 'base' },
        coreCast: [],
        antagonists: [],
        npcCharacters: [],
        locations: [],
        warnings: [],
        unresolvedGaps: [],
      }),
    ).toThrow();

    expect(() =>
      types.WeaverImportSummarySchema.parse({
        schemaVersion: 1,
        sourceKind: 'text_import',
        lastRunAt: '2026-04-08T00:00:00.000Z',
        suggestedPackageName: '   ',
        sourceSummary: 'source summary',
        importSummary: 'import summary',
        warnings: [],
        unresolvedGaps: [],
        warningCount: 0,
        unresolvedGapCount: 0,
        bootstrapStatus: 'pending',
      }),
    ).toThrow();

    expect(types.AgentOperationalHintSchema.options).toEqual([
      'ready',
      'warning',
      'pending_bootstrap',
    ]);

    expect(types.WeaverBootstrapStatusSchema.options).toEqual([
      'pending',
      'succeeded',
      'failed',
      'fallback_pending',
    ]);

    expect(
      types.WeaverImportPayloadSchema.parse({
        suggestedPackageName: 'weaver-pack',
        sourceSummary: 'source summary',
        importSummary: 'import summary',
        openingHook: 'opening hook',
        worldBase: { worldBaseSetting: 'base' },
        hero: { characterId: 'chr_hero01' },
        coreCast: [{ characterId: 'chr_core01' }],
        antagonists: [],
        npcCharacters: [],
        locations: [],
        warnings: ['warn-1'],
        unresolvedGaps: ['gap-1'],
      }),
    ).toMatchObject({
      suggestedPackageName: 'weaver-pack',
      warnings: ['warn-1'],
      unresolvedGaps: ['gap-1'],
    });

    expect(
      types.WeaverImportSummarySchema.parse({
        schemaVersion: 1,
        sourceKind: 'text_import',
        lastRunAt: '2026-04-08T00:00:00.000Z',
        suggestedPackageName: 'weaver-pack',
        sourceSummary: 'source summary',
        importSummary: 'import summary',
        warnings: ['warn-1'],
        unresolvedGaps: ['gap-1'],
        warningCount: 1,
        unresolvedGapCount: 1,
        bootstrapStatus: 'pending',
      }),
    ).toMatchObject({
      schemaVersion: 1,
      sourceKind: 'text_import',
      bootstrapStatus: 'pending',
    });

    expect(
      types.StoryPackageCreationResponseSchema.parse({
        packageName: 'sample-package',
        activeStorylineId: 'storyline_main',
        createdAt: '2026-04-08T00:00:00.000Z',
        warnings: ['warn-1'],
      }),
    ).toMatchObject({
      packageName: 'sample-package',
      warnings: ['warn-1'],
    });

    expect(() =>
      types.StoryPackageCreationResponseSchema.parse({
        packageName: '   ',
        activeStorylineId: 'storyline_main',
        createdAt: 'not-a-date',
        warnings: ['warn-1'],
      }),
    ).toThrow();
  });
});
