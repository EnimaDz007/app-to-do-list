import { useState, useEffect } from 'react';

export type UIDesign =
  | 'classic'
  | 'neumorphic'
  | 'stacked'
  | 'radial'
  | 'tarot'
  | 'hive'
  | 'vending'
  | 'detective';

export const UI_DESIGNS: { id: UIDesign; name: string; desc: string; emoji: string }[] = [
  { id: 'classic',    name: 'Classic Matrix',   desc: 'Your current layout',  emoji: '◈' },
  { id: 'neumorphic', name: 'Soft Neumorphic',  desc: 'Pillow shadows',       emoji: '○' },
  { id: 'stacked',    name: 'Stacked Cards',    desc: '3D layered depth',     emoji: '▤' },
  { id: 'radial',     name: 'Circular Radial',  desc: 'Orbit layout',         emoji: '◎' },
  { id: 'tarot',      name: 'Tarot Cards',      desc: 'Swipe to decide',      emoji: '🎴' },
  { id: 'hive',       name: 'Honeycomb Hive',   desc: 'Hex grid + bees',      emoji: '⬢' },
  { id: 'vending',    name: 'Vending Machine',  desc: 'Arcade dispenser',     emoji: '▮' },
  { id: 'detective',  name: 'Detective Board',  desc: 'Cork + red strings',   emoji: '📌' },
];

const STORAGE_KEY = 'taskflow_ui_design';
const EVENT_NAME = 'ui-design-changed';

export function useUIDesign() {
  const [uiDesign, setUIState] = useState<UIDesign>(() => {
    if (typeof window === 'undefined') return 'classic';
    const saved = localStorage.getItem(STORAGE_KEY) as UIDesign | null;
    if (saved && UI_DESIGNS.find((d) => d.id === saved)) return saved;
    return 'classic';
  });

  // Apply to <html> attribute + persist
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-ui-design', uiDesign);
    localStorage.setItem(STORAGE_KEY, uiDesign);
  }, [uiDesign]);

  // ✅ Listen for changes from other components
  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem(STORAGE_KEY) as UIDesign | null;
      if (saved && UI_DESIGNS.find((d) => d.id === saved)) {
        setUIState(saved);
      }
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  // ✅ Custom setter that broadcasts
  const setUIDesign = (newDesign: UIDesign) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, newDesign);
    document.documentElement.setAttribute('data-ui-design', newDesign);
    setUIState(newDesign);
    window.dispatchEvent(new Event(EVENT_NAME));
  };

  return { uiDesign, setUIDesign };
}
