import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Aluno from '#models/aluno'
import Autor from '#models/autor'
import Livro from '#models/livro'
import Exemplar from '#models/exemplar'
import { useDatabase } from '#tests/helpers/database'

/**
 * Valida os seeders de dados fictícios da biblioteca. Cada teste roda os
 * seeders reais (via `db:seed`) sobre um banco vazio, então as contagens
 * refletem exatamente o que `node ace db:seed` produz.
 */
test.group('Seeders | dados fictícios', (group) => {
  useDatabase(group)

  group.each.setup(async () => {
    await testUtils.db().seed()
  })

  test('cadastra 8 alunos, 4 do fundamental e 4 do médio', async ({ assert }) => {
    const alunos = await Aluno.all()

    assert.lengthOf(alunos, 8)
    assert.lengthOf(
      alunos.filter((aluno) => aluno.nivel === 'fundamental'),
      4
    )
    assert.lengthOf(
      alunos.filter((aluno) => aluno.nivel === 'medio'),
      4
    )
    assert.lengthOf(new Set(alunos.map((aluno) => aluno.matricula)), 8)
  })

  test('preenche os dados obrigatórios de cada aluno', async ({ assert }) => {
    const alunos = await Aluno.all()

    for (const aluno of alunos) {
      assert.isAbove(aluno.nome.length, 0)
      assert.isAbove(aluno.anoEscolar, 0)
      assert.include(['fundamental', 'medio'], aluno.nivel)
      assert.match(aluno.turma, /^[a-zA-Z]$/)
    }
  })

  test('cadastra 5 livros, cada um com 5 exemplares', async ({ assert }) => {
    const livros = await Livro.query().preload('exemplares')

    assert.lengthOf(livros, 5)
    for (const livro of livros) {
      assert.lengthOf(livro.exemplares, 5, `"${livro.titulo}" deveria ter 5 exemplares`)
    }

    assert.lengthOf(await Exemplar.all(), 25)
  })

  test('cadastra 5 autores e associa cada livro ao seu autor', async ({ assert }) => {
    assert.lengthOf(await Autor.all(), 5)

    const livros = await Livro.query().preload('autores')
    for (const livro of livros) {
      assert.lengthOf(livro.autores, 1, `"${livro.titulo}" deveria ter 1 autor`)
    }
  })

  test('marca todos os exemplares como disponíveis e com código único', async ({ assert }) => {
    const exemplares = await Exemplar.all()

    assert.lengthOf(exemplares, 25)
    assert.lengthOf(
      exemplares.filter((exemplar) => exemplar.situacao === 'disponivel'),
      25
    )
    assert.lengthOf(new Set(exemplares.map((exemplar) => exemplar.codigo)), 25)
  })

  test('semear novamente não duplica os dados', async ({ assert }) => {
    await testUtils.db().seed()

    assert.lengthOf(await Aluno.all(), 8)
    assert.lengthOf(await Autor.all(), 5)
    assert.lengthOf(await Livro.all(), 5)
    assert.lengthOf(await Exemplar.all(), 25)
  })
})
