import { useEffect, useState } from 'react';
import { m, useMotionValue, useSpring } from 'motion/react';

// Decorative backdrop. Everything here is static or moves by transform only,
// so it never forces the page (or the book above it) to repaint.
export default function Ambient() {
  const [finePointer] = useState(() => window.matchMedia('(pointer: fine)').matches);
  const x = useMotionValue(window.innerWidth / 2);
  const y = useMotionValue(window.innerHeight / 3);
  const springX = useSpring(x, { stiffness: 50, damping: 18, mass: 0.8 });
  const springY = useSpring(y, { stiffness: 50, damping: 18, mass: 0.8 });

  useEffect(() => {
    if (!finePointer) return undefined;
    const move = (event) => { x.set(event.clientX); y.set(event.clientY); };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [finePointer, x, y]);

  return <div className="ambient" aria-hidden="true">
    <div className="ambient-glow ambient-glow-one" />
    <div className="ambient-glow ambient-glow-two" />
    <div className="decorative-orbit orbit-one" />
    <div className="decorative-orbit orbit-two" />
    {finePointer && <m.div className="cursor-glow" style={{ x: springX, y: springY }} />}
    <div className="grain" />
  </div>;
}
