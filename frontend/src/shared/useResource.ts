import { useEffect, useRef, useState } from 'react';
import { message } from './api';
export function useResource<T>(key: string, loader: (signal: AbortSignal) => Promise<T>) {
  const callback = useRef(loader);
  callback.current = loader;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; data?: T; error: string; loading: boolean }>({
    key,
    error: '',
    loading: true,
  });
  useEffect(() => {
    const controller = new AbortController();
    setState({ key, error: '', loading: true });
    callback
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data, error: '', loading: false });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setState({ key, error: message(e), loading: false });
      });
    return () => controller.abort();
  }, [key, revision]);
  return {
    ...(state.key === key ? state : { data: undefined, error: '', loading: true }),
    reload: () => setRevision((r) => r + 1),
  };
}
