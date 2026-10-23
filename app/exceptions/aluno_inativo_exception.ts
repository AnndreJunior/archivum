import { Exception } from '@adonisjs/core/exceptions'

/**
 * Aluno inativo não pode realizar novos empréstimos.
 */
export default class AlunoInativoException extends Exception {
  static status = 400
  static code = 'E_ALUNO_INATIVO'
  static message = 'Aluno inativo não pode realizar empréstimos'
}
