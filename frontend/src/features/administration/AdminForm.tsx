import { useId, useState, type FormEvent } from 'react';
import { api, message } from '../../shared/api';
import { formatCpf } from '../../shared/cpf';
import type { Course, Room, Subject, User } from '../../shared/types';
import { Alert, Button, Field, Modal } from '../../shared/ui';
import { useResource } from '../../shared/useResource';

type Kind = 'course' | 'subject' | 'coordinator' | 'professor' | 'room';
type Mode = { kind: Kind; edit: boolean };
const names: Record<Kind, string> = {
  course: 'curso',
  subject: 'matéria',
  coordinator: 'coordenador',
  professor: 'professor',
  room: 'sala',
};
interface Catalog {
  courses: Course[];
  users: User[];
  rooms: Room[];
}

export function AdminForm({
  mode,
  catalog,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: Mode;
  catalog: Catalog;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { kind, edit } = mode;
  const passwordHintId = useId();
  const [id, setId] = useState('');
  const [course, setCourse] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [semesters, setSemesters] = useState(1);
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [floor, setFloor] = useState('');
  const floorOptions = [...new Set([
    '1º andar', '2º andar', '3º andar', '4º andar', 'Laboratórios',
    ...catalog.rooms.map((room) => room.floor).filter(Boolean),
  ])];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const subjects = useResource<Subject[]>(`edit-subject:${course}`, (signal) =>
    kind === 'subject' && edit && course
      ? api(`/subjects?courseId=${course}`, { signal })
      : Promise.resolve([]),
  );
  const person = kind === 'professor' || kind === 'coordinator';
  const choices =
    kind === 'course'
      ? catalog.courses
      : kind === 'subject'
        ? (subjects.data ?? [])
        : kind === 'room'
          ? catalog.rooms
          : catalog.users.filter(
              (u) => u.role === (kind === 'professor' ? 'PROFESSOR' : 'COORDINATOR'),
            );
  function select(value: string) {
    setId(value);
    setError('');
    setPassword('');
    const item = choices.find((c) => c.id === value);
    setName(item?.name ?? '');
    if (kind === 'course') {
      const c = item as Course | undefined;
      setCode(c?.code ?? '');
      setSemesters(c?.semesters ?? 1);
    }
    if (person) {
      const u = item as User | undefined;
      setCpf(formatCpf(u?.cpf ?? ''));
      setLinks(u?.courses.map((c) => c.id) ?? []);
    }
    if (kind === 'room') {
      const r = item as Room | undefined;
      setFloor(r?.floor ?? '');
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (edit && !id) return;
    setBusy(true);
    setError('');
    const endpoint =
      kind === 'course'
        ? 'courses'
        : kind === 'subject'
          ? 'subjects'
          : kind === 'room'
            ? 'rooms'
            : 'users';
    const body =
      kind === 'course'
        ? { name, code, semesters }
        : kind === 'subject'
          ? { name, courseId: course }
          : kind === 'room'
            ? { name, floor }
            : {
                name,
                cpf: cpf.replace(/\D/g, ''),
                password: password || null,
                role: kind === 'professor' ? 'PROFESSOR' : 'COORDINATOR',
                courseIds: links,
              };
    try {
      if (person && links.length === 0) throw Error('Vincule ao menos um curso.');
      await api(`/${endpoint}${edit ? `/${id}` : ''}`, { method: edit ? 'PUT' : 'POST', body });
      onSaved();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if ((!person && kind !== 'room') || !edit || !id || busy) return;
    const selected = choices.find((item) => item.id === id);
    const consequence = person
      ? 'A conta perderá o acesso e seus vínculos com cursos serão removidos.'
      : 'A sala será removida do cadastro e não ficará disponível para novas aulas.';
    if (!window.confirm(`Excluir ${names[kind]} "${selected?.name}"? ${consequence} Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    setError('');
    try {
      await api(`/${kind === 'room' ? 'rooms' : 'users'}/${id}`, { method: 'DELETE' });
      onDeleted();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`${edit ? 'Editar' : 'Cadastrar'} ${names[kind]}`} busy={busy} onClose={onClose}>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="space-y-4">
          {kind === 'subject' && (
            <Field label="Curso da matéria">
              <select
                required
                value={course}
                onChange={(e) => {
                  setCourse(e.target.value);
                  setId('');
                  setName('');
                }}
              >
                <option value="">Selecione o curso</option>
                {catalog.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {edit && (
            <Field label={`Selecione ${names[kind]}`}>
              <select
                required
                value={id}
                onChange={(e) => select(e.target.value)}
                disabled={kind === 'subject' && (!course || subjects.loading)}
              >
                <option value="">Selecione para editar</option>
                {choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Alert>{subjects.error}</Alert>
          <fieldset disabled={edit && !id} className="space-y-4">
            <Field label="Nome">
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            {kind === 'course' && (
              <div className="form-grid">
                <Field label="Sigla">
                  <input
                    required
                    pattern="[A-Z][A-Z0-9]{1,11}"
                    maxLength={12}
                    disabled={edit}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </Field>
                <Field label="Quantidade de semestres">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={semesters}
                    onChange={(e) => setSemesters(+e.target.value)}
                  />
                </Field>
              </div>
            )}
            {person && (
              <>
                <div className="form-grid">
                  <Field label="CPF">
                    <input
                      required
                      disabled={edit}
                      maxLength={14}
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => {
                        const input = e.target;
                        const position = input.value
                          .slice(0, input.selectionStart ?? input.value.length)
                          .replace(/\D/g, '').length;
                        const formatted = formatCpf(input.value);
                        input.value = formatted;
                        const caret = position + (position > 3 ? 1 : 0)
                          + (position > 6 ? 1 : 0) + (position > 9 ? 1 : 0);
                        input.setSelectionRange(caret, caret);
                        setCpf(formatted);
                      }}
                      inputMode="numeric"
                    />
                  </Field>
                  <div className="space-y-1.5">
                  <Field label={edit ? 'Nova senha (opcional)' : 'Senha'}>
                    <input
                      type="password"
                      autoComplete="new-password"
                      aria-describedby={passwordHintId}
                      required={!edit}
                      minLength={12}
                      maxLength={72}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                <p id={passwordHintId} className="muted">
                  Mínimo de 12 caracteres. {edit ? 'Deixe a senha vazia para manter a atual.' : ''}
                </p>
                  </div>
                </div>
                <fieldset className="border border-slate-200 rounded-lg p-3">
                  <legend>Cursos vinculados</legend>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {catalog.courses.map((c) => (
                      <label key={c.id} className="flex gap-2 items-start">
                        <input
                          type="checkbox"
                          checked={links.includes(c.id)}
                          onChange={(e) =>
                            setLinks(
                              e.target.checked
                                ? [...links, c.id]
                                : links.filter((id) => id !== c.id),
                            )
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
            {kind === 'room' && (
              <div className="form-grid">
                <Field label="Andar / tipo de espaço">
                  <select
                    required
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                  >
                    <option value="" disabled>Selecione o andar ou tipo de espaço</option>
                    {floorOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </fieldset>
          <Alert>{error}</Alert>
          <div className="actions justify-end">
            {(person || kind === 'room') && edit && (
              <Button variant="danger" disabled={!id} onClick={remove}>
                Excluir {names[kind]}
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={edit && !id}>
              {busy ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
