import Link from 'next/link';

import { SECTION_IDS, type SectionId } from '@/authoring/contracts';

const SECTION_LABELS: Record<SectionId, string> = {
  'worldbase-cast': 'WorldBase & Cast',
  'scene-phase-authoring': 'Scene & Phase Authoring',
  'control-modules': 'Control Modules',
  'package-wiring-validation': 'Package Wiring Validation',
};

interface SectionTabsProps {
  readonly packageName: string;
  readonly activeSection: SectionId;
}

export function SectionTabs({ packageName, activeSection }: SectionTabsProps) {
  return (
    <nav className="panel edit-tabs" aria-label="Editor sections">
      {SECTION_IDS.map((sectionId) => {
        const isActive = sectionId === activeSection;

        return (
          <Link
            key={sectionId}
            className={isActive ? 'edit-tab edit-tab--active' : 'edit-tab'}
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
