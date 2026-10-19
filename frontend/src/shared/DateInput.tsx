import { useEffect, useRef, useState } from 'react';
import { formatDate } from './ui';
import { CalendarPicker } from './CalendarPicker';

export function DateInput({ id, value, onChange, min, max, required }: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
}) {
  const [text, setText] = useState(value ? formatDate(value) : '');
  const emitted = useRef(value);
  const field = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function closeCalendar() {
    setOpen(false);
    trigger.current?.focus();
  }
  useEffect(() => {
    if (value !== emitted.current) {
      setText(value ? formatDate(value) : '');
      field.current?.setCustomValidity('');
      emitted.current = value;
    }
  }, [value]);
  function select(iso: string) {
    emitted.current = iso;
    onChange(iso);
  }
  return (
    <div ref={container} className="relative flex items-center gap-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}>
      <input
        ref={field}
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/AAAA"
        maxLength={10}
        required={required}
        value={text}
        onChange={(event) => {
          const input = event.target;
          const position = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, '').length;
          const digits = input.value.replace(/\D/g, '').slice(0, 8);
          const formatted = digits.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2');
          input.value = formatted;
          const caret = position + (position > 2 ? 1 : 0) + (position > 4 ? 1 : 0);
          input.setSelectionRange(caret, caret);
          setText(formatted);
          const iso = `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
          const parsed = new Date(`${iso}T12:00:00Z`);
          const valid = digits.length === 8 && !Number.isNaN(parsed.getTime())
            && parsed.toISOString().slice(0, 10) === iso
            && (!min || iso >= min) && (!max || iso <= max);
          input.setCustomValidity(!formatted || valid ? '' : 'Informe uma data válida em DD/MM/AAAA dentro do semestre.');
          select(valid ? iso : '');
        }}
      />
      <button ref={trigger} type="button" className="btn btn-secondary shrink-0"
        aria-label="Escolher data no calendário" aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen(!open)}>
        <span aria-hidden="true">📅</span>
      </button>
      {open && (
        <CalendarPicker value={value} min={min} max={max} onClose={closeCalendar}
          onSelect={(iso) => {
            setText(iso ? formatDate(iso) : '');
            field.current?.setCustomValidity('');
            select(iso);
            closeCalendar();
          }}
        />
      )}
    </div>
  );
}
