# Archivum

Sistema interno de gestão de uma biblioteca escolar. Bibliotecários cadastram alunos,
livros, autores e exemplares, e registram empréstimos no balcão. Alunos **não** acessam o
sistema — são apenas registros, sem login, conta ou reserva.

## Tecnologias

- **[AdonisJS v7](https://adonisjs.com/)** — monolito MVC em TypeScript (ESM).
- **Edge** + **[Tailwind CSS v4](https://tailwindcss.com/)** — templates e estilos (via Vite).
- **[PostgreSQL 16](https://www.postgresql.org/)** + **Lucid ORM** — persistência.
- **Docker / Docker Compose** — ambiente containerizado.
- **Japa** (testes), **VineJS** (validação) e **smtp4dev** (e-mails em desenvolvimento).

Requisitos: **Node.js >= 24** e **npm >= 11** (ou apenas Docker, ao usar a opção com Compose).

## Como executar

### Com Docker Compose (banco + app)

1. Copie as variáveis de ambiente e preencha ao menos o `APP_KEY`:
   ```sh
   cp .env.example .env
   ```
2. Suba os serviços:
   ```sh
   docker compose up -d --build
   ```
3. A aplicação fica em <http://localhost:3333>. O serviço `app` aguarda o banco ficar
   saudável, roda as migrations e só então inicia o servidor.

Logs: `docker compose logs -f app` · Derrubar: `docker compose down` (use `-v` para apagar
o volume do banco).

### Com npm (app no host + banco no Docker)

1. Instale as dependências:
   ```sh
   npm install
   ```
2. Configure o ambiente e gere a chave da aplicação:
   ```sh
   cp .env.example .env
   node ace generate:key
   ```
3. Suba apenas o banco:
   ```sh
   docker compose up -d db
   ```
4. Rode as migrations e inicie o servidor de desenvolvimento:
   ```sh
   node ace migration:run
   node ace serve --hmr
   ```

Outros comandos úteis:

| Comando             | Descrição               |
| ------------------- | ----------------------- |
| `node ace build`    | Build de produção       |
| `node ace test`     | Executa todos os testes |
| `npm run lint`      | Lint (ESLint)           |
| `npm run format`    | Formatação (Prettier)   |
| `npm run typecheck` | Checagem de tipos (tsc) |

## Documentação

Mais detalhes sobre **regras de negócio**, **arquitetura** e **modelagem de dados** estão
nos arquivos em [`docs/`](./docs/):

- [`docs/regras-de-negocio.md`](./docs/regras-de-negocio.md)
- [`docs/arquitetura.md`](./docs/arquitetura.md)
- [`docs/modelo-de-dados.md`](./docs/modelo-de-dados.md)
