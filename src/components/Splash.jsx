import { m } from 'motion/react';

const EASE_OUT = [0.22, 1, 0.36, 1];
const CURTAIN = [0.76, 0, 0.24, 1];

// Brand curtain shown on the first visit of a session while the cover and fonts load.
export default function Splash({ ready, onSkip }) {
  return <m.div className="splash" onClick={onSkip} exit={{ y: '-100%' }} transition={{ duration: 0.9, ease: CURTAIN }}>
    <m.img className="splash-logo" src="/brand/cicada-logo.webp" width="503" height="420" alt="Cicada Ubud, Autograph Collection Hotels"
      initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.8, ease: EASE_OUT }} />
    <span className="splash-progress" aria-hidden="true">
      <m.i initial={{ scaleX: 0 }} animate={{ scaleX: ready ? 1 : 0.72 }} transition={{ duration: ready ? 0.35 : 1.8, ease: 'easeOut' }} />
    </span>
    <m.span className="splash-caption" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.25, duration: 0.6 }}>
      THE FESTIVE COLLECTION · 2026 / 27
    </m.span>
  </m.div>;
}
