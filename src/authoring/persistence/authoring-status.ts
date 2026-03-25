import { readAuthoringState, type AuthoringState, writeAuthoringState } from '@/authoring/persistence/package-state';

export type AuthoringStatus = AuthoringState;

export async function readAuthoringStatus(packageName: string): Promise<AuthoringStatus | null> {
  return readAuthoringState(packageName);
}

export async function writeAuthoringStatus(
  packageName: string,
  status: AuthoringStatus,
): Promise<void> {
  await writeAuthoringState(packageName, status);
}
