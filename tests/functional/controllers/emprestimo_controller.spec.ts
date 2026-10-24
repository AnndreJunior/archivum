import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Aluno from '#models/aluno'
import Bibliotecario from '#models/bibliotecario'
import Emprestimo from '#models/emprestimo'
import Exemplar from '#models/exemplar'
import Livro from '#models/livro'
import EmprestimoService from '#services/emprestimo_service'
import { useDatabase } from '#tests/helpers/database'

/**
 * Dia atual usado como referência nos cenários que dependem de prazo.
 */
const HOJE = DateTime.now().startOf('day')

/**
 * Dados base do bibliotecário usado nos testes HTTP dos empréstimos.
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
 * Dados base de aluno. Matrícula e e-mail são gerados para permitir criar
 * vários alunos no mesmo teste sem colidir com as restrições de unicidade.
 */
const dadosAluno = {
  nome: 'Ana Beatriz Souza',
  anoEscolar: 6,
  turma: 'A',
  nivel: 'fundamental',
  telefone: '(11) 90000-0001',
  ativo: true,
}

/**
 * Sequências usadas para gerar matrículas, códigos e títulos únicos.
 */
let sequenciaAluno = 0
let sequenciaExemplar = 0
let sequenciaLivro = 0

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
  sequenciaAluno += 1
  const sufixo = String(sequenciaAluno).padStart(3, '0')

  return Aluno.create({
    ...dadosAluno,
    matricula: `2026F${sufixo}`,
    email: `aluno${sufixo}@escola.test`,
    ...overrides,
  })
}

/**
 * Cria um livro no banco.
 */
async function criarLivro(overrides: Partial<{ titulo: string; isbn: string | null }> = {}) {
  sequenciaLivro += 1

  return Livro.create({
    titulo: `Livro de Teste ${sequenciaLivro}`,
    isbn: null,
    editora: null,
    anoPublicacao: null,
    ...overrides,
  })
}

/**
 * Cria um exemplar vinculado a um livro, disponível por padrão.
 */
async function criarExemplar(
  livro: Livro,
  overrides: Partial<{ codigo: string; situacao: string }> = {}
) {
  sequenciaExemplar += 1

  return Exemplar.create({
    livroId: livro.id,
    codigo: `EX-${String(sequenciaExemplar).padStart(4, '0')}`,
    situacao: 'disponivel',
    ...overrides,
  })
}

type DadosEmprestimo = {
  aluno: Aluno
  exemplar: Exemplar
  bibliotecario: Bibliotecario
  dataRetirada?: DateTime
  dataPrevistaDevolucao?: DateTime
  dataDevolucao?: DateTime | null
  renovacoes?: number
  status?: string
}

/**
 * Registra um empréstimo diretamente no banco, sem passar pelas regras do
 * service, para montar os cenários de listagem e de erro.
 */
async function criarEmprestimo({
  aluno,
  exemplar,
  bibliotecario,
  dataRetirada = HOJE.minus({ days: 5 }),
  dataPrevistaDevolucao = HOJE.plus({ days: 10 }),
  dataDevolucao = null,
  renovacoes = 0,
  status = 'ativo',
}: DadosEmprestimo) {
  return Emprestimo.create({
    alunoId: aluno.id,
    exemplarId: exemplar.id,
    bibliotecarioRetiradaId: bibliotecario.id,
    dataRetirada,
    dataPrevistaDevolucao,
    dataDevolucao,
    renovacoes,
    status,
  })
}

test.group('EmprestimoController | acesso', (group) => {
  useDatabase(group)

  test('redireciona o visitante não autenticado para o login', async ({ client }) => {
    const response = await client.get('/emprestimos').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/auth/login')
  })

  test('permite a listagem para o bibliotecário autenticado', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/emprestimos').loginAs(bibliotecario)

    response.assertStatus(200)
  })
})

test.group('EmprestimoController | listagem', (group) => {
  useDatabase(group)

  test('lista os empréstimos com aluno, exemplar, livro e status', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno({ nome: 'Ana Beatriz Souza' })
    const livro = await criarLivro({ titulo: 'Dom Casmurro' })
    const exemplar = await criarExemplar(livro, { codigo: 'EX-0001' })
    await criarEmprestimo({ aluno, exemplar, bibliotecario })

    const response = await client.get('/emprestimos').loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Ana Beatriz Souza')
    response.assertTextIncludes(aluno.matricula)
    response.assertTextIncludes('EX-0001')
    response.assertTextIncludes('Dom Casmurro')
    response.assertTextIncludes('Ativo')
  })

  test('filtra os empréstimos pela busca por nome do aluno', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const ana = await criarAluno({ nome: 'Ana Beatriz Souza' })
    const bruno = await criarAluno({ nome: 'Bruno Henrique Lima' })
    const livro = await criarLivro()

    await criarEmprestimo({
      aluno: ana,
      exemplar: await criarExemplar(livro),
      bibliotecario,
    })
    await criarEmprestimo({
      aluno: bruno,
      exemplar: await criarExemplar(livro),
      bibliotecario,
    })

    const response = await client.get('/emprestimos').qs({ busca: 'Bruno' }).loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Bruno Henrique Lima')
    assert.notInclude(response.text(), 'Ana Beatriz Souza')
  })

  test('filtra os empréstimos pela busca por código do exemplar', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const domCasmurro = await criarLivro({ titulo: 'Dom Casmurro' })
    const vidasSecas = await criarLivro({ titulo: 'Vidas Secas' })
    const aluno = await criarAluno()

    await criarEmprestimo({
      aluno,
      exemplar: await criarExemplar(domCasmurro, { codigo: 'EX-0001' }),
      bibliotecario,
    })
    await criarEmprestimo({
      aluno: await criarAluno(),
      exemplar: await criarExemplar(vidasSecas, { codigo: 'EX-0002' }),
      bibliotecario,
    })

    const response = await client
      .get('/emprestimos')
      .qs({ busca: 'EX-0002' })
      .loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('EX-0002')
    response.assertTextIncludes('Vidas Secas')
    assert.notInclude(response.text(), 'EX-0001')
  })

  test('filtra os empréstimos pela busca por título do livro', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const domCasmurro = await criarLivro({ titulo: 'Dom Casmurro' })
    const vidasSecas = await criarLivro({ titulo: 'Vidas Secas' })
    const aluno = await criarAluno({ nome: 'Ana Beatriz Souza' })

    await criarEmprestimo({
      aluno,
      exemplar: await criarExemplar(domCasmurro),
      bibliotecario,
    })
    await criarEmprestimo({
      aluno: await criarAluno({ nome: 'Bruno Henrique Lima' }),
      exemplar: await criarExemplar(vidasSecas),
      bibliotecario,
    })

    const response = await client
      .get('/emprestimos')
      .qs({ busca: 'Vidas Secas' })
      .loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Vidas Secas')
    assert.notInclude(response.text(), 'Dom Casmurro')
  })

  test('filtra somente os empréstimos ativos', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const livro = await criarLivro()
    const ativo = await criarAluno({ nome: 'Aluno Ativo' })
    const devolvido = await criarAluno({ nome: 'Aluno Devolvido' })

    await criarEmprestimo({
      aluno: ativo,
      exemplar: await criarExemplar(livro),
      bibliotecario,
    })
    await criarEmprestimo({
      aluno: devolvido,
      exemplar: await criarExemplar(livro),
      bibliotecario,
      status: 'devolvido',
      dataDevolucao: HOJE.minus({ days: 1 }),
    })

    const response = await client.get('/emprestimos').qs({ status: 'ativo' }).loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Aluno Ativo')
    assert.notInclude(response.text(), 'Aluno Devolvido')
  })

  test('filtra somente os empréstimos devolvidos', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const livro = await criarLivro()
    const ativo = await criarAluno({ nome: 'Aluno Ativo' })
    const devolvido = await criarAluno({ nome: 'Aluno Devolvido' })

    await criarEmprestimo({
      aluno: ativo,
      exemplar: await criarExemplar(livro),
      bibliotecario,
    })
    await criarEmprestimo({
      aluno: devolvido,
      exemplar: await criarExemplar(livro),
      bibliotecario,
      status: 'devolvido',
      dataDevolucao: HOJE.minus({ days: 1 }),
    })

    const response = await client
      .get('/emprestimos')
      .qs({ status: 'devolvido' })
      .loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Aluno Devolvido')
    assert.notInclude(response.text(), 'Aluno Ativo')
  })

  test('filtra somente os empréstimos vencidos e em aberto', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const livro = await criarLivro()
    const vencido = await criarAluno({ nome: 'Aluno Vencido' })
    const emDia = await criarAluno({ nome: 'Aluno Em Dia' })
    const devolvidoComAtraso = await criarAluno({ nome: 'Aluno Devolvido Com Atraso' })

    await criarEmprestimo({
      aluno: vencido,
      exemplar: await criarExemplar(livro),
      bibliotecario,
      dataPrevistaDevolucao: HOJE.minus({ days: 2 }),
    })
    await criarEmprestimo({
      aluno: emDia,
      exemplar: await criarExemplar(livro),
      bibliotecario,
      dataPrevistaDevolucao: HOJE.plus({ days: 2 }),
    })
    await criarEmprestimo({
      aluno: devolvidoComAtraso,
      exemplar: await criarExemplar(livro),
      bibliotecario,
      dataPrevistaDevolucao: HOJE.minus({ days: 3 }),
      dataDevolucao: HOJE.minus({ days: 1 }),
      status: 'devolvido',
    })

    const response = await client
      .get('/emprestimos')
      .qs({ status: 'vencido' })
      .loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Aluno Vencido')
    assert.notInclude(response.text(), 'Aluno Em Dia')
    assert.notInclude(response.text(), 'Aluno Devolvido Com Atraso')
  })

  test('não considera vencido o empréstimo que vence hoje', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const livro = await criarLivro()
    const aluno = await criarAluno({ nome: 'Aluno Vence Hoje' })

    await criarEmprestimo({
      aluno,
      exemplar: await criarExemplar(livro),
      bibliotecario,
      dataPrevistaDevolucao: HOJE,
    })

    const response = await client
      .get('/emprestimos')
      .qs({ status: 'vencido' })
      .loginAs(bibliotecario)

    response.assertStatus(200)
    assert.notInclude(response.text(), 'Aluno Vence Hoje')
  })

  test('pagina a listagem em 15 empréstimos por página', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const livro = await criarLivro()

    for (let indice = 1; indice <= 16; indice++) {
      const aluno = await criarAluno({
        nome: `Aluno Paginado ${String(indice).padStart(2, '0')}`,
      })

      await criarEmprestimo({
        aluno,
        exemplar: await criarExemplar(livro),
        bibliotecario,
      })
    }

    const primeiraPagina = await client.get('/emprestimos').loginAs(bibliotecario)
    assert.include(primeiraPagina.text(), 'Aluno Paginado 16')
    assert.notInclude(primeiraPagina.text(), 'Aluno Paginado 01')

    const segundaPagina = await client.get('/emprestimos').qs({ page: 2 }).loginAs(bibliotecario)
    assert.include(segundaPagina.text(), 'Aluno Paginado 01')
  })
})

test.group('EmprestimoController | cadastro', (group) => {
  useDatabase(group)

  test('renderiza o formulário com os seletores de aluno e exemplar', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno({ nome: 'Ana Beatriz Souza' })
    const livro = await criarLivro({ titulo: 'Dom Casmurro' })
    const exemplar = await criarExemplar(livro, { codigo: 'EX-0001' })

    const response = await client.get('/emprestimos/criar').loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('action="/emprestimos"')
    response.assertTextIncludes('name="alunoId"')
    response.assertTextIncludes('name="exemplarId"')
    response.assertTextIncludes('Selecionar aluno')
    response.assertTextIncludes('Selecionar exemplar')
    response.assertTextIncludes(aluno.nome)
    response.assertTextIncludes(aluno.matricula)
    response.assertTextIncludes(exemplar.codigo)
    response.assertTextIncludes(livro.titulo)
  })

  test('não oferece alunos inativos nem exemplares indisponíveis', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    await criarAluno({ nome: 'Aluno Inativo', ativo: false })
    const livro = await criarLivro({ titulo: 'Livro Emprestado' })
    await criarExemplar(livro, { codigo: 'EX-INDISPONIVEL', situacao: 'emprestado' })

    const response = await client.get('/emprestimos/criar').loginAs(bibliotecario)

    response.assertStatus(200)
    assert.notInclude(response.text(), 'Aluno Inativo')
    assert.notInclude(response.text(), 'EX-INDISPONIVEL')
  })

  test('registra um empréstimo com dados válidos', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const livro = await criarLivro()
    const exemplar = await criarExemplar(livro)

    const response = await client
      .post('/emprestimos')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ alunoId: aluno.id, exemplarId: exemplar.id })

    response.assertStatus(302)
    response.assertHeader('location', '/emprestimos')
    assert.equal(response.flashMessage('sucesso'), 'Empréstimo registrado com sucesso.')

    const emprestimo = await Emprestimo.firstOrFail()
    assert.equal(emprestimo.alunoId, aluno.id)
    assert.equal(emprestimo.exemplarId, exemplar.id)
    assert.equal(emprestimo.bibliotecarioRetiradaId, bibliotecario.id)
    assert.equal(emprestimo.status, 'ativo')
    assert.equal(emprestimo.renovacoes, 0)
    assert.isNull(emprestimo.dataDevolucao)
    assert.equal(emprestimo.dataRetirada.toISODate(), HOJE.toISODate())
    assert.equal(
      emprestimo.dataPrevistaDevolucao.toISODate(),
      EmprestimoService.calcularDataPrevistaDevolucao(HOJE).toISODate()
    )

    await exemplar.refresh()
    assert.equal(exemplar.situacao, 'emprestado')
  })

  test('rejeita o cadastro sem aluno ou exemplar', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/emprestimos')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/emprestimos/criar')
      .loginAs(bibliotecario)
      .form({})

    response.assertStatus(302)

    const erros = response.flashMessage('inputErrorsBag')
    assert.property(erros, 'alunoId')
    assert.property(erros, 'exemplarId')
    assert.lengthOf(await Emprestimo.all(), 0)
  })

  test('rejeita aluno ou exemplar inexistente', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/emprestimos')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/emprestimos/criar')
      .loginAs(bibliotecario)
      .form({ alunoId: 999999, exemplarId: 999999 })

    response.assertStatus(302)

    const erros = response.flashMessage('inputErrorsBag')
    assert.property(erros, 'alunoId')
    assert.property(erros, 'exemplarId')
    assert.lengthOf(await Emprestimo.all(), 0)
  })

  test('não registra empréstimo para aluno inativo', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno({ ativo: false })
    const livro = await criarLivro()
    const exemplar = await criarExemplar(livro)

    const response = await client
      .post('/emprestimos')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ alunoId: aluno.id, exemplarId: exemplar.id })

    response.assertStatus(302)
    response.assertHeader('location', '/emprestimos/criar')
    assert.equal(response.flashMessage('erro'), 'Aluno inativo não pode realizar empréstimos')
    assert.lengthOf(await Emprestimo.all(), 0)

    await exemplar.refresh()
    assert.equal(exemplar.situacao, 'disponivel')
  })

  test('não registra empréstimo de exemplar indisponível', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const livro = await criarLivro()
    const exemplar = await criarExemplar(livro, { situacao: 'emprestado' })

    const response = await client
      .post('/emprestimos')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ alunoId: aluno.id, exemplarId: exemplar.id })

    response.assertStatus(302)
    response.assertHeader('location', '/emprestimos/criar')
    assert.equal(response.flashMessage('erro'), 'Exemplar indisponível para empréstimo')
    assert.lengthOf(await Emprestimo.all(), 0)
  })

  test('não registra empréstimo para aluno bloqueado por atraso', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const livro = await criarLivro()

    await criarEmprestimo({
      aluno,
      exemplar: await criarExemplar(livro),
      bibliotecario,
      dataPrevistaDevolucao: HOJE.minus({ days: 1 }),
    })

    const exemplar = await criarExemplar(livro)

    const response = await client
      .post('/emprestimos')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ alunoId: aluno.id, exemplarId: exemplar.id })

    response.assertStatus(302)
    response.assertHeader('location', '/emprestimos/criar')
    assert.equal(response.flashMessage('erro'), 'Aluno bloqueado por atraso na devolução')
    assert.lengthOf(await Emprestimo.all(), 1)

    await exemplar.refresh()
    assert.equal(exemplar.situacao, 'disponivel')
  })

  test('não registra o quarto empréstimo ativo do aluno', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const livro = await criarLivro()

    for (let indice = 0; indice < 3; indice++) {
      await criarEmprestimo({
        aluno,
        exemplar: await criarExemplar(livro),
        bibliotecario,
      })
    }

    const exemplar = await criarExemplar(livro)

    const response = await client
      .post('/emprestimos')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ alunoId: aluno.id, exemplarId: exemplar.id })

    response.assertStatus(302)
    response.assertHeader('location', '/emprestimos/criar')
    assert.equal(response.flashMessage('erro'), 'Aluno já possui o limite de 3 empréstimos ativos')
    assert.lengthOf(await Emprestimo.all(), 3)

    await exemplar.refresh()
    assert.equal(exemplar.situacao, 'disponivel')
  })
})

test.group('EmprestimoController | renovação', (group) => {
  useDatabase(group)

  test('renova um empréstimo ativo e avança o prazo', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const livro = await criarLivro()
    const emprestimo = await criarEmprestimo({
      aluno,
      exemplar: await criarExemplar(livro),
      bibliotecario,
      dataPrevistaDevolucao: HOJE.plus({ days: 5 }),
    })
    const prazoAnterior = emprestimo.dataPrevistaDevolucao

    const response = await client
      .post(`/emprestimos/${emprestimo.id}/renovar`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)

    response.assertStatus(302)
    response.assertHeader('location', '/emprestimos')
    assert.equal(response.flashMessage('sucesso'), 'Empréstimo renovado com sucesso.')

    await emprestimo.refresh()
    assert.equal(emprestimo.renovacoes, 1)
    assert.equal(emprestimo.status, 'ativo')
    assert.equal(
      emprestimo.dataPrevistaDevolucao.toISODate(),
      EmprestimoService.calcularDataPrevistaDevolucao(prazoAnterior).toISODate()
    )
  })

  test('não renova empréstimo já devolvido', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const livro = await criarLivro()
    const emprestimo = await criarEmprestimo({
      aluno,
      exemplar: await criarExemplar(livro),
      bibliotecario,
      dataPrevistaDevolucao: HOJE.plus({ days: 5 }),
      dataDevolucao: HOJE.minus({ days: 1 }),
      status: 'devolvido',
    })
    const prazoAnterior = emprestimo.dataPrevistaDevolucao

    const response = await client
      .post(`/emprestimos/${emprestimo.id}/renovar`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)

    response.assertStatus(302)
    response.assertHeader('location', '/emprestimos')
    assert.equal(response.flashMessage('erro'), 'Empréstimo não está ativo')

    await emprestimo.refresh()
    assert.equal(emprestimo.renovacoes, 0)
    assert.equal(emprestimo.dataPrevistaDevolucao.toISODate(), prazoAnterior.toISODate())
  })

  test('não renova empréstimo vencido', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const livro = await criarLivro()
    const emprestimo = await criarEmprestimo({
      aluno,
      exemplar: await criarExemplar(livro),
      bibliotecario,
      dataPrevistaDevolucao: HOJE.minus({ days: 2 }),
    })
    const prazoAnterior = emprestimo.dataPrevistaDevolucao

    const response = await client
      .post(`/emprestimos/${emprestimo.id}/renovar`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)

    response.assertStatus(302)
    response.assertHeader('location', '/emprestimos')
    assert.equal(response.flashMessage('erro'), 'Empréstimo vencido não pode ser renovado')

    await emprestimo.refresh()
    assert.equal(emprestimo.renovacoes, 0)
    assert.equal(emprestimo.dataPrevistaDevolucao.toISODate(), prazoAnterior.toISODate())
  })

  test('retorna 404 ao renovar um empréstimo inexistente', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/emprestimos/9999/renovar')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)

    response.assertStatus(404)
  })
})

test.group('EmprestimoController | devolução', (group) => {
  useDatabase(group)

  test('registra a devolução e devolve o exemplar ao acervo', async ({ assert, client }) => {
    const bibliotecarioRetirada = await criarBibliotecario()
    const bibliotecarioDevolucao = await criarBibliotecario({
      matricula: 'BIB002',
      email: 'bib2@archivum.test',
    })
    const aluno = await criarAluno()
    const livro = await criarLivro()
    const exemplar = await criarExemplar(livro)
    const emprestimo = await criarEmprestimo({
      aluno,
      exemplar,
      bibliotecario: bibliotecarioRetirada,
      dataRetirada: HOJE.minus({ days: 10 }),
      dataPrevistaDevolucao: HOJE.plus({ days: 5 }),
    })

    await exemplar.refresh()
    exemplar.situacao = 'emprestado'
    await exemplar.save()

    const response = await client
      .post(`/emprestimos/${emprestimo.id}/devolver`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecarioDevolucao)

    response.assertStatus(302)
    response.assertHeader('location', '/emprestimos')
    assert.equal(response.flashMessage('sucesso'), 'Devolução registrada com sucesso.')

    await emprestimo.refresh()
    assert.equal(emprestimo.status, 'devolvido')
    assert.equal(emprestimo.dataDevolucao?.toISODate(), HOJE.toISODate())
    assert.equal(emprestimo.bibliotecarioRetiradaId, bibliotecarioRetirada.id)
    assert.equal(emprestimo.bibliotecarioDevolucaoId, bibliotecarioDevolucao.id)

    await exemplar.refresh()
    assert.equal(exemplar.situacao, 'disponivel')
  })

  test('não devolve empréstimo já devolvido', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const livro = await criarLivro()
    const emprestimo = await criarEmprestimo({
      aluno,
      exemplar: await criarExemplar(livro),
      bibliotecario,
      dataPrevistaDevolucao: HOJE.plus({ days: 5 }),
      dataDevolucao: HOJE.minus({ days: 1 }),
      status: 'devolvido',
    })

    const response = await client
      .post(`/emprestimos/${emprestimo.id}/devolver`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)

    response.assertStatus(302)
    response.assertHeader('location', '/emprestimos')
    assert.equal(response.flashMessage('erro'), 'Empréstimo não está ativo')

    await emprestimo.refresh()
    assert.equal(emprestimo.status, 'devolvido')
    assert.equal(emprestimo.dataDevolucao?.toISODate(), HOJE.minus({ days: 1 }).toISODate())
  })

  test('retorna 404 ao devolver um empréstimo inexistente', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/emprestimos/9999/devolver')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)

    response.assertStatus(404)
  })
})
