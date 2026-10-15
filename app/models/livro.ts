import { hasMany, manyToMany } from '@adonisjs/lucid/orm'
import { LivroSchema } from '#database/schema'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Autor from '#models/autor'
import Exemplar from '#models/exemplar'

/**
 * Livro: a obra (título). As cópias físicas emprestáveis são os `exemplar`.
 */
export default class Livro extends LivroSchema {
  static table = 'livro'

  @manyToMany(() => Autor, { pivotTable: 'autor_livro' })
  declare autores: ManyToMany<typeof Autor>

  @hasMany(() => Exemplar)
  declare exemplares: HasMany<typeof Exemplar>
}
