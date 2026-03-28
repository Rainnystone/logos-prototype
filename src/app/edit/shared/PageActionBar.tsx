import Link from 'next/link';

interface PageActionBarProps {
  readonly packageName: string;
}

export function PageActionBar({ packageName }: PageActionBarProps) {
  return (
    <section className="panel edit-action-bar">
      <Link className="primary-link" href="/">
        返回标题
      </Link>
      <Link className="secondary-link" href={`/play?storyPackage=${encodeURIComponent(packageName)}`}>
        打开场景
      </Link>
    </section>
  );
}
