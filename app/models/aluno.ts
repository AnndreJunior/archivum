import { hasMany } from '@adonisjs/lucid/orm'
import { AlunoSchema } from '#database/schema'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Emprestimo from '#models/emprestimo'

/**
 * Aluno: registro da biblioteca escolar. Não possui login, conta nem reserva;
 * os empréstimos são sempre registrados por um bibliotecário.
 */
export default class Aluno extends AlunoSchema {
  static table = 'aluno'

  static readonly niveis = ['fundamental', 'medio'] as const

  @hasMany(() => Emprestimo)
  declare emprestimos: HasMany<typeof Emprestimo>
}
