import { describe, expect, it } from 'vitest';

import {
  createScenePhaseAuthoringDraft,
  renderScenePhaseAuthoring,
  validateScenePhaseAuthoringDraft,
  type ScenePhaseAuthoringDraft,
} from '@/authoring/sections/scene-phase-authoring';
import type { StoryPackage } from '@/types';

const currentStoryPackage = {
  sceneSpec: {
    sceneId: 'scene-signal-room',
    sceneName: 'Signal Room',
    openingSituation: 'A sealed corridor starts to overheat behind the public route.',
    startPoint: 'A relay sparks behind the public route and pulls the operator off the daily track.',
    mainAxis: 'Track the hostile signal without exposing the operator.',
    endLine: 'The source is isolated and the public route returns to calm.',
    openingHook: 'A relay sparks and forces the operator to slip away from the crowd.',
    samplePurpose: 'Validate the scene-phase authoring loop.',
  },
  phasePlans: [
    {
      phaseId: 'phase-01-signal-trace',
      phaseIndex: 1,
      phaseName: 'Signal Trace',
      phaseGoal: 'Identify the first trace of the signal.',
      phaseEndPoint: 'The source direction is narrowed to one sealed wing.',
      gradientType: 'Rising',
      beatCount: 4,
      routerHint: 'Investigation',
      notes: 'Keep the crowd unaware.',
    },
    {
      phaseId: 'phase-02-counterplay',
      phaseIndex: 2,
      phaseName: 'Counterplay Lock',
      phaseGoal: 'Contain the hostile response.',
      phaseEndPoint: 'The operator enters the sealed wing with a working plan.',
      gradientType: 'Pulse',
      beatCount: 4,
      routerHint: 'Counterplay',
      notes: 'Escalate with controlled pressure.',
    },
  ],
  routerProfiles: [
    {
      routerName: 'Investigation',
      routerSemanticCore: 'Observe and close distance.',
      verbLexicon: ['observe'],
    },
    {
      routerName: 'Counterplay',
      routerSemanticCore: 'Break patterns and seize local control.',
      verbLexicon: ['break'],
    },
  ],
  worldBase: {
    worldBaseSetting: 'World base',
    worldRules: 'Rules',
    toneBaseline: 'Tone',
    hero: {
      characterId: 'chr_hero01',
      name: 'Hero',
      identityRole: 'Lead',
      lightNovelTrait: 'Trait',
      gender: 'Female',
      personality: 'Calm',
      age: '17',
      occupation: 'Student',
      characterSummary: 'Hero summary',
      capabilityBoundary: 'Boundary',
      behaviorBoundary: 'Behavior',
      oocRedLine: 'Red line',
      clothing: 'Uniform',
      propsWeapon: 'None',
    },
    coreCast: [
      {
        characterId: 'chr_core01',
        name: 'Core One',
        identityRole: 'Anchor',
        lightNovelTrait: 'Trait',
        gender: 'Female',
        personality: 'Kind',
        age: '16',
        occupation: 'Student',
        characterSummary: 'Core summary',
        capabilityBoundary: 'Boundary',
        behaviorBoundary: 'Behavior',
        oocRedLine: 'Red line',
        clothing: 'Uniform',
        propsWeapon: 'None',
      },
      {
        characterId: 'chr_core02',
        name: 'Core Two',
        identityRole: 'Anchor',
        lightNovelTrait: 'Trait',
        gender: 'Male',
        personality: 'Calm',
        age: '18',
        occupation: 'Student',
        characterSummary: 'Core summary',
        capabilityBoundary: 'Boundary',
        behaviorBoundary: 'Behavior',
        oocRedLine: 'Red line',
        clothing: 'Uniform',
        propsWeapon: 'None',
      },
    ],
    antagonists: [
      {
        characterId: 'chr_ant01',
        name: 'Antagonist One',
        identityRole: 'Threat',
        lightNovelTrait: 'Trait',
        gender: 'Male',
        personality: 'Chaotic',
        age: '19',
        occupation: 'Streamer',
        characterSummary: 'Antagonist summary',
        capabilityBoundary: 'Boundary',
        behaviorBoundary: 'Behavior',
        oocRedLine: 'Red line',
        clothing: 'Coat',
        propsWeapon: 'Device',
        fatalWeakness: 'Weakness',
      },
    ],
    npcCharacters: 'NPC',
    locationPatch: 'Location',
  },
} as const satisfies Pick<StoryPackage, 'sceneSpec' | 'phasePlans' | 'routerProfiles' | 'worldBase'>;

const currentStoryPackageWithCast = {
  ...currentStoryPackage,
  sceneSpec: {
    ...currentStoryPackage.sceneSpec,
    cast: ['chr_core01', 'chr_ant01'],
  },
} as const satisfies Pick<StoryPackage, 'sceneSpec' | 'phasePlans' | 'routerProfiles' | 'worldBase'>;

describe('scene-phase-authoring', () => {
  it('creates a draft that keeps scene fields and phase display names together', () => {
    const draft = createScenePhaseAuthoringDraft(currentStoryPackage);

    expect(draft.sceneSpec.sceneName).toBe('Signal Room');
    expect(draft.sceneSpec.openingSituation).toBe(
      'A sealed corridor starts to overheat behind the public route.',
    );
    expect((draft.sceneSpec as unknown as Record<string, string>).startPoint).toBe(
      'A relay sparks behind the public route and pulls the operator off the daily track.',
    );
    expect(draft.sceneSpec.castMode).toBe('unset');
    expect(draft.sceneSpec).not.toHaveProperty('samplePurpose');
    expect(draft.phasePlans[0]?.phaseName).toBe('Signal Trace');
    expect(draft.phasePlans[1]?.phaseName).toBe('Counterplay Lock');
  });

  it('creates an explicit cast draft when the source scene already has cast ids', () => {
    const draft = createScenePhaseAuthoringDraft(currentStoryPackageWithCast);

    expect(draft.sceneSpec.castMode).toBe('explicit');
    expect(draft.sceneSpec.cast).toEqual(['chr_core01', 'chr_ant01']);
  });

  it('keeps phaseId stable and recalculates phaseIndex from order', () => {
    const draft: ScenePhaseAuthoringDraft = {
      sceneSpec: createScenePhaseAuthoringDraft(currentStoryPackage).sceneSpec,
      phasePlans: [
        createScenePhaseAuthoringDraft(currentStoryPackage).phasePlans[1]!,
        createScenePhaseAuthoringDraft(currentStoryPackage).phasePlans[0]!,
      ],
    };

    const output = renderScenePhaseAuthoring(currentStoryPackage, draft);

    expect(output.phasePlans[0]?.phaseId).toBe('phase-02-counterplay');
    expect(output.phasePlans[0]?.phaseIndex).toBe(1);
    expect(output.phasePlans[1]?.phaseId).toBe('phase-01-signal-trace');
    expect(output.phasePlans[1]?.phaseIndex).toBe(2);
  });

  it('creates a stable phaseId for a new phase and keeps beatCount fixed at 4', () => {
    const baseDraft = createScenePhaseAuthoringDraft(currentStoryPackage);
    const draft: ScenePhaseAuthoringDraft = {
      ...baseDraft,
      phasePlans: [
        ...baseDraft.phasePlans,
        {
          phaseName: 'Aftermath Descent',
          phaseGoal: 'Let the public route settle back into normal rhythm.',
          phaseEndPoint: 'The route looks calm again.',
          gradientType: 'Falling',
          routerHint: 'Investigation',
          notes: 'Do not reveal the full scale of the incident.',
        },
      ],
    };

    const output = renderScenePhaseAuthoring(currentStoryPackage, draft);
    const createdPhase = output.phasePlans[2]!;

    expect(createdPhase.phaseId).toBe('phase-03-aftermath-descent');
    expect(createdPhase.phaseIndex).toBe(3);
    expect(createdPhase.beatCount).toBe(4);
  });

  it('blocks invalid router selections instead of silently remapping them', () => {
    const draft = createScenePhaseAuthoringDraft(currentStoryPackage);
    draft.phasePlans[0] = {
      ...draft.phasePlans[0]!,
      routerHint: 'Ghost Route',
    };

    expect(validateScenePhaseAuthoringDraft(draft, ['Investigation', 'Counterplay'])).toEqual([
      'Phase "Signal Trace" 使用了不可用的 Router 选择 "Ghost Route"。',
    ]);
  });

  it('removes cleared optional scene fields instead of preserving stale source text', () => {
    const draft = createScenePhaseAuthoringDraft(currentStoryPackage);
    draft.sceneSpec.openingSituation = '';
    draft.sceneSpec.openingHook = '';

    const output = renderScenePhaseAuthoring(currentStoryPackage, draft);

    expect(output.sceneSpec).not.toHaveProperty('openingSituation');
    expect(output.sceneSpec).not.toHaveProperty('openingHook');
    expect(output.sceneSpec.samplePurpose).toBe('Validate the scene-phase authoring loop.');
  });

  it('derives mainAxis from startPoint, ordered phase goals, and endLine', () => {
    const draft = {
      sceneSpec: {
        sceneName: 'Signal Room',
        openingSituation: 'A sealed corridor starts to overheat behind the public route.',
        startPoint: 'The operator notices the first hostile surge inside the corridor.',
        endLine: 'The source is isolated and the public route returns to calm.',
        openingHook: 'A relay sparks and forces the operator to slip away from the crowd.',
        castMode: 'unset',
      },
      phasePlans: createScenePhaseAuthoringDraft(currentStoryPackage).phasePlans,
    } as unknown as ScenePhaseAuthoringDraft;

    const output = renderScenePhaseAuthoring(currentStoryPackage, draft);

    expect(output.sceneSpec.mainAxis).toBe(
      [
        'The operator notices the first hostile surge inside the corridor.',
        'Identify the first trace of the signal.',
        'Contain the hostile response.',
        'The source is isolated and the public route returns to calm.',
      ].join(' -> '),
    );
  });

  it('preserves an absent cast when saving an untouched legacy draft', () => {
    const draft = createScenePhaseAuthoringDraft(currentStoryPackage);

    const output = renderScenePhaseAuthoring(currentStoryPackage, draft);

    expect(output.sceneSpec).not.toHaveProperty('cast');
    expect(output.sceneSpec.samplePurpose).toBe('Validate the scene-phase authoring loop.');
  });

  it('writes an explicit empty cast when no valid cast ids remain', () => {
    const draft = createScenePhaseAuthoringDraft(currentStoryPackage);
    draft.sceneSpec.castMode = 'explicit';
    draft.sceneSpec.cast = [];

    const output = renderScenePhaseAuthoring(currentStoryPackage, draft);

    expect(output.sceneSpec.cast).toEqual([]);
  });

  it('normalizes cast ids to the shared world-base order and drops stale ids', () => {
    const draft = createScenePhaseAuthoringDraft(currentStoryPackageWithCast);
    draft.sceneSpec.castMode = 'explicit';
    draft.sceneSpec.cast = ['chr_ant01', 'chr_hero01', 'chr_missing', 'chr_core02', 'chr_core01'];

    const output = renderScenePhaseAuthoring(currentStoryPackage, draft);

    expect(output.sceneSpec.cast).toEqual(['chr_core01', 'chr_core02', 'chr_ant01']);
  });

  it('requires a scene start point before saving the section', () => {
    const draft = {
      sceneSpec: {
        ...createScenePhaseAuthoringDraft(currentStoryPackage).sceneSpec,
        startPoint: '   ',
      },
      phasePlans: createScenePhaseAuthoringDraft(currentStoryPackage).phasePlans,
    } as unknown as ScenePhaseAuthoringDraft;

    expect(validateScenePhaseAuthoringDraft(draft, ['Investigation', 'Counterplay'])).toContain(
      '起点是必填项。',
    );
  });
});
