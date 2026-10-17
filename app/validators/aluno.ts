import vine from '@vinejs/vine'
import Aluno from '#models/aluno'

/**
 * Validação dos dados de alunos.
 *
 * A matrícula é única na tabela `aluno`. Na edição, o próprio registro é
 * ignorado na checagem de unicidade (o `id` chega via `meta`).
 */

const email = () => vine.string().trim().email().maxLength(254).nullable().optional()
const telefone = () =>
  vine
    .string()
    .trim()
    .maxLength(20)
    .nullable()
    .optional()
    .transform((value) => Aluno.formatarTelefone(value ?? null))
/**
 * Regra cruzada: no ensino médio o ano escolar vai de 1 a 3. Lê o nível
 * submetido a partir de `field.data` (o objeto de topo em validação).
 */
const anoEscolarCompativelComNivel = vine.createRule((value, _options, field) => {
  if (!field.isValid) {
    return
  }

  if (field.data.nivel === 'medio' && Number(value) > 3) {
    field.report('O ano escolar do ensino médio não pode ser maior que 3', 'anoEscolarMedio', field)
  }
})

const nome = () => vine.string().trim().maxLength(120)
const anoEscolar = () => vine.number().min(1).max(9).use(anoEscolarCompativelComNivel())
const turma = () =>
  vine
    .string()
    .trim()
    .maxLength(1)
    .transform((value) => value.toUpperCase())
const nivel = () => vine.enum(Aluno.niveis)

/**
 * Validador usado no cadastro de alunos.
 */
export const criarAlunoValidator = vine.create({
  nome: nome(),
  matricula: vine.string().trim().maxLength(20).unique({ table: 'aluno', column: 'matricula' }),
  anoEscolar: anoEscolar(),
  turma: turma(),
  nivel: nivel(),
  email: email(),
  telefone: telefone(),
})

/**
 * Validador usado na edição de alunos.
 *
 * Espera receber `{ meta: { id } }` em `request.validateUsing` para ignorar o
 * próprio aluno na checagem de unicidade da matrícula.
 */
export const atualizarAlunoValidator = vine.create({
  nome: nome(),
  matricula: vine
    .string()
    .trim()
    .maxLength(20)
    .unique({
      table: 'aluno',
      column: 'matricula',
      filter: (query, _value, field) => {
        query.whereNot('id', field.meta.id)
      },
    }),
  anoEscolar: anoEscolar(),
  turma: turma(),
  nivel: nivel(),
  email: email(),
  telefone: telefone(),
})
