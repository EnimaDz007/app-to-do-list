import type { Subtask, Task } from '../types';

/* ─────────────────────────────────────────────
   ID generator (replace with nanoid/uuid if you have one)
   ───────────────────────────────────────────── */
export const makeId = () =>
  `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/* ─────────────────────────────────────────────
   Insert a new subtask under a given parent
   - parentSubtaskId === null → insert at Task top level
   - parentSubtaskId === id   → insert as child of that subtask
   Returns a NEW array (immutable).
   ───────────────────────────────────────────── */
export function insertSubtask(
  tree: Subtask[],
  parentSubtaskId: string | null,
  newSubtask: Subtask
): Subtask[] {
  if (parentSubtaskId === null) {
    return [...tree, newSubtask];
  }
  return tree.map(node => {
    if (node.id === parentSubtaskId) {
      return { ...node, subtasks: [...(node.subtasks ?? []), newSubtask] };
    }
    if (node.subtasks?.length) {
      return { ...node, subtasks: insertSubtask(node.subtasks, parentSubtaskId, newSubtask) };
    }
    return node;
  });
}

/* ─────────────────────────────────────────────
   Toggle a subtask's done state (recursive).
   Cascade: setting a parent → cascades to all descendants.
   Roll-up: a parent becomes done iff ALL its children are done.
   ───────────────────────────────────────────── */
export function toggleSubtask(tree: Subtask[], subtaskId: string): Subtask[] {
  const walk = (nodes: Subtask[]): Subtask[] =>
    nodes.map(node => {
      if (node.id === subtaskId) {
        const nextDone = !node.done;
        const cascade = (n: Subtask, done: boolean): Subtask => ({
          ...n,
          done,
          subtasks: n.subtasks?.map(c => cascade(c, done)),
        });
        return cascade({ ...node, done: nextDone }, nextDone);
      }
      if (node.subtasks?.length) {
        const updated = walk(node.subtasks);
        const allDone = updated.length > 0 && updated.every(c => c.done);
        return { ...node, subtasks: updated, done: allDone };
      }
      return node;
    });
  return walk(tree);
}

/* ─────────────────────────────────────────────
   Delete a subtask at any depth
   ───────────────────────────────────────────── */
export function deleteSubtask(tree: Subtask[], subtaskId: string): Subtask[] {
  return tree
    .filter(node => node.id !== subtaskId)
    .map(node =>
      node.subtasks?.length
        ? { ...node, subtasks: deleteSubtask(node.subtasks, subtaskId) }
        : node
    );
}

/* ─────────────────────────────────────────────
   Rename a subtask at any depth
   ───────────────────────────────────────────── */
export function renameSubtask(
  tree: Subtask[],
  subtaskId: string,
  title: string
): Subtask[] {
  return tree.map(node => {
    if (node.id === subtaskId) return { ...node, title };
    if (node.subtasks?.length) {
      return { ...node, subtasks: renameSubtask(node.subtasks, subtaskId, title) };
    }
    return node;
  });
}

/* ─────────────────────────────────────────────
   Count all descendants (for progress pill)
   ───────────────────────────────────────────── */
export function countSubtasks(tree: Subtask[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  const walk = (nodes: Subtask[]) => {
    for (const n of nodes) {
      total += 1;
      if (n.done) done += 1;
      if (n.subtasks?.length) walk(n.subtasks);
    }
  };
  walk(tree);
  return { done, total };
}

/* ─────────────────────────────────────────────
   Immutable task-list helper (updates one task's subtasks)
   ───────────────────────────────────────────── */
export function updateTaskSubtasks(
  tasks: Task[],
  taskId: string,
  updater: (subs: Subtask[]) => Subtask[]
): Task[] {
  return tasks.map(t =>
    t.id === taskId ? { ...t, subtasks: updater(t.subtasks ?? []) } : t
  );
}