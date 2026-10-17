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

  /**
   * Telefone pronto para exibição, no padrão (XX) 9XXXX-XXXX.
   */
  get telefoneFormatado(): string {
    return Aluno.formatarTelefone(this.telefone) ?? ''
  }

  /**
   * Normaliza um telefone para o padrão brasileiro: (XX) 9XXXX-XXXX para
   * celulares (11 dígitos) e (XX) XXXX-XXXX para fixos (10 dígitos). Valores
   * não reconhecidos voltam como vieram; vazio/nulo continuam nulos.
   */
  static formatarTelefone(telefone: string | null): string | null {
    if (!telefone) {
      return null
    }

    const digitos = telefone.replace(/\D/g, '')

    if (digitos.length === 11) {
      return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
    }

    if (digitos.length === 10) {
      return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
    }

    return telefone
  }
}
