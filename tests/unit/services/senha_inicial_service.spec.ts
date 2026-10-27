import { test } from '@japa/runner'
import { gerarSenhaAleatoria } from '#services/senha_inicial_service'

test.group('Senha inicial | geração', () => {
  test('gera senhas aleatórias e distintas', ({ assert }) => {
    const primeira = gerarSenhaAleatoria()
    const segunda = gerarSenhaAleatoria()

    assert.notEqual(primeira, segunda)
  })

  test('gera uma senha no formato base64url com 43 caracteres', ({ assert }) => {
    assert.match(gerarSenhaAleatoria(), /^[A-Za-z0-9_-]{43}$/)
  })
})
