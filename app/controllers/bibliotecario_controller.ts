import type { HttpContext } from '@adonisjs/core/http'
import Bibliotecario from '#models/bibliotecario'
import { gerarSenhaAleatoria } from '#services/senha_inicial_service'
import {
  atualizarBibliotecarioValidator,
  criarBibliotecarioValidator,
} from '#validators/bibliotecario'

/**
 * Quantidade de bibliotecários exibida por página na listagem.
 */
const POR_PAGINA = 15

/**
 * Gestão de bibliotecários: listagem, cadastro, edição e ativação.
 *
 * Todas as ações são restritas a administradores (ver rotas `bibliotecarios.*`).
 */
export default class BibliotecarioController {
  /**
   * Lista os bibliotecários, com busca e paginação.
   */
  async index({ auth, request, view }: HttpContext) {
    const busca = request.input('busca', '')
    const pagina = Number(request.input('page', 1)) || 1
    const usuarioAtualId = auth.getUserOrFail().id

    const bibliotecarios = await Bibliotecario.query()
      .if(busca, (query) => {
        query.where((subQuery) => {
          subQuery
            .whereILike('nome', `%${busca}%`)
            .orWhereILike('matricula', `%${busca}%`)
            .orWhereILike('email', `%${busca}%`)
        })
      })
      .orderBy('nome', 'asc')
      .paginate(pagina, POR_PAGINA)

    bibliotecarios.baseUrl('/bibliotecarios')
    if (busca) {
      bibliotecarios.queryString({ busca })
    }

    return view.render('pages/bibliotecarios/index', {
      bibliotecarios,
      busca,
      usuarioAtualId,
    })
  }

  /**
   * Exibe o formulário de cadastro.
   */
  async create({ view }: HttpContext) {
    return view.render('pages/bibliotecarios/criar')
  }

  /**
   * Cadastra um novo bibliotecário com senha inicial aleatória.
   *
   * A senha não é informada por quem cadastra: o bibliotecário define a
   * própria senha pelo fluxo de "Esqueci minha senha".
   */
  async store({ request, response, session }: HttpContext) {
    const dados = await request.validateUsing(criarBibliotecarioValidator)

    await Bibliotecario.create({
      ...dados,
      senha: gerarSenhaAleatoria(),
      ativo: true,
    })

    session.flash('sucesso', 'Bibliotecário cadastrado com sucesso.')
    return response.redirect().toRoute('bibliotecarios.create')
  }

  /**
   * Exibe o formulário de edição.
   */
  async edit({ params, view }: HttpContext) {
    const bibliotecario = await Bibliotecario.findOrFail(params.id)

    return view.render('pages/bibliotecarios/editar', { bibliotecario })
  }

  /**
   * Atualiza os dados cadastrais de um bibliotecário.
   *
   * O próprio administrador não pode alterar a sua role, para evitar que o
   * sistema fique sem nenhum usuário com acesso administrativo.
   */
  async update({ auth, params, request, response, session }: HttpContext) {
    const bibliotecario = await Bibliotecario.findOrFail(params.id)

    const dados = await request.validateUsing(atualizarBibliotecarioValidator, {
      meta: { id: bibliotecario.id },
    })

    const usuarioAtual = auth.getUserOrFail()

    if (usuarioAtual.id === bibliotecario.id && dados.role !== bibliotecario.role) {
      session.flash('erro', 'Você não pode alterar a própria role.')
      return response.redirect().toRoute('bibliotecarios.edit', { id: bibliotecario.id })
    }

    bibliotecario.merge(dados)
    await bibliotecario.save()

    session.flash('sucesso', 'Bibliotecário atualizado com sucesso.')
    return response.redirect().toRoute('bibliotecarios.index')
  }

  /**
   * Desativa ou reativa um bibliotecário.
   *
   * O administrador não pode desativar a si mesmo, para não perder o acesso ao
   * sistema.
   */
  async alternarAtivo({ auth, params, response, session }: HttpContext) {
    const bibliotecario = await Bibliotecario.findOrFail(params.id)
    const usuarioAtual = auth.getUserOrFail()

    if (usuarioAtual.id === bibliotecario.id && bibliotecario.ativo) {
      session.flash('erro', 'Você não pode desativar o próprio usuário.')
      return response.redirect().toRoute('bibliotecarios.index')
    }

    bibliotecario.ativo = !bibliotecario.ativo
    await bibliotecario.save()

    session.flash(
      'sucesso',
      bibliotecario.ativo
        ? 'Bibliotecário reativado com sucesso.'
        : 'Bibliotecário desativado com sucesso.'
    )
    return response.redirect().toRoute('bibliotecarios.index')
  }
}
