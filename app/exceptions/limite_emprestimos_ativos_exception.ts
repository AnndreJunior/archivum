import { Exception } from '@adonisjs/core/exceptions'

/**
 * Aluno já atingiu o limite de empréstimos ativos simultâneos.
 */
export default class LimiteEmprestimosAtivosException extends Exception {
  static status = 400
  static code = 'E_LIMITE_EMPRESTIMOS_ATIVOS'
  static message = 'Aluno já possui o limite de 3 empréstimos ativos'
}
