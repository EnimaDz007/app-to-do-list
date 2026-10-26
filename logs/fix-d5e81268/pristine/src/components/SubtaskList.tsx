import React from 'react';
import { Subtask } from '../types';
import { Check, X, Plus } from 'lucide-react';

interface SubtaskListProps {
  subtasks: Subtask[];
  onChange: (next: Subtask[]) => void;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({ subtasks, onChange }) => {
  const handleToggle = (id: string) => {
    const toggleRecursive = (nodes: Subtask[]): Subtask[] =>
      nodes.map((node) => {
        if (node.id === id) return { ...node, done: !node.done };
        if (node.subtasks) return { ...node, subtasks: toggleRecursive(node.subtasks) };
        return node;
      });
    onChange(toggleRecursive(subtasks));
  };

  const handleRemove = (id: string) => {
    const removeRecursive = (nodes: Subtask[]): Subtask[] =>
      nodes
        .filter((node) => node.id !== id)
        .map((node) => {
          if (node.subtasks) return { ...node, subtasks: removeRecursive(node.subtasks) };
          return node;
        });
    onChange(removeRecursive(subtasks));
  };

  const handleChangeText = (id: string, text: string) => {
    const changeRecursive = (nodes: Subtask[]): Subtask[] =>
      nodes.map((node) => {
        if (node.id === id) return { ...node, title: text };
        if (node.subtasks) return { ...node, subtasks: changeRecursive(node.subtasks) };
        return node;
      });
    onChange(changeRecursive(subtasks));
  };

  const handleAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault();
      const newSub: Subtask = {
        id: `st_${Date.now()}`,
        title: e.currentTarget.value.trim(),
        done: false,
      };
      onChange([...subtasks, newSub]);
      e.currentTarget.value = '';
    }
  };

  const renderNode = (node: Subtask, depth = 0) => (
    <div key={node.id} className="flex flex-col gap-1 w-full">
      <div className="flex items-center gap-2 group w-full" style={{ paddingLeft: depth * 16 }}>
        <button onClick={() => handleToggle(node.id)} className={`w-4 h-4 shrink-0 rounded-md border flex items-center justify-center transition-colors ${node.done ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 hover:border-indigo-400'}`}>
          {node.done && <Check size={12} className="text-white" />}
        </button>
        <input
          type="text"
          defaultValue={node.title}
          onBlur={(e) => handleChangeText(node.id, e.target.value)}
          className={`flex-1 w-full min-w-0 bg-transparent text-sm outline-none ${node.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}
        />
        <button onClick={() => handleRemove(node.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all shrink-0">
          <X size={14} />
        </button>
      </div>
      {node.subtasks?.map((sub) => renderNode(sub, depth + 1))}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {subtasks.map((sub) => renderNode(sub))}
      <div className="flex items-center gap-2 mt-1">
        <Plus size={14} className="text-slate-400 shrink-0" />
        <input type="text" placeholder="Add subtask and press Enter" onKeyDown={handleAdd} className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
      </div>
    </div>
  );
};