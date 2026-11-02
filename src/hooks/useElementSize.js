import { useLayoutEffect, useState } from 'react';

// Tracks an element's content box. Updates are rounded and batched to one per frame,
// so mobile toolbar jitter or sub-pixel changes never re-render the book.
export function useElementSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const width = Math.round(element.clientWidth);
      const height = Math.round(element.clientHeight);
      setSize((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(() => { if (!frame) frame = requestAnimationFrame(measure); });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [ref]);

  return size;
}
