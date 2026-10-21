/**
 * Seletor de livro do formulário de exemplares.
 *
 * A lista completa de livros chega do servidor e a busca é feita no próprio
 * navegador. Diferente do seletor de autores, só é possível escolher um livro
 * e não existe cadastro dentro do modal.
 */
export function seletorLivros({ livrosIniciais = [], selecionadoInicial = null } = {}) {
  return {
    aberto: false,
    busca: '',
    livros: livrosIniciais,
    selecionado: selecionadoInicial ? Number(selecionadoInicial) : null,

    get livrosFiltrados() {
      const termo = this.normalizar(this.busca)

      if (!termo) {
        return this.livros
      }

      return this.livros.filter((livro) => {
        const conteudo = [livro.titulo, livro.isbn, ...(livro.autores ?? [])].join(' ')
        return this.normalizar(conteudo).includes(termo)
      })
    },

    get livroSelecionado() {
      return this.livros.find((livro) => livro.id === this.selecionado) ?? null
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
