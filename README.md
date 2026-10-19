# Sistema Acadêmico — Universidade Anhanguera

Projeto Integrado II/III para gestão de cursos, professores, salas e cronogramas semestrais.

**React + TypeScript** no frontend, **Spring Boot + Spring Data JPA** no backend e **PostgreSQL** com migrações **Flyway**. Cadastros e aulas são persistidos pela API. O modo de demonstração local foi removido.

## Versões do projeto

As duas versões ficam em branches separadas deste repositório:

| Branch | Versão | Uso |
| --- | --- | --- |
| `main` | React + TypeScript, Spring Boot/JPA e PostgreSQL | Projeto principal e desenvolvimento contínuo. |
| [`prototipo`](https://github.com/frodsantana/projeto-integrado-II-III/tree/prototipo) | HTML, JavaScript e Tailwind via CDN, com localStorage | Referência histórica preservada no commit `23b5c84`. |

Este README descreve a versão principal. Para consultar o sistema antigo, selecione `prototipo` no GitHub e siga o README daquela branch. O protótipo não receberá novas funcionalidades nem será mesclado à `main`.

Para executar o protótipo sem trocar os arquivos do projeto principal, crie uma cópia de trabalho separada a partir da raiz do repositório:

```powershell
git fetch origin
git worktree add --detach ../projeto-integrado-prototipo origin/prototipo
```

Abra o `index.html` dessa cópia com um servidor estático. Os dados do navegador e do PostgreSQL não são armazenados nas branches nem transferidos entre versões. Novas funcionalidades devem partir da `main`.

## Funcionalidades

| Acesso        | Funcionalidades                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrador | Cadastrar e editar cursos, matérias, coordenadores, professores e salas; consultar vínculos por coordenador e curso; importar backups antigos com prévia.           |
| Coordenador   | Adicionar aulas, repetir semanalmente, editar uma ocorrência ou a série inteira, publicar e excluir séries. Filtrar por curso, semestre, professor, período e data. |
| Professor     | Consultar suas aulas publicadas em um ou vários cursos; alterar sala, cancelar e confirmar ocorrências.                                                             |
| Aluno         | Entrar sem CPF ou senha, consultar aulas publicadas por curso, semestre e período e abrir notificações.                                                             |

A criação de curso gera uma turma inicial por semestre. Coordenadores e professores podem estar vinculados a vários cursos. Conflitos de sala ou professor são verificados pelo servidor, inclusive entre requisições simultâneas.

## Executar

Requisitos: Java 17, Node.js 22.22 ou superior compatível, npm e PostgreSQL 18. O Maven Wrapper está incluído. Docker Desktop é opcional para executar o banco.

### Banco e API

Na pasta backend, mantenha seu arquivo .env existente. Para uma instalação nova, copie .env.example para .env e configure as senhas e o endereço do banco. Não sobrescreva o arquivo nem recrie o volume se já possui dados.

```powershell
cd backend
# Apenas se você utiliza o PostgreSQL do Compose:
docker compose up -d
# Carrega o .env e inicia o Spring Boot:
.\run.ps1
```

O Compose existente publica o PostgreSQL na porta **5433**. Para esse banco, configure DB_URL=jdbc:postgresql://localhost:5433/academico. Se utiliza PostgreSQL instalado diretamente, mantenha a porta correspondente à sua instalação.

A API atende em http://localhost:8080/api. O administrador inicial usa ADMIN_CPF e ADMIN_PASSWORD. A senha inicial só é aplicada se ainda não existir administrador; a migração não redefine contas existentes.

### Interface React

Em outro terminal, a partir da raiz:

```powershell
cd frontend
npm ci
npm run dev
```

Abra **http://127.0.0.1:5173**. O Vite encaminha /api para http://127.0.0.1:8080. Para outra porta da API, defina API_PROXY_TARGET no terminal antes de iniciar o Vite. A interface agora é executada pelo Vite; Live Server e os antigos scripts da raiz foram substituídos.

No PowerShell, a partir da raiz do projeto, também é possível iniciar com `.\frontend\run.ps1`. O script usa o Node instalado ou, neste workspace, a instalação portátil local, e instala dependências quando necessário.

Os arquivos .env são privados. Nunca coloque senhas em variáveis VITE_*: elas são públicas no build do frontend.

Se seu .env já define CORS_ORIGINS para o Live Server, atualize-o para incluir http://localhost:5173 e http://127.0.0.1:5173. O padrão do backend agora permite essas duas origens.

## Testar pela interface

1. Entre como administrador. Cadastre curso, matéria, sala, professor e coordenador. Vincule os usuários ao curso.
2. Entre como coordenador e clique em **Adicionar Aula**. Informe matéria, docente, turma, data, início, término e sala. Salve como rascunho.
3. Teste **Editar → Somente esta aula** ou **Todas as aulas desta série**. Alterar a data da série desloca todas as ocorrências pelo mesmo intervalo, preservando publicação e cancelamentos.
4. Clique em **Publicar Cronograma**. Entre como professor, consulte suas aulas e altere sala ou situação.
5. Use **Entrar como aluno**, selecione curso, semestre e semana correspondente à aula; confira as notificações.
6. Use **Atualizar aulas** para buscar alterações de outra sessão. Não há atualização automática em tempo real.

Por padrão, o semestre é de **03/08/2026 a 18/12/2026**. São aceitos dias úteis, no matutino (**08:00–11:50**) ou noturno (**19:00–22:50**), com término posterior ao início. Configure outras datas por SEMESTER_START e SEMESTER_END.

## Organização

```text
frontend/   React, TypeScript, componentes, testes e build
backend/    Spring Boot, módulos de negócio, JPA e migrações
docs/       Arquitetura, fluxogramas e validação
```

- [Arquitetura](docs/ARQUITETURA.md)
- [Fluxogramas](docs/FLUXOGRAMAS.md)
- [Backend e endpoints](backend/README.md)
- [Testes automatizados](docs/TESTES.md)

## Dados e sessão

- UUIDs, vínculos e tabelas anteriores são mantidos. Flyway controla o esquema; Hibernate valida sua compatibilidade.
- A sessão fica em memória. Recarregar a página exige novo login; sair revoga o token. Senhas e tokens não ficam no localStorage.
- Backups antigos podem ser importados na administração. A prévia não grava dados; a confirmação é atômica. Senhas antigas são descartadas; contas novas exigem novas senhas.
- Os dados antigos do localStorage não são apagados automaticamente. Eles não são usados pelo novo frontend nem sincronizados com o PostgreSQL.
- A leitura das notificações do aluno existe somente durante sua sessão anônima.

## Build

```powershell
cd frontend
npm run build
cd ../backend
.\mvnw.cmd -DskipTests package
```

O frontend gera frontend/dist; a API gera o JAR em backend/target. Em produção, sirva o frontend por HTTPS, encaminhe /api ao backend e configure o servidor estático para retornar index.html nas rotas da aplicação. O proxy do Vite é apenas de desenvolvimento.

Esta migração não inclui implantação, recuperação de senha ou limitação de tentativas de login. Configure infraestrutura, backup do PostgreSQL, HTTPS e proteção operacional antes da exposição pública.
