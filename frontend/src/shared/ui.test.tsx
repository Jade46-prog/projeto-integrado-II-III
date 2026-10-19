import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { stripPasswords } from '../features/imports/ImportPanel';
import { Field, TimeInput, formatDate, monday, plusDays } from './ui';
describe('Campos e compatibilidade', () => {
  it('associa o rótulo ao seletor sem incluir suas opções', () => {
    render(
      <Field label="Coordenador">
        <select>
          <option>Todos os coordenadores</option>
          <option>Maria</option>
        </select>
      </Field>,
    );
    expect(screen.getByLabelText('Coordenador', { exact: true })).toHaveRole('combobox');
  });
  it('aplica máscara 24h e permite corrigir um horário', async () => {
    function Form() {
      const [time, setTime] = useState('');
      return (
        <TimeInput aria-label="Horário" value={time} onChange={(e) => setTime(e.target.value)} />
      );
    }
    render(<Form />);
    const input = screen.getByLabelText('Horário');
    const user = userEvent.setup();
    await user.type(input, '1930');
    expect(input).toHaveValue('19:30');
    expect((input as HTMLInputElement).checkValidity()).toBe(true);
    await user.clear(input);
    await user.type(input, '0800');
    expect(input).toHaveValue('08:00');
    fireEvent.change(input, { target: { value: '29:80' } });
    expect((input as HTMLInputElement).checkValidity()).toBe(false);
  });
  it('trabalha com datas locais sem alterar o dia', () => {
    expect(formatDate('2026-12-07')).toBe('07/12/2026');
    expect(monday('2026-12-09')).toBe('2026-12-07');
    expect(plusDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('remove senhas antigas sem modificar o backup original', () => {
    const original = {
      dados: { USERS: { '123': { senha: 'antiga', name: 'Teste' } } },
      list: [{ senha: 'outra', id: 1 }],
    };
    expect(stripPasswords(original)).toEqual({
      dados: { USERS: { '123': { name: 'Teste' } } },
      list: [{ id: 1 }],
    });
    expect(original.dados.USERS['123'].senha).toBe('antiga');
  });
});
