import vine from '@vinejs/vine'

/**
 * Regras compartilhadas de email e senha.
 */
const email = () => vine.string().email().maxLength(254)
const senha = () => vine.string().minLength(8).maxLength(32)

/**
 * Validador usado no cadastro de bibliotecários.
 */
export const signupValidator = vine.create({
  nome: vine.string().maxLength(120),
  matricula: vine.string().fixedLength(6).unique({ table: 'bibliotecario', column: 'matricula' }),
  email: email().unique({ table: 'bibliotecario', column: 'email' }),
  senha: senha(),
  senhaConfirmation: senha().sameAs('senha'),
})

/**
 * Validador usado antes de verificar as credenciais durante o login.
 */
export const loginValidator = vine.create({
  email: email(),
  senha: vine.string(),
})

/**
 * Validador do pedido de recuperação de senha (apenas o e-mail).
 */
export const esqueciSenhaValidator = vine.create({
  email: email(),
})

/**
 * Validador da troca de senha a partir do token recebido por e-mail.
 */
export const trocarSenhaValidator = vine.create({
  token: vine.string(),
  senha: senha(),
  senhaConfirmation: senha().sameAs('senha'),
})
