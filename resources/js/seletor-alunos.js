/**
 * Seletor de aluno do formulário de empréstimo.
 *
 * A lista completa de alunos ativos chega do servidor e a busca é feita no
 * próprio navegador. Só é possível escolher um aluno por empréstimo.
 */
export function seletorAlunos({ alunosIniciais = [], selecionadoInicial = null } = {}) {
  return {
    aberto: false,
    busca: '',
    alunos: alunosIniciais,
    selecionado: selecionadoInicial ? Number(selecionadoInicial) : null,

    get alunosFiltrados() {
      const termo = this.normalizar(this.busca)

      if (!termo) {
        return this.alunos
      }

      return this.alunos.filter((aluno) => {
        const conteudo = [aluno.nome, aluno.matricula].join(' ')
        return this.normalizar(conteudo).includes(termo)
      })
    },

    get alunoSelecionado() {
      return this.alunos.find((aluno) => aluno.id === this.selecionado) ?? null
    },

    normalizar(valor) {
      return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    },

    abrir() {
      this.aberto = true
      this.busca = ''

      this.$nextTick(() => this.$refs.busca?.focus())
    },

    fechar() {
      this.aberto = false
    },

    selecionar(id) {
      this.selecionado = Number(id)
    },
  }
}
