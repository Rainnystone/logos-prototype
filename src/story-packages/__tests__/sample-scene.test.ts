import { readFileSync } from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';
import { describe, expect, it } from 'vitest';

import { AuditQuestionSetSchema } from '@/types';
import {
  PhasePlansFileSchema,
  RouterLexiconFileSchema,
  SceneSpecSchema,
  StateSnapshotsFileSchema,
} from '@/types/story-package';

const projectFixtureRoot = path.resolve(process.cwd(), 'src/story-packages/sample-scene');
const designFixtureRoot = path.resolve(process.cwd(), 'archive/vendor/LOGOS-SPEC/06_FIXTURES/sample-scene');

type StructuredSceneSpec = {
  readonly sceneId: string;
  readonly sceneName: string;
  readonly openingSituation?: string;
  readonly startPoint?: string;
  readonly mainAxis: string;
  readonly endLine: string;
  readonly openingHook?: string;
  readonly samplePurpose?: string;
  readonly source?: string;
  readonly cast?: readonly string[];
};

type StructuredWorldBase = {
  readonly hero: { readonly name: string; readonly characterId: string };
  readonly coreCast: ReadonlyArray<{ readonly name: string; readonly characterId: string }>;
  readonly antagonists: ReadonlyArray<{ readonly name: string; readonly characterId: string }>;
  readonly npcCharacters: string;
  readonly locationPatch: string;
};

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

function extractAuditRulesFromMarkdown(): Array<{ question: string; expected: boolean }> {
  const auditRules = readFileSync(
    path.resolve(designFixtureRoot, 'story-source/audit-rules.md'),
    'utf8',
  );

  return Array.from(auditRules.matchAll(/^\s*-\s+(.+?[？?])\(必须为：([是否])\)\s*$/gm)).map(
    (match) => ({
      question: match[1]!.trim(),
      expected: match[2] === '是',
    }),
  );
}

describe('sample-scene story package', () => {
  it('converts scene overview into a valid scene spec', () => {
    const sceneSpec = SceneSpecSchema.parse(
      readYamlFile(path.resolve(projectFixtureRoot, 'scene.yaml')),
    ) as StructuredSceneSpec;

    expect(sceneSpec.sceneId).toBe(extractOverviewValue('sceneId'));
    expect(sceneSpec.sceneName).toBe(extractOverviewValue('sceneName'));
    expect(sceneSpec.samplePurpose).toBe(extractOverviewValue('samplePurpose'));
    expect(sceneSpec.startPoint).toBe(extractOverviewValue('startPoint'));
    expect(sceneSpec.mainAxis).toBe(extractOverviewValue('mainAxis'));
    expect(sceneSpec.endLine).toBe(extractOverviewValue('endLine'));
    expect(sceneSpec.openingSituation).toContain('过热迹象');
    expect(sceneSpec.openingHook).not.toContain('恶意信号');
    expect(sceneSpec.openingHook).not.toContain('翻出了窗户');
    expect(sceneSpec.openingHook).toContain('一步步查清幕后操控者');
  });

  it('stores scene cast separately in scene.yaml', () => {
    const scene = readYamlFile<StructuredSceneSpec>(
      path.resolve(projectFixtureRoot, 'scene.yaml'),
    );
    const worldBase = readYamlFile<StructuredWorldBase>(
      path.resolve(projectFixtureRoot, 'world-base.yaml'),
    );
    const knownCharacterIds = new Set([
      worldBase.hero.characterId,
      ...worldBase.coreCast.map((character) => character.characterId),
      ...worldBase.antagonists.map((character) => character.characterId),
    ]);

    expect(scene.cast).toEqual(expect.arrayContaining([expect.stringMatching(/^chr_/)]));
    expect(scene.cast?.every((characterId) => knownCharacterIds.has(characterId))).toBe(true);
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
    expect(projectPhasePlans.phasePlans[0]?.phaseName).toBe('序章');
    expect(projectPhasePlans.phasePlans[0]?.phaseEndPoint).toContain('普通电池故障');
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

  it('derives audit questions from audit-rules.md and removes redundant legacy checks', () => {
    const auditQuestionSet = AuditQuestionSetSchema.parse(
      readYamlFile(path.resolve(projectFixtureRoot, 'audit-questions.yaml')),
    );
    const projectQuestions = [
      ...auditQuestionSet.globalQuestions,
      ...auditQuestionSet.controlQuestions,
      ...Object.values(auditQuestionSet.phaseSpecificQuestions ?? {}).flat(),
    ];
    const questionIndex = new Map(
      projectQuestions.map((question) => [`${question.question}::${question.expected}`, question]),
    );
    const expectedAuditRules = extractAuditRulesFromMarkdown();

    expect(auditQuestionSet.source).toBe('story-source/audit-rules.md');

    for (const rule of expectedAuditRules) {
      expect(questionIndex.has(`${rule.question}::${rule.expected}`)).toBe(true);
    }

    expect(projectQuestions.some((question) => question.question.includes('光锥边界'))).toBe(false);
    expect(projectQuestions.some((question) => question.question.includes('角色明显 OOC'))).toBe(
      false,
    );
    expect(auditQuestionSet.selectionPolicy.default).not.toContain('AQ-C-003');
    expect(
      auditQuestionSet.selectionPolicy.phaseOverrides?.['phase-01-prologue']?.append,
    ).toContain('AQ-P1-001');
    expect(
      auditQuestionSet.selectionPolicy.phaseOverrides?.['phase-02-hunt']?.append,
    ).toContain('AQ-P2-001');
    expect(
      auditQuestionSet.selectionPolicy.phaseOverrides?.['phase-03-first-contact']?.append,
    ).toContain('AQ-P3-000');
    expect(
      auditQuestionSet.selectionPolicy.phaseOverrides?.['phase-04-streamer-domain']?.append,
    ).toContain('AQ-P4-000');
    expect(auditQuestionSet.selectionPolicy.phaseOverrides?.['phase-02-signal-chase']).toBe(
      undefined,
    );
    expect(
      auditQuestionSet.phaseSpecificQuestions?.['phase-02-hunt']?.find(
        (question) => question.id === 'AQ-P2-002',
      ),
    ).toMatchObject({
      question: '雾间凪的追踪与排查手段是否依赖了超自然感知？',
      expected: false,
    });
  });

  it('keeps audit questions mirrored between src and vendor fixtures and aligned with phase ids', () => {
    const projectAuditQuestions = AuditQuestionSetSchema.parse(
      readYamlFile(path.resolve(projectFixtureRoot, 'audit-questions.yaml')),
    );
    const designAuditQuestions = AuditQuestionSetSchema.parse(
      readYamlFile(path.resolve(designFixtureRoot, 'audit-questions.yaml')),
    );
    const phasePlans = PhasePlansFileSchema.parse(
      readYamlFile(path.resolve(projectFixtureRoot, 'phase-plans.yaml')),
    );
    const phaseIds = new Set(phasePlans.phasePlans.map((phasePlan) => phasePlan.phaseId));

    expect(projectAuditQuestions).toEqual(designAuditQuestions);

    for (const phaseId of Object.keys(projectAuditQuestions.phaseSpecificQuestions ?? {})) {
      expect(phaseIds.has(phaseId)).toBe(true);
    }

    for (const phaseId of Object.keys(projectAuditQuestions.selectionPolicy.phaseOverrides ?? {})) {
      expect(phaseIds.has(phaseId)).toBe(true);
    }
  });

  it('stores world-base content as structured YAML with cast members separated out', () => {
    const worldBase = readYamlFile<StructuredWorldBase>(
      path.resolve(projectFixtureRoot, 'world-base.yaml'),
    );

    expect(worldBase).toMatchObject({
      hero: {
        name: '雾间凪',
        characterId: expect.stringMatching(/^chr_/),
      },
      coreCast: expect.arrayContaining([
        expect.objectContaining({ name: '宫下藤花' }),
        expect.objectContaining({ name: '不吉波普' }),
      ]),
      antagonists: expect.arrayContaining([
        expect.objectContaining({ name: '灰谷烈' }),
      ]),
    });
    expect(worldBase).not.toHaveProperty('mainCharacters');
    expect(worldBase.npcCharacters).toContain('竹田启司：');
    expect(worldBase.npcCharacters).toContain('末真和子：');
    expect(worldBase.npcCharacters).toContain('新刻敬：');
    expect(worldBase.locationPatch.length).toBeGreaterThan(0);
  });

  it('copies reference state snapshots into a valid fixture file', () => {
    const projectSnapshots = StateSnapshotsFileSchema.parse(
      readYamlFile(path.resolve(projectFixtureRoot, 'state-snapshots.yaml')),
    );
    const designSnapshots = readYamlFile(path.resolve(designFixtureRoot, 'state-snapshots.yaml'));

    expect(projectSnapshots).toEqual(designSnapshots);
  });

  it('keeps director note summaries separate from the active router and verb lexicon', () => {
    const snapshots = StateSnapshotsFileSchema.parse(
      readYamlFile(path.resolve(projectFixtureRoot, 'state-snapshots.yaml')),
    );

    for (const snapshot of snapshots.snapshots) {
      expect(snapshot.generationState.directorNoteSummary).not.toContain(
        snapshot.roundState.currentRouter,
      );

      for (const verb of snapshot.roundState.verbLexicon) {
        expect(snapshot.generationState.directorNoteSummary).not.toContain(verb);
      }
    }
  });
});
