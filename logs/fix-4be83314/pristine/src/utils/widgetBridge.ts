import { registerPlugin, Capacitor } from '@capacitor/core';
import { Task } from '../types';

const WIDGET_DATA_KEY = 'widget_data';
const MAX_TASKS_IN_WIDGET = 3;

interface WidgetBridgePlugin {
  updateWidget(options: { data: string }): Promise<{ success: boolean }>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

export interface WidgetSyncPayload {
  streak: number;
  karma: number;
  levelEmoji: string;
  levelName: string;
  levelProgress: number;
  tasks: { id: string; title: string; quadrant: string }[];
  updatedAt: string;
}

function pickTopTasks(tasks: Task[], limit: number): Task[] {
  const rank: Record<string, number> = {
    do_first: 0,
    schedule: 1,
    delegate: 2,
    eliminate: 3,
  };

  return tasks
    .filter((t) => t.status !== 'completed' && !t.archivedAt)
    .sort((a, b) => {
      const ra = rank[a.quadrant] ?? 99;
      const rb = rank[b.quadrant] ?? 99;
      if (ra !== rb) return ra - rb;
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return da - db;
    })
    .slice(0, limit);
}

export async function syncWidgetData(
  tasks: Task[],
  streak: number,
  karma: number,
  levelEmoji: string,
  levelName: string,
  levelProgress = 0,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const top = pickTopTasks(tasks, MAX_TASKS_IN_WIDGET);
    const payload: WidgetSyncPayload = {
      streak,
      karma,
      levelEmoji,
      levelName,
      levelProgress: Math.max(0, Math.min(100, Math.round(levelProgress * 100))),
      tasks: top.map((t) => ({
        id: t.id,
        title: t.title,
        quadrant: t.quadrant,
      })),
      updatedAt: new Date().toISOString(),
    };

    await WidgetBridge.updateWidget({
      data: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('widgetBridge sync failed:', err);
  }
}