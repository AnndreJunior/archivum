import { test } from '@japa/runner'
import Autor from '#models/autor'
import Bibliotecario from '#models/bibliotecario'
import Livro from '#models/livro'
import { useDatabase } from '#tests/helpers/database'

/**
 * Dados base do bibliotecário usado nos testes HTTP do CRUD de livros.
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
 * Dados base de um livro usado nos testes.
 */
const dadosLivro = {
  titulo: 'Dom Casmurro',
  isbn: '978-85-359-0277-5',
  editora: 'Companhia das Letras',
  anoPublicacao: 1899,
}

/**
 * Cria um bibliotecário no banco para servir de sessão autenticada.
 */
async function criarBibliotecario(overrides: Partial<typeof dadosBibliotecario> = {}) {
  return Bibliotecario.create({ ...dadosBibliotecario, ...overrides })
}

/**
 * Cria um autor no banco.
 */
async function criarAutor(nome: string) {
  return Autor.create({ nome })
}

/**
 * Cria um livro no banco, opcionalmente associado a autores.
 */
async function criarLivro(overrides: Partial<typeof dadosLivro> = {}, autores: Autor[] = []) {
  const livro = await Livro.create({
    titulo: 'Livro de Teste',
    isbn: null,
    editora: null,
    anoPublicacao: null,
    ...overrides,
  })

  if (autores.length > 0) {
    await livro.related('autores').sync(autores.map((autor) => autor.id))
  }

  return livro
}

test.group('LivroController | acesso', (group) => {
  useDatabase(group)

  test('redireciona o visitante não autenticado para o login', async ({ client }) => {
    const response = await client.get('/livros').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/auth/login')
  })

  test('permite a listagem para o bibliotecário autenticado', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/livros').loginAs(bibliotecario)

    response.assertStatus(200)
  })
})

test.group('LivroController | listagem', (group) => {
  useDatabase(group)

  test('lista os livros cadastrados com seus autores', async ({ client }) => {
    const autor = await criarAutor('Machado de Assis')
    await criarLivro({ titulo: 'Dom Casmurro', isbn: '978-85-359-0277-5' }, [autor])
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/livros').loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Dom Casmurro')
    response.assertTextIncludes('978-85-359-0277-5')
    response.assertTextIncludes('Machado de Assis')
  })

  test('filtra os livros pela busca por título', async ({ assert, client }) => {
    await criarLivro({ titulo: 'Dom Casmurro', isbn: '978-85-359-0277-5' })
    await criarLivro({ titulo: 'Vidas Secas', isbn: '978-85-01-09553-8' })
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/livros').qs({ busca: 'Casmurro' }).loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Dom Casmurro')
    assert.notInclude(response.text(), 'Vidas Secas')
  })

  test('filtra os livros pela busca por ISBN', async ({ assert, client }) => {
    await criarLivro({ titulo: 'Dom Casmurro', isbn: '978-85-359-0277-5' })
    await criarLivro({ titulo: 'Vidas Secas', isbn: '978-85-01-09553-8' })
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .get('/livros')
      .qs({ busca: '978-85-01-09553-8' })
      .loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Vidas Secas')
    assert.notInclude(response.text(), 'Dom Casmurro')
  })

  test('filtra os livros pela busca por nome do autor', async ({ assert, client }) => {
    const machado = await criarAutor('Machado de Assis')
    const graciliano = await criarAutor('Graciliano Ramos')
    await criarLivro({ titulo: 'Dom Casmurro', isbn: '978-85-359-0277-5' }, [machado])
    await criarLivro({ titulo: 'Vidas Secas', isbn: '978-85-01-09553-8' }, [graciliano])
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/livros').qs({ busca: 'Graciliano' }).loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Vidas Secas')
    assert.notInclude(response.text(), 'Dom Casmurro')
  })

  test('pagina a listagem em 15 livros por página', async ({ assert, client }) => {
    for (let indice = 1; indice <= 16; indice++) {
      await criarLivro({
        titulo: `Livro Paginado ${String(indice).padStart(2, '0')}`,
      })
    }
    const bibliotecario = await criarBibliotecario()

    const primeiraPagina = await client.get('/livros').loginAs(bibliotecario)
    assert.include(primeiraPagina.text(), 'Livro Paginado 01')
    assert.notInclude(primeiraPagina.text(), 'Livro Paginado 16')

    const segundaPagina = await client.get('/livros').qs({ page: 2 }).loginAs(bibliotecario)
    assert.include(segundaPagina.text(), 'Livro Paginado 16')
  })
})

test.group('LivroController | cadastro', (group) => {
  useDatabase(group)

  test('renderiza o formulário de cadastro com a seleção de autores', async ({ client }) => {
    await criarAutor('Machado de Assis')
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/livros/criar').loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('data-url-autores="/autores"')
    response.assertTextIncludes('action="/livros"')
    response.assertTextIncludes('name="titulo"')
    response.assertTextIncludes('name="isbn"')
    response.assertTextIncludes('name="editora"')
    response.assertTextIncludes('name="anoPublicacao"')
    response.assertTextIncludes('name="autores[]"')
    response.assertTextIncludes('Cadastrar autor')
    response.assertTextIncludes('Machado de Assis')
  })

  test('cadastra um livro com dados válidos e múltiplos autores', async ({ assert, client }) => {
    const machado = await criarAutor('Machado de Assis')
    const assis = await criarAutor('Joaquim Maria Machado de Assis')
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/livros')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ ...dadosLivro, autores: [machado.id, assis.id] })

    response.assertStatus(302)
    response.assertHeader('location', '/livros')

    const livro = await Livro.findByOrFail('isbn', dadosLivro.isbn)
    await livro.load('autores')

    assert.equal(livro.titulo, dadosLivro.titulo)
    assert.equal(livro.editora, dadosLivro.editora)
    assert.equal(livro.anoPublicacao, dadosLivro.anoPublicacao)
    assert.sameMembers(
      livro.autores.map((autor) => autor.id),
      [machado.id, assis.id]
    )
  })

  test('cadastra um livro sem autores', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/livros')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form(dadosLivro)

    response.assertStatus(302)

    const livro = await Livro.findByOrFail('isbn', dadosLivro.isbn)
    await livro.load('autores')
    assert.lengthOf(livro.autores, 0)
  })

  test('grava campos opcionais vazios como nulos', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/livros')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({
        titulo: 'Livro sem dados opcionais',
        isbn: '',
        editora: '',
        anoPublicacao: '',
      })

    response.assertStatus(302)

    const livro = await Livro.findByOrFail('titulo', 'Livro sem dados opcionais')
    assert.isNull(livro.isbn)
    assert.isNull(livro.editora)
    assert.isNull(livro.anoPublicacao)
  })

  test('rejeita o cadastro sem título', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/livros')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/livros/criar')
      .loginAs(bibliotecario)
      .form({ ...dadosLivro, titulo: '' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'titulo')
    assert.lengthOf(await Livro.all(), 0)
  })

  test('rejeita ISBN já cadastrado', async ({ assert, client }) => {
    await criarLivro({ isbn: dadosLivro.isbn })
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/livros')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/livros/criar')
      .loginAs(bibliotecario)
      .form(dadosLivro)

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'isbn')
    assert.lengthOf(await Livro.all(), 1)
  })

  test('rejeita autor inexistente', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/livros')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/livros/criar')
      .loginAs(bibliotecario)
      .form({ ...dadosLivro, autores: [999999] })

    response.assertStatus(302)

    const erros = response.flashMessage('inputErrorsBag') as Record<string, string[]>
    assert.isTrue(Object.keys(erros).some((campo) => campo.startsWith('autores')))
    assert.lengthOf(await Livro.all(), 0)
  })
})

test.group('LivroController | edição', (group) => {
  useDatabase(group)

  test('renderiza o formulário preenchido com os dados e autores do livro', async ({ client }) => {
    const autor = await criarAutor('Machado de Assis')
    const livro = await criarLivro(dadosLivro, [autor])
    const bibliotecario = await criarBibliotecario()

    const response = await client.get(`/livros/${livro.id}/editar`).loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes(`value="${livro.titulo}"`)
    response.assertTextIncludes(`value="${livro.isbn}"`)
    response.assertTextIncludes(`name="autores[]" value="${autor.id}"`)
  })

  test('atualiza os dados do livro e sincroniza os autores', async ({ assert, client }) => {
    const autorAntigo = await criarAutor('Autor Antigo')
    const autorNovo = await criarAutor('Autor Novo')
    const livro = await criarLivro(dadosLivro, [autorAntigo])
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .put(`/livros/${livro.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({
        ...dadosLivro,
        titulo: 'Dom Casmurro Atualizado',
        autores: [autorNovo.id],
      })

    response.assertStatus(302)
    response.assertHeader('location', '/livros')

    await livro.refresh()
    await livro.load('autores')

    assert.equal(livro.titulo, 'Dom Casmurro Atualizado')
    assert.sameMembers(
      livro.autores.map((autor) => autor.id),
      [autorNovo.id]
    )
  })

  test('permite remover todos os autores do livro', async ({ assert, client }) => {
    const autor = await criarAutor('Machado de Assis')
    const livro = await criarLivro(dadosLivro, [autor])
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .put(`/livros/${livro.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form(dadosLivro)

    response.assertStatus(302)

    await livro.load('autores')
    assert.lengthOf(livro.autores, 0)
  })

  test('permite manter o próprio ISBN', async ({ assert, client }) => {
    const livro = await criarLivro(dadosLivro)
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .put(`/livros/${livro.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ ...dadosLivro, titulo: 'Título Novo' })

    response.assertStatus(302)

    await livro.refresh()
    assert.equal(livro.titulo, 'Título Novo')
    assert.equal(livro.isbn, dadosLivro.isbn)
  })

  test('rejeita o ISBN de outro livro', async ({ assert, client }) => {
    const livro = await criarLivro(dadosLivro)
    await criarLivro({ titulo: 'Outro Livro', isbn: '978-85-01-09553-8' })
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .put(`/livros/${livro.id}`)
      .withCsrfToken()
      .redirects(0)
      .header('referer', `/livros/${livro.id}/editar`)
      .loginAs(bibliotecario)
      .form({ ...dadosLivro, isbn: '978-85-01-09553-8' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'isbn')

    await livro.refresh()
    assert.equal(livro.isbn, dadosLivro.isbn)
  })

  test('retorna 404 ao editar um livro inexistente', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/livros/9999/editar').loginAs(bibliotecario)

    response.assertStatus(404)
  })
})
