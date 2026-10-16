import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Autor from '#models/autor'

/**
 * Autores fictícios, um para cada livro semeado pelo `LivroSeeder`.
 */
const autores = [
  'Machado de Assis',
  'Aluísio Azevedo',
  'Graciliano Ramos',
  'José de Alencar',
  'Joaquim Manuel de Macedo',
]

/**
 * Cadastra os autores fictícios. É executado antes do `LivroSeeder`, pois os
 * livros precisam dos autores já existentes para o vínculo N—N.
 */
export default class AutorSeeder extends BaseSeeder {
  async run() {
    for (const nome of autores) {
      await Autor.updateOrCreate({ nome }, { nome })
    }
  }
}
