import { BaseMail } from '@adonisjs/mail'
import { urlFor } from '@adonisjs/core/services/url_builder'
import { appUrl } from '#config/app'
import type Bibliotecario from '#models/bibliotecario'

/**
 * E-mail com o link para o bibliotecário redefinir a senha. O link leva à
 * página `/auth/trocar-senha` com o token na query string.
 */
export default class RecuperacaoSenhaNotification extends BaseMail {
  subject = 'Redefinição de senha — Archivum'

  constructor(
    private bibliotecario: Bibliotecario,
    private token: string
  ) {
    super()
  }

  prepare() {
    const url = urlFor(
      'auth.trocar_senha',
      {},
      {
        qs: { token: this.token },
        prefixUrl: appUrl,
      }
    )

    this.message
      .to(this.bibliotecario.email)
      .htmlView('emails/recuperacao_senha_html', { nome: this.bibliotecario.nome, url })
      .textView('emails/recuperacao_senha_text', { nome: this.bibliotecario.nome, url })
  }
}
