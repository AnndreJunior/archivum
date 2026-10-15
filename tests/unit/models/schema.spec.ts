import { test } from '@japa/runner'
import Bibliotecario from '#models/bibliotecario'
import Aluno from '#models/aluno'
import Autor from '#models/autor'
import Livro from '#models/livro'
import Exemplar from '#models/exemplar'
import Emprestimo from '#models/emprestimo'

test.group('Models | mapeamento de tabelas', () => {
  test('cada model aponta para a tabela em português no singular', ({ assert }) => {
    assert.equal(Bibliotecario.table, 'bibliotecario')
    assert.equal(Aluno.table, 'aluno')
    assert.equal(Autor.table, 'autor')
    assert.equal(Livro.table, 'livro')
    assert.equal(Exemplar.table, 'exemplar')
    assert.equal(Emprestimo.table, 'emprestimo')
  })

  test('os enums de domínio expõem os valores esperados', ({ assert }) => {
    assert.deepEqual(Bibliotecario.roles, ['admin', 'bibliotecario'])
    assert.deepEqual(Aluno.niveis, ['fundamental', 'medio'])
    assert.deepEqual(Exemplar.situacoes, ['disponivel', 'emprestado', 'extraviado', 'danificado'])
    assert.deepEqual(Emprestimo.statuses, ['ativo', 'devolvido'])
  })
})

test.group('Models | relações', () => {
  test('as relações estão declaradas nos models', ({ assert }) => {
    assert.isTrue(Bibliotecario.$relationsDefinitions.has('emprestimosRegistrados'))
    assert.isTrue(Bibliotecario.$relationsDefinitions.has('emprestimosRecebidos'))
    assert.isTrue(Aluno.$relationsDefinitions.has('emprestimos'))
    assert.isTrue(Autor.$relationsDefinitions.has('livros'))
    assert.isTrue(Livro.$relationsDefinitions.has('autores'))
    assert.isTrue(Livro.$relationsDefinitions.has('exemplares'))
    assert.isTrue(Exemplar.$relationsDefinitions.has('livro'))
    assert.isTrue(Exemplar.$relationsDefinitions.has('emprestimos'))
    assert.isTrue(Emprestimo.$relationsDefinitions.has('exemplar'))
    assert.isTrue(Emprestimo.$relationsDefinitions.has('aluno'))
    assert.isTrue(Emprestimo.$relationsDefinitions.has('bibliotecarioRetirada'))
    assert.isTrue(Emprestimo.$relationsDefinitions.has('bibliotecarioDevolucao'))
  })
})
