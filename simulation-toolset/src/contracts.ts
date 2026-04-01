import { z } from 'zod';

export const SIMULATION_SCHEMA_VERSION = 1;

export const SimulationActionSchema = z.object({
  kind: z.string(),
  details: z.unknown().optional(),
});

export const SimulationAssertionSchema = z.object({
  name: z.string(),
  pass: z.boolean(),
  evidenceEventId: z.string().optional(),
  details: z.string().optional(),
});

export const SimulationAuthoringTraceSchema = z.object({
  sectionId: z.string(),
  resultKind: z.string(),
  changedFiles: z.array(z.string()).optional(),
  blockingIssues: z.array(z.string()).optional(),
});

export const SimulationRuntimeTraceSchema = z.object({
  accepted: z.boolean(),
  forceAccepted: z.boolean().optional(),
  beatText: z.string().optional(),
  currentBeatIndexInPhase: z.number().optional(),
});

export const SimulationAdapterTraceSchema = z.object({
  operation: z.string(),
  outcome: z.string(),
  error: z.string().optional(),
  delayMs: z.number().optional(),
  startedAtMs: z.number().optional(),
  completedAtMs: z.number().optional(),
  elapsedMs: z.number().optional(),
});

export const SimulationAgentTraceSchema = z.object({
  agentId: z.string(),
  stage: z.string(),
  outcome: z.string(),
  stableBackgroundText: z.string().optional(),
  highlightedDeltasText: z.string().optional(),
  usedFallbackSource: z.string().optional(),
  usedFallbackLayer: z.string().optional(),
  sideEffectSummary: z.array(z.string()).optional(),
});

export const SimulationScenarioSchema = z.object({
  scenarioId: z.string(),
  packageName: z.string(),
  steps: z.array(z.unknown()),
});

export const SimulationReportSchema = z.object({
  schemaVersion: z.number().int().positive(),
  scenarioMeta: z.object({
    scenarioId: z.string(),
    packageName: z.string(),
  }),
  actions: z.array(SimulationActionSchema),
  assertions: z.array(SimulationAssertionSchema),
  finalState: z.record(z.string(), z.unknown()),
  authoringTrace: z.array(SimulationAuthoringTraceSchema).optional(),
  runtimeTrace: z.array(SimulationRuntimeTraceSchema).optional(),
  adapterTrace: z.array(SimulationAdapterTraceSchema).optional(),
  agentTrace: z.array(SimulationAgentTraceSchema).optional(),
});

export const SimulationRunIndexSchema = z.object({
  schemaVersion: z.number().int().positive(),
  generatedAt: z.string(),
  reports: z.array(
    z.object({
      scenarioId: z.string(),
      packageName: z.string(),
      reportPath: z.string(),
      title: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
  ),
});

export type SimulationAction = z.infer<typeof SimulationActionSchema>;
export type SimulationAssertion = z.infer<typeof SimulationAssertionSchema>;
export type SimulationAuthoringTrace = z.infer<typeof SimulationAuthoringTraceSchema>;
export type SimulationRuntimeTrace = z.infer<typeof SimulationRuntimeTraceSchema>;
export type SimulationAdapterTrace = z.infer<typeof SimulationAdapterTraceSchema>;
export type SimulationAgentTrace = z.infer<typeof SimulationAgentTraceSchema>;
export type SimulationScenario = z.infer<typeof SimulationScenarioSchema>;
export type SimulationReport = z.infer<typeof SimulationReportSchema>;
export type SimulationRunIndex = z.infer<typeof SimulationRunIndexSchema>;
