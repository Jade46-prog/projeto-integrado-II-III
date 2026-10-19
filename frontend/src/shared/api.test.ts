import { afterEach, expect, it, vi } from 'vitest';
import { api, setToken } from './api';
afterEach(() => {
  vi.unstubAllGlobals();
  setToken(null);
});
it('não envia credencial em consulta pública nem grava no armazenamento', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('[]'));
  vi.stubGlobal('fetch', fetch);
  setToken('secret');
  await api('/public/courses', { public: true });
  expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  expect(localStorage.length).toBe(0);
});
it('expiração encerra a sessão e descarta o token', async () => {
  const ended = vi.fn();
  window.addEventListener('session-expired', ended, { once: true });
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('{"detail":"Expirada"}', { status: 401 }))
    .mockResolvedValue(new Response('[]'));
  vi.stubGlobal('fetch', fetch);
  setToken('secret');
  await expect(api('/courses')).rejects.toThrow();
  expect(ended).toHaveBeenCalledOnce();
  await api('/courses');
  expect(fetch.mock.calls[1][1].headers).not.toHaveProperty('Authorization');
});
it('uma resposta da sessão antiga não reaparece depois do logout', async () => {
  let resolve!: (r: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    ),
  );
  setToken('old');
  const pending = api('/courses');
  setToken(null);
  resolve(new Response('[]'));
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});
