import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react';
import worldSvg from '../art/world.svg?raw';
import { useMural } from '../mural/store.js';
import { musicPreferred, startMusic } from '../audio/warDrums.js';

// Camera framings of the one 1600 x 900 world: a close-up of Lapu-Lapu for the home arch, the
// whole shore of Mactan for the story banner.
const BOX = { arch: [836, 200, 528, 660], panorama: [0, 0, 1600, 900] };
const DURATION = 1.3;
const EASE = [0.65, 0, 0.35, 1];
const LABEL = 'Art Deco panorama of the Battle of Mactan: Lapu-Lapu raises his kampilan on the shore of Mactan with his warriors while Magellan’s soldiers wade back to their boats and ships.';

// The living mural. Rendered once in Layout and never remounted, so moving from the home page to
// the story is one continuous animation: the frame grows from the arch into the banner while the
// camera pulls back and every layer travels to its place (see .is-arch / .is-panorama in CSS).
export default function MuralStage() {
  const { slot, paused } = useMural();
  return <AnimatePresence>{slot && <Stage key="stage" slot={slot} paused={paused} />}</AnimatePresence>;
}

function Stage({ slot, paused }) {
  const reduce = useReducedMotion();
  const root = useRef(null);
  const art = useRef(null);
  const box = useRef(null);
  const [rect, setRect] = useState(null);
  const [shown, setShown] = useState(slot.kind === 'panorama' ? 'arch' : slot.kind); // a first visit to the story pulls back too
  const [morphing, setMorphing] = useState(false);
  const morphStarted = useRef(0);
  const lastKind = useRef(null);

  // A new kind of slot starts a morph window; frame changes inside it animate, others snap.
  if (slot.kind !== lastKind.current) {
    if (lastKind.current !== null) morphStarted.current = performance.now();
    lastKind.current = slot.kind;
  }
  const inMorph = !reduce && performance.now() - morphStarted.current < DURATION * 1000;

  // Follow the slot: measure it in document coordinates whenever it or the page changes size.
  useLayoutEffect(() => {
    const measure = () => {
      const r = slot.el.getBoundingClientRect();
      setRect({ top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(slot.el);
    ro.observe(document.body);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [slot.el]);

  // Camera: glide the viewBox between framings, in step with the frame and the CSS layer states.
  useEffect(() => {
    const svg = art.current.querySelector('svg');
    const target = BOX[slot.kind];
    const from = box.current ?? BOX.arch;
    const set = b => { box.current = b; svg.setAttribute('viewBox', b.map(n => n.toFixed(1)).join(' ')); };
    if (reduce || from.every((v, i) => v === target[i])) { set(target); setShown(slot.kind); return undefined; }
    set(from);
    let controls;
    const frame = requestAnimationFrame(() => {
      setShown(slot.kind);
      setMorphing(true);
      controls = animate(0, 1, {
        duration: DURATION, ease: EASE,
        onUpdate: t => set(from.map((v, i) => v + (target[i] - v) * t)),
        onComplete: () => setMorphing(false),
      });
    });
    return () => { cancelAnimationFrame(frame); controls?.stop(); };
  }, [slot.kind, reduce]);

  // Parallax: layers lean away from the pointer by depth.
  const onPointerMove = event => {
    if (reduce) return;
    const r = root.current.getBoundingClientRect();
    root.current.style.setProperty('--mx', (((event.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    root.current.style.setProperty('--my', (((event.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };
  const onPointerLeave = () => { root.current.style.setProperty('--mx', 0); root.current.style.setProperty('--my', 0); };

  const radius = slot.kind === 'arch' && rect ? rect.width / 2 : 0;
  return (
    <motion.div
      ref={root}
      className={`stage is-${shown}${paused ? ' is-paused' : ''}${morphing ? ' is-morphing' : ''}`}
      initial={rect ? false : { opacity: 0 }}
      animate={rect ? { opacity: 1, top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderTopLeftRadius: radius, borderTopRightRadius: radius } : { opacity: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      transition={inMorph ? { duration: DURATION, ease: EASE, opacity: { duration: 0.3 } } : { duration: 0, opacity: { duration: 0.4 } }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <span ref={art} className="mural-art" role={slot.kind === 'panorama' ? 'img' : undefined}
        aria-label={slot.kind === 'panorama' ? LABEL : undefined} aria-hidden={slot.kind === 'panorama' ? undefined : true}
        dangerouslySetInnerHTML={{ __html: worldSvg }} />
      {slot.kind === 'arch' && (
        <Link to="/sugilanon/lapu-lapu" state={{ morph: true }} className="stage-link" aria-label="Lapu-Lapu of Mactan: open his story"
          onClick={() => { if (musicPreferred()) startMusic({ remember: false }); }} />
      )}
    </motion.div>
  );
}
