import {
  AuditPacketSchema,
  AuditQuestionSetSchema,
  CollapseRequestSchema,
  CollapseResponseSchema,
  PhaseConsequenceRequestSchema,
  PhaseConsequenceResponseSchema,
  PhasePlanSchema,
  PromptObjectSchema,
  StateSnapshotSchema,
  type AuditPacket,
  type AuditQuestionSet,
  type CollapseRequest,
  type CollapseResponse,
  type PhaseConsequenceRequest,
  type PhaseConsequenceResponse,
  type PhasePlan,
  type PromptObject,
  type StateSnapshot,
} from '@/types';
import { parseWithSchema } from '@/lib/validation';

export function validatePromptObject(data: unknown): PromptObject {
  return parseWithSchema(PromptObjectSchema, data, 'promptObject');
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
