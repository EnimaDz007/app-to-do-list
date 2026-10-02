import React, { useState } from 'react';
import type { Subtask } from '../types';
import {
  insertSubtask,
  toggleSubtask,
  deleteSubtask,
  renameSubtask,
  countSubtasks,
  makeId,
} from '../utils/subtaskHelpers';
import { useLanguage } from '../context/LanguageContext';

type Props = {
  subtask: Subtask;
  depth: number;
  onChange: (next: Subtask[]) => void;
  siblings: Subtask[];
};

export const TaskItem: React.FC<Props> = ({ subtask, depth, onChange, siblings }) => {
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(subtask.title);

  const children = subtask.subtasks ?? [];
  const hasChildren = children.length > 0;
  const { done, total } = countSubtasks(children);

  const handleToggle = () => onChange(toggleSubtask(siblings, subtask.id));

  const handleAddChild = () => {
    const title = draft.trim();
    if (!title) return;
    const child: Subtask = { id: makeId(), title, done: false };
    onChange(insertSubtask(siblings, subtask.id, child));
    setDraft('');
    setAdding(false);
    setCollapsed(false);
  };

  const handleDelete = () => {
    if (!confirm(t('subtask_delete_confirm', { title: subtask.title }))) return;
    onChange(deleteSubtask(siblings, subtask.id));
  };

  const handleRename = () => {
    const title = editValue.trim();
    if (title) onChange(renameSubtask(siblings, subtask.id, title));
    setEditing(false);
  };

  return (
    <li className="subtask-item" style={{ ['--depth' as any]: depth }}>
      <div className="subtask-row">
        {hasChildren ? (
          <button
            className="subtask-chevron"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? t('subtask_expand') : t('subtask_collapse')}
          >
            {collapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span className="subtask-chevron-spacer" />
        )}

        <input
          type="checkbox"
          className="subtask-check"
          checked={subtask.done}
          onChange={handleToggle}
        />

        {editing ? (
          <input
            className="subtask-edit-input"
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setEditValue(subtask.title);
                setEditing(false);
              }
            }}
          />
        ) : (
          <span
            className={`subtask-title ${subtask.done ? 'is-done' : ''}`}
            onDoubleClick={() => setEditing(true)}
            title={t('subtask_rename_hint')}
          >
            {subtask.title}
          </span>
        )}

        {hasChildren && <span className="subtask-pill">{done}/{total}</span>}

        <button
          className="subtask-action"
          onClick={() => setAdding(true)}
          title={t('subtask_add_child')}
        >
          +
        </button>
        <button
          className="subtask-action subtask-delete"
          onClick={handleDelete}
          title={t('subtask_delete')}
        >
          ×
        </button>
      </div>

      {hasChildren && !collapsed && (
        <ul className="subtask-list">
          {children.map(child => (
            <TaskItem
              key={child.id}
              subtask={child}
              depth={depth + 1}
              siblings={children}
              onChange={next => {
                const updated = siblings.map(s =>
                  s.id === subtask.id ? { ...s, subtasks: next } : s
                );
                onChange(updated);
              }}
            />
          ))}
        </ul>
      )}

      {adding && (
        <div className="subtask-add-form" style={{ paddingLeft: (depth + 1) * 22 + 28 }}>
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddChild();
              if (e.key === 'Escape') {
                setAdding(false);
                setDraft('');
              }
            }}
            placeholder={t('subtask_placeholder')}
          />
          <button onClick={handleAddChild}>{t('subtask_btn_add')}</button>
          <button
            onClick={() => {
              setAdding(false);
              setDraft('');
            }}
          >
            {t('subtask_btn_cancel')}
          </button>
        </div>
      )}
    </li>
  );
};