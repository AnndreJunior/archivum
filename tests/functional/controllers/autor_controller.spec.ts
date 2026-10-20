import { test } from '@japa/runner'
import Autor from '#models/autor'
import Bibliotecario from '#models/bibliotecario'
import { useDatabase } from '#tests/helpers/database'

/**
 * Dados base do bibliotecário usado nos testes HTTP de autores.
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
 * Cria um bibliotecário no banco para servir de sessão autenticada.
 */
async function criarBibliotecario() {
  return Bibliotecario.create(dadosBibliotecario)
}

type RespostaAutor = {
  autor: {
    id: number
    nome: string
  }
}

type RespostaErros = {
  errors: Array<{
    field: string
    message: string
  }>
}

test.group('AutorController | cadastro', (group) => {
  useDatabase(group)

  test('redireciona o visitante não autenticado para o login', async ({ client }) => {
    const response = await client
      .post('/autores')
      .withCsrfToken()
      .redirects(0)
      .form({ nome: 'Machado de Assis' })

    response.assertStatus(302)
    response.assertHeader('location', '/auth/login')
  })

  test('cadastra um autor e responde em JSON', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/autores')
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ nome: '  Machado de Assis  ' })
      .loginAs(bibliotecario)

    response.assertStatus(201)

    const { autor } = response.body() as RespostaAutor
    assert.equal(autor.nome, 'Machado de Assis')

    const autorSalvo = await Autor.findOrFail(autor.id)
    assert.equal(autorSalvo.nome, 'Machado de Assis')
  })

  test('rejeita nome vazio', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/autores')
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ nome: '   ' })
      .loginAs(bibliotecario)

    response.assertStatus(422)
    assert.equal((response.body() as RespostaErros).errors[0].field, 'nome')
    assert.lengthOf(await Autor.all(), 0)
  })

  test('rejeita nome já cadastrado', async ({ assert, client }) => {
    await Autor.create({ nome: 'Machado de Assis' })
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/autores')
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ nome: 'Machado de Assis' })
      .loginAs(bibliotecario)

    response.assertStatus(422)
    assert.equal((response.body() as RespostaErros).errors[0].field, 'nome')
    assert.lengthOf(await Autor.all(), 1)
  })

  test('rejeita nome maior que 120 caracteres', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/autores')
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ nome: 'a'.repeat(121) })
      .loginAs(bibliotecario)

    response.assertStatus(422)
    assert.equal((response.body() as RespostaErros).errors[0].field, 'nome')
    assert.lengthOf(await Autor.all(), 0)
  })

  test('redireciona o visitante não autenticado da página de cadastro para o login', async ({
    client,
  }) => {
    const response = await client.get('/autores/criar').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/auth/login')
  })

  test('renderiza a página de cadastro de autor', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/autores/criar').loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('action="/autores"')
    response.assertTextIncludes('name="nome"')
  })

  test('cadastra um autor pela página e volta para ela', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/autores')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ nome: '  Machado de Assis  ' })

    response.assertStatus(302)
    response.assertHeader('location', '/autores/criar')
    response.assertFlashMessage('sucesso', 'Autor cadastrado com sucesso.')

    const autor = await Autor.findByOrFail('nome', 'Machado de Assis')
    assert.equal(autor.nome, 'Machado de Assis')
  })

  test('rejeita nome vazio na página de cadastro', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/autores')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/autores/criar')
      .loginAs(bibliotecario)
      .form({ nome: '   ' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'nome')
    assert.lengthOf(await Autor.all(), 0)
  })
})
