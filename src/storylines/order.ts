import type { StoryPackageManagementStorylineRowView } from '@/types';

export function compareStorylineRowsForWorkspace(
  left: StoryPackageManagementStorylineRowView,
  right: StoryPackageManagementStorylineRowView,
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
