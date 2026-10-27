import vine from '@vinejs/vine'
import Bibliotecario from '#models/bibliotecario'

/**
 * Regras compartilhadas de email e senha.
 */
const email = () => vine.string().trim().email().maxLength(254)
const senha = () => vine.string().minLength(8).maxLength(32)

/**
 * Regras comuns aos formulários de bibliotecário.
 */
const nome = () => vine.string().trim().maxLength(120)
const matricula = () => vine.string().trim().fixedLength(6)
const role = () => vine.enum(Bibliotecario.roles)

/**
 * Validador usado no cadastro de bibliotecários.
 *
 * A senha não faz parte do formulário: é gerada aleatoriamente no cadastro e
 * definida pelo próprio bibliotecário no fluxo de "Esqueci minha senha".
 */
export const criarBibliotecarioValidator = vine.create({
  nome: nome(),
  matricula: matricula().unique({ table: 'bibliotecario', column: 'matricula' }),
  email: email().unique({ table: 'bibliotecario', column: 'email' }),
  role: role(),
})

/**
 * Validador usado na edição de bibliotecários.
 *
 * Espera receber `{ meta: { id } }` em `request.validateUsing` para ignorar o
 * próprio bibliotecário na checagem de unicidade de matrícula e e-mail.
 */
export const atualizarBibliotecarioValidator = vine.create({
  nome: nome(),
  matricula: matricula().unique({
    table: 'bibliotecario',
    column: 'matricula',
    filter: (query, _value, field) => {
      query.whereNot('id', field.meta.id)
    },
  }),
  email: email().unique({
    table: 'bibliotecario',
    column: 'email',
    filter: (query, _value, field) => {
      query.whereNot('id', field.meta.id)
    },
  }),
  role: role(),
})

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
