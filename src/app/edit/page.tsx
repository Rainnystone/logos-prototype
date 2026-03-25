import Link from 'next/link';

import { SECTION_IDS, type SectionId } from '@/authoring/contracts';
import { loadAuthoringState } from '@/authoring/persistence/package-state';
import {
  isReadyStoryPackageEntry,
  listStoryPackageCatalog,
} from '@/app/story-package-catalog';
import { EditWorkbench } from '@/app/edit/EditWorkbench';

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

export default async function EditPage({ searchParams }: EditPageProps) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const catalog = await listStoryPackageCatalog();
  const requestedPackageName = getRequestedPackageName(resolvedSearchParams.storyPackage);
  const requestedSection = getRequestedSectionId(resolvedSearchParams.section);
  const fallbackPackage = catalog.find(isReadyStoryPackageEntry);
  const selectedPackageName = requestedPackageName ?? fallbackPackage?.packageName ?? null;

  if (!selectedPackageName) {
    return (
      <main className="workspace-page">
        <section className="panel selector-card selector-card--error">
          <p className="panel-eyebrow">Authoring Editor</p>
          <h1>No loadable story package was found.</h1>
          <Link className="primary-link" href="/">
            Return to Sample Dashboard
          </Link>
        </section>
      </main>
    );
  }

  try {
    const authoringState = await loadAuthoringState(selectedPackageName);

    return (
      <EditWorkbench
        packageName={selectedPackageName}
        activeSection={requestedSection ?? 'worldbase-cast'}
        initialState={authoringState}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load the selected story package.';

    return (
      <main className="workspace-page">
        <section className="panel selector-card selector-card--error">
          <p className="panel-eyebrow">Authoring Editor</p>
          <h1>Package Load Failed</h1>
          <p>{message}</p>
          <Link className="primary-link" href="/">
            Return to Sample Dashboard
          </Link>
        </section>
      </main>
    );
  }
}
