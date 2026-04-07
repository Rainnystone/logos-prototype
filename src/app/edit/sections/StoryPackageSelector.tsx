import Link from 'next/link';

import type { StoryPackageManagementPackageItem } from '@/types';

function isReadyPackageItem(
  item: StoryPackageManagementPackageItem,
): item is Extract<StoryPackageManagementPackageItem, { sceneName: string }> {
  return Object.prototype.hasOwnProperty.call(item, 'sceneName');
}

function isErrorPackageItem(
  item: StoryPackageManagementPackageItem,
): item is Extract<StoryPackageManagementPackageItem, { error: string }> {
  return Object.prototype.hasOwnProperty.call(item, 'error');
}

interface StoryPackageSelectorProps {
  readonly packageName: string;
  readonly packages: readonly StoryPackageManagementPackageItem[];
  readonly createPackageDisabled: boolean;
  readonly onCreatePackage: () => void;
}

export function StoryPackageSelector({
  packageName,
  packages,
  createPackageDisabled,
  onCreatePackage,
}: StoryPackageSelectorProps) {
  const readyPackages = packages.filter(isReadyPackageItem);
  const errorPackages = packages.filter(isErrorPackageItem);

  return (
    <aside className="story-package-selector panel" aria-label="Story package selector">
      <div className="story-package-selector__list">
        {readyPackages.map((item) => (
          <article
            key={item.packageName}
            className={`story-package-selector__card ${
              item.packageName === packageName ? 'story-package-selector__card--active' : ''
            }`}
          >
            <Link
              className="story-package-selector__link"
              href={`/edit?storyPackage=${encodeURIComponent(item.packageName)}&section=story-package-management`}
              aria-current={item.packageName === packageName ? 'page' : undefined}
              aria-label={item.packageName}
            >
              <span className="story-package-selector__link-label">{item.packageName}</span>
            </Link>
          </article>
        ))}

        <article className="story-package-selector__card story-package-selector__card--create">
          <button
            type="button"
            className="story-package-selector__create-button"
            aria-label="新建故事包"
            disabled={createPackageDisabled}
            onClick={onCreatePackage}
          >
            <span className="story-package-selector__create-mark" aria-hidden="true">
              +
            </span>
            <span className="story-package-selector__create-label">新建故事包</span>
          </button>
        </article>

        {errorPackages.map((item) => (
          <article
            key={item.packageName}
            className="story-package-selector__card story-package-selector__card--error"
          >
            <p className="panel-eyebrow">{item.packageName}</p>
            <h4>无法加载</h4>
            <p>{item.error}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
