import { belongsTo } from '@adonisjs/lucid/orm'
import { EmprestimoSchema } from '#database/schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Aluno from '#models/aluno'
import Bibliotecario from '#models/bibliotecario'
import Exemplar from '#models/exemplar'

/**
 * Empréstimo de um `exemplar` para um `aluno`, registrado por um bibliotecário.
 * Guarda também o bibliotecário que recebeu o livro de volta (quando houver devolução).
 */
export default class Emprestimo extends EmprestimoSchema {
  static table = 'emprestimo'

  static readonly statuses = ['ativo', 'devolvido'] as const

  @belongsTo(() => Exemplar)
  declare exemplar: BelongsTo<typeof Exemplar>

  @belongsTo(() => Aluno)
  declare aluno: BelongsTo<typeof Aluno>

  @belongsTo(() => Bibliotecario, { foreignKey: 'bibliotecarioRetiradaId' })
  declare bibliotecarioRetirada: BelongsTo<typeof Bibliotecario>

  @belongsTo(() => Bibliotecario, { foreignKey: 'bibliotecarioDevolucaoId' })
  declare bibliotecarioDevolucao: BelongsTo<typeof Bibliotecario>
}
