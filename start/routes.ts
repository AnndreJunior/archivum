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

/**
 * Autenticação — rotas públicas (acessíveis sem sessão).
 */
router
  .group(() => {
    router.post('/login', [AuthController, 'login']).as('auth.login')
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
