import Alpine from 'alpinejs'
import { seletorAutores } from './seletor-autores.js'
import { seletorAlunos } from './seletor-alunos.js'
import { seletorExemplares } from './seletor-exemplares.js'
import { seletorLivros } from './seletor-livros.js'

Alpine.data('seletorAutores', seletorAutores)
Alpine.data('seletorAlunos', seletorAlunos)
Alpine.data('seletorExemplares', seletorExemplares)
Alpine.data('seletorLivros', seletorLivros)

Alpine.data('alert', function () {
  return {
    isVisible: false,
    dismiss() {
      this.isVisible = false
    },
    init() {
      setTimeout(() => {
        this.isVisible = true
      }, 80)
      setTimeout(() => {
        this.dismiss()
      }, 5000)
    },
  }
})

Alpine.data('themeToggle', function () {
  return {
    theme: 'light',
    init() {
      this.theme = this.$el.dataset.initialTheme || 'light'
    },
    toggle() {
      const next = this.theme === 'dark' ? 'light' : 'dark'
      this.theme = next
      document.documentElement.setAttribute('data-theme', next)
      document.cookie = `app_theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    },
  }
})

Alpine.start()
