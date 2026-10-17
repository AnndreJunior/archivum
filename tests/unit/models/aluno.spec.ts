import { test } from '@japa/runner'
import Aluno from '#models/aluno'

test.group('Aluno | telefoneFormatado', () => {
  test('formata um celular de 11 dígitos no padrão (XX) 9XXXX-XXXX', ({ assert }) => {
    const aluno = new Aluno().merge({ telefone: '11912345678' })

    assert.equal(aluno.telefoneFormatado, '(11) 91234-5678')
  })

  test('mantém um número já formatado', ({ assert }) => {
    const aluno = new Aluno().merge({ telefone: '(11) 90000-0001' })

    assert.equal(aluno.telefoneFormatado, '(11) 90000-0001')
  })

  test('formata um telefone fixo de 10 dígitos no padrão (XX) XXXX-XXXX', ({ assert }) => {
    const aluno = new Aluno().merge({ telefone: '1134567890' })

    assert.equal(aluno.telefoneFormatado, '(11) 3456-7890')
  })

  test('devolve string vazia quando o telefone é nulo', ({ assert }) => {
    const aluno = new Aluno().merge({ telefone: null })

    assert.equal(aluno.telefoneFormatado, '')
  })

  test('devolve o valor original quando não reconhece o formato', ({ assert }) => {
    const aluno = new Aluno().merge({ telefone: '123' })

    assert.equal(aluno.telefoneFormatado, '123')
  })
})
