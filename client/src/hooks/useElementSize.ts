import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Observes the size of an element (used for responsive canvases).
 *
 * Uses a callback ref so measurement starts as soon as the node is attached,
 * even when the component first renders a placeholder and mounts the measured
 * element only after data has loaded.
 */
export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const measure = useCallback((element: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (!element) {
      setSize({ width: 0, height: 0 });
      return;
    }

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize((prev) => {
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    observerRef.current = observer;
  }, []);

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
    },
    [],
  );

  return { ref: measure, size };
}
