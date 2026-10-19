import type { Lesson } from '../../shared/types';
import { formatDate, monday } from '../../shared/ui';

export function ProfessorSemesterList({ lessons, semesterStart, showCourse, onEdit }: {
  lessons: Lesson[];
  semesterStart: string;
  showCourse: boolean;
  onEdit: (lesson: Lesson) => void;
}) {
  const ordered = [...lessons].sort((a, b) =>
    a.lesson_date.localeCompare(b.lesson_date) ||
    a.starts_at.localeCompare(b.starts_at) || a.subject_name.localeCompare(b.subject_name),
  );
  return (
    <table className="w-full text-left text-xs [&_th]:px-3 [&_th]:py-3 [&_td]:px-3 [&_td]:py-2">
      <caption className="sr-only">Aulas do professor no semestre</caption>
      <thead className="sticky top-0 bg-slate-100 text-slate-700">
        <tr>
          <th scope="col">Semana</th>
          <th scope="col">Data</th>
          <th scope="col">Horário</th>
          <th scope="col">Matéria</th>
          {showCourse && <th scope="col">Curso</th>}
          <th scope="col">Sala</th>
          <th scope="col">Situação</th>
          <th scope="col">Ação</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {ordered.map((lesson) => (
          <tr key={lesson.id} data-week={monday(lesson.lesson_date)} className="hover:bg-slate-50">
            <td className="whitespace-nowrap">
              Semana {Math.round((Date.parse(monday(lesson.lesson_date)) - Date.parse(monday(semesterStart))) / 604800000) + 1}
            </td>
            <td className="whitespace-nowrap">
              {formatDate(lesson.lesson_date)}
              <span className="block text-slate-500">
                {new Date(`${lesson.lesson_date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' })}
              </span>
            </td>
            <td className="whitespace-nowrap">{lesson.starts_at.slice(0, 5)} – {lesson.ends_at.slice(0, 5)}</td>
            <td className="font-medium text-blue-800">{lesson.subject_name}</td>
            {showCourse && <td>{lesson.course_name}</td>}
            <td>{lesson.room_name}</td>
            <td className={lesson.status === 'CANCELLED' ? 'text-red-700' : 'text-slate-600'}>
              {lesson.status === 'CANCELLED' ? 'Cancelada' : 'Publicada'}
            </td>
            <td>
              <button type="button" className="text-blue-700 whitespace-nowrap underline underline-offset-2" onClick={() => onEdit(lesson)}>
                Alterar aula
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
