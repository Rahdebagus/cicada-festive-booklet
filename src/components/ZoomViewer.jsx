import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, m, useMotionValue } from 'motion/react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { pageSrc, pages } from '../data.js';
import { useElementSize } from '../hooks/useElementSize.js';

const SCALES = [1, 1.6, 2.2, 3];
const EASE = [0.22, 1, 0.36, 1];
const SPRING = { type: 'spring', visualDuration: 0.35, bounce: 0 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const pad = (value) => String(value).padStart(2, '0');
const rubberBand = (value, limit) => (Math.abs(value) <= limit ? value : Math.sign(value) * (limit + (Math.abs(value) - limit) * 0.25));

const slide = {
  enter: (direction) => ({ opacity: 0, x: direction * 70 }),
  center: { opacity: 1, x: 0 },
  exit: (direction) => ({ opacity: 0, x: direction * -70 }),
};

function ZoomPage({ index, scale, side, width, height, onSwipe, onDoubleTap }) {
  const page = pages[index];
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const zoom = useMotionValue(1);
  const [hdReady, setHdReady] = useState(false);
  const pointer = useRef(null);
  const lastTap = useRef(0);
  const limits = useCallback((value) => ({ x: Math.max(0, (side * value - width) / 2), y: Math.max(0, (side * value - height) / 2) }), [side, width, height]);

  useEffect(() => {
    const bound = limits(scale);
    animate(zoom, scale, SPRING);
    animate(x, clamp(x.get(), -bound.x, bound.x), SPRING);
    animate(y, clamp(y.get(), -bound.y, bound.y), SPRING);
  }, [scale, limits, x, y, zoom]);

  const onPointerDown = (event) => {
    if (!event.isPrimary) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    x.stop(); y.stop();
    pointer.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: x.get(), y: y.get(), time: event.timeStamp };
  };

  const onPointerMove = (event) => {
    const p = pointer.current;
    if (!p || p.id !== event.pointerId) return;
    const dx = event.clientX - p.startX;
    const dy = event.clientY - p.startY;
    if (scale === 1) { x.set(dx * 0.45); return; }
    const bound = limits(scale);
    x.set(rubberBand(p.x + dx, bound.x));
    y.set(rubberBand(p.y + dy, bound.y));
  };

  const onPointerUp = (event) => {
    const p = pointer.current;
    if (!p || p.id !== event.pointerId) return;
    pointer.current = null;
    const dx = event.clientX - p.startX;
    const moved = Math.hypot(dx, event.clientY - p.startY);
    if (moved < 8 && event.timeStamp - p.time < 300) {
      if (event.timeStamp - lastTap.current < 320) { lastTap.current = 0; onDoubleTap(); }
      else lastTap.current = event.timeStamp;
    }
    if (scale === 1) {
      if (Math.abs(dx) > 70) onSwipe(dx < 0 ? 1 : -1);
      animate(x, 0, SPRING);
      return;
    }
    const bound = limits(scale);
    animate(x, clamp(x.get(), -bound.x, bound.x), SPRING);
    animate(y, clamp(y.get(), -bound.y, bound.y), SPRING);
  };

  return <m.div className={`zoom-image ${scale > 1 ? 'is-zoomed' : ''}`} style={{ width: side, height: side, x, y, scale: zoom }}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
    <img src={pageSrc(page.id, 1100)} alt={page.name} draggable="false" />
    <img className={`zoom-hd ${hdReady ? 'is-ready' : ''}`} src={pageSrc(page.id, 1650)} alt="" aria-hidden="true" draggable="false" decoding="async" onLoad={() => setHdReady(true)} />
  </m.div>;
}

export default function ZoomViewer({ pageIndex, onClose, onSelect }) {
  const viewportRef = useRef(null);
  const { width, height } = useElementSize(viewportRef);
  const side = Math.floor(Math.min(width, height) * 0.96);
  const [scale, setScale] = useState(1);
  const [direction, setDirection] = useState(1);
  const lastWheel = useRef(0);
  const page = pages[pageIndex];

  const select = useCallback((index) => {
    if (index < 0 || index >= pages.length || index === pageIndex) return;
    setDirection(index > pageIndex ? 1 : -1);
    setScale(1);
    onSelect(index);
  }, [onSelect, pageIndex]);
  const zoomBy = useCallback((step) => setScale((value) => SCALES[clamp(SCALES.indexOf(value) + step, 0, SCALES.length - 1)]), []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') select(pageIndex + 1);
      else if (event.key === 'ArrowLeft') select(pageIndex - 1);
      else if (event.key === '+' || event.key === '=') zoomBy(1);
      else if (event.key === '-') zoomBy(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, select, zoomBy, pageIndex]);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = previous; };
  }, []);

  const onWheel = (event) => {
    if (event.timeStamp - lastWheel.current < 180 || Math.abs(event.deltaY) < 4) return;
    lastWheel.current = event.timeStamp;
    zoomBy(event.deltaY < 0 ? 1 : -1);
  };

  return <m.div className="zoom-overlay" role="dialog" aria-modal="true" aria-label={`Viewing ${page.name}`}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
    <div className="zoom-header">
      <span className="zoom-title">PAGE {pad(pageIndex + 1)} <span className="zoom-divider">/</span> {page.name}</span>
      <div className="zoom-actions">
        <button type="button" onClick={() => zoomBy(-1)} disabled={scale === SCALES[0]} aria-label="Zoom out"><ZoomOut size={18} /></button>
        <span className="zoom-level">{Math.round(scale * 100)}%</span>
        <button type="button" onClick={() => zoomBy(1)} disabled={scale === SCALES[SCALES.length - 1]} aria-label="Zoom in"><ZoomIn size={18} /></button>
        <span className="zoom-action-separator" />
        <button type="button" onClick={onClose} aria-label="Close enlargement" autoFocus><X size={22} /></button>
      </div>
    </div>
    <m.div className="zoom-stage" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.45, ease: EASE }}>
      <button type="button" className="zoom-side" onClick={() => select(pageIndex - 1)} disabled={pageIndex === 0} aria-label="Previous page"><ChevronLeft /></button>
      <div className="zoom-viewport" ref={viewportRef} onWheel={onWheel}>
        <AnimatePresence initial={false} custom={direction}>
          <m.div key={pageIndex} className="zoom-slide" custom={direction} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: EASE }}>
            {side > 0 && <ZoomPage index={pageIndex} scale={scale} side={side} width={width} height={height}
              onSwipe={(step) => select(pageIndex + step)} onDoubleTap={() => setScale((value) => (value > 1 ? 1 : 2.2))} />}
          </m.div>
        </AnimatePresence>
      </div>
      <button type="button" className="zoom-side" onClick={() => select(pageIndex + 1)} disabled={pageIndex === pages.length - 1} aria-label="Next page"><ChevronRight /></button>
    </m.div>
    <p className="zoom-footer">DRAG TO EXPLORE · DOUBLE-TAP TO ZOOM · ESC TO CLOSE</p>
  </m.div>;
}
