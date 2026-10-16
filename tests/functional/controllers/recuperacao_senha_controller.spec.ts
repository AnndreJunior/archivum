import { test } from '@japa/runner'
import Bibliotecario from '#models/bibliotecario'
import RecuperacaoSenhaService from '#services/recuperacao_senha_service'
import { useDatabase } from '#tests/helpers/database'
import { useMail, waitForMessages } from '#tests/helpers/mail'

/**
 * Mensagem genérica exibida após o pedido, para não revelar se o e-mail existe.
 */
const MENSAGEM_GENERICA =
  'Se houver uma conta com este e-mail, enviaremos um link para redefinir a senha.'

/**
 * Dados base do bibliotecário usado nos testes HTTP de recuperação de senha.
 */
const dadosBibliotecario = {
  nome: 'Bibliotecária de Teste',
  matricula: 'BIB001',
  email: 'bib@archivum.test',
  senha: 'senha-secreta-123',
  role: 'bibliotecario',
  ativo: true,
}

/**
 * Cria um bibliotecário no banco para servir de dono do token.
 */
async function criarBibliotecario(overrides: Partial<typeof dadosBibliotecario> = {}) {
  return Bibliotecario.create({ ...dadosBibliotecario, ...overrides })
}

/**
 * Gera um token válido para o bibliotecário informado.
 */
async function gerarToken(bibliotecario: Bibliotecario) {
  return new RecuperacaoSenhaService().gerarToken(bibliotecario)
}

test.group('RecuperacaoSenhaController | página de solicitação', (group) => {
  useDatabase(group)

  test('renderiza o formulário que pede o e-mail', async ({ client }) => {
    const response = await client.get('/auth/esqueci-minha-senha')

    response.assertStatus(200)
    response.assertTextIncludes('action="/auth/esqueci-minha-senha"')
    response.assertTextIncludes('name="email"')
    response.assertTextIncludes('Voltar para o login')
  })

  test('redireciona o bibliotecário autenticado para a home', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .get('/auth/esqueci-minha-senha')
      .loginAs(bibliotecario)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
  })
})

test.group('RecuperacaoSenhaController | envio do link', (group) => {
  useDatabase(group)
  useMail(group)

  test('envia o e-mail e mostra uma mensagem genérica', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/auth/esqueci-minha-senha')
      .withCsrfToken()
      .redirects(0)
      .form({ email: bibliotecario.email })

    response.assertStatus(302)
    response.assertHeader('location', '/auth/esqueci-minha-senha')
    response.assertFlashMessage('recuperacaoEnviada', MENSAGEM_GENERICA)
    assert.lengthOf(await waitForMessages(), 1)
  })

  test('mostra a mesma mensagem e não envia nada para e-mail inexistente', async ({
    assert,
    client,
  }) => {
    const response = await client
      .post('/auth/esqueci-minha-senha')
      .withCsrfToken()
      .redirects(0)
      .form({ email: 'fantasma@archivum.test' })

    response.assertStatus(302)
    response.assertFlashMessage('recuperacaoEnviada', MENSAGEM_GENERICA)
    assert.lengthOf(await waitForMessages(1, 500), 0)
  })

  test('rejeita e-mail em formato inválido', async ({ assert, client }) => {
    const response = await client
      .post('/auth/esqueci-minha-senha')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/auth/esqueci-minha-senha')
      .form({ email: 'nao-e-email' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'email')
  })
})

test.group('RecuperacaoSenhaController | página de troca', (group) => {
  useDatabase(group)

  test('redireciona para a solicitação quando falta o token', async ({ client }) => {
    const response = await client.get('/auth/trocar-senha').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/auth/esqueci-minha-senha')
  })

  test('redireciona com erro quando o token é inválido', async ({ client }) => {
    const response = await client.get('/auth/trocar-senha?token=invalido').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/auth/esqueci-minha-senha')
    response.assertFlashMessage('recuperacaoError', 'Link inválido ou expirado')
  })

  test('renderiza o formulário de nova senha com o token válido', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()
    const token = await gerarToken(bibliotecario)

    const response = await client.get(`/auth/trocar-senha?token=${token}`)

    response.assertStatus(200)
    response.assertTextIncludes('action="/auth/trocar-senha"')
    response.assertTextIncludes(`value="${token}"`)
    response.assertTextIncludes('name="senhaConfirmation"')
  })
})

test.group('RecuperacaoSenhaController | troca da senha', (group) => {
  useDatabase(group)

  test('troca a senha e redireciona para o login', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const token = await gerarToken(bibliotecario)

    const response = await client
      .post('/auth/trocar-senha')
      .withCsrfToken()
      .redirects(0)
      .form({ token, senha: 'nova-senha-123', senhaConfirmation: 'nova-senha-123' })

    response.assertStatus(302)
    response.assertHeader('location', '/auth/login')

    const autenticado = await Bibliotecario.verifyCredentials(bibliotecario.email, 'nova-senha-123')
    assert.equal(autenticado.id, bibliotecario.id)
  })

  test('redireciona para a solicitação quando o token é inválido', async ({ client }) => {
    const response = await client
      .post('/auth/trocar-senha')
      .withCsrfToken()
      .redirects(0)
      .form({ token: 'invalido', senha: 'nova-senha-123', senhaConfirmation: 'nova-senha-123' })

    response.assertStatus(302)
    response.assertHeader('location', '/auth/esqueci-minha-senha')
    response.assertFlashMessage('recuperacaoError', 'Link inválido ou expirado')
  })

  test('rejeita quando a confirmação não coincide com a senha', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const token = await gerarToken(bibliotecario)

    const response = await client
      .post('/auth/trocar-senha')
      .withCsrfToken()
      .redirects(0)
      .header('referer', `/auth/trocar-senha?token=${token}`)
      .form({ token, senha: 'nova-senha-123', senhaConfirmation: 'diferente-123' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'senhaConfirmation')
  })
})
