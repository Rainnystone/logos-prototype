import type {
  CollapseInput,
  GossipelogInjectionRequest,
  GossipelogUpdateRequest,
  RouteRequest,
  WeaverImportRequest,
} from '@/engine/types/adapter-interface';
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

function formatRoleDefinitions(roleDefinitions: GossipelogUpdateRequest['roleDefinitions']): string {
  if (roleDefinitions.length === 0) {
    return 'No role definitions were supplied.';
  }

  return roleDefinitions
    .map(
      (role, index) =>
        `${index + 1}. ${role.characterId} | ${role.name} | ${role.identityRole}\n   Trait: ${role.lightNovelTrait}\n   Boundaries: capability=${role.capabilityBoundary}; behavior=${role.behaviorBoundary}; ooc=${role.oocRedLine}`,
    )
    .join('\n');
}

function formatRelationshipSubgraph(subgraph: GossipelogUpdateRequest['relationshipSubgraph']): string {
  return JSON.stringify(subgraph, null, 2);
}

function formatSceneCastFraming(
  framing: GossipelogUpdateRequest['sceneCastFraming'],
): string {
  return [
    `Scene ID: ${framing.sceneId}`,
    `Cast role IDs: ${framing.castRoleIds.join(', ') || 'none'}`,
  ].join('\n');
}

function formatRouters(request: RouteRequest): string {
  return request.availableRouters
    .map(
      (router, index) =>
        `${index + 1}. ${router.routerName}\n   Semantic core: ${router.routerSemanticCore}\n   Verb lexicon: ${router.verbLexicon.join(', ')}`,
    )
    .join('\n');
}

function formatResolvedReferences(
  resolvedReferences: WeaverImportRequest['resolvedReferences'],
): string {
  if (resolvedReferences.length === 0) {
    return 'No external references were resolved.';
  }

  return resolvedReferences
    .map(
      (reference, index) =>
        [
          `${index + 1}. ${reference.injectionLabel} (${reference.referenceId})`,
          `Path: ${reference.relativePath}`,
          `Estimated tokens: ${reference.estimatedTokens}`,
          'Contents:',
          reference.contents,
        ].join('\n'),
    )
    .join('\n\n');
}

export function buildGenerateSystemPrompt(prompt: PromptObject): string {
  const worldBaseLines = [
    '[World Base]',
    `Main characters: ${prompt.worldBase.mainCharacters}`,
    `NPC characters: ${prompt.worldBase.npcCharacters || 'none'}`,
  ];

  if (prompt.worldBase.locationPatch.trim()) {
    worldBaseLines.push(`Location patch: ${prompt.worldBase.locationPatch}`);
  }

  return [
    'You are LOGOS, a controlled interactive fiction storyteller.',
    'Act with narrative initiative inside the supplied boundaries and make full use of the provided story resources.',
    'Turn the supplied canon, history, phase goal, and later control signals into concrete scene progression instead of passively restating them.',
    'Do not invent new control conditions or override any later high-priority constraints.',
    '',
    '[Player Input Boundary]',
    'If player free input severely violates the established world base, the protagonist characterization, or the protagonist OOC red lines, treat that input only as a fleeting internal impulse, inner thought, or self-directed complaint.',
    'It must not execute as a real in-world action.',
    'Instead, infer the protagonist\'s actual outward behavior from the current context and continue the beat with actions that remain fully consistent with the established constraints.',
    'The blocked impulse may still surface inside the narration as internal monologue or self-directed commentary, but it cannot become enacted behavior.',
    '',
    ...worldBaseLines,
    '',
    '[Dynamic Relationship Layer]',
    `Highlighted deltas: ${prompt.relationshipLayer?.highlightedDeltasText || 'none'}`,
    `Stable background: ${prompt.relationshipLayer?.stableBackgroundText || 'none'}`,
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

export function buildGossipelogUpdateSystemPrompt(): string {
  return [
    'You are the LOGOS gossipelog relationship-update skill.',
    'Return JSON only with keys "involvedRoleIds", "invocationNoOp", and "edgeUpdates".',
    'Use only the supplied scene cast, role definitions, accepted beat text, and relationship subgraph.',
    'Do not invent new role IDs or update edges outside the provided candidate set.',
    'Set invocationNoOp to true only when the beat does not justify any relationship change.',
    'When invocationNoOp is true, edgeUpdates must be an empty array.',
    'When invocationNoOp is false, edgeUpdates must contain one or more structured edge updates.',
    'For any new edge, provide a thin baseline and a recent delta.',
  ].join('\n');
}

export function buildGossipelogUpdateUserPrompt(request: GossipelogUpdateRequest): string {
  return [
    '[Accepted Beat]',
    `Round ID: ${request.roundId}`,
    `Beat text: ${request.acceptedBeatText}`,
    '',
    '[Scene Cast]',
    `Scene cast role IDs: ${request.sceneCastRoleIds.join(', ') || 'none'}`,
    formatSceneCastFraming(request.sceneCastFraming),
    '',
    '[Candidate Roles]',
    formatRoleDefinitions(request.candidateRoles),
    '',
    '[Role Definitions]',
    formatRoleDefinitions(request.roleDefinitions),
    '',
    '[Relationship Subgraph]',
    formatRelationshipSubgraph(request.relationshipSubgraph),
  ].join('\n');
}

export function buildGossipelogInjectionSystemPrompt(): string {
  return [
    'You are the LOGOS gossipelog relationship-injection skill.',
    'Return JSON only with keys "highlightedDeltasText" and "stableBackgroundText".',
    'Use the supplied relationship subgraph and role definitions to rebuild prompt-ready relationship text.',
    'Keep highlighted deltas concise and current.',
    'Keep stable background focused on long-term baseline context.',
  ].join('\n');
}

export function buildGossipelogInjectionUserPrompt(
  request: GossipelogInjectionRequest,
): string {
  return [
    '[Scene Cast]',
    `Scene cast role IDs: ${request.sceneCastRoleIds.join(', ') || 'none'}`,
    formatSceneCastFraming(request.sceneCastFraming),
    '',
    '[Role Definitions]',
    formatRoleDefinitions(request.roleDefinitions),
    '',
    '[Relationship Subgraph]',
    formatRelationshipSubgraph(request.relationshipSubgraph),
  ].join('\n');
}

export function buildWeaverImportSystemPrompt(): string {
  return [
    'You are Weaver, the LOGOS sidecar import skill.',
    'You convert external author text into bounded import payloads for deterministic authoring bootstrap.',
    'Follow all provided references and output contract exactly.',
  ].join('\n');
}

export function buildWeaverImportUserPrompt(request: WeaverImportRequest): string {
  return [
    '[Instructions]',
    'attempt the fullest bounded extraction the text can support.',
    'Do not invent facts, but do not stop at minimal shapes when richer evidence-backed extraction is available.',
    'minimal shapes are fallback floors, not the preferred target.',
    '',
    '[Context]',
    `Package name hint: ${request.packageNameHint ?? 'not provided'}`,
    'Source text:',
    request.sourceText,
    '',
    '[Resolved References]',
    formatResolvedReferences(request.resolvedReferences),
    '',
    '[Output Contract]',
    'Return JSON only with keys:',
    'sourceSummary: required concise source-level summary.',
    'importSummary: required concise import-level summary.',
    'suggestedPackageName is only a display-name suggestion; deterministic code still owns final package slug/identity.',
    'openingHook is an extracted comparison field only; persisted scene openingHook still comes from the original source text.',
    'worldBase is a lightweight seed object with settingSummary, worldRules, toneBaseline, locationPatch, and npcCharactersSummary.',
    'hero: optional object with displayName required and roleSummary optional.',
    'coreCast / antagonists: arrays of objects with displayName required and roleSummary optional.',
    'npcCharacters[]: displayName required; summary and roleSummary optional.',
    'locations: array of objects with displayName required; summary optional.',
    'warnings / unresolvedGaps: compatibility fields only; use them sparingly and do not prefer them over extraction.',
    'Do not add extra keys.',
  ].join('\n');
}
