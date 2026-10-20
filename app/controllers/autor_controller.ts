import type { HttpContext } from '@adonisjs/core/http'
import Autor from '#models/autor'
import { criarAutorValidator } from '#validators/autor'

/**
 * Cadastro de autores usado pelo modal do formulário de livros.
 */
export default class AutorController {
  /**
   * Exibe a página de cadastro de autores.
   */
  async create({ view }: HttpContext) {
    return view.render('pages/autores/criar')
  }

  /**
   * Cadastra um novo autor.
   *
   * O modal do formulário de livros consome a resposta em JSON. O formulário
   * da página de cadastro segue o fluxo HTML, com redirect e flash message.
   */
  async store({ request, response, session }: HttpContext) {
    const { nome } = await request.validateUsing(criarAutorValidator)
    const autor = await Autor.create({ nome })

    if (request.accepts(['html', 'json']) === 'json') {
      return response.status(201).json({
        autor: {
          id: autor.id,
          nome: autor.nome,
        },
      })
    }

    session.flash('sucesso', 'Autor cadastrado com sucesso.')
    return response.redirect().toRoute('autores.create')
  }
}
