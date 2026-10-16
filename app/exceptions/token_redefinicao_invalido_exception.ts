import { Exception } from '@adonisjs/core/exceptions'

/**
 * Token de redefinição de senha inexistente, expirado ou já utilizado.
 */
export default class TokenRedefinicaoInvalidoException extends Exception {
  static status = 400
  static code = 'E_TOKEN_REDEFINICAO_INVALIDO'
  static message = 'Link inválido ou expirado'
}
