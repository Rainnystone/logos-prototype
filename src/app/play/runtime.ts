import { createAPIAdapter } from '@/engine/api-adapter/adapter';
import { createWorkbenchDemoAdapter } from '@/engine/__mocks__/workbench-demo-adapter';
import { parseAuditResult } from '@/engine/modules/auditor';
import { resolveAudit } from '@/engine/modules/audit-resolver';
import { buildVolumeSequence } from '@/engine/modules/phase-gradient';
import type { AdapterConfig } from '@/engine/api-adapter/providers/provider-interface';
import type { LLMAdapter } from '@/engine/types/adapter-interface';
import type { AuditQuestion, AuditQuestionSet, PhasePlan, StoryPackage } from '@/types';

export type WorkbenchStatus =
  | 'initializing'
  | 'idle'
  | 'generating'
  | 'auditing'
  | 'rewriting'
  | 'accepted'
  | 'force-accepted'
  | 'error';

export interface WorkbenchReporter {
  onStatusChange(status: WorkbenchStatus): void;
  onRewriteFeedback(feedback: string | null): void;
}

function buildQuestionMap(questionSet: AuditQuestionSet): Map<string, AuditQuestion> {
  const phaseSpecificQuestions = Object.values(questionSet.phaseSpecificQuestions ?? {}).flat();
  const questions = [
    ...questionSet.globalQuestions,
    ...questionSet.controlQuestions,
    ...phaseSpecificQuestions,
  ];

  return new Map(questions.map((question) => [question.question, question]));
}

export function createWorkbenchAdapter(config: AdapterConfig | null): LLMAdapter {
  return config ? createAPIAdapter(config) : createWorkbenchDemoAdapter();
}

export function createTrackedWorkbenchAdapter(
  adapter: LLMAdapter,
  questionSet: AuditQuestionSet,
  reporter: WorkbenchReporter,
): LLMAdapter {
  const questionMap = buildQuestionMap(questionSet);
  let retryCount = 0;

  return {
    async collapse(request) {
      return adapter.collapse(request);
    },

    async generate(promptObject) {
      if (!adapter.generate) {
        throw new Error('LLMAdapter.generate is not configured.');
      }

      reporter.onStatusChange(
        promptObject.generationControl?.isRewrite ? 'rewriting' : 'generating',
      );

      return adapter.generate(promptObject);
    },

    async audit(packet) {
      if (!adapter.audit) {
        throw new Error('LLMAdapter.audit is not configured.');
      }

      reporter.onStatusChange('auditing');
      const result = await adapter.audit(packet);
      const selectedQuestions = packet.auditQuestions.map((questionText) => {
        const question = questionMap.get(questionText);

        if (!question) {
          throw new Error(`Audit question was not found for workbench tracking: ${questionText}`);
        }

        return question;
      });
      const parsedResult = parseAuditResult(result, selectedQuestions);
      const resolution = resolveAudit(parsedResult, retryCount);

      if (!resolution.pass) {
        reporter.onRewriteFeedback(resolution.rewriteFeedback);
        retryCount += 1;
      } else {
        retryCount = 0;
      }

      return result;
    },

    async settlement(packet) {
      if (!adapter.settlement) {
        throw new Error('LLMAdapter.settlement is not configured.');
      }

      return adapter.settlement(packet);
    },
  };
}

export function getActivePhasePlan(storyPackage: StoryPackage, phaseIndex: number): PhasePlan {
  const phasePlan = storyPackage.phasePlans.find(
    (candidate) => candidate.phaseIndex === phaseIndex,
  );

  if (!phasePlan) {
    throw new Error(`Active phase ${phaseIndex} was not found in the story package.`);
  }

  return phasePlan;
}

export function getGradientSequence(storyPackage: StoryPackage, phaseIndex: number) {
  return buildVolumeSequence(getActivePhasePlan(storyPackage, phaseIndex).gradientType);
}

export function getReadyMessage(beatIndex: number, sceneComplete: boolean): string {
  if (sceneComplete) {
    return 'Scene complete. Review the final state and phase consequences.';
  }

  return `Beat ${beatIndex} ready. Choose an option or write the next action.`;
}
