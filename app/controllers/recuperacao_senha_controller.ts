import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import RecuperacaoSenhaService from '#services/recuperacao_senha_service'
import TokenRedefinicaoInvalidoException from '#exceptions/token_redefinicao_invalido_exception'
import { esqueciSenhaValidator, trocarSenhaValidator } from '#validators/bibliotecario'

/**
 * Mensagem exibida após o pedido. É sempre a mesma, para não revelar se o
 * e-mail informado existe.
 */
const MENSAGEM_ENVIO =
  'Se houver uma conta com este e-mail, enviaremos um link para redefinir a senha.'

/**
 * Recuperação de senha de bibliotecários: solicitação do link por e-mail e
 * troca da senha a partir do token recebido.
 */
@inject()
export default class RecuperacaoSenhaController {
  constructor(private recuperacaoSenhaService: RecuperacaoSenhaService) {}

  /**
   * Exibe o formulário que pede o e-mail para envio do link.
   */
  async showEsqueciMinhaSenha({ view }: HttpContext) {
    return view.render('pages/auth/esqueci_minha_senha')
  }

  /**
   * Gera o token e envia o e-mail de redefinição. A resposta é sempre a mesma,
   * independentemente de o e-mail existir.
   */
  async enviarLink({ request, response, session }: HttpContext) {
    const { email } = await request.validateUsing(esqueciSenhaValidator)

    await this.recuperacaoSenhaService.solicitarRedefinicao(email)

    session.flash('recuperacaoEnviada', MENSAGEM_ENVIO)
    return response.redirect('/auth/esqueci-minha-senha', false)
  }

  /**
   * Exibe o formulário de nova senha. Redireciona para a solicitação quando o
   * token é ausente ou inválido.
   */
  async showTrocarSenha({ request, response, view, session }: HttpContext) {
    const token = request.input('token', '')

    if (!token || !(await this.recuperacaoSenhaService.validarToken(token))) {
      session.flash('recuperacaoError', 'Link inválido ou expirado')
      return response.redirect('/auth/esqueci-minha-senha', false)
    }

    return view.render('pages/auth/trocar_senha', { token })
  }

  /**
   * Troca a senha e redireciona para o login.
   */
  async trocarSenha({ request, response, session }: HttpContext) {
    const { token, senha } = await request.validateUsing(trocarSenhaValidator)

    try {
      await this.recuperacaoSenhaService.redefinirSenha({ token, senha })
    } catch (error) {
      if (error instanceof TokenRedefinicaoInvalidoException) {
        session.flash('recuperacaoError', error.message)
        return response.redirect('/auth/esqueci-minha-senha', false)
      }
      throw error
    }

    return response.redirect('/auth/login')
  }
}
