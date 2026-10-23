import { Exception } from '@adonisjs/core/exceptions'

/**
 * Empréstimo vencido não pode ser renovado; o exemplar precisa ser devolvido.
 */
export default class EmprestimoVencidoException extends Exception {
  static status = 400
  static code = 'E_EMPRESTIMO_VENCIDO'
  static message = 'Empréstimo vencido não pode ser renovado'
}
