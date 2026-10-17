import { test } from '@japa/runner'
import Aluno from '#models/aluno'
import Bibliotecario from '#models/bibliotecario'
import { useDatabase } from '#tests/helpers/database'

/**
 * Dados base do bibliotecário usado nos testes HTTP do CRUD de alunos.
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
 * Dados base do aluno usado nos testes.
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
 * Cria um aluno no banco para os cenários de listagem e edição.
 */
async function criarAluno(overrides: Partial<typeof dadosAluno> = {}) {
  return Aluno.create({ ...dadosAluno, ...overrides })
}

test.group('AlunoController | acesso', (group) => {
  useDatabase(group)

  test('redireciona o visitante não autenticado para o login', async ({ client }) => {
    const response = await client.get('/alunos').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/auth/login')
  })

  test('permite a listagem para o bibliotecário autenticado', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/alunos').loginAs(bibliotecario)

    response.assertStatus(200)
  })
})

test.group('AlunoController | listagem', (group) => {
  useDatabase(group)

  test('lista os alunos cadastrados', async ({ client }) => {
    await criarAluno()
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/alunos').loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes(dadosAluno.nome)
    response.assertTextIncludes(dadosAluno.matricula)
  })

  test('filtra os alunos pela busca por nome', async ({ assert, client }) => {
    await criarAluno({ nome: 'Ana Beatriz Souza', matricula: '2026F001' })
    await criarAluno({ nome: 'Bruno Henrique Lima', matricula: '2026F002' })
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/alunos').qs({ busca: 'Bruno' }).loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Bruno Henrique Lima')
    assert.notInclude(response.text(), 'Ana Beatriz Souza')
  })

  test('filtra os alunos pela busca por matrícula', async ({ assert, client }) => {
    await criarAluno({ nome: 'Ana Beatriz Souza', matricula: '2026F001' })
    await criarAluno({ nome: 'Bruno Henrique Lima', matricula: '2026F002' })
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/alunos').qs({ busca: '2026F002' }).loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('Bruno Henrique Lima')
    assert.notInclude(response.text(), 'Ana Beatriz Souza')
  })

  test('pagina a listagem em 15 alunos por página', async ({ assert, client }) => {
    for (let indice = 1; indice <= 16; indice++) {
      await criarAluno({
        nome: `Aluno Paginado ${String(indice).padStart(2, '0')}`,
        matricula: `2026P${String(indice).padStart(3, '0')}`,
      })
    }
    const bibliotecario = await criarBibliotecario()

    const primeiraPagina = await client.get('/alunos').loginAs(bibliotecario)
    assert.include(primeiraPagina.text(), 'Aluno Paginado 01')
    assert.notInclude(primeiraPagina.text(), 'Aluno Paginado 16')

    const segundaPagina = await client.get('/alunos').qs({ page: 2 }).loginAs(bibliotecario)
    assert.include(segundaPagina.text(), 'Aluno Paginado 16')
  })
})

test.group('AlunoController | cadastro', (group) => {
  useDatabase(group)

  test('renderiza o formulário de cadastro', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/alunos/criar').loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes('action="/alunos"')
    response.assertTextIncludes('name="nome"')
    response.assertTextIncludes('name="matricula"')
    response.assertTextIncludes('name="anoEscolar"')
    response.assertTextIncludes('name="turma"')
  })

  test('cadastra um aluno com dados válidos', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/alunos')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form(dadosAluno)

    response.assertStatus(302)
    response.assertHeader('location', '/alunos')

    const aluno = await Aluno.findByOrFail('matricula', dadosAluno.matricula)
    assert.equal(aluno.nome, dadosAluno.nome)
    assert.equal(aluno.anoEscolar, dadosAluno.anoEscolar)
    assert.equal(aluno.turma, dadosAluno.turma)
    assert.equal(aluno.nivel, dadosAluno.nivel)
    assert.isTrue(aluno.ativo)
  })

  test('normaliza a turma para maiúscula', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/alunos')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ ...dadosAluno, turma: 'b' })

    response.assertStatus(302)

    const aluno = await Aluno.findByOrFail('matricula', dadosAluno.matricula)
    assert.equal(aluno.turma, 'B')
  })

  test('rejeita o cadastro sem os campos obrigatórios', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/alunos')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/alunos/criar')
      .loginAs(bibliotecario)
      .form({})

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'nome')
    assert.property(response.flashMessage('inputErrorsBag'), 'matricula')
    assert.lengthOf(await Aluno.all(), 0)
  })

  test('rejeita matrícula já cadastrada', async ({ assert, client }) => {
    await criarAluno()
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/alunos')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/alunos/criar')
      .loginAs(bibliotecario)
      .form({ ...dadosAluno, nome: 'Outro Nome' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'matricula')
    assert.lengthOf(await Aluno.all(), 1)
  })

  test('rejeita um nível inválido', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/alunos')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/alunos/criar')
      .loginAs(bibliotecario)
      .form({ ...dadosAluno, nivel: 'superior' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'nivel')
    assert.lengthOf(await Aluno.all(), 0)
  })

  test('rejeita um e-mail inválido', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/alunos')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/alunos/criar')
      .loginAs(bibliotecario)
      .form({ ...dadosAluno, email: 'nao-e-email' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'email')
    assert.lengthOf(await Aluno.all(), 0)
  })

  test('aceita e-mail e telefone vazios como nulo', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/alunos')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ ...dadosAluno, email: '', telefone: '' })

    response.assertStatus(302)

    const aluno = await Aluno.findByOrFail('matricula', dadosAluno.matricula)
    assert.isNull(aluno.email)
    assert.isNull(aluno.telefone)
  })
})

test.group('AlunoController | edição', (group) => {
  useDatabase(group)

  test('renderiza o formulário preenchido com os dados do aluno', async ({ client }) => {
    const aluno = await criarAluno()
    const bibliotecario = await criarBibliotecario()

    const response = await client.get(`/alunos/${aluno.id}/editar`).loginAs(bibliotecario)

    response.assertStatus(200)
    response.assertTextIncludes(`value="${aluno.nome}"`)
    response.assertTextIncludes(`value="${aluno.matricula}"`)
  })

  test('atualiza os dados do aluno', async ({ assert, client }) => {
    const aluno = await criarAluno()
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .put(`/alunos/${aluno.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ ...dadosAluno, nome: 'Ana Beatriz Atualizada', anoEscolar: 7 })

    response.assertStatus(302)
    response.assertHeader('location', '/alunos')

    await aluno.refresh()
    assert.equal(aluno.nome, 'Ana Beatriz Atualizada')
    assert.equal(aluno.anoEscolar, 7)
  })

  test('permite manter a própria matrícula', async ({ assert, client }) => {
    const aluno = await criarAluno()
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .put(`/alunos/${aluno.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form({ ...dadosAluno, nome: 'Nome Novo' })

    response.assertStatus(302)

    await aluno.refresh()
    assert.equal(aluno.matricula, dadosAluno.matricula)
  })

  test('rejeita a matrícula de outro aluno', async ({ assert, client }) => {
    const aluno = await criarAluno()
    await criarAluno({ nome: 'Bruno Henrique Lima', matricula: '2026F002' })
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .put(`/alunos/${aluno.id}`)
      .withCsrfToken()
      .redirects(0)
      .header('referer', `/alunos/${aluno.id}/editar`)
      .loginAs(bibliotecario)
      .form({ ...dadosAluno, matricula: '2026F002' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'matricula')
  })

  test('retorna 404 ao editar um aluno inexistente', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/alunos/9999/editar').loginAs(bibliotecario)

    response.assertStatus(404)
  })
})

test.group('AlunoController | ativação', (group) => {
  useDatabase(group)

  test('o admin desativa um aluno', async ({ assert, client }) => {
    const aluno = await criarAluno({ ativo: true })
    const admin = await criarBibliotecario({ role: 'admin' })

    const response = await client
      .patch(`/alunos/${aluno.id}/ativo`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)

    response.assertStatus(302)

    await aluno.refresh()
    assert.isFalse(aluno.ativo)
  })

  test('o admin reativa um aluno', async ({ assert, client }) => {
    const aluno = await criarAluno({ ativo: false })
    const admin = await criarBibliotecario({ role: 'admin' })

    const response = await client
      .patch(`/alunos/${aluno.id}/ativo`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)

    response.assertStatus(302)

    await aluno.refresh()
    assert.isTrue(aluno.ativo)
  })

  test('o bibliotecário comum não pode desativar um aluno', async ({ assert, client }) => {
    const aluno = await criarAluno({ ativo: true })
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .patch(`/alunos/${aluno.id}/ativo`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)

    response.assertStatus(403)

    await aluno.refresh()
    assert.isTrue(aluno.ativo)
  })

  test('retorna 404 ao alternar um aluno inexistente', async ({ client }) => {
    const admin = await criarBibliotecario({ role: 'admin' })

    const response = await client
      .patch('/alunos/9999/ativo')
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)

    response.assertStatus(404)
  })
})
