import { expect, test, type Page } from '@playwright/test';
const secret = process.env.E2E_ADMIN_PASSWORD;
test.beforeAll(() => {
  if (!secret || !process.env.E2E_API_URL)
    throw Error('Defina E2E_API_URL e E2E_ADMIN_PASSWORD para uma API com banco isolado.');
});
const password = 'E2E-Test-Password-123!';
const cpf = () =>
  String(
    BigInt('0x' + crypto.randomUUID().replaceAll('-', '').slice(0, 12)) % 100000000000n,
  ).padStart(11, '0');
async function login(page: Page, cpf: string, pass: string) {
  await page.goto('/login');
  await page.getByLabel('CPF', { exact: true }).fill(cpf);
  await page.getByLabel('Senha', { exact: true }).fill(pass);
  await page.getByRole('button', { name: 'Entrar no Sistema', exact: true }).click();
}
test('cadastros, séries, publicação, professor e aluno pela interface', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-08T12:00:00-03:00'));
  const suffix = crypto.randomUUID().slice(0, 7).toUpperCase(),
    code = 'E' + suffix,
    course = 'Curso E2E ' + suffix,
    subject = 'Sistemas ' + suffix,
    coordCpf = cpf(),
    profCpf = cpf();
  await login(page, process.env.E2E_ADMIN_CPF || '99999999999', secret!);
  await expect(page.getByRole('heading', { name: 'Administração acadêmica' })).toBeVisible();
  await page.getByRole('button', { name: 'Cadastrar curso', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome', { exact: true }).fill(course);
  await dialog.getByLabel('Sigla').fill(code);
  await dialog.getByLabel('Quantidade de semestres').fill('2');
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(Math.abs(bounds!.x + bounds!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(3);
  expect(Math.abs(bounds!.y + bounds!.height / 2 - page.viewportSize()!.height / 2)).toBeLessThan(
    3,
  );
  await page.screenshot({ path: 'test-results/admin-dialog.png' });
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Cadastrar matéria', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Curso da matéria').selectOption({ label: course });
  await dialog.getByLabel('Nome', { exact: true }).fill(subject);
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  for (const [kind, userCpf] of [
    ['coordenador', coordCpf],
    ['professor', profCpf],
  ]) {
    await page.getByRole('button', { name: `Cadastrar ${kind}`, exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome', { exact: true }).fill(`${kind} ${suffix}`);
    await dialog.getByLabel('CPF', { exact: true }).fill(userCpf);
    await dialog.getByLabel('Senha', { exact: true }).fill(password);
    await dialog.getByLabel(course, { exact: true }).check();
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  }
  await page.getByRole('button', { name: 'Cadastrar sala', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome', { exact: true }).fill('Sala ' + suffix);
  await dialog.getByLabel('Andar / tipo de espaço').selectOption('1º andar');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByLabel('Coordenador', { exact: true })
    .selectOption({ label: 'coordenador ' + suffix });
  await expect(page.getByLabel('Curso', { exact: true }).locator('option')).toHaveCount(2);
  await page.getByLabel('Curso', { exact: true }).selectOption({ label: course });
  await expect(page.getByText(subject, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar matéria', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Selecione matéria')).toBeDisabled();
  await dialog.getByLabel('Curso da matéria').selectOption({ label: course });
  await dialog.getByLabel('Selecione matéria').selectOption({ label: subject });
  await expect(dialog.getByLabel('Nome', { exact: true })).toHaveValue(subject);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await login(page, coordCpf, password);
  await expect(
    page.getByRole('heading', { name: 'Gerenciador do Cronograma Semestral' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '＋ Adicionar Aula', exact: true }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Disciplina', { exact: true }).selectOption({ label: subject });
  await dialog
    .getByLabel('Docente', { exact: true })
    .selectOption({ label: 'professor ' + suffix });
  await dialog.getByLabel('Horário de início').fill('1900');
  await expect(dialog.getByLabel('Horário de início')).toHaveValue('19:00');
  await dialog.getByLabel('Horário de término').fill('2000');
  await dialog.getByLabel(`${code}-1A (1º sem.)`, { exact: true }).check();
  await dialog.getByLabel('Data da aula').fill('07/12/2026');
  await dialog.getByRole('button', { name: 'Escolher data no calendário' }).click();
  const calendar = page.getByRole('dialog', { name: 'dezembro de 2026' });
  await expect(calendar).toContainText('Seg');
  await calendar.getByRole('button', { name: '07/12/2026' }).click();
  await page.screenshot({ path: 'test-results/lesson-dialog.png' });
  await dialog.getByLabel('Repetir toda semana até o fim do semestre').check();
  await dialog.getByLabel('Andar / tipo de espaço').selectOption('1º andar');
  await expect(dialog.getByLabel('Sala', { exact: true }).locator('option').filter({ hasText: 'Sala ' + suffix })).toHaveText('Sala ' + suffix + ' — Disponível');
  await dialog.getByLabel('Sala', { exact: true }).selectOption({ label: 'Sala ' + suffix + ' — Disponível' });
  await dialog.getByRole('button', { name: 'Salvar Aula', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('article.lesson')).toHaveCount(2);
  await page
    .locator('article.lesson')
    .first()
    .getByRole('button', { name: 'Editar', exact: true })
    .click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Aplicar alterações em').selectOption('series');
  await expect(dialog.getByLabel('Repetir toda semana até o fim do semestre')).toBeDisabled();
  await dialog.getByLabel('Horário de término').fill('2030');
  await dialog.getByLabel('Data da aula').fill('08/12/2026');
  page.once('dialog', (d) => void d.accept());
  await dialog.getByRole('button', { name: 'Salvar Aula', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('article.lesson').filter({ hasText: '19:00 – 20:30' })).toHaveCount(2);
  await page.getByRole('button', { name: 'Publicar Cronograma', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('2 aula(s) publicada(s)');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await login(page, profCpf, password);
  await page.getByRole('button', { name: 'Semestre inteiro', exact: true }).click();
  await expect(page.locator('tbody tr[data-week]')).toHaveCount(2);
  await page
    .locator('tbody tr[data-week]')
    .first()
    .getByRole('button', { name: 'Alterar aula' })
    .click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Situação').selectOption('CANCELLED');
  await dialog.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('tbody tr[data-week]').filter({ hasText: 'Cancelada' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.getByRole('link', { name: 'Entrar como aluno' }).click();
  await expect(page.getByLabel('Curso', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Semestre', { exact: true })).toBeDisabled();
  await page.getByLabel('Curso', { exact: true }).selectOption({ label: course });
  await expect(page.getByLabel('Semestre', { exact: true })).toHaveValue('');
  await page.getByLabel('Semestre', { exact: true }).selectOption('1');
  await expect(page.getByLabel('Período', { exact: true })).toHaveValue('');
  await page.getByLabel('Período', { exact: true }).selectOption('NOTURNO');
  await expect(page.locator('article.lesson')).toHaveCount(1);
  await page.getByRole('button', { name: 'Mês', exact: true }).click();
  await page.getByLabel('Selecionar mês').selectOption('2026-12');
  await expect(page.locator('article.lesson')).toHaveCount(2);
  await page.getByRole('button', { name: /Notificações/ }).click();
  await expect(page.getByRole('dialog')).toContainText(subject);
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await login(page, coordCpf, password);
  await page.getByRole('button', { name: 'Excluir Aula', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Série de aulas').selectOption({ index: 1 });
  page.once('dialog', (d) => void d.accept());
  await dialog.getByRole('button', { name: 'Excluir série', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('article.lesson')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.goto('/administracao');
  await expect(page).toHaveURL(/login/);
});

test('importação interativa valida, invalida a prévia e confirma sem enviar senhas antigas', async ({
  page,
  request,
}) => {
  const suffix = crypto.randomUUID().slice(0, 7).toUpperCase(),
    code = 'B' + suffix,
    profCpf = cpf(),
    professor = 'Professor backup ' + suffix,
    room = 'Sala backup ' + suffix;
  const backup = {
    formato: 'projeto-integrado',
    versao: 1,
    dados: {
      CURSOS: { [code]: 'Curso backup ' + suffix },
      TURMAS: { [code + '-1A']: { c: code, s: 1 } },
      DISC: [{ c: code, n: 'Importação' }],
      USERS: {
        [profCpf]: {
          name: professor,
          doc: professor,
          role: 'professor',
          cursos: [code],
          senha: 'senha-antiga-nao-enviar',
        },
      },
      DOCENTES: [professor],
      AULAS: [
        {
          id: 1,
          serieId: 's1',
          n: 'Importação',
          d: professor,
          c: code,
          t: [code + '-1A'],
          data: '2026-12-07',
          h: '08:00',
          fim: '09:00',
          sala: room,
          pub: true,
          st: 'OK',
        },
      ],
      NOTIFS: [],
    },
  };
  await login(page, process.env.E2E_ADMIN_CPF || '99999999999', secret!);
  await page.getByText('Importar backup antigo', { exact: true }).click();
  await page
    .getByLabel('Arquivo de backup JSON')
    .setInputFiles({
      name: 'backup-e2e.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await page.getByLabel('Nova senha — ' + professor).fill(password);
  await page.getByLabel('Andar — ' + room).fill('2');
  const sent = page.waitForRequest((r) => r.url().endsWith('/admin/import/preview'));
  await page.getByRole('button', { name: 'Validar backup', exact: true }).click();
  expect((await sent).postData()).not.toContain('senha-antiga-nao-enviar');
  await expect(page.getByRole('heading', { name: 'Prévia da importação' })).toBeVisible();
  expect(
    JSON.stringify(
      await (await request.get(process.env.E2E_API_URL + '/api/public/courses')).json(),
    ),
  ).not.toContain(code);
  await page.getByLabel('Andar — ' + room).fill('3');
  await expect(
    page.getByRole('button', { name: 'Confirmar importação', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Validar backup', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Confirmar importação', exact: true }),
  ).toBeEnabled();
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Confirmar importação', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cadastro salvo com sucesso.');
  await expect(page.getByLabel('Arquivo de backup JSON')).toHaveValue('');
  expect(
    JSON.stringify(
      await (await request.get(process.env.E2E_API_URL + '/api/public/courses')).json(),
    ),
  ).toContain(code);
});

test('aluno acessa a interface em celular sem rolagem horizontal da página', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(page.getByRole('link', { name: 'Entrar como aluno' })).toBeVisible();
  await page.getByRole('link', { name: 'Entrar como aluno' }).click();
  await expect(page.getByRole('heading', { name: 'Consulta de aulas' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/student-mobile.png', fullPage: true });
});
