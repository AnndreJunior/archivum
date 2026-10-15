# Archivum — Arquitetura

> **Fonte de verdade da arquitetura.** Descreve o sistema, a stack, as camadas e o fluxo de
> trabalho com o banco. O domínio de dados está em
> [`modelo-de-dados.md`](./modelo-de-dados.md) e as regras em
> [`regras-de-negocio.md`](./regras-de-negocio.md).

## 1. Visão geral

O **Archivum** é o sistema interno de gestão de uma biblioteca escolar. Bibliotecários
cadastram alunos, obras (livros), autores e exemplares, e registram empréstimos no balcão.
**Alunos não acessam o sistema**: são apenas registros, sem login, conta ou reserva.

## 2. Stack e camadas

- **AdonisJS v7** — monolito MVC, TypeScript (ESM). Requer **Node.js >= 24** e npm >= 11.
- **Views** Edge + **Tailwind CSS v4** (compilado via Vite, plugin `@tailwindcss/vite`).
- **PostgreSQL 16** via Lucid ORM (conexão `pg` em `config/database.ts`); credenciais vêm
  das variáveis `DB_*`.
- **Containerizado**: banco (e app) via `docker compose`.

Camadas:

- `app/models` — modelos Lucid;
- `app/controllers` — camada HTTP (ainda não implementada);
- `app/middleware` — middlewares (ex.: autenticação);
- `app/validators` — validação com VineJS;
- `start/routes.ts` — rotas;
- `config` — configuração (auth, database, session, …);
- `database/migrations` — schema do banco;
- `database/schema.ts` — **gerado automaticamente**, nunca editar à mão;
- `resources/views` — templates Edge.

**Models estendem o schema gerado**: cada model importa a classe `*Schema` de
`#database/schema` e adiciona relações e métodos de domínio.

## 3. Fluxo de migrations

1. Cria-se/edita-se um arquivo em `database/migrations`.
2. `node ace migration:run` aplica as migrations e **regenera** `database/schema.ts`
   (comando interno `schema:generate`, habilitado por padrão fora de produção).
3. `database/schema_rules.ts` ajusta a geração (ex.: ocultar a coluna `senha` na
   serialização) e é ligado via `config/database.ts → schemaGeneration.rulesPaths`.
4. Como o arquivo `database/schema.ts` é escrito em formato compacto pelo gerador, rode o
   Prettier (`npm run format`) após gerar, para manter o lint verde.

## 4. Estrutura de arquivos (referência)

```
app/models/           bibliotecario.ts, aluno.ts, autor.ts, livro.ts, exemplar.ts, emprestimo.ts
app/validators/       bibliotecario.ts
config/               auth.ts, database.ts, session.ts, ...
database/migrations/  create_*_table.ts (bibliotecario, aluno, autor, livro, exemplar, autor_livro, emprestimo)
database/schema.ts    (gerado)
database/schema_rules.ts
docs/                 arquitetura.md, modelo-de-dados.md, regras-de-negocio.md
resources/views/      templates Edge (layout em components/layouts/app.edge)
tests/helpers/        database.ts (banco de teste por grupo via Testcontainers)
```

## 5. Comandos úteis

- Servidor de desenvolvimento: `node ace serve --hmr`
- Build de produção: `node ace build`
- Migrations: `node ace migration:run` / `node ace migration:rollback`
- Testes: `node ace test` (suítes `unit`, `functional`, `browser`)
- Lint / format / typecheck: `npm run lint`, `npm run format`, `npm run typecheck`
- Subir banco + app: `docker compose up -d --build`; só o banco: `docker compose up -d db`

## 6. Bootstrap do bibliotecário admin

No startup do servidor HTTP, o preload `start/admin.ts` (registrado em `adonisrc.ts`
apenas no ambiente `web`) garante que exista um bibliotecário com `role = 'admin'`. Se
não houver nenhum, ele é criado por `app/services/admin_bibliotecario.ts` usando as
variáveis de ambiente `ADMIN_NOME`, `ADMIN_MATRICULA`, `ADMIN_EMAIL` e `ADMIN_SENHA`
(secreta, com hash aplicado pelo `withAuthFinder`). Como roda só no ambiente `web`, não
interfere nos testes nem em comandos do Ace, e executa depois das migrations.
