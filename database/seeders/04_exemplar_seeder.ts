import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Livro from '#models/livro'
import Exemplar from '#models/exemplar'

/**
 * Quantidade de cópias físicas criadas para cada livro.
 */
const EXEMPLARES_POR_LIVRO = 5

/**
 * Cadastra os exemplares (cópias físicas) dos livros fictícios, gerando códigos
 * de tombo sequenciais e únicos (`EX-0001`, `EX-0002`, …).
 */
export default class ExemplarSeeder extends BaseSeeder {
  async run() {
    const livros = await Livro.query().orderBy('id', 'asc')

    let tombo = 1
    for (const livro of livros) {
      for (let copia = 0; copia < EXEMPLARES_POR_LIVRO; copia++) {
        const codigo = `EX-${String(tombo).padStart(4, '0')}`

        await Exemplar.updateOrCreate(
          { codigo },
          { codigo, livroId: livro.id, situacao: 'disponivel' }
        )

        tombo++
      }
    }
  }
}
