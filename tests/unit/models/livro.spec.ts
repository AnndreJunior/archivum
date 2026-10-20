import { test } from '@japa/runner'
import Livro from '#models/livro'

test.group('Livro | formatarIsbn', () => {
  test('formata um ISBN de 13 dígitos no padrão 978-85-359-0277-5', ({ assert }) => {
    assert.equal(Livro.formatarIsbn('9788535902775'), '978-85-359-0277-5')
  })

  test('mantém um ISBN já formatado', ({ assert }) => {
    assert.equal(Livro.formatarIsbn('978-85-359-0277-5'), '978-85-359-0277-5')
  })

  test('ignora espaços e outros separadores ao formatar', ({ assert }) => {
    assert.equal(Livro.formatarIsbn('978 85 359 0277 5'), '978-85-359-0277-5')
  })

  test('devolve o valor original quando não reconhece o formato', ({ assert }) => {
    assert.equal(Livro.formatarIsbn('123'), '123')
  })

  test('devolve nulo quando o ISBN é nulo', ({ assert }) => {
    assert.isNull(Livro.formatarIsbn(null))
  })
})
