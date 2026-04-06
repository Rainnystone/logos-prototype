import Link from 'next/link';

import { EDITOR_SECTION_IDS, type EditorSectionId } from '@/authoring/contracts';
import { loadAuthoringState } from '@/authoring/persistence/package-state';
import {
  isReadyStoryPackageEntry,
  listStoryPackageCatalog,
} from '@/app/story-package-catalog';
import { EditWorkbench } from '@/app/edit/EditWorkbench';
import type { WorldbaseSurface } from '@/app/edit/shared/SectionTabs';
import { resolveActiveStorylineContext } from '@/storylines/substrate';
import { loadStoryPackageManagementWorkspaceView } from '@/storylines/workspace-view';

type SearchParamsInput =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>
  | undefined;

interface EditPageProps {
  readonly searchParams?: SearchParamsInput;
}

async function resolveSearchParams(searchParams: SearchParamsInput) {
  return searchParams instanceof Promise ? searchParams : (searchParams ?? {});
}

function getRequestedPackageName(value: string | readonly string[] | undefined): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (Array.isArray(value) && value[0]) {
    return value[0];
  }

  return null;
}

function getRequestedSectionId(
  value: string | readonly string[] | undefined,
): EditorSectionId | null {
  if (typeof value !== 'string') {
    return null;
  }

  return (EDITOR_SECTION_IDS as readonly string[]).includes(value)
    ? (value as EditorSectionId)
    : null;
}

function getRequestedSurface(
  sectionValue: string | readonly string[] | undefined,
  surfaceValue: string | readonly string[] | undefined,
): WorldbaseSurface {
  if (sectionValue === 'worldbase-cast' && surfaceValue === 'character') {
    return 'character';
  }

  return 'world';
}

export default async function EditPage({ searchParams }: EditPageProps) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const catalog = await listStoryPackageCatalog();
  const requestedPackageName = getRequestedPackageName(resolvedSearchParams.storyPackage);
  const requestedSection = getRequestedSectionId(resolvedSearchParams.section);
  const requestedSurface = getRequestedSurface(
    resolvedSearchParams.section,
    resolvedSearchParams.surface,
  );
  const fallbackPackage = catalog.find(isReadyStoryPackageEntry);
  const selectedPackageName = requestedPackageName ?? fallbackPackage?.packageName ?? null;

  if (!selectedPackageName) {
    return (
      <main className="workspace-page">
        <section className="panel selector-card selector-card--error">
          <p className="panel-eyebrow">编辑器</p>
          <h1>未找到可加载的故事包。</h1>
          <Link className="primary-link" href="/">
            返回标题
          </Link>
        </section>
      </main>
    );
  }

  const activeSection = requestedSection ?? 'story-package-management';

  try {
    const storylineContext = await resolveActiveStorylineContext(selectedPackageName, {
      forWrite: false,
    });
    const [authoringState, storyPackageManagementView] = await Promise.all([
      loadAuthoringState(selectedPackageName, {
        includeAgentSurfaceItems: activeSection === 'package-wiring-validation',
        includeRuntimeContinuity: activeSection === 'worldbase-cast',
        storylineContext,
      }),
      activeSection === 'story-package-management'
        ? loadStoryPackageManagementWorkspaceView(selectedPackageName, {
            packages: catalog,
            storylineContext,
          })
        : Promise.resolve(undefined),
    ]);
    const activeSurface =
      activeSection === 'worldbase-cast' ? requestedSurface : 'world';

    return (
      <EditWorkbench
        packageName={selectedPackageName}
        activeSection={activeSection}
        activeSurface={activeSurface}
        {...(storyPackageManagementView
          ? { storyPackageManagementView }
          : {})}
        initialState={authoringState}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '无法加载所选故事包。';

    return (
      <main className="workspace-page">
        <section className="panel selector-card selector-card--error">
          <p className="panel-eyebrow">编辑器</p>
          <h1>故事包加载失败</h1>
          <p>加载失败：{message}</p>
          <Link className="primary-link" href="/">
            返回标题
          </Link>
        </section>
      </main>
    );
  }
}
