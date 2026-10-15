import { test } from '@japa/runner'
import Aluno from '#models/aluno'
import { useDatabase } from '#tests/helpers/database'

test.group('Helpers | banco de dados', (group) => {
  useDatabase(group)

  test('conecta ao banco do container e persiste registros', async ({ assert }) => {
    const aluno = await Aluno.create({
      nome: 'Ana Souza',
      matricula: '2024001',
      anoEscolar: 5,
      turma: 'A',
      nivel: 'fundamental',
    })

    assert.isNotNull(aluno.id)
    assert.lengthOf(await Aluno.all(), 1)
  })

  test('limpa o banco a cada teste', async ({ assert }) => {
    assert.lengthOf(await Aluno.all(), 0)
  })
})

test.group('Helpers | banco de dados por grupo', (group) => {
  useDatabase(group)

  test('sobe um container novo e vazio para cada grupo', async ({ assert }) => {
    assert.lengthOf(await Aluno.all(), 0)
  })
})
