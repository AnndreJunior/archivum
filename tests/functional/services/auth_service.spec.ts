import { test } from '@japa/runner'
import Bibliotecario from '#models/bibliotecario'
import AuthService from '#services/auth_service'
import CredenciaisInvalidasException from '#exceptions/credenciais_invalidas_exception'
import { useDatabase } from '#tests/helpers/database'

/**
 * Dados base do bibliotecário usado nos testes de login. Cada teste sobrescreve
 * apenas o que precisa.
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

/**
 * Executa `fn` e devolve o erro lançado, falhando caso nada seja lançado.
 */
async function capturarErro(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (error) {
    return error
  }

  throw new Error('Esperava que a operação lançasse um erro, mas ela foi concluída')
}

test.group('AuthService | login de bibliotecário', (group) => {
  useDatabase(group)

  const authService = new AuthService()

  test('autentica e devolve o bibliotecário com credenciais válidas', async ({ assert }) => {
    const bibliotecario = await criarBibliotecario()

    const autenticado = await authService.verificarCredenciais({
      email: dadosBibliotecario.email,
      senha: dadosBibliotecario.senha,
    })

    assert.equal(autenticado.id, bibliotecario.id)
    assert.equal(autenticado.email, dadosBibliotecario.email)
  })

  test('lança CredenciaisInvalidasException quando a senha está incorreta', async ({ assert }) => {
    await criarBibliotecario()

    await assert.rejects(
      () =>
        authService.verificarCredenciais({
          email: dadosBibliotecario.email,
          senha: 'senha-errada-000',
        }),
      CredenciaisInvalidasException
    )
  })

  test('lança CredenciaisInvalidasException quando o e-mail não existe', async ({ assert }) => {
    await criarBibliotecario()

    await assert.rejects(
      () =>
        authService.verificarCredenciais({
          email: 'fantasma@archivum.test',
          senha: dadosBibliotecario.senha,
        }),
      CredenciaisInvalidasException
    )
  })

  test('lança CredenciaisInvalidasException quando a conta está inativa', async ({ assert }) => {
    await criarBibliotecario({ ativo: false })

    await assert.rejects(
      () =>
        authService.verificarCredenciais({
          email: dadosBibliotecario.email,
          senha: dadosBibliotecario.senha,
        }),
      CredenciaisInvalidasException
    )
  })

  test('usa o mesmo erro genérico para senha incorreta e e-mail inexistente', async ({
    assert,
  }) => {
    await criarBibliotecario()

    const erroSenhaIncorreta = await capturarErro(() =>
      authService.verificarCredenciais({
        email: dadosBibliotecario.email,
        senha: 'senha-errada-000',
      })
    )
    const erroEmailInexistente = await capturarErro(() =>
      authService.verificarCredenciais({
        email: 'fantasma@archivum.test',
        senha: dadosBibliotecario.senha,
      })
    )

    assert.instanceOf(erroSenhaIncorreta, CredenciaisInvalidasException)
    assert.instanceOf(erroEmailInexistente, CredenciaisInvalidasException)
    assert.equal(
      (erroSenhaIncorreta as CredenciaisInvalidasException).code,
      'E_CREDENCIAIS_INVALIDAS'
    )
    assert.equal(
      (erroEmailInexistente as CredenciaisInvalidasException).code,
      'E_CREDENCIAIS_INVALIDAS'
    )
  })
})
