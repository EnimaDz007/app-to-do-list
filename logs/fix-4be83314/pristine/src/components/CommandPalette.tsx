import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: string;
  emoji?: string;
  keywords?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
}

const CATEGORY_ORDER = ['Navigate', 'Action', 'Task', 'Habit'];

const CATEGORY_LABELS: Record<string, string> = {
  Navigate: 'Navigate',
  Action: 'Actions',
  Task: 'Tasks',
  Habit: 'Habits',
};

function matches(item: CommandItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const haystack = `${item.label} ${item.description || ''} ${item.keywords || ''}`.toLowerCase();
  // Simple substring match — fast enough for the list sizes we handle
  return haystack.includes(q);
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, items }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => items.filter((it) => matches(it, query)), [items, query]);

  const grouped = useMemo(() => {
    const map: Record<string, CommandItem[]> = {};
    filtered.forEach((it) => {
      if (!map[it.category]) map[it.category] = [];
      map[it.category].push(it);
    });
    return map;
  }, [filtered]);

  const flatList = useMemo(() => {
    const out: CommandItem[] = [];
    CATEGORY_ORDER.forEach((cat) => {
      if (grouped[cat]) out.push(...grouped[cat]);
    });
    return out;
  }, [grouped]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Auto-scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, Math.max(flatList.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatList[selectedIndex];
      if (item) item.onSelect();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Running counter for the flat index — incremented per item rendered
  let runningIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-[12vh] z-[101] w-[92%] max-w-lg -translate-x-1/2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
          >
            {/* Search bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type a command or search…"
                className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-1">
              {flatList.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-slate-400">
                  No matches for "{query}"
                </div>
              )}

              {CATEGORY_ORDER.map((cat) => {
                const catItems = grouped[cat];
                if (!catItems || catItems.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {CATEGORY_LABELS[cat] || cat}
                    </div>
                    {catItems.map((item) => {
                      runningIndex++;
                      const idx = runningIndex;
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          data-index={idx}
                          onClick={item.onSelect}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/40'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <span className="text-base shrink-0 w-6 text-center">
                            {item.emoji || '•'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-[13px] font-semibold truncate ${
                                isSelected
                                  ? 'text-indigo-900 dark:text-indigo-200'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {item.label}
                            </div>
                            {item.description && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate capitalize">
                                {item.description}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <CornerDownLeft className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer hints */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="inline-flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                <ArrowDown className="w-3 h-3" />
                navigate
              </span>
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3" />
                select
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};