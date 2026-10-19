import { useState, type FormEvent } from 'react';
import { api, message } from '../../shared/api';
import type { Lesson, Room } from '../../shared/types';
import { Alert, Button, Field, Modal, formatDate } from '../../shared/ui';

export function LocationForm({
  lesson,
  rooms,
  onClose,
  onSaved,
}: {
  lesson: Lesson;
  rooms: Room[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [room, setRoom] = useState(lesson.room_id);
  const [status, setStatus] = useState(lesson.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/lessons/${lesson.id}/location`, {
        method: 'PATCH',
        body: { roomId: room, status },
      });
      onSaved();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Alterar aula — ${lesson.subject_name}`} busy={busy} onClose={onClose}>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="space-y-4">
          <p>
            {formatDate(lesson.lesson_date)} · {lesson.starts_at.slice(0, 5)} –{' '}
            {lesson.ends_at.slice(0, 5)}
          </p>
          <Field label="Sala">
            <select value={room} onChange={(e) => setRoom(e.target.value)}>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Situação">
            <select value={status} onChange={(e) => setStatus(e.target.value as Lesson['status'])}>
              <option value="CONFIRMED">Confirmada</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </Field>
          <Alert>{error}</Alert>
          <div className="actions justify-end">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar alterações</Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
