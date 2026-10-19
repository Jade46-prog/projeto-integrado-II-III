import { useState, type FormEvent } from 'react';
import { api, message } from '../../shared/api';
import type { Lesson } from '../../shared/types';
import { Alert, Button, Field, Modal, formatDate } from '../../shared/ui';

export function DeleteForm({
  lessons,
  onClose,
  onSaved,
}: {
  lessons: Lesson[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [series, setSeries] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const options = [...new Map(lessons.map((l) => [l.series_id, l])).values()];
  const count = lessons.filter((l) => l.series_id === series).length;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!window.confirm(`Excluir todas as ${count} ocorrências desta série?`)) return;
    setBusy(true);
    setError('');
    try {
      await api(`/lesson-series/${series}`, { method: 'DELETE' });
      onSaved();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Excluir Aula" busy={busy} onClose={onClose}>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="space-y-4">
          <Field label="Série de aulas">
            <select required value={series} onChange={(e) => setSeries(e.target.value)}>
              <option value="">Selecione a aula</option>
              {options.map((l) => (
                <option key={l.series_id} value={l.series_id}>
                  {l.subject_name} — {l.professor_name} — {formatDate(l.lesson_date)} —{' '}
                  {l.starts_at.slice(0, 5)}
                </option>
              ))}
            </select>
          </Field>
          <p>A exclusão remove todas as repetições da série selecionada ({count} aulas).</p>
          <Alert>{error}</Alert>
          <div className="actions justify-end">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="danger" type="submit">
              Excluir série
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
