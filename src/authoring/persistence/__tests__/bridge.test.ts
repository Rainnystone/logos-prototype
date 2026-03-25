import { cpSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveSectionDraft } from '@/authoring/persistence/bridge';
import * as authoringStatus from '@/authoring/persistence/authoring-status';
import { loadStoryPackage } from '@/engine/story-loader';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const sourcePackageName = 'sample-scene';
const testPackageName = '__authoring-bridge-test__';
const testPackagePath = path.resolve(storyPackagesRoot, testPackageName);
const worldBasePath = path.resolve(testPackagePath, 'world-base.yaml');
const authoringStatusPath = path.resolve(testPackagePath, 'authoring-state.json');

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

describe('saveSectionDraft', () => {
  it('routes page and coordinator saves through one deterministic pipeline', async () => {
    prepareTestPackage();
    const originalWorldBaseContents = readFileSync(worldBasePath, 'utf8');

    const pageResult = await saveSectionDraft({
      requestId: 'request-page',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          mainCharacters: 'page-main-character-update',
        },
      },
    });

    const pageWorldBaseContents = readFileSync(worldBasePath, 'utf8');
    const pageStoryPackage = await loadStoryPackage(testPackageName);

    const coordinatorResult = await saveSectionDraft({
      requestId: 'request-coordinator',
      source: 'coordinator',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        patchCandidates: [
          { type: 'replace', path: 'mainCharacters', value: 'coordinator-main-character-update' },
        ],
      },
    });

    const coordinatorWorldBaseContents = readFileSync(worldBasePath, 'utf8');
    const coordinatorStoryPackage = await loadStoryPackage(testPackageName);

    expect(pageResult.kind).toBe('save_applied');
    expect(coordinatorResult.kind).toBe('save_applied');
    expect(pageResult.kind).toBe(coordinatorResult.kind);
    expect(pageWorldBaseContents).not.toBe(originalWorldBaseContents);
    expect(pageStoryPackage.worldBase.mainCharacters).toBe('page-main-character-update');
    expect(coordinatorWorldBaseContents).not.toBe(pageWorldBaseContents);
    expect(coordinatorStoryPackage.worldBase.mainCharacters).toBe(
      'coordinator-main-character-update',
    );
  });

  it('writes the authoring status marker after a successful save', async () => {
    prepareTestPackage();

    const result = await saveSectionDraft({
      requestId: 'request-status',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          mainCharacters: 'status-marker-update',
        },
      },
    });

    expect(result.kind).toBe('save_applied');

    const statusPath = path.resolve(testPackagePath, 'authoring-state.json');
    const status = YAML.parse(readFileSync(statusPath, 'utf8')) as {
      hasSuccessfulSave: boolean;
      lastEditedSection: string;
      lastSavedRequestId: string;
      lastSavedAt: string;
    };

    expect(status.hasSuccessfulSave).toBe(true);
    expect(status.lastEditedSection).toBe('worldbase-cast');
    expect(status.lastSavedRequestId).toBe('request-status');
    expect(typeof status.lastSavedAt).toBe('string');
  });

  it('returns a blocked save when no deterministic worldbase content is provided', async () => {
    prepareTestPackage();
    const originalWorldBaseContents = readFileSync(worldBasePath, 'utf8');

    const result = await saveSectionDraft({
      requestId: 'request-blocked',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          unrelatedField: 'still-valid-input',
        },
      },
    });

    expect(result.kind).toBe('save_blocked');
    if (result.kind === 'save_blocked') {
      expect(result.blockingIssues).toContain('No deterministic world-base update was provided.');
    }
    expect(readFileSync(worldBasePath, 'utf8')).toBe(originalWorldBaseContents);
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('blocks unsupported section saves instead of treating them as failures', async () => {
    prepareTestPackage();

    const result = await saveSectionDraft({
      requestId: 'request-section-blocked',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'scene-phase-authoring',
      payload: {
        uiFields: {
          mainCharacters: 'scene-phase-placeholder',
        },
      },
    });

    expect(result.kind).toBe('save_blocked');
    if (result.kind === 'save_blocked') {
      expect(result.blockingIssues).toContain(
        'Deterministic write path for "scene-phase-authoring" is not available in Task 1.',
      );
    }
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
    expect(readFileSync(worldBasePath, 'utf8')).toContain('角色设定与行为边界');
  });

  it('keeps a successful save distinct when the authoring status marker write fails', async () => {
    prepareTestPackage();
    const writeAuthoringStatusSpy = vi
      .spyOn(authoringStatus, 'writeAuthoringStatus')
      .mockRejectedValueOnce(new Error('marker write failed'));

    const result = await saveSectionDraft({
      requestId: 'request-marker-warning',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          mainCharacters: 'marker-warning-update',
        },
      },
    });

    expect(writeAuthoringStatusSpy).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe('save_applied_with_warnings');
    if (result.kind === 'save_applied_with_warnings') {
      expect(result.warnings).toContain('Authoring status marker write failed: marker write failed');
    }
    expect(await loadStoryPackage(testPackageName)).toMatchObject({
      worldBase: {
        mainCharacters: 'marker-warning-update',
      },
    });
    expect(readFileSync(worldBasePath, 'utf8')).toContain('marker-warning-update');
  });
});
