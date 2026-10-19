# API Acadêmica

Java 17, Spring Boot 4.1.1, Spring Security, Spring Data JPA/Hibernate, PostgreSQL 18 e Flyway. A API preserva os contratos anteriores e retorna DTOs, sem serializar entidades JPA.

## Executar

Mantenha o .env existente. Em uma instalação nova, copie .env.example e configure as variáveis. O script carrega o arquivo sem imprimir valores:

```powershell
# Opcional, para o PostgreSQL do Compose:
docker compose up -d
.\run.ps1
```

O Compose publica o banco em localhost:5433. Para PostgreSQL instalado diretamente, use o endereço da sua instalação. O volume academico_data foi preservado; não remova o volume se deseja manter os dados. No Linux/macOS, exporte as variáveis e execute sh mvnw spring-boot:run.

| Variável                      | Finalidade                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| DB_URL                        | JDBC PostgreSQL. Padrão da API: jdbc:postgresql://localhost:5432/academico; o Compose usa porta externa 5433. |
| DB_USER / DB_PASSWORD         | Usuário e senha do banco; usuário padrão academico.                                                           |
| ADMIN_CPF                     | Identificador do primeiro administrador; padrão 99999999999.                                                  |
| ADMIN_PASSWORD                | Senha inicial, mínimo 12 caracteres e máximo 72 bytes UTF-8; usada apenas quando não existe administrador.    |
| PORT                          | Porta HTTP; padrão 8080.                                                                                      |
| CORS_ORIGINS                  | Origens autorizadas, separadas por vírgula. Padrão: http://localhost:5173,http://127.0.0.1:5173. |
| SEMESTER_START / SEMESTER_END | Datas ISO; padrão 2026-08-03 / 2026-12-18.                                                                    |

## Persistência

Módulos: security, users, courses, subjects, groups, rooms, lessons, notifications e imports. shared contém DTOs, tratamento de erros e a trava transacional; config contém a configuração de segurança.

Controllers recebem requisições, serviços aplicam regras e transações e repositórios Spring Data persistem entidades. As associações user_course e lesson_group são mapeadas em JPA; referências individuais mantêm as chaves UUID existentes e as restrições PostgreSQL.

Flyway controla o esquema. Hibernate usa ddl-auto=validate e open-in-view=false. As migrações V1 e V2 não foram alteradas. Operações de vínculos e horários preservam a trava pg_advisory_xact_lock; essa é a única consulta SQL nativa da persistência.

## Contrato HTTP

Prefixo /api, JSON, IDs UUID. Entradas mantêm camelCase; saídas preservam nomes como course_id, series_id, lesson_date, starts_at e ends_at. Datas: AAAA-MM-DD. Horários enviados em HH:mm e retornados em HH:mm:ss.

| Método e rota                                                      | Uso                                                                        |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| POST /auth/login                                                   | CPF e senha; retorna token Bearer e perfil.                                |
| GET /auth/me, POST /auth/logout                                    | Perfil autenticado e revogação do token.                                   |
| GET /courses                                                       | Cursos permitidos para o usuário.                                          |
| POST /courses, PUT /courses/{id}                                   | Administrador: cadastrar e editar curso.                                   |
| GET /subjects?courseId=...                                         | Matérias do curso permitido.                                               |
| POST /subjects, PUT /subjects/{id}, DELETE /subjects/{id}          | Administrador: matérias; exclusão bloqueada quando vinculada a aulas.      |
| GET /groups?courseId=..., POST /groups                             | Consultar turmas; cadastrar como administrador.                            |
| GET /rooms, POST /rooms, PUT /rooms/{id}                           | Consultar salas; cadastrar/editar como administrador.                      |
| GET /users, POST /users, PUT /users/{id}                           | Administrador: usuários e vínculos.                                        |
| GET /courses/{id}/staff                                            | Docentes/coordenadores ativos, sem CPF.                                    |
| GET /calendar                                                      | Limites do semestre.                                                       |
| GET /lessons?courseId=...&from=...&to=...                          | Aulas autorizadas; filtros opcionais semester e period (MATUTINO/NOTURNO). |
| POST /lessons                                                      | Coordenador: criar aula ou repetição semanal.                              |
| PUT /lessons/{id}                                                  | Uma ocorrência; repetição cria semanas faltantes.                          |
| PUT /lessons/{id}/series                                           | Todas as ocorrências existentes; exige repeatWeekly=false.                 |
| PATCH /lessons/{id}/location                                       | Professor: sala e situação CONFIRMED/CANCELLED da sua aula publicada.      |
| POST /courses/{id}/publish                                         | Coordenador: publicar rascunhos.                                           |
| DELETE /lesson-series/{id}                                         | Coordenador: excluir todas as ocorrências.                                 |
| GET /public/courses, /public/groups?courseId=..., /public/calendar | Consultas anônimas.                                                        |
| GET /public/lessons?courseId=...&from=...&to=...                   | Somente aulas publicadas.                                                  |
| GET /public/notifications?courseId=...&semester=...&from=...&to=... | Até 100 notificações após filtrar pelas datas das aulas; from/to opcionais em AAAA-MM-DD. |
| POST /admin/import/preview, /admin/import/confirm                  | Administrador: prévia e confirmação de backup antigo.                      |

Autenticação: Authorization: Bearer TOKEN, validade de 8 horas. O banco guarda o hash SHA-256 do token e senhas BCrypt. Alterar senha revoga todos os tokens do usuário. Não há cookies de autenticação. CPF aceita 11 dígitos com ou sem máscara, sem cálculo dos dígitos verificadores.

Os cadastros são feitos pela interface React. Curso cria turmas iniciais; professor e coordenador podem ter múltiplos cursos. Remover um curso do professor exige reatribuir ou excluir suas aulas.

O aluno consulta notificações da semana selecionada. A migração V3 adiciona a data da aula às notificações novas. Avisos antigos com data ISO entre parênteses no fim da mensagem continuam filtráveis; avisos sem data identificável não aparecem na consulta semanal. O filtro não usa a data de criação do aviso e não restringe matutino/noturno.

## Importação

Na administração, use **Importar backup antigo**. Senhas antigas são removidas antes do envio. Informe novas senhas para contas novas e andar/tipo de espaço para salas ausentes. A prévia vale por dez minutos; alterar os dados exige outra validação.

A importação é aditiva e atômica. Cadastros compatíveis são reaproveitados. Divergências, conflitos ou alterações concorrentes desde a prévia impedem a confirmação inteira. O hash do backup impede importação repetida. A prévia sempre sofre rollback.

## Testes e build

Veja [TESTES.md](../docs/TESTES.md). Os testes devem usar PostgreSQL isolado e criam registros com identificadores únicos.

```powershell
# Após configurar as variáveis do banco isolado:
.\mvnw.cmd test
.\mvnw.cmd -DskipTests package
```

O JAR fica em target/academico-api-0.1.0-SNAPSHOT.jar.

## Salas padrão

A migração V4 cadastra automaticamente 101–119, 201–219, 301–319 e 401–419 nos respectivos andares, além de Lab1–Lab6 em Laboratórios. Cadastros existentes são preservados; capacidade é opcional no banco e não é solicitada pela interface.
