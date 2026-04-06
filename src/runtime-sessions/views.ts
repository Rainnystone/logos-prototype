import {
  EDIT_RUNTIME_CONTINUITY_UNAVAILABLE_REASON,
  PLAY_RUNTIME_CONTINUITY_UNAVAILABLE_REASON,
} from '@/runtime-sessions/copy';
import { resolveActiveStorylineContext } from '@/storylines/substrate';
import type { RuntimeCheckpoint, RuntimeSessionLifecycle, StateSnapshot } from '@/types';

export interface RuntimeRelationshipSummary {
  readonly highlightedDeltasText: string;
  readonly stableBackgroundText: string;
  readonly source: 'session' | 'checkpoint' | 'empty';
}

export interface PlayRuntimeSessionView {
  readonly kind: 'empty' | 'awaiting_start' | 'restorable' | 'unavailable';
  readonly activeSessionId: string | null;
  readonly activeCheckpointId: string | null;
  readonly beatHistory: readonly {
    readonly beatNumber: number;
    readonly playerInput: string;
    readonly beatText: string;
  }[];
  readonly stateSnapshot: StateSnapshot | null;
  readonly relationshipSummary: RuntimeRelationshipSummary;
  readonly lifecycle: RuntimeSessionLifecycle | null;
  readonly reason?: string;
}

export interface EditRuntimeContinuityView {
  readonly kind: 'empty' | 'active' | 'unavailable';
  readonly activeSession: {
    readonly sessionId: string;
    readonly lifecycle: RuntimeSessionLifecycle;
    readonly activeCheckpointId: string | null;
    readonly acceptedBeatCount: number;
    readonly relationshipStatus: RuntimeRelationshipSummary;
  } | null;
  readonly reason?: string;
}

const emptyRelationshipSummary: RuntimeRelationshipSummary = {
  highlightedDeltasText: '',
  stableBackgroundText: '',
  source: 'empty',
};

function hasRelationshipContent(layer: {
  readonly highlightedDeltasText: string;
  readonly stableBackgroundText: string;
}): boolean {
  return (
    layer.highlightedDeltasText.trim().length > 0 || layer.stableBackgroundText.trim().length > 0
  );
}

function deriveRelationshipSummary(
  sessionLayer: {
    readonly highlightedDeltasText: string;
    readonly stableBackgroundText: string;
  },
  checkpointLayer: {
    readonly highlightedDeltasText: string;
    readonly stableBackgroundText: string;
  } | null,
): RuntimeRelationshipSummary {
  if (hasRelationshipContent(sessionLayer)) {
    return {
      highlightedDeltasText: sessionLayer.highlightedDeltasText,
      stableBackgroundText: sessionLayer.stableBackgroundText,
      source: 'session',
    };
  }

  if (checkpointLayer && hasRelationshipContent(checkpointLayer)) {
    return {
      highlightedDeltasText: checkpointLayer.highlightedDeltasText,
      stableBackgroundText: checkpointLayer.stableBackgroundText,
      source: 'checkpoint',
    };
  }

  return emptyRelationshipSummary;
}

function buildBeatHistory(
  checkpoints: readonly RuntimeCheckpoint[],
): PlayRuntimeSessionView['beatHistory'] {
  return checkpoints.map((checkpoint) => ({
    beatNumber: checkpoint.acceptedBeatOrdinal,
    playerInput: checkpoint.acceptedTranscript.playerInput,
    beatText: checkpoint.acceptedTranscript.beatText,
  }));
}

function buildUnavailableView(): PlayRuntimeSessionView {
  return {
    kind: 'unavailable',
    activeSessionId: null,
    activeCheckpointId: null,
    beatHistory: [],
    stateSnapshot: null,
    relationshipSummary: emptyRelationshipSummary,
    lifecycle: null,
    reason: PLAY_RUNTIME_CONTINUITY_UNAVAILABLE_REASON,
  };
}

export async function loadPlayRuntimeSessionView(packageName: string): Promise<PlayRuntimeSessionView> {
  try {
    const context = await resolveActiveStorylineContext(packageName, {
      forWrite: false,
    });
    const activeSession = context.session;

    if (!activeSession) {
      return {
        kind: 'empty',
        activeSessionId: null,
        activeCheckpointId: null,
        beatHistory: [],
        stateSnapshot: null,
        relationshipSummary: emptyRelationshipSummary,
        lifecycle: null,
      };
    }

    const activeCheckpoint = activeSession.activeCheckpointId
      ? activeSession.checkpointsById[activeSession.activeCheckpointId] ?? null
      : null;
    const orderedCheckpoints = activeSession.orderedCheckpointIds
      .map((checkpointId) => activeSession.checkpointsById[checkpointId])
      .filter((checkpoint): checkpoint is RuntimeCheckpoint => Boolean(checkpoint));
    const relationshipSummary = deriveRelationshipSummary(
      activeSession.lastStableRelationshipLayer,
      activeCheckpoint?.lastStableRelationshipLayer ?? null,
    );

    if (!activeCheckpoint) {
      return {
        kind: 'awaiting_start',
        activeSessionId: context.storyline.activeSessionId ?? activeSession.sessionId,
        activeCheckpointId: null,
        beatHistory: buildBeatHistory(orderedCheckpoints),
        stateSnapshot: null,
        relationshipSummary,
        lifecycle: activeSession.lifecycle,
      };
    }

    return {
      kind: 'restorable',
      activeSessionId: context.storyline.activeSessionId ?? activeSession.sessionId,
      activeCheckpointId: activeCheckpoint.checkpointId,
      beatHistory: buildBeatHistory(orderedCheckpoints),
      stateSnapshot: activeCheckpoint.stateSnapshot,
      relationshipSummary,
      lifecycle: activeSession.lifecycle,
    };
  } catch {
    return buildUnavailableView();
  }
}

export async function loadEditRuntimeContinuityView(
  packageName: string,
): Promise<EditRuntimeContinuityView> {
  const playView = await loadPlayRuntimeSessionView(packageName);

  if (playView.kind === 'unavailable') {
    return {
      kind: 'unavailable',
      activeSession: null,
      reason: EDIT_RUNTIME_CONTINUITY_UNAVAILABLE_REASON,
    };
  }

  if (!playView.activeSessionId) {
    return {
      kind: 'empty',
      activeSession: null,
    };
  }

  if (playView.relationshipSummary.source === 'empty') {
    return {
      kind: 'empty',
      activeSession: null,
    };
  }

  if (!playView.lifecycle) {
    return {
      kind: 'unavailable',
      activeSession: null,
      reason: EDIT_RUNTIME_CONTINUITY_UNAVAILABLE_REASON,
    };
  }

  return {
    kind: 'active',
    activeSession: {
      sessionId: playView.activeSessionId,
      lifecycle: playView.lifecycle,
      activeCheckpointId: playView.activeCheckpointId,
      acceptedBeatCount: playView.beatHistory.length,
      relationshipStatus: playView.relationshipSummary,
    },
  };
}
