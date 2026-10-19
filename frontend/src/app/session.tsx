import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { api, setToken } from '../shared/api';
import type { LoginResult, User } from '../shared/types';
interface Session {
  user: User | null;
  expired: boolean;
  login: (cpf: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const end = () => {
      setUser(null);
      setExpired(true);
    };
    window.addEventListener('session-expired', end);
    return () => window.removeEventListener('session-expired', end);
  }, []);
  async function login(cpf: string, password: string) {
    const result = await api<LoginResult>('/auth/login', {
      method: 'POST',
      body: { cpf, password },
      public: true,
    });
    setToken(result.accessToken);
    setExpired(false);
    setUser(result.user);
  }
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setToken(null);
      setUser(null);
      setExpired(false);
    }
  }
  return <Context.Provider value={{ user, expired, login, logout }}>{children}</Context.Provider>;
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw Error('Sessão indisponível');
  return value;
}
export const rolePath = {
  ADMIN: '/administracao',
  COORDINATOR: '/coordenacao',
  PROFESSOR: '/professor',
} as const;
