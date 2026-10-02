import { Task } from '../types';

const SERVER_URL = 'https://task-priority-server-pir6.onrender.com';

export interface DelegateStatusResult {
  status: 'pending' | 'completed' | 'rejected';
  completedBy?: string;
  completedAt?: string;
  rejectionReason?: string;
}

export interface CreateDelegateResult {
  delegateId: string;
  shareUrl: string;
}

/**
 * Creates a delegate record on the server and returns the share URL.
 */
export async function createDelegateShare(
  task: Task,
  senderName?: string
): Promise<CreateDelegateResult | null> {
  try {
    const externalId = localStorage.getItem('taskflow_user_id') || 'test-user-123';
    const response = await fetch(`${SERVER_URL}/api/delegate/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        externalId,
        senderName: senderName || 'A teammate',
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.success || !data.delegateId) return null;
    return {
      delegateId: data.delegateId,
      shareUrl: `${SERVER_URL}/delegate/${data.delegateId}`,
    };
  } catch (err) {
    console.warn('createDelegateShare failed:', err);
    return null;
  }
}

/**
 * Fetches the current status of a delegate record.
 */
export async function getDelegateStatus(
  delegateId: string
): Promise<DelegateStatusResult | null> {
  try {
    const response = await fetch(`${SERVER_URL}/api/delegate/${delegateId}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.success || !data.task) return null;
    return {
      status: data.task.status,
      completedBy: data.task.completedBy,
      completedAt: data.task.completedAt,
      rejectionReason: data.task.rejectionReason,
    };
  } catch {
    return null;
  }
}

export function buildShareMessage(taskTitle: string, shareUrl: string): string {
  return `Hey! Could you take care of "${taskTitle}" for me? ${shareUrl}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy */
  }
  // Fallback for old browsers / WebViews
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function nativeShare(message: string, url: string): Promise<boolean> {
  try {
    const nav: any = navigator;
    if (nav.share) {
      await nav.share({ title: 'Delegated task', text: message, url });
      return true;
    }
  } catch {
    /* user cancelled or not supported */
  }
  return false;
}