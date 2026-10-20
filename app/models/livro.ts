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

  /**
   * Formata um ISBN de 13 dígitos no padrão 978-85-359-0277-5 (3-2-3-4-1).
   * Valores não reconhecidos voltam como vieram; vazio/nulo continuam nulos.
   */
  static formatarIsbn(isbn: string | null): string | null {
    if (!isbn) {
      return null
    }

    const digitos = isbn.replace(/\D/g, '')

    if (digitos.length !== 13) {
      return isbn
    }

    return [
      digitos.slice(0, 3),
      digitos.slice(3, 5),
      digitos.slice(5, 8),
      digitos.slice(8, 12),
      digitos.slice(12),
    ].join('-')
  }

  @manyToMany(() => Autor, { pivotTable: 'autor_livro' })
  declare autores: ManyToMany<typeof Autor>

  @hasMany(() => Exemplar)
  declare exemplares: HasMany<typeof Exemplar>
}
