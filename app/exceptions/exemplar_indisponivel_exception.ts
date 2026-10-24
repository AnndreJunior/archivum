import { Exception } from '@adonisjs/core/exceptions'

/**
 * Exemplar que não está disponível para um novo empréstimo.
 */
export default class ExemplarIndisponivelException extends Exception {
  static status = 400
  static code = 'E_EXEMPLAR_INDISPONIVEL'
  static message = 'Exemplar indisponível para empréstimo'
}
