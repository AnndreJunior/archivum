import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { hasMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { BibliotecarioSchema } from '#database/schema'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Emprestimo from '#models/emprestimo'

/**
 * Bibliotecário: usuário que opera o sistema.
 * Substitui o antigo model `User` do scaffold e adiciona autenticação via
 * withAuthFinder (login por e-mail e senha).
 */
export default class Bibliotecario extends compose(
  BibliotecarioSchema,
  withAuthFinder(hash, {
    uids: ['email'],
    passwordColumnName: 'senha',
  })
) {
  static table = 'bibliotecario'

  static readonly roles = ['admin', 'bibliotecario'] as const

  @hasMany(() => Emprestimo, { foreignKey: 'bibliotecarioRetiradaId' })
  declare emprestimosRegistrados: HasMany<typeof Emprestimo>

  @hasMany(() => Emprestimo, { foreignKey: 'bibliotecarioDevolucaoId' })
  declare emprestimosRecebidos: HasMany<typeof Emprestimo>

  get isAdmin() {
    return this.role === 'admin'
  }

  /**
   * Iniciais do bibliotecário a partir do nome.
   */
  get initials() {
    const [first, last] = this.nome.split(' ')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return first.slice(0, 2).toUpperCase()
  }
}
