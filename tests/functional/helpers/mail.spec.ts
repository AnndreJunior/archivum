import net from 'node:net'
import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import {
  getMailServer,
  getMessageHtml,
  getMessages,
  useMail,
  waitForMessages,
} from '#tests/helpers/mail'

/**
 * Importa uma mensagem .eml diretamente na caixa do smtp4dev (`PUT
 * /api/Messages`). É o caminho mais simples para simular um e-mail recebido sem
 * depender de um cliente SMTP.
 */
async function importarMensagem(webUrl: string, eml: string) {
  const response = await fetch(`${webUrl}/api/Messages`, {
    method: 'PUT',
    headers: { 'Content-Type': 'message/rfc822' },
    body: eml,
  })

  if (!response.ok) {
    throw new Error(`Falha ao importar mensagem no smtp4dev: HTTP ${response.status}`)
  }
}

/**
 * Abre uma conexão TCP com o servidor SMTP e devolve o banner inicial (`220`),
 * usado para confirmar que a porta SMTP está realmente exposta e atendendo.
 */
function lerBannerSmtp(host: string, port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    socket.setTimeout(5000)

    socket.once('data', (data) => {
      socket.end()
      resolve(data.toString())
    })
    socket.once('error', reject)
    socket.once('timeout', () => {
      socket.destroy()
      reject(new Error('Timeout ao conectar na porta SMTP do smtp4dev'))
    })
  })
}

test.group('Helpers | servidor de e-mail (smtp4dev)', (group) => {
  useMail(group)

  test('lista as mensagens importadas pela API do smtp4dev', async ({ assert }) => {
    const { webUrl } = await getMailServer()

    await importarMensagem(
      webUrl,
      [
        'From: app@archivum.test',
        'To: aluno@escola.test',
        'Subject: Bem-vindo ao Archivum',
        '',
        'Olá, aluno!',
      ].join('\r\n')
    )

    const mensagens = await getMessages()

    assert.lengthOf(mensagens, 1)
    assert.equal(mensagens[0].subject, 'Bem-vindo ao Archivum')
    assert.deepEqual(mensagens[0].to, ['aluno@escola.test'])
  })

  test('reutiliza o mesmo servidor entre chamadas', async ({ assert }) => {
    assert.strictEqual(await getMailServer(), await getMailServer())
  })

  test('expõe a porta SMTP do container', async ({ assert }) => {
    const { host, smtpPort } = await getMailServer()
    const banner = await lerBannerSmtp(host, smtpPort)

    assert.match(banner, /^220/)
  })

  test('entrega no servidor os e-mails enviados pelo app', async ({ assert }) => {
    await mail.send((message) => {
      message.to('bib@archivum.test').subject('Boas-vindas').html('<p>Olá!</p>')
    })

    const mensagens = await waitForMessages()

    assert.lengthOf(mensagens, 1)
    assert.equal(mensagens[0].subject, 'Boas-vindas')
    assert.deepEqual(mensagens[0].to, ['bib@archivum.test'])

    const html = await getMessageHtml(mensagens[0].id)
    assert.include(html, 'Olá!')
  })

  test('limpa as mensagens antes de cada teste', async ({ assert }) => {
    assert.lengthOf(await getMessages(), 0)
  })
})

test.group('Helpers | servidor de e-mail compartilhado pela suíte', (group) => {
  useMail(group)

  test('continua de pé e limpo no próximo grupo', async ({ assert }) => {
    assert.lengthOf(await getMessages(), 0)
  })
})
