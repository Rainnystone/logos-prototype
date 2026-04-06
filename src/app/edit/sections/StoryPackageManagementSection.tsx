'use client';

import { useRouter } from 'next/navigation';

import type { StoryPackageManagementWorkspaceView } from '@/types';
import type { StorylineAction } from '@/types/storyline-management';
import { StoryPackageSelector } from '@/app/edit/sections/StoryPackageSelector';
import { StorylineWorkspaceRow } from '@/app/edit/sections/StorylineWorkspaceRow';

interface StoryPackageManagementSectionProps {
  readonly packageName: string;
  readonly view: StoryPackageManagementWorkspaceView;
}

function buildStorylineActionUrl(packageName: string): string {
  return `/api/authoring/packages/${encodeURIComponent(packageName)}/storylines/actions`;
}

function buildWorldEditorHref(packageName: string): string {
  return `/edit?storyPackage=${encodeURIComponent(packageName)}&section=worldbase-cast&surface=world`;
}

async function submitStorylineAction<TResult>(
  packageName: string,
  action: StorylineAction,
): Promise<TResult> {
  const response = await fetch(buildStorylineActionUrl(packageName), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(action),
  });
  const payload = (await response.json().catch(() => null)) as
    | (TResult & { error?: string })
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Failed to process storyline action.');
  }

  return payload as TResult;
}

export function StoryPackageManagementSection({
  packageName,
  view,
}: StoryPackageManagementSectionProps) {
  const router = useRouter();

  async function handleSwitchStoryline(storylineId: string) {
    await submitStorylineAction<{ activeStorylineId: string }>(packageName, {
      kind: 'switch_active_storyline',
      storylineId,
    });
    router.refresh();
  }

  async function handleContinueStoryline(storylineId: string, isActive: boolean) {
    if (!isActive) {
      await submitStorylineAction<{ activeStorylineId: string }>(packageName, {
        kind: 'switch_active_storyline',
        storylineId,
      });
    }

    router.push(buildWorldEditorHref(packageName));
  }

  async function handleCreateFromSource(sourceStorylineId: string) {
    await submitStorylineAction<{ activeStorylineId: string }>(packageName, {
      kind: 'create_from_source',
      sourceStorylineId,
    });
    router.refresh();
  }

  async function handleBranchFromCheckpoint(sourceStorylineId: string, checkpointId: string) {
    await submitStorylineAction<{ activeStorylineId: string }>(packageName, {
      kind: 'branch_from_checkpoint',
      sourceStorylineId,
      checkpointId,
    });
    router.refresh();
  }

  async function handleRenameDisplayName(storylineId: string, nextDisplayName: string) {
    const result = await submitStorylineAction<{ displayName: string }>(packageName, {
      kind: 'rename_display_name',
      storylineId,
      nextDisplayName,
    });

    return result.displayName;
  }

  return (
    <section className="story-package-management panel" aria-label="Story package management">
      <div className="story-package-management__intro">
        <div>
          <p className="panel-eyebrow">当前页</p>
          <h2>故事包管理</h2>
          <p className="panel-note">左侧切换故事包，右侧检查故事线头部、来源和轨道摘要。</p>
        </div>
        <div className="story-package-management__meta" aria-label="Package summary">
          <span>{view.packageName}</span>
          <span>{view.storylines.length} 条故事线</span>
        </div>
      </div>

      <div className="story-package-management__layout">
        <StoryPackageSelector packageName={packageName} packages={view.packages} />

        <section className="story-package-management__workspace" aria-label="Storyline workspace">
          <div className="story-package-management__workspace-header">
            <div>
              <p className="panel-eyebrow">工作区</p>
              <h3>{view.packageName}</h3>
              <p className="panel-note">当前故事包的故事线状态会在这里按行展开。</p>
            </div>
          </div>

          <div className="story-package-management__rows">
            {view.storylines.map((row) => (
              <StorylineWorkspaceRow
                key={row.storylineId}
                packageName={packageName}
                row={row}
                onSwitchStoryline={handleSwitchStoryline}
                onContinueStoryline={handleContinueStoryline}
                onCreateFromSource={handleCreateFromSource}
                onBranchFromCheckpoint={handleBranchFromCheckpoint}
                onRenameDisplayName={handleRenameDisplayName}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
