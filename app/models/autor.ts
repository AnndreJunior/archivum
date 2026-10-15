import { manyToMany } from '@adonisjs/lucid/orm'
import { AutorSchema } from '#database/schema'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Livro from '#models/livro'

/**
 * Autor de uma ou mais obras (`livro`).
 */
export default class Autor extends AutorSchema {
  static table = 'autor'

  @manyToMany(() => Livro, { pivotTable: 'autor_livro' })
  declare livros: ManyToMany<typeof Livro>
}
