import type { HttpContext } from '@adonisjs/core/http'
import Livro from '#models/livro'
import Exemplar from '#models/exemplar'
import {
  atualizarExemplarValidator,
  criarExemplarValidator,
  mensagensExemplar,
} from '#validators/exemplar'

/**
 * Quantidade de exemplares exibida por página na listagem.
 */
const POR_PAGINA = 15

/**
 * CRUD de exemplares (cópias físicas emprestáveis) da biblioteca.
 *
 * Bibliotecários autenticados listam, cadastram, editam e excluem exemplares.
 * O livro relacionado é escolhido em um modal com seleção única.
 */
export default class ExemplarController {
  /**
   * Lista os exemplares, com busca por código/livro/autor e paginação.
   */
  async index({ request, view }: HttpContext) {
    const busca = request.input('busca', '')
    const pagina = Number(request.input('page', 1)) || 1

    const exemplares = await Exemplar.query()
      .preload('livro', (livro) => livro.preload('autores'))
      .if(busca, (query) => {
        query.where((subQuery) => {
          subQuery.whereILike('codigo', `%${busca}%`).orWhereHas('livro', (livroQuery) => {
            livroQuery
              .whereILike('titulo', `%${busca}%`)
              .orWhereILike('isbn', `%${busca}%`)
              .orWhereHas('autores', (autoresQuery) => {
                autoresQuery.whereILike('nome', `%${busca}%`)
              })
          })
        })
      })
      .orderBy('codigo', 'asc')
      .paginate(pagina, POR_PAGINA)

    exemplares.baseUrl('/exemplares')
    if (busca) {
      exemplares.queryString({ busca })
    }

    return view.render('pages/exemplares/index', { exemplares, busca })
  }

  /**
   * Exibe o formulário de cadastro.
   */
  async create({ view }: HttpContext) {
    const livros = await this.listarLivros()

    return view.render('pages/exemplares/criar', { livros })
  }

  /**
   * Cadastra um novo exemplar.
   */
  async store({ request, response, session }: HttpContext) {
    const dados = await request.validateUsing(criarExemplarValidator, {
      messagesProvider: mensagensExemplar,
    })

    await Exemplar.create(dados)

    session.flash('sucesso', 'Exemplar cadastrado com sucesso.')
    return response.redirect().toRoute('exemplares.index')
  }

  /**
   * Exibe o formulário de edição de um exemplar.
   */
  async edit({ params, view }: HttpContext) {
    const exemplar = await Exemplar.findOrFail(params.id)
    await exemplar.load('livro', (livro) => livro.preload('autores'))

    const livros = await this.listarLivros()

    return view.render('pages/exemplares/editar', { exemplar, livros })
  }

  /**
   * Atualiza os dados de um exemplar.
   */
  async update({ params, request, response, session }: HttpContext) {
    const exemplar = await Exemplar.findOrFail(params.id)

    const dados = await request.validateUsing(atualizarExemplarValidator, {
      meta: { id: exemplar.id },
      messagesProvider: mensagensExemplar,
    })

    exemplar.merge(dados)
    await exemplar.save()

    session.flash('sucesso', 'Exemplar atualizado com sucesso.')
    return response.redirect().toRoute('exemplares.index')
  }

  /**
   * Exclui um exemplar sem empréstimos vinculados.
   */
  async destroy({ params, response, session }: HttpContext) {
    const exemplar = await Exemplar.findOrFail(params.id)
    const emprestimo = await exemplar.related('emprestimos').query().first()

    if (emprestimo) {
      session.flash('erro', 'Não é possível excluir um exemplar que possui empréstimos.')
      return response.redirect().toRoute('exemplares.index')
    }

    try {
      await exemplar.delete()
      session.flash('sucesso', 'Exemplar excluído com sucesso.')
    } catch {
      session.flash('erro', 'Não é possível excluir um exemplar que possui empréstimos.')
    }

    return response.redirect().toRoute('exemplares.index')
  }

  /**
   * Lista os livros no formato consumido pelo modal de seleção.
   */
  private async listarLivros() {
    const livros = await Livro.query().preload('autores').orderBy('titulo', 'asc')

    return livros.map((livro) => ({
      id: livro.id,
      titulo: livro.titulo,
      isbn: livro.isbn,
      autores: livro.autores.map((autor) => autor.nome),
    }))
  }
}
