import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import { DateTime } from 'luxon'
import Aluno from '#models/aluno'
import Emprestimo from '#models/emprestimo'
import Exemplar from '#models/exemplar'
import EmprestimoService from '#services/emprestimo_service'
import { criarEmprestimoValidator } from '#validators/emprestimo'

/**
 * Quantidade de empréstimos exibida por página na listagem.
 */
const POR_PAGINA = 15

/**
 * Filtros de situação aceitos na listagem. `vencido` é derivado das datas,
 * não é um status armazenado.
 */
const FILTROS_STATUS = ['ativo', 'devolvido', 'vencido'] as const

/**
 * Erros de negócio cuja mensagem pode ser exibida diretamente ao usuário.
 * Funciona como allowlist: qualquer outro erro continua subindo para o
 * handler global.
 */
const CODIGOS_DE_NEGOCIO = new Set<string>([
  'E_ALUNO_INATIVO',
  'E_EXEMPLAR_INDISPONIVEL',
  'E_ALUNO_BLOQUEADO',
  'E_LIMITE_EMPRESTIMOS_ATIVOS',
  'E_EMPRESTIMO_NAO_ATIVO',
  'E_EMPRESTIMO_VENCIDO',
])

/**
 * Interface HTTP dos empréstimos: listagem, registro, renovação e devolução.
 *
 * As regras de negócio ficam no EmprestimoService; este controller cuida da
 * validação de entrada, da autenticação do bibliotecário e da resposta HTTP.
 */
export default class EmprestimoController {
  private readonly service = new EmprestimoService()

  /**
   * Lista os empréstimos com busca por aluno/exemplar/livro e filtro por
   * situação, incluindo os vencidos (derivados das datas).
   */
  async index({ request, view }: HttpContext) {
    const busca = request.input('busca', '')
    const statusInformado = request.input('status', '')
    const status = FILTROS_STATUS.includes(statusInformado) ? statusInformado : ''
    const pagina = Number(request.input('page', 1)) || 1
    const hoje = DateTime.now().startOf('day')

    const query = Emprestimo.query()
      .preload('aluno')
      .preload('exemplar', (exemplar) => {
        exemplar.preload('livro', (livro) => livro.preload('autores'))
      })
      .preload('bibliotecarioRetirada')
      .preload('bibliotecarioDevolucao')
      .if(busca, (consulta) => {
        consulta.where((subQuery) => {
          subQuery
            .whereHas('aluno', (alunoQuery) => {
              alunoQuery.whereILike('nome', `%${busca}%`).orWhereILike('matricula', `%${busca}%`)
            })
            .orWhereHas('exemplar', (exemplarQuery) => {
              exemplarQuery.whereILike('codigo', `%${busca}%`).orWhereHas('livro', (livroQuery) => {
                livroQuery.whereILike('titulo', `%${busca}%`)
              })
            })
        })
      })

    if (status === 'ativo') {
      query.where('status', 'ativo')
    } else if (status === 'devolvido') {
      query.where('status', 'devolvido')
    } else if (status === 'vencido') {
      query
        .where('status', 'ativo')
        .whereNull('dataDevolucao')
        .where('dataPrevistaDevolucao', '<', hoje.toISODate())
    }

    const emprestimos = await query
      .orderBy('dataRetirada', 'desc')
      .orderBy('id', 'desc')
      .paginate(pagina, POR_PAGINA)

    emprestimos.baseUrl('/emprestimos')
    if (busca || status) {
      emprestimos.queryString({ busca, status })
    }

    return view.render('pages/emprestimos/index', {
      emprestimos,
      busca,
      status,
      hojeIso: hoje.toISODate(),
    })
  }

  /**
   * Exibe o formulário de registro de empréstimo.
   *
   * Apenas alunos ativos e exemplares disponíveis são oferecidos; as demais
   * validações continuam no service para evitar duplicação de regras.
   */
  async create({ view }: HttpContext) {
    const [alunos, exemplares] = await Promise.all([
      Aluno.query().where('ativo', true).orderBy('nome', 'asc'),
      Exemplar.query()
        .where('situacao', 'disponivel')
        .preload('livro', (livro) => livro.preload('autores'))
        .orderBy('codigo', 'asc'),
    ])

    return view.render('pages/emprestimos/criar', {
      alunos: alunos.map((aluno) => ({
        id: aluno.id,
        nome: aluno.nome,
        matricula: aluno.matricula,
        nivel: aluno.nivel,
        anoEscolar: aluno.anoEscolar,
        turma: aluno.turma,
      })),
      exemplares: exemplares.map((exemplar) => ({
        id: exemplar.id,
        codigo: exemplar.codigo,
        titulo: exemplar.livro.titulo,
        isbn: exemplar.livro.isbn,
        autores: exemplar.livro.autores.map((autor) => autor.nome),
      })),
    })
  }

  /**
   * Registra a retirada de um exemplar pelo aluno no balcão.
   */
  async store({ auth, request, response, session }: HttpContext) {
    const dados = await request.validateUsing(criarEmprestimoValidator)
    const bibliotecario = auth.getUserOrFail()

    try {
      await this.service.registrar({
        alunoId: dados.alunoId,
        exemplarId: dados.exemplarId,
        bibliotecarioId: bibliotecario.id,
      })
    } catch (error) {
      return this.responderErroDeNegocio(error, response, session, 'emprestimos.create')
    }

    session.flash('sucesso', 'Empréstimo registrado com sucesso.')
    return response.redirect().toRoute('emprestimos.index')
  }

  /**
   * Renova um empréstimo ativo, avançando o prazo em mais 15 dias úteis.
   */
  async renovar({ params, response, session }: HttpContext) {
    try {
      await this.service.renovar(Number(params.id))
    } catch (error) {
      return this.responderErroDeNegocio(error, response, session, 'emprestimos.index')
    }

    session.flash('sucesso', 'Empréstimo renovado com sucesso.')
    return response.redirect().toRoute('emprestimos.index')
  }

  /**
   * Registra a devolução do exemplar e o devolve ao acervo.
   */
  async devolver({ auth, params, response, session }: HttpContext) {
    const bibliotecario = auth.getUserOrFail()

    try {
      await this.service.devolver({
        emprestimoId: Number(params.id),
        bibliotecarioId: bibliotecario.id,
      })
    } catch (error) {
      return this.responderErroDeNegocio(error, response, session, 'emprestimos.index')
    }

    session.flash('sucesso', 'Devolução registrada com sucesso.')
    return response.redirect().toRoute('emprestimos.index')
  }

  /**
   * Converte erros de negócio conhecidos em flash + redirect usando a própria
   * mensagem da exceção. Erros desconhecidos (inclusive 404 de registro
   * inexistente) continuam subindo para o handler global.
   */
  private responderErroDeNegocio(
    error: unknown,
    response: HttpContext['response'],
    session: HttpContext['session'],
    rota: 'emprestimos.create' | 'emprestimos.index'
  ) {
    if (error instanceof Exception && error.code && CODIGOS_DE_NEGOCIO.has(error.code)) {
      session.flash('erro', error.message)
      return response.redirect().toRoute(rota)
    }

    throw error
  }
}
