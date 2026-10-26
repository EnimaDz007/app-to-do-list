// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/quickAddParser.ts
//  Natural language text parser for the Quick Add bar.
//  Reuses the voice parser's date/category/priority logic,
//  adds text-specific syntax:
//    • #personal, #design   → category override
//    • // a note            → description separator
//    • "urgent" / "asap" at the END → stripped from title
//      (mid-sentence priority keywords stay in the title)
//  Everything else (tomorrow, 5pm, !high, @home, ~30m) is
//  handled by parseSpokenTask().
// ─────────────────────────────────────────────────────────────

import { parseSpokenTask, ParsedVoiceTask } from './voiceParser';
import { Task, TaskCategory } from '../types';

export interface ParsedQuickAdd extends ParsedVoiceTask {
  /** True when there's at least a non-empty title */
  isValid: boolean;
}

/** Hashtag → category map. Lowercase keys. */
const CATEGORY_HASHTAGS: Record<string, TaskCategory> = {
  engineering: 'Engineering',
  dev: 'Engineering',
  code: 'Engineering',
  product: 'Product',
  design: 'Design',
  operations: 'Operations',
  ops: 'Operations',
  client: 'Client',
  marketing: 'Marketing',
  personal: 'Personal',
};

/**
 * Priority keywords that get stripped from the END of the input.
 * Sorted longest-first at runtime so "high priority" matches before "priority".
 * Matches plain English / French / Arabic words, NOT the "!high" syntax
 * (that's handled separately by the voice parser's stripExplicitTokens).
 */
const TRAILING_PRIORITY_KEYWORDS = [
  // English
  'high priority',
  'top priority',
  'as soon as possible',
  'urgently',
  'urgent',
  'asap',
  'critical',
  'critically',
  'emergency',
  'immediately',
  'immediate',
  'pressing',
  // French
  'très urgent',
  'dès que possible',
  'tout de suite',
  'immédiatement',
  'impératif',
  'critique',
  'urgent',
  // Arabic
  'أولوية قصوى',
  'أولوية أولى',
  'فورا',
  'عاجل',
  'ضروري',
  'طارئ',
];

const EMPTY_RESULT: ParsedQuickAdd = {
  rawTranscript: '',
  title: '',
  description: '',
  category: 'Personal',
  quadrant: 'do_first',
  priority: 'urgent',
  estimatedMinutes: 30,
  dueDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  contexts: [],
  confidenceScore: 0,
  isValid: false,
};

/**
 * If the LAST word(s) of the text match a priority keyword,
 * strip them. Only strips when other content remains.
 *
 *   "Call mom urgent"        → "Call mom"
 *   "Fix urgent bug"         → "Fix urgent bug"  (mid-sentence)
 *   "urgent"                 → "urgent"          (nothing else left)
 *   "Buy milk ASAP."         → "Buy milk"
 */
function stripTrailingPriorityKeyword(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  // Remove trailing punctuation for matching, but only from the compare
  const noPunct = trimmed.replace(/[.!?,;]+\s*$/, '').trim();
  const lower = noPunct.toLowerCase();

  // Longest keywords first
  const sorted = [...TRAILING_PRIORITY_KEYWORDS].sort(
    (a, b) => b.length - a.length
  );

  for (const kw of sorted) {
    const kwLower = kw.toLowerCase();

    // Match either the whole string or " something urgent"
    if (lower === kwLower) {
      // Whole input was just "urgent" — don't strip, nothing to keep
      return trimmed;
    }

    if (lower.endsWith(' ' + kwLower)) {
      const stripped = noPunct
        .slice(0, noPunct.length - kw.length)
        .trim();

      // Only strip when 2+ characters remain (avoid leaving "a" or "")
      if (stripped.length >= 2) {
        return stripped;
      }
    }
  }

  return trimmed;
}

/**
 * Parse a single-line text input (Quick Add bar).
 * Never throws. Returns `isValid: false` for empty input.
 */
export function parseQuickAdd(input: string): ParsedQuickAdd {
  const raw = input.trim();
  if (raw.length === 0) return EMPTY_RESULT;

  let mainText = raw;
  let description = '';

  // ── 1. Extract "// description" separator ──
  const descIndex = raw.indexOf('//');
  if (descIndex > 0) {
    description = raw.slice(descIndex + 2).trim();
    mainText = raw.slice(0, descIndex).trim();
  }

  // ── 2. Extract #category hashtags (#personal, #design, etc.) ──
  //    These conflict with the voice parser's "#quadrant" tokens,
  //    so we strip them first and remember the category.
  let explicitCategory: TaskCategory | null = null;
  const hashtagMatches = mainText.match(/#([a-zA-Z]+)/g) || [];
  for (const m of hashtagMatches) {
    const key = m.slice(1).toLowerCase();
    const mapped = CATEGORY_HASHTAGS[key];
    if (mapped) {
      explicitCategory = mapped;
      mainText = mainText.replace(m, ' ');
      break;
    }
  }
  mainText = mainText.replace(/\s+/g, ' ').trim();

  // ── 3. Delegate the rest to the voice parser ──
  const parsed = parseSpokenTask(mainText);

  // ── 4. Strip trailing priority keyword from the title ──
  //    Only affects the title, the priority itself was already
  //    detected by the voice parser via keyword matching.
  const cleanedTitle = stripTrailingPriorityKeyword(parsed.title);

  return {
    ...parsed,
    title: cleanedTitle,
    description: description || parsed.description,
    category: explicitCategory ?? parsed.category,
    isValid: cleanedTitle.trim().length > 0,
  };
}

/**
 * Convert a parsed Quick Add result into a Task payload
 * ready to be handed to `handleSaveTask`.
 */
export function quickAddToTask(
  parsed: ParsedQuickAdd
): Omit<Task, 'id' | 'createdAt'> {
  return {
    title: parsed.title,
    description: parsed.description,
    quadrant: parsed.quadrant,
    priority: parsed.priority,
    category: parsed.category,
    status: 'todo',
    estimatedMinutes: parsed.estimatedMinutes,
    dueDate: parsed.dueDate,
    impactScore: 3,
    effortScore: 3,
    contexts: parsed.contexts.length > 0 ? parsed.contexts : undefined,
  };
}

/** Human-friendly due date for the preview chip. */
export function formatPreviewDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';

  const now = new Date();
  const todayStr = now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const timeStr = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (d.toDateString() === todayStr) return `Today ${timeStr}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${timeStr}`;

  return (
    d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) +
    ' · ' +
    timeStr
  );
}