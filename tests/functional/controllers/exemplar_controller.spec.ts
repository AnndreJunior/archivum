import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Aluno from '#models/aluno'
import Autor from '#models/autor'
import Bibliotecario from '#models/bibliotecario'
import Emprestimo from '#models/emprestimo'
import Exemplar from '#models/exemplar'
import Livro from '#models/livro'
import { useDatabase } from '#tests/helpers/database'

/**
 * Dados base do bibliotecário usado nos testes HTTP do CRUD de exemplares.
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
 * Dados base de um exemplar usado nos testes.
 */
const dadosExemplar = {
  codigo: 'EX-0001',
  situacao: 'disponivel',
}

/**
 * Dados base do aluno necessário para criar um empréstimo.
 */
const dadosAluno = {
  nome: 'Ana Beatriz Souza',
  matricula: '2026F001',
  anoEscolar: 6,
  turma: 'A',
  nivel: 'fundamental',
  email: 'ana.souza@escola.test',
  telefone: '(11) 90000-0001',
  ativo: true,
}

/**
 * Cria um bibliotecário no banco para servir de sessão autenticada.
 */
async function criarBibliotecario(overrides: Partial<typeof dadosBibliotecario> = {}) {
  return Bibliotecario.create({ ...dadosBibliotecario, ...overrides })
}

/**
 * Cria um aluno no banco para os cenários de empréstimo.
 */
async function criarAluno(overrides: Partial<typeof dadosAluno> = {}) {
  return Aluno.create({ ...dadosAluno, ...overrides })
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

/**
 * Cria um exemplar vinculado a um livro.
 */
async function criarExemplar(livro: Livro, overrides: Partial<typeof dadosExemplar> = {}) {
  return Exemplar.create({ livroId: livro.id, ...dadosExemplar, ...overrides })
}

/**
 * Registra um empréstimo vinculado ao exemplar, impedindo a sua exclusão.
 */
async function criarEmprestimo(exemplar: Exemplar, bibliotecario: Bibliotecario, aluno: Aluno) {
  return Emprestimo.create({
    exemplarId: exemplar.id,
    alunoId: aluno.id,
    bibliotecarioRetiradaId: bibliotecario.id,
    dataRetirada: DateTime.fromISO('2026-10-01'),
    dataPrevistaDevolucao: DateTime.fromISO('2026-10-21'),
    renovacoes: 0,
    status: 'ativo',
  })
}

test.group('ExemplarController | acesso', (group) => {
  useDatabase(group)

  test('redireciona o visitante não autenticado para o login', async ({ client }) => {
    const response = await client.get('/exemplares').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/auth/login')
  })

  test('permite a listagem para o bibliotecário autenticado', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/exemplares').loginAs(bibliotecario)

    response.assertStatus(200)
  })
})

test.group('ExemplarController | listagem', (group) => {
  useDatabase(group)

  test('lista os exemplares com o livro, autores e situação', async ({ client }) => {
    const autor = await Autor.create({ nome: 'Machado de Assis' })
    const livro = await criarLivro(dadosLivro, [autor])
    await criarExemplar(livro)
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/exemplares').loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes(dadosExemplar.codigo)
    response.assertTextIncludes(dadosLivro.titulo)
    response.assertTextIncludes('Machado de Assis')
    response.assertTextIncludes('Disponível')
  })

  test('filtra os exemplares pela busca por código', async ({ assert, client }) => {
    const livro = await criarLivro()
    await criarExemplar(livro, { codigo: 'EX-0001' })
    await criarExemplar(livro, { codigo: 'EX-0002' })
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/exemplares').qs({ busca: 'EX-0002' }).loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('EX-0002')
    assert.notInclude(response.text(), 'EX-0001')
  })

  test('filtra os exemplares pela busca por título do livro', async ({ assert, client }) => {
    const domCasmurro = await criarLivro({ titulo: 'Dom Casmurro' })
    const vidasSecas = await criarLivro({ titulo: 'Vidas Secas' })
    await criarExemplar(domCasmurro, { codigo: 'EX-0001' })
    await criarExemplar(vidasSecas, { codigo: 'EX-0002' })
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .get('/exemplares')
      .qs({ busca: 'Casmurro' })
      .loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Dom Casmurro')
    assert.notInclude(response.text(), 'Vidas Secas')
  })

  test('filtra os exemplares pela busca por ISBN do livro', async ({ assert, client }) => {
    const domCasmurro = await criarLivro({
      titulo: 'Dom Casmurro',
      isbn: '978-85-359-0277-5',
    })
    const vidasSecas = await criarLivro({
      titulo: 'Vidas Secas',
      isbn: '978-85-01-09553-8',
    })
    await criarExemplar(domCasmurro, { codigo: 'EX-0001' })
    await criarExemplar(vidasSecas, { codigo: 'EX-0002' })
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .get('/exemplares')
      .qs({ busca: '978-85-01-09553-8' })
      .loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Vidas Secas')
    assert.notInclude(response.text(), 'Dom Casmurro')
  })

  test('filtra os exemplares pela busca por autor do livro', async ({ assert, client }) => {
    const machado = await Autor.create({ nome: 'Machado de Assis' })
    const graciliano = await Autor.create({ nome: 'Graciliano Ramos' })
    const domCasmurro = await criarLivro({ titulo: 'Dom Casmurro' }, [machado])
    const vidasSecas = await criarLivro({ titulo: 'Vidas Secas' }, [graciliano])
    await criarExemplar(domCasmurro, { codigo: 'EX-0001' })
    await criarExemplar(vidasSecas, { codigo: 'EX-0002' })
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .get('/exemplares')
      .qs({ busca: 'Graciliano' })
      .loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Vidas Secas')
    assert.notInclude(response.text(), 'Dom Casmurro')
  })

  test('pagina a listagem em 15 exemplares por página', async ({ assert, client }) => {
    const livro = await criarLivro()

    for (let indice = 1; indice <= 16; indice++) {
      await criarExemplar(livro, {
        codigo: `EX-${String(indice).padStart(4, '0')}`,
      })
    }
    const bibliotecario = await criarBibliotecario()

    const primeiraPagina = await client.get('/exemplares').loginAs(bibliotecario)
    assert.include(primeiraPagina.text(), 'EX-0001')
    assert.notInclude(primeiraPagina.text(), 'EX-0016')

    const segundaPagina = await client.get('/exemplares').qs({ page: 2 }).loginAs(bibliotecario)
    assert.include(segundaPagina.text(), 'EX-0016')
  })
})

test.group('ExemplarController | cadastro', (group) => {
  useDatabase(group)

  test('renderiza o formulário com os livros disponíveis para o modal', async ({ client }) => {
    const autor = await Autor.create({ nome: 'Machado de Assis' })
    await criarLivro(dadosLivro, [autor])
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/exemplares/criar').loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('action="/exemplares"')
    response.assertTextIncludes('name="codigo"')
    response.assertTextIncludes('name="situacao"')
    response.assertTextIncludes('name="livroId"')
    response.assertTextIncludes('Selecionar livro')
    response.assertTextIncludes('Dom Casmurro')
    response.assertTextIncludes('978-85-359-0277-5')
    response.assertTextIncludes('Machado de Assis')
  })

  test('não oferece cadastro de livro dentro do modal de seleção', async ({ assert, client }) => {
    await criarLivro(dadosLivro)
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/exemplares/criar').loginAs(bibliotecario)

    response.assertStatus(200)
    assert.notInclude(response.text(), 'Cadastrar livro')
  })

  test('cadastra um exemplar com dados válidos', async ({ assert, client }) => {
    const livro = await criarLivro(dadosLivro)
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/exemplares')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ livroId: livro.id, ...dadosExemplar })

    response.assertStatus(302)
    response.assertHeader('location', '/exemplares')

    const exemplar = await Exemplar.findByOrFail('codigo', dadosExemplar.codigo)
    assert.equal(exemplar.livroId, livro.id)
    assert.equal(exemplar.situacao, 'disponivel')
  })

  test('normaliza o código removendo espaços nas pontas', async ({ assert, client }) => {
    const livro = await criarLivro()
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/exemplares')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ livroId: livro.id, codigo: '  EX-0001  ', situacao: 'disponivel' })

    response.assertStatus(302)

    const exemplar = await Exemplar.findByOrFail('codigo', 'EX-0001')
    assert.equal(exemplar.codigo, 'EX-0001')
  })

  test('usa a situação disponível quando ela não é informada', async ({ assert, client }) => {
    const livro = await criarLivro()
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/exemplares')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ livroId: livro.id, codigo: 'EX-0001' })

    response.assertStatus(302)

    const exemplar = await Exemplar.findByOrFail('codigo', 'EX-0001')
    assert.equal(exemplar.situacao, 'disponivel')
  })

  test('rejeita o cadastro sem livro ou código', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/exemplares')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/exemplares/criar')
      .loginAs(bibliotecario)
      .form({})

    response.assertStatus(302)

    const erros = response.flashMessage('inputErrorsBag')
    assert.property(erros, 'livroId')
    assert.property(erros, 'codigo')
    assert.lengthOf(await Exemplar.all(), 0)
  })

  test('rejeita um livro inexistente', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/exemplares')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/exemplares/criar')
      .loginAs(bibliotecario)
      .form({ livroId: 999999, ...dadosExemplar })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'livroId')
    assert.lengthOf(await Exemplar.all(), 0)
  })

  test('rejeita um código já cadastrado', async ({ assert, client }) => {
    const livro = await criarLivro()
    await criarExemplar(livro)
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/exemplares')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/exemplares/criar')
      .loginAs(bibliotecario)
      .form({ livroId: livro.id, ...dadosExemplar })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'codigo')
    assert.lengthOf(await Exemplar.all(), 1)
  })

  test('rejeita uma situação inválida', async ({ assert, client }) => {
    const livro = await criarLivro()
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/exemplares')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/exemplares/criar')
      .loginAs(bibliotecario)
      .form({ livroId: livro.id, codigo: 'EX-0001', situacao: 'perdido' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'situacao')
    assert.lengthOf(await Exemplar.all(), 0)
  })
})

test.group('ExemplarController | edição', (group) => {
  useDatabase(group)

  test('renderiza o formulário preenchido com os dados do exemplar', async ({ client }) => {
    const autor = await Autor.create({ nome: 'Machado de Assis' })
    const livro = await criarLivro(dadosLivro, [autor])
    const exemplar = await criarExemplar(livro)
    const bibliotecario = await criarBibliotecario()

    const response = await client.get(`/exemplares/${exemplar.id}/editar`).loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('value="EX-0001"')
    response.assertTextIncludes(`name="livroId" value="${livro.id}"`)
    response.assertTextIncludes('Dom Casmurro')
    response.assertTextIncludes('Machado de Assis')
    response.assertTextIncludes('value="disponivel" selected')
  })

  test('atualiza livro, código e situação do exemplar', async ({ assert, client }) => {
    const livroAntigo = await criarLivro({ titulo: 'Dom Casmurro' })
    const livroNovo = await criarLivro({ titulo: 'Vidas Secas' })
    const exemplar = await criarExemplar(livroAntigo)
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .put(`/exemplares/${exemplar.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({
        livroId: livroNovo.id,
        codigo: 'EX-0002',
        situacao: 'danificado',
      })

    response.assertStatus(302)
    response.assertHeader('location', '/exemplares')

    await exemplar.refresh()
    assert.equal(exemplar.livroId, livroNovo.id)
    assert.equal(exemplar.codigo, 'EX-0002')
    assert.equal(exemplar.situacao, 'danificado')
  })

  test('permite manter o próprio código', async ({ assert, client }) => {
    const livro = await criarLivro()
    const exemplar = await criarExemplar(livro)
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .put(`/exemplares/${exemplar.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ livroId: livro.id, codigo: exemplar.codigo, situacao: 'extraviado' })

    response.assertStatus(302)

    await exemplar.refresh()
    assert.equal(exemplar.codigo, 'EX-0001')
    assert.equal(exemplar.situacao, 'extraviado')
  })

  test('rejeita o código de outro exemplar', async ({ assert, client }) => {
    const livro = await criarLivro()
    const exemplar = await criarExemplar(livro, { codigo: 'EX-0001' })
    await criarExemplar(livro, { codigo: 'EX-0002' })
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .put(`/exemplares/${exemplar.id}`)
      .withCsrfToken()
      .redirects(0)
      .header('referer', `/exemplares/${exemplar.id}/editar`)
      .loginAs(bibliotecario)
      .form({ livroId: livro.id, codigo: 'EX-0002', situacao: 'disponivel' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'codigo')

    await exemplar.refresh()
    assert.equal(exemplar.codigo, 'EX-0001')
  })

  test('retorna 404 ao editar um exemplar inexistente', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/exemplares/9999/editar').loginAs(bibliotecario)

    response.assertStatus(404)
  })
})

test.group('ExemplarController | exclusão', (group) => {
  useDatabase(group)

  test('exclui um exemplar sem empréstimos', async ({ assert, client }) => {
    const livro = await criarLivro()
    const exemplar = await criarExemplar(livro)
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .delete(`/exemplares/${exemplar.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)

    response.assertStatus(302)
    response.assertHeader('location', '/exemplares')
    assert.isNull(await Exemplar.find(exemplar.id))
  })

  test('bloqueia a exclusão quando o exemplar possui empréstimo', async ({ assert, client }) => {
    const livro = await criarLivro()
    const exemplar = await criarExemplar(livro)
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    await criarEmprestimo(exemplar, bibliotecario, aluno)

    const response = await client
      .delete(`/exemplares/${exemplar.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)

    response.assertStatus(302)
    response.assertHeader('location', '/exemplares')
    assert.equal(
      response.flashMessage('erro'),
      'Não é possível excluir um exemplar que possui empréstimos.'
    )
    assert.isNotNull(await Exemplar.find(exemplar.id))
  })

  test('retorna 404 ao excluir um exemplar inexistente', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .delete('/exemplares/9999')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)

    response.assertStatus(404)
  })
})
