import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Aluno from '#models/aluno'
import Emprestimo from '#models/emprestimo'
import Exemplar from '#models/exemplar'
import AlunoBloqueadoException from '#exceptions/aluno_bloqueado_exception'
import AlunoInativoException from '#exceptions/aluno_inativo_exception'
import EmprestimoNaoAtivoException from '#exceptions/emprestimo_nao_ativo_exception'
import EmprestimoVencidoException from '#exceptions/emprestimo_vencido_exception'
import ExemplarIndisponivelException from '#exceptions/exemplar_indisponivel_exception'
import LimiteEmprestimosAtivosException from '#exceptions/limite_emprestimos_ativos_exception'

/**
 * Quantidade máxima de empréstimos ativos simultâneos por aluno.
 */
const LIMITE_EMPRESTIMOS_ATIVOS = 3

/**
 * Prazo de cada empréstimo, em dias úteis.
 */
const DIAS_UTEIS_PRAZO = 15

/**
 * Dados necessários para registrar a retirada de um exemplar.
 */
export type DadosRegistroEmprestimo = {
  exemplarId: number
  alunoId: number
  bibliotecarioId: number
}

/**
 * Dados necessários para registrar a devolução de um exemplar.
 */
export type DadosDevolucao = {
  emprestimoId: number
  bibliotecarioId: number
}

/**
 * Regras de negócio dos empréstimos: retirada, renovação e devolução.
 *
 * O relógio é injetável para permitir testes determinísticos do cálculo de
 * prazos e do bloqueio por atraso.
 */
export default class EmprestimoService {
  constructor(readonly agora: () => DateTime = () => DateTime.now()) {}

  /**
   * Registra a retirada de um exemplar por um aluno.
   *
   * Valida a conta do aluno, a disponibilidade do exemplar, o bloqueio por
   * atraso e o limite de empréstimos ativos. A transação e os locks impedem
   * que duas retiradas simultâneas ultrapassem o limite ou reservem o mesmo
   * exemplar.
   */
  async registrar(dados: DadosRegistroEmprestimo): Promise<Emprestimo> {
    return db.transaction(async (trx) => {
      const aluno = await Aluno.query({ client: trx })
        .where('id', dados.alunoId)
        .forUpdate()
        .firstOrFail()

      const exemplar = await Exemplar.query({ client: trx })
        .where('id', dados.exemplarId)
        .forUpdate()
        .firstOrFail()

      if (!aluno.ativo) {
        throw new AlunoInativoException()
      }

      if (exemplar.situacao !== 'disponivel') {
        throw new ExemplarIndisponivelException()
      }

      const hoje = this.hoje()

      if (await this.verificarBloqueio(aluno.id, hoje, trx)) {
        throw new AlunoBloqueadoException()
      }

      const totalAtivos = (await Emprestimo.query({ client: trx })
        .where('alunoId', aluno.id)
        .where('status', 'ativo')
        .count('* as total')
        .pojo()
        .first()) as { total?: string | number } | undefined

      const limiteDeEmprestimosAtingido =
        Number(totalAtivos?.total ?? 0) >= LIMITE_EMPRESTIMOS_ATIVOS
      if (limiteDeEmprestimosAtingido) {
        throw new LimiteEmprestimosAtivosException()
      }

      const emprestimo = await Emprestimo.create(
        {
          exemplarId: exemplar.id,
          alunoId: aluno.id,
          bibliotecarioRetiradaId: dados.bibliotecarioId,
          bibliotecarioDevolucaoId: null,
          dataRetirada: hoje,
          dataPrevistaDevolucao: EmprestimoService.calcularDataPrevistaDevolucao(hoje),
          dataDevolucao: null,
          renovacoes: 0,
          status: 'ativo',
        },
        { client: trx }
      )

      exemplar.situacao = 'emprestado'
      exemplar.useTransaction(trx)
      await exemplar.save()

      return emprestimo
    })
  }

  /**
   * Renova um empréstimo ativo, avançando o prazo em mais 15 dias úteis.
   *
   * Empréstimos devolvidos não podem ser renovados. Empréstimos vencidos
   * também não: nesse caso o exemplar precisa ser devolvido primeiro.
   */
  async renovar(emprestimoId: number): Promise<Emprestimo> {
    return db.transaction(async (trx) => {
      const emprestimo = await Emprestimo.query({ client: trx })
        .where('id', emprestimoId)
        .forUpdate()
        .firstOrFail()

      if (emprestimo.status !== 'ativo' || emprestimo.dataDevolucao) {
        throw new EmprestimoNaoAtivoException()
      }

      if (this.estaVencido(emprestimo)) {
        throw new EmprestimoVencidoException()
      }

      emprestimo.renovacoes += 1
      emprestimo.dataPrevistaDevolucao = EmprestimoService.calcularDataPrevistaDevolucao(
        emprestimo.dataPrevistaDevolucao
      )
      emprestimo.useTransaction(trx)
      await emprestimo.save()

      return emprestimo
    })
  }

  /**
   * Registra a devolução do exemplar e o devolve ao acervo.
   *
   * A devolução é aceita mesmo em atraso; o bloqueio correspondente é
   * calculado posteriormente a partir das datas registradas.
   */
  async devolver(dados: DadosDevolucao): Promise<Emprestimo> {
    return db.transaction(async (trx) => {
      const emprestimo = await Emprestimo.query({ client: trx })
        .where('id', dados.emprestimoId)
        .forUpdate()
        .firstOrFail()

      if (emprestimo.status !== 'ativo' || emprestimo.dataDevolucao) {
        throw new EmprestimoNaoAtivoException()
      }

      const exemplar = await Exemplar.query({ client: trx })
        .where('id', emprestimo.exemplarId)
        .forUpdate()
        .firstOrFail()

      emprestimo.dataDevolucao = this.hoje()
      emprestimo.status = 'devolvido'
      emprestimo.bibliotecarioDevolucaoId = dados.bibliotecarioId
      emprestimo.useTransaction(trx)
      await emprestimo.save()

      exemplar.situacao = 'disponivel'
      exemplar.useTransaction(trx)
      await exemplar.save()

      return emprestimo
    })
  }

  /**
   * Informa se o aluno está bloqueado para novos empréstimos por atraso.
   */
  async estaBloqueado(alunoId: number): Promise<boolean> {
    return this.verificarBloqueio(alunoId, this.hoje())
  }

  /**
   * Calcula a data prevista de devolução somando 15 dias úteis à data base.
   * Sábados e domingos não são contados; feriados não são considerados.
   */
  static calcularDataPrevistaDevolucao(dataBase: DateTime): DateTime {
    let data = dataBase.startOf('day')
    let diasRestantes = DIAS_UTEIS_PRAZO

    while (diasRestantes > 0) {
      data = data.plus({ days: 1 })

      if (data.weekday <= 5) {
        diasRestantes -= 1
      }
    }

    return data
  }

  /**
   * Data de "hoje" normalizada para o início do dia, sem horário.
   */
  private hoje(): DateTime {
    return this.agora().startOf('day')
  }

  /**
   * Indica se um empréstimo ativo já passou da data prevista de devolução.
   */
  private estaVencido(emprestimo: Emprestimo): boolean {
    return (
      !emprestimo.dataDevolucao && emprestimo.dataPrevistaDevolucao.startOf('day') < this.hoje()
    )
  }

  /**
   * Verifica o bloqueio de um aluno consultando o histórico de empréstimos.
   *
   * O aluno fica bloqueado enquanto tiver empréstimo vencido e não devolvido,
   * e, após uma devolução em atraso, até `data_devolucao + dias_de_atraso`.
   */
  private async verificarBloqueio(
    alunoId: number,
    hoje: DateTime,
    client?: TransactionClientContract
  ): Promise<boolean> {
    const emprestimos = client
      ? await Emprestimo.query({ client }).where('alunoId', alunoId)
      : await Emprestimo.query().where('alunoId', alunoId)

    return emprestimos.some((emprestimo) => {
      if (!emprestimo.dataDevolucao) {
        return emprestimo.dataPrevistaDevolucao.startOf('day') < hoje
      }

      const diasDeAtraso = Math.round(
        emprestimo.dataDevolucao
          .startOf('day')
          .diff(emprestimo.dataPrevistaDevolucao.startOf('day'), 'days').days
      )

      if (diasDeAtraso <= 0) {
        return false
      }

      const fimDoBloqueio = emprestimo.dataDevolucao.startOf('day').plus({
        days: diasDeAtraso,
      })

      return hoje < fimDoBloqueio
    })
  }
}
