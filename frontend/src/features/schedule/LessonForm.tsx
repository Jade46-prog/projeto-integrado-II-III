import { useState, type FormEvent } from 'react';
import { api, message } from '../../shared/api';
import type { Calendar, Course, Lesson, Room } from '../../shared/types';
import { Alert, Button, Field, Modal, TimeInput } from '../../shared/ui';
import { useResource } from '../../shared/useResource';
import { DateInput } from '../../shared/DateInput';

import type { Details } from './types';
export function LessonForm({
  course,
  calendar,
  rooms,
  data,
  initial,
  onClose,
  onSaved,
}: {
  course: Course;
  calendar: Calendar;
  rooms: Room[];
  data: Details;
  initial: { lesson?: Lesson; date: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const l = initial.lesson;
  const [scope, setScope] = useState('one');
  const [subject, setSubject] = useState(l?.subject_id ?? '');
  const [professor, setProfessor] = useState(l?.professor_id ?? '');
  const [start, setStart] = useState(l?.starts_at.slice(0, 5) ?? '');
  const [end, setEnd] = useState(l?.ends_at.slice(0, 5) ?? '');
  const [date, setDate] = useState(initial.date);
  const [repeat, setRepeat] = useState(false);
  const [groups, setGroups] = useState(l?.groups.map((g) => g.id) ?? []);
  const [floor, setFloor] = useState(rooms.find((r) => r.id === l?.room_id)?.floor ?? '');
  const [room, setRoom] = useState(l?.room_id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
  const canCheckRooms = !!date && validTime.test(start) && validTime.test(end) && start < end;
  const availability = useResource<{ id: string; available: boolean }[]>(
    `rooms:${course.id}:${date}:${start}:${end}:${l?.id ?? ''}`,
    (signal) => {
      if (!canCheckRooms) return Promise.resolve([]);
      const params = new URLSearchParams({ courseId: course.id, date, start, end });
      if (l) params.set('lessonId', l.id);
      return api(`/rooms/availability?${params}`, { signal });
    },
  );
  function roomStatus(id: string) {
    if (!canCheckRooms) return 'Informe data e horários';
    if (availability.loading) return 'Consultando…';
    if (availability.error) return 'Disponibilidade não verificada';
    const status = availability.data?.find((item) => item.id === id);
    return status ? (status.available ? 'Disponível' : 'Ocupada') : 'Disponibilidade não verificada';
  }
  const count = l ? data.lessons.filter((row) => row.series_id === l.series_id).length : 0;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!groups.length) {
      setError('Selecione ao menos uma turma.');
      return;
    }
    if (
      scope === 'series' &&
      !window.confirm(
        `Alterar todas as ${count} ocorrências desta série, incluindo aulas anteriores e publicadas? As datas serão deslocadas pelo mesmo intervalo.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await api(`/lessons${l ? `/${l.id}${scope === 'series' ? '/series' : ''}` : ''}`, {
        method: l ? 'PUT' : 'POST',
        body: {
          courseId: course.id,
          subjectId: subject,
          professorId: professor,
          roomId: room,
          groupIds: groups,
          date,
          start,
          end,
          repeatWeekly: scope === 'series' ? false : repeat,
        },
      });
      onSaved();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${l ? 'Editar' : 'Registro de'} Aula — ${course.name}`}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="space-y-4">
          {l && (
            <>
              <Field label="Aplicar alterações em">
                <select
                  value={scope}
                  onChange={(e) => {
                    setScope(e.target.value);
                    if (e.target.value === 'series') setRepeat(false);
                  }}
                >
                  <option value="one">Somente esta aula</option>
                  <option value="series">Todas as aulas desta série ({count})</option>
                </select>
              </Field>
              <p className="muted">
                {scope === 'series'
                  ? 'Altera todas as ocorrências existentes, inclusive anteriores e publicadas. Alterar a data desloca toda a série; publicação e cancelamentos são preservados.'
                  : 'Altera somente a ocorrência selecionada. Marcar repetição cria as semanas faltantes.'}
              </p>
            </>
          )}
          <Field label="Disciplina">
            <select required value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">Selecione a matéria</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Docente">
              <select required value={professor} onChange={(e) => setProfessor(e.target.value)}>
                <option value="">Selecione o docente</option>
                {data.staff
                  .filter((s) => s.role === 'PROFESSOR')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Horário de início">
              <TimeInput required value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Horário de término">
              <TimeInput required value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
          <fieldset className="border border-slate-200 p-3 rounded-lg">
            <legend>Turmas (marque mais de uma para junção)</legend>
            <div className="grid sm:grid-cols-2 gap-2">
              {data.groups.map((g) => (
                <label key={g.id} className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={groups.includes(g.id)}
                    onChange={(e) =>
                      setGroups(
                        e.target.checked ? [...groups, g.id] : groups.filter((id) => id !== g.id),
                      )
                    }
                  />
                  {g.code} ({g.semester}º sem.)
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-grid items-center">
            <Field label="Data da aula">
              <DateInput
                required
                min={calendar.start}
                max={calendar.end}
                value={date}
                onChange={setDate}
              />
            </Field>
            <label className="flex gap-2 text-xs">
              <input
                type="checkbox"
                disabled={scope === 'series'}
                checked={repeat}
                onChange={(e) => setRepeat(e.target.checked)}
              />
              Repetir toda semana até o fim do semestre
            </label>
          </div>
          <fieldset className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <legend>Alocação de espaço</legend>
            <div className="form-grid">
              <Field label="Andar / tipo de espaço">
                <select
                  required
                  value={floor}
                  onChange={(e) => {
                    setFloor(e.target.value);
                    setRoom('');
                  }}
                >
                  <option value="">Selecione o andar</option>
                  {[...new Set(rooms.map((r) => r.floor))].sort().map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sala">
                <select
                  required
                  disabled={!floor}
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                >
                  <option value="">Selecione a sala</option>
                  {rooms
                    .filter((r) => r.floor === floor)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} — {roomStatus(r.id)}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
            <p className="muted mt-2">
              Disponibilidade para a data e os horários informados, considerando todos os cursos.
              {(repeat || scope === 'series') && ' As demais datas serão verificadas ao salvar.'}
            </p>
            <Alert>{availability.error}</Alert>
          </fieldset>
          <Alert>{error}</Alert>
          <div className="actions justify-end">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{busy ? 'Salvando…' : 'Salvar Aula'}</Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
