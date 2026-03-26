import Link from 'next/link';

interface PageActionBarProps {
  readonly packageName: string;
}

export function PageActionBar({ packageName }: PageActionBarProps) {
  return (
    <section className="panel edit-action-bar">
      <Link className="primary-link" href="/">
        Return to Title
      </Link>
      <Link className="secondary-link" href={`/play?storyPackage=${encodeURIComponent(packageName)}`}>
        Open Scene
      </Link>
    </section>
  );
}
