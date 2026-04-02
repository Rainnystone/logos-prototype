import type { AdapterConfig } from '@/engine/api-adapter/providers/provider-interface';
import type { StateSnapshot, StoryPackage } from '@/types';

const storyPackageWorldBase: StoryPackage['worldBase'] = {
  worldBaseSetting: 'A sealed campus wing holds an overheating signal line under an ordinary school day.',
  worldRules: 'No open magic. Every solution must stay physical, observable, and local to the current scene.',
  toneBaseline: 'Cold pressure with restrained light-novel pacing.',
  hero: {
    characterId: 'chr_f0c1a7',
    name: 'Nagi Kirima',
    identityRole: 'Lead breaker',
    lightNovelTrait: 'Silent pressure',
    gender: 'Female',
    personality: 'Cold',
    age: '17',
    occupation: 'Student',
    characterSummary: 'Moves straight at the threat without leaving the physical plane.',
    capabilityBoundary: 'No magic, only trained physical action and prepared tools.',
    behaviorBoundary: 'Never abandons the trace once the threat becomes visible.',
    oocRedLine: 'No speeches and no hesitation.',
    clothing: 'School uniform with concealed gear.',
    propsWeapon: 'Ceramic blade',
  },
  coreCast: [
    {
      characterId: 'chr_a21d4e',
      name: 'Touka Miyashita',
      identityRole: 'Ordinary-life anchor',
      lightNovelTrait: 'Soft contrast',
      gender: 'Female',
      personality: 'Gentle',
      age: '16',
      occupation: 'Student',
      characterSummary: 'Keeps the ordinary layer intact and must remain outside the real danger.',
      capabilityBoundary: '',
      behaviorBoundary: 'Must stay out of direct danger and outside anomaly awareness.',
      oocRedLine: 'Never notices the anomaly.',
      clothing: 'School uniform',
      propsWeapon: '',
    },
  ],
  antagonists: [
    {
      characterId: 'chr_9b8e42',
      name: 'Retsu Haitani',
      identityRole: 'Signal-born threat',
      lightNovelTrait: 'Showman',
      gender: 'Male',
      personality: 'Chaotic',
      age: '18',
      occupation: 'Streamer',
      characterSummary: 'Turns attention into pressure and performs through every attack.',
      capabilityBoundary: 'Needs fear or focused attention to trigger device overheat.',
      behaviorBoundary: 'Always performs for an audience and escalates through spectacle.',
      oocRedLine: 'Cannot become quiet and efficient.',
      clothing: 'Stream jacket',
      propsWeapon: 'Phone rig',
      fatalWeakness: 'Loses power when attention drops to zero.',
    },
  ],
  npcCharacters: 'Support One：Steady witness',
  locations: [],
  locationPatch: 'A sealed corridor with old lights, cameras, and echoing vents.',
};

export const storyPackageFixture: StoryPackage = {
  sceneSpec: {
    sceneId: 'scene-signal-room',
    sceneName: 'Signal Room',
    cast: ['chr_a21d4e', 'chr_9b8e42'],
    openingSituation: 'A sealed corridor starts to overheat behind the public route.',
    mainAxis: 'Track a hostile signal through a sealed campus wing.',
    endLine: 'The source is isolated and the public space returns to calm.',
    openingHook:
      'A faulty relay in the corridor emits a sharp overheat alarm, and the operator slips away to trace the hostile source before the crowd notices.',
    samplePurpose: 'Validate the workbench control loop.',
    source: 'fixtures/signal-room',
  },
  phasePlans: [
    {
      phaseId: 'phase-01',
      phaseIndex: 1,
      phaseName: 'Signal Trace',
      phaseGoal: 'Identify the first trace of the signal.',
      phaseEndPoint: 'The source direction is narrowed to one sealed wing.',
      gradientType: 'Rising',
      beatCount: 4,
      routerHint: 'Investigation',
      notes: 'Keep the public crowd unaware.',
    },
    {
      phaseId: 'phase-02',
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
  controlModules: {
    sceneId: 'scene-signal-room',
    source: 'fixtures/control-modules',
    lightConeCustomization: {
      boundaryGuidance:
        'Keep the current player state as the apex and the far end line in view.',
      convergenceGuidance:
        'Narrow the cone after each settled phase instead of shrinking every beat.',
      phaseSettlementGuidance:
        'Only recalculate the cone after phase settlement completes and consequences are known.',
    },
    directorNoteAdditions: {
      beatConstraintsAdditions: 'Keep beats local, physical, and easy to trace.',
    },
    beatVolumeDefinitions: {
      Low: {
        beatConstraints: 'Use summary framing and broad causal movement.',
        optionFormatting: 'Offer broad actions with light wording.',
      },
      Med: {
        beatConstraints: 'Keep standard pacing with clear causal links.',
        optionFormatting: 'Offer balanced actions with direct phrasing.',
      },
      High: {
        beatConstraints: 'Use tighter physical focus and higher sensory density.',
        optionFormatting: 'Offer sharper, higher-immediacy actions.',
      },
    },
  },
  worldBase: storyPackageWorldBase,
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
    directorNoteSummary: 'Volume=High | BeatRules=Active | OptionRules=Active',
    promptObject: {
      worldBase: {
        mainCharacters:
          'An operator who keeps a calm surface under pressure while staying strictly physical.',
        npcCharacters: storyPackageFixture.worldBase.npcCharacters,
        locationPatch: storyPackageFixture.worldBase.locationPatch,
      },
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
