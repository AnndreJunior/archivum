import type { Group } from '@japa/runner/core'
import type { PostgreConfig } from '@adonisjs/lucid/types/database'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Imagem do Postgres usada nos testes. Deve acompanhar a versão rodada em
 * produção (ver `docker-compose.yml`).
 */
const POSTGRES_IMAGE = 'postgres:16-alpine'

/**
 * Aponta a conexão padrão do Lucid para o container recém-iniciado,
 * trocando apenas os dados de conexão e preservando o restante da
 * configuração definida em `config/database.ts`.
 */
function connectToContainer(container: StartedPostgreSqlContainer) {
  const name = db.primaryConnectionName
  const config = db.config.connections[name] as PostgreConfig
  const connection = typeof config.connection === 'object' ? config.connection : {}

  db.manager.patch(name, {
    ...config,
    connection: {
      ...connection,
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
    },
  })
}

/**
 * Sobe um container Postgres exclusivo do grupo de testes e roda as migrations
 * uma única vez. A cada teste o banco é truncado (schema preservado) e, ao final
 * do grupo, o container é derrubado.
 *
 * Uso:
 *
 * ```ts
 * test.group('Aluno', (group) => {
 *   useDatabase(group)
 *
 *   test('cria um aluno', async ({ assert }) => { ... })
 * })
 * ```
 */
export function useDatabase(group: Group) {
  /**
   * Atribuído no hook de setup do grupo e consumido no setup de cada teste.
   */
  let truncate!: () => Promise<void>

  group.setup(async () => {
    const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase('archivum_test')
      .withUsername('archivum')
      .withPassword('archivum')
      .start()

    connectToContainer(container)

    /**
     * Roda as migrations e devolve a função que trunca todas as tabelas,
     * mantendo o schema para os próximos testes.
     */
    truncate = await testUtils.db().truncate()

    return async () => {
      await db.manager.closeAll(true)
      await container.stop()
    }
  })

  group.each.setup(() => truncate())
}
