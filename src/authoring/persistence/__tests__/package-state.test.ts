import { cpSync, rmSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadAuthoringState, resolveAuthoringStatePath, writeAuthoringState } from '@/authoring/persistence/package-state';
import { saveSectionDraft } from '@/authoring/persistence/bridge';
import { loadStoryPackage } from '@/engine/story-loader';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const sourcePackageName = 'sample-scene';
const testPackageName = '__authoring-state-test__';
const testPackagePath = path.resolve(storyPackagesRoot, testPackageName);

function resetTestPackage(): void {
  rmSync(testPackagePath, { recursive: true, force: true });
}

function prepareTestPackage(): void {
  resetTestPackage();
  cpSync(path.resolve(storyPackagesRoot, sourcePackageName), testPackagePath, {
    recursive: true,
  });
}

afterEach(() => {
  resetTestPackage();
});

describe('loadAuthoringState', () => {
  it('prefers the latest saved package state when the authoring marker records a successful save', async () => {
    prepareTestPackage();
    const sourcePackage = await loadStoryPackage(sourcePackageName);

    await writeAuthoringState(testPackageName, {
      hasSuccessfulSave: true,
      lastSavedAt: '2026-03-25T14:30:00.000Z',
      lastEditedSection: 'worldbase-cast',
    });

    const result = await loadAuthoringState(testPackageName);

    expect(result.source).toBe('latest-saved');
    expect(result.state.sceneSpec.sceneId).toBe(sourcePackage.sceneSpec.sceneId);
    expect(path.resolve(resolveAuthoringStatePath(testPackageName))).toBe(
      path.resolve(testPackagePath, 'authoring-state.json'),
    );
  });

  it('falls back to the initial sample when no successful save has been recorded', async () => {
    prepareTestPackage();
    rmSync(path.resolve(testPackagePath, 'authoring-state.json'), { force: true });
    const sourcePackage = await loadStoryPackage(sourcePackageName);

    const result = await loadAuthoringState(testPackageName);

    expect(result.source).toBe('initial-sample');
    expect(result.state.sceneSpec.sceneName).toBe(sourcePackage.sceneSpec.sceneName);
  });

  it('reopens from the latest saved state after one successful section submit', async () => {
    prepareTestPackage();

    const saveResult = await saveSectionDraft({
      requestId: 'request-reopen-after-save',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          mainCharacters: 'reopened-main-characters',
        },
      },
    });

    expect(saveResult.kind).toBe('save_applied');

    const reopened = await loadAuthoringState(testPackageName);

    expect(reopened.source).toBe('latest-saved');
    expect(reopened.state.worldBase.mainCharacters).toBe('reopened-main-characters');
  });

  it('keeps the authoring marker tiny and readable when it is written directly', async () => {
    prepareTestPackage();

    await writeAuthoringState(testPackageName, {
      hasSuccessfulSave: true,
      lastSavedAt: '2026-03-25T14:30:00.000Z',
      lastEditedSection: 'worldbase-cast',
    });

    const rawContents = await import('node:fs/promises').then(({ readFile }) =>
      readFile(path.resolve(testPackagePath, 'authoring-state.json'), 'utf8'),
    );

    expect(rawContents).toContain('"hasSuccessfulSave": true');
    expect(rawContents).not.toContain('lastSavedRequestId');
  });

  it('round-trips pending section review flags through the authoring marker', async () => {
    prepareTestPackage();

    await writeAuthoringState(
      testPackageName,
      {
        hasSuccessfulSave: true,
        lastSavedAt: '2026-03-25T14:30:00.000Z',
        lastEditedSection: 'worldbase-cast',
        pendingSectionReviews: {
          'scene-phase-authoring': ['worldbase-cast'],
          'control-modules': ['worldbase-cast', 'scene-phase-authoring'],
        },
      } as never,
    );

    const result = await loadAuthoringState(testPackageName);

    expect(result.authoringState?.pendingSectionReviews).toEqual({
      'scene-phase-authoring': ['worldbase-cast'],
      'control-modules': ['worldbase-cast', 'scene-phase-authoring'],
    });
  });
});
