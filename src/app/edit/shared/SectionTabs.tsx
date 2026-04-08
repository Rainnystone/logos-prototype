import Link from 'next/link';

import type { EditorSectionId } from '@/authoring/contracts';

const SECTION_LABELS: Record<Exclude<EditorSectionId, 'worldbase-cast'>, string> = {
  'story-package-management': '故事包管理',
  'scene-phase-authoring': '场景与阶段',
  'control-modules': '控制模块',
  'package-wiring-validation': 'agent 管理',
};

export type WorldbaseSurface = 'world' | 'character';

const EDIT_WORKSPACE_TABS = [
  {
    sectionId: 'story-package-management',
    label: SECTION_LABELS['story-package-management'],
  },
  {
    sectionId: 'worldbase-cast',
    label: '世界',
    surface: 'world',
  },
  {
    sectionId: 'worldbase-cast',
    label: '角色',
    surface: 'character',
  },
  {
    sectionId: 'scene-phase-authoring',
    label: SECTION_LABELS['scene-phase-authoring'],
  },
  {
    sectionId: 'control-modules',
    label: SECTION_LABELS['control-modules'],
  },
  {
    sectionId: 'package-wiring-validation',
    label: SECTION_LABELS['package-wiring-validation'],
  },
] as const;

interface SectionTabsProps {
  readonly packageName: string;
  readonly activeSection: EditorSectionId;
  readonly activeSurface: WorldbaseSurface;
}

function buildSectionHref(
  packageName: string,
  sectionId: EditorSectionId,
  surface?: WorldbaseSurface,
) {
  const encodedPackageName = encodeURIComponent(packageName);

  if (sectionId === 'worldbase-cast') {
    return `/edit?storyPackage=${encodedPackageName}&section=worldbase-cast&surface=${
      surface ?? 'world'
    }`;
  }

  return `/edit?storyPackage=${encodedPackageName}&section=${sectionId}`;
}

export function SectionTabs({ packageName, activeSection, activeSurface }: SectionTabsProps) {
  return (
    <nav className="edit-top-tabs" aria-label="Editor sections">
      {EDIT_WORKSPACE_TABS.map((tab) => {
        const surface = tab.sectionId === 'worldbase-cast' ? tab.surface : undefined;
        const isActive =
          tab.sectionId === activeSection && (tab.sectionId !== 'worldbase-cast' || surface === activeSurface);
        const href = buildSectionHref(packageName, tab.sectionId, surface);

        return (
          <Link
            key={`${tab.sectionId}-${tab.label}`}
            className={isActive ? 'edit-top-tab edit-top-tab--active' : 'edit-top-tab'}
            href={href}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
