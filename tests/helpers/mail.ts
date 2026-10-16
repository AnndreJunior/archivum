import type { Group } from '@japa/runner/core'
import { GenericContainer, Wait } from 'testcontainers'
import type { StartedTestContainer } from 'testcontainers'
import mail from '@adonisjs/mail/services/main'
import { SMTPTransport } from '@adonisjs/mail/transports/smtp'

/**
 * Imagem do smtp4dev usada nos testes. Deve acompanhar a versão rodada em
 * desenvolvimento (ver `docker-compose.yml`).
 */
const SMTP4DEV_IMAGE = 'rnwood/smtp4dev:v3'

/**
 * Portas internas do container. As portas externas são atribuídas
 * dinamicamente pelo Docker.
 */
const WEB_PORT = 80
const SMTP_PORT = 25

/**
 * `GET /api/Messages` pagina em 5 itens por padrão. Buscamos uma página grande
 * o suficiente para que os testes enxerguem todas as mensagens recebidas.
 */
const PAGE_SIZE = 100

/**
 * Resumo de uma mensagem, como devolvido por `GET /api/Messages`.
 */
export type MensagemResumo = {
  id: string
  from: string
  to: string[]
  subject: string
  receivedDate: string
  isRelayed: boolean
  attachmentCount: number
  isUnread: boolean
  hasWarnings: boolean
}

/**
 * Dados de conexão do servidor smtp4dev em execução. `smtpPort` é a porta SMTP
 * mapeada para o host e `webUrl` a URL base da API web.
 */
export type ServidorSmtp4dev = {
  host: string
  smtpPort: number
  webUrl: string
}

/**
 * Instância interna: além dos dados expostos, guarda o container para
 * derrubá-lo no teardown global. `dados` é estável, de modo que
 * `getMailServer()` devolve sempre a mesma referência.
 */
type ServidorInterno = {
  container: StartedTestContainer
  dados: ServidorSmtp4dev
}

/**
 * O servidor é único e compartilhado por toda a suíte: o primeiro grupo que
 * usar `useMail` sobe o container e os demais reaproveitam a mesma instância.
 * Guardamos a *promise* para que chamadas concorrentes não criem containers
 * duplicados.
 */
let servidor: Promise<ServidorInterno> | undefined

/**
 * Sobe o container do smtp4dev e espera a API web responder, garantindo que o
 * servidor está pronto antes de qualquer teste.
 */
async function iniciarServidor(): Promise<ServidorInterno> {
  const container = await new GenericContainer(SMTP4DEV_IMAGE)
    .withExposedPorts(WEB_PORT, SMTP_PORT)
    .withWaitStrategy(Wait.forHttp('/api/Version', WEB_PORT).forStatusCode(200))
    .start()

  return {
    container,
    dados: {
      host: container.getHost(),
      smtpPort: container.getMappedPort(SMTP_PORT),
      webUrl: `http://${container.getHost()}:${container.getMappedPort(WEB_PORT)}`,
    },
  }
}

/**
 * Devolve o servidor compartilhado, iniciando-o na primeira chamada.
 */
async function garantirServidor(): Promise<ServidorInterno> {
  servidor ??= iniciarServidor()
  return servidor
}

/**
 * Dados de conexão do servidor em execução (host, porta SMTP e URL da API
 * web). Útil para apontar o transport de e-mail do app para o container.
 */
export async function getMailServer(): Promise<ServidorSmtp4dev> {
  const { dados } = await garantirServidor()
  return dados
}

/**
 * Lista as mensagens recebidas pelo servidor, da mais recente para a mais
 * antiga, como devolvido pela API web do smtp4dev.
 */
export async function getMessages(): Promise<MensagemResumo[]> {
  const { dados } = await garantirServidor()
  const response = await fetch(`${dados.webUrl}/api/Messages?pageSize=${PAGE_SIZE}`)

  if (!response.ok) {
    throw new Error(`Falha ao listar mensagens do smtp4dev: HTTP ${response.status}`)
  }

  const { results } = (await response.json()) as { results: MensagemResumo[] }
  return results
}

/**
 * Devolve o HTML do corpo de uma mensagem. Útil para inspecionar links (por
 * exemplo, o token de redefinição de senha) enviados pelo app.
 */
export async function getMessageHtml(messageId: string): Promise<string> {
  const { dados } = await garantirServidor()
  const response = await fetch(`${dados.webUrl}/api/Messages/${messageId}/html`)

  if (!response.ok) {
    throw new Error(`Falha ao ler o HTML da mensagem do smtp4dev: HTTP ${response.status}`)
  }

  return response.text()
}

/**
 * Aguarda até que o servidor tenha pelo menos `quantidade` mensagens e devolve
 * a lista atual. O smtp4dev só indexa a mensagem na API web alguns instantes
 * depois de aceitar a conexão SMTP, então testes que esperam um e-mail devem
 * usar este helper em vez de `getMessages` diretamente.
 *
 * Para asserções negativas, passe um `timeoutMs` curto e verifique o retorno.
 */
export async function waitForMessages(quantidade = 1, timeoutMs = 5000): Promise<MensagemResumo[]> {
  const inicio = Date.now()
  let mensagens = await getMessages()

  while (mensagens.length < quantidade && Date.now() - inicio < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    mensagens = await getMessages()
  }

  return mensagens
}

/**
 * Remove todas as mensagens da caixa de entrada. A API do smtp4dev expõe o
 * "apagar tudo" na rota `DELETE /api/Messages/*`.
 */
export async function clearMessages(): Promise<void> {
  const { dados } = await garantirServidor()
  const response = await fetch(`${dados.webUrl}/api/Messages/*`, { method: 'DELETE' })

  if (!response.ok) {
    throw new Error(`Falha ao limpar mensagens do smtp4dev: HTTP ${response.status}`)
  }
}

/**
 * Derruba o container do smtp4dev. Deve ser chamado uma única vez, no teardown
 * global da suíte (ver `tests/bootstrap.ts`).
 */
export async function stopMailServer(): Promise<void> {
  if (!servidor) {
    return
  }

  const { container } = await servidor
  servidor = undefined
  await container.stop()
}

/**
 * Aponta o mailer padrão da aplicação para o container do smtp4dev, de modo
 * que os e-mails enviados com `mail.send` cheguem à caixa inspecionada por
 * `getMessages`/`getMessageHtml`. A troca substitui a fábrica do transport e
 * limpa o cache de mailers para que a próxima mensagem use o novo endereço.
 */
async function apontarMailerParaServidor(): Promise<void> {
  const { host, smtpPort } = await getMailServer()

  mail.config.mailers.smtp = () => new SMTPTransport({ host, port: smtpPort })
  await mail.close('smtp')
}

/**
 * Prepara o servidor smtp4dev para o grupo de testes.
 *
 * O container sobe uma única vez para toda a suíte (compartilhado entre todos
 * os grupos) e é derrubado no teardown global. A cada teste a caixa de entrada
 * é limpa, de modo que mensagens enviadas em um teste não vazem para o
 * seguinte.
 *
 * Uso:
 *
 * ```ts
 * test.group('Recuperação de senha', (group) => {
 *   useMail(group)
 *
 *   test('envia e-mail para o aluno', async ({ assert }) => {
 *     // ... dispara o envio ...
 *     const [mensagem] = await getMessages()
 *     assert.equal(mensagem.subject, 'Recuperação de senha')
 *   })
 * })
 * ```
 */
export function useMail(group: Group) {
  /**
   * Sobe o servidor antes do primeiro teste do grupo e aponta o mailer do app
   * para ele. A instância é compartilhada por toda a suíte, então nunca é
   * derrubada aqui.
   */
  group.setup(async () => {
    await garantirServidor()
    await apontarMailerParaServidor()
  })

  /**
   * Limpa a caixa de entrada antes de cada teste.
   */
  group.each.setup(() => clearMessages())
}
