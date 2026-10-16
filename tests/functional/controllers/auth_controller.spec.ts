import { test } from '@japa/runner'
import Bibliotecario from '#models/bibliotecario'
import { useDatabase } from '#tests/helpers/database'

/**
 * Dados base do bibliotecário usado nos testes de autenticação HTTP.
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
 * Cria um bibliotecário no banco para servir de credencial válida.
 */
async function criarBibliotecario(overrides: Partial<typeof dadosBibliotecario> = {}) {
  return Bibliotecario.create({ ...dadosBibliotecario, ...overrides })
}

test.group('AuthController | login e logout', (group) => {
  useDatabase(group)

  test('autentica o bibliotecário, cria a sessão e redireciona para a home', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/auth/login')
      .withCsrfToken()
      .redirects(0)
      .form({ email: dadosBibliotecario.email, senha: dadosBibliotecario.senha })

    response.assertStatus(302)
    response.assertHeader('location', '/')
    response.assertSession('auth_web', bibliotecario.id)
  })

  test('volta ao login com erro quando a senha está incorreta', async ({ client }) => {
    await criarBibliotecario()

    const response = await client
      .post('/auth/login')
      .withCsrfToken()
      .redirects(0)
      .form({ email: dadosBibliotecario.email, senha: 'senha-errada-000' })

    response.assertStatus(302)
    response.assertHeader('location', '/auth/login')
    response.assertFlashMessage('loginError', 'Credenciais inválidas')
  })

  test('volta ao login com erro quando a conta está inativa', async ({ client }) => {
    await criarBibliotecario({ ativo: false })

    const response = await client
      .post('/auth/login')
      .withCsrfToken()
      .redirects(0)
      .form({ email: dadosBibliotecario.email, senha: dadosBibliotecario.senha })

    response.assertStatus(302)
    response.assertHeader('location', '/auth/login')
    response.assertFlashMessage('loginError', 'Credenciais inválidas')
  })

  test('rejeita e-mail em formato inválido sem autenticar', async ({ assert, client }) => {
    const response = await client
      .post('/auth/login')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/auth/login')
      .form({ email: 'nao-e-email', senha: 'x' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'email')
    response.assertSessionMissing('auth_web')
  })

  test('encerra a sessão e redireciona para o login', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/auth/logout')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)

    response.assertStatus(302)
    response.assertHeader('location', '/auth/login')
  })
})

test.group('AuthController | página de login', (group) => {
  useDatabase(group)

  test('renderiza o formulário de login em um card para o visitante', async ({ client }) => {
    const response = await client.get('/auth/login')

    response.assertStatus(200)
    response.assertTextIncludes('action="/auth/login"')
    response.assertTextIncludes('name="email"')
    response.assertTextIncludes('name="senha"')
    response.assertTextIncludes('Esqueci minha senha')
  })

  test('não exibe a navegação nem o botão de sair', async ({ assert, client }) => {
    const response = await client.get('/auth/login')

    response.assertStatus(200)
    assert.notInclude(response.text(), 'Sair')
    assert.notInclude(response.text(), 'Empréstimos')
  })

  test('exibe a mensagem de erro quando as credenciais falham', async ({ client }) => {
    const response = await client
      .get('/auth/login')
      .withFlashMessages({ loginError: 'Credenciais inválidas' })

    response.assertStatus(200)
    response.assertTextIncludes('Credenciais inválidas')
  })

  test('ignora o aviso genérico de acesso não autorizado do redirect', async ({
    assert,
    client,
  }) => {
    const response = await client
      .get('/auth/login')
      .withFlashMessages({ error: 'Unauthorized access' })

    response.assertStatus(200)
    assert.notInclude(response.text(), 'Unauthorized access')
  })

  test('redireciona o bibliotecário autenticado para a home', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/auth/login').loginAs(bibliotecario).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
  })
})

test.group('Auth | proteção de rotas', (group) => {
  useDatabase(group)

  test('redireciona o visitante não autenticado para o login', async ({ client }) => {
    const response = await client.get('/').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/auth/login')
  })

  test('permite o acesso à home para o bibliotecário autenticado', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/').loginAs(bibliotecario)

    response.assertStatus(200)
  })
})
