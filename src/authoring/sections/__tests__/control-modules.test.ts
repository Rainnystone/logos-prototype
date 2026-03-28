import { describe, expect, it } from 'vitest';

import {
  createControlModulesDraft,
  renderControlModulesSave,
  validateControlModulesDraft,
  type ControlModulesDraft,
} from '@/authoring/sections/control-modules';
import type { StoryPackage } from '@/types';

const currentStoryPackage = {
  sceneSpec: {
    sceneId: 'scene-signal-room',
    sceneName: 'Signal Room',
    mainAxis: 'Track the hostile signal through the sealed wing.',
    endLine: 'The signal collapses and the public route returns to calm.',
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
      notes: 'Keep the public route unaware.',
    },
  ],
  routerProfiles: [
    {
      routerName: 'Investigation',
      routerSemanticCore: 'Observe, test, and close distance without exposure.',
      verbLexicon: ['observe', 'probe'],
    },
    {
      routerName: 'Counterplay',
      routerSemanticCore: 'Break patterns and seize local control.',
      verbLexicon: ['break', 'disrupt'],
    },
  ],
  auditQuestionSet: {
    sceneId: 'scene-signal-room',
    globalQuestions: [
      {
        id: 'AQ-G-001',
        question: 'Does the beat remain inside the active narrative boundaries?',
        expected: true,
        blocking: true,
      },
    ],
    controlQuestions: [],
    phaseSpecificQuestions: {
      'phase-01-signal-trace': [
        {
          id: 'AQ-P1-001',
          question: 'Does phase one stay in investigation instead of direct combat?',
          expected: true,
          blocking: true,
        },
      ],
    },
    selectionPolicy: {
      default: ['AQ-G-001'],
      phaseOverrides: {
        'phase-01-signal-trace': {
          append: ['AQ-P1-001'],
        },
      },
    },
  },
  controlModules: {
    sceneId: 'scene-signal-room',
    lightConeCustomization: {
      boundaryGuidance: 'Keep the current state as the apex and the end line as the far convergence target.',
      convergenceGuidance: 'The cone should narrow as the route closes in on the signal source.',
      phaseSettlementGuidance: 'Re-evaluate boundaries only after phase settlement completes.',
    },
    directorNoteAdditions: {
      beatConstraintsAdditions: 'Keep the pressure physical and local.',
      optionConstraintsAdditions: 'Options must preserve clean tactical contrast.',
    },
    beatVolumeDefinitions: {
      Low: {
        beatConstraints: 'Use summary framing and accelerated time flow.',
        optionFormatting: 'Offer broad-strokes options with compressed time.',
      },
      Med: {
        beatConstraints: 'Keep standard pacing and clear causality.',
        optionFormatting: 'Offer clear real-time actions.',
      },
      High: {
        beatConstraints: 'Use slow-motion focus with dense sensory detail.',
        optionFormatting: 'Offer micro-sensory options with heightened immediacy.',
      },
    },
  },
} as const satisfies Pick<
  StoryPackage,
  'sceneSpec' | 'phasePlans' | 'routerProfiles' | 'auditQuestionSet' | 'controlModules'
>;

describe('control-modules', () => {
  it('creates a draft that includes the shared control source plus router and audit sets', () => {
    const draft = createControlModulesDraft(currentStoryPackage);

    expect(draft.controlModules.lightConeCustomization.boundaryGuidance).toContain('apex');
    expect(draft.routerProfiles).toHaveLength(2);
    expect(draft.auditQuestionSet.globalQuestions[0]?.id).toBe('AQ-G-001');
  });

  it('keeps audit question ids stable when editing existing questions', () => {
    const draft = createControlModulesDraft(currentStoryPackage);
    const nextDraft: ControlModulesDraft = {
      ...draft,
      auditQuestionSet: {
        ...draft.auditQuestionSet,
        globalQuestions: [
          {
            ...draft.auditQuestionSet.globalQuestions[0]!,
            question: 'Does the beat still remain inside the active narrative boundaries?',
          },
        ],
      },
    };

    const result = renderControlModulesSave(currentStoryPackage, nextDraft, 'auditor-question-set');

    expect(result.auditQuestionSet?.globalQuestions[0]?.id).toBe('AQ-G-001');
  });

  it('blocks deleting a router profile that is still referenced by scene-phase data', () => {
    const draft = createControlModulesDraft(currentStoryPackage);
    const nextDraft: ControlModulesDraft = {
      ...draft,
      routerProfiles: draft.routerProfiles.filter((profile) => profile.routerName !== 'Investigation'),
    };

    expect(validateControlModulesDraft(currentStoryPackage, nextDraft, 'router-profile-set')).toEqual([
      'Router 配置 "Investigation" 仍被一个或多个 Phase 的 Router 提示引用。',
    ]);
  });

  it('renders the shared control source when saving light-cone changes', () => {
    const draft = createControlModulesDraft(currentStoryPackage);
    const nextDraft: ControlModulesDraft = {
      ...draft,
      controlModules: {
        ...draft.controlModules,
        lightConeCustomization: {
          ...draft.controlModules.lightConeCustomization,
          convergenceGuidance: 'Narrow the cone more aggressively after each settled phase.',
        },
      },
    };

    const result = renderControlModulesSave(currentStoryPackage, nextDraft, 'light-cone');

    expect(result.controlModules?.lightConeCustomization.convergenceGuidance).toBe(
      'Narrow the cone more aggressively after each settled phase.',
    );
    expect(result.routerProfiles).toBeUndefined();
    expect(result.auditQuestionSet).toBeUndefined();
  });
});
