export interface StorylineWorkspaceSortableRow {
  readonly isActive: boolean;
  readonly displayName: string;
  readonly storylineId: string;
}

export function compareStorylineRowsForWorkspace(
  left: StorylineWorkspaceSortableRow,
  right: StorylineWorkspaceSortableRow,
): number {
  if (left.isActive !== right.isActive) {
    return left.isActive ? -1 : 1;
  }

  const nameComparison = left.displayName.localeCompare(right.displayName);
  if (nameComparison !== 0) {
    return nameComparison;
  }

  return left.storylineId.localeCompare(right.storylineId);
}
