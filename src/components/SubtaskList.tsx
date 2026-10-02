import React, { useState } from 'react';
import type { Subtask } from '../types';
import { TaskItem } from './TaskItem';
import { insertSubtask, countSubtasks, makeId } from '../utils/subtaskHelpers';
import { useLanguage } from '../context/LanguageContext';

type Props = {
  subtasks: Subtask[];
  onChange: (next: Subtask[]) => void;
};

export const SubtaskList: React.FC<Props> = ({ subtasks, onChange }) => {
  const { t } = useLanguage();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const { done, total } = countSubtasks(subtasks);

  const handleAddTop = () => {
    const title = draft.trim();
    if (!title) return;
    const child: Subtask = { id: makeId(), title, done: false };
    onChange(insertSubtask(subtasks, null, child));
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="subtask-block">
      {total > 0 && (
        <div className="subtask-header">
          <span className="subtask-header-title">{t('subtask_header_label')}</span>
          <span className="subtask-header-count">{done}/{total}</span>
        </div>
      )}

      {subtasks.length > 0 && (
        <ul className="subtask-list">
          {subtasks.map(child => (
            <TaskItem
              key={child.id}
              subtask={child}
              depth={0}
              siblings={subtasks}
              onChange={onChange}
            />
          ))}
        </ul>
      )}

      {adding ? (
        <div className="subtask-add-form">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddTop();
              if (e.key === 'Escape') {
                setAdding(false);
                setDraft('');
              }
            }}
            placeholder={t('subtask_placeholder')}
          />
          <button onClick={handleAddTop}>{t('subtask_btn_add')}</button>
          <button
            onClick={() => {
              setAdding(false);
              setDraft('');
            }}
          >
            {t('subtask_btn_cancel')}
          </button>
        </div>
      ) : (
        <button className="subtask-add-btn" onClick={() => setAdding(true)}>
          {t('subtask_add')}
        </button>
      )}
    </div>
  );
};