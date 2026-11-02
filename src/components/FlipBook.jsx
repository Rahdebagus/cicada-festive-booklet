import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, m, motionValue, useTransform } from 'motion/react';
import { Maximize2 } from 'lucide-react';
import { maxPosition, pageSrc, pageSrcSet, pages } from '../data.js';

/*
 * A 3D flipbook driven only by transform + opacity, so every frame is composited on the GPU
 * with no layout or repaint. Each "leaf" is a sheet hinged at the spine with a page on each face.
 *   spread mode: cover alone, then two-page spreads; leaves rotate 0deg -> -180deg.
 *   single mode: one page at a time; leaves swing away to -100deg (edge-on, then hidden).
 */

const EASE = [0.645, 0.045, 0.355, 1];
const RELEASE = { type: 'spring', visualDuration: 0.5, bounce: 0 };
const PEEK = { type: 'spring', visualDuration: 0.35, bounce: 0 };
const INSTANT = { duration: 0 };
const PEEK_ANGLE = 14;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function buildLeaves(mode) {
  if (mode === 'single') return pages.map((_, index) => ({ front: index, back: null }));
  return Array.from({ length: Math.ceil(pages.length / 2) }, (_, index) => ({ front: index * 2, back: index * 2 + 1 < pages.length ? index * 2 + 1 : null }));
}

const Face = memo(function Face({ index, side, sizes, shade, onZoom, onLoad }) {
  const page = pages[index];
  return <div className={`face face-${side}${page.cover ? ' is-cover' : ''}`}>
    <img src={pageSrc(page.id)} srcSet={pageSrcSet(page.id)} sizes={sizes} alt={page.name} draggable="false" decoding="async" fetchPriority={index === 0 ? 'high' : 'low'} onLoad={onLoad} />
    <m.span className="face-shade" style={{ opacity: shade }} aria-hidden="true" />
    <button type="button" className="page-zoom" tabIndex={-1} aria-label={`Enlarge ${page.name}`} onClick={() => onZoom(index)}><Maximize2 size={15} strokeWidth={1.8} /></button>
  </div>;
});

const Leaf = memo(function Leaf({ leaf, index, count, rotation, flippedAngle, perspective, visible, sizes, onZoom, onCoverLoad }) {
  const angle = useTransform(rotation, (value) => clamp(value, flippedAngle, 0));
  // Unturned leaves stack lowest-index on top; turned leaves stack highest-index on top.
  const zIndex = useTransform(angle, (value) => (value > -90 ? count - index : count + index));
  const frontShade = useTransform(angle, (value) => clamp(-value / 90, 0, 1) * 0.42);
  const backShade = useTransform(angle, (value) => clamp((value + 180) / 90, 0, 1) * 0.42);
  return <m.div className="leaf" style={{ rotateY: angle, transformPerspective: perspective, zIndex, display: visible ? 'block' : 'none' }}>
    <Face index={leaf.front} side="front" sizes={sizes} shade={frontShade} onZoom={onZoom} onLoad={leaf.front === 0 ? onCoverLoad : undefined} />
    {leaf.back !== null && <Face index={leaf.back} side="back" sizes={sizes} shade={backShade} onZoom={onZoom} />}
  </m.div>;
});

export default function FlipBook({ mode, pageSize, position, onNavigate, onZoom, onCoverLoad, invite, reducedMotion }) {
  const spread = mode === 'spread';
  const max = maxPosition(mode);
  const flippedAngle = spread ? -180 : -100;
  const [leaves] = useState(() => buildLeaves(mode));
  const [rotations] = useState(() => leaves.map((_, index) => motionValue(index < position ? flippedAngle : 0)));
  const [settled, setSettled] = useState(position);
  const targets = useRef(rotations.map((rotation) => rotation.get()));
  const inflight = useRef(new Map());
  const positionRef = useRef(position);
  const releasedLeaf = useRef(null);
  const peekedLeaf = useRef(null);
  const gesture = useRef(null);
  const bookRef = useRef(null);

  useLayoutEffect(() => { positionRef.current = position; });

  const run = (index, target, transition) => {
    const token = {};
    inflight.current.set(index, token);
    animate(rotations[index], target, {
      ...transition,
      onComplete: () => {
        if (inflight.current.get(index) !== token) return;
        inflight.current.delete(index);
        if (!inflight.current.size) setSettled(positionRef.current);
      },
    });
  };

  const clearPeek = () => {
    const index = peekedLeaf.current;
    if (index === null) return;
    peekedLeaf.current = null;
    animate(rotations[index], targets.current[index], PEEK);
  };

  // Turn every leaf whose resting side disagrees with the requested position.
  // Several leaves at once (chapter jumps) riffle with a short stagger.
  useEffect(() => {
    const changed = rotations.map((_, index) => index).filter((index) => targets.current[index] !== (index < position ? flippedAngle : 0));
    if (peekedLeaf.current !== null && !changed.includes(peekedLeaf.current)) clearPeek();
    peekedLeaf.current = null;
    if (!changed.length) return;
    if (!(changed[0] < position)) changed.reverse();
    const riffle = changed.length > 1;
    const stagger = Math.min(0.085, 0.5 / changed.length);
    changed.forEach((index, order) => {
      const target = index < position ? flippedAngle : 0;
      targets.current[index] = target;
      if (reducedMotion) return run(index, target, INSTANT);
      if (releasedLeaf.current === index) { releasedLeaf.current = null; return run(index, target, RELEASE); }
      const distance = Math.abs(rotations[index].get() - target) / -flippedAngle;
      const duration = (riffle ? 0.75 : spread ? 0.95 : 0.75) * clamp(distance, 0.35, 1);
      run(index, target, { duration, ease: EASE, delay: order * (riffle ? stagger : 0) });
    });
  }, [position]); // eslint-disable-line react-hooks/exhaustive-deps

  // While the book is still closed, lift the cover corner once as an invitation to open it.
  useEffect(() => {
    if (!invite || reducedMotion) return undefined;
    const idle = () => positionRef.current === 0 && !inflight.current.size && peekedLeaf.current === null && !gesture.current;
    const timer = window.setTimeout(() => {
      if (!idle()) return;
      animate(rotations[0], -24, { duration: 0.6, ease: EASE }).then(() => {
        if (idle() && targets.current[0] === 0) animate(rotations[0], 0, { type: 'spring', visualDuration: 0.7, bounce: 0 });
      });
    }, 1700);
    return () => window.clearTimeout(timer);
  }, [invite]); // eslint-disable-line react-hooks/exhaustive-deps

  // Decode every page ahead of time so a turn never waits on an image.
  const sizes = `${pageSize}px`;
  useEffect(() => {
    const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 300));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const handle = idle(() => bookRef.current?.querySelectorAll('img').forEach((image) => image.decode?.().catch(() => {})));
    return () => cancel(handle);
  }, [sizes]);

  // Keep the visible pages centred: closed front cover shifts left, closed back cover shifts right.
  // The smoothstep dead-zone at both ends keeps corner peeks from nudging the whole book.
  const first = rotations[0];
  const last = rotations[rotations.length - 1];
  const settle = (angle) => { const t = clamp((angle / flippedAngle - 0.14) / 0.72, 0, 1); return t * t * (3 - 2 * t); };
  const shift = useTransform([first, last], ([a, b]) => `${(settle(b) - (1 - settle(a))) * 25}%`);
  const leftGround = useTransform(first, (value) => clamp((-value - 90) / 90, 0, 1));
  const rightGround = useTransform(last, (value) => clamp(1 - (-value - 90) / 90, 0, 1));

  const sideOf = (clientX) => {
    const rect = bookRef.current.getBoundingClientRect();
    return clientX - rect.left > rect.width / 2 ? 1 : -1;
  };

  const updatePeek = (clientX) => {
    if (reducedMotion || inflight.current.size) return;
    const rect = bookRef.current.getBoundingClientRect();
    const local = clientX - rect.left;
    const edge = pageSize * 0.2;
    const current = positionRef.current;
    let index = null;
    let angle = 0;
    if (local > rect.width - edge && current < max) { index = current; angle = -PEEK_ANGLE; }
    else if (spread && local < edge && current > 0) { index = current - 1; angle = flippedAngle + PEEK_ANGLE; }
    if (index === peekedLeaf.current) return;
    clearPeek();
    if (index === null) return;
    peekedLeaf.current = index;
    animate(rotations[index], angle, PEEK);
  };

  const onPointerDown = (event) => {
    if (!event.isPrimary || event.button > 0 || event.target.closest('button')) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, side: sideOf(event.clientX), leaf: null };
  };

  const onPointerMove = (event) => {
    const g = gesture.current;
    if (!g) { if (event.pointerType === 'mouse') updatePeek(event.clientX); return; }
    if (g.id !== event.pointerId) return;
    if (g.leaf === null) {
      const dx = event.clientX - g.x;
      const dy = event.clientY - g.y;
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) { if (Math.abs(dy) > 14) gesture.current = null; return; }
      const direction = dx < 0 ? 1 : -1;
      const current = positionRef.current;
      const blocked = (spread && direction !== g.side) || (direction === 1 ? current >= max : current <= 0) || inflight.current.size > 0;
      if (blocked) { gesture.current = null; return; }
      g.leaf = direction === 1 ? current : current - 1;
      g.direction = direction;
      if (peekedLeaf.current !== g.leaf) clearPeek();
      peekedLeaf.current = null;
      rotations[g.leaf].stop();
      const progress = rotations[g.leaf].get() / flippedAngle;
      // A single-mode page waiting off-stage is invisible between -100 and -90, so start it at the edge.
      g.start = direction === -1 && !spread ? Math.min(progress, 0.9) : progress;
      g.range = spread ? pageSize * 2 : pageSize;
      g.x = event.clientX;
      inflight.current.set(g.leaf, {});
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    rotations[g.leaf].set(clamp(g.start - (event.clientX - g.x) / g.range, 0, 1) * flippedAngle);
  };

  const onPointerEnd = (event) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    gesture.current = null;
    if (g.leaf === null) {
      const tap = event.type === 'pointerup' && event.timeStamp - g.time < 450 && Math.hypot(event.clientX - g.x, event.clientY - g.y) < 10;
      const next = clamp(positionRef.current + g.side, 0, max);
      if (tap && next !== positionRef.current) onNavigate(next);
      return;
    }
    const rotation = rotations[g.leaf];
    const progress = rotation.get() / flippedAngle;
    const velocity = rotation.getVelocity() / flippedAngle; // progress per second, positive = towards turned
    const turned = g.direction === 1 ? velocity > 0.8 || (progress > 0.4 && velocity > -0.8) : !(velocity < -0.8 || (progress < 0.6 && velocity < 0.8));
    const next = turned ? g.leaf + 1 : g.leaf;
    if (next !== positionRef.current) { releasedLeaf.current = g.leaf; onNavigate(next); }
    else run(g.leaf, targets.current[g.leaf], reducedMotion ? INSTANT : RELEASE);
  };

  const low = Math.min(settled, position) - 2;
  const high = Math.max(settled, position) + 1;
  const perspective = Math.round(clamp(pageSize * 5, 1600, 3200));

  return <m.div ref={bookRef} className={`book book-${mode}`} style={{ width: spread ? pageSize * 2 : pageSize, height: pageSize, x: spread ? shift : 0 }}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onPointerLeave={() => { if (!gesture.current) clearPeek(); }}>
    {spread && <m.div className="book-ground ground-left" style={{ opacity: leftGround }} aria-hidden="true" />}
    <m.div className="book-ground ground-right" style={{ opacity: spread ? rightGround : 1 }} aria-hidden="true" />
    {leaves.map((leaf, index) => <Leaf key={index} leaf={leaf} index={index} count={leaves.length} rotation={rotations[index]} flippedAngle={flippedAngle}
      perspective={perspective} visible={index >= low && index <= high} sizes={sizes} onZoom={onZoom} onCoverLoad={onCoverLoad} />)}
  </m.div>;
}
