import type { CollapseInput, RouteRequest } from '@/engine/types/adapter-interface';
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

function formatRouters(request: RouteRequest): string {
  return request.availableRouters
    .map(
      (router, index) =>
        `${index + 1}. ${router.routerName}\n   Semantic core: ${router.routerSemanticCore}\n   Verb lexicon: ${router.verbLexicon.join(', ')}`,
    )
    .join('\n');
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
    'Return JSON only with keys "beatText" and "options".',
    'The "beatText" field must be a complete adventure turn, not a short summary.',
    'Target a beatText length of roughly 1500-2500 Chinese characters, with natural paragraph breaks.',
    'Paragraph discipline is mandatory: beatText must be split into multiple readable paragraphs with visible pacing.',
    'A single oversized paragraph or visually dense unbroken wall of text is unacceptable and counts as a hard failure, even if the plot content is otherwise correct.',
    'Insert paragraph breaks whenever action focus, speaker, time step, or causal beat shifts.',
    'If unsure, prefer more paragraph breaks and shorter paragraphs over one long block.',
    'The "options" array must contain exactly 4 distinct action strings.',
    'Never omit, rename, or nest the options array.',
    'If output budget becomes tight, compress toward the lower end of the beatText range before dropping any option.',
  ].join('\n');
}

export function buildGenerateFinalUserMessage(prompt: PromptObject): string {
  const routeBlock = [
    '[Runtime Route State]',
    `Active router: ${prompt.directorNote.router}`,
    `Active verb lexicon: ${prompt.directorNote.verbLexicon.join(', ')}`,
    'Option route discipline: keep all 4 options inside the active router and map them to 4 distinct directions drawn from the active verb lexicon.',
  ].join('\n');
  const directorBlock = [
    '[Director Note - Highest Priority]',
    `Volume: ${prompt.directorNote.volume}`,
    `Beat constraints: ${prompt.directorNote.beatConstraints}`,
    `Option constraints: ${prompt.directorNote.optionConstraints}`,
  ].join('\n');

  if (!prompt.generationControl?.isRewrite) {
    return [routeBlock, directorBlock].join('\n');
  }

  const previousOptions = prompt.generationControl.previousDraft?.options
    .map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)
    .join('\n');

  return [
    routeBlock,
    directorBlock,
    '---',
    '[Audit Corrections - Immediate Repair Targets]',
    prompt.generationControl.rewriteFeedback ?? 'No audit correction targets were supplied.',
    '---',
    '[Rewrite Control]',
    `Retry count: ${prompt.generationControl.retryCount}`,
    `Previous beat draft: ${prompt.generationControl.previousDraft?.beatText ?? 'none'}`,
    `Previous options:\n${previousOptions ?? 'none'}`,
  ].join('\n');
}

export function buildRouteSystemPrompt(): string {
  return [
    'You are the LOGOS narrative router.',
    'Return JSON only in the form {"routerName":"...","inferenceTrace":"..."}.',
    'Choose exactly one router from the provided availableRouters list.',
    'Decide from the current round context: recent beat history, the latest local pressure, the current volume, and the phase goal.',
    'The router must constrain the next beat action space; do not summarize the story or invent a new router name.',
    'Keep inferenceTrace extremely short: one concise sentence only.',
    'Prefer terse control reasoning over explanation.',
  ].join('\n');
}

export function buildRouteUserPrompt(request: RouteRequest): string {
  return [
    '[Current Round State]',
    `Phase goal: ${request.context.phaseGoal}`,
    `Current volume: ${request.context.currentVolume}`,
    `Alpha boundary: ${request.context.alpha}`,
    `Beta boundary: ${request.context.beta}`,
    `Scene progress: ${request.context.sceneProgress ?? 'not provided'}`,
    `Phase routing prior: ${request.context.routerHint ?? 'not provided'}`,
    '',
    '[History Window]',
    formatHistory(request.historyWindow),
    '',
    '[Available Routers]',
    formatRouters(request),
    '',
    'Select the single best router for the next beat.',
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
    'Keep settlementTrace extremely short: one brief sentence only.',
    'If output budget becomes tight, shorten settlementTrace before dropping or compressing phaseConsequences.',
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
    'Definition lock:',
    '- Alpha: the most aggressive player-action boundary that still keeps end-line convergence possible.',
    '- Beta: the most passive player-action boundary that still keeps end-line convergence possible.',
    'Do not restate the main axis or end line verbatim as boundaries.',
    'Do not output event summaries; output actionable boundary constraints.',
    'Do not compress alpha or beta so far that control precision is lost.',
    'Alpha and beta may use multiple clauses when needed to preserve narrative control precision.',
    'Keep inferenceTrace extremely short: one brief sentence only.',
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
    'Re-infer the next reachable alpha and beta boundaries using the definition lock.',
  ].join('\n');
}
