import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Autor from '#models/autor'
import Livro from '#models/livro'
import { atualizarLivroValidator, criarLivroValidator } from '#validators/livro'

/**
 * Quantidade de livros exibida por página na listagem.
 */
const POR_PAGINA = 15

/**
 * CRUD de livros da biblioteca.
 *
 * Bibliotecários autenticados listam, cadastram e editam livros. Os autores são
 * selecionados em um modal dentro do próprio formulário do livro.
 */
export default class LivroController {
  /**
   * Lista os livros, com busca por título/ISBN/autor e paginação.
   */
  async index({ request, view }: HttpContext) {
    const busca = request.input('busca', '')
    const pagina = Number(request.input('page', 1)) || 1

    const livros = await Livro.query()
      .preload('autores')
      .if(busca, (query) => {
        query.where((subQuery) => {
          subQuery
            .whereILike('titulo', `%${busca}%`)
            .orWhereILike('isbn', `%${busca}%`)
            .orWhereHas('autores', (autoresQuery) => {
              autoresQuery.whereILike('nome', `%${busca}%`)
            })
        })
      })
      .orderBy('titulo', 'asc')
      .paginate(pagina, POR_PAGINA)

    livros.baseUrl('/livros')
    if (busca) {
      livros.queryString({ busca })
    }

    return view.render('pages/livros/index', { livros, busca })
  }

  /**
   * Exibe o formulário de cadastro.
   */
  async create({ view }: HttpContext) {
    const autores = await this.listarAutores()

    return view.render('pages/livros/criar', { autores })
  }

  /**
   * Cadastra um novo livro e sincroniza os autores selecionados.
   */
  async store({ request, response, session }: HttpContext) {
    const dados = await request.validateUsing(criarLivroValidator)
    const { autores: autoresBrutos, ...dadosLivro } = dados
    const autores = this.normalizarAutores(autoresBrutos)

    await db.transaction(async (trx) => {
      const livro = await Livro.create(dadosLivro, { client: trx })
      await livro.related('autores').sync(autores, true, trx)
    })

    session.flash('sucesso', 'Livro cadastrado com sucesso.')
    return response.redirect().toRoute('livros.index')
  }

  /**
   * Exibe o formulário de edição de um livro.
   */
  async edit({ params, view }: HttpContext) {
    const livro = await Livro.findOrFail(params.id)
    await livro.load('autores')

    const autores = await this.listarAutores()

    return view.render('pages/livros/editar', {
      livro,
      autores,
      selecionadosIniciais: livro.autores.map((autor) => autor.id),
    })
  }

  /**
   * Atualiza os dados de um livro e ressincroniza os autores.
   */
  async update({ params, request, response, session }: HttpContext) {
    const livro = await Livro.findOrFail(params.id)

    const dados = await request.validateUsing(atualizarLivroValidator, {
      meta: { id: livro.id },
    })
    const { autores: autoresBrutos, ...dadosLivro } = dados
    const autores = this.normalizarAutores(autoresBrutos)

    await db.transaction(async (trx) => {
      livro.useTransaction(trx)
      livro.merge(dadosLivro)
      await livro.save()

      await livro.related('autores').sync(autores, true, trx)
    })

    session.flash('sucesso', 'Livro atualizado com sucesso.')
    return response.redirect().toRoute('livros.index')
  }

  /**
   * Lista os autores para o modal no formato consumido pela view.
   */
  private async listarAutores() {
    const autores = await Autor.query().orderBy('nome', 'asc')

    return autores.map((autor) => ({
      id: autor.id,
      nome: autor.nome,
    }))
  }

  /**
   * Normaliza a seleção de autores, aceitando tanto um ID único quanto um
   * array. O formulário HTML envia um array, mas clientes HTTP podem enviar
   * apenas um valor.
   */
  private normalizarAutores(autores: number | number[] | undefined | null) {
    if (autores === undefined || autores === null) {
      return []
    }

    return Array.isArray(autores) ? autores : [autores]
  }
}
