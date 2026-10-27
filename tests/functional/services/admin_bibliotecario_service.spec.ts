import { test } from '@japa/runner'
import Bibliotecario from '#models/bibliotecario'
import { useDatabase } from '#tests/helpers/database'
import { garantirAdminBibliotecario } from '#services/admin_bibliotecario_service'

/**
 * Credenciais usadas nos testes. Em produção elas vêm das variáveis de
 * ambiente `ADMIN_*`; o serviço recebe os dados por parâmetro para ficar
 * testável.
 */
const dadosAdmin = {
  nome: 'Administrador do Sistema',
  matricula: 'ADM001',
  email: 'admin@archivum.test',
  senha: 'senha-secreta-123',
}

test.group('Admin | bibliotecário admin no startup', (group) => {
  useDatabase(group)

  test('cadastra o bibliotecário admin quando ele não existe', async ({ assert }) => {
    const resultado = await garantirAdminBibliotecario(dadosAdmin)

    assert.isTrue(resultado.criado)

    const admin = await Bibliotecario.findByOrFail('email', dadosAdmin.email)
    assert.equal(admin.role, 'admin')
    assert.equal(admin.nome, dadosAdmin.nome)
    assert.equal(admin.matricula, dadosAdmin.matricula)
    assert.isTrue(admin.ativo)
    assert.isTrue(await admin.verifyPassword(dadosAdmin.senha))
  })

  test('guarda a senha com hash, nunca em texto puro', async ({ assert }) => {
    await garantirAdminBibliotecario(dadosAdmin)

    const admin = await Bibliotecario.findByOrFail('email', dadosAdmin.email)
    assert.notEqual(admin.senha, dadosAdmin.senha)
  })

  test('não cria um novo admin quando já existe um', async ({ assert }) => {
    const primeiro = await garantirAdminBibliotecario(dadosAdmin)

    const segundo = await garantirAdminBibliotecario({
      ...dadosAdmin,
      nome: 'Outro Administrador',
      matricula: 'ADM002',
      email: 'outro-admin@archivum.test',
    })

    assert.isFalse(segundo.criado)
    assert.equal(segundo.bibliotecario.id, primeiro.bibliotecario.id)
    assert.lengthOf(await Bibliotecario.all(), 1)
  })

  test('não sobrescreve as credenciais de um admin já cadastrado', async ({ assert }) => {
    await garantirAdminBibliotecario(dadosAdmin)

    await garantirAdminBibliotecario({
      ...dadosAdmin,
      nome: 'Nome Alterado',
      senha: 'outra-senha-456',
    })

    const admin = await Bibliotecario.findByOrFail('email', dadosAdmin.email)
    assert.equal(admin.nome, dadosAdmin.nome)
    assert.isTrue(await admin.verifyPassword(dadosAdmin.senha))
  })

  test('ignora bibliotecário comum e cadastra o admin quando não existe admin', async ({
    assert,
  }) => {
    await Bibliotecario.create({
      nome: 'Bibliotecário Comum',
      matricula: 'BIB001',
      email: 'comum@archivum.test',
      senha: 'senha-comum-123',
      role: 'bibliotecario',
    })

    const resultado = await garantirAdminBibliotecario(dadosAdmin)

    assert.isTrue(resultado.criado)
    assert.lengthOf(await Bibliotecario.query().where('role', 'admin'), 1)
    assert.lengthOf(await Bibliotecario.all(), 2)
  })
})
