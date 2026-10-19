import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { rolePath, useSession } from '../../app/session';
import { message } from '../../shared/api';
import { Alert, Button, Field } from '../../shared/ui';
export function LoginPage() {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (session.user) return <Navigate to={rolePath[session.user.role]} replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await session.login(String(form.get('cpf')).replace(/\D/g, ''), String(form.get('password')));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <aside>
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}anhanguera.svg`} alt="" width={48} height={48} />
          UNIVERSIDADE ANHANGUERA
        </div>
        <div>
          <h1>Portal de Gestão de Aulas e Ambientes</h1>
          <p>
            Acesse horários, salas de aula e informações atualizadas pela coordenação e corpo
            docente.
          </p>
        </div>
        <small>Universidade Anhanguera</small>
      </aside>
      <section>
        <div className="panel w-full max-w-md">
          <h1>Bem-vindo(a)</h1>
          <p className="muted mb-6">
            Alunos podem consultar os horários sem cadastro. Professores e coordenação devem
            informar suas credenciais.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={busy} className="space-y-4">
              <Field label="CPF">
                <input
                  name="cpf"
                  required
                  autoComplete="username"
                  inputMode="numeric"
                  maxLength={14}
                  placeholder="000.000.000-00"
                  onChange={(event) => {
                    const input = event.target;
                    const position = input.value
                      .slice(0, input.selectionStart ?? input.value.length)
                      .replace(/\D/g, '').length;
                    const digits = input.value.replace(/\D/g, '').slice(0, 11);
                    input.value = digits
                      .replace(/^(\d{3})(\d)/, '$1.$2')
                      .replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2')
                      .replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, '$1-$2');
                    const caret = Math.min(position, digits.length)
                      + (position > 3 ? 1 : 0)
                      + (position > 6 ? 1 : 0)
                      + (position > 9 ? 1 : 0);
                    input.setSelectionRange(caret, caret);
                  }}
                />
              </Field>
              <Field label="Senha">
                <input name="password" type="password" required autoComplete="current-password" />
              </Field>
              <Alert>
                {error || (session.expired ? 'Sua sessão expirou. Entre novamente.' : '')}
              </Alert>
              <Button type="submit" className="w-full">
                {busy ? 'Entrando…' : 'Entrar no Sistema'}
              </Button>
            </fieldset>
          </form>
          {!busy && (
            <Link className="btn btn-secondary w-full mt-3" to="/aluno">
              Entrar como aluno
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
