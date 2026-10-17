import type { HttpContext } from '@adonisjs/core/http'
import Aluno from '#models/aluno'
import { atualizarAlunoValidator, criarAlunoValidator } from '#validators/aluno'

/**
 * Quantidade de alunos exibida por página na listagem.
 */
const POR_PAGINA = 15

/**
 * CRUD de alunos da biblioteca.
 *
 * Bibliotecários autenticados listam, cadastram e editam alunos. Somente
 * administradores desativam ou reativam (ver rota `alunos.ativo`).
 */
export default class AlunoController {
  /**
   * Lista os alunos, com busca por nome/matrícula e paginação.
   */
  async index({ auth, request, view }: HttpContext) {
    const busca = request.input('busca', '')
    const pagina = Number(request.input('page', 1)) || 1
    const podeAlternarAtivo = auth.getUserOrFail().isAdmin

    const alunos = await Aluno.query()
      .if(busca, (query) => {
        query.where((subQuery) => {
          subQuery.whereILike('nome', `%${busca}%`).orWhereILike('matricula', `%${busca}%`)
        })
      })
      .orderBy('nome', 'asc')
      .paginate(pagina, POR_PAGINA)

    alunos.baseUrl('/alunos')
    if (busca) {
      alunos.queryString({ busca })
    }

    return view.render('pages/alunos/index', { alunos, busca, podeAlternarAtivo })
  }

  /**
   * Exibe o formulário de cadastro.
   */
  async create({ view }: HttpContext) {
    return view.render('pages/alunos/criar')
  }

  /**
   * Cadastra um novo aluno.
   */
  async store({ request, response, session }: HttpContext) {
    const dados = await request.validateUsing(criarAlunoValidator)

    await Aluno.create(dados)

    session.flash('sucesso', 'Aluno cadastrado com sucesso.')
    return response.redirect().toRoute('alunos.index')
  }

  /**
   * Exibe o formulário de edição de um aluno.
   */
  async edit({ params, view }: HttpContext) {
    const aluno = await Aluno.findOrFail(params.id)

    return view.render('pages/alunos/editar', { aluno })
  }

  /**
   * Atualiza os dados de um aluno.
   */
  async update({ params, request, response, session }: HttpContext) {
    const aluno = await Aluno.findOrFail(params.id)

    const dados = await request.validateUsing(atualizarAlunoValidator, {
      meta: { id: aluno.id },
    })

    aluno.merge(dados)
    await aluno.save()

    session.flash('sucesso', 'Aluno atualizado com sucesso.')
    return response.redirect().toRoute('alunos.index')
  }

  /**
   * Desativa ou reativa um aluno (somente admin).
   */
  async alternarAtivo({ params, response, session }: HttpContext) {
    const aluno = await Aluno.findOrFail(params.id)

    aluno.ativo = !aluno.ativo
    await aluno.save()

    session.flash(
      'sucesso',
      aluno.ativo ? 'Aluno reativado com sucesso.' : 'Aluno desativado com sucesso.'
    )
    return response.redirect().toRoute('alunos.index')
  }
}
