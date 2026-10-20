/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const AuthController = () => import('#controllers/auth_controller')
const RecuperacaoSenhaController = () => import('#controllers/recuperacao_senha_controller')
const AlunoController = () => import('#controllers/aluno_controller')
const LivroController = () => import('#controllers/livro_controller')
const AutorController = () => import('#controllers/autor_controller')

/**
 * Autenticação — rotas públicas (acessíveis sem sessão).
 */
router
  .group(() => {
    router.get('/login', [AuthController, 'show']).as('auth.login')
    router.post('/login', [AuthController, 'login']).as('auth.login.attempt')

    router
      .get('/esqueci-minha-senha', [RecuperacaoSenhaController, 'showEsqueciMinhaSenha'])
      .as('auth.esqueci_senha')
    router
      .post('/esqueci-minha-senha', [RecuperacaoSenhaController, 'enviarLink'])
      .as('auth.esqueci_senha.enviar')
    router
      .get('/trocar-senha', [RecuperacaoSenhaController, 'showTrocarSenha'])
      .as('auth.trocar_senha')
    router
      .post('/trocar-senha', [RecuperacaoSenhaController, 'trocarSenha'])
      .as('auth.trocar_senha.atualizar')
  })
  .prefix('/auth')
  .use(middleware.guest())

/**
 * Autenticação — rotas que exigem sessão.
 */
router
  .group(() => {
    router.post('/logout', [AuthController, 'logout']).as('auth.logout')
  })
  .prefix('/auth')
  .use(middleware.auth())

/**
 * Rotas do sistema (exigem autenticação).
 */
router
  .group(() => {
    router.on('/').render('pages/home').as('home')
  })
  .use(middleware.auth())

/**
 * Alunos (exigem autenticação). Apenas administradores alternam o status.
 */
router
  .group(() => {
    router.get('/alunos', [AlunoController, 'index']).as('alunos.index')
    router.get('/alunos/criar', [AlunoController, 'create']).as('alunos.create')
    router.post('/alunos', [AlunoController, 'store']).as('alunos.store')
    router
      .get('/alunos/:id/editar', [AlunoController, 'edit'])
      .where('id', /^[0-9]+$/)
      .as('alunos.edit')
    router
      .put('/alunos/:id', [AlunoController, 'update'])
      .where('id', /^[0-9]+$/)
      .as('alunos.update')
    router
      .patch('/alunos/:id/ativo', [AlunoController, 'alternarAtivo'])
      .where('id', /^[0-9]+$/)
      .use(middleware.admin())
      .as('alunos.ativo')
  })
  .use(middleware.auth())

/**
 * Livros (exigem autenticação).
 */
router
  .group(() => {
    router.get('/livros', [LivroController, 'index']).as('livros.index')
    router.get('/livros/criar', [LivroController, 'create']).as('livros.create')
    router.post('/livros', [LivroController, 'store']).as('livros.store')
    router
      .get('/livros/:id/editar', [LivroController, 'edit'])
      .where('id', /^[0-9]+$/)
      .as('livros.edit')
    router
      .put('/livros/:id', [LivroController, 'update'])
      .where('id', /^[0-9]+$/)
      .as('livros.update')

    router.post('/autores', [AutorController, 'store']).as('autores.store')
    router.get('/autores/criar', [AutorController, 'create']).as('autores.create')
  })
  .use(middleware.auth())
