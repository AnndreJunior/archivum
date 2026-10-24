/**
 * Seletor de exemplar do formulário de empréstimo.
 *
 * A lista completa de exemplares disponíveis chega do servidor e a busca é
 * feita no próprio navegador, por código, título, ISBN ou autor.
 */
export function seletorExemplares({ exemplaresIniciais = [], selecionadoInicial = null } = {}) {
  return {
    aberto: false,
    busca: '',
    exemplares: exemplaresIniciais,
    selecionado: selecionadoInicial ? Number(selecionadoInicial) : null,

    get exemplaresFiltrados() {
      const termo = this.normalizar(this.busca)

      if (!termo) {
        return this.exemplares
      }

      return this.exemplares.filter((exemplar) => {
        const conteudo = [
          exemplar.codigo,
          exemplar.titulo,
          exemplar.isbn,
          ...(exemplar.autores ?? []),
        ].join(' ')

        return this.normalizar(conteudo).includes(termo)
      })
    },

    get exemplarSelecionado() {
      return this.exemplares.find((exemplar) => exemplar.id === this.selecionado) ?? null
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
