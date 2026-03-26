'use client';

import { useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

interface UseMatchedHeightOptions {
  readonly minWidth?: number;
}

export function useMatchedHeight(
  targetRef: RefObject<HTMLElement | null>,
  options?: UseMatchedHeightOptions,
): CSSProperties | undefined {
  const [matchedHeight, setMatchedHeight] = useState<number | null>(null);
  const minWidth = options?.minWidth;

  useLayoutEffect(() => {
    const target = targetRef.current;
    if (!target) {
      return;
    }

    const syncHeight = () => {
      if (typeof window !== 'undefined' && minWidth && window.innerWidth < minWidth) {
        setMatchedHeight(null);
        return;
      }

      const nextHeight = Math.round(target.getBoundingClientRect().height);
      if (nextHeight > 0) {
        setMatchedHeight(nextHeight);
      }
    };

    syncHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncHeight);
      return () => window.removeEventListener('resize', syncHeight);
    }

    const observer = new ResizeObserver(() => syncHeight());
    observer.observe(target);
    window.addEventListener('resize', syncHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, [minWidth, targetRef]);

  if (!matchedHeight) {
    return undefined;
  }

  return {
    height: `${matchedHeight}px`,
  };
}
