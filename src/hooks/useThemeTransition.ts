import { useEffect, useRef, useState } from 'react';
import { UIDesign } from './useUIDesign';

const STORAGE_KEY = 'taskflow_ui_design';
const EVENT_NAME = 'ui-design-changed';
const TRIGGER_EVENT = 'theme-transition-start';

interface Timing {
  peak: number;
  total: number;
}

const DEFAULT_TIMING: Timing = { peak: 900, total: 2000 };

const TIMING: Record<UIDesign, Timing> = {
  classic:    { peak: 900,  total: 2000 },
  neumorphic: { peak: 1050, total: 2200 },
  stacked:    { peak: 900,  total: 2000 },
  radial:     { peak: 900,  total: 2000 },
  tarot:      { peak: 1000, total: 2100 },
  hive:       { peak: 1500, total: 2400 },
  vending:    { peak: 950,  total: 2100 },
  detective:  { peak: 900,  total: 2000 },
  kanban:     { peak: 950,  total: 2100 },
};

interface TransitionState {
  target: UIDesign;
  key: number;
}

export function useThemeTransition() {
  const [state, setState] = useState<TransitionState | null>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { target?: UIDesign } | undefined;
      if (!detail?.target) return;
      counterRef.current += 1;
      setState({ target: detail.target, key: counterRef.current });
    };
    window.addEventListener(TRIGGER_EVENT, handler);
    return () => window.removeEventListener(TRIGGER_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!state) return;

    const timing = TIMING[state.target] ?? DEFAULT_TIMING;

    const applyTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, state.target);
      } catch { /* noop */ }
      document.documentElement.setAttribute('data-ui-design', state.target);
      window.dispatchEvent(new Event(EVENT_NAME));
    }, timing.peak);

    const clearTimer = window.setTimeout(() => {
      setState(null);
    }, timing.total);

    return () => {
      clearTimeout(applyTimer);
      clearTimeout(clearTimer);
    };
  }, [state]);

  return state;
}

export function triggerThemeTransition(target: UIDesign) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TRIGGER_EVENT, { detail: { target } }));
}