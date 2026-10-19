import { useEffect, useId, useRef, useState } from 'react';
import { formatDate, isoDate, plusDays } from './ui';

export function CalendarPicker({ value, min, max, onSelect, onClose }: {
  value: string;
  min?: string;
  max?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const today = isoDate(new Date());
  const clamp = (date: string) => min && date < min ? min : max && date > max ? max : date;
  const [cursor, setCursor] = useState(clamp(value || today));
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const month = cursor.slice(0, 7);
  const first = new Date(`${month}-01T12:00:00`);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const allowed = (date: string) => (!min || date >= min) && (!max || date <= max);
  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>(`[data-date="${cursor}"]`)?.focus();
  }, [cursor]);
  function moveMonth(delta: number) {
    const target = new Date(first);
    target.setMonth(target.getMonth() + delta);
    setCursor(clamp(isoDate(target)));
  }
  return (
    <div ref={panel} role="dialog" aria-labelledby={titleId}
      className="absolute left-0 top-full z-20 mt-2 w-72 max-w-full rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <button type="button" aria-label="Mês anterior" className="rounded p-2 hover:bg-slate-100"
          disabled={!!min && month <= min.slice(0, 7)} onClick={() => moveMonth(-1)}>←</button>
        <span id={titleId} aria-live="polite" className="font-semibold capitalize text-sm">
          {first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" aria-label="Próximo mês" className="rounded p-2 hover:bg-slate-100"
          disabled={!!max && month >= max.slice(0, 7)} onClick={() => moveMonth(1)}>→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <span key={day} className="py-1 text-slate-500">{day}</span>
        ))}
        {Array.from({ length: first.getDay() }, (_, i) => <span key={`empty-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`;
          return (
            <button key={date} type="button" data-date={date} aria-label={formatDate(date)}
              aria-pressed={date === value} aria-current={date === today ? 'date' : undefined}
              disabled={!allowed(date)} tabIndex={date === cursor ? 0 : -1}
              className={`h-8 rounded-md ${date === value ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'} ${date === today ? 'ring-1 ring-blue-500' : ''}`}
              onClick={() => onSelect(date)}
              onKeyDown={(event) => {
                const shifts: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
                if (event.key in shifts) {
                  event.preventDefault();
                  setCursor(clamp(plusDays(date, shifts[event.key])));
                }
              }}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between border-t border-slate-100 mt-3 pt-2">
        <button type="button" className="p-2 text-blue-700" onClick={() => onSelect('')}>Limpar</button>
        <button type="button" className="p-2 text-blue-700" disabled={!allowed(today)} onClick={() => onSelect(today)}>Hoje</button>
        <button type="button" className="p-2 text-slate-600" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
