import { readFileSync } from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';
import { describe, expect, it } from 'vitest';

import { AuditQuestionSetSchema, WorldBaseSchema } from '@/types';
import {
  PhasePlansFileSchema,
  RouterLexiconFileSchema,
  SceneSpecSchema,
  StateSnapshotsFileSchema,
} from '@/types/story-package';

const projectFixtureRoot = path.resolve(process.cwd(), 'src/story-packages/sample-scene');
const designFixtureRoot = path.resolve(
  '/Users/tachikoma/Library/CloudStorage/OneDrive-个人/Obsidian/L.O.G.O.S/LOGOS-Design/LOGOS-SPEC/06_FIXTURES/sample-scene',
);

function readYamlFile<T>(filePath: string): T {
  return YAML.parse(readFileSync(filePath, 'utf8')) as T;
}

function extractOverviewValue(fieldName: string): string {
  const overview = readFileSync(path.resolve(designFixtureRoot, 'scene-overview.md'), 'utf8');
  const match = overview.match(new RegExp(`\\| \\\`${fieldName}\\\` \\| \\\`([^\\\`]+)\\\` \\|`));

  if (!match || !match[1]) {
    throw new Error(`Unable to extract ${fieldName} from design fixture.`);
  }

  return match[1];
}

describe('sample-scene story package', () => {
  it('converts scene overview into a valid scene spec', () => {
    const sceneSpec = SceneSpecSchema.parse(
      readYamlFile(path.resolve(projectFixtureRoot, 'scene.yaml')),
    );

    expect(sceneSpec.sceneId).toBe(extractOverviewValue('sceneId'));
    expect(sceneSpec.sceneName).toBe(extractOverviewValue('sceneName'));
  });

  it('converts PhasePlan fixtures into a valid phase-plans.yaml file', () => {
    const projectPhasePlans = PhasePlansFileSchema.parse(
      readYamlFile(path.resolve(projectFixtureRoot, 'phase-plans.yaml')),
    );
    const designPhasePlans = readYamlFile<{ phasePlans: unknown }>(
      path.resolve(designFixtureRoot, 'phase-plan.yaml'),
    );

    expect(projectPhasePlans.phasePlans).toEqual(
      (designPhasePlans.phasePlans as typeof projectPhasePlans.phasePlans) ?? [],
    );
  });

  it('converts router lexicon fixtures into RouterProfile objects', () => {
    const projectRouterLexicon = RouterLexiconFileSchema.parse(
      readYamlFile(path.resolve(projectFixtureRoot, 'router-lexicon.yaml')),
    );
    const designRouterLexicon = readYamlFile<{
      routers?: Array<{
        routerName: string;
        semanticCore: string;
        verbLexicon: string[];
      }>;
    }>(path.resolve(designFixtureRoot, 'router-lexicon.yaml'));

    expect(projectRouterLexicon.routers).toEqual(
      (designRouterLexicon.routers ?? []).map((router) => ({
        routerName: router.routerName,
        routerSemanticCore: router.semanticCore,
        verbLexicon: router.verbLexicon,
      })),
    );
  });

  it('converts audit question fixtures without losing selection policy data', () => {
    const auditQuestionSet = AuditQuestionSetSchema.parse(
      readYamlFile(path.resolve(projectFixtureRoot, 'audit-questions.yaml')),
    );
    const designAuditQuestionSet = readYamlFile<Record<string, unknown>>(
      path.resolve(designFixtureRoot, 'audit-questions.yaml'),
    );
    const contractFields = Object.fromEntries(
      Object.entries(designAuditQuestionSet).filter(([key]) => key !== 'description'),
    );

    expect(auditQuestionSet).toEqual(AuditQuestionSetSchema.parse(contractFields));
  });

  it('stores world-base content in machine-parseable YAML', () => {
    const worldBase = WorldBaseSchema.parse(
      readYamlFile(path.resolve(projectFixtureRoot, 'world-base.yaml')),
    );

    expect(worldBase.mainCharacters.length).toBeGreaterThan(0);
    expect(worldBase.locationPatch.length).toBeGreaterThan(0);
  });

  it('copies reference state snapshots into a valid fixture file', () => {
    const projectSnapshots = StateSnapshotsFileSchema.parse(
      readYamlFile(path.resolve(projectFixtureRoot, 'state-snapshots.yaml')),
    );
    const designSnapshots = readYamlFile(path.resolve(designFixtureRoot, 'state-snapshots.yaml'));

    expect(projectSnapshots).toEqual(designSnapshots);
  });
});
