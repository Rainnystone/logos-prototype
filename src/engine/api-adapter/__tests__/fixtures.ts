import type { AuditPacket, CollapseRequest, PhaseConsequenceRequest, PromptObject } from '@/types';
import type { InitialCollapseRequest, RouteRequest } from '@/engine/types/adapter-interface';
import type { ProviderRequest } from '@/engine/api-adapter/providers/provider-interface';
import { renderWorldBaseForPrompt } from '@/engine/modules/world-base-prompt-render';
import type { WorldBase } from '@/types';

export const sampleStructuredWorldBase: WorldBase = {
  worldBaseSetting: 'Rain-soaked academy city ruled by rumor economics.',
  worldRules: 'No overt supernatural spectacle may break the campus shell.',
  toneBaseline: 'Lean, tense, light-novel suspense with sharp sensory detail.',
  hero: {
    characterId: 'chr_hero01',
    name: 'Hero One',
    identityRole: 'Lead breaker',
    lightNovelTrait: 'Calm pressure with surgical timing.',
    gender: 'Female',
    personality: 'Reserved and ruthless under stress.',
    age: '16',
    occupation: 'Student',
    characterSummary: 'The only person actively trying to break the incident open.',
    capabilityBoundary: 'Uses only physical action and observation.',
    behaviorBoundary: 'Never panics or begs for rescue.',
    oocRedLine: 'Never turns hesitant or melodramatic.',
    clothing: 'School blazer',
    propsWeapon: 'Flashlight',
  },
  coreCast: [
    {
      characterId: 'chr_core01',
      name: 'Core One',
      identityRole: 'Daily-life anchor',
      lightNovelTrait: 'Warm contrast to the hero.',
      gender: 'Female',
      personality: 'Steady',
      age: '16',
      occupation: 'Student',
      characterSummary: 'Keeps the normal shell intact.',
      capabilityBoundary: 'Stays in mundane social space.',
      behaviorBoundary: 'Avoids direct danger.',
      oocRedLine: 'Never spots the anomaly clearly.',
      clothing: 'Cardigan',
      propsWeapon: 'Notebook',
    },
  ],
  antagonists: [
    {
      characterId: 'chr_anti01',
      name: 'Antagonist One',
      identityRole: 'Showman threat',
      lightNovelTrait: 'Performative menace.',
      gender: 'Male',
      personality: 'Cruel',
      age: '18',
      occupation: 'Streamer',
      characterSummary: 'Turns the incident into a spectacle.',
      capabilityBoundary: 'Needs audience attention to escalate.',
      behaviorBoundary: 'Always performs for the crowd.',
      oocRedLine: 'Never becomes quiet and efficient.',
      clothing: 'Coat',
      propsWeapon: 'Phone rig',
      fatalWeakness: 'Social humiliation',
    },
  ],
  npcCharacters: 'Support One - steady witness\nSupport Two - sharp clue finder',
  locations: [],
  locationPatch: 'Main corridor\nBroadcast booth',
};

export const samplePromptObject: PromptObject = {
  worldBase: renderWorldBaseForPrompt(sampleStructuredWorldBase),
  relationshipLayer: {
    highlightedDeltasText: 'highlighted-deltas',
    stableBackgroundText: 'stable-background',
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
  generatedContent: {
    beatText: 'generated-beat-text',
    options: ['option-1', 'option-2', 'option-3', 'option-4'],
  },
  auditQuestions: ['question-1', 'question-2', 'question-3'],
};

export const sampleRouteRequest: RouteRequest = {
  context: {
    phaseGoal: 'phase-goal',
    currentVolume: 'High',
    alpha: 'alpha-boundary',
    beta: 'beta-boundary',
    sceneProgress: 'scene-progress',
    routerHint: 'suspense-investigation',
  },
  historyWindow: [...samplePromptObject.history],
  availableRouters: [
    {
      routerName: 'slice-of-life',
      routerSemanticCore: 'daily calm',
      verbLexicon: ['idle', 'chat', 'observe'],
    },
    {
      routerName: 'suspense-investigation',
      routerSemanticCore: 'inspect, infer, and pressure-test',
      verbLexicon: ['probe', 'feint', 'observe', 'withdraw'],
    },
  ],
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

const sampleGossipelogRelationshipSubgraph = {
  meta: {
    fileType: 'character-relationships',
    schemaVersion: 1,
    storyPackage: 'sample-scene',
  },
  relationshipsBySource: {},
} as const;

const sampleGossipelogRoleDefinitions = [
  sampleStructuredWorldBase.hero,
  sampleStructuredWorldBase.coreCast[0] ?? sampleStructuredWorldBase.hero,
] as const;

export const sampleGossipelogUpdateRequest = {
  acceptedBeatText: 'accepted beat text',
  roundId: 'round-0009',
  phaseId: 'phase-01-prologue',
  beatIndex: 1,
  sceneCastRoleIds: ['chr_hero01', 'chr_core01'],
  sceneCastFraming: {
    sceneId: 'scene-fixture',
    castRoleIds: ['chr_hero01', 'chr_core01'],
  },
  candidateRoles: sampleGossipelogRoleDefinitions,
  roleDefinitions: sampleGossipelogRoleDefinitions,
  relationshipSubgraph: sampleGossipelogRelationshipSubgraph,
  resolvedReferences: [
    {
      referenceId: 'relationship-reference',
      injectionLabel: 'Relationship reference',
      relativePath: 'src/agents/gossipelog/references/relationship-reference.md',
      contents: '# Gossipelog Relationship Reference',
      estimatedTokens: 20,
    },
  ],
} as const;

export const sampleGossipelogInjectionRequest = {
  sceneCastRoleIds: ['chr_hero01', 'chr_core01'],
  sceneCastFraming: {
    sceneId: 'scene-fixture',
    castRoleIds: ['chr_hero01', 'chr_core01'],
  },
  roleDefinitions: sampleGossipelogRoleDefinitions,
  relationshipSubgraph: sampleGossipelogRelationshipSubgraph,
} as const;

export const sampleWeaverImportRequest = {
  packageNameHint: 'woven-package',
  sourceText: '一段外部作者文本',
  resolvedReferences: [
    {
      referenceId: 'weaver-import-reference',
      injectionLabel: 'Import reference',
      relativePath: 'src/agents/weaver/references/import-reference.md',
      contents: '# Import Reference\n\nUse bounded extraction.',
      estimatedTokens: 10,
    },
  ],
} as const;

export const sampleProviderRequest: ProviderRequest = {
  system: 'system-instructions',
  messages: [
    { role: 'assistant', content: 'assistant-context' },
    { role: 'user', content: 'user-request' },
  ],
  temperature: 0.8,
  maxOutputTokens: 2048,
};
