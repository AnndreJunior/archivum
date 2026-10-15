import type Bibliotecario from '#models/bibliotecario'

/**
 * Dados do bibliotecário admin usado no cadastro de startup.
 * Em produção são lidos das variáveis de ambiente `ADMIN_*`.
 */
export type DadosAdmin = {
  nome: string
  matricula: string
  email: string
  senha: string
}

/**
 * Resultado da garantia de existência do bibliotecário admin.
 */
export type ResultadoAdmin = {
  bibliotecario: Bibliotecario
  criado: boolean
}

/**
 * Garante que exista um bibliotecário com `role = 'admin'`.
 *
 * Se já houver um admin, retorna o existente sem alterar seus dados
 * (`criado: false`). Caso contrário, cadastra um novo admin com os dados
 * informados (`criado: true`). É chamado no startup da aplicação.
 */
export async function garantirAdminBibliotecario(_dados: DadosAdmin): Promise<ResultadoAdmin> {
  throw new Error('garantirAdminBibliotecario não implementado')
}
