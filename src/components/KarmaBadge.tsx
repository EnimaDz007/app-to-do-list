import React from 'react';

interface KarmaBadgeProps {
  total: number;
  emoji: string;
  onClick: () => void;
}

export const KarmaBadge: React.FC<KarmaBadgeProps> = ({ total, emoji, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm shadow-violet-500/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
      title="Karma — tap to see your progression"
    >
      <span className="text-[11px] leading-none">{emoji}</span>
      <span className="font-extrabold leading-none">{total}</span>
    </button>
  );
};