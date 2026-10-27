import Bibliotecario from '#models/bibliotecario'

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
export async function garantirAdminBibliotecario(dados: DadosAdmin): Promise<ResultadoAdmin> {
  const adminExistente = await Bibliotecario.query()
    .where('role', 'admin')
    .orderBy('id', 'asc')
    .first()

  if (adminExistente) {
    return { bibliotecario: adminExistente, criado: false }
  }

  const admin = await Bibliotecario.create({
    nome: dados.nome,
    matricula: dados.matricula,
    email: dados.email,
    senha: dados.senha,
    role: 'admin',
    ativo: true,
  })

  return { bibliotecario: admin, criado: true }
}
