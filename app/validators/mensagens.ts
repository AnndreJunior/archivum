import { SimpleMessagesProvider } from '@vinejs/vine'

/**
 * Mensagens de validação em português usadas em toda a aplicação.
 *
 * As mensagens genéricas cobrem as regras do VineJS e das regras `unique` e
 * `exists` do Lucid. As mensagens com caminho de campo têm prioridade e
 * deixam o retorno mais direto para os formulários.
 */
const mensagens = {
  'required': '{{ field }} é obrigatório.',
  'string': '{{ field }} deve ser um texto.',
  'email': 'Informe um e-mail válido.',
  'minLength': '{{ field }} deve ter pelo menos {{ min }} caracteres.',
  'maxLength': '{{ field }} deve ter no máximo {{ max }} caracteres.',
  'fixedLength': '{{ field }} deve ter exatamente {{ size }} caracteres.',
  'sameAs': '{{ field }} deve ser igual ao campo {{ otherField }}.',
  'enum': 'Selecione uma opção válida para {{ field }}.',
  'number': '{{ field }} deve ser um número.',
  'min': '{{ field }} deve ser no mínimo {{ min }}.',
  'max': '{{ field }} deve ser no máximo {{ max }}.',
  'array': '{{ field }} deve ser uma lista.',
  'distinct': '{{ field }} não pode ter valores repetidos.',
  'unionOfTypes': 'O valor informado para {{ field }} é inválido.',
  'database.unique': 'O valor informado para {{ field }} já está em uso.',
  'database.exists': 'O valor selecionado para {{ field }} é inválido.',

  'nome.minLength': 'Nome é obrigatório.',
  'matricula.minLength': 'Matrícula é obrigatório.',
  'turma.minLength': 'Turma é obrigatório.',
  'titulo.minLength': 'Título é obrigatório.',
  'codigo.minLength': 'Código é obrigatório.',
  'senha.minLength': 'A senha deve ter pelo menos 8 caracteres.',
  'senha.required': 'Informe sua senha.',
  'senhaConfirmation.sameAs': 'A confirmação de senha não confere.',

  'nome.database.unique': 'Este nome já está cadastrado.',
  'matricula.database.unique': 'Esta matrícula já está cadastrada.',
  'email.database.unique': 'Este e-mail já está cadastrado.',
  'isbn.database.unique': 'Este ISBN já está cadastrado.',
  'codigo.database.unique': 'Este código já está cadastrado.',

  'autores.database.exists': 'Um dos autores selecionados não existe.',
  'autores.*.database.exists': 'Um dos autores selecionados não existe.',
  'autores.number': 'Um dos autores selecionados é inválido.',
  'autores.*.number': 'Um dos autores selecionados é inválido.',

  'livroId.min': 'Selecione um livro.',
  'livroId.database.exists': 'O livro selecionado não existe.',
  'alunoId.min': 'Selecione um aluno.',
  'alunoId.database.exists': 'O aluno selecionado não existe.',
  'exemplarId.min': 'Selecione um exemplar.',
  'exemplarId.database.exists': 'O exemplar selecionado não existe.',
}

/**
 * Rótulos exibidos nas mensagens de erro.
 */
const campos = {
  nome: 'Nome',
  matricula: 'Matrícula',
  anoEscolar: 'Ano escolar',
  turma: 'Turma',
  nivel: 'Nível',
  email: 'E-mail',
  telefone: 'Telefone',
  titulo: 'Título',
  isbn: 'ISBN',
  editora: 'Editora',
  anoPublicacao: 'Ano de publicação',
  autores: 'Autores',
  livroId: 'Livro',
  codigo: 'Código',
  situacao: 'Situação',
  alunoId: 'Aluno',
  exemplarId: 'Exemplar',
  role: 'Perfil',
  senha: 'Senha',
  senhaConfirmation: 'Confirmação de senha',
  token: 'Token',
}

export const mensagensProvider = new SimpleMessagesProvider(mensagens, campos)

/**
 * Mensagens específicas do login.
 *
 * No login, o e-mail vazio é orientado a informar um e-mail válido; o rótulo
 * genérico "O campo E-mail é obrigatório." fica para os formulários de
 * cadastro.
 */
export const mensagensLogin = new SimpleMessagesProvider(
  {
    ...mensagens,
    'email.required': 'Informe um e-mail válido.',
  },
  campos
)
