import { test } from '@japa/runner'
import Bibliotecario from '#models/bibliotecario'
import RecuperacaoSenhaService from '#services/recuperacao_senha_service'
import { useDatabase } from '#tests/helpers/database'

/**
 * Dados base do administrador usado nas sessões autenticadas.
 */
const dadosAdmin = {
  nome: 'Administrador do Sistema',
  matricula: 'ADM001',
  email: 'admin@archivum.test',
  senha: 'senha-secreta-123',
  role: 'admin',
  ativo: true,
}

/**
 * Dados base de um bibliotecário comum criado diretamente no banco.
 */
const dadosBibliotecario = {
  nome: 'Bibliotecário de Teste',
  matricula: 'BIB001',
  email: 'bib@archivum.test',
  senha: 'senha-secreta-123',
  role: 'bibliotecario',
  ativo: true,
}

/**
 * Dados enviados pelo formulário de cadastro (sem senha, que é gerada).
 */
const dadosFormulario = {
  nome: 'Maria Silva Santos',
  matricula: 'BIB002',
  email: 'maria.santos@archivum.test',
  role: 'bibliotecario',
}

/**
 * Cria o administrador que opera as rotas de bibliotecários.
 */
async function criarAdmin(overrides: Partial<typeof dadosAdmin> = {}) {
  return Bibliotecario.create({ ...dadosAdmin, ...overrides })
}

/**
 * Cria um bibliotecário comum no banco.
 */
async function criarBibliotecario(overrides: Partial<typeof dadosBibliotecario> = {}) {
  return Bibliotecario.create({ ...dadosBibliotecario, ...overrides })
}

test.group('BibliotecarioController | acesso', (group) => {
  useDatabase(group)

  test('redireciona o visitante não autenticado para o login', async ({ client }) => {
    const response = await client.get('/bibliotecarios').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/auth/login')
  })

  test('bloqueia o bibliotecário comum na listagem', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/bibliotecarios').loginAs(bibliotecario)

    response.assertStatus(403)
  })

  test('bloqueia o bibliotecário comum na página de cadastro', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/bibliotecarios/criar').loginAs(bibliotecario)

    response.assertStatus(403)
  })

  test('bloqueia o bibliotecário comum no cadastro', async ({ assert, client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .post('/bibliotecarios')
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form(dadosFormulario)

    response.assertStatus(403)
    assert.lengthOf(await Bibliotecario.all(), 1)
  })

  test('bloqueia o bibliotecário comum na edição', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .put(`/bibliotecarios/${bibliotecario.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)
      .form(dadosFormulario)

    response.assertStatus(403)
  })

  test('bloqueia o bibliotecário comum na ativação', async ({ client }) => {
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .patch(`/bibliotecarios/${bibliotecario.id}/ativo`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(bibliotecario)

    response.assertStatus(403)
  })

  test('permite a listagem para o administrador', async ({ client }) => {
    const admin = await criarAdmin()
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/bibliotecarios').loginAs(admin)

    response.assertStatus(200)
    response.assertTextIncludes(bibliotecario.nome)
  })

  test('mostra o link de bibliotecários na navegação apenas para administradores', async ({
    assert,
    client,
  }) => {
    const admin = await criarAdmin()
    const bibliotecario = await criarBibliotecario()

    const respostaAdmin = await client.get('/').loginAs(admin)
    const respostaComum = await client.get('/').loginAs(bibliotecario)

    respostaAdmin.assertTextIncludes('href="/bibliotecarios"')
    assert.notInclude(respostaComum.text(), 'href="/bibliotecarios"')
  })
})

test.group('BibliotecarioController | listagem', (group) => {
  useDatabase(group)

  test('lista os bibliotecários cadastrados', async ({ client }) => {
    const admin = await criarAdmin()
    const bibliotecario = await criarBibliotecario()

    const response = await client.get('/bibliotecarios').loginAs(admin)

    response.assertStatus(200)
    response.assertTextIncludes(bibliotecario.nome)
    response.assertTextIncludes(bibliotecario.matricula)
    response.assertTextIncludes(bibliotecario.email)
    response.assertTextIncludes('Administrador')
  })

  test('filtra os bibliotecários pela busca por nome', async ({ assert, client }) => {
    const admin = await criarAdmin()
    await criarBibliotecario({ nome: 'Maria Silva Santos', matricula: 'BIB001' })
    await criarBibliotecario({
      nome: 'João Pereira Lima',
      matricula: 'BIB002',
      email: 'joao.lima@archivum.test',
    })

    const response = await client.get('/bibliotecarios').qs({ busca: 'João' }).loginAs(admin)

    response.assertStatus(200)
    response.assertTextIncludes('João Pereira Lima')
    assert.notInclude(response.text(), 'Maria Silva Santos')
  })

  test('filtra os bibliotecários pela busca por matrícula', async ({ assert, client }) => {
    const admin = await criarAdmin()
    await criarBibliotecario({ nome: 'Maria Silva Santos', matricula: 'BIB001' })
    await criarBibliotecario({
      nome: 'João Pereira Lima',
      matricula: 'BIB002',
      email: 'joao.lima@archivum.test',
    })

    const response = await client.get('/bibliotecarios').qs({ busca: 'BIB002' }).loginAs(admin)

    response.assertStatus(200)
    response.assertTextIncludes('João Pereira Lima')
    assert.notInclude(response.text(), 'Maria Silva Santos')
  })

  test('filtra os bibliotecários pela busca por e-mail', async ({ assert, client }) => {
    const admin = await criarAdmin()
    await criarBibliotecario({ nome: 'Maria Silva Santos', matricula: 'BIB001' })
    await criarBibliotecario({
      nome: 'João Pereira Lima',
      matricula: 'BIB002',
      email: 'joao.lima@archivum.test',
    })

    const response = await client
      .get('/bibliotecarios')
      .qs({ busca: 'joao.lima@archivum.test' })
      .loginAs(admin)

    response.assertStatus(200)
    response.assertTextIncludes('João Pereira Lima')
    assert.notInclude(response.text(), 'Maria Silva Santos')
  })

  test('pagina a listagem em 15 bibliotecários por página', async ({ assert, client }) => {
    const admin = await criarAdmin()

    for (let indice = 1; indice <= 16; indice++) {
      await criarBibliotecario({
        nome: `Bibliotecário Paginado ${String(indice).padStart(2, '0')}`,
        matricula: `BP${String(indice).padStart(4, '0')}`,
        email: `paginado${indice}@archivum.test`,
      })
    }

    const primeiraPagina = await client.get('/bibliotecarios').loginAs(admin)
    assert.include(primeiraPagina.text(), 'Bibliotecário Paginado 01')
    assert.notInclude(primeiraPagina.text(), 'Bibliotecário Paginado 16')

    const segundaPagina = await client.get('/bibliotecarios').qs({ page: 2 }).loginAs(admin)
    assert.include(segundaPagina.text(), 'Bibliotecário Paginado 16')
  })
})

test.group('BibliotecarioController | cadastro', (group) => {
  useDatabase(group)

  test('renderiza o formulário de cadastro', async ({ client }) => {
    const admin = await criarAdmin()

    const response = await client.get('/bibliotecarios/criar').loginAs(admin)

    response.assertStatus(200)
    response.assertTextIncludes('action="/bibliotecarios"')
    response.assertTextIncludes('name="nome"')
    response.assertTextIncludes('name="matricula"')
    response.assertTextIncludes('name="email"')
    response.assertTextIncludes('name="role"')
    response.assertTextIncludes('value="bibliotecario"')
    response.assertTextIncludes('value="admin"')
    response.assertTextIncludes('Esqueci minha senha')
  })

  test('cadastra um bibliotecário com dados válidos', async ({ assert, client }) => {
    const admin = await criarAdmin()

    const response = await client
      .post('/bibliotecarios')
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)
      .form(dadosFormulario)

    response.assertStatus(302)
    response.assertHeader('location', '/bibliotecarios/criar')

    const bibliotecario = await Bibliotecario.findByOrFail('email', dadosFormulario.email)
    assert.equal(bibliotecario.nome, dadosFormulario.nome)
    assert.equal(bibliotecario.matricula, dadosFormulario.matricula)
    assert.equal(bibliotecario.role, 'bibliotecario')
    assert.isTrue(bibliotecario.ativo)
    assert.match(bibliotecario.senha, /^\$scrypt\$/)
  })

  test('cadastra outro administrador', async ({ assert, client }) => {
    const admin = await criarAdmin()

    const response = await client
      .post('/bibliotecarios')
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)
      .form({ ...dadosFormulario, role: 'admin' })

    response.assertStatus(302)

    const bibliotecario = await Bibliotecario.findByOrFail('email', dadosFormulario.email)
    assert.equal(bibliotecario.role, 'admin')
    assert.isTrue(bibliotecario.isAdmin)
  })

  test('rejeita o cadastro sem os campos obrigatórios', async ({ assert, client }) => {
    const admin = await criarAdmin()

    const response = await client
      .post('/bibliotecarios')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/bibliotecarios/criar')
      .loginAs(admin)
      .form({})

    response.assertStatus(302)

    const erros = response.flashMessage('inputErrorsBag')
    assert.property(erros, 'nome')
    assert.property(erros, 'matricula')
    assert.property(erros, 'email')
    assert.property(erros, 'role')
    assert.lengthOf(await Bibliotecario.all(), 1)
  })

  test('rejeita uma role inválida', async ({ assert, client }) => {
    const admin = await criarAdmin()

    const response = await client
      .post('/bibliotecarios')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/bibliotecarios/criar')
      .loginAs(admin)
      .form({ ...dadosFormulario, role: 'superadmin' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'role')
    assert.lengthOf(await Bibliotecario.all(), 1)
  })

  test('rejeita matrícula fora do tamanho de 6 caracteres', async ({ assert, client }) => {
    const admin = await criarAdmin()

    const response = await client
      .post('/bibliotecarios')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/bibliotecarios/criar')
      .loginAs(admin)
      .form({ ...dadosFormulario, matricula: 'BIB01' })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'matricula')
    assert.lengthOf(await Bibliotecario.all(), 1)
  })

  test('rejeita matrícula já cadastrada', async ({ assert, client }) => {
    const admin = await criarAdmin()
    await criarBibliotecario()

    const response = await client
      .post('/bibliotecarios')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/bibliotecarios/criar')
      .loginAs(admin)
      .form({ ...dadosFormulario, matricula: dadosBibliotecario.matricula })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'matricula')
  })

  test('rejeita e-mail já cadastrado', async ({ assert, client }) => {
    const admin = await criarAdmin()
    await criarBibliotecario()

    const response = await client
      .post('/bibliotecarios')
      .withCsrfToken()
      .redirects(0)
      .header('referer', '/bibliotecarios/criar')
      .loginAs(admin)
      .form({ ...dadosFormulario, email: dadosBibliotecario.email })

    response.assertStatus(302)
    assert.property(response.flashMessage('inputErrorsBag'), 'email')
  })

  test('ignora a senha enviada no formulário', async ({ assert, client }) => {
    const admin = await criarAdmin()

    const response = await client
      .post('/bibliotecarios')
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)
      .form({ ...dadosFormulario, senha: 'senha-fornecida-123' })

    response.assertStatus(302)

    const bibliotecario = await Bibliotecario.findByOrFail('email', dadosFormulario.email)
    assert.isFalse(await bibliotecario.verifyPassword('senha-fornecida-123'))
    assert.match(bibliotecario.senha, /^\$scrypt\$/)
  })

  test('permite que o cadastrado defina a senha pelo esqueci a senha', async ({
    assert,
    client,
  }) => {
    const admin = await criarAdmin()

    await client
      .post('/bibliotecarios')
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)
      .form(dadosFormulario)

    const bibliotecario = await Bibliotecario.findByOrFail('email', dadosFormulario.email)
    const token = await new RecuperacaoSenhaService().gerarToken(bibliotecario)

    const response = await client
      .post('/auth/trocar-senha')
      .withCsrfToken()
      .redirects(0)
      .form({ token, senha: 'nova-senha-123', senhaConfirmation: 'nova-senha-123' })

    response.assertStatus(302)

    const autenticado = await Bibliotecario.verifyCredentials(bibliotecario.email, 'nova-senha-123')
    assert.equal(autenticado.id, bibliotecario.id)
  })
})

test.group('BibliotecarioController | edição', (group) => {
  useDatabase(group)

  test('renderiza o formulário preenchido com os dados do bibliotecário', async ({ client }) => {
    const admin = await criarAdmin()
    const bibliotecario = await criarBibliotecario()

    const response = await client.get(`/bibliotecarios/${bibliotecario.id}/editar`).loginAs(admin)

    response.assertStatus(200)
    response.assertTextIncludes(`action="/bibliotecarios/${bibliotecario.id}`)
    response.assertTextIncludes(`value="${bibliotecario.nome}"`)
    response.assertTextIncludes(`value="${bibliotecario.matricula}"`)
    response.assertTextIncludes(`value="${bibliotecario.email}"`)
    response.assertTextIncludes('value="bibliotecario" selected')
  })

  test('atualiza os dados cadastrais e a role', async ({ assert, client }) => {
    const admin = await criarAdmin()
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .put(`/bibliotecarios/${bibliotecario.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)
      .form({
        nome: 'Bibliotecário Atualizado',
        matricula: 'BIB009',
        email: 'atualizado@archivum.test',
        role: 'admin',
      })

    response.assertStatus(302)
    response.assertHeader('location', '/bibliotecarios')

    const persistido = await Bibliotecario.findOrFail(bibliotecario.id)
    assert.equal(persistido.nome, 'Bibliotecário Atualizado')
    assert.equal(persistido.matricula, 'BIB009')
    assert.equal(persistido.email, 'atualizado@archivum.test')
    assert.equal(persistido.role, 'admin')
  })

  test('retorna 404 ao editar um bibliotecário inexistente', async ({ client }) => {
    const admin = await criarAdmin()

    const response = await client.get('/bibliotecarios/9999/editar').loginAs(admin)

    response.assertStatus(404)
  })

  test('ignora o próprio registro na checagem de unicidade', async ({ assert, client }) => {
    const admin = await criarAdmin()
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .put(`/bibliotecarios/${bibliotecario.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)
      .form({
        nome: 'Bibliotecário Renomeado',
        matricula: bibliotecario.matricula,
        email: bibliotecario.email,
        role: bibliotecario.role,
      })

    response.assertStatus(302)

    const persistido = await Bibliotecario.findOrFail(bibliotecario.id)
    assert.equal(persistido.nome, 'Bibliotecário Renomeado')
  })

  test('rejeita matrícula ou e-mail de outro bibliotecário', async ({ assert, client }) => {
    const admin = await criarAdmin()
    const bibliotecario = await criarBibliotecario()
    const outro = await criarBibliotecario({
      nome: 'Outro Bibliotecário',
      matricula: 'BIB003',
      email: 'outro@archivum.test',
    })

    const response = await client
      .put(`/bibliotecarios/${bibliotecario.id}`)
      .withCsrfToken()
      .redirects(0)
      .header('referer', `/bibliotecarios/${bibliotecario.id}/editar`)
      .loginAs(admin)
      .form({
        nome: bibliotecario.nome,
        matricula: outro.matricula,
        email: outro.email,
        role: bibliotecario.role,
      })

    response.assertStatus(302)

    const erros = response.flashMessage('inputErrorsBag')
    assert.property(erros, 'matricula')
    assert.property(erros, 'email')
  })

  test('impede o administrador de alterar a própria role', async ({ assert, client }) => {
    const admin = await criarAdmin()

    const response = await client
      .put(`/bibliotecarios/${admin.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)
      .form({
        nome: admin.nome,
        matricula: admin.matricula,
        email: admin.email,
        role: 'bibliotecario',
      })

    response.assertStatus(302)
    response.assertHeader('location', `/bibliotecarios/${admin.id}/editar`)
    response.assertFlashMessage('erro', 'Você não pode alterar a própria role.')

    await admin.refresh()
    assert.equal(admin.role, 'admin')
  })

  test('não altera a senha ao atualizar os dados', async ({ assert, client }) => {
    const admin = await criarAdmin()
    const bibliotecario = await criarBibliotecario()

    await client
      .put(`/bibliotecarios/${bibliotecario.id}`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)
      .form({
        nome: 'Bibliotecário Renomeado',
        matricula: bibliotecario.matricula,
        email: bibliotecario.email,
        role: bibliotecario.role,
      })

    await bibliotecario.refresh()
    assert.isTrue(await bibliotecario.verifyPassword(dadosBibliotecario.senha))
  })
})

test.group('BibliotecarioController | ativação', (group) => {
  useDatabase(group)

  test('o admin desativa outro bibliotecário', async ({ assert, client }) => {
    const admin = await criarAdmin()
    const bibliotecario = await criarBibliotecario()

    const response = await client
      .patch(`/bibliotecarios/${bibliotecario.id}/ativo`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)

    response.assertStatus(302)
    response.assertHeader('location', '/bibliotecarios')

    await bibliotecario.refresh()
    assert.isFalse(bibliotecario.ativo)
  })

  test('o admin reativa um bibliotecário inativo', async ({ assert, client }) => {
    const admin = await criarAdmin()
    const bibliotecario = await criarBibliotecario({ ativo: false })

    const response = await client
      .patch(`/bibliotecarios/${bibliotecario.id}/ativo`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)

    response.assertStatus(302)

    await bibliotecario.refresh()
    assert.isTrue(bibliotecario.ativo)
  })

  test('impede o administrador de desativar a si mesmo', async ({ assert, client }) => {
    const admin = await criarAdmin()

    const response = await client
      .patch(`/bibliotecarios/${admin.id}/ativo`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)

    response.assertStatus(302)
    response.assertHeader('location', '/bibliotecarios')
    response.assertFlashMessage('erro', 'Você não pode desativar o próprio usuário.')

    await admin.refresh()
    assert.isTrue(admin.ativo)
  })

  test('retorna 404 ao alternar um bibliotecário inexistente', async ({ client }) => {
    const admin = await criarAdmin()

    const response = await client
      .patch('/bibliotecarios/9999/ativo')
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)

    response.assertStatus(404)
  })

  test('o bibliotecário desativado não consegue autenticar', async ({ client }) => {
    const admin = await criarAdmin()
    const bibliotecario = await criarBibliotecario()

    await client
      .patch(`/bibliotecarios/${bibliotecario.id}/ativo`)
      .withCsrfToken()
      .redirects(0)
      .loginAs(admin)

    const response = await client
      .post('/auth/login')
      .withCsrfToken()
      .redirects(0)
      .form({ email: bibliotecario.email, senha: dadosBibliotecario.senha })

    response.assertStatus(302)
    response.assertHeader('location', '/auth/login')
    response.assertFlashMessage('loginError', 'Credenciais inválidas')
  })
})
