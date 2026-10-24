import vine from '@vinejs/vine'

/**
 * Validação dos dados de empréstimos.
 *
 * As regras de negócio (aluno ativo, exemplar disponível, bloqueio por atraso
 * e limite de empréstimos ativos) são responsabilidade do EmprestimoService.
 * Aqui validamos apenas o formato e a existência dos registros referenciados.
 */
export const criarEmprestimoValidator = vine.create({
  alunoId: vine.number().min(1).exists({ table: 'aluno', column: 'id' }),
  exemplarId: vine.number().min(1).exists({ table: 'exemplar', column: 'id' }),
})
