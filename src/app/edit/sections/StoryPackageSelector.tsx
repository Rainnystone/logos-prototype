import Link from 'next/link';

import type { StoryPackageManagementPackageItem } from '@/types';

function isReadyPackageItem(
  item: StoryPackageManagementPackageItem,
): item is Extract<StoryPackageManagementPackageItem, { sceneName: string }> {
  return Object.prototype.hasOwnProperty.call(item, 'sceneName');
}

interface StoryPackageSelectorProps {
  readonly packageName: string;
  readonly packages: readonly StoryPackageManagementPackageItem[];
}

export function StoryPackageSelector({ packageName, packages }: StoryPackageSelectorProps) {
  return (
    <aside className="story-package-selector panel" aria-label="Story package selector">
      <div className="story-package-selector__list">
        {packages.map((item) =>
          isReadyPackageItem(item) ? (
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
          ) : (
            <article key={item.packageName} className="story-package-selector__card story-package-selector__card--error">
              <p className="panel-eyebrow">{item.packageName}</p>
              <h4>无法加载</h4>
              <p>{item.error}</p>
            </article>
          ),
        )}
      </div>
    </aside>
  );
}
