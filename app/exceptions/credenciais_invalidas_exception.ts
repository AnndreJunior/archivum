import { Exception } from '@adonisjs/core/exceptions'

/**
 * Credenciais inválidas no login de bibliotecário.
 *
 * Usada tanto para e-mail/senha incorretos quanto para conta inativa, de forma
 * a não revelar se um determinado e-mail existe no sistema.
 */
export default class CredenciaisInvalidasException extends Exception {
  static status = 400
  static code = 'E_CREDENCIAIS_INVALIDAS'
  static message = 'Credenciais inválidas'
}
