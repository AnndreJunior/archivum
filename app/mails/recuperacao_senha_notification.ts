import { BaseMail } from '@adonisjs/mail'
import type Bibliotecario from '#models/bibliotecario'

/**
 * E-mail com o link para o bibliotecário redefinir a senha. O link leva à
 * página `/auth/trocar-senha` com o token na query string.
 */
export default class RecuperacaoSenhaNotification extends BaseMail {
  subject = 'Redefinição de senha — Archivum'

  constructor(
    private _bibliotecario: Bibliotecario,
    private _token: string
  ) {
    super()
  }

  prepare() {
    throw new Error('não implementado')
  }
}
