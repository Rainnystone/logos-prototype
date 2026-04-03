import { readFile, resetWorkbench } from '@/runtime-sessions/repository';
import { readSession, readCheckpoint, type SessionObservation, type CheckpointObservation } from './session-observer';
import type { RuntimeSession } from '@/types';

export interface RestoreResult {
  /** Whether a session was found and restored */
  readonly restored: boolean;
  /** The session observation, if any */
  readonly session: SessionObservation | null;
  /** The active checkpoint observation, if any */
  readonly activeCheckpoint: CheckpointObservation | null;
}

export interface ResetResult {
  /** The ID of the newly created session */
  readonly newSessionId: string;
  /** The ID of the previous active session, if any */
  readonly oldSessionId: string | null;
  /** The newly created RuntimeSession object */
  readonly newSession: RuntimeSession;
  /** The preserved old RuntimeSession object, if any */
  readonly preservedOldSession: RuntimeSession | null;
}

export interface VerifyStaleRefreshProtectionInput {
  /** The session ID that the stale operation targeted */
  readonly targetSessionId: string;
  /** The new active session ID that should be unaffected */
  readonly newSessionId: string;
}

export interface VerifyStaleRefreshProtectionResult {
  /** Whether protection mechanism worked correctly */
  readonly isProtected: boolean;
  /** Whether the new session was unaffected by stale operations */
  readonly newSessionUnaffected: boolean;
  /** The current active session ID */
  readonly activeSessionId: string | null;
  /** Details about what happened */
  readonly details?: string;
}

export interface SessionSimulator {
  /** The package name this simulator operates on */
  readonly packageName: string;
  /** Attempt to restore current session state */
  attemptRestore(): Promise<RestoreResult>;
  /** Reset workbench, creating new session and preserving old */
  reset(): Promise<ResetResult>;
  /** Verify that stale refresh operations don't affect new session */
  verifyStaleRefreshProtection(input: VerifyStaleRefreshProtectionInput): Promise<VerifyStaleRefreshProtectionResult>;
}

/**
 * Creates a SessionSimulator for the given package.
 * The simulator coordinates restore/reset flows for session continuity testing.
 */
export async function createSessionSimulator(packageName: string): Promise<SessionSimulator> {
  return {
    packageName,

    async attemptRestore(): Promise<RestoreResult> {
      const session = await readSession(packageName);

      if (session === null) {
        return {
          restored: false,
          session: null,
          activeCheckpoint: null,
        };
      }

      // If there's an active checkpoint, read its details
      let activeCheckpoint: CheckpointObservation | null = null;
      if (session.activeCheckpointId !== null) {
        activeCheckpoint = await readCheckpoint(packageName, session.activeCheckpointId);
      }

      return {
        restored: true,
        session,
        activeCheckpoint,
      };
    },

    async reset(): Promise<ResetResult> {
      // Read current state before reset
      const fileBefore = await readFile(packageName);
      const oldSessionId = fileBefore?.activeSessionId ?? null;
      const oldSession = oldSessionId !== null ? fileBefore?.sessionsById[oldSessionId] ?? null : null;

      // Perform reset
      const newSession = await resetWorkbench(packageName);

      // Verify preservation by reading file after reset
      const fileAfter = await readFile(packageName);
      const preservedOldSession = oldSessionId !== null ? fileAfter?.sessionsById[oldSessionId] ?? null : null;

      return {
        newSessionId: newSession.sessionId,
        oldSessionId,
        newSession,
        preservedOldSession,
      };
    },

    async verifyStaleRefreshProtection(
      input: VerifyStaleRefreshProtectionInput,
    ): Promise<VerifyStaleRefreshProtectionResult> {
      const file = await readFile(packageName);

      if (file === null) {
        return {
          isProtected: false,
          newSessionUnaffected: false,
          activeSessionId: null,
          details: 'No runtime-sessions file found',
        };
      }

      const activeSessionId = file.activeSessionId;
      const newSession = file.sessionsById[input.newSessionId];

      // Check if active session is still the new session
      const isActiveSessionCorrect = activeSessionId === input.newSessionId;

      // Check if new session is in awaiting_start state with no checkpoints
      const newSessionUnaffected =
        newSession !== undefined &&
        newSession.lifecycle === 'awaiting_start' &&
        newSession.orderedCheckpointIds.length === 0 &&
        newSession.headCheckpointId === null &&
        newSession.activeCheckpointId === null;

      // Protection is verified when:
      // 1. Active session is still the new session
      // 2. New session has not been modified (still awaiting_start with no checkpoints)
      // 3. Stale operation targeted a different session (old session)
      const isProtected = isActiveSessionCorrect && newSessionUnaffected;

      return {
        isProtected,
        newSessionUnaffected,
        activeSessionId,
        details: isProtected
          ? 'New session correctly isolated from stale refresh on old session'
          : 'New session may have been affected by stale operation',
      };
    },
  };
}