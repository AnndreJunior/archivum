import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Livro from '#models/livro'
import Autor from '#models/autor'

/**
 * Obras fictícias do acervo, cada uma com seu respectivo autor.
 */
const livros = [
  {
    titulo: 'Dom Casmurro',
    isbn: '978-85-359-0277-5',
    editora: 'Companhia das Letras',
    anoPublicacao: 1899,
    autor: 'Machado de Assis',
  },
  {
    titulo: 'O Cortiço',
    isbn: '978-85-08-10482-2',
    editora: 'Ática',
    anoPublicacao: 1890,
    autor: 'Aluísio Azevedo',
  },
  {
    titulo: 'Vidas Secas',
    isbn: '978-85-01-09553-8',
    editora: 'Record',
    anoPublicacao: 1938,
    autor: 'Graciliano Ramos',
  },
  {
    titulo: 'Iracema',
    isbn: '978-85-08-05743-3',
    editora: 'Ática',
    anoPublicacao: 1865,
    autor: 'José de Alencar',
  },
  {
    titulo: 'A Moreninha',
    isbn: '978-85-7232-789-0',
    editora: 'Martin Claret',
    anoPublicacao: 1844,
    autor: 'Joaquim Manuel de Macedo',
  },
]

/**
 * Cadastra os livros fictícios e os associa aos seus autores. É executado
 * antes do `ExemplarSeeder`, pois os exemplares precisam dos livros.
 */
export default class LivroSeeder extends BaseSeeder {
  async run() {
    for (const { autor, ...dados } of livros) {
      const livro = await Livro.updateOrCreate({ isbn: dados.isbn }, dados)
      const autorModel = await Autor.findByOrFail('nome', autor)

      await livro.related('autores').sync([autorModel.id])
    }
  }
}
