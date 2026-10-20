import vine from '@vinejs/vine'

/**
 * Validação dos dados de autores.
 *
 * O nome é único (sem diferenciar maiúsculas de minúsculas) para evitar
 * autores duplicados na listagem do modal de seleção.
 */
export const criarAutorValidator = vine.create({
  nome: vine
    .string()
    .trim()
    .minLength(1)
    .maxLength(120)
    .unique({ table: 'autor', column: 'nome', caseInsensitive: true }),
})
