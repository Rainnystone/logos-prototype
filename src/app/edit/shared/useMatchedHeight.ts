'use client';

import { useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

export function useMatchedHeight(targetRef: RefObject<HTMLElement | null>): CSSProperties | undefined {
  const [matchedHeight, setMatchedHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const target = targetRef.current;
    if (!target) {
      return;
    }

    const syncHeight = () => {
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

    return () => observer.disconnect();
  }, [targetRef]);

  if (!matchedHeight) {
    return undefined;
  }

  return {
    height: `${matchedHeight}px`,
  };
}
