import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import RecuperacaoSenhaService from '#services/recuperacao_senha_service'

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
  async showEsqueciMinhaSenha(_ctx: HttpContext) {
    throw new Error('não implementado')
  }

  /**
   * Gera o token e envia o e-mail de redefinição. A resposta é sempre a mesma,
   * independentemente de o e-mail existir.
   */
  async enviarLink(_ctx: HttpContext) {
    throw new Error('não implementado')
  }

  /**
   * Exibe o formulário de nova senha. Redireciona para a solicitação quando o
   * token é ausente ou inválido.
   */
  async showTrocarSenha(_ctx: HttpContext) {
    throw new Error('não implementado')
  }

  /**
   * Troca a senha e redireciona para o login.
   */
  async trocarSenha(_ctx: HttpContext) {
    throw new Error('não implementado')
  }
}
