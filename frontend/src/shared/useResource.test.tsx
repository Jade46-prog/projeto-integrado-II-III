import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useResource } from './useResource';
it('descarta resposta antiga após trocar o filtro', async () => {
  let resolveOld!: (v: string) => void;
  const old = new Promise<string>((resolve) => {
    resolveOld = resolve;
  });
  const { result, rerender } = renderHook(
    ({ key }) => useResource(key, () => (key === 'old' ? old : Promise.resolve('novo'))),
    { initialProps: { key: 'old' } },
  );
  rerender({ key: 'new' });
  await waitFor(() => expect(result.current.data).toBe('novo'));
  await act(async () => {
    resolveOld('antigo');
    await old;
  });
  expect(result.current.data).toBe('novo');
});
it('limpa os dados quando a atualização falha', async () => {
  const loader = vi.fn().mockResolvedValueOnce('dados').mockRejectedValueOnce(new Error('Falha'));
  const { result } = renderHook(() => useResource('x', loader));
  await waitFor(() => expect(result.current.data).toBe('dados'));
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.error).toBe('Falha'));
  expect(result.current.data).toBeUndefined();
});
