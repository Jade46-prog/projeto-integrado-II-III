import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type PropsWithChildren,
  type ReactElement,
} from 'react';
export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}) {
  return <button type="button" {...props} className={`btn btn-${variant} ${className}`} />;
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
export function Alert({ children }: PropsWithChildren) {
  return children ? (
    <p role="alert" className="alert">
      {children}
    </p>
  ) : null;
}
export function Modal({
  title,
  onClose,
  busy = false,
  children,
}: PropsWithChildren<{ title: string; onClose: () => void; busy?: boolean }>) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const node = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    node?.showModal();
    return () => {
      node?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      className="modal"
    >
      <header>
        <h2 id={id}>{title}</h2>
        <button type="button" aria-label="Fechar" disabled={busy} onClick={onClose}>
          ×
        </button>
      </header>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
export function TimeInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      placeholder="HH:mm"
      maxLength={5}
      pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
      onChange={(e) => {
        const el = e.target;
        const digitPosition = el.value
          .slice(0, el.selectionStart ?? el.value.length)
          .replace(/\D/g, '').length;
        const digits = el.value.replace(/\D/g, '').slice(0, 4);
        el.value = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
        const caret = digitPosition + (digitPosition > 2 ? 1 : 0);
        el.setSelectionRange(caret, caret);
        props.onChange?.(e);
      }}
    />
  );
}
export const formatDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
export const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const plusDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
};
export const monday = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return plusDays(iso, -((d.getDay() + 6) % 7));
};
