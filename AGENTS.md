# AGENTS.md

## Projeto

**Archivum** — sistema de gerenciamento interno de uma biblioteca escolar. Bibliotecários
cadastram alunos, livros e autores e registram empréstimos. Alunos **não** têm acesso ao
sistema e **não** fazem reservas. Fluxo real: o aluno leva o livro até a mesa do
bibliotecário e o empréstimo é registrado ali.

## Stack

- **AdonisJS v7** — monolito MVC (TypeScript, ESM). Requer **Node.js >= 24** e npm >= 11.
- Views: templates **Edge** + **Tailwind CSS v4** (via Vite).
- Banco: **PostgreSQL 16** via Lucid ORM (conexão `pg` em `config/database.ts`); credenciais
  vêm das variáveis `DB_*`.
- Projeto totalmente containerizado; serviços essenciais (banco, etc.) via **docker compose**.

## Regras de negócio

- Somente bibliotecários autenticam e operam o sistema. Alunos são apenas registros:
  sem login, conta ou reserva.
- Empréstimos são sempre registrados por um bibliotecário no balcão.
- Um aluno não pode ter **mais de 3 empréstimos simultâneos**.
- Cada empréstimo dura até **15 dias úteis**.
- Para prorrogar, o aluno precisa ir à biblioteca **renovar** o empréstimo.
- Se não renovar nem devolver no prazo, o aluno **não pode fazer novo empréstimo** e fica
  **bloqueado pela mesma quantidade total de dias de atraso**.

## Modelo de dados (tabelas planejadas)

`bibliotecario`, `aluno`, `livro`, `exemplar`, `autor`, `emprestimo`.

- `livro` é a obra (título) e `exemplar` é a cópia física emprestável; um livro tem vários
  exemplares, e o empréstimo referencia um **exemplar** (não o livro diretamente).

## Comandos

- Servidor de desenvolvimento: `node ace serve --hmr`
- Build de produção: `node ace build`
- Entrypoint: `node ace` (raiz `ace.js`; nunca editar — código pré-boot vai em `bin/console.ts`)
- Instalar + configurar pacote: `node ace add <pacote>`
- Migrations: `node ace migration:run` / `node ace migration:rollback`
- Todos os testes: `node ace test`
- Uma suíte: `node ace test unit` (suítes: `unit`, `functional`, `browser`)
- Um arquivo: `node ace test --files="users/index"`
- Um teste / grupo: `node ace test --tests="<título>"` / `--groups="<grupo>"`
- Criar teste: `node ace make:test users/list --suite=functional`

## Docker

- Subir tudo (banco + app): `docker compose up -d --build`
- Só o banco (para rodar a app no host com `npm run dev`): `docker compose up -d db`
- Logs da app: `docker compose logs -f app`
- Derrubar: `docker compose down` (use `-v` para apagar também o volume do banco)
- Testes com banco usam **Testcontainers** e exigem o Docker em execução; eles sobem um
  Postgres próprio por grupo de teste, independente do `docker compose`.
- O serviço `app` só sobe após o `db` ficar healthy e roda `node ace migration:run --force`
  antes de iniciar o servidor.
- O `Dockerfile` é multi-stage: a imagem final contém apenas deps de produção + `build/`.
- Portas/credenciais parametrizadas por `DB_*` e `APP_PORT` (defaults no `docker-compose.yml`).

## Fluxo de trabalho (obrigatório)

### TDD

1. **Escreva/ajuste o teste primeiro** e execute-o.
2. **Crie o esqueleto do código de produção**: os arquivos e as assinaturas (classe,
   método, coluna) já devem existir, porém **sem implementação concreta** — cada método
   lança um erro de "não implementado". Sem o arquivo, o teste falha por "módulo
   inexistente", o que não valida a asserção.
3. **Valide a falha**: o erro deve ser apenas o "não implementado" (ou outra pendência do
   próprio esqueleto). Qualquer outra falha (teste mal escrito, asserção errada, problema
   de ambiente) deve ser corrigida no próprio teste antes de seguir.
4. **Peça revisão dos testes** ao usuário.
5. Se aprovado, **commite os testes** (`test: ...`).
6. **Só então implemente o código de produção.**
7. Rode a suíte; **nunca altere um teste para o código de produção passar** — se falha, o
   código de produção está errado.
8. **Peça revisão do código de produção** antes de commitar (`feat:`/`fix:`/`refactor:`).

- Commits seguem **Conventional Commits** (ex.: `feat:`, `fix:`, `test:`, `refactor:`).
- Por enquanto, trabalhe **direto na `main`** (sem branches).
- **Nunca commite sem revisão** (de teste ou de produção).

### Views (Edge)

Views em `resources/views/**` são exceção ao TDD: **crie-as diretamente, sem testes** — a
validação é visual, feita pelo usuário. Todo o restante (controllers, services, models,
validators, middlewares, etc.) continua obrigado ao fluxo de TDD acima.

## Notas não óbvias

- Testes usam **Japa**, não Jest/Vitest. `tests/bootstrap.ts` configura plugins e suítes.
- Testes funcionais sobem um servidor HTTP real; a config de teste fica em `.env.test`.
- Testes que precisam de banco chamam `useDatabase(group)` (de `#tests/helpers/database`)
  dentro do `test.group`. O helper sobe um container Postgres exclusivo do grupo, roda as
  migrations uma vez e trunca as tabelas a cada teste; o container é derrubado no fim do
  grupo.
- Views são **Edge**, não React/Vue/Inertia (mesmo que o AdonisJS v7 ofereça esses kits).
- Páginas usam o layout `resources/views/components/layouts/app.edge` (`@layouts.app()`),
  que injeta o CSS via `@vite(['resources/css/app.css'])`. O Tailwind v4 é compilado pelo
  plugin `@tailwindcss/vite` (configurado em `vite.config.ts`).
