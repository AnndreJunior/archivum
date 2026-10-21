import vine, { SimpleMessagesProvider } from '@vinejs/vine'
import Exemplar from '#models/exemplar'

/**
 * Mensagens em português usadas nos formulários de exemplares.
 */
export const mensagensExemplar = new SimpleMessagesProvider({
  'codigo.database.unique': 'Este código já está cadastrado.',
})

/**
 * Validação dos dados de exemplares.
 *
 * O livro precisa existir, o código (tombo) é único e a situação pertence ao
 * domínio definido no model. Na edição, o próprio exemplar é ignorado na
 * checagem de unicidade do código (o `id` chega via `meta`).
 */

const livroId = () => vine.number().min(1).exists({ table: 'livro', column: 'id' })

const situacao = () => vine.enum(Exemplar.situacoes).optional()

const codigo = () => vine.string().trim().minLength(1).maxLength(30)

/**
 * Validador usado no cadastro de exemplares.
 */
export const criarExemplarValidator = vine.create({
  livroId: livroId(),
  codigo: codigo().unique({ table: 'exemplar', column: 'codigo', caseInsensitive: true }),
  situacao: situacao(),
})

/**
 * Validador usado na edição de exemplares.
 *
 * Espera receber `{ meta: { id } }` em `request.validateUsing` para ignorar o
 * próprio exemplar na checagem de unicidade do código.
 */
export const atualizarExemplarValidator = vine.create({
  livroId: livroId(),
  codigo: codigo().unique({
    table: 'exemplar',
    column: 'codigo',
    caseInsensitive: true,
    filter: (query, _value, field) => {
      query.whereNot('id', field.meta.id)
    },
  }),
  situacao: situacao(),
})
