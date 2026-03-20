import type { AuditPacket, CollapseRequest, PhaseConsequenceRequest, PromptObject } from '@/types';
import type { InitialCollapseRequest } from '@/engine/types/adapter-interface';
import type { ProviderRequest } from '@/engine/api-adapter/providers/provider-interface';

export const samplePromptObject: PromptObject = {
  worldBase: {
    mainCharacters: 'main-character-profile',
    npcCharacters: 'npc-profile',
    locationPatch: 'rainy-rooftop-location',
  },
  history: [
    { role: 'assistant', content: 'accepted-beat-1' },
    { role: 'user', content: 'player-choice-1' },
    { role: 'assistant', content: 'accepted-beat-2' },
  ],
  narrative: {
    mainAxis: 'main-axis',
    endLine: 'end-line',
    phaseGoal: 'phase-goal',
    alpha: 'alpha-boundary',
    beta: 'beta-boundary',
  },
  directorNote: {
    volume: 'High',
    router: 'suspense-investigation',
    verbLexicon: ['probe', 'feint', 'observe', 'withdraw'],
    beatConstraints: 'beat-constraints',
    optionConstraints: 'option-constraints',
  },
};

export const sampleRewritePromptObject: PromptObject = {
  ...samplePromptObject,
  generationControl: {
    isRewrite: true,
    retryCount: 2,
    rewriteFeedback: 'repair-option-orthogonality',
    previousDraft: {
      beatText: 'failed-beat-draft',
      options: ['failed-option-1', 'failed-option-2', 'failed-option-3', 'failed-option-4'],
    },
  },
};

export const sampleAuditPacket: AuditPacket = {
  context: {
    precedingBeats: [...samplePromptObject.history],
  },
  generatedContent: {
    beatText: 'generated-beat-text',
    options: ['option-1', 'option-2', 'option-3', 'option-4'],
  },
  auditQuestions: ['question-1', 'question-2', 'question-3'],
};

export const sampleSettlementRequest: PhaseConsequenceRequest = {
  context: {
    mainAxis: 'main-axis',
    endLine: 'end-line',
    phaseGoal: 'phase-goal',
    sceneProgress: 'scene-progress',
    currentPhaseIndex: 2,
  },
  phaseTranscript: [
    { role: 'assistant', content: 'phase-beat-1' },
    { role: 'user', content: 'phase-choice-1' },
    { role: 'assistant', content: 'phase-beat-2' },
  ],
};

export const sampleCollapseRequest: CollapseRequest = {
  context: {
    mainAxis: 'main-axis',
    endLine: 'end-line',
    currentAlpha: 'current-alpha',
    currentBeta: 'current-beta',
    sceneProgress: 'scene-progress',
    completedPhaseGoal: 'completed-phase-goal',
  },
  phaseConsequences: ['fact-1', 'fact-2'],
};

export const sampleInitialCollapseRequest: InitialCollapseRequest = {
  context: {
    mainAxis: 'main-axis',
    endLine: 'end-line',
    sceneProgress: 'scene-progress',
    completedPhaseGoal: 'completed-phase-goal',
  },
};

export const sampleProviderRequest: ProviderRequest = {
  system: 'system-instructions',
  messages: [
    { role: 'assistant', content: 'assistant-context' },
    { role: 'user', content: 'user-request' },
  ],
  temperature: 0.8,
  maxOutputTokens: 2048,
};
