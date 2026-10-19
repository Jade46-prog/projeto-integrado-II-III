import { useState } from 'react';
import { api } from '../../shared/api';
import type { Course, Room, Subject, User } from '../../shared/types';
import { Alert, Button, Field } from '../../shared/ui';
import { useResource } from '../../shared/useResource';
import { ImportPanel } from '../imports/ImportPanel';
import { AdminForm } from './AdminForm';

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
export function AdminPage() {
  const [coordinator, setCoordinator] = useState('');
  const [course, setCourse] = useState('');
  const [modal, setModal] = useState<Mode | null>(null);
  const [feedback, setFeedback] = useState('');
  const catalog = useResource<Catalog>('admin', async (signal) => {
    const [courses, users, rooms] = await Promise.all([
      api<Course[]>('/courses', { signal }),
      api<User[]>('/users', { signal }),
      api<Room[]>('/rooms', { signal }),
    ]);
    return { courses, users, rooms };
  });
  const subjects = useResource<Subject[]>(`subjects:${course}`, (signal) =>
    course ? api(`/subjects?courseId=${course}`, { signal }) : Promise.resolve([]),
  );
  const data = catalog.data;
  const selectedCoordinator = data?.users.find((u) => u.id === coordinator);
  const courses = selectedCoordinator
    ? data?.courses.filter((c) => selectedCoordinator.courses.some((link) => link.id === c.id))
    : data?.courses;
  function saved() {
    setModal(null);
    setFeedback('Cadastro salvo com sucesso.');
    catalog.reload();
    subjects.reload();
  }
  return (
    <div className="space-y-6">
      <section className="panel">
        <h1>Administração acadêmica</h1>
        <p className="muted mb-5">Gerencie cursos, matérias, coordenadores, professores e salas.</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {(Object.keys(names) as Kind[]).map((kind) => (
            <div key={kind} className="rounded-lg border border-slate-200 p-3 space-y-2">
              <h2 className="capitalize">{names[kind]}</h2>
              <div className="flex flex-col gap-2">
                <Button disabled={!data} onClick={() => setModal({ kind, edit: false })}>
                  Cadastrar {names[kind]}
                </Button>
                <Button
                  variant="secondary"
                  disabled={!data}
                  onClick={() => setModal({ kind, edit: true })}
                >
                  Editar {names[kind]}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="actions">
        <span role="status">{catalog.loading ? 'Carregando…' : feedback}</span>
      </div>
      <Alert>{catalog.error}</Alert>
      <section className="panel form-grid">
        <Field label="Coordenador">
          <select
            value={coordinator}
            onChange={(e) => {
              setCoordinator(e.target.value);
              setCourse('');
            }}
          >
            <option value="">Todos os coordenadores</option>
            {data?.users
              .filter((u) => u.role === 'COORDINATOR')
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Curso">
          <select value={course} onChange={(e) => setCourse(e.target.value)}>
            <option value="">Selecione um curso</option>
            {courses?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </section>
      {selectedCoordinator && (
        <section className="panel">
          <h2>{selectedCoordinator.name}</h2>
          <p className="muted mb-3">Cursos sob sua responsabilidade</p>
          <ul className="grid sm:grid-cols-2 gap-3">
            {selectedCoordinator.courses.map((c) => (
              <li className="bg-slate-50 rounded-lg p-3" key={c.id}>
                {c.name}
              </li>
            ))}
          </ul>
        </section>
      )}
      {course && data && (
        <div className="grid md:grid-cols-2 gap-6">
          <section className="panel space-y-4">
            <h2>Coordenadores do curso</h2>
            <ul>
              {data.users
                .filter((u) => u.role === 'COORDINATOR' && u.courses.some((c) => c.id === course))
                .map((u) => (
                  <li className="py-2" key={u.id}>
                    {u.name}
                  </li>
                ))}
            </ul>
            <h2>Professores do curso</h2>
            <ul>
              {data.users
                .filter((u) => u.role === 'PROFESSOR' && u.courses.some((c) => c.id === course))
                .map((u) => (
                  <li className="py-2" key={u.id}>
                    {u.name}
                  </li>
                ))}
            </ul>
          </section>
          <section className="panel">
            <h2>Matérias do curso</h2>
            <Alert>{subjects.error}</Alert>
            {subjects.loading ? (
              <p>Carregando…</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {subjects.data?.map((s) => (
                  <li className="bg-slate-50 p-3 rounded-lg" key={s.id}>
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
            {subjects.data?.length === 0 && (
              <p className="muted mt-3">Nenhuma matéria cadastrada.</p>
            )}
          </section>
        </div>
      )}
      {!course && !selectedCoordinator && (
        <p className="panel muted">
          Selecione um coordenador para consultar seus cursos ou um curso para ver professores e
          matérias.
        </p>
      )}
      {data && <ImportPanel users={data.users} rooms={data.rooms} onImported={saved} />}
      {modal && data && (
        <AdminForm mode={modal} catalog={data} onClose={() => setModal(null)} onSaved={saved}
          onDeleted={() => {
            setModal(null);
            setCoordinator('');
            setCourse('');
            setFeedback('Cadastro excluído com sucesso.');
            catalog.reload();
            subjects.reload();
          }}
        />
      )}
    </div>
  );
}
