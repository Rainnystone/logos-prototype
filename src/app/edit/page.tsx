import Link from 'next/link';

import { SECTION_IDS, type SectionId } from '@/authoring/contracts';
import { loadAuthoringState } from '@/authoring/persistence/package-state';
import {
  isReadyStoryPackageEntry,
  listStoryPackageCatalog,
} from '@/app/story-package-catalog';
import { EditWorkbench } from '@/app/edit/EditWorkbench';
import type { WorldbaseSurface } from '@/app/edit/shared/SectionTabs';

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

function getRequestedSectionId(value: string | readonly string[] | undefined): SectionId | null {
  if (typeof value !== 'string') {
    return null;
  }

  return (SECTION_IDS as readonly string[]).includes(value) ? (value as SectionId) : null;
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

  const activeSection = requestedSection ?? 'worldbase-cast';

  try {
    const authoringState = await loadAuthoringState(selectedPackageName, {
      includeAgentSurfaceItems: activeSection === 'package-wiring-validation',
      includeRuntimeContinuity: activeSection === 'worldbase-cast',
    });
    const activeSurface =
      activeSection === 'worldbase-cast' ? requestedSurface : 'world';

    return (
      <EditWorkbench
        packageName={selectedPackageName}
        activeSection={activeSection}
        activeSurface={activeSurface}
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
