import type { AdapterConfig } from '@/engine/api-adapter/providers/provider-interface';
import type { StateSnapshot, StoryPackage } from '@/types';

export const storyPackageFixture: StoryPackage = {
  sceneSpec: {
    sceneId: 'scene-signal-room',
    sceneName: 'Signal Room',
    mainAxis: 'Track a hostile signal through a sealed campus wing.',
    endLine: 'The source is isolated and the public space returns to calm.',
    samplePurpose: 'Validate the workbench control loop.',
    source: 'fixtures/signal-room',
  },
  phasePlans: [
    {
      phaseId: 'phase-01',
      phaseIndex: 1,
      phaseGoal: 'Identify the first trace of the signal.',
      gradientType: 'Rising',
      beatCount: 4,
      routerHint: 'Investigation',
      notes: 'Keep the public crowd unaware.',
    },
    {
      phaseId: 'phase-02',
      phaseIndex: 2,
      phaseGoal: 'Contain the hostile response.',
      gradientType: 'Pulse',
      beatCount: 4,
      routerHint: 'Counterplay',
      notes: 'Escalate with controlled pressure.',
    },
  ],
  routerProfiles: [
    {
      routerName: 'Investigation',
      routerSemanticCore: 'Observe, test, and close distance without exposure.',
      verbLexicon: ['observe', 'probe', 'approach', 'withdraw'],
    },
    {
      routerName: 'Counterplay',
      routerSemanticCore: 'Break patterns and seize local control.',
      verbLexicon: ['break', 'feint', 'disrupt', 'corner'],
    },
  ],
  auditQuestionSet: {
    sceneId: 'scene-signal-room',
    globalQuestions: [
      {
        id: 'global-1',
        question: 'Does the beat remain inside the active narrative boundaries?',
        expected: true,
        blocking: true,
      },
    ],
    controlQuestions: [
      {
        id: 'control-1',
        question: 'Do the options remain distinct from one another?',
        expected: true,
        blocking: true,
      },
    ],
    selectionPolicy: {
      default: ['global-1', 'control-1'],
    },
  },
  worldBase: {
    mainCharacters: 'An operator who keeps a calm surface under pressure.',
    npcCharacters: 'A nearby witness who should stay outside the real danger.',
    locationPatch: 'A sealed corridor with old lights, cameras, and echoing vents.',
  },
};

export const stateSnapshotFixture: StateSnapshot = {
  sceneState: {
    sceneId: storyPackageFixture.sceneSpec.sceneId,
    currentPhaseIndex: 2,
    currentBeatIndexInPhase: 3,
    mainAxis: storyPackageFixture.sceneSpec.mainAxis,
    endLine: storyPackageFixture.sceneSpec.endLine,
    alpha: 'Push hard enough to expose the source, but not the operator.',
    beta: 'Delay too long and the signal will spread into public view.',
    sceneProgress: 'Phase 01 closed with the corridor partially isolated.',
    phaseConsequences: [
      'The hostile signal now reacts to surveillance equipment.',
      'The witness remains nearby but unaware of the threat origin.',
    ],
  },
  roundState: {
    phaseGoal: storyPackageFixture.phasePlans[1]!.phaseGoal,
    currentVolume: 'High',
    currentRouter: 'Counterplay',
    verbLexicon: ['break', 'feint', 'disrupt', 'corner'],
    historyWindow: [
      { role: 'user', content: 'Inspect the flickering camera.' },
      { role: 'assistant', content: 'The lens jerks toward the hallway corner.' },
    ],
    directorConstraints: 'Stay precise, physical, and local.',
  },
  generationState: {
    directorNoteSummary: 'Volume=High | Router=Counterplay | VerbLexicon=break, feint',
    promptObject: {
      worldBase: storyPackageFixture.worldBase,
      history: [
        { role: 'user', content: 'Inspect the flickering camera.' },
        { role: 'assistant', content: 'The lens jerks toward the hallway corner.' },
      ],
      narrative: {
        mainAxis: storyPackageFixture.sceneSpec.mainAxis,
        endLine: storyPackageFixture.sceneSpec.endLine,
        phaseGoal: storyPackageFixture.phasePlans[1]!.phaseGoal,
        alpha: 'Push hard enough to expose the source, but not the operator.',
        beta: 'Delay too long and the signal will spread into public view.',
      },
      directorNote: {
        volume: 'High',
        router: 'Counterplay',
        verbLexicon: ['break', 'feint', 'disrupt', 'corner'],
        beatConstraints: 'Keep the beat sharp and material.',
        optionConstraints: 'Offer four distinct physical actions.',
      },
    },
    currentBeatText:
      'The operator leans into the blind spot of the corridor and listens for the surge behind the wall.',
    currentOptions: [
      'Cut the hallway power at the local panel.',
      'Throw a distraction into the vent shaft.',
      'Advance on the control cabinet.',
      'Pull back and watch the response pattern.',
    ],
  },
  evaluationState: {
    auditAnswers: [true, true],
    blockingFailures: [],
    retryCount: 1,
    rewriteFeedback: 'Tighten option distinctness and keep the beat within local causality.',
  },
};

export const adapterConfigFixture: AdapterConfig = {
  provider: 'anthropic',
  providerConfig: {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-test',
  },
};
