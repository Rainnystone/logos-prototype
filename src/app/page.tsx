import { StoryPackageSelector } from '@/app/components/StoryPackageSelector';
import { listStoryPackageCatalog } from '@/app/story-package-catalog';

export default async function HomePage() {
  const packages = await listStoryPackageCatalog();

  return (
    <main className="workspace-page">
      <section className="dashboard-hero panel">
        <div>
          <p className="panel-eyebrow">Project and Sample Layer</p>
          <h1>LOGOS Sample Dashboard</h1>
          <p>
            Confirm the active scene package, inspect its narrative axis and end line, then open
            the editor or the runtime workbench.
          </p>
        </div>
      </section>
      <StoryPackageSelector packages={packages} />
    </main>
  );
}
