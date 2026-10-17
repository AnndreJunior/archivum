import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Restringe o acesso a administradores (`bibliotecario.role = 'admin'`).
 *
 * Deve ser usado depois do middleware de autenticação.
 */
export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const bibliotecario = await ctx.auth.authenticate()

    if (!bibliotecario.isAdmin) {
      throw new Exception('Apenas administradores podem executar esta ação', { status: 403 })
    }

    return next()
  }
}
