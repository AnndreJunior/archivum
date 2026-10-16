import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AuthService from '#services/auth_service'
import CredenciaisInvalidasException from '#exceptions/credenciais_invalidas_exception'
import { loginValidator } from '#validators/bibliotecario'

/**
 * Autenticação de bibliotecários: login e logout.
 */
@inject()
export default class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Autentica o bibliotecário e inicia a sessão.
   *
   * Em caso de credenciais inválidas ou conta inativa, volta para a tela de
   * login com uma mensagem de erro.
   */
  async login({ request, response, auth, session }: HttpContext) {
    const { email, senha } = await request.validateUsing(loginValidator)

    try {
      const bibliotecario = await this.authService.verificarCredenciais({ email, senha })
      await auth.use('web').login(bibliotecario)
    } catch (error) {
      if (error instanceof CredenciaisInvalidasException) {
        session.flash('error', error.message)
        return response.redirect('/auth/login')
      }
      throw error
    }

    return response.redirect('/')
  }

  /**
   * Encerra a sessão do bibliotecário autenticado.
   */
  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()

    return response.redirect('/auth/login')
  }
}
