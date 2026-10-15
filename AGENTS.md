# AGENTS.md

## Projeto

**Archivum** — sistema de gerenciamento interno de uma biblioteca escolar. Bibliotecários
cadastram alunos, livros e autores e registram empréstimos. Alunos **não** têm acesso ao
sistema e **não** fazem reservas. Fluxo real: o aluno leva o livro até a mesa do
bibliotecário e o empréstimo é registrado ali.

## Stack

- **AdonisJS v7** — monolito MVC (TypeScript, ESM). Requer **Node.js >= 24** e npm >= 11.
- Views: templates **Edge** + **Tailwind CSS v4** (via Vite).
- Banco: **PostgreSQL 16** via Lucid ORM. O scaffold do AdonisJS usa SQLite por padrão;
  o Postgres precisa ser configurado explicitamente.
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
- Uma suíte: `node ace test unit`   (suítes: `unit`, `functional`, `browser`)
- Um arquivo: `node ace test --files="users/index"`
- Um teste / grupo: `node ace test --tests="<título>"` / `--groups="<grupo>"`
- Criar teste: `node ace make:test users/list --suite=functional`

## Fluxo de trabalho (obrigatório)

- **TDD**: escreva/ajuste o teste primeiro, depois a implementação.
- **Nunca modifique um teste para o código de produção passar.** Se o teste falha, o
  código de produção está errado.
- **Sempre peça revisão** do código (de teste ou de produção) **antes de qualquer commit**.
  Não commite sem revisão.
- Commits seguem **Conventional Commits** (ex.: `feat:`, `fix:`, `test:`, `refactor:`).
- Por enquanto, trabalhe **direto na `main`** (sem branches).

## Notas não óbvias

- Testes usam **Japa**, não Jest/Vitest. `tests/bootstrap.ts` configura plugins e suítes.
- Testes funcionais sobem um servidor HTTP real; a config de teste fica em `.env.test`.
- Views são **Edge**, não React/Vue/Inertia (mesmo que o AdonisJS v7 ofereça esses kits).
