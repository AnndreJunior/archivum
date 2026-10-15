import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { ExemplarSchema } from '#database/schema'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Livro from '#models/livro'
import Emprestimo from '#models/emprestimo'

/**
 * Exemplar: cópia física e emprestável de um `livro`.
 */
export default class Exemplar extends ExemplarSchema {
  static table = 'exemplar'

  static readonly situacoes = ['disponivel', 'emprestado', 'extraviado', 'danificado'] as const

  @belongsTo(() => Livro)
  declare livro: BelongsTo<typeof Livro>

  @hasMany(() => Emprestimo)
  declare emprestimos: HasMany<typeof Emprestimo>
}
