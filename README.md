# Projeto Integrado II/III

Portal acadêmico de demonstração. Abra `index.html` no navegador ou sirva a pasta com um servidor estático.

## Preservar os cadastros

Os dados ficam no `localStorage` do navegador, separados por endereço. O GitHub não recebe esses dados quando os arquivos do projeto são enviados.

1. Antes de mudar de endereço, entre como Admin no portal atual.
2. Clique em **Exportar dados** e guarde o JSON em local privado.
3. Abra o portal no novo endereço, entre como Admin e clique em **Restaurar dados**.
4. Escolha o JSON e confirme a substituição dos dados daquele navegador.

O backup inclui cursos, matérias, professores, coordenadores, contas, turmas, aulas e notificações. Ele contém CPFs e senhas da demonstração: não o envie ao GitHub. Os arquivos `backup-*.json` e a pasta `backups/` estão no `.gitignore`.

## Acesso inicial

Admin: `999.999.999-99`, senha `123456`. Após restaurar um backup, valem as contas desse backup.

Este protótipo não possui servidor de autenticação nem banco compartilhado. Publicar os arquivos não sincroniza os cadastros entre usuários ou dispositivos.
