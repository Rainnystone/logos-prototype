import type { StoryPackageManagementWorkspaceView } from '@/types';
import { StoryPackageSelector } from '@/app/edit/sections/StoryPackageSelector';
import { StorylineWorkspaceRow } from '@/app/edit/sections/StorylineWorkspaceRow';

interface StoryPackageManagementSectionProps {
  readonly packageName: string;
  readonly view: StoryPackageManagementWorkspaceView;
}

export function StoryPackageManagementSection({
  packageName,
  view,
}: StoryPackageManagementSectionProps) {
  return (
    <section className="story-package-management panel" aria-label="Story package management">
      <div className="story-package-management__intro">
        <div>
          <p className="panel-eyebrow">当前页</p>
          <h2>故事包管理</h2>
          <p className="panel-note">左侧切换故事包，右侧检查故事线头部、来源和轨道摘要。</p>
        </div>
        <div className="story-package-management__meta" aria-label="Package summary">
          <span>{view.packageName}</span>
          <span>{view.storylines.length} 条故事线</span>
        </div>
      </div>

      <div className="story-package-management__layout">
        <StoryPackageSelector packageName={packageName} packages={view.packages} />

        <section className="story-package-management__workspace" aria-label="Storyline workspace">
          <div className="story-package-management__workspace-header">
            <div>
              <p className="panel-eyebrow">工作区</p>
              <h3>{view.packageName}</h3>
              <p className="panel-note">当前故事包的故事线状态会在这里按行展开。</p>
            </div>
          </div>

          <div className="story-package-management__rows">
            {view.storylines.map((row) => (
              <StorylineWorkspaceRow key={row.storylineId} packageName={packageName} row={row} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
