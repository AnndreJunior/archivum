import { createHash, randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import Bibliotecario from '#models/bibliotecario'
import RecuperacaoSenha from '#models/recuperacao_senha'
import TokenRedefinicaoInvalidoException from '#exceptions/token_redefinicao_invalido_exception'
import RecuperacaoSenhaNotification from '#mails/recuperacao_senha_notification'

/**
 * Tempo de validade do link de redefinição enviado por e-mail.
 */
const VALIDADE_TOKEN_EM_MINUTOS = 5

/**
 * Dados para concluir a troca de senha a partir do token recebido por e-mail.
 * Espera-se que já tenham passado pelo `trocarSenhaValidator`.
 */
export type DadosRedefinicao = {
  token: string
  senha: string
}

/**
 * Calcula o hash (SHA-256) de um token. É o valor persistido no banco: o token
 * em texto puro só existe no e-mail enviado ao bibliotecário.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Recuperação de senha de bibliotecários: gera o token enviado por e-mail,
 * valida-o e efetiva a troca da senha.
 */
export default class RecuperacaoSenhaService {
  /**
   * Cria um novo token de redefinição para o bibliotecário, revogando os
   * tokens anteriores, e devolve o token em texto puro (o banco guarda apenas
   * o hash).
   */
  async gerarToken(bibliotecario: Bibliotecario): Promise<string> {
    const token = randomBytes(32).toString('base64url')

    await db.transaction(async (trx) => {
      await RecuperacaoSenha.query({ client: trx })
        .where('bibliotecarioId', bibliotecario.id)
        .delete()

      await RecuperacaoSenha.create(
        {
          bibliotecarioId: bibliotecario.id,
          tokenHash: hashToken(token),
          expiresAt: DateTime.now().plus({ minutes: VALIDADE_TOKEN_EM_MINUTOS }),
        },
        { client: trx }
      )
    })

    return token
  }

  /**
   * Inicia a recuperação de senha para o e-mail informado. Apenas
   * bibliotecários ativos recebem o e-mail; para os demais a operação é
   * silenciosa, de modo a não revelar se o e-mail existe.
   */
  async solicitarRedefinicao(email: string): Promise<void> {
    const bibliotecario = await Bibliotecario.query().where('email', email).first()

    if (!bibliotecario || !bibliotecario.ativo) {
      return
    }

    const token = await this.gerarToken(bibliotecario)
    await mail.send(new RecuperacaoSenhaNotification(bibliotecario, token))
  }

  /**
   * Informa se o token existe e ainda está dentro do prazo de validade.
   */
  async validarToken(token: string): Promise<boolean> {
    const registro = await this.buscarRegistro(token)
    return !!registro && registro.expiresAt.toMillis() > DateTime.now().toMillis()
  }

  /**
   * Troca a senha do bibliotecário dono do token e invalida o token.
   *
   * Lança `TokenRedefinicaoInvalidoException` quando o token não existe, já
   * expirou ou já foi utilizado.
   */
  async redefinirSenha({ token, senha }: DadosRedefinicao): Promise<Bibliotecario> {
    const registro = await this.buscarRegistro(token)

    if (!registro || registro.expiresAt.toMillis() <= DateTime.now().toMillis()) {
      if (registro) {
        await registro.delete()
      }
      throw new TokenRedefinicaoInvalidoException()
    }

    return db.transaction(async (trx) => {
      const bibliotecario = await Bibliotecario.findOrFail(registro.bibliotecarioId, {
        client: trx,
      })

      bibliotecario.senha = senha
      bibliotecario.useTransaction(trx)
      await bibliotecario.save()

      await RecuperacaoSenha.query({ client: trx }).where('id', registro.id).delete()

      return bibliotecario
    })
  }

  /**
   * Busca o registro de recuperação pelo hash do token informado.
   */
  private buscarRegistro(token: string) {
    return RecuperacaoSenha.query().where('tokenHash', hashToken(token)).first()
  }
}
