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
