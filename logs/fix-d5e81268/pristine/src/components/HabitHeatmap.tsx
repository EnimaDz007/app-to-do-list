import React from 'react';

interface HabitHeatmapProps {
  // map of date string 'YYYY-MM-DD' → count
  checkInMap: Record<string, number>;
  color: string;
  days?: number; // how many days to show (default 90)
}

// Format a Date to 'YYYY-MM-DD' in LOCAL time
function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({
  checkInMap,
  color,
  days = 90,
}) => {
  // Build the grid: start from today, go back N days
  const cells: { date: Date; key: string; count: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    cells.push({ date: d, key, count: checkInMap[key] || 0 });
  }

  // Group by week (columns of 7 days)
  const columns: typeof cells[] = [];
  let currentCol: typeof cells = [];
  // Add blank cells at the start so the first column starts on Sunday
  const firstDay = cells[0].date.getDay(); // 0 = Sun
  for (let i = 0; i < firstDay; i++) {
    currentCol.push({ date: new Date(0), key: '', count: -1 }); // -1 = placeholder
  }
  cells.forEach((cell) => {
    currentCol.push(cell);
    if (currentCol.length === 7) {
      columns.push(currentCol);
      currentCol = [];
    }
  });
  if (currentCol.length > 0) {
    while (currentCol.length < 7) {
      currentCol.push({ date: new Date(0), key: '', count: -1 });
    }
    columns.push(currentCol);
  }

  // Color intensity based on count
  const getCellColor = (count: number) => {
    if (count === -1) return 'transparent';       // placeholder
    if (count === 0) return 'rgba(148, 163, 184, 0.15)'; // light gray
    if (count === 1) return color + '66'; // 40% opacity
    if (count === 2) return color + '99'; // 60% opacity
    if (count >= 3) return color; // full color
    return color + '66';
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-[3px] min-w-max">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-[3px]">
            {col.map((cell, rowIdx) => (
              <div
                key={rowIdx}
                title={cell.count === -1 ? '' : `${cell.key}: ${cell.count > 0 ? '✓' : '—'}`}
                className="w-[10px] h-[10px] rounded-sm transition-colors"
                style={{ backgroundColor: getCellColor(cell.count) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-2 text-[9px] text-slate-400">
        <span>Less</span>
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgba(148, 163, 184, 0.15)' }} />
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color + '66' }} />
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color + '99' }} />
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
        <span>More</span>
      </div>
    </div>
  );
};