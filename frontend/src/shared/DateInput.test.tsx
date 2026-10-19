import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it } from 'vitest';
import { DateInput } from './DateInput';
import { Field } from './ui';

function Form() {
  const [date, setDate] = useState('2026-10-13');
  return <><Field label="Data"><DateInput value={date} onChange={setDate} min="2026-08-03" max="2026-12-18" required /></Field><output aria-label="Valor API">{date}</output></>;
}

it('exibe DD/MM/AAAA e mantém ISO ao digitar e escolher pelo calendário', async () => {
  render(<Form />);
  const user = userEvent.setup();
  const input = screen.getByLabelText('Data');
  expect(input).toHaveValue('13/10/2026');
  await user.clear(input);
  await user.type(input, '14102026');
  expect(input).toHaveValue('14/10/2026');
  expect(screen.getByLabelText('Valor API')).toHaveTextContent('2026-10-14');
  await user.click(screen.getByRole('button', { name: 'Escolher data no calendário' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('outubro de 2026');
  expect(screen.getByText('Seg')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
  await user.click(screen.getByRole('button', { name: '05/11/2026' }));
  expect(input).toHaveValue('05/11/2026');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Escolher data no calendário' })).toHaveFocus();
});

it('respeita o semestre no calendário e permite navegar e fechar pelo teclado', async () => {
  render(<Form />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Escolher data no calendário' }));
  await user.keyboard('{ArrowRight}{Enter}');
  expect(screen.getByLabelText('Data')).toHaveValue('14/10/2026');
  await user.click(screen.getByRole('button', { name: 'Escolher data no calendário' }));
  await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
  await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
  expect(screen.getByRole('button', { name: '19/12/2026' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('bloqueia datas inexistentes e fora do semestre', () => {
  render(<Form />);
  const input = screen.getByLabelText('Data');
  for (const value of ['31/11/2026', '02/08/2026', '19/12/2026']) {
    fireEvent.change(input, { target: { value } });
    expect(input).toBeInvalid();
    expect(screen.getByLabelText('Valor API')).toBeEmptyDOMElement();
  }
});
