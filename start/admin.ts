import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { garantirAdminBibliotecario } from '#services/admin_bibliotecario_service'

/**
 * Garante que o bibliotecário admin definido nas variáveis de ambiente
 * `ADMIN_*` exista no startup do servidor HTTP.
 *
 * Este preload é registrado apenas no ambiente `web` (ver `adonisrc.ts`), ou
 * seja, roda depois das migrations e não interfere nos comandos do Ace nem
 * nos testes.
 */
const { criado } = await garantirAdminBibliotecario({
  nome: env.get('ADMIN_NOME'),
  matricula: env.get('ADMIN_MATRICULA'),
  email: env.get('ADMIN_EMAIL'),
  senha: env.get('ADMIN_SENHA'),
})

if (criado) {
  logger.info('Bibliotecário admin cadastrado a partir das variáveis de ambiente')
}
