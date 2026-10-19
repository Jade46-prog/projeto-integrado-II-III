# Testes

Os testes do backend e de navegador criam dados. Execute-os em **um banco exclusivo de testes**, nunca no banco usado pela aplicação. Utilize nome terminado em `_test`.

## Frontend

Na pasta `frontend`:

```powershell
npm ci
npm test
npm run build
```

Vitest e React Testing Library verificam máscara de horário, datas locais, associação acessível entre rótulos e campos, descarte de respostas obsoletas, expiração da sessão, consultas públicas sem token e remoção de senhas antigas dos backups. O build verifica TypeScript estrito.

## API e PostgreSQL

Crie um banco isolado `academico_test` e configure no terminal do backend:

```powershell
$env:DB_URL='jdbc:postgresql://127.0.0.1:55433/academico_test'
$env:DB_USER='academico_test'
$env:DB_PASSWORD='senha-do-banco-de-testes'
$env:ADMIN_CPF='99999999999'
$env:ADMIN_PASSWORD='Senha-do-admin-de-testes-123!'
.\mvnw.cmd test
```

Adapte porta, usuário e senha à instalação de testes. Não use `run.ps1` nesse terminal: ele carrega o `.env` da aplicação e substituiria essas variáveis.

Os testes HTTP reais verificam permissões, criação e edição, publicação, conflitos simultâneos, rollback de recorrências, edição completa de séries, alterações do professor, notificações, revogação de tokens e importação com prévia, rollback e proteção contra repetição. Também verificam a preservação de identificadores, vínculos e hashes de senha de registros existentes, além da aceitação da origem de desenvolvimento do React pelo CORS.

## Navegador com API real

Ainda no terminal configurado para o banco isolado:

```powershell
$env:PORT='58080'
.\mvnw.cmd spring-boot:run
```

Em outro terminal, na pasta `frontend`:

```powershell
npx playwright install chromium
$env:E2E_API_URL='http://127.0.0.1:58080'
$env:E2E_ADMIN_CPF='99999999999'
$env:E2E_ADMIN_PASSWORD='Senha-do-admin-de-testes-123!'
npm run test:e2e
```

O Playwright inicia o Vite na porta 5173, acessa a API configurada e cria cadastros identificados com um sufixo exclusivo. Deixe essa porta livre. Se sua aplicação já estiver aberta nela, use `$env:E2E_FRONTEND_PORT='5183'` no terminal dos testes e configure `$env:CORS_ORIGINS='http://localhost:5183,http://127.0.0.1:5183'` antes de iniciar a API isolada. O servidor aberto pelo usuário não é reutilizado nem encerrado pelos testes.

O fluxo principal fixa somente o relógio do navegador em 08/12/2026 para conferir notificações da semana com as aulas de teste de dezembro, independentemente da data de execução. Os três testes cobrem:

- Cadastros administrativos, seleção de andar, edição de matéria por curso, máscara de horário, calendário em português e datas brasileiras, disponibilidade de sala, série semanal, edição de todas as ocorrências, publicação, lista compacta e cancelamento pelo professor, seleção explícita de curso/semestre/período pelo aluno, consulta mensal, notificações semanais e exclusão da série.
- Importação pela interface, incluindo prévia, invalidação após alteração, confirmação e remoção de senhas antigas antes do envio.
- Consulta do aluno em uma tela de celular de 390 × 844 pixels, sem rolagem horizontal da página.

Relatórios, rastros e imagens de falhas ficam em `frontend/test-results`, ignorado pelo Git. Podem conter dados de teste; não os publique como arquivos do sistema.
