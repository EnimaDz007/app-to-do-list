import React, { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

type Lang = 'en' | 'fr' | 'ar';

const LOCALES: Record<Lang, {
  monthNames: string[];
  dayShort: string[];
  clear: string;
  today: string;
  weekStart: number;
  done: string;
  am: string;
  pm: string;
  h24: string;
  h12: string;
}> = {
  en: {
    monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    dayShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    clear: 'Clear', today: 'Today', weekStart: 0,
    done: 'Done', am: 'AM', pm: 'PM', h24: '24h', h12: 'AM/PM',
  },
  fr: {
    monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
    dayShort: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
    clear: 'Effacer', today: "Aujourd'hui", weekStart: 1,
    done: 'OK', am: 'AM', pm: 'PM', h24: '24h', h12: 'AM/PM',
  },
  ar: {
    monthNames: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    dayShort: ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
    clear: 'مسح', today: 'اليوم', weekStart: 0,
    done: 'تم', am: 'ص', pm: 'م', h24: '24س', h12: 'ص/م',
  },
};

const HOUR_FORMAT_KEY = 'taskflow_hour_format'; // '24' | '12'

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  withTime?: boolean;
}

function toYMD(d: Date): string {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function splitValue(value: string, withTime: boolean) {
  if (!value) return { date: '', hour: 9, minute: 0 };
  const [datePart, timePart] = value.split('T');
  if (!withTime || !timePart) return { date: datePart, hour: 9, minute: 0 };
  const [h, m] = timePart.split(':').map((n) => parseInt(n, 10));
  return { date: datePart, hour: isNaN(h) ? 9 : h, minute: isNaN(m) ? 0 : m };
}

function readHourFormat(): '24' | '12' {
  try {
    const v = localStorage.getItem(HOUR_FORMAT_KEY);
    return v === '12' ? '12' : '24';
  } catch {
    return '24';
  }
}

export const LocalizedDateInput: React.FC<Props> = ({ value, onChange, className, withTime = false }) => {
  const { language } = useLanguage();
  const lang = (language as Lang) || 'en';
  const L = LOCALES[lang] ?? LOCALES.en;
  const isRtl = lang === 'ar';

  const [open, setOpen] = useState(false);
  const [hourFormat, setHourFormat] = useState<'24' | '12'>(() => readHourFormat());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(HOUR_FORMAT_KEY, hourFormat); } catch { /* ignore */ }
  }, [hourFormat]);

  const { date: datePart, hour: hInit, minute: mInit } = splitValue(value, withTime);
  const parsed = datePart ? new Date(datePart + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());

  const [hour, setHour] = useState(hInit);
  const [minute, setMinute] = useState(mInit);

  useEffect(() => {
    const s = splitValue(value, withTime);
    setHour(s.hour);
    setMinute(s.minute);
  }, [value, withTime]);

  useEffect(() => {
    if (!open) return;
    const p = datePart ? new Date(datePart + 'T00:00:00') : new Date();
    setViewYear(p.getFullYear());
    setViewMonth(p.getMonth());
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]); // eslint-disable-line

  const emit = (nextDate: string, h: number, m: number) => {
    if (!withTime) {
      onChange(nextDate);
    } else {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      onChange(`${nextDate}T${hh}:${mm}`);
    }
  };

  const isPm = hour >= 12;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;

  const displayLabel = (() => {
    if (!datePart) return '';
    const d = parseInt(datePart.slice(8, 10), 10);
    const y = parseInt(datePart.slice(0, 4), 10);
    const mo = parseInt(datePart.slice(5, 7), 10) - 1;
    let label = `${d} ${L.monthNames[mo]} ${y}`;
    if (withTime) {
      if (hourFormat === '24') {
        label += ` · ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      } else {
        const suffix = isPm ? L.pm : L.am;
        label += ` · ${String(h12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
      }
    }
    return label;
  })();

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const lead = (firstDow - L.weekStart + 7) % 7;

  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayYMD = toYMD(new Date());
  const selectedYMD = datePart;

  const shiftMonth = (delta: number) => {
    triggerHaptic('light');
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y);
  };

  const pickDay = (d: number) => {
    triggerHaptic('light');
    const next = toYMD(new Date(viewYear, viewMonth, d));
    emit(next, hour, minute);
    if (!withTime) setOpen(false);
  };

  const orderedDays = (() => {
    const arr = [...L.dayShort];
    if (L.weekStart === 1) arr.push(arr.shift()!);
    return arr;
  })();

  const hours24 = Array.from({ length: 24 }, (_, i) => i);
  const hours12 = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const setHour24 = (h: number) => {
    setHour(h);
    emit(datePart || todayYMD, h, minute);
  };
  const setHour12 = (h12v: number) => {
    let h24 = h12v % 12;
    if (isPm) h24 += 12;
    setHour(h24);
    emit(datePart || todayYMD, h24, minute);
  };
  const setAmPm = (pm: boolean) => {
    let h24 = hour % 12;
    if (pm) h24 += 12;
    setHour(h24);
    emit(datePart || todayYMD, h24, minute);
  };
  const setMinuteVal = (m: number) => {
    setMinute(m);
    emit(datePart || todayYMD, hour, m);
  };

  const toggleHourFormat = () => {
    triggerHaptic('light');
    setHourFormat((v) => (v === '24' ? '12' : '24'));
  };

  return (
    <div ref={wrapRef} className="relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <button
        type="button"
        onClick={() => { triggerHaptic('light'); setOpen((v) => !v); }}
        className={className ?? 'w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer text-start'}
      >
        <span className={value ? '' : 'text-slate-400'}>
          {displayLabel || '—'}
        </span>
        {withTime
          ? <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          : <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className="absolute z-[80] mt-1 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => shiftMonth(-1)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {L.monthNames[viewMonth]} {viewYear}
            </div>
            <button type="button" onClick={() => shiftMonth(1)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {orderedDays.map((d, i) => (
              <div key={i} className="text-[9px] font-bold text-slate-400 text-center py-1 leading-tight whitespace-nowrap">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const ymd = toYMD(new Date(viewYear, viewMonth, d));
              const isSelected = ymd === selectedYMD;
              const isToday = ymd === todayYMD;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickDay(d)}
                  className={`h-8 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : isToday
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {withTime && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-center gap-1.5">
                {hourFormat === '24' ? (
                  <select
                    value={hour}
                    onChange={(e) => setHour24(parseInt(e.target.value, 10))}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    {hours24.map((h) => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={h12}
                    onChange={(e) => setHour12(parseInt(e.target.value, 10))}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    {hours12.map((h) => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                    ))}
                  </select>
                )}

                <span className="text-slate-400 font-bold">:</span>

                <select
                  value={minute}
                  onChange={(e) => setMinuteVal(parseInt(e.target.value, 10))}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white cursor-pointer"
                >
                  {minutes.map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>

                {hourFormat === '12' && (
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setAmPm(false)}
                      className={`px-2 py-1.5 text-xs font-bold transition cursor-pointer ${
                        !isPm ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {L.am}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmPm(true)}
                      className={`px-2 py-1.5 text-xs font-bold transition cursor-pointer ${
                        isPm ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {L.pm}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-2 flex justify-center">
                <button
                  type="button"
                  onClick={toggleHourFormat}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  title={hourFormat === '24' ? 'Switch to AM/PM' : 'Switch to 24-hour'}
                >
                  {hourFormat === '24' ? L.h24 : L.h12}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
              {L.clear}
            </button>
            <button type="button"
              onClick={() => {
                const t = new Date();
                setViewYear(t.getFullYear()); setViewMonth(t.getMonth());
                setHour(t.getHours()); setMinute(t.getMinutes());
                const nextDate = toYMD(t);
                if (withTime) {
                  const hh = String(t.getHours()).padStart(2, '0');
                  const mm = String(t.getMinutes()).padStart(2, '0');
                  onChange(`${nextDate}T${hh}:${mm}`);
                } else {
                  onChange(nextDate);
                }
                setOpen(false);
              }}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 cursor-pointer">
              {L.today}
            </button>
            {withTime && (
              <button type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 cursor-pointer">
                {L.done}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};