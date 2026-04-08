import type { StoryPackageManagementWorkspaceView } from '@/types';

export const textImportSourceFixture =
  '夜色压住山城天台。主角拎着一台旧录音机，准备在暴雨前和失踪多年的姐姐留下的线索对话。';

export const workspaceViewFixture: StoryPackageManagementWorkspaceView = {
  packages: [
    {
      packageName: 'sample-scene',
      sceneId: 'scene_opening',
      sceneName: 'Sample Scene',
      mainAxis: 'survival',
      endLine: 'The corridor opens into daylight.',
      source: 'workspace',
      samplePurpose: 'baseline package',
      phaseCount: 4,
      totalBeatCount: 16,
    },
    {
      packageName: 'alt-scene',
      sceneId: 'scene_alt',
      sceneName: 'Alt Scene',
      mainAxis: 'investigation',
      endLine: 'The witness finally speaks.',
      source: 'workspace',
      samplePurpose: 'secondary package',
      phaseCount: 3,
      totalBeatCount: 12,
    },
  ],
  packageName: 'sample-scene',
  activeStorylineId: 'storyline_main',
  storylines: [
    {
      storylineId: 'storyline_main',
      displayName: 'Main Line',
      status: 'active',
      isActive: true,
      sourceCheckpointId: null,
      headCheckpointId: 'chk_03',
      headSummary: 'Beat 3 · Nagi reaches the roof and spots the signal',
      canCreateFromSource: false,
      canContinue: true,
      canDelete: true,
      deleteDisabledReason: null,
      checkpointRail: [
        {
          checkpointId: 'chk_01',
          acceptedBeatOrdinal: 1,
          phaseIndex: 1,
          beatIndex: 1,
          isHead: false,
          isBranchSource: false,
        },
        {
          checkpointId: 'chk_02',
          acceptedBeatOrdinal: 2,
          phaseIndex: 1,
          beatIndex: 2,
          isHead: false,
          isBranchSource: false,
        },
        {
          checkpointId: 'chk_03',
          acceptedBeatOrdinal: 3,
          phaseIndex: 2,
          beatIndex: 1,
          isHead: true,
          isBranchSource: false,
        },
      ],
    },
    {
      storylineId: 'storyline_branch',
      displayName: 'Branch Line',
      status: 'paused',
      isActive: false,
      sourceCheckpointId: 'chk_02',
      headCheckpointId: 'chk_05',
      headSummary: 'Beat 5 · The branch reaches the second door',
      canCreateFromSource: true,
      canContinue: true,
      canDelete: true,
      deleteDisabledReason: null,
      checkpointRail: [
        {
          checkpointId: 'chk_01',
          acceptedBeatOrdinal: 1,
          phaseIndex: 1,
          beatIndex: 1,
          isHead: false,
          isBranchSource: false,
        },
        {
          checkpointId: 'chk_02',
          acceptedBeatOrdinal: 2,
          phaseIndex: 1,
          beatIndex: 2,
          isHead: false,
          isBranchSource: true,
        },
        {
          checkpointId: 'chk_05',
          acceptedBeatOrdinal: 5,
          phaseIndex: 2,
          beatIndex: 2,
          isHead: true,
          isBranchSource: false,
        },
      ],
    },
  ],
};

export const workspaceViewWithoutHeadFixture: StoryPackageManagementWorkspaceView = {
  ...workspaceViewFixture,
  storylines: [
    {
      storylineId: 'storyline_main',
      displayName: 'Main Line',
      status: 'active',
      isActive: true,
      sourceCheckpointId: null,
      headCheckpointId: null,
      headSummary: null,
      canCreateFromSource: false,
      canContinue: false,
      canDelete: false,
      deleteDisabledReason: '至少保留一条故事线',
      checkpointRail: [],
    },
  ],
};

export const workspaceViewSingleLineFixture: StoryPackageManagementWorkspaceView = {
  ...workspaceViewFixture,
  activeStorylineId: 'storyline_main',
  storylines: [
    {
      ...workspaceViewFixture.storylines[0]!,
      status: workspaceViewFixture.storylines[0]!.status,
      canDelete: false,
      deleteDisabledReason: '至少保留一条故事线',
    },
  ],
};
