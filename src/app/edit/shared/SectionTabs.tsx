import Link from 'next/link';

import { SECTION_IDS, type SectionId } from '@/authoring/contracts';

const SECTION_LABELS: Record<SectionId, string> = {
  'worldbase-cast': '世界与角色',
  'scene-phase-authoring': '场景与阶段',
  'control-modules': '控制模块',
  'package-wiring-validation': '控制台',
};

interface SectionTabsProps {
  readonly packageName: string;
  readonly activeSection: SectionId;
}

export function SectionTabs({ packageName, activeSection }: SectionTabsProps) {
  return (
    <nav className="edit-top-tabs" aria-label="Editor sections">
      {SECTION_IDS.map((sectionId) => {
        const isActive = sectionId === activeSection;

        return (
          <Link
            key={sectionId}
            className={isActive ? 'edit-top-tab edit-top-tab--active' : 'edit-top-tab'}
            href={`/edit?storyPackage=${encodeURIComponent(packageName)}&section=${sectionId}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {SECTION_LABELS[sectionId]}
          </Link>
        );
      })}
    </nav>
  );
}
