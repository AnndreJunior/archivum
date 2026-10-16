import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Aluno from '#models/aluno'

/**
 * Alunos fictícios da biblioteca: 4 do ensino fundamental e 4 do ensino médio.
 */
const alunos = [
  {
    nome: 'Ana Beatriz Souza',
    matricula: '2026F001',
    anoEscolar: 6,
    turma: 'A',
    nivel: 'fundamental',
    email: 'ana.souza@escola.test',
    telefone: '(11) 90000-0001',
  },
  {
    nome: 'Bruno Henrique Lima',
    matricula: '2026F002',
    anoEscolar: 7,
    turma: 'B',
    nivel: 'fundamental',
    email: 'bruno.lima@escola.test',
    telefone: '(11) 90000-0002',
  },
  {
    nome: 'Camila Ferreira Alves',
    matricula: '2026F003',
    anoEscolar: 8,
    turma: 'A',
    nivel: 'fundamental',
    email: 'camila.alves@escola.test',
    telefone: '(11) 90000-0003',
  },
  {
    nome: 'Diego Martins Rocha',
    matricula: '2026F004',
    anoEscolar: 9,
    turma: 'C',
    nivel: 'fundamental',
    email: 'diego.rocha@escola.test',
    telefone: '(11) 90000-0004',
  },
  {
    nome: 'Eduarda Nunes Barbosa',
    matricula: '2026M001',
    anoEscolar: 1,
    turma: 'A',
    nivel: 'medio',
    email: 'eduarda.barbosa@escola.test',
    telefone: '(11) 90000-0005',
  },
  {
    nome: 'Felipe Augusto Cardoso',
    matricula: '2026M002',
    anoEscolar: 2,
    turma: 'B',
    nivel: 'medio',
    email: 'felipe.cardoso@escola.test',
    telefone: '(11) 90000-0006',
  },
  {
    nome: 'Gabriela Ribeiro Castro',
    matricula: '2026M003',
    anoEscolar: 3,
    turma: 'A',
    nivel: 'medio',
    email: 'gabriela.castro@escola.test',
    telefone: '(11) 90000-0007',
  },
  {
    nome: 'Henrique Oliveira Prado',
    matricula: '2026M004',
    anoEscolar: 1,
    turma: 'B',
    nivel: 'medio',
    email: 'henrique.prado@escola.test',
    telefone: '(11) 90000-0008',
  },
]

/**
 * Cadastra os alunos fictícios da biblioteca.
 *
 * O prefixo numérico no nome garante a ordem de execução do `db:seed`,
 * já que os seeders rodam em ordem alfabética.
 */
export default class AlunoSeeder extends BaseSeeder {
  async run() {
    for (const aluno of alunos) {
      await Aluno.updateOrCreate({ matricula: aluno.matricula }, aluno)
    }
  }
}
