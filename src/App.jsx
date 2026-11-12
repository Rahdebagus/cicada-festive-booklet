import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, animate, domAnimation, m, useReducedMotion } from 'motion/react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Expand, Menu, Volume2, VolumeX, X } from 'lucide-react';
import Ambient from './components/Ambient.jsx';
import FlipBook from './components/FlipBook.jsx';
import Splash from './components/Splash.jsx';
import ZoomViewer from './components/ZoomViewer.jsx';
import { chapters, maxPosition, pages, toPage, toPosition } from './data.js';
import { useElementSize } from './hooks/useElementSize.js';

const EASE_OUT = [0.22, 1, 0.36, 1];
const MUSIC_VOLUME = 0.6;
const INTRO_KEY = 'cicada-intro-seen';
const pad = (value) => String(value).padStart(2, '0');
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_OUT, delay } }),
};
const lineUp = {
  hidden: { y: '110%' },
  show: (delay = 0) => ({ y: 0, transition: { duration: 1, ease: EASE_OUT, delay } }),
};
const bookIn = {
  hidden: { opacity: 0, y: 44, rotateX: 14, scale: 0.95 },
  show: { opacity: 1, y: 0, rotateX: 0, scale: 1, transition: { duration: 1.25, ease: EASE_OUT, delay: 0.2 } },
};
const counterSlide = {
  enter: (direction) => ({ y: direction > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (direction) => ({ y: direction > 0 ? '-100%' : '100%', opacity: 0 }),
};

function SoundToggle({ playing, onClick }) {
  return <button type="button" className={`sound-toggle ${playing ? 'playing' : ''}`} onClick={onClick} aria-label={playing ? 'Pause background music' : 'Play background music'}>
    <span className="sound-equalizer" aria-hidden="true"><i /><i /><i /><i /></span>
    <span className="sound-caption">SOUND {playing ? 'ON' : 'OFF'}</span>
    {playing ? <Volume2 size={16} /> : <VolumeX size={16} />}
  </button>;
}

function readIntroSeen() {
  try { return Boolean(sessionStorage.getItem(INTRO_KEY)); } catch { return false; }
}

export default function App() {
  const reducedMotion = useReducedMotion();
  const stageRef = useRef(null);
  const audioRef = useRef(null);
  const fadeRef = useRef(null);
  const playingRef = useRef(false);
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [opened, setOpened] = useState(false);
  const [zoomed, setZoomed] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [splash, setSplash] = useState(() => !readIntroSeen());
  const [coverReady, setCoverReady] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const introDone = !splash;

  // Size the book from the space actually available, so it always sits centred and never overflows.
  const stage = useElementSize(stageRef);
  const mode = stage.width >= 560 && stage.width >= stage.height * 1.2 ? 'spread' : 'single';
  const fit = mode === 'spread' ? Math.min(stage.width / 2 - 8, stage.height - 16, 620) : Math.min(stage.width - 8, stage.height - 16, 720);
  const pageSize = Math.max(0, Math.floor(fit / 2) * 2);
  const position = toPosition(page, mode);
  const max = maxPosition(mode);
  const shownPage = toPage(position, mode);
  const chapterIndex = chapters.reduce((found, chapter, index) => (shownPage >= chapter.start ? index : found), 0);
  const chapter = chapters[chapterIndex];
  const pageLabel = mode === 'spread' && shownPage > 0 && shownPage < pages.length - 1 ? `${pad(shownPage + 1)}–${pad(shownPage + 2)}` : pad(shownPage + 1);
  const previousPage = useRef(shownPage);
  const direction = shownPage >= previousPage.current ? 1 : -1;
  useEffect(() => { previousPage.current = shownPage; });

  // Intro curtain: wait for the cover and fonts (at least ~1s, at most 3.5s), then lift.
  useEffect(() => {
    if (!splash) return undefined;
    (document.fonts?.ready ?? Promise.resolve()).then(() => setFontsReady(true));
    const min = window.setTimeout(() => setMinTimePassed(true), 1100);
    const limit = window.setTimeout(() => setSplash(false), 3500);
    return () => { window.clearTimeout(min); window.clearTimeout(limit); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (splash && coverReady && fontsReady && minTimePassed) setSplash(false); }, [splash, coverReady, fontsReady, minTimePassed]);
  useEffect(() => { if (!splash) try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* private mode */ } }, [splash]);
  const onCoverLoad = useCallback(() => setCoverReady(true), []);

  const fadeVolume = useCallback((to, onComplete) => {
    const audio = audioRef.current;
    if (!audio) return;
    fadeRef.current?.stop();
    fadeRef.current = animate(audio.volume, to, { duration: to > 0 ? 1.6 : 0.6, ease: 'easeOut', onUpdate: (value) => { audio.volume = clamp(value, 0, 1); }, onComplete });
  }, []);
  const startMusic = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    playingRef.current = true;
    setPlaying(true);
    if (audio.paused) {
      audio.volume = 0;
      try { await audio.play(); } catch { playingRef.current = false; setPlaying(false); return; }
    }
    fadeVolume(MUSIC_VOLUME);
  }, [fadeVolume]);
  const stopMusic = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    fadeVolume(0, () => { if (!playingRef.current) audioRef.current?.pause(); });
  }, [fadeVolume]);
  const toggleMusic = () => (playingRef.current ? stopMusic() : startMusic());

  // Pause quietly while the tab is hidden, resume when the visitor returns.
  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio || !playingRef.current) return;
      if (document.hidden) audio.pause(); else audio.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const goTo = useCallback((target) => setPage(toPage(clamp(target, 0, maxPosition(mode)), mode)), [mode]);
  const step = useCallback((delta) => setPage((current) => toPage(clamp(toPosition(current, mode) + delta, 0, maxPosition(mode)), mode)), [mode]);
  const jumpTo = (start) => { setMenuOpen(false); setPage(start); };
  const openBook = () => { setOpened(true); step(1); if (!playingRef.current) startMusic(); };
  useEffect(() => { if (page > 0) setOpened(true); }, [page]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event) => { if (!event.target.closest('.mobile-nav, .mobile-menu-button')) setMenuOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (zoomed !== null) return undefined;
    const onKey = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input, textarea, [contenteditable="true"]')) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') step(1);
      else if (event.key === 'ArrowLeft' || event.key === 'PageUp') step(-1);
      else if (event.key === 'Home') setPage(0);
      else if (event.key === 'End') setPage(pages.length - 1);
      else if (event.key === 'Escape') setMenuOpen(false);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, zoomed]);

  const closeZoom = useCallback(() => setZoomed(null), []);
  const show = introDone ? 'show' : 'hidden';

  return <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
      <div className="experience">
        <Ambient />
        <audio ref={audioRef} src="/audio/festive-ambient.mp3" loop preload="none" />

        <m.header className="site-header" initial="hidden" animate={show} variants={rise} custom={0}>
          <a className="brand" href="/" aria-label="Cicada Ubud — home">
            <img src="/brand/cicada-lockup.webp" width="268" height="200" alt="Cicada Ubud" />
          </a>
          <div className="header-center"><span className="header-line" /> AN INVITATION TO CELEBRATE <span className="header-line" /></div>
          <div className="header-actions">
            <SoundToggle playing={playing} onClick={toggleMusic} />
            <a className="download-top" href="/Festive_2026_Cicada_Ubud.pdf" download aria-label="Download festive booklet as PDF"><ArrowDownToLine size={17} /><span>DOWNLOAD PDF</span></a>
            <button type="button" className="mobile-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close chapter navigation' : 'Open chapter navigation'}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </m.header>

        <AnimatePresence>
          {menuOpen && <m.nav key="mobile-nav" className="mobile-nav" aria-label="Book chapters" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: EASE_OUT }}>
            {chapters.map((item, index) => <button type="button" key={item.start} className={`chapter-link ${chapterIndex === index ? 'active' : ''}`} onClick={() => jumpTo(item.start)}>
              <span className="chapter-number">{pad(index + 1)}</span><span>{item.short}</span>
            </button>)}
          </m.nav>}
        </AnimatePresence>

        <main className="main-layout">
          <m.section className="intro-text" aria-label="Festive Season introduction" initial="hidden" animate={show}>
            <m.div className="eyebrow" variants={rise} custom={0.1}><span className="eyebrow-dash" /> THE FESTIVE COLLECTION · 2026 / 27</m.div>
            <h1>
              <span className="line-mask"><m.span variants={lineUp} custom={0.15}>A season of</m.span></span>{' '}
              <span className="line-mask"><m.em variants={lineUp} custom={0.27}>wonder.</m.em></span>
            </h1>
            <m.p variants={rise} custom={0.4}>A Festive Season inspired by the timeless joy of Balinese childhood.</m.p>
          </m.section>

          <section className="reading-area" aria-label="Interactive festive booklet">
            <m.div className="stage-hint stage-hint-left" initial="hidden" animate={show} variants={rise} custom={0.7}><span>THE ART OF TOGETHERNESS</span><span className="vertical-rule" /><span>01 — 06</span></m.div>
            <div className="book-stage" ref={stageRef} style={{ '--page': `${pageSize}px` }}>
              <m.div className="book-entrance" initial="hidden" animate={show} variants={bookIn} style={{ transformPerspective: 1600 }}>
                <div className="book-backlight" aria-hidden="true" />
                {pageSize > 0 && <FlipBook key={mode} mode={mode} pageSize={pageSize} position={position} onNavigate={goTo} onZoom={setZoomed} onCoverLoad={onCoverLoad}
                  invite={introDone && !opened} reducedMotion={reducedMotion} />}
              </m.div>
            </div>
            <m.div className="stage-hint stage-hint-right" initial="hidden" animate={show} variants={rise} custom={0.7}><span>DRAG OR TAP TO TURN</span><span className="vertical-rule" /><span>DISCOVER MORE</span></m.div>
          </section>

          <m.section className="reading-controls" aria-label="Book controls" initial="hidden" animate={show} variants={rise} custom={0.55}>
            <div className="now-reading">
              <span className="micro-label">NOW READING</span>
              <div className="reading-details" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <m.div key={chapter.start} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: EASE_OUT }}>
                    <span>{chapter.title}</span><small>{chapter.subtitle}</small>
                  </m.div>
                </AnimatePresence>
              </div>
            </div>
            <div className="center-control">
              <AnimatePresence mode="wait" initial={false}>
                {!opened ? <m.button key="open" type="button" className="open-book-button" onClick={openBook}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
                  <BookOpen size={17} strokeWidth={1.5} /> OPEN THE BOOK <ArrowUpRight className="open-book-arrow" size={16} strokeWidth={1.5} />
                </m.button>
                  : <m.div key="arrows" className="arrows-control" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
                    <button type="button" onClick={() => step(-1)} aria-label="Previous page" disabled={position === 0}><ArrowLeft size={19} strokeWidth={1.5} /></button>
                    <span className="page-counter" aria-label={`Page ${pageLabel} of ${pages.length}`}>
                      <span className="counter-window">
                        <AnimatePresence initial={false} custom={direction}>
                          <m.strong key={pageLabel} custom={direction} variants={counterSlide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: EASE_OUT }}>{pageLabel}</m.strong>
                        </AnimatePresence>
                      </span>
                      <span>/</span>{pad(pages.length)}
                    </span>
                    <button type="button" onClick={() => step(1)} aria-label="Next page" disabled={position === max}><ArrowRight size={19} strokeWidth={1.5} /></button>
                  </m.div>}
              </AnimatePresence>
            </div>
            <div className="read-actions"><button className="text-control" type="button" onClick={() => setZoomed(shownPage)}><Expand size={17} /><span>ENLARGE PAGE</span></button></div>
            <span className="reading-progress" aria-hidden="true"><i style={{ transform: `scaleX(${max ? position / max : 0})` }} /></span>
          </m.section>

          <m.nav className="chapter-nav" aria-label="Book chapters" initial="hidden" animate={show} variants={rise} custom={0.65}>
            <span className="chapter-indicator" style={{ transform: `translateX(${chapterIndex * 100}%)` }} aria-hidden="true" />
            {chapters.map((item, index) => <button type="button" key={item.start} className={`chapter-link ${chapterIndex === index ? 'active' : ''}`} onClick={() => jumpTo(item.start)} aria-current={chapterIndex === index ? 'true' : undefined}>
              <span className="chapter-number">{pad(index + 1)}</span><span>{item.short}</span>
            </button>)}
          </m.nav>
        </main>

        <m.footer className="site-footer" initial="hidden" animate={show} variants={rise} custom={0.8}>
          <span>© CICADA RESORT BALI UBUD</span><span>AN AUTOGRAPH COLLECTION HOTEL</span>
          <a href="https://www.instagram.com/cicadaubud/" target="_blank" rel="noreferrer">FOLLOW OUR STORY <ArrowUpRight size={13} /></a>
        </m.footer>

        <AnimatePresence>{zoomed !== null && <ZoomViewer key="zoom" pageIndex={zoomed} onSelect={setZoomed} onClose={closeZoom} />}</AnimatePresence>
        <AnimatePresence>{splash && <Splash key="splash" ready={coverReady && fontsReady} onSkip={() => setSplash(false)} />}</AnimatePresence>
      </div>
    </MotionConfig>
  </LazyMotion>;
}
