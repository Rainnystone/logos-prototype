'use client';

import { useState, type ReactNode } from 'react';

interface CollapsiblePanelProps {
  readonly title: string;
  readonly eyebrow?: string;
  readonly defaultOpen?: boolean;
  readonly variant?: 'default' | 'dark';
  readonly children: ReactNode;
}

export function CollapsiblePanel({
  title,
  eyebrow,
  defaultOpen = false,
  variant = 'default',
  children,
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const isDark = variant === 'dark';
  const containerClass = isDark
    ? 'border-2 border-black bg-black text-white font-mono overflow-hidden'
    : 'border-2 border-black bg-white font-mono overflow-hidden';
  const headerBg = isDark
    ? 'bg-black hover:bg-white/10'
    : 'bg-[#f5f5f5] hover:bg-[#e5e5e5]';
  const eyebrowColor = isDark ? 'text-[#00ff00]' : 'text-black/50';
  const titleColor = isDark ? 'text-white' : 'text-black';
  const chevronColor = isDark ? 'text-white/60' : 'text-black/40';

  return (
    <section className={containerClass} role="region" aria-label={title}>
      <button
        type="button"
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 ${headerBg}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={title}
      >
        <div className="text-left">
          {eyebrow ? (
            <p className={`text-[10px] tracking-widest uppercase ${eyebrowColor} mb-0.5`}>
              {eyebrow}
            </p>
          ) : null}
          <h3 className={`text-sm font-bold uppercase tracking-tight ${titleColor}`}>{title}</h3>
        </div>
        <span
          className={`text-xs ${chevronColor} ${isOpen ? 'rotate-180' : ''}`}
          style={{ transition: 'transform 150ms var(--ease-out)' }}
          aria-hidden="true"
        >
          &#9660;
        </span>
      </button>
      {isOpen ? <div className="border-t-2 border-inherit">{children}</div> : null}
    </section>
  );
}
