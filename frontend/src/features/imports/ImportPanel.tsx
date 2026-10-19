import { useEffect, useRef, useState } from 'react';
import { api, message } from '../../shared/api';
import type { Room, User } from '../../shared/types';
import { Alert, Button, Field } from '../../shared/ui';
interface LegacyUser {
  role: string;
  name?: string;
  doc?: string;
}
interface Backup {
  formato: string;
  versao: number;
  dados: { USERS: Record<string, LegacyUser>; AULAS: { sala: string }[] };
}
interface Report {
  counts: Record<string, number>;
  notes: string[];
}
interface Preview {
  previewToken: string;
  report: Report;
  expiresIn: number;
}
const labels: Record<string, string> = {
  coursesCreated: 'Cursos criados',
  coursesReused: 'Cursos existentes',
  groupsCreated: 'Turmas criadas',
  groupsReused: 'Turmas existentes',
  subjectsCreated: 'Matérias criadas',
  subjectsReused: 'Matérias existentes',
  subjectsGrouped: 'Matérias agrupadas',
  usersCreated: 'Contas criadas',
  usersReused: 'Contas existentes',
  linksAdded: 'Vínculos adicionados',
  roomsCreated: 'Salas criadas',
  roomsReused: 'Salas existentes',
  lessonsCreated: 'Aulas criadas',
  seriesCreated: 'Séries criadas',
  notificationsCreated: 'Notificações criadas',
  adminsSkipped: 'Administradores ignorados',
  lessonsWithoutSeries: 'Aulas sem série anterior',
};
export function stripPasswords(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripPasswords);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'senha')
        .map(([key, v]) => [key, stripPasswords(v)]),
    );
  return value;
}
export function ImportPanel({
  users,
  rooms,
  onImported,
}: {
  users: User[];
  rooms: Room[];
  onImported: () => void;
}) {
  const [backup, setBackup] = useState<Backup | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [newRooms, setRooms] = useState<
    Record<string, { name: string; floor: string }>
  >({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  async function read(selected?: File) {
    const version = ++generation.current;
    setBackup(null);
    setPreview(null);
    setPasswords({});
    setRooms({});
    setError('');
    if (!selected) return;
    try {
      if (selected.size > 2_000_000) throw Error('O arquivo deve ter no máximo 2 MB.');
      const parsed = stripPasswords(JSON.parse(await selected.text())) as Backup;
      if (
        !parsed ||
        parsed.formato !== 'projeto-integrado' ||
        parsed.versao !== 1 ||
        !parsed.dados?.USERS ||
        Array.isArray(parsed.dados.USERS) ||
        typeof parsed.dados.USERS !== 'object' ||
        !Array.isArray(parsed.dados.AULAS) ||
        Object.values(parsed.dados.USERS).some(
          (u) => !u || typeof u !== 'object' || typeof u.role !== 'string',
        ) ||
        parsed.dados.AULAS.some((l) => !l || typeof l !== 'object' || typeof l.sala !== 'string')
      )
        throw Error('Selecione um backup compatível, versão 1.');
      if (generation.current !== version) return;
      if (
        Object.values(parsed.dados.USERS).some(
          (u) =>
            (u.name !== undefined && typeof u.name !== 'string') ||
            (u.doc !== undefined && typeof u.doc !== 'string'),
        )
      )
        throw Error('Dados de usuário inválidos no backup.');
      const missing: typeof newRooms = Object.create(null);
      for (const l of parsed.dados.AULAS) {
        const name = String(l.sala ?? '').replace(' - Bloco B', '');
        if (name && !rooms.some((r) => r.name === name))
          missing[name] = { name, floor: '' };
      }
      setRooms(missing);
      setBackup(parsed);
    } catch (e) {
      if (generation.current === version) setError(message(e));
    }
  }
  async function send(confirm: boolean) {
    if (!backup) return;
    if (confirm && !window.confirm('Confirmar a importação dos dados apresentados na prévia?'))
      return;
    setBusy(true);
    setError('');
    try {
      const result = await api<Preview>(`/admin/import/${confirm ? 'confirm' : 'preview'}`, {
        method: 'POST',
        body: {
          backup,
          passwords,
          rooms: newRooms,
          ...(confirm ? { previewToken: preview?.previewToken } : {}),
        },
        timeout: 120000,
      });
      if (confirm) {
        setBackup(null);
        setPasswords({});
        setRooms({});
        setPreview(null);
        if (file.current) file.current.value = '';
        onImported();
      } else setPreview(result);
    } catch (e) {
      setError(message(e));
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="panel">
      <summary className="font-semibold cursor-pointer">Importar backup antigo</summary>
      <p className="muted my-3">
        Selecione um backup da demonstração. As contas existentes mantêm suas senhas; informe novas
        senhas para as novas contas. A prévia não grava os dados.
      </p>
      <fieldset disabled={busy} className="space-y-4">
        <Field label="Arquivo de backup JSON">
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            onChange={(e) => void read(e.target.files?.[0])}
          />
        </Field>
        {backup &&
          Object.entries(backup.dados.USERS)
            .filter(
              ([cpf, u]) =>
                u.role !== 'admin' && !users.some((x) => x.cpf === cpf.replace(/\D/g, '')),
            )
            .map(([cpf, u]) => (
              <Field key={cpf} label={`Nova senha — ${u.doc || u.name || cpf}`}>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={passwords[cpf.replace(/\D/g, '')] ?? ''}
                  onChange={(e) => {
                    setPasswords({ ...passwords, [cpf.replace(/\D/g, '')]: e.target.value });
                    setPreview(null);
                  }}
                />
              </Field>
            ))}
        {Object.values(newRooms).map((r) => (
          <div key={r.name} className="border border-slate-200 rounded-lg p-3">
            <h2>{r.name}</h2>
            <div className="form-grid mt-3">
              <Field label={`Andar — ${r.name}`}>
                <input
                  value={r.floor}
                  onChange={(e) => {
                    setRooms({ ...newRooms, [r.name]: { ...r, floor: e.target.value } });
                    setPreview(null);
                  }}
                />
              </Field>
            </div>
          </div>
        ))}
        <Alert>{error}</Alert>
        {preview && (
          <div className="bg-slate-50 rounded-lg p-4">
            <h2>Prévia da importação</h2>
            <ul className="my-3">
              {Object.entries(preview.report.counts).map(([key, value]) => (
                <li key={key}>
                  {labels[key] || key}: {value}
                </li>
              ))}
            </ul>
            {preview.report.notes.map((n) => (
              <p key={n} className="muted my-2">
                {n}
              </p>
            ))}
          </div>
        )}
        <div className="actions">
          <Button disabled={!backup} onClick={() => void send(false)}>
            {busy ? 'Processando…' : 'Validar backup'}
          </Button>
          <Button variant="success" disabled={!preview} onClick={() => void send(true)}>
            Confirmar importação
          </Button>
        </div>
      </fieldset>
    </details>
  );
}
