import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, RefreshCw, Users, Clock, ExternalLink } from 'lucide-react';
import { Task, DelegateStatus } from '../types';
import { triggerHaptic } from '../utils/haptics';
import {
  createDelegateShare,
  getDelegateStatus,
  buildShareMessage,
  copyToClipboard,
  nativeShare,
} from '../utils/delegateShare';

interface DelegateShareModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onDelegateIdCreated: (taskId: string, delegateId: string) => void;
  onDelegateStatusChanged: (
    taskId: string,
    status: DelegateStatus,
    completedBy?: string
  ) => void;
}

type Phase = 'intro' | 'creating' | 'ready' | 'error';

const STATUS_LABEL: Record<DelegateStatus, string> = {
  pending: 'Waiting for them…',
  completed: 'Completed 🎉',
  rejected: 'Declined',
};

const STATUS_COLOR: Record<DelegateStatus, string> = {
  pending: '#F59E0B',
  completed: '#059669',
  rejected: '#E11D48',
};

export const DelegateShareModal: React.FC<DelegateShareModalProps> = ({
  isOpen,
  task,
  onClose,
  onDelegateIdCreated,
  onDelegateStatusChanged,
}) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [delegateId, setDelegateId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<DelegateStatus | null>(null);
  const [checking, setChecking] = useState(false);

  // Reset when a new task opens
  useEffect(() => {
    if (!isOpen) return;
    if (!task) {
      setPhase('intro');
      setShareUrl('');
      setDelegateId('');
      setCopied(false);
      setCurrentStatus(null);
      return;
    }

    if (task.delegateId) {
      // Already shared — go straight to ready
      const url = `https://task-priority-server-pir6.onrender.com/delegate/${task.delegateId}`;
      setDelegateId(task.delegateId);
      setShareUrl(url);
      setCurrentStatus(task.delegateStatus || 'pending');
      setPhase('ready');
      // Fetch latest status immediately
      refreshStatus(task.delegateId, task.id);
    } else {
      setPhase('intro');
      setShareUrl('');
      setDelegateId('');
      setCopied(false);
      setCurrentStatus(null);
    }
    // eslint-disable-next-line
  }, [isOpen, task?.id]);

  if (!isOpen || !task) return null;

  const handleCreateLink = async () => {
    triggerHaptic('medium');
    setPhase('creating');
    const result = await createDelegateShare(task, 'A teammate');
    if (!result) {
      setPhase('error');
      return;
    }
    setDelegateId(result.delegateId);
    setShareUrl(result.shareUrl);
    setCurrentStatus('pending');
    setPhase('ready');
    onDelegateIdCreated(task.id, result.delegateId);
    triggerHaptic('success');
  };

  const handleCopy = async () => {
    triggerHaptic('medium');
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    triggerHaptic('medium');
    const msg = buildShareMessage(task.title, shareUrl);
    const shared = await nativeShare(msg, shareUrl);
    if (!shared) {
      // fallback: copy
      await handleCopy();
    }
  };

  const refreshStatus = async (id: string, taskId: string) => {
    setChecking(true);
    const res = await getDelegateStatus(id);
    setChecking(false);
    if (!res) return;
    setCurrentStatus(res.status);
    onDelegateStatusChanged(taskId, res.status, res.completedBy);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-[71] w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    Delegate task
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Share via link — no account needed
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mb-4">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Task
                </div>
                <div className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug">
                  {task.title}
                </div>
                {task.description && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {task.description}
                  </div>
                )}
              </div>

              {phase === 'intro' && (
                <>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    Creates a public link you can send via <span className="font-semibold">WhatsApp, SMS, or email</span>. They tap the link → see the task → tap "Mark as done". You get auto-notified in the app.
                  </p>
                  <button
                    onClick={handleCreateLink}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition active:scale-[0.98] cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Generate share link</span>
                  </button>
                </>
              )}

              {phase === 'creating' && (
                <div className="py-8 text-center">
                  <div className="w-10 h-10 mx-auto border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-3">
                    Creating your link…
                  </p>
                </div>
              )}

              {phase === 'error' && (
                <>
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-[12px] text-rose-700 dark:text-rose-300 mb-4">
                    Couldn't reach the server. Check your connection and try again.
                  </div>
                  <button
                    onClick={handleCreateLink}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try again</span>
                  </button>
                </>
              )}

              {phase === 'ready' && (
                <>
                  {/* Status chip */}
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={{
                        backgroundColor: `${STATUS_COLOR[currentStatus || 'pending']}18`,
                        color: STATUS_COLOR[currentStatus || 'pending'],
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[currentStatus || 'pending'] }}
                      />
                      {STATUS_LABEL[currentStatus || 'pending']}
                    </div>
                    <button
                      onClick={() => refreshStatus(delegateId, task.id)}
                      disabled={checking}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>

                  {/* The link */}
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      Share link
                    </div>
                    <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all leading-snug">
                      {shareUrl}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={handleCopy}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Open in browser */}
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Preview link as recipient</span>
                  </a>

                  {/* Recipient info if completed */}
                  {currentStatus === 'completed' && task.delegateCompletedBy && (
                    <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-[11px] text-emerald-800 dark:text-emerald-200">
                      <div className="font-bold">Completed by {task.delegateCompletedBy}</div>
                      {task.delegateCompletedAt && (
                        <div className="text-[10px] opacity-80 mt-0.5">
                          {new Date(task.delegateCompletedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-start gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 leading-snug">
                    <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>
                      Status updates automatically when you open the app. The recipient doesn't need to install anything.
                    </span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};