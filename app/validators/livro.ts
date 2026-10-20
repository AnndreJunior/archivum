import vine from '@vinejs/vine'
import Livro from '#models/livro'

/**
 * Validação dos dados de livros.
 *
 * O ISBN é opcional, mas único quando informado. Na edição, o próprio livro é
 * ignorado na checagem (o `id` chega via `meta`). Os autores também são
 * opcionais; quando presentes, cada ID precisa existir na tabela `autor`.
 */

const titulo = () => vine.string().trim().minLength(1).maxLength(200)
const editora = () => vine.string().trim().maxLength(120).nullable().optional()
const anoPublicacao = () => vine.number().min(1).max(9999).nullable().optional()

const isbn = () =>
  vine
    .string()
    .trim()
    .maxLength(20)
    .unique(async (db, value, field) => {
      /**
       * Compara apenas os dígitos para reconhecer ISBNs antigos com outros
       * agrupamentos de hífens, como 978-85-01-09553-8.
       */
      const digitos = String(value ?? '').replace(/\D/g, '')

      if (!digitos) {
        return true
      }

      const query = db
        .from('livro')
        .select('id')
        .whereRaw("regexp_replace(isbn, '[^0-9]', '', 'g') = ?", [digitos])

      const ignorarId = (field.meta as { id?: number }).id

      if (ignorarId) {
        query.whereNot('id', ignorarId)
      }

      return !(await query.first())
    })
    .nullable()
    .optional()
    .transform((value) => Livro.formatarIsbn(value ?? null))

const autorId = () => vine.number().min(1).exists({ table: 'autor', column: 'id' })

const autores = () => vine.unionOfTypes([vine.array(autorId()).distinct(), autorId()]).optional()

/**
 * Validador usado no cadastro de livros.
 */
export const criarLivroValidator = vine.create({
  titulo: titulo(),
  isbn: isbn(),
  editora: editora(),
  anoPublicacao: anoPublicacao(),
  autores: autores(),
})

/**
 * Validador usado na edição de livros.
 *
 * Espera receber `{ meta: { id } }` em `request.validateUsing` para ignorar o
 * próprio livro na checagem de unicidade do ISBN.
 */
export const atualizarLivroValidator = vine.create({
  titulo: titulo(),
  isbn: isbn(),
  editora: editora(),
  anoPublicacao: anoPublicacao(),
  autores: autores(),
})
