import { Exception } from '@adonisjs/core/exceptions'

/**
 * Operação permitida apenas em empréstimo com `status = 'ativo'`.
 */
export default class EmprestimoNaoAtivoException extends Exception {
  static status = 400
  static code = 'E_EMPRESTIMO_NAO_ATIVO'
  static message = 'Empréstimo não está ativo'
}
