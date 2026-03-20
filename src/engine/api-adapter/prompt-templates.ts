import type { CollapseInput } from '@/engine/types/adapter-interface';
import type { AuditPacket, HistoryEntry, PhaseConsequenceRequest, PromptObject } from '@/types';

function formatHistory(entries: readonly HistoryEntry[]): string {
  if (entries.length === 0) {
    return 'No preceding beats.';
  }

  return entries.map((entry, index) => `${index + 1}. ${entry.role}: ${entry.content}`).join('\n');
}

function formatConsequences(consequences: readonly string[] | undefined): string {
  if (!consequences || consequences.length === 0) {
    return 'No accepted phase consequences are available yet. Infer the first reachable boundaries directly from the scene direction.';
  }

  return consequences.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

export function buildGenerateSystemPrompt(prompt: PromptObject): string {
  return [
    '[World Base]',
    `Main characters: ${prompt.worldBase.mainCharacters}`,
    `NPC characters: ${prompt.worldBase.npcCharacters || 'none'}`,
    `Location patch: ${prompt.worldBase.locationPatch}`,
    '',
    '[Narrative Axis]',
    `Main axis: ${prompt.narrative.mainAxis}`,
    `End line: ${prompt.narrative.endLine}`,
    `Current phase goal: ${prompt.narrative.phaseGoal}`,
    `Light-cone boundaries: Alpha=${prompt.narrative.alpha} | Beta=${prompt.narrative.beta}`,
    '',
    'Return a JSON object with keys "beatText" and "options" (exactly 4 strings).',
  ].join('\n');
}

export function buildGenerateFinalUserMessage(prompt: PromptObject): string {
  const directorBlock = [
    '[Director Note - Highest Priority]',
    `Volume: ${prompt.directorNote.volume}`,
    `Router: ${prompt.directorNote.router}`,
    `Verb lexicon: ${prompt.directorNote.verbLexicon.join(', ')}`,
    `Beat constraints: ${prompt.directorNote.beatConstraints}`,
    `Option constraints: ${prompt.directorNote.optionConstraints}`,
  ].join('\n');

  if (!prompt.generationControl?.isRewrite) {
    return directorBlock;
  }

  const previousOptions = prompt.generationControl.previousDraft?.options
    .map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)
    .join('\n');

  return [
    directorBlock,
    '---',
    '[Rewrite Control]',
    `Retry count: ${prompt.generationControl.retryCount}`,
    `Rewrite feedback: ${prompt.generationControl.rewriteFeedback ?? 'none'}`,
    `Previous beat draft: ${prompt.generationControl.previousDraft?.beatText ?? 'none'}`,
    `Previous options:\n${previousOptions ?? 'none'}`,
  ].join('\n');
}

export function buildAuditSystemPrompt(): string {
  return [
    'You are the LOGOS audit module.',
    'Return JSON only in the form {"answers":[true,false,...]}.',
    'Each answer must be a boolean and the number of answers must match the number of audit questions.',
  ].join('\n');
}

export function buildAuditUserPrompt(packet: AuditPacket): string {
  return [
    '[Preceding Beats]',
    formatHistory(packet.context.precedingBeats),
    '',
    '[Generated Beat]',
    packet.generatedContent.beatText,
    '',
    '[Generated Options]',
    packet.generatedContent.options
      .map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)
      .join('\n'),
    '',
    '[Audit Questions]',
    packet.auditQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n'),
  ].join('\n');
}

export function buildSettlementSystemPrompt(): string {
  return [
    'You are the LOGOS phase consequence settlement module.',
    'Return JSON only in the form {"phaseConsequences":["..."],"settlementTrace":"..."}.',
    'Keep only accepted facts, use complete factual statements, and do not infer alpha or beta boundaries.',
  ].join('\n');
}

export function buildSettlementUserPrompt(packet: PhaseConsequenceRequest): string {
  return [
    '[Scene Direction]',
    `Main axis: ${packet.context.mainAxis}`,
    `End line: ${packet.context.endLine}`,
    `Completed phase goal: ${packet.context.phaseGoal}`,
    `Scene progress: ${packet.context.sceneProgress ?? 'not provided'}`,
    `Current phase index: ${packet.context.currentPhaseIndex ?? 'not provided'}`,
    '',
    '[Accepted Phase Transcript]',
    packet.phaseTranscript
      .map((entry, index) => `${index + 1}. ${entry.role}: ${entry.content}`)
      .join('\n'),
    '',
    'Summarize the transcript into phaseConsequences[].',
  ].join('\n');
}

export function buildCollapseSystemPrompt(): string {
  return [
    'You are the LOGOS light-cone collapse module.',
    'Return JSON only in the form {"alpha":"...","beta":"...","inferenceTrace":"..."}.',
    'Alpha and beta must remain concrete reachable boundaries aligned to the scene end line.',
  ].join('\n');
}

export function buildCollapseUserPrompt(request: CollapseInput): string {
  const currentBoundaries =
    'currentAlpha' in request.context && 'currentBeta' in request.context
      ? [`Alpha: ${request.context.currentAlpha}`, `Beta: ${request.context.currentBeta}`].join(
          '\n',
        )
      : 'Current boundaries are not available yet.';

  return [
    '[Scene Direction]',
    `Main axis: ${request.context.mainAxis}`,
    `End line: ${request.context.endLine}`,
    `Scene progress: ${request.context.sceneProgress ?? 'not provided'}`,
    `Completed phase goal: ${request.context.completedPhaseGoal ?? 'not provided'}`,
    '',
    '[Current Boundaries]',
    currentBoundaries,
    '',
    '[Phase Consequences]',
    formatConsequences(request.phaseConsequences),
    '',
    'Re-infer the next reachable alpha and beta boundaries.',
  ].join('\n');
}
