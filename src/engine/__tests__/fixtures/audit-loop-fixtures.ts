import { deepFreeze } from '@/lib/deep-freeze';
import {
  validateAuditPacket,
  validateCollapseResponse,
  validatePhaseConsequenceRequest,
  validatePhaseConsequenceResponse,
  validatePromptObject,
} from '@/engine/schema-validator';
import type {
  AuditResult,
  CollapseInput,
  GenerateResult,
  LLMAdapter,
  RouteRequest,
} from '@/engine/types/adapter-interface';
import type {
  AuditPacket,
  AuditQuestionSet,
  CollapseResponse,
  PhaseConsequenceRequest,
  PhaseConsequenceResponse,
  PromptObject,
  StoryPackage,
} from '@/types';

export const auditQuestionSetFixture: AuditQuestionSet = deepFreeze({
  sceneId: 'scene-fixture',
  globalQuestions: [
    {
      id: 'AQ-G-001',
      question: 'Does the generated beat remain inside the required boundary?',
      expected: true,
      blocking: true,
      rationale: 'Boundary integrity is mandatory.',
    },
  ],
  controlQuestions: [
    {
      id: 'AQ-C-001',
      question: 'Do the four options remain clearly differentiated?',
      expected: true,
      blocking: false,
      rationale: 'Option quality matters but is not always blocking.',
    },
  ],
  phaseSpecificQuestions: {
    'phase-02': [
      {
        id: 'AQ-P2-001',
        question: 'Does phase two preserve the pressure shift?',
        expected: true,
        blocking: true,
        rationale: 'Phase two has an additional control requirement.',
      },
    ],
  },
  selectionPolicy: {
    default: ['AQ-G-001', 'AQ-C-001'],
    phaseOverrides: {
      'phase-02': {
        append: ['AQ-P2-001'],
      },
    },
  },
});

export const storyPackageFixture: StoryPackage = deepFreeze({
  sceneSpec: {
    sceneId: 'scene-fixture',
    sceneName: 'Fixture Scene',
    mainAxis: 'main-axis',
    endLine: 'end-line',
    samplePurpose: 'test-fixture',
  },
  phasePlans: [
    {
      phaseId: 'phase-01',
      phaseIndex: 1,
      phaseGoal: 'phase-goal-1',
      gradientType: 'Rising',
      beatCount: 4,
      routerHint: 'investigation',
      notes: 'phase-one-note',
    },
    {
      phaseId: 'phase-02',
      phaseIndex: 2,
      phaseGoal: 'phase-goal-2',
      gradientType: 'Falling',
      beatCount: 4,
      routerHint: 'action',
      notes: 'phase-two-note',
    },
  ],
  routerProfiles: [
    {
      routerName: 'investigation',
      routerSemanticCore: 'gather evidence',
      verbLexicon: ['probe', 'observe', 'bait', 'withdraw'],
    },
    {
      routerName: 'action',
      routerSemanticCore: 'direct pressure',
      verbLexicon: ['strike', 'guard', 'advance', 'evade'],
    },
  ],
  auditQuestionSet: auditQuestionSetFixture,
  controlModules: {
    sceneId: 'scene-fixture',
    source: 'fixture-control-source',
    lightConeCustomization: {
      boundaryGuidance: 'treat the current player state as the light-cone apex',
      convergenceGuidance: 'narrow the cone after each settled phase',
      phaseSettlementGuidance: 're-evaluate only after phase settlement completes',
    },
    directorNoteAdditions: {
      beatConstraintsAdditions: 'keep the beat local and concrete',
    },
    beatVolumeDefinitions: {
      Low: {
        beatConstraints: 'low-volume beat constraints',
        optionFormatting: 'low-volume option formatting',
      },
      Med: {
        beatConstraints: 'medium-volume beat constraints',
        optionFormatting: 'medium-volume option formatting',
      },
      High: {
        beatConstraints: 'high-volume beat constraints',
        optionFormatting: 'high-volume option formatting',
      },
    },
  },
  worldBase: {
    mainCharacters: 'main-characters',
    npcCharacters: 'npc-characters',
    locationPatch: 'location-patch',
  },
});

interface RecordingAdapterOptions {
  readonly generateResults?: readonly GenerateResult[];
  readonly auditResults?: readonly AuditResult[];
  readonly settlementResults?: readonly PhaseConsequenceResponse[];
  readonly collapseResponses?: readonly CollapseResponse[];
}

function resolveSequenceValue<T>(
  sequence: readonly T[] | undefined,
  index: number,
  fallback: T,
): T {
  if (!sequence || sequence.length === 0) {
    return fallback;
  }

  return sequence[Math.min(index, sequence.length - 1)] ?? fallback;
}

export function createRecordingAdapter(options: RecordingAdapterOptions = {}) {
  const generateCalls: PromptObject[] = [];
  const auditCalls: AuditPacket[] = [];
  const settlementCalls: PhaseConsequenceRequest[] = [];
  const collapseCalls: CollapseInput[] = [];
  const routeCalls: RouteRequest[] = [];

  let generateIndex = 0;
  let auditIndex = 0;
  let settlementIndex = 0;
  let collapseIndex = 0;

  const adapter: LLMAdapter = {
    async collapse(request) {
      collapseCalls.push(request);

      const response = validateCollapseResponse(
        resolveSequenceValue(options.collapseResponses, collapseIndex++, {
          alpha: 'alpha-init',
          beta: 'beta-init',
          inferenceTrace: 'collapse-trace',
        }),
      );

      return deepFreeze(response);
    },

    async route(request) {
      const normalizedHint = request.context.routerHint?.trim();
      routeCalls.push(request);

      const selectedRouter =
        request.availableRouters.find((router) => router.routerName === normalizedHint) ??
        request.availableRouters.find((router) =>
          normalizedHint ? normalizedHint.includes(router.routerName) : false,
        ) ??
        request.availableRouters[0];

      if (!selectedRouter) {
        throw new Error('Recording adapter route requires at least one available router.');
      }

      return deepFreeze({
        routerName: selectedRouter.routerName,
        inferenceTrace: `route-trace-${routeCalls.length}`,
      });
    },

    async generate(request) {
      generateCalls.push(validatePromptObject(request));

      return deepFreeze(
        resolveSequenceValue(options.generateResults, generateIndex++, {
          beatText: `beat-${generateIndex}`,
          options: ['option-1', 'option-2', 'option-3', 'option-4'],
        }),
      );
    },

    async audit(request) {
      auditCalls.push(validateAuditPacket(request));

      return deepFreeze(
        resolveSequenceValue(options.auditResults, auditIndex++, {
          answers: request.auditQuestions.map(() => true),
        }),
      );
    },

    async settlement(request) {
      settlementCalls.push(validatePhaseConsequenceRequest(request));

      return deepFreeze(
        validatePhaseConsequenceResponse(
          resolveSequenceValue(options.settlementResults, settlementIndex++, {
            phaseConsequences: ['phase-consequence-1'],
            settlementTrace: 'settlement-trace',
          }),
        ),
      );
    },
  };

  return {
    adapter,
    generateCalls,
    auditCalls,
    settlementCalls,
    collapseCalls,
    routeCalls,
  };
}
