import { useState, useEffect, useRef } from 'react';

export type UIDesign =
  | 'binder'
  | 'classic'
  | 'neumorphic'
  | 'stacked'
  | 'radial'
  | 'tarot'
  | 'hive'
  | 'vending'
  | 'detective'
  | 'kanban';

/** Default theme for brand-new users. Persisted once they pick another. */
export const DEFAULT_UI_DESIGN: UIDesign = 'binder';

export const UI_DESIGNS: { id: UIDesign; name: string; desc: string; emoji: string }[] = [
  { id: 'binder',     name: 'Leather Binder',   desc: 'Premium default · brass & leather', emoji: '📖' },
  { id: 'classic',    name: 'Classic Matrix',   desc: 'Your current layout',               emoji: '◈' },
  { id: 'neumorphic', name: 'Soft Neumorphic',  desc: 'Pillow shadows',                    emoji: '○' },
  { id: 'stacked',    name: 'Stacked Cards',    desc: '3D layered depth',                  emoji: '▤' },
  { id: 'radial',     name: 'Circular Radial',  desc: 'Orbit layout',                      emoji: '◎' },
  { id: 'tarot',      name: 'Tarot Cards',      desc: 'Swipe to decide',                   emoji: '🎴' },
  { id: 'hive',       name: 'Honeycomb Hive',   desc: 'Hex grid + bees',                   emoji: '⬢' },
  { id: 'vending',    name: 'Vending Machine',  desc: 'Arcade dispenser',                  emoji: '▮' },
  { id: 'detective',  name: 'Detective Board',  desc: 'Cork + red strings',                emoji: '📌' },
  { id: 'kanban',     name: 'Priority Board',   desc: 'Drag between quadrants',            emoji: '▥' },
];

const STORAGE_KEY = 'taskflow_ui_design';
const EVENT_NAME = 'ui-design-changed';
const USER_ID_KEY = 'taskflow_user_id';
const SERVER_URL = 'https://task-priority-server-pir6.onrender.com';

/* ───────────────────────── helpers ───────────────────────── */

function readUserId(): string | null {
  try { return localStorage.getItem(USER_ID_KEY); } catch { return null; }
}

function isDesign(v: unknown): v is UIDesign {
  return typeof v === 'string' && UI_DESIGNS.some((d) => d.id === v);
}

/** Fire-and-forget push of the chosen theme to the backend. Offline is fine — local copy stands. */
function pushPreferences(uiDesign: UIDesign) {
  const userId = readUserId();
  if (!userId) return;
  try {
    void fetch(`${SERVER_URL}/api/preferences/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uiDesign }),
    }).catch(() => { /* offline — ignore */ });
  } catch { /* noop */ }
}

/* ───────────────────────── hook ───────────────────────── */

export function useUIDesign() {
  const [uiDesign, setUIState] = useState<UIDesign>(() => {
    if (typeof window === 'undefined') return DEFAULT_UI_DESIGN;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as UIDesign | null;
      if (saved && UI_DESIGNS.find((d) => d.id === saved)) return saved;
    } catch { /* storage blocked */ }
    // 👇 New user (or invalid stored value) → seeded with Leather Binder
    return DEFAULT_UI_DESIGN;
  });

  // Gate the push effect until the first pull has settled — otherwise we'd race
  // and overwrite a synced value with the local default. `tick` forces the push
  // effect to re-run once hydration finishes (a ref alone wouldn't re-render).
  const hydrated = useRef(false);
  const [tick, setTick] = useState(0);

  // Apply to <html> attribute + persist locally
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-ui-design', uiDesign);
    try { localStorage.setItem(STORAGE_KEY, uiDesign); } catch { /* ignore */ }
  }, [uiDesign]);

  // Pull this user's saved theme from the backend (once per mount)
  useEffect(() => {
    const userId = readUserId();
    if (!userId) {
      hydrated.current = true;
      setTick((n) => n + 1);
      return;
    }
    let cancelled = false;

    fetch(`${SERVER_URL}/api/preferences/${encodeURIComponent(userId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const remote = data?.preferences?.uiDesign;
        if (isDesign(remote)) {
          try { localStorage.setItem(STORAGE_KEY, remote); } catch { /* ignore */ }
          document.documentElement.setAttribute('data-ui-design', remote);
          setUIState(remote);
          window.dispatchEvent(new Event(EVENT_NAME));
        }
        // nothing stored server-side → the push effect below seeds it
      })
      .catch(() => { /* offline — local value wins */ })
      .finally(() => {
        if (cancelled) return;
        hydrated.current = true;
        setTick((n) => n + 1);
      });

    return () => { cancelled = true; };
  }, []);

  // Push every change (and the post-hydration seed)
  useEffect(() => {
    if (!hydrated.current) return;
    pushPreferences(uiDesign);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiDesign, tick]);

  // Listen for changes from other components
  useEffect(() => {
    const handler = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as UIDesign | null;
        if (saved && UI_DESIGNS.find((d) => d.id === saved)) {
          setUIState(saved);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  // Custom setter that broadcasts — once user picks, it becomes their default
  const setUIDesign = (newDesign: UIDesign) => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(STORAGE_KEY, newDesign); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-ui-design', newDesign);
    setUIState(newDesign);
    window.dispatchEvent(new Event(EVENT_NAME));
  };

  return { uiDesign, setUIDesign };
}
