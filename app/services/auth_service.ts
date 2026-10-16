import { errors } from '@adonisjs/auth'
import Bibliotecario from '#models/bibliotecario'
import CredenciaisInvalidasException from '#exceptions/credenciais_invalidas_exception'

/**
 * Credenciais informadas no login. Espera-se que já tenham passado pelo
 * `loginValidator` antes de chegar ao service.
 */
export type CredenciaisLogin = {
  email: string
  senha: string
}

/**
 * Autenticação de bibliotecários.
 */
export default class AuthService {
  /**
   * Valida as credenciais e devolve o bibliotecário autenticado.
   *
   * Lança `CredenciaisInvalidasException` quando o e-mail não existe, a senha
   * está incorreta ou a conta está inativa. A criação da sessão é
   * responsabilidade da camada HTTP.
   */
  async verificarCredenciais({ email, senha }: CredenciaisLogin): Promise<Bibliotecario> {
    const bibliotecario = await this.buscarPorCredenciais(email, senha)

    if (!bibliotecario.ativo) {
      throw new CredenciaisInvalidasException()
    }

    return bibliotecario
  }

  /**
   * Verifica e-mail e senha pelo `withAuthFinder`, traduzindo o erro padrão do
   * framework (`E_INVALID_CREDENTIALS`) para a exceção de domínio.
   */
  private async buscarPorCredenciais(email: string, senha: string): Promise<Bibliotecario> {
    try {
      return await Bibliotecario.verifyCredentials(email, senha)
    } catch (error) {
      if (error instanceof errors.E_INVALID_CREDENTIALS) {
        throw new CredenciaisInvalidasException()
      }
      throw error
    }
  }
}
