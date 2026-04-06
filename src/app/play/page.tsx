import Link from 'next/link';

import { PlayWorkbench } from '@/app/play/PlayWorkbench';
import { isReadyStoryPackageEntry, listStoryPackageCatalog } from '@/app/story-package-catalog';
import { loadRuntimeStoryPackage } from '@/engine/story-loader';
import { loadPlayRuntimeSessionView } from '@/runtime-sessions/views';
import { resolveActiveStorylineContext } from '@/storylines/substrate';

type SearchParamsInput =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>
  | undefined;

interface PlayPageProps {
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

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const catalog = await listStoryPackageCatalog();
  const requestedPackageName = getRequestedPackageName(resolvedSearchParams.storyPackage);
  const firstReadyPackage = catalog.find(isReadyStoryPackageEntry);
  const selectedPackageName = requestedPackageName ?? firstReadyPackage?.packageName ?? null;

  if (!selectedPackageName) {
    return (
      <main className="workspace-page">
        <section className="panel selector-card selector-card--error">
          <p className="panel-eyebrow">Play Workbench</p>
          <h1>No loadable story package was found.</h1>
          <Link className="primary-link" href="/">
            Return to Title
          </Link>
        </section>
      </main>
    );
  }

  try {
    const storylineContext = await resolveActiveStorylineContext(selectedPackageName, {
      forWrite: false,
    });
    const [storyPackage, initialRuntimeSession] = await Promise.all([
      loadRuntimeStoryPackage(selectedPackageName, {
        authoredRootOverride: storylineContext.authoredRoot,
      }),
      loadPlayRuntimeSessionView(selectedPackageName, { storylineContext }),
    ]);

    return (
      <PlayWorkbench
        storyPackage={storyPackage}
        storyPackageName={selectedPackageName}
        initialRuntimeSession={initialRuntimeSession}
      />
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load the selected package.';

    return (
      <main className="workspace-page">
        <section className="panel selector-card selector-card--error">
          <p className="panel-eyebrow">Play Workbench</p>
          <h1>Package Load Failed</h1>
          <p>{message}</p>
          <Link className="primary-link" href="/">
            Return to Title
          </Link>
        </section>
      </main>
    );
  }
}
