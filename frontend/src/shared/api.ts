let token: string | null = null;
let sessionVersion = 0;
export const setToken = (value: string | null) => {
  token = value;
  sessionVersion++;
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
type Options = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  public?: boolean;
  timeout?: number;
};
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, options.timeout ?? 15000);
  const version = sessionVersion;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}${path}`, {
      method: options.method ?? 'GET',
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(!options.public && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const body = response.status === 204 ? undefined : await response.json().catch(() => undefined);
    if (version !== sessionVersion) throw new DOMException('Sessão alterada', 'AbortError');
    if (response.status === 401 && token && !options.public) {
      setToken(null);
      window.dispatchEvent(new Event('session-expired'));
    }
    if (!response.ok)
      throw new ApiError(body?.detail || 'Não foi possível concluir a operação.', response.status);
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted || version !== sessionVersion)
      throw new DOMException('Requisição cancelada', 'AbortError');
    throw new ApiError(
      options.method && options.method !== 'GET'
        ? 'Não foi possível confirmar a operação. Atualize os dados antes de tentar novamente.'
        : 'Não foi possível carregar os dados. Verifique a conexão com o servidor.',
      0,
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
export const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
