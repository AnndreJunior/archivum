import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Bibliotecario from '#models/bibliotecario'
import RecuperacaoSenha from '#models/recuperacao_senha'
import RecuperacaoSenhaService from '#services/recuperacao_senha_service'
import TokenRedefinicaoInvalidoException from '#exceptions/token_redefinicao_invalido_exception'
import { useDatabase } from '#tests/helpers/database'
import { getMessageHtml, useMail, waitForMessages } from '#tests/helpers/mail'

/**
 * Dados base do bibliotecário usado nos testes de recuperação de senha.
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

test.group('RecuperacaoSenhaService | geração de token', (group) => {
  useDatabase(group)

  const service = new RecuperacaoSenhaService()

  test('gera um token e persiste apenas o seu hash com validade de 5 minutos', async ({
    assert,
  }) => {
    const bibliotecario = await criarBibliotecario()

    const token = await service.gerarToken(bibliotecario)
    const [registro] = await RecuperacaoSenha.all()

    assert.isNotEmpty(token)
    assert.equal(registro.bibliotecarioId, bibliotecario.id)
    assert.notEqual(registro.tokenHash, token)

    const minutosRestantes = registro.expiresAt.diffNow('minutes').minutes
    assert.isAbove(minutosRestantes, 4)
    assert.isAtMost(minutosRestantes, 5)
  })

  test('revoga os tokens anteriores ao gerar um novo', async ({ assert }) => {
    const bibliotecario = await criarBibliotecario()

    await service.gerarToken(bibliotecario)
    await service.gerarToken(bibliotecario)

    assert.lengthOf(await RecuperacaoSenha.all(), 1)
  })

  test('valida o token dentro do prazo e rejeita um token inexistente', async ({ assert }) => {
    const bibliotecario = await criarBibliotecario()

    const token = await service.gerarToken(bibliotecario)

    assert.isTrue(await service.validarToken(token))
    assert.isFalse(await service.validarToken('token-que-nao-existe'))
  })

  test('rejeita um token já expirado', async ({ assert }) => {
    const bibliotecario = await criarBibliotecario()
    const token = await service.gerarToken(bibliotecario)

    const registro = await RecuperacaoSenha.query().firstOrFail()
    registro.expiresAt = DateTime.now().minus({ minutes: 1 })
    await registro.save()

    assert.isFalse(await service.validarToken(token))
  })
})

test.group('RecuperacaoSenhaService | solicitação por e-mail', (group) => {
  useDatabase(group)
  useMail(group)

  const service = new RecuperacaoSenhaService()

  test('envia o link de redefinição para o bibliotecário ativo', async ({ assert }) => {
    const bibliotecario = await criarBibliotecario()

    await service.solicitarRedefinicao(bibliotecario.email)
    const mensagens = await waitForMessages()
    const [mensagem] = mensagens

    assert.lengthOf(mensagens, 1)
    assert.equal(mensagem.subject, 'Redefinição de senha — Archivum')
    assert.deepEqual(mensagem.to, [bibliotecario.email])

    const html = await getMessageHtml(mensagem.id)
    assert.include(html, '/auth/trocar-senha?token=')
    assert.lengthOf(await RecuperacaoSenha.all(), 1)
  })

  test('não envia nada para um e-mail inexistente', async ({ assert }) => {
    await service.solicitarRedefinicao('fantasma@archivum.test')

    assert.lengthOf(await waitForMessages(1, 500), 0)
    assert.lengthOf(await RecuperacaoSenha.all(), 0)
  })

  test('não envia nada para uma conta inativa', async ({ assert }) => {
    const bibliotecario = await criarBibliotecario({ ativo: false })

    await service.solicitarRedefinicao(bibliotecario.email)

    assert.lengthOf(await waitForMessages(1, 500), 0)
    assert.lengthOf(await RecuperacaoSenha.all(), 0)
  })
})

test.group('RecuperacaoSenhaService | redefinição de senha', (group) => {
  useDatabase(group)

  const service = new RecuperacaoSenhaService()

  test('troca a senha e invalida o token', async ({ assert }) => {
    const bibliotecario = await criarBibliotecario()
    const token = await service.gerarToken(bibliotecario)

    await service.redefinirSenha({ token, senha: 'nova-senha-123' })

    const autenticado = await Bibliotecario.verifyCredentials(bibliotecario.email, 'nova-senha-123')
    assert.equal(autenticado.id, bibliotecario.id)
    assert.lengthOf(await RecuperacaoSenha.all(), 0)
  })

  test('lança TokenRedefinicaoInvalidoException para um token inexistente', async ({ assert }) => {
    await criarBibliotecario()

    await assert.rejects(
      () => service.redefinirSenha({ token: 'token-que-nao-existe', senha: 'nova-senha-123' }),
      TokenRedefinicaoInvalidoException
    )
  })

  test('lança TokenRedefinicaoInvalidoException para um token expirado', async ({ assert }) => {
    const bibliotecario = await criarBibliotecario()
    const token = await service.gerarToken(bibliotecario)

    const registro = await RecuperacaoSenha.query().firstOrFail()
    registro.expiresAt = DateTime.now().minus({ minutes: 1 })
    await registro.save()

    await assert.rejects(
      () => service.redefinirSenha({ token, senha: 'nova-senha-123' }),
      TokenRedefinicaoInvalidoException
    )
  })

  test('lança TokenRedefinicaoInvalidoException para um token já utilizado', async ({ assert }) => {
    const bibliotecario = await criarBibliotecario()
    const token = await service.gerarToken(bibliotecario)

    await service.redefinirSenha({ token, senha: 'nova-senha-123' })

    await assert.rejects(
      () => service.redefinirSenha({ token, senha: 'outra-senha-123' }),
      TokenRedefinicaoInvalidoException
    )
  })
})
