import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Aluno from '#models/aluno'
import Bibliotecario from '#models/bibliotecario'
import Emprestimo from '#models/emprestimo'
import Exemplar from '#models/exemplar'
import Livro from '#models/livro'
import EmprestimoService from '#services/emprestimo_service'
import AlunoBloqueadoException from '#exceptions/aluno_bloqueado_exception'
import AlunoInativoException from '#exceptions/aluno_inativo_exception'
import EmprestimoNaoAtivoException from '#exceptions/emprestimo_nao_ativo_exception'
import EmprestimoVencidoException from '#exceptions/emprestimo_vencido_exception'
import ExemplarIndisponivelException from '#exceptions/exemplar_indisponivel_exception'
import LimiteEmprestimosAtivosException from '#exceptions/limite_emprestimos_ativos_exception'
import { useDatabase } from '#tests/helpers/database'

/**
 * Data fixa usada como "hoje" nos testes. É uma quinta-feira para que os
 * cálculos de dias úteis sejam previsíveis.
 */
const HOJE = DateTime.fromISO('2026-10-22').startOf('day')

/**
 * Cria o service com um relógio fixo, evitando que o resultado dependa do dia
 * real em que a suíte é executada.
 */
function criarService() {
  return new EmprestimoService(() => HOJE)
}

const dadosBibliotecario = {
  nome: 'Bibliotecária de Teste',
  matricula: 'BIB001',
  email: 'bib@archivum.test',
  senha: 'senha-secreta-123',
  role: 'bibliotecario',
  ativo: true,
}

const dadosAluno = {
  nome: 'Ana Beatriz Souza',
  matricula: '2026F001',
  anoEscolar: 6,
  turma: 'A',
  nivel: 'fundamental',
  email: 'ana.souza@escola.test',
  telefone: '(11) 90000-0001',
  ativo: true,
}

/**
 * Sequência usada para gerar códigos de exemplar únicos dentro do grupo.
 */
let sequenciaExemplar = 0

async function criarBibliotecario(overrides: Partial<typeof dadosBibliotecario> = {}) {
  return Bibliotecario.create({ ...dadosBibliotecario, ...overrides })
}

async function criarAluno(overrides: Partial<typeof dadosAluno> = {}) {
  return Aluno.create({ ...dadosAluno, ...overrides })
}

type DadosExemplar = {
  livroId?: number
  codigo?: string
  situacao?: string
}

async function criarExemplar(overrides: DadosExemplar = {}) {
  sequenciaExemplar += 1

  const livro = await Livro.create({
    titulo: `Livro de Teste ${sequenciaExemplar}`,
    isbn: null,
    editora: null,
    anoPublicacao: null,
  })

  return Exemplar.create({
    livroId: livro.id,
    codigo: `EX-${String(sequenciaExemplar).padStart(4, '0')}`,
    situacao: 'disponivel',
    ...overrides,
  })
}

async function situacaoDoExemplar(id: number) {
  const exemplar = await Exemplar.findOrFail(id)
  return exemplar.situacao
}

type DadosEmprestimo = {
  exemplar: Exemplar
  aluno: Aluno
  bibliotecario: Bibliotecario
  dataRetirada?: DateTime
  dataPrevistaDevolucao?: DateTime
  dataDevolucao?: DateTime | null
  renovacoes?: number
  status?: string
}

async function criarEmprestimo({
  exemplar,
  aluno,
  bibliotecario,
  dataRetirada = HOJE.minus({ days: 10 }),
  dataPrevistaDevolucao = HOJE.plus({ days: 5 }),
  dataDevolucao = null,
  renovacoes = 0,
  status = 'ativo',
}: DadosEmprestimo) {
  return Emprestimo.create({
    exemplarId: exemplar.id,
    alunoId: aluno.id,
    bibliotecarioRetiradaId: bibliotecario.id,
    dataRetirada,
    dataPrevistaDevolucao,
    dataDevolucao,
    renovacoes,
    status,
  })
}

test.group('EmprestimoService', (group) => {
  useDatabase(group)

  test('calcula a devolução em 15 dias úteis a partir de uma quinta-feira', async ({ assert }) => {
    const dataPrevista = EmprestimoService.calcularDataPrevistaDevolucao(
      DateTime.fromISO('2026-10-22')
    )

    assert.equal(dataPrevista.toISODate(), '2026-11-12')
    assert.equal(dataPrevista.weekday, 4)
  })

  test('não conta sábado e domingo no prazo de 15 dias úteis', async ({ assert }) => {
    const dataPrevista = EmprestimoService.calcularDataPrevistaDevolucao(
      DateTime.fromISO('2026-10-23')
    )

    assert.equal(dataPrevista.toISODate(), '2026-11-13')
    assert.equal(dataPrevista.weekday, 5)
  })

  test('quando a retirada cai no fim de semana, começa a contar na segunda', async ({ assert }) => {
    const dataPrevista = EmprestimoService.calcularDataPrevistaDevolucao(
      DateTime.fromISO('2026-10-24')
    )

    assert.equal(dataPrevista.toISODate(), '2026-11-13')
  })

  test('registra um empréstimo ativo e marca o exemplar como emprestado', async ({ assert }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const exemplar = await criarExemplar()

    const emprestimo = await service.registrar({
      exemplarId: exemplar.id,
      alunoId: aluno.id,
      bibliotecarioId: bibliotecario.id,
    })

    assert.equal(emprestimo.alunoId, aluno.id)
    assert.equal(emprestimo.exemplarId, exemplar.id)
    assert.equal(emprestimo.bibliotecarioRetiradaId, bibliotecario.id)
    assert.equal(emprestimo.status, 'ativo')
    assert.equal(emprestimo.renovacoes, 0)
    assert.isNull(emprestimo.bibliotecarioDevolucaoId)
    assert.isNull(emprestimo.dataDevolucao)
    assert.equal(emprestimo.dataRetirada.toISODate(), HOJE.toISODate())
    assert.equal(emprestimo.dataPrevistaDevolucao.toISODate(), '2026-11-12')

    const exemplarAtualizado = await Exemplar.findOrFail(exemplar.id)
    assert.equal(exemplarAtualizado.situacao, 'emprestado')
    assert.lengthOf(await Emprestimo.all(), 1)
  })

  test('não registra empréstimo para aluno inativo', async ({ assert }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno({ ativo: false })
    const exemplar = await criarExemplar()

    await assert.rejects(
      () =>
        service.registrar({
          exemplarId: exemplar.id,
          alunoId: aluno.id,
          bibliotecarioId: bibliotecario.id,
        }),
      AlunoInativoException
    )

    assert.lengthOf(await Emprestimo.all(), 0)
    assert.equal(await situacaoDoExemplar(exemplar.id), 'disponivel')
  })

  test('não registra empréstimo de exemplar indisponível', async ({ assert }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const exemplar = await criarExemplar({ situacao: 'emprestado' })

    await assert.rejects(
      () =>
        service.registrar({
          exemplarId: exemplar.id,
          alunoId: aluno.id,
          bibliotecarioId: bibliotecario.id,
        }),
      ExemplarIndisponivelException
    )

    assert.lengthOf(await Emprestimo.all(), 0)
  })

  test('permite no máximo 3 empréstimos ativos simultâneos', async ({ assert }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()

    for (let indice = 0; indice < 3; indice++) {
      const exemplar = await criarExemplar()
      await criarEmprestimo({ exemplar, aluno, bibliotecario })
    }

    const quartoExemplar = await criarExemplar()

    await assert.rejects(
      () =>
        service.registrar({
          exemplarId: quartoExemplar.id,
          alunoId: aluno.id,
          bibliotecarioId: bibliotecario.id,
        }),
      LimiteEmprestimosAtivosException
    )

    assert.lengthOf(await Emprestimo.all(), 3)
    assert.equal(await situacaoDoExemplar(quartoExemplar.id), 'disponivel')
  })

  test('empréstimos devolvidos não contam no limite de ativos', async ({ assert }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()

    for (let indice = 0; indice < 3; indice++) {
      const exemplar = await criarExemplar()
      await criarEmprestimo({
        exemplar,
        aluno,
        bibliotecario,
        dataPrevistaDevolucao: HOJE.minus({ days: 5 }),
        dataDevolucao: HOJE.minus({ days: 6 }),
        status: 'devolvido',
      })
    }

    const exemplar = await criarExemplar()
    const emprestimo = await service.registrar({
      exemplarId: exemplar.id,
      alunoId: aluno.id,
      bibliotecarioId: bibliotecario.id,
    })

    assert.equal(emprestimo.status, 'ativo')
    assert.lengthOf(await Emprestimo.all(), 4)
  })

  test('não registra empréstimo para aluno com empréstimo vencido em aberto', async ({
    assert,
  }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const exemplarVencido = await criarExemplar()

    await criarEmprestimo({
      exemplar: exemplarVencido,
      aluno,
      bibliotecario,
      dataPrevistaDevolucao: HOJE.minus({ days: 1 }),
    })

    const novoExemplar = await criarExemplar()

    await assert.rejects(
      () =>
        service.registrar({
          exemplarId: novoExemplar.id,
          alunoId: aluno.id,
          bibliotecarioId: bibliotecario.id,
        }),
      AlunoBloqueadoException
    )

    assert.equal(await situacaoDoExemplar(novoExemplar.id), 'disponivel')
  })

  test('mantém o aluno bloqueado após devolução com atraso até o fim do período de bloqueio', async ({
    assert,
  }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const exemplar = await criarExemplar()

    await criarEmprestimo({
      exemplar,
      aluno,
      bibliotecario,
      dataPrevistaDevolucao: HOJE.minus({ days: 5 }),
      dataDevolucao: HOJE.minus({ days: 2 }),
      status: 'devolvido',
    })

    const novoExemplar = await criarExemplar()

    await assert.rejects(
      () =>
        service.registrar({
          exemplarId: novoExemplar.id,
          alunoId: aluno.id,
          bibliotecarioId: bibliotecario.id,
        }),
      AlunoBloqueadoException
    )
  })

  test('libera o aluno quando o prazo de bloqueio por atraso termina', async ({ assert }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const exemplar = await criarExemplar()

    await criarEmprestimo({
      exemplar,
      aluno,
      bibliotecario,
      dataPrevistaDevolucao: HOJE.minus({ days: 4 }),
      dataDevolucao: HOJE.minus({ days: 2 }),
      status: 'devolvido',
    })

    assert.isFalse(await service.estaBloqueado(aluno.id))
  })

  test('não considera em atraso um empréstimo que vence hoje', async ({ assert }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const exemplar = await criarExemplar()

    await criarEmprestimo({
      exemplar,
      aluno,
      bibliotecario,
      dataPrevistaDevolucao: HOJE,
    })

    assert.isFalse(await service.estaBloqueado(aluno.id))
  })

  test('considera bloqueado o aluno com empréstimo vencido e não devolvido', async ({ assert }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const exemplar = await criarExemplar()

    await criarEmprestimo({
      exemplar,
      aluno,
      bibliotecario,
      dataPrevistaDevolucao: HOJE.minus({ days: 1 }),
    })

    assert.isTrue(await service.estaBloqueado(aluno.id))
  })

  test('não considera bloqueado o aluno sem empréstimos', async ({ assert }) => {
    const service = criarService()
    const aluno = await criarAluno()

    assert.isFalse(await service.estaBloqueado(aluno.id))
  })

  test('renova o empréstimo ativo, incrementando as renovacoes e o prazo', async ({ assert }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const exemplar = await criarExemplar()
    const dataPrevistaAtual = HOJE.plus({ days: 7 })

    const emprestimo = await criarEmprestimo({
      exemplar,
      aluno,
      bibliotecario,
      dataPrevistaDevolucao: dataPrevistaAtual,
    })

    const renovado = await service.renovar(emprestimo.id)

    assert.equal(renovado.renovacoes, 1)
    assert.equal(renovado.status, 'ativo')
    assert.equal(renovado.dataPrevistaDevolucao.toISODate(), '2026-11-19')
  })

  test('não renova empréstimo já devolvido', async ({ assert }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const exemplar = await criarExemplar()

    const emprestimo = await criarEmprestimo({
      exemplar,
      aluno,
      bibliotecario,
      dataPrevistaDevolucao: HOJE.plus({ days: 5 }),
      dataDevolucao: HOJE.minus({ days: 1 }),
      status: 'devolvido',
    })

    await assert.rejects(() => service.renovar(emprestimo.id), EmprestimoNaoAtivoException)
  })

  test('não renova empréstimo vencido', async ({ assert }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const exemplar = await criarExemplar()
    const dataPrevistaVencida = HOJE.minus({ days: 1 })

    const emprestimo = await criarEmprestimo({
      exemplar,
      aluno,
      bibliotecario,
      dataPrevistaDevolucao: dataPrevistaVencida,
    })

    await assert.rejects(() => service.renovar(emprestimo.id), EmprestimoVencidoException)

    const inalterado = await Emprestimo.findOrFail(emprestimo.id)
    assert.equal(inalterado.renovacoes, 0)
    assert.equal(inalterado.dataPrevistaDevolucao.toISODate(), dataPrevistaVencida.toISODate())
  })

  test('registra a devolução e devolve o exemplar ao acervo', async ({ assert }) => {
    const service = criarService()
    const bibliotecarioRetirada = await criarBibliotecario()
    const bibliotecarioDevolucao = await criarBibliotecario({
      matricula: 'BIB002',
      email: 'bib2@archivum.test',
    })
    const aluno = await criarAluno()
    const exemplar = await criarExemplar()

    const emprestimo = await criarEmprestimo({
      exemplar,
      aluno,
      bibliotecario: bibliotecarioRetirada,
      dataRetirada: HOJE.minus({ days: 10 }),
      dataPrevistaDevolucao: HOJE.plus({ days: 5 }),
    })

    const devolvido = await service.devolver({
      emprestimoId: emprestimo.id,
      bibliotecarioId: bibliotecarioDevolucao.id,
    })

    assert.equal(devolvido.status, 'devolvido')
    assert.equal(devolvido.dataDevolucao?.toISODate(), HOJE.toISODate())
    assert.equal(devolvido.bibliotecarioRetiradaId, bibliotecarioRetirada.id)
    assert.equal(devolvido.bibliotecarioDevolucaoId, bibliotecarioDevolucao.id)
    assert.equal(await situacaoDoExemplar(exemplar.id), 'disponivel')
  })

  test('aceita devolução em atraso e bloqueia o aluno pelo período de atraso', async ({
    assert,
  }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const exemplar = await criarExemplar()

    const emprestimo = await criarEmprestimo({
      exemplar,
      aluno,
      bibliotecario,
      dataPrevistaDevolucao: HOJE.minus({ days: 2 }),
    })

    const devolvido = await service.devolver({
      emprestimoId: emprestimo.id,
      bibliotecarioId: bibliotecario.id,
    })

    assert.equal(devolvido.status, 'devolvido')
    assert.equal(devolvido.dataDevolucao?.toISODate(), HOJE.toISODate())
    assert.isTrue(await service.estaBloqueado(aluno.id))
  })

  test('não devolve empréstimo já devolvido', async ({ assert }) => {
    const service = criarService()
    const bibliotecario = await criarBibliotecario()
    const aluno = await criarAluno()
    const exemplar = await criarExemplar()

    const emprestimo = await criarEmprestimo({
      exemplar,
      aluno,
      bibliotecario,
      dataPrevistaDevolucao: HOJE.plus({ days: 5 }),
      dataDevolucao: HOJE.minus({ days: 1 }),
      status: 'devolvido',
    })

    await assert.rejects(
      () =>
        service.devolver({
          emprestimoId: emprestimo.id,
          bibliotecarioId: bibliotecario.id,
        }),
      EmprestimoNaoAtivoException
    )
  })
})
