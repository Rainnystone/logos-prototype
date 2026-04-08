'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  StoryPackageCreationPanel,
  type StoryPackageCreationMode,
} from '@/app/edit/sections/StoryPackageCreationPanel';
import { loadAdapterConfig } from '@/app/runtime-config';
import type { StoryPackageManagementWorkspaceView } from '@/types';
import type { StoryPackageCreationResponse } from '@/types/storyline-management';
import type { StorylineAction } from '@/types/storyline-management';
import { StoryPackageSelector } from '@/app/edit/sections/StoryPackageSelector';
import { StorylineWorkspaceRow } from '@/app/edit/sections/StorylineWorkspaceRow';
import { buildStoryPackageSlug } from '@/story-packages/package-slug';
import type { AdapterConfig } from '@/engine/api-adapter/providers/provider-interface';

interface StoryPackageManagementSectionProps {
  readonly packageName: string;
  readonly view: StoryPackageManagementWorkspaceView;
  readonly initialCreationMode?: StoryPackageCreationMode;
}

function buildStorylineActionUrl(packageName: string): string {
  return `/api/authoring/packages/${encodeURIComponent(packageName)}/storylines/actions`;
}

function buildPackageCreationUrl(): string {
  return '/api/authoring/packages';
}

function buildWorldEditorHref(packageName: string): string {
  return `/edit?storyPackage=${encodeURIComponent(packageName)}&section=worldbase-cast&surface=world`;
}

function buildManagementHref(packageName: string): string {
  return `/edit?storyPackage=${encodeURIComponent(packageName)}&section=story-package-management`;
}

function resolvePackageCreationValidationMessage(draftDisplayName: string): string | null {
  try {
    buildStoryPackageSlug(draftDisplayName);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid story package display name.';
  }
}

function findReplacementStorylineDisplayName(
  storylines: StoryPackageManagementWorkspaceView['storylines'],
  storylineId: string,
): string | null {
  const currentIndex = storylines.findIndex((row) => row.storylineId === storylineId);
  if (currentIndex < 0) {
    return null;
  }

  return (
    storylines[currentIndex + 1]?.displayName ??
    storylines[currentIndex - 1]?.displayName ??
    null
  );
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

async function submitPackageCreation(
  requestBody:
    | {
        readonly mode: 'blank';
        readonly displayName: string;
      }
    | {
        readonly mode: 'text_import';
        readonly displayName?: string;
        readonly sourceText: string;
        readonly adapterConfig: AdapterConfig;
      },
): Promise<StoryPackageCreationResponse> {
  const response = await fetch(buildPackageCreationUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  const payload = (await response.json().catch(() => null)) as
    | (StoryPackageCreationResponse & { error?: string })
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Failed to create story package.');
  }

  return payload as StoryPackageCreationResponse;
}

export function StoryPackageManagementSection({
  packageName,
  view,
  initialCreationMode = 'blank',
}: StoryPackageManagementSectionProps) {
  const router = useRouter();
  const hasMountedRef = useRef(false);
  const [isCreatingPackage, setIsCreatingPackage] = useState(initialCreationMode === 'text_import');
  const [creationMode, setCreationMode] = useState<StoryPackageCreationMode>(initialCreationMode);
  const [draftPackageDisplayName, setDraftPackageDisplayName] = useState('');
  const [draftImportSourceText, setDraftImportSourceText] = useState('');
  const [creationFeedback, setCreationFeedback] = useState<string | null>(null);
  const [creationPending, setCreationPending] = useState(false);
  const [storedAdapterConfig, setStoredAdapterConfig] = useState<AdapterConfig | null | undefined>(undefined);

  let slugPreview = '--';
  const slugValidationMessage =
    draftPackageDisplayName.trim().length > 0
      ? resolvePackageCreationValidationMessage(draftPackageDisplayName)
      : null;

  if (slugValidationMessage === null && draftPackageDisplayName.trim().length > 0) {
    slugPreview = buildStoryPackageSlug(draftPackageDisplayName);
  }

  function resetPackageCreationState() {
    setCreationPending(false);
    setCreationFeedback(null);
    setDraftPackageDisplayName('');
    setDraftImportSourceText('');
    setIsCreatingPackage(false);
    setCreationMode('blank');
    setStoredAdapterConfig(undefined);
  }

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (initialCreationMode === 'text_import') {
      setCreationPending(false);
      setCreationFeedback(null);
      setDraftPackageDisplayName('');
      setDraftImportSourceText('');
      setIsCreatingPackage(true);
      setCreationMode('text_import');
      setStoredAdapterConfig(undefined);
      return;
    }

    resetPackageCreationState();
  }, [initialCreationMode, packageName]);

  useEffect(() => {
    if (!isCreatingPackage || creationMode !== 'text_import' || storedAdapterConfig !== undefined) {
      return;
    }

    setStoredAdapterConfig(loadAdapterConfig());
  }, [creationMode, isCreatingPackage, storedAdapterConfig]);

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

  async function handleDeleteStoryline(storylineId: string) {
    await submitStorylineAction<{ activeStorylineId: string }>(packageName, {
      kind: 'delete_storyline',
      storylineId,
    });
    router.refresh();
  }

  async function handleConfirmCreatePackage() {
    if (creationMode === 'blank') {
      const submitValidationMessage = resolvePackageCreationValidationMessage(draftPackageDisplayName);
      if (submitValidationMessage) {
        setCreationFeedback(submitValidationMessage);
        return;
      }
    } else {
      if (
        draftPackageDisplayName.trim().length > 0 &&
        resolvePackageCreationValidationMessage(draftPackageDisplayName)
      ) {
        setCreationFeedback(resolvePackageCreationValidationMessage(draftPackageDisplayName));
        return;
      }

      if (draftImportSourceText.trim().length === 0) {
        setCreationFeedback('导入文本不能为空。');
        return;
      }

      if (!storedAdapterConfig) {
        return;
      }
    }

    setCreationPending(true);
    setCreationFeedback(null);

    try {
      const created =
        creationMode === 'text_import'
          ? await submitPackageCreation({
              mode: 'text_import',
              ...(draftPackageDisplayName.trim().length > 0
                ? { displayName: draftPackageDisplayName.trim() }
                : {}),
              sourceText: draftImportSourceText,
              adapterConfig: storedAdapterConfig as AdapterConfig,
            })
          : await submitPackageCreation({
              mode: 'blank',
              displayName: draftPackageDisplayName,
            });
      resetPackageCreationState();
      router.replace(buildManagementHref(created.packageName));
    } catch (error) {
      setCreationFeedback(error instanceof Error ? error.message : '创建故事包失败。');
    } finally {
      setCreationPending(false);
    }
  }

  return (
    <section className="story-package-management panel" aria-label="Story package management">
      <div className="story-package-management__layout">
        <StoryPackageSelector
          packageName={packageName}
          packages={view.packages}
          createPackageDisabled={isCreatingPackage}
          onCreatePackage={() => {
            setIsCreatingPackage(true);
          }}
        />

        <section className="story-package-management__workspace" aria-label="Storyline workspace">
          {isCreatingPackage ? (
            <StoryPackageCreationPanel
              mode={creationMode}
              draftDisplayName={draftPackageDisplayName}
              sourceText={draftImportSourceText}
              slugPreview={slugPreview}
              feedback={creationFeedback}
              pendingCopy={
                creationPending
                  ? creationMode === 'text_import'
                    ? 'Weaver 正在整理文本并创建故事包…'
                    : '正在创建故事包…'
                  : null
              }
              runtimeConfigNotice={
                creationMode === 'text_import' && storedAdapterConfig === null
                  ? '需要先在运行配置中保存一个可用模型，才能执行文本导入。'
                  : null
              }
              submitting={creationPending}
              onChangeMode={(value) => {
                setCreationFeedback(null);
                setCreationMode(value);
              }}
              onChangeDraftDisplayName={(value) => {
                setCreationFeedback(null);
                setDraftPackageDisplayName(value);
              }}
              onChangeSourceText={(value) => {
                setCreationFeedback(null);
                setDraftImportSourceText(value);
              }}
              onConfirm={() => {
                void handleConfirmCreatePackage();
              }}
              onCancel={() => {
                resetPackageCreationState();
              }}
            />
          ) : (
            <>
              <div className="story-package-management__workspace-header">
                <h3>{view.packageName}</h3>
              </div>

              <div className="story-package-management__rows">
                {view.storylines.map((row) => (
                  <StorylineWorkspaceRow
                    key={row.storylineId}
                    row={row}
                    replacementDisplayName={
                      row.isActive
                        ? findReplacementStorylineDisplayName(view.storylines, row.storylineId)
                        : null
                    }
                    onSwitchStoryline={handleSwitchStoryline}
                    onContinueStoryline={handleContinueStoryline}
                    onCreateFromSource={handleCreateFromSource}
                    onBranchFromCheckpoint={handleBranchFromCheckpoint}
                    onRenameDisplayName={handleRenameDisplayName}
                    onDeleteStoryline={handleDeleteStoryline}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
