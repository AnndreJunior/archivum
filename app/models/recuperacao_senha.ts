import { belongsTo } from '@adonisjs/lucid/orm'
import { RecuperacaoSenhaSchema } from '#database/schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Bibliotecario from '#models/bibliotecario'

/**
 * Pedido de redefinição de senha de um bibliotecário. Guarda apenas o hash do
 * token enviado por e-mail, a data de expiração e o bibliotecário dono do
 * pedido. O token é de uso único: o registro é apagado após a troca de senha.
 */
export default class RecuperacaoSenha extends RecuperacaoSenhaSchema {
  static table = 'recuperacao_senha'

  @belongsTo(() => Bibliotecario)
  declare bibliotecario: BelongsTo<typeof Bibliotecario>
}
