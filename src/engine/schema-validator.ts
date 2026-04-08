import {
  AuditPacketSchema,
  AuditQuestionSetSchema,
  CharacterRelationshipsFileSchema,
  CollapseRequestSchema,
  CollapseResponseSchema,
  GossipelogInjectionResultSchema,
  GossipelogUpdateResultSchema,
  PhaseConsequenceRequestSchema,
  PhaseConsequenceResponseSchema,
  PhasePlanSchema,
  PromptObjectSchema,
  RuntimeSessionsFileSchema,
  WeaverImportPayloadSchema,
  WeaverImportSummarySchema,
  assertRuntimeSessionsFileConsistency,
  StateSnapshotSchema,
  type AuditPacket,
  type AuditQuestionSet,
  type CharacterRelationshipsFile,
  type CollapseRequest,
  type CollapseResponse,
  type GossipelogInjectionResult,
  type GossipelogUpdateResult,
  type PhaseConsequenceRequest,
  type PhaseConsequenceResponse,
  type PhasePlan,
  type PromptObject,
  type RuntimeSessionsFile,
  type StateSnapshot,
  type WeaverImportPayload,
  type WeaverImportSummary,
} from '@/types';
import { parseWithSchema } from '@/lib/validation';

export function validatePromptObject(data: unknown): PromptObject {
  return parseWithSchema(PromptObjectSchema, data, 'promptObject');
}

export function validateCharacterRelationshipsFile(data: unknown): CharacterRelationshipsFile {
  return parseWithSchema(
    CharacterRelationshipsFileSchema,
    data,
    'characterRelationshipsFile',
  );
}

export function validateGossipelogUpdateResult(data: unknown): GossipelogUpdateResult {
  return parseWithSchema(GossipelogUpdateResultSchema, data, 'gossipelogUpdateResult');
}

export function validateGossipelogInjectionResult(data: unknown): GossipelogInjectionResult {
  return parseWithSchema(GossipelogInjectionResultSchema, data, 'gossipelogInjectionResult');
}

export function validateStateSnapshot(data: unknown): StateSnapshot {
  return parseWithSchema(StateSnapshotSchema, data, 'stateSnapshot');
}

export function validatePhasePlan(data: unknown): PhasePlan {
  return parseWithSchema(PhasePlanSchema, data, 'phasePlan');
}

export function validateAuditPacket(data: unknown): AuditPacket {
  return parseWithSchema(AuditPacketSchema, data, 'auditPacket');
}

export function validateCollapseRequest(data: unknown): CollapseRequest {
  return parseWithSchema(CollapseRequestSchema, data, 'collapseRequest');
}

export function validateCollapseResponse(data: unknown): CollapseResponse {
  return parseWithSchema(CollapseResponseSchema, data, 'collapseResponse');
}

export function validatePhaseConsequenceRequest(data: unknown): PhaseConsequenceRequest {
  return parseWithSchema(PhaseConsequenceRequestSchema, data, 'phaseConsequenceRequest');
}

export function validatePhaseConsequenceResponse(data: unknown): PhaseConsequenceResponse {
  return parseWithSchema(PhaseConsequenceResponseSchema, data, 'phaseConsequenceResponse');
}

export function validateAuditQuestionSet(data: unknown): AuditQuestionSet {
  return parseWithSchema(AuditQuestionSetSchema, data, 'auditQuestionSet');
}

export function validateRuntimeSessionsFile(data: unknown): RuntimeSessionsFile {
  return assertRuntimeSessionsFileConsistency(
    parseWithSchema(RuntimeSessionsFileSchema, data, 'runtimeSessionsFile'),
  );
}

export function validateWeaverImportPayload(data: unknown): WeaverImportPayload {
  return parseWithSchema(WeaverImportPayloadSchema, data, 'weaverImportPayload');
}

export function validateWeaverImportSummary(data: unknown): WeaverImportSummary {
  return parseWithSchema(WeaverImportSummarySchema, data, 'weaverImportSummary');
}
