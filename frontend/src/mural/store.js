// Shared state for the one living mural that persists across pages.
// A page registers a slot (an empty, sized placeholder: the home arch or the story banner) and
// the stage in Layout animates itself onto whichever slot is current. When a page leaves, its
// slot is kept for a moment so the next page's slot can take over without the stage vanishing.
import { useEffect, useRef, useSyncExternalStore } from 'react';

let state = { slot: null, paused: false };
const listeners = new Set();
let clearTimer = null;
const emit = patch => { state = { ...state, ...patch }; listeners.forEach(l => l()); };

export const useMural = () => useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => state);
export const setPaused = paused => emit({ paused });

// kind: 'arch' (home) or 'panorama' (story). Returns a ref for the placeholder element.
export function useMuralSlot(kind) {
  const ref = useRef(null);
  useEffect(() => {
    const mine = ref.current; // kept here: React may clear the ref before this cleanup runs
    clearTimeout(clearTimer);
    emit({ slot: { el: mine, kind } });
    return () => {
      clearTimer = setTimeout(() => { if (state.slot?.el === mine) emit({ slot: null }); }, 900);
    };
  }, [kind]);
  return ref;
}
