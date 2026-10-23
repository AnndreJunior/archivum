import { Exception } from '@adonisjs/core/exceptions'

/**
 * Aluno bloqueado por atraso em empréstimo anterior.
 */
export default class AlunoBloqueadoException extends Exception {
  static status = 400
  static code = 'E_ALUNO_BLOQUEADO'
  static message = 'Aluno bloqueado por atraso na devolução'
}
