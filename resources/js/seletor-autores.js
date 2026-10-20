/**
 * Seletor de autores do formulário de livros.
 *
 * A lista completa de autores chega do servidor e a busca é feita no próprio
 * navegador. O cadastro de um novo autor é enviado por `fetch` para que o
 * formulário do livro não seja recarregado e a seleção atual seja preservada.
 */
export function seletorAutores({
  autoresIniciais = [],
  selecionadosIniciais = [],
} = {}) {
  return {
    aberto: false,
    modo: 'lista',
    busca: '',
    autores: autoresIniciais,
    selecionados: selecionadosIniciais.map(Number),
    salvando: false,
    erroGeral: null,
    errosAutor: {},
    novoNome: '',
    mensagem: null,

    init() {
      /**
       * Os campos renderizados pelo servidor permitem enviar a seleção mesmo
       * sem JS. Com Alpine ativo, o `x-for` passa a ser a única fonte deles.
       */
      this.$refs.inputsServidor?.remove()
    },

    get autoresFiltrados() {
      const termo = this.normalizar(this.busca)

      if (!termo) {
        return this.autores
      }

      return this.autores.filter((autor) => this.normalizar(autor.nome).includes(termo))
    },

    get autoresSelecionados() {
      return this.selecionados
        .map((id) => this.autores.find((autor) => autor.id === id))
        .filter(Boolean)
    },

    normalizar(valor) {
      return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    },

    abrir() {
      this.aberto = true
      this.modo = 'lista'
      this.busca = ''
      this.erroGeral = null
      this.errosAutor = {}
      this.novoNome = ''
      this.mensagem = null

      this.$nextTick(() => this.$refs.busca?.focus())
    },

    fechar() {
      this.aberto = false
    },

    irParaCadastro() {
      this.modo = 'cadastro'
      this.erroGeral = null
      this.errosAutor = {}
      this.novoNome = ''

      this.$nextTick(() => this.$refs.nomeAutor?.focus())
    },

    voltarParaLista() {
      this.modo = 'lista'
      this.erroGeral = null
      this.errosAutor = {}
      this.novoNome = ''
    },

    alternar(id) {
      const indice = this.selecionados.indexOf(id)

      if (indice === -1) {
        this.selecionados.push(id)
      } else {
        this.selecionados.splice(indice, 1)
      }
    },

    estaSelecionado(id) {
      return this.selecionados.includes(id)
    },

    agruparErros(erros = []) {
      return erros.reduce((resultado, erro) => {
        if (!resultado[erro.field]) {
          resultado[erro.field] = []
        }

        resultado[erro.field].push(erro.message)
        return resultado
      }, {})
    },

    async cadastrarAutor() {
      this.salvando = true
      this.erroGeral = null
      this.errosAutor = {}

      try {
        const dados = new FormData()
        dados.append('nome', this.novoNome)

        const resposta = await fetch(this.$root.dataset.urlAutores, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
          },
          body: dados,
        })

        const corpo = await resposta.json().catch(() => ({}))

        if (resposta.status === 422) {
          this.errosAutor = this.agruparErros(corpo.errors)
          return
        }

        if (!resposta.ok) {
          throw new Error('Não foi possível cadastrar o autor. Tente novamente.')
        }

        const autor = corpo.autor

        if (!this.autores.some((existente) => existente.id === autor.id)) {
          this.autores.push(autor)
        }

        this.autores.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

        if (!this.selecionados.includes(autor.id)) {
          this.selecionados.push(autor.id)
        }

        this.busca = ''
        this.novoNome = ''
        this.modo = 'lista'
        this.mensagem = `Autor "${autor.nome}" cadastrado e selecionado.`

        this.$nextTick(() => this.$refs.busca?.focus())
      } catch (error) {
        this.erroGeral = error.message
      } finally {
        this.salvando = false
      }
    },
  }
}
