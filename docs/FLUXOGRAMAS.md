# Fluxogramas do sistema acadêmico

Projeto Integrado II/III — Universidade Anhanguera. Os diagramas representam a versão React + TypeScript com API Spring Boot, Spring Data JPA e PostgreSQL. Não há modo demonstração.

## Acesso

```mermaid
flowchart TD
    Inicio["Abrir o portal React"] --> Tipo{"Tipo de acesso"}
    Tipo -->|Aluno| Aluno["Consulta anônima de aulas publicadas"]
    Tipo -->|Usuário cadastrado| Login["Informar CPF e senha"]
    Login --> API["API valida a senha BCrypt"]
    API --> Valido{"Credenciais válidas?"}
    Valido -->|Não| Erro["Mostrar erro no formulário"]
    Erro --> Login
    Valido -->|Sim| Token["Token Bearer em memória"]
    Token --> Perfil{"Perfil"}
    Perfil -->|Admin| Admin["Administração acadêmica"]
    Perfil -->|Coordenador| Coord["Cronograma dos cursos vinculados"]
    Perfil -->|Professor| Prof["Aulas próprias publicadas"]
    Admin --> Sair["Sair e revogar token"]
    Coord --> Sair
    Prof --> Sair
    Sair --> Inicio
```

A API valida permissões em cada operação. Tokens duram oito horas; uma resposta 401 encerra a sessão. Recarregar a página exige novo login. Alunos não possuem conta nem identificação individual de leitura.

## Administração

```mermaid
flowchart TD
    Admin["Administração"] --> Acao{"Cadastrar ou editar?"}
    Acao --> Novo["Curso, matéria, coordenador, professor ou sala"]
    Novo --> Form["Formulário em janela centralizada"]
    Form --> API["Enviar dados à API"]
    API --> Validar{"Dados e vínculos válidos?"}
    Validar -->|Não| Erro["Manter formulário e mostrar erro"]
    Erro --> Form
    Validar -->|Sim| JPA["Serviço e repositório JPA"]
    JPA --> Banco[(PostgreSQL)]
    Banco --> Atualizar["Atualizar cadastros na interface"]
```

| Cadastro    | Regras                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Curso       | Gera uma turma inicial por semestre. Sigla permanece na edição. Semestres com aulas vinculadas não podem ser removidos. |
| Matéria     | Pertence a um curso. Para editar, selecionar primeiro o curso e depois a matéria.                                       |
| Coordenador | Um ou vários cursos; CPF e perfil permanecem na edição.                                                                 |
| Professor   | Um ou vários cursos; remover vínculo exige reatribuir/excluir aulas daquele curso.                                      |
| Sala        | Nome e andar/tipo. A edição mantém o UUID e os vínculos das aulas.                                          |

Senhas vazias na edição preservam a senha atual. Alterar a senha revoga tokens existentes. Os formulários de coordenador e professor permitem editar todos os vínculos de curso.

## Consulta por coordenador e curso

```mermaid
flowchart TD
    Filtro["Selecionar coordenador"] --> Cursos["Filtro oferece somente seus cursos"]
    Cursos --> Card["Card mostra o coordenador e todos os seus cursos"]
    Card --> Escolha{"Selecionou um curso?"}
    Escolha -->|Não| Aguardar["Aguardar escolha de curso"]
    Escolha -->|Sim| Detalhes["Mostrar coordenadores, professores e matérias do curso"]
    Detalhes --> Troca["Ao trocar coordenador, limpar curso selecionado"]
    Troca --> Filtro
```

Sem coordenador selecionado, o filtro disponibiliza todos os cursos. Filtros de pessoas exibem somente o nome, sem CPF.

## Cadastro e publicação de aulas

```mermaid
flowchart TD
    Curso["Selecionar curso vinculado"] --> Dados["Matéria, professor, turmas, data, início, término e sala"]
    Dados --> Repetir{"Repetir semanalmente?"}
    Repetir -->|Sim| Serie["Gerar datas até o fim do semestre"]
    Repetir -->|Não| Unica["Uma ocorrência"]
    Serie --> Validar["Validar todas as ocorrências na mesma transação"]
    Unica --> Validar
    Validar --> Conflito{"Conflito de sala ou professor?"}
    Conflito -->|Sim| Erro["Reverter tudo e mostrar erro"]
    Erro --> Dados
    Conflito -->|Não| Salvar["Salvar rascunhos no PostgreSQL"]
    Salvar --> Publicar["Publicar Cronograma"]
    Publicar --> Avisar["Marcar como publicadas e criar notificações"]
    Avisar --> Consulta["Disponibilizar para professor e aluno"]
```

Horários usam 24 horas, dentro de 08:00–11:50 ou 19:00–22:50. O término precisa ser posterior ao início. O semestre padrão é 03/08/2026–18/12/2026, em dias úteis. Conflitos consideram intervalos sobrepostos e aulas não canceladas, inclusive rascunhos. Matérias com nomes semelhantes não dispensam a validação.

## Edição e exclusão

```mermaid
flowchart TD
    Editar["Editar aula"] --> Escopo{"Aplicar em"}
    Escopo -->|Uma| Ocorrencia["Alterar somente a ocorrência selecionada"]
    Ocorrencia --> Repeticao["Repetição opcional cria semanas faltantes como rascunho"]
    Escopo -->|Todas| Serie["Alterar todas as ocorrências existentes da série"]
    Serie --> Datas["Deslocar datas pelo mesmo intervalo; manter publicação e cancelamentos"]
    Datas --> Validar["Validar a série inteira antes de salvar"]
    Validar --> Resultado{"Tudo válido?"}
    Resultado -->|Não| Rollback["Nenhuma ocorrência é alterada"]
    Resultado -->|Sim| Salvar["Gravar em uma transação e notificar turmas"]
    Excluir["Excluir Aula no cabeçalho"] --> Escolher["Selecionar série"]
    Escolher --> Confirmar{"Confirmar exclusão?"}
    Confirmar -->|Não| Manter["Manter aulas"]
    Confirmar -->|Sim| Remover["Remover todas as ocorrências e notificar turmas"]
```

Editar todas inclui ocorrências passadas e publicadas, sem criar novas repetições. Se uma data ficar fora do semestre ou houver conflito, toda a alteração é rejeitada.

## Professor e aluno

```mermaid
flowchart TD
    Perfil{"Acesso"}
    Perfil -->|Professor| Cursos["Um curso ou todos os cursos vinculados"]
    Cursos --> Visao["Semana ou semestre completo"]
    Visao --> Aulas["Somente suas aulas publicadas"]
    Aulas --> Alterar["Alterar sala, cancelar ou confirmar uma ocorrência"]
    Alterar --> Salvar["Validar conflitos, salvar e notificar quando houver mudança"]
    Perfil -->|Aluno| Filtros["Selecionar curso, semestre e período"]
    Filtros --> Semana["Consultar aulas publicadas por semana"]
    Semana --> Avisos["Notificações do curso e semestre"]
```

As notificações do aluno são filtradas pelo curso, semestre e semana selecionada, considerando a data da aula. O período matutino/noturno filtra aulas, mas não notificações. A leitura dos avisos fica apenas na sessão anônima. Use Atualizar aulas para buscar mudanças feitas em outro acesso. A visualização inicial é limitada ao semestre configurado; no semestre inteiro, semanas anteriores permanecem acessíveis pela rolagem.

## Importação e persistência

```mermaid
flowchart TD
    Arquivo["Admin seleciona backup JSON antigo"] --> Limpar["Frontend remove senhas antigas"]
    Limpar --> Complementar["Informar novas senhas e dados de salas ausentes"]
    Complementar --> Previa["API executa importação com rollback"]
    Previa --> Valido{"Backup válido?"}
    Valido -->|Não| Erro["Mostrar erro; banco permanece igual"]
    Valido -->|Sim| Revisar["Apresentar contagens e avisos"]
    Revisar --> Confirmar["Admin confirma a prévia"]
    Confirmar --> Verificar["Verificar validade da prévia e mudanças concorrentes"]
    Verificar --> Gravar["Gravar tudo em uma transação JPA"]
    Gravar --> Banco[(PostgreSQL)]
```

Prévias expiram em dez minutos. Alterar entradas exige nova prévia. A importação é aditiva, reaproveita cadastros compatíveis e mantém senhas existentes. Conflitos impedem a operação inteira. O hash do backup impede repetição da importação.

GitHub armazena código, não os dados do PostgreSQL. A aplicação não usa o antigo localStorage e não o limpa automaticamente. Consulte o [README](../README.md), a [arquitetura](ARQUITETURA.md) e os [testes](TESTES.md).
