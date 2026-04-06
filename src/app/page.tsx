import { TitleLandingSurface } from '@/app/components/TitleLandingSurface';
import { isReadyStoryPackageEntry, listStoryPackageCatalog } from '@/app/story-package-catalog';

export default async function HomePage() {
  const packages = await listStoryPackageCatalog();
  const firstReadyPackage = packages.find(isReadyStoryPackageEntry);

  return <TitleLandingSurface playPackageName={firstReadyPackage?.packageName ?? null} />;
}
